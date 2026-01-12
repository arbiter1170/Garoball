// API route for simulating game plays
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SeededRng } from '@/lib/rng'
import {
  getRatingProbabilities,
  blendProbabilities,
  probabilitiesToDiceRanges,
  getOutcomeFromDiceIndex,
  LEAGUE_AVERAGE_PROBS
} from '@/lib/probabilities'
import { advanceRunners, BaseState } from '@/lib/baserunning'
import { getDramaContext } from '@/lib/drama'
import { generateAnnouncerCall } from '@/lib/announcer'
import { calculateMatchupProbabilities } from '@/lib/handedness'
import { PitchingManager } from '@/lib/pitchingManager'
import type { Game, PlayerRating, Outcome, Player } from '@/types'

// POST /api/games/[id]/simulate - Simulate next play or full game
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mode = 'play', useHandedness = true, useNpcManager = true } = body // 'play' for single PA, 'inning' for full inning, 'game' for full game

    // Get game state
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .single()

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.status === 'completed') {
      return NextResponse.json({ error: 'Game is already completed' }, { status: 400 })
    }

    // Get player ratings and player data
    const allPlayerIds = [
      ...game.home_lineup,
      ...game.away_lineup,
      ...game.home_pitchers,
      ...game.away_pitchers
    ]

    const batterIds = [...game.home_lineup, ...game.away_lineup]
    const pitcherIds = [...game.home_pitchers, ...game.away_pitchers]

    const { data: season } = await supabase
      .from('seasons')
      .select('year')
      .eq('id', game.season_id)
      .single()

    const seasonYear = season?.year
    let ratings: unknown[] = []
    let players: unknown[] = []
    
    if (seasonYear) {
      const [{ data: bat }, { data: pit }, { data: plr }] = await Promise.all([
        supabase
          .from('player_ratings')
          .select('*')
          .eq('year', seasonYear)
          .eq('rating_type', 'batting')
          .in('player_id', batterIds),
        supabase
          .from('player_ratings')
          .select('*')
          .eq('year', seasonYear)
          .eq('rating_type', 'pitching')
          .in('player_id', pitcherIds),
        supabase
          .from('players')
          .select('*')
          .in('id', allPlayerIds)
      ])
      ratings = [...(bat || []), ...(pit || [])]
      players = plr || []
    } else {
      const [{ data: fallbackRatings }, { data: fallbackPlayers }] = await Promise.all([
        supabase
          .from('player_ratings')
          .select('*')
          .in('player_id', allPlayerIds),
        supabase
          .from('players')
          .select('*')
          .in('id', allPlayerIds)
      ])
      ratings = fallbackRatings || []
      players = fallbackPlayers || []
    }

    const ratingsMap = new Map<string, PlayerRating>()
    ratings?.forEach((r: any) => ratingsMap.set(`${r.player_id}:${r.rating_type}`, r as PlayerRating))
    
    const playersMap = new Map<string, Player>()
    players?.forEach((p: any) => playersMap.set(p.id, p as Player))

    // Initialize NPC Pitching Manager if enabled
    let homePitchingManager: PitchingManager | null = null
    let awayPitchingManager: PitchingManager | null = null
    
    if (useNpcManager) {
      const homePlayers = new Map<string, Player>()
      const awayPlayers = new Map<string, Player>()
      const homeRatings = new Map<string, PlayerRating>()
      const awayRatings = new Map<string, PlayerRating>()
      
      game.home_lineup.forEach((id: string) => {
        const p = playersMap.get(id)
        if (p) homePlayers.set(id, p)
      })
      game.home_pitchers.forEach((id: string) => {
        const p = playersMap.get(id)
        if (p) homePlayers.set(id, p)
        const r = ratingsMap.get(`${id}:pitching`)
        if (r) homeRatings.set(`${id}:pitching`, r)
      })
      
      game.away_lineup.forEach((id: string) => {
        const p = playersMap.get(id)
        if (p) awayPlayers.set(id, p)
      })
      game.away_pitchers.forEach((id: string) => {
        const p = playersMap.get(id)
        if (p) awayPlayers.set(id, p)
        const r = ratingsMap.get(`${id}:pitching`)
        if (r) awayRatings.set(`${id}:pitching`, r)
      })
      
      homePitchingManager = new PitchingManager(homePlayers, homeRatings)
      awayPitchingManager = new PitchingManager(awayPlayers, awayRatings)
    }

    // Initialize RNG from saved state
    const fallbackSeed = new SeededRng(game.seed).getState().seed
    const callCount = typeof game.rng_state?.callCount === 'number' ? game.rng_state.callCount : 0
    const seed = typeof game.rng_state?.seed === 'number' ? game.rng_state.seed : fallbackSeed
    const rng = SeededRng.fromState({ seed, callCount })

    let currentGame = { ...game } as Game
    const newPlays: unknown[] = []
    let playNumber = await getNextPlayNumber(supabase, id)

    // Simulation loop
    const maxIterations = mode === 'game' ? 500 : mode === 'inning' ? 50 : 1
    const startInning = currentGame.inning
    const startHalf = currentGame.half

    for (let i = 0; i < maxIterations && currentGame.status !== 'completed'; i++) {
      // Check if we should stop (for inning mode)
      if (mode === 'inning' && (currentGame.inning !== startInning || currentGame.half !== startHalf)) {
        break
      }

      // Check if NPC manager wants to make a pitching change
      if (useNpcManager && i > 0) {
        const pitchingManager = currentGame.half === 'top' ? homePitchingManager : awayPitchingManager
        const currentPitcherId = currentGame.current_pitcher_id!
        
        if (pitchingManager) {
          const decision = pitchingManager.shouldPullPitcher(currentGame, currentPitcherId, false)
          
          if (decision.shouldPull) {
            const newPitcher = pitchingManager.selectReliefPitcher(currentGame, currentPitcherId)
            
            if (newPitcher) {
              // Make the pitching change
              currentGame.current_pitcher_id = newPitcher
              pitchingManager.markPitcherUsed(newPitcher, currentGame.inning)
              
              // Add pitcher to the roster if not already there
              const pitcherList = currentGame.half === 'top' ? currentGame.home_pitchers : currentGame.away_pitchers
              if (!pitcherList.includes(newPitcher)) {
                pitcherList.push(newPitcher)
              }
              
              // Initialize box score for new pitcher if needed
              const pitchingTeam = currentGame.half === 'top' ? currentGame.box_score.home : currentGame.box_score.away
              if (!pitchingTeam.pitching[newPitcher]) {
                pitchingTeam.pitching[newPitcher] = {
                  ip_outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0
                }
              }
            }
          }
        }
      }

      const result = simulatePlateAppearance(currentGame, ratingsMap, playersMap, rng, useHandedness)
      const { updatedGame, play } = applyResult(currentGame, result, rng, playNumber++)

      // Update pitching manager state if enabled
      if (useNpcManager) {
        const pitchingManager = currentGame.half === 'top' ? homePitchingManager : awayPitchingManager
        if (pitchingManager) {
          pitchingManager.updatePitcherState(
            result.pitcherId,
            result.outcome,
            result.runsScored || 0
          )
        }
      }

      newPlays.push(play)
      currentGame = updatedGame

      // Single play mode - stop after one
      if (mode === 'play') break
    }

    // Update game state in database
    if (currentGame.status === 'in_progress' || currentGame.status === 'completed') {
      await supabase
        .from('games')
        .update({
          status: currentGame.status,
          inning: currentGame.inning,
          half: currentGame.half,
          outs: currentGame.outs,
          home_score: currentGame.home_score,
          away_score: currentGame.away_score,
          runner_1b: currentGame.runner_1b,
          runner_2b: currentGame.runner_2b,
          runner_3b: currentGame.runner_3b,
          current_batter_idx: currentGame.current_batter_idx,
          current_pitcher_id: currentGame.current_pitcher_id,
          pitcher_outs: currentGame.pitcher_outs,
          home_pitchers: currentGame.home_pitchers,
          away_pitchers: currentGame.away_pitchers,
          rng_state: currentGame.rng_state,
          box_score: currentGame.box_score,
          updated_at: new Date().toISOString(),
          completed_at: currentGame.status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', id)
    }

    // Insert plays
    if (newPlays.length > 0) {
      await supabase.from('plays').insert(newPlays)
    }

    // Update standings if game completed
    if (currentGame.status === 'completed') {
      await updateStandings(supabase, currentGame)
    }

    return NextResponse.json({
      game: currentGame,
      plays: newPlays,
      completed: currentGame.status === 'completed'
    })
  } catch (error) {
    console.error('Error simulating game:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getNextPlayNumber(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, gameId: string): Promise<number> {
  const { data } = await supabase
    .from('plays')
    .select('play_number')
    .eq('game_id', gameId)
    .order('play_number', { ascending: false })
    .limit(1)
    .single()

  return (data?.play_number ?? -1) + 1
}

function simulatePlateAppearance(
  game: Game,
  ratingsMap: Map<string, PlayerRating>,
  playersMap: Map<string, Player>,
  rng: SeededRng,
  useHandedness: boolean = true
) {
  const batterId = game.half === 'top'
    ? game.away_lineup[game.current_batter_idx % game.away_lineup.length]
    : game.home_lineup[game.current_batter_idx % game.home_lineup.length]

  const pitcherId = game.current_pitcher_id!

  const batterRating = ratingsMap.get(`${batterId}:batting`)
  const pitcherRating = ratingsMap.get(`${pitcherId}:pitching`)

  const batterProbs = batterRating
    ? getRatingProbabilities(batterRating)
    : LEAGUE_AVERAGE_PROBS
  const pitcherProbs = pitcherRating
    ? getRatingProbabilities(pitcherRating)
    : LEAGUE_AVERAGE_PROBS

  // Use handedness-aware calculation if enabled
  let blendedProbs
  let runsScored = 0
  
  if (useHandedness) {
    const batter = playersMap.get(batterId)
    const pitcher = playersMap.get(pitcherId)
    
    if (batter?.bats && pitcher?.throws) {
      blendedProbs = calculateMatchupProbabilities(
        batterProbs,
        pitcherProbs,
        batter.bats,
        pitcher.throws,
        0.65
      )
    } else {
      blendedProbs = blendProbabilities(batterProbs, pitcherProbs)
    }
  } else {
    blendedProbs = blendProbabilities(batterProbs, pitcherProbs)
  }
  
  const { dice, index } = rng.rollDiceIndex()
  const diceTableRanges = probabilitiesToDiceRanges(blendedProbs)
  // IMPORTANT: Pass blendedProbs to get accurate outcome from the optimal dice table
  const outcome = getOutcomeFromDiceIndex(index, diceTableRanges, blendedProbs)
  
  // Calculate runs scored
  const baseState: BaseState = {
    runner1b: game.runner_1b,
    runner2b: game.runner_2b,
    runner3b: game.runner_3b
  }
  const baseResult = advanceRunners(baseState, batterId, outcome, game.outs)
  runsScored = baseResult.runsScored

  return {
    batterId,
    pitcherId,
    outcome,
    dice,
    diceIndex: index,
    batterProbs,
    pitcherProbs,
    blendedProbs,
    diceTableRanges,
    runsScored
  }
}

function applyResult(
  game: Game,
  result: ReturnType<typeof simulatePlateAppearance>,
  rng: SeededRng,
  playNumber: number
) {
  const { batterId, pitcherId, outcome, dice, diceIndex, batterProbs, pitcherProbs, blendedProbs, diceTableRanges, runsScored } = result

  // Create play record
  const play = {
    game_id: game.id,
    play_number: playNumber,
    inning: game.inning,
    half: game.half,
    outs_before: game.outs,
    runner_1b_before: game.runner_1b,
    runner_2b_before: game.runner_2b,
    runner_3b_before: game.runner_3b,
    home_score_before: game.home_score,
    away_score_before: game.away_score,
    batter_id: batterId,
    pitcher_id: pitcherId,
    outcome,
    runs_scored: runsScored,
    dice_values: dice,
    dice_index: diceIndex,
    batter_probs: batterProbs,
    pitcher_probs: pitcherProbs,
    blended_probs: blendedProbs,
    dice_table_ranges: diceTableRanges,

    explanation: '' // Will be set below
  }

  // Calculate Drama Context
  const drama = getDramaContext(game)

  // Generate Announcer Call (replaces static explanation)
  const call = generateAnnouncerCall(
    game,
    outcome,
    runsScored,
    drama.dramaLevel,
    drama.isWalkOffSituation,
    drama.isComebackPotential
  )

  // Combine play-by-play and color commentary
  play.explanation = call.playByPlay + (call.colorCommentary ? ` ${call.colorCommentary}` : '')

  // Update game state
  const updatedGame = { ...game }
  updatedGame.status = 'in_progress'
  
  // Calculate new base state
  const baseState: BaseState = {
    runner1b: game.runner_1b,
    runner2b: game.runner_2b,
    runner3b: game.runner_3b
  }
  const baseResult = advanceRunners(baseState, batterId, outcome, game.outs)
  
  updatedGame.runner_1b = baseResult.newState.runner1b
  updatedGame.runner_2b = baseResult.newState.runner2b
  updatedGame.runner_3b = baseResult.newState.runner3b

  if (game.half === 'top') {
    updatedGame.away_score += runsScored
  } else {
    updatedGame.home_score += runsScored
  }

  if (outcome === 'K' || outcome === 'OUT') {
    updatedGame.outs += 1
    updatedGame.pitcher_outs += 1
  }

  // Update box score
  updateBoxScore(updatedGame, batterId, pitcherId, outcome, runsScored)

  // Advance batter
  const lineup = game.half === 'top' ? game.away_lineup : game.home_lineup
  updatedGame.current_batter_idx = (game.current_batter_idx + 1) % lineup.length

  // Check for inning change
  if (updatedGame.outs >= 3) {
    // Record inning runs - calculate how many runs were scored this half-inning
    // We need to determine the score at the start of this half-inning vs now
    const teamBox = game.half === 'top' ? updatedGame.box_score.away : updatedGame.box_score.home
    
    // Calculate runs scored this inning by summing all previous innings and comparing to total
    const previousInningsRuns = teamBox.innings.reduce((sum, r) => sum + r, 0)
    const currentTotalScore = game.half === 'top' ? updatedGame.away_score : updatedGame.home_score
    const inningRuns = currentTotalScore - previousInningsRuns
    
    // Ensure innings array is long enough
    while (teamBox.innings.length < game.inning) {
      teamBox.innings.push(0)
    }
    teamBox.innings[game.inning - 1] = inningRuns

    updatedGame.outs = 0
    updatedGame.runner_1b = null
    updatedGame.runner_2b = null
    updatedGame.runner_3b = null
    updatedGame.current_batter_idx = 0

    if (game.half === 'top') {
      updatedGame.half = 'bottom'
      updatedGame.current_pitcher_id = game.away_pitchers[0]
    } else {
      updatedGame.half = 'top'
      updatedGame.inning += 1
      updatedGame.current_pitcher_id = game.home_pitchers[0]
    }
  }

  // Check for game end
  if (isGameOver(updatedGame)) {
    updatedGame.status = 'completed'
    updatedGame.completed_at = new Date().toISOString()
  }

  updatedGame.rng_state = rng.getState()

  return { updatedGame, play }
}

function updateBoxScore(
  game: Game,
  batterId: string,
  pitcherId: string,
  outcome: Outcome,
  runsScored: number
) {
  const battingTeam = game.half === 'top' ? game.box_score.away : game.box_score.home
  const pitchingTeam = game.half === 'top' ? game.box_score.home : game.box_score.away

  if (!battingTeam.batting[batterId]) {
    battingTeam.batting[batterId] = { ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, '2b': 0, '3b': 0, hr: 0 }
  }
  if (!pitchingTeam.pitching[pitcherId]) {
    pitchingTeam.pitching[pitcherId] = { ip_outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0 }
  }

  const batterLine = battingTeam.batting[batterId]
  const pitcherLine = pitchingTeam.pitching[pitcherId]

  switch (outcome) {
    case '1B':
      batterLine.ab += 1; batterLine.h += 1; battingTeam.hits += 1; pitcherLine.h += 1
      break
    case '2B':
      batterLine.ab += 1; batterLine.h += 1; batterLine['2b'] += 1; battingTeam.hits += 1; pitcherLine.h += 1
      break
    case '3B':
      batterLine.ab += 1; batterLine.h += 1; batterLine['3b'] += 1; battingTeam.hits += 1; pitcherLine.h += 1
      break
    case 'HR':
      batterLine.ab += 1; batterLine.h += 1; batterLine.hr += 1; battingTeam.hits += 1; pitcherLine.h += 1; pitcherLine.hr += 1
      break
    case 'BB':
      batterLine.bb += 1; pitcherLine.bb += 1
      break
    case 'K':
      batterLine.ab += 1; batterLine.so += 1; pitcherLine.so += 1; pitcherLine.ip_outs += 1
      break
    case 'OUT':
      batterLine.ab += 1; pitcherLine.ip_outs += 1
      break
  }

  batterLine.rbi += runsScored
  pitcherLine.r += runsScored
  pitcherLine.er += runsScored
}

function isGameOver(game: Game): boolean {
  if (game.inning < 9) return false

  // Walk-off - home team takes the lead in bottom of 9th or later
  if (game.half === 'bottom' && game.home_score > game.away_score) {
    return true
  }

  // After 9+ complete innings when scores are different
  // This is checked at the start of a new inning (after half-inning transition)
  // When transitioning from bottom of Nth to top of (N+1)th with different scores
  if (game.inning >= 10 && game.half === 'top' && game.outs === 0 && game.home_score !== game.away_score) {
    return true
  }

  return false
}

function generateExplanation(outcome: Outcome, runsScored: number, dice: [number, number, number]): string {
  const diceStr = `[${dice.join('-')}]`
  const outcomeText: Record<Outcome, string> = {
    'K': 'strikes out',
    'BB': 'walks',
    'OUT': 'grounds out',
    '1B': 'singles',
    '2B': 'doubles',
    '3B': 'triples',
    'HR': 'homers'
  }
  let text = `${outcomeText[outcome]} ${diceStr}`
  if (runsScored > 0) {
    text += ` - ${runsScored} run${runsScored > 1 ? 's' : ''} score${runsScored === 1 ? 's' : ''}`
  }
  return text
}

async function updateStandings(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, game: Game) {
  const homeWon = game.home_score > game.away_score

  // Update home team
  await supabase.rpc('update_standing', {
    p_season_id: game.season_id,
    p_team_id: game.home_team_id,
    p_won: homeWon,
    p_runs_for: game.home_score,
    p_runs_against: game.away_score
  })

  // Update away team
  await supabase.rpc('update_standing', {
    p_season_id: game.season_id,
    p_team_id: game.away_team_id,
    p_won: !homeWon,
    p_runs_for: game.away_score,
    p_runs_against: game.home_score
  })
}
