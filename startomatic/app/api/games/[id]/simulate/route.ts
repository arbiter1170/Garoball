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
import type { Game, PlayerRating, Outcome } from '@/types'

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
    const { mode = 'play' } = body // 'play' for single PA, 'inning' for full inning, 'game' for full game

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

    // Get player ratings
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
    if (seasonYear) {
      const [{ data: bat }, { data: pit }] = await Promise.all([
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
      ])
      ratings = [...(bat || []), ...(pit || [])]
    } else {
      const { data: fallback } = await supabase
        .from('player_ratings')
        .select('*')
        .in('player_id', allPlayerIds)
      ratings = fallback || []
    }

    const ratingsMap = new Map<string, PlayerRating>()
    ratings?.forEach((r: any) => ratingsMap.set(`${r.player_id}:${r.rating_type}`, r as PlayerRating))

    // Initialize RNG from saved state
    const rng = game.rng_state
      ? SeededRng.fromState({ seed: parseInt(game.seed, 36) || 1, callCount: game.rng_state.callCount })
      : new SeededRng(game.seed)

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

      const result = simulatePlateAppearance(currentGame, ratingsMap, rng)
      const { updatedGame, play } = applyResult(currentGame, result, rng, playNumber++)

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
  rng: SeededRng
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

  const blendedProbs = blendProbabilities(batterProbs, pitcherProbs)
  const { dice, index } = rng.rollDiceIndex()
  const diceTableRanges = probabilitiesToDiceRanges(blendedProbs)
  const outcome = getOutcomeFromDiceIndex(index, diceTableRanges)

  return {
    batterId,
    pitcherId,
    outcome,
    dice,
    diceIndex: index,
    batterProbs,
    pitcherProbs,
    blendedProbs,
    diceTableRanges
  }
}

function applyResult(
  game: Game,
  result: ReturnType<typeof simulatePlateAppearance>,
  rng: SeededRng,
  playNumber: number
) {
  const { batterId, pitcherId, outcome, dice, diceIndex, batterProbs, pitcherProbs, blendedProbs, diceTableRanges } = result

  const baseState: BaseState = {
    runner1b: game.runner_1b,
    runner2b: game.runner_2b,
    runner3b: game.runner_3b
  }
  const baseResult = advanceRunners(baseState, batterId, outcome, game.outs)

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
    runs_scored: baseResult.runsScored,
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
    baseResult.runsScored,
    drama.dramaLevel,
    drama.isWalkOffSituation,
    drama.isComebackPotential
  )

  // Combine play-by-play and color commentary
  play.explanation = call.playByPlay + (call.colorCommentary ? ` ${call.colorCommentary}` : '')

  // Update game state
  const updatedGame = { ...game }
  updatedGame.status = 'in_progress'
  updatedGame.runner_1b = baseResult.newState.runner1b
  updatedGame.runner_2b = baseResult.newState.runner2b
  updatedGame.runner_3b = baseResult.newState.runner3b

  if (game.half === 'top') {
    updatedGame.away_score += baseResult.runsScored
  } else {
    updatedGame.home_score += baseResult.runsScored
  }

  if (outcome === 'K' || outcome === 'OUT') {
    updatedGame.outs += 1
    updatedGame.pitcher_outs += 1
  }

  // Update box score
  updateBoxScore(updatedGame, batterId, pitcherId, outcome, baseResult.runsScored)

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
