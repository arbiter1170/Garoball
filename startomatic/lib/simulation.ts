// Core game simulation engine for Garoball
// Simulates plate appearances and manages game state

import type {
  Game,
  Play,
  Outcome,
  InningHalf,
  PlayerRating,
  OutcomeProbabilities,
  DiceTableRanges,
  BoxScore,
  TeamBoxScore,
  PlayerBattingLine,
  PlayerPitchingLine,
  Player
} from '@/types'
import { SeededRng, generateSeed } from './rng'
import {
  getRatingProbabilities,
  blendProbabilities,
  probabilitiesToDiceRanges,
  getOutcomeFromDiceIndex,
  LEAGUE_AVERAGE_PROBS
} from './probabilities'
import { advanceRunners, BaseState } from './baserunning'
import { calculateMatchupProbabilities } from './handedness'

export interface SimulationContext {
  game: Game
  homeRatings: Map<string, PlayerRating>
  awayRatings: Map<string, PlayerRating>
  homePlayers?: Map<string, Player>
  awayPlayers?: Map<string, Player>
  rng: SeededRng
  useHandednessMatchups?: boolean
}

export interface PlateAppearanceResult {
  outcome: Outcome
  diceValues: [number, number, number]
  diceIndex: number
  batterProbs: OutcomeProbabilities
  pitcherProbs: OutcomeProbabilities
  blendedProbs: OutcomeProbabilities
  diceTableRanges: DiceTableRanges
  runsScored: number
  explanation: string
}

// Initialize a new game
export function initializeGame(
  seasonId: string,
  homeTeamId: string,
  awayTeamId: string,
  homeLineup: string[],
  awayLineup: string[],
  homePitcherId: string,
  awayPitcherId: string,
  gameNumber: number = 1,
  seed?: string
): Partial<Game> {
  const gameSeed = seed || generateSeed()

  const emptyBattingLine = (): PlayerBattingLine => ({
    ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, '2b': 0, '3b': 0, hr: 0
  })

  const emptyPitchingLine = (): PlayerPitchingLine => ({
    ip_outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0
  })

  // Initialize box score with all players
  const homeBatting: Record<string, PlayerBattingLine> = {}
  const awayBatting: Record<string, PlayerBattingLine> = {}
  const homePitching: Record<string, PlayerPitchingLine> = {}
  const awayPitching: Record<string, PlayerPitchingLine> = {}

  homeLineup.forEach(id => { homeBatting[id] = emptyBattingLine() })
  awayLineup.forEach(id => { awayBatting[id] = emptyBattingLine() })
  homePitching[homePitcherId] = emptyPitchingLine()
  awayPitching[awayPitcherId] = emptyPitchingLine()

  const boxScore: BoxScore = {
    home: {
      innings: [],
      hits: 0,
      errors: 0,
      batting: homeBatting,
      pitching: homePitching
    },
    away: {
      innings: [],
      hits: 0,
      errors: 0,
      batting: awayBatting,
      pitching: awayPitching
    }
  }

  return {
    season_id: seasonId,
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    game_number: gameNumber,
    status: 'scheduled',
    inning: 1,
    half: 'top',
    outs: 0,
    home_score: 0,
    away_score: 0,
    runner_1b: null,
    runner_2b: null,
    runner_3b: null,
    current_batter_idx: 0,
    current_pitcher_id: homePitcherId, // Home team pitches first (top of inning)
    pitcher_outs: 0,
    home_lineup: homeLineup,
    away_lineup: awayLineup,
    home_pitchers: [homePitcherId],
    away_pitchers: [awayPitcherId],
    seed: gameSeed,
    rng_state: { callCount: 0 },
    box_score: boxScore
  }
}

// Get current batter ID
export function getCurrentBatter(game: Game): string {
  const lineup = game.half === 'top' ? game.away_lineup : game.home_lineup
  return lineup[game.current_batter_idx % lineup.length]
}

// Get current pitcher ID
export function getCurrentPitcher(game: Game): string {
  return game.current_pitcher_id!
}

// Simulate a single plate appearance
export function simulatePlateAppearance(
  ctx: SimulationContext
): PlateAppearanceResult {
  const { game, rng, useHandednessMatchups = false } = ctx

  const batterId = getCurrentBatter(game)
  const pitcherId = getCurrentPitcher(game)

  // Get ratings
  const ratings = game.half === 'top' ? ctx.awayRatings : ctx.homeRatings
  const pitcherRatings = game.half === 'top' ? ctx.homeRatings : ctx.awayRatings

  const batterRating = ratings.get(batterId)
  const pitcherRating = pitcherRatings.get(pitcherId)

  // Get probabilities
  const batterProbs = batterRating
    ? getRatingProbabilities(batterRating)
    : LEAGUE_AVERAGE_PROBS
  const pitcherProbs = pitcherRating
    ? getRatingProbabilities(pitcherRating)
    : LEAGUE_AVERAGE_PROBS

  // Blend with handedness awareness if enabled and player data available
  let blendedProbs: OutcomeProbabilities
  if (useHandednessMatchups && ctx.homePlayers && ctx.awayPlayers) {
    const players = game.half === 'top' ? ctx.awayPlayers : ctx.homePlayers
    const pitcherPlayers = game.half === 'top' ? ctx.homePlayers : ctx.awayPlayers
    
    const batter = players.get(batterId)
    const pitcher = pitcherPlayers.get(pitcherId)
    
    if (batter?.bats && pitcher?.throws) {
      // Use handedness-aware calculation
      blendedProbs = calculateMatchupProbabilities(
        batterProbs,
        pitcherProbs,
        batter.bats,
        pitcher.throws,
        0.65 // Batter weight
      )
    } else {
      // Fall back to standard blend
      blendedProbs = blendProbabilities(batterProbs, pitcherProbs)
    }
  } else {
    // Standard blend (backward compatible)
    blendedProbs = blendProbabilities(batterProbs, pitcherProbs)
  }

  // Calculate dice table ranges from blended probabilities (for display)
  const diceTableRanges = probabilitiesToDiceRanges(blendedProbs)

  // Roll dice - these determine the outcome (Strat-O-Matic style)
  // The outcome is probability-weighted to account for the 3d6 bell curve distribution
  const { dice, index } = rng.rollDiceIndex()
  const outcome = getOutcomeFromDiceIndex(index, diceTableRanges, blendedProbs)

  // Calculate runs scored
  const baseState: BaseState = {
    runner1b: game.runner_1b,
    runner2b: game.runner_2b,
    runner3b: game.runner_3b
  }
  const baseResult = advanceRunners(baseState, batterId, outcome, game.outs)

  // Generate explanation
  const explanation = generateExplanation(outcome, baseResult.runsScored, dice)

  return {
    outcome,
    diceValues: dice,
    diceIndex: index,
    batterProbs,
    pitcherProbs,
    blendedProbs,
    diceTableRanges,
    runsScored: baseResult.runsScored,
    explanation
  }
}

// Apply plate appearance result to game state
export function applyPlateAppearance(
  game: Game,
  result: PlateAppearanceResult,
  rng: SeededRng
): { updatedGame: Game; play: Partial<Play> } {
  const batterId = getCurrentBatter(game)
  const pitcherId = getCurrentPitcher(game)

  // Create play record
  const play: Partial<Play> = {
    game_id: game.id,
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
    outcome: result.outcome,
    runs_scored: result.runsScored,
    dice_values: result.diceValues,
    dice_index: result.diceIndex,
    batter_probs: result.batterProbs,
    pitcher_probs: result.pitcherProbs,
    blended_probs: result.blendedProbs,
    dice_table_ranges: result.diceTableRanges,
    explanation: result.explanation
  }

  // Update game state
  const updatedGame = { ...game }

  // Update base runners
  const baseState: BaseState = {
    runner1b: game.runner_1b,
    runner2b: game.runner_2b,
    runner3b: game.runner_3b
  }
  const baseResult = advanceRunners(baseState, batterId, result.outcome, game.outs)

  updatedGame.runner_1b = baseResult.newState.runner1b
  updatedGame.runner_2b = baseResult.newState.runner2b
  updatedGame.runner_3b = baseResult.newState.runner3b

  // Update score
  if (game.half === 'top') {
    updatedGame.away_score += result.runsScored
  } else {
    updatedGame.home_score += result.runsScored
  }

  // Credit individual runners who scored with their run
  const battingTeamBox = game.half === 'top' ? updatedGame.box_score.away : updatedGame.box_score.home
  for (const runnerId of baseResult.runnersScored) {
    if (battingTeamBox.batting[runnerId]) {
      battingTeamBox.batting[runnerId].r += 1
    }
  }

  // Update outs
  if (result.outcome === 'K' || result.outcome === 'OUT') {
    updatedGame.outs += 1
    updatedGame.pitcher_outs += 1
  }

  // Update box score
  updateBoxScore(updatedGame, batterId, pitcherId, result)

  // Advance batter
  if (result.outcome !== 'BB' || true) { // Always advance in lineup
    const lineup = game.half === 'top' ? game.away_lineup : game.home_lineup
    updatedGame.current_batter_idx = (game.current_batter_idx + 1) % lineup.length
  }

  // Check for inning change
  if (updatedGame.outs >= 3) {
    updatedGame.outs = 0
    updatedGame.runner_1b = null
    updatedGame.runner_2b = null
    updatedGame.runner_3b = null
    // Note: current_batter_idx is NOT reset - lineup persists across innings

    // Record inning runs in box score
    const teamBox = game.half === 'top' ? updatedGame.box_score.away : updatedGame.box_score.home
    const inningRuns = game.half === 'top'
      ? updatedGame.away_score - game.away_score
      : updatedGame.home_score - game.home_score

    if (teamBox.innings.length < game.inning) {
      teamBox.innings.push(inningRuns)
    }

    if (game.half === 'top') {
      updatedGame.half = 'bottom'
      // Switch to away pitcher
      updatedGame.current_pitcher_id = game.away_pitchers[0]
    } else {
      // Check for walk-off or game end
      if (game.inning >= 9 && updatedGame.home_score > updatedGame.away_score) {
        updatedGame.status = 'completed'
        updatedGame.completed_at = new Date().toISOString()
      } else {
        updatedGame.half = 'top'
        updatedGame.inning += 1
        // Switch to home pitcher
        updatedGame.current_pitcher_id = game.home_pitchers[0]
      }
    }
  }

  // Check for game end (after 9 innings, not tied)
  if (
    updatedGame.inning > 9 &&
    updatedGame.half === 'top' &&
    updatedGame.outs === 0 &&
    updatedGame.home_score !== updatedGame.away_score
  ) {
    updatedGame.status = 'completed'
    updatedGame.completed_at = new Date().toISOString()
  }

  // Walk-off check (bottom of 9+ with home team ahead)
  if (
    game.half === 'bottom' &&
    game.inning >= 9 &&
    updatedGame.home_score > updatedGame.away_score
  ) {
    updatedGame.status = 'completed'
    updatedGame.completed_at = new Date().toISOString()
  }

  // Update RNG state
  updatedGame.rng_state = rng.getState()

  return { updatedGame, play }
}

// Update box score with plate appearance result
function updateBoxScore(
  game: Game,
  batterId: string,
  pitcherId: string,
  result: PlateAppearanceResult
): void {
  const battingTeam = game.half === 'top' ? game.box_score.away : game.box_score.home
  const pitchingTeam = game.half === 'top' ? game.box_score.home : game.box_score.away

  // Initialize if needed
  if (!battingTeam.batting[batterId]) {
    battingTeam.batting[batterId] = {
      ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, '2b': 0, '3b': 0, hr: 0
    }
  }
  if (!pitchingTeam.pitching[pitcherId]) {
    pitchingTeam.pitching[pitcherId] = {
      ip_outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0
    }
  }

  const batterLine = battingTeam.batting[batterId]
  const pitcherLine = pitchingTeam.pitching[pitcherId]

  // Update batting line
  switch (result.outcome) {
    case '1B':
      batterLine.ab += 1
      batterLine.h += 1
      battingTeam.hits += 1
      pitcherLine.h += 1
      break
    case '2B':
      batterLine.ab += 1
      batterLine.h += 1
      batterLine['2b'] += 1
      battingTeam.hits += 1
      pitcherLine.h += 1
      break
    case '3B':
      batterLine.ab += 1
      batterLine.h += 1
      batterLine['3b'] += 1
      battingTeam.hits += 1
      pitcherLine.h += 1
      break
    case 'HR':
      batterLine.ab += 1
      batterLine.h += 1
      batterLine.hr += 1
      battingTeam.hits += 1
      pitcherLine.h += 1
      pitcherLine.hr += 1
      break
    case 'BB':
      batterLine.bb += 1
      pitcherLine.bb += 1
      break
    case 'K':
      batterLine.ab += 1
      batterLine.so += 1
      pitcherLine.so += 1
      pitcherLine.ip_outs += 1
      break
    case 'OUT':
      batterLine.ab += 1
      pitcherLine.ip_outs += 1
      break
  }

  // Update RBIs and runs
  batterLine.rbi += result.runsScored
  pitcherLine.r += result.runsScored
  pitcherLine.er += result.runsScored // Assume earned for MVP
}

// Generate human-readable explanation
function generateExplanation(
  outcome: Outcome,
  runsScored: number,
  dice: [number, number, number]
): string {
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

// Simulate entire game
export async function simulateFullGame(
  ctx: SimulationContext,
  onPlay?: (game: Game, play: Partial<Play>) => void
): Promise<{ game: Game; plays: Partial<Play>[] }> {
  const plays: Partial<Play>[] = []
  let game = { ...ctx.game }
  game.status = 'in_progress'

  let playNumber = 0
  const maxPlays = 500 // Safety limit

  while (game.status !== 'completed' && playNumber < maxPlays) {
    const result = simulatePlateAppearance({ ...ctx, game })
    const { updatedGame, play } = applyPlateAppearance(game, result, ctx.rng)

    play.play_number = playNumber++
    plays.push(play)
    game = updatedGame

    if (onPlay) {
      onPlay(game, play)
    }
  }

  return { game, plays }
}

// Check if game is over
export function isGameOver(game: Game): boolean {
  if (game.inning < 9) return false

  // After top of 9+, home team leading
  if (game.half === 'top' && game.outs >= 3 && game.home_score > game.away_score) {
    return true
  }

  // After 9+ complete innings, not tied
  if (game.inning >= 9 && game.half === 'bottom' && game.outs >= 3) {
    return game.home_score !== game.away_score
  }

  // Walk-off
  if (game.half === 'bottom' && game.inning >= 9 && game.home_score > game.away_score) {
    return true
  }

  return false
}
