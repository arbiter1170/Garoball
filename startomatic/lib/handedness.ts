// Handedness-aware matchup calculations for Garoball
// Adjusts batter/pitcher probabilities based on platoon advantage

import type { OutcomeProbabilities, Handedness } from '@/types'

// Platoon advantage multipliers based on matchup type
// These values are based on MLB historical data showing platoon splits
interface PlatoonModifiers {
  powerBoost: number    // Multiplier for extra-base hits (2B, 3B, HR)
  contactBoost: number  // Multiplier for singles and contact
  strikeoutPenalty: number  // Multiplier for strikeout rate
  walkBonus: number     // Multiplier for walk rate
}

// Batter vs RHP (standard baseline - most batters face righties more often)
const BATTER_VS_RHP: Record<Handedness, PlatoonModifiers> = {
  R: {
    powerBoost: 0.95,      // Slight disadvantage
    contactBoost: 0.97,
    strikeoutPenalty: 1.05, // More strikeouts
    walkBonus: 0.95
  },
  L: {
    powerBoost: 1.12,      // Significant advantage
    contactBoost: 1.08,
    strikeoutPenalty: 0.88, // Fewer strikeouts
    walkBonus: 1.10
  },
  S: {
    powerBoost: 1.02,      // Slight advantage (switch to left)
    contactBoost: 1.03,
    strikeoutPenalty: 0.95,
    walkBonus: 1.02
  }
}

// Batter vs LHP
const BATTER_VS_LHP: Record<Handedness, PlatoonModifiers> = {
  R: {
    powerBoost: 1.15,      // Significant advantage
    contactBoost: 1.10,
    strikeoutPenalty: 0.85, // Fewer strikeouts
    walkBonus: 1.12
  },
  L: {
    powerBoost: 0.88,      // Disadvantage
    contactBoost: 0.92,
    strikeoutPenalty: 1.15, // More strikeouts
    walkBonus: 0.90
  },
  S: {
    powerBoost: 1.03,      // Slight advantage (switch to right)
    contactBoost: 1.02,
    strikeoutPenalty: 0.96,
    walkBonus: 1.03
  }
}

/**
 * Get platoon modifiers for a batter-pitcher matchup
 */
export function getPlatoonModifiers(
  batterHand: Handedness,
  pitcherHand: Handedness
): PlatoonModifiers {
  if (pitcherHand === 'L') {
    return BATTER_VS_LHP[batterHand]
  } else {
    // Treat both R and S pitchers the same from batter perspective
    return BATTER_VS_RHP[batterHand]
  }
}

/**
 * Apply handedness-based adjustments to batter probabilities
 */
export function applyHandednessModifiers(
  baseProbs: OutcomeProbabilities,
  batterHand: Handedness,
  pitcherHand: Handedness
): OutcomeProbabilities {
  const modifiers = getPlatoonModifiers(batterHand, pitcherHand)

  // Apply modifiers to each outcome type
  const adjusted = {
    K: baseProbs.K * modifiers.strikeoutPenalty,
    BB: baseProbs.BB * modifiers.walkBonus,
    OUT: baseProbs.OUT, // Base outs remain relatively constant
    '1B': baseProbs['1B'] * modifiers.contactBoost,
    '2B': baseProbs['2B'] * modifiers.powerBoost,
    '3B': baseProbs['3B'] * modifiers.powerBoost,
    HR: baseProbs.HR * modifiers.powerBoost
  }

  // Normalize to ensure probabilities sum to 1
  return normalizeProbabilities(adjusted)
}

/**
 * Calculate effective probabilities with handedness adjustments for a matchup
 */
export function calculateMatchupProbabilities(
  batterProbs: OutcomeProbabilities,
  pitcherProbs: OutcomeProbabilities,
  batterHand: Handedness,
  pitcherHand: Handedness,
  batterWeight: number = 0.65
): OutcomeProbabilities {
  // Apply handedness modifiers to batter's probabilities
  const adjustedBatterProbs = applyHandednessModifiers(
    batterProbs,
    batterHand,
    pitcherHand
  )

  // Blend batter and pitcher probabilities
  const pitcherWeight = 1 - batterWeight

  const blended = {
    K: adjustedBatterProbs.K * batterWeight + pitcherProbs.K * pitcherWeight,
    BB: adjustedBatterProbs.BB * batterWeight + pitcherProbs.BB * pitcherWeight,
    OUT: adjustedBatterProbs.OUT * batterWeight + pitcherProbs.OUT * pitcherWeight,
    '1B': adjustedBatterProbs['1B'] * batterWeight + pitcherProbs['1B'] * pitcherWeight,
    '2B': adjustedBatterProbs['2B'] * batterWeight + pitcherProbs['2B'] * pitcherWeight,
    '3B': adjustedBatterProbs['3B'] * batterWeight + pitcherProbs['3B'] * pitcherWeight,
    HR: adjustedBatterProbs.HR * batterWeight + pitcherProbs.HR * pitcherWeight
  }

  return normalizeProbabilities(blended)
}

/**
 * Normalize probabilities to sum to 1.0
 */
function normalizeProbabilities(probs: OutcomeProbabilities): OutcomeProbabilities {
  const total = probs.K + probs.BB + probs.OUT + probs['1B'] + probs['2B'] + probs['3B'] + probs.HR

  if (Math.abs(total - 1) < 0.001) {
    return probs
  }

  return {
    K: probs.K / total,
    BB: probs.BB / total,
    OUT: probs.OUT / total,
    '1B': probs['1B'] / total,
    '2B': probs['2B'] / total,
    '3B': probs['3B'] / total,
    HR: probs.HR / total
  }
}

/**
 * Get a description of the matchup advantage
 */
export function getMatchupDescription(
  batterHand: Handedness,
  pitcherHand: Handedness
): string {
  if (batterHand === 'S') {
    return 'Switch hitter advantage'
  }

  if (
    (batterHand === 'L' && pitcherHand === 'R') ||
    (batterHand === 'R' && pitcherHand === 'L')
  ) {
    return 'Platoon advantage'
  }

  return 'Same-handed matchup'
}
