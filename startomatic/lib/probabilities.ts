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

// 3d6 probability distribution - each index represents (sum - 3)
// Sum 3 = index 0, Sum 18 = index 15
// Values are the probability of rolling exactly that sum (out of 216 total combinations)
const DICE_3D6_PROBABILITIES: number[] = [
  1/216,   // Sum 3:  1 way   = 0.463%
  3/216,   // Sum 4:  3 ways  = 1.389%
  6/216,   // Sum 5:  6 ways  = 2.778%
  10/216,  // Sum 6:  10 ways = 4.630%
  15/216,  // Sum 7:  15 ways = 6.944%
  21/216,  // Sum 8:  21 ways = 9.722%
  25/216,  // Sum 9:  25 ways = 11.574%
  27/216,  // Sum 10: 27 ways = 12.500%
  27/216,  // Sum 11: 27 ways = 12.500%
  25/216,  // Sum 12: 25 ways = 11.574%
  21/216,  // Sum 13: 21 ways = 9.722%
  15/216,  // Sum 14: 15 ways = 6.944%
  10/216,  // Sum 15: 10 ways = 4.630%
  6/216,   // Sum 16: 6 ways  = 2.778%
  3/216,   // Sum 17: 3 ways  = 1.389%
  1/216,   // Sum 18: 1 way   = 0.463%
]

// Cumulative probabilities for 3d6 (probability of rolling <= sum)
// Used to convert dice roll to a uniform probability for outcome selection
const DICE_3D6_CUMULATIVE: number[] = (() => {
  const cumulative: number[] = []
  let sum = 0
  for (const prob of DICE_3D6_PROBABILITIES) {
    sum += prob
    cumulative.push(sum)
  }
  return cumulative
})()

// Convert a dice index (0-15, where 0 = sum of 3) to a cumulative probability (0-1)
// This allows us to map the non-uniform 3d6 distribution to uniform probability space
export function diceIndexToCumulativeProbability(diceIndex: number): number {
  // Return the cumulative probability at the END of this dice sum's range
  // This ensures proper outcome distribution when compared against cumulative thresholds
  return DICE_3D6_CUMULATIVE[diceIndex]
}

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

// Build an optimal dice table that accounts for 3d6 probability distribution
// Uses greedy allocation: assign each dice sum to the outcome that needs probability most
// Ensures every outcome with non-zero probability gets at least one dice sum
function buildOptimalDiceTable(probs: OutcomeProbabilities): Outcome[] {
  const normalized = normalizeProbabilities(probs)
  const outcomes: Outcome[] = ['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']
  
  // Track how much probability each outcome still needs
  const remaining: Record<Outcome, number> = { ...normalized } as Record<Outcome, number>
  
  // Result table: index = dice sum - 3
  const table: Outcome[] = new Array(16).fill(null)
  const assigned = new Set<number>()
  
  // First pass: ensure each outcome with >0 probability gets at least one dice sum
  // Assign the rarest dice sums (3 and 18) to rarest outcomes for thematic feel
  const rareOutcomes = outcomes.filter(o => normalized[o] > 0 && normalized[o] < 0.05)
  const rareDiceIndices = [15, 0, 14, 1] // sums 18, 3, 17, 4 (rarest)
  
  for (let i = 0; i < rareOutcomes.length && i < rareDiceIndices.length; i++) {
    const outcome = rareOutcomes[i]
    const diceIdx = rareDiceIndices[i]
    if (!assigned.has(diceIdx)) {
      table[diceIdx] = outcome
      assigned.add(diceIdx)
      remaining[outcome] -= DICE_3D6_PROBABILITIES[diceIdx]
    }
  }
  
  // Sort remaining dice indices by their probability (highest first for better allocation)
  const remainingIndices = Array.from({ length: 16 }, (_, i) => i)
    .filter(i => !assigned.has(i))
    .sort((a, b) => DICE_3D6_PROBABILITIES[b] - DICE_3D6_PROBABILITIES[a])
  
  // Greedy allocation: assign each dice sum to outcome with most remaining need
  for (const diceIndex of remainingIndices) {
    const diceProb = DICE_3D6_PROBABILITIES[diceIndex]
    
    // Find outcome with largest remaining probability need
    let bestOutcome: Outcome = 'OUT'
    let bestNeed = -Infinity
    
    for (const outcome of outcomes) {
      const need = remaining[outcome]
      if (need > bestNeed) {
        bestNeed = need
        bestOutcome = outcome
      }
    }
    
    // Assign this dice sum to the best outcome
    table[diceIndex] = bestOutcome
    remaining[bestOutcome] -= diceProb
  }
  
  return table
}

// Convert probabilities to dice table ranges (for display/UI)
// Returns the ranges for each outcome in the 0-15 dice index space
export function probabilitiesToDiceRanges(probs: OutcomeProbabilities): DiceTableRanges {
  const table = buildOptimalDiceTable(probs)
  
  // Convert table array to ranges format
  const ranges: Partial<DiceTableRanges> = {
    K: [Infinity, -Infinity],
    BB: [Infinity, -Infinity],
    OUT: [Infinity, -Infinity],
    '1B': [Infinity, -Infinity],
    '2B': [Infinity, -Infinity],
    '3B': [Infinity, -Infinity],
    HR: [Infinity, -Infinity],
  }
  
  for (let i = 0; i < 16; i++) {
    const outcome = table[i]
    const [min, max] = ranges[outcome]!
    ranges[outcome] = [Math.min(min, i), Math.max(max, i)]
  }
  
  // Clean up any outcomes that weren't assigned (set to empty range)
  const outcomes: Outcome[] = ['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']
  for (const outcome of outcomes) {
    if (ranges[outcome]![0] === Infinity) {
      ranges[outcome] = [0, -1] // Empty range
    }
  }

  return ranges as DiceTableRanges
}

// Determine outcome from dice index using the optimized dice table
// This accounts for the non-uniform 3d6 distribution by pre-computing optimal assignments
export function getOutcomeFromDiceIndex(
  diceIndex: number,
  ranges: DiceTableRanges,
  probs?: OutcomeProbabilities
): Outcome {
  // If probabilities provided, build optimal table that accounts for 3d6 distribution
  if (probs) {
    const table = buildOptimalDiceTable(probs)
    return table[diceIndex] || 'OUT'
  }
  
  // Fallback to range-based lookup (for backward compatibility with stored dice tables)
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
