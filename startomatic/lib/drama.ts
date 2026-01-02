// Drama/Excitement Engine for Garoball
// Calculates leverage, drama levels, crowd mood, and player momentum

import type { Game, Outcome } from '@/types'

// Drama levels based on leverage index
export type DramaLevel = 'routine' | 'tense' | 'clutch' | 'legendary'

// Crowd mood based on drama
export type CrowdMood = 'quiet' | 'buzzing' | 'roaring' | 'deafening'

// Player momentum states
export type MomentumState = 'cold' | 'neutral' | 'hot'

export interface DramaContext {
  leverageIndex: number
  dramaLevel: DramaLevel
  crowdMood: CrowdMood
  isWalkOffSituation: boolean
  isComebackPotential: boolean
}

export interface PlayerMomentum {
  playerId: string
  recentOutcomes: Outcome[]
  state: MomentumState
  emoji: string
}

/**
 * Calculate leverage index for the current game state
 * Leverage measures how much the current play affects win probability
 * Based on inning, score differential, runners on base, and outs
 */
export function calculateLeverageIndex(game: Game): number {
  const { inning, outs, runner_1b, runner_2b, runner_3b, home_score, away_score, half } = game
  
  // Base leverage increases with inning
  let leverage = 0.0
  
  // Early innings (1-3): 0.5-0.8
  // Middle innings (4-6): 0.8-1.2
  // Late innings (7-9+): 1.5-3.0
  if (inning <= 3) {
    leverage = 0.5 + (inning - 1) * 0.15
  } else if (inning <= 6) {
    leverage = 0.8 + (inning - 4) * 0.2
  } else {
    leverage = 1.5 + (inning - 7) * 0.5
  }
  
  // Score differential modifier (close games = higher leverage)
  const scoreDiff = Math.abs(home_score - away_score)
  if (scoreDiff === 0) {
    leverage *= 1.8 // Tied game
  } else if (scoreDiff === 1) {
    leverage *= 1.5 // One-run game
  } else if (scoreDiff === 2) {
    leverage *= 1.2 // Two-run game
  } else if (scoreDiff >= 5) {
    leverage *= 0.4 // Blowout
  }
  
  // Runners on base multiplier
  const runnersOn = [runner_1b, runner_2b, runner_3b].filter(r => r !== null).length
  if (runnersOn === 0) {
    leverage *= 0.8 // Bases empty
  } else if (runnersOn === 1) {
    leverage *= 1.1 // One on
  } else if (runnersOn === 2) {
    leverage *= 1.3 // Two on
  } else {
    leverage *= 1.6 // Bases loaded
  }
  
  // Outs multiplier (2 outs = highest leverage)
  if (outs === 0) {
    leverage *= 0.9
  } else if (outs === 1) {
    leverage *= 1.1
  } else {
    leverage *= 1.4 // Two outs
  }
  
  // Walk-off situation (bottom 9th or later, home team at bat, tied or losing by 1-3)
  if (half === 'bottom' && inning >= 9 && scoreDiff <= 3 && away_score >= home_score) {
    leverage *= 2.0
  }
  
  return Math.max(0, Math.min(leverage, MAX_LEVERAGE_INDEX)) // Cap between 0 and 10
}

// Maximum leverage index cap (10 represents extremely high leverage situations)
// Values above 10 are theoretically possible but practically very rare
const MAX_LEVERAGE_INDEX = 10

/**
 * Get drama level based on leverage index
 */
export function getDramaLevel(leverageIndex: number): DramaLevel {
  if (leverageIndex >= 3.5) return 'legendary'
  if (leverageIndex >= 2.0) return 'clutch'
  if (leverageIndex >= 1.2) return 'tense'
  return 'routine'
}

/**
 * Get crowd mood based on drama level
 */
export function getCrowdMood(dramaLevel: DramaLevel): CrowdMood {
  switch (dramaLevel) {
    case 'legendary': return 'deafening'
    case 'clutch': return 'roaring'
    case 'tense': return 'buzzing'
    case 'routine': return 'quiet'
  }
}

/**
 * Check if the current situation is a walk-off opportunity
 */
export function isWalkOffSituation(game: Game): boolean {
  const { inning, half, home_score, away_score, runner_1b, runner_2b, runner_3b } = game
  
  // Must be bottom of 9th or later
  if (half !== 'bottom' || inning < 9) return false
  
  // Home team must be tied or losing
  if (home_score > away_score) return false
  
  // Need to be within striking distance
  const scoreDiff = away_score - home_score
  if (scoreDiff > 3) return false
  
  // If tied, any runner or batter can win it
  // If behind, need enough runners to tie/win
  return true
}

/**
 * Check if there's comeback potential (team down by 3+ runs in late innings)
 */
export function isComebackPotential(game: Game): boolean {
  const { inning, home_score, away_score, half } = game
  
  // Must be 7th inning or later
  if (inning < 7) return false
  
  // Check if batting team is down by 3+ runs
  const scoreDiff = half === 'top' 
    ? home_score - away_score 
    : away_score - home_score
  
  return scoreDiff >= 3
}

/**
 * Get drama context for the current game state
 */
export function getDramaContext(game: Game): DramaContext {
  const leverageIndex = calculateLeverageIndex(game)
  const dramaLevel = getDramaLevel(leverageIndex)
  const crowdMood = getCrowdMood(dramaLevel)
  const isWalkOff = isWalkOffSituation(game)
  const isComeback = isComebackPotential(game)
  
  return {
    leverageIndex,
    dramaLevel,
    crowdMood,
    isWalkOffSituation: isWalkOff,
    isComebackPotential: isComeback
  }
}

/**
 * Track player momentum based on recent outcomes
 * Hot = 3+ hits in last 5 PAs
 * Cold = 0 hits in last 5 PAs (with at least 5 PAs)
 */
export function calculatePlayerMomentum(
  playerId: string,
  recentOutcomes: Outcome[]
): PlayerMomentum {
  const lastFive = recentOutcomes.slice(-5)
  
  // Count hits in last 5 PAs
  const hits = lastFive.filter(o => 
    o === '1B' || o === '2B' || o === '3B' || o === 'HR'
  ).length
  
  let state: MomentumState = 'neutral'
  let emoji = ''
  
  if (lastFive.length >= 3) {
    if (hits >= 3) {
      state = 'hot'
      emoji = '🔥'
    } else if (lastFive.length === 5 && hits === 0) {
      state = 'cold'
      emoji = '❄️'
    }
  }
  
  return {
    playerId,
    recentOutcomes: lastFive,
    state,
    emoji
  }
}

/**
 * Get momentum emoji for display
 */
export function getMomentumEmoji(momentum: PlayerMomentum): string {
  return momentum.emoji
}

/**
 * Update momentum with a new outcome
 */
export function updateMomentum(
  momentum: PlayerMomentum,
  outcome: Outcome
): PlayerMomentum {
  const newOutcomes = [...momentum.recentOutcomes, outcome]
  return calculatePlayerMomentum(momentum.playerId, newOutcomes)
}
