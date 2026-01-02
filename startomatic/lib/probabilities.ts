// Probability calculation for Garoball
// Based on historical Strat-O-Matic mechanics with batter/pitcher blending

import type { OutcomeProbabilities, DiceTableRanges, Outcome, PlayerRating } from '@/types'

const OUTCOME_ORDER: Outcome[] = ['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']

export function outcomeToCode(outcome: Outcome): number {
  const idx = OUTCOME_ORDER.indexOf(outcome)
  return idx >= 0 ? idx : 2 // default to OUT
}

export function codeToOutcome(code: number): Outcome {
  return OUTCOME_ORDER[code] ?? 'OUT'
}

// Get outcome from a random number (0-1) and probabilities
export function getOutcomeFromProbability(
  randomValue: number,
  probs: OutcomeProbabilities
): Outcome {
  const normalized = normalizeProbabilities(probs)
  const outcomes: Outcome[] = ['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']

  let cumulative = 0
  for (const outcome of outcomes) {
    cumulative += normalized[outcome]
    if (randomValue < cumulative) {
      return outcome
    }
  }

  return 'OUT' // Fallback
}

// Total slots in dice table (3d6 = 16 possible outcomes: 3-18)
const DICE_TABLE_SIZE = 16

// League average probabilities (used as baseline and for missing data)
export const LEAGUE_AVERAGE_PROBS: OutcomeProbabilities = {
  K: 0.220,    // ~22% strikeout rate
  BB: 0.085,   // ~8.5% walk rate  
  OUT: 0.455,  // ~45.5% other outs (adjusted to sum to 1)
  '1B': 0.155, // ~15.5% singles
  '2B': 0.050, // ~5% doubles
  '3B': 0.005, // ~0.5% triples
  HR: 0.030,   // ~3% home runs
}

// Ensure probabilities sum to 1
function normalizeProbabilities(probs: OutcomeProbabilities): OutcomeProbabilities {
  const total = probs.K + probs.BB + probs.OUT + probs['1B'] + probs['2B'] + probs['3B'] + probs.HR
  if (Math.abs(total - 1) < 0.001) return probs

  return {
    K: probs.K / total,
    BB: probs.BB / total,
    OUT: probs.OUT / total,
    '1B': probs['1B'] / total,
    '2B': probs['2B'] / total,
    '3B': probs['3B'] / total,
    HR: probs.HR / total,
  }
}

// Get probabilities from a player rating
export function getRatingProbabilities(rating: PlayerRating): OutcomeProbabilities {
  return normalizeProbabilities({
    K: rating.p_k,
    BB: rating.p_bb,
    OUT: rating.p_out,
    '1B': rating.p_1b,
    '2B': rating.p_2b,
    '3B': rating.p_3b,
    HR: rating.p_hr,
  })
}

// Blend batter and pitcher probabilities (50/50 classic Strat-O-Matic style)
export function blendProbabilities(
  batterProbs: OutcomeProbabilities,
  pitcherProbs: OutcomeProbabilities,
  batterWeight: number = 0.5
): OutcomeProbabilities {
  const pitcherWeight = 1 - batterWeight

  return normalizeProbabilities({
    K: batterProbs.K * batterWeight + pitcherProbs.K * pitcherWeight,
    BB: batterProbs.BB * batterWeight + pitcherProbs.BB * pitcherWeight,
    OUT: batterProbs.OUT * batterWeight + pitcherProbs.OUT * pitcherWeight,
    '1B': batterProbs['1B'] * batterWeight + pitcherProbs['1B'] * pitcherWeight,
    '2B': batterProbs['2B'] * batterWeight + pitcherProbs['2B'] * pitcherWeight,
    '3B': batterProbs['3B'] * batterWeight + pitcherProbs['3B'] * pitcherWeight,
    HR: batterProbs.HR * batterWeight + pitcherProbs.HR * pitcherWeight,
  })
}

// Convert probabilities to dice table ranges
// Returns the ranges for each outcome in the 0-15 dice index space
export function probabilitiesToDiceRanges(probs: OutcomeProbabilities): DiceTableRanges {
  const normalized = normalizeProbabilities(probs)
  const outcomes: Outcome[] = ['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']
  const ranges: Partial<DiceTableRanges> = {}

  let currentStart = 0

  for (const outcome of outcomes) {
    const slots = Math.round(normalized[outcome] * DICE_TABLE_SIZE)
    const end = Math.min(currentStart + Math.max(slots - 1, 0), DICE_TABLE_SIZE - 1)

    ranges[outcome] = [currentStart, end]
    currentStart = end + 1

    // Ensure we don't overflow
    if (currentStart >= DICE_TABLE_SIZE) {
      currentStart = DICE_TABLE_SIZE - 1
    }
  }

  // Make sure the last outcome reaches the end
  ranges.HR = [ranges.HR![0], DICE_TABLE_SIZE - 1]

  return ranges as DiceTableRanges
}

// Determine outcome from dice index using ranges
export function getOutcomeFromDiceIndex(
  diceIndex: number,
  ranges: DiceTableRanges
): Outcome {
  const outcomes: Outcome[] = ['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']

  for (const outcome of outcomes) {
    const [min, max] = ranges[outcome]
    if (diceIndex >= min && diceIndex <= max) {
      return outcome
    }
  }

  // Fallback (should never happen)
  return 'OUT'
}

// Create a dice table array from probabilities
// Each slot contains the outcome for that dice index
export function createDiceTable(probs: OutcomeProbabilities): Outcome[] {
  const ranges = probabilitiesToDiceRanges(probs)
  const table: Outcome[] = []

  for (let i = 0; i < DICE_TABLE_SIZE; i++) {
    table.push(getOutcomeFromDiceIndex(i, ranges))
  }

  return table
}

// Calculate probabilities from historical stats
export function calculateBattingProbabilities(stats: {
  pa: number
  ab: number
  h: number
  '2b': number
  '3b': number
  hr: number
  bb: number
  so: number
}): OutcomeProbabilities {
  const pa = stats.pa || stats.ab + stats.bb
  if (pa === 0) return LEAGUE_AVERAGE_PROBS

  const singles = stats.h - stats['2b'] - stats['3b'] - stats.hr

  return normalizeProbabilities({
    K: stats.so / pa,
    BB: stats.bb / pa,
    OUT: (stats.ab - stats.h) / pa,
    '1B': singles / pa,
    '2B': stats['2b'] / pa,
    '3B': stats['3b'] / pa,
    HR: stats.hr / pa,
  })
}

export function calculatePitchingProbabilities(stats: {
  ip_outs: number
  h: number
  hr: number
  bb: number
  so: number
}): OutcomeProbabilities {
  // Estimate plate appearances from outs + hits + walks
  const pa = stats.ip_outs + stats.h + stats.bb
  if (pa === 0) return LEAGUE_AVERAGE_PROBS

  // Estimate hit types (pitching stats often lack breakdown)
  const singles = Math.round(stats.h * 0.7) // ~70% singles
  const doubles = Math.round(stats.h * 0.2)  // ~20% doubles
  const triples = Math.round(stats.h * 0.02) // ~2% triples
  const hrs = stats.hr

  const outs = stats.ip_outs - stats.so // Non-K outs

  return normalizeProbabilities({
    K: stats.so / pa,
    BB: stats.bb / pa,
    OUT: Math.max(0, outs / pa),
    '1B': singles / pa,
    '2B': doubles / pa,
    '3B': triples / pa,
    HR: hrs / pa,
  })
}
