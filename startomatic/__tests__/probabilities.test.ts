import { describe, it, expect } from 'vitest'
import {
  LEAGUE_AVERAGE_PROBS,
  blendProbabilities,
  probabilitiesToDiceRanges,
  getOutcomeFromDiceIndex,
  createDiceTable,
  calculateBattingProbabilities,
  calculatePitchingProbabilities,
  diceIndexToCumulativeProbability
} from '../lib/probabilities'

describe('LEAGUE_AVERAGE_PROBS', () => {
  it('probabilities sum to 1', () => {
    const sum = Object.values(LEAGUE_AVERAGE_PROBS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 3)
  })
})

describe('blendProbabilities', () => {
  it('blends equally with default weight', () => {
    const batter = { K: 0.2, BB: 0.1, OUT: 0.4, '1B': 0.15, '2B': 0.05, '3B': 0.02, HR: 0.08 }
    const pitcher = { K: 0.3, BB: 0.05, OUT: 0.4, '1B': 0.12, '2B': 0.04, '3B': 0.01, HR: 0.08 }
    
    const blended = blendProbabilities(batter, pitcher)
    
    expect(blended.K).toBeCloseTo(0.25, 2)
    expect(blended.BB).toBeCloseTo(0.075, 2)
  })

  it('result sums to 1', () => {
    const batter = { K: 0.2, BB: 0.1, OUT: 0.4, '1B': 0.15, '2B': 0.05, '3B': 0.02, HR: 0.08 }
    const pitcher = { K: 0.3, BB: 0.05, OUT: 0.4, '1B': 0.12, '2B': 0.04, '3B': 0.01, HR: 0.08 }
    
    const blended = blendProbabilities(batter, pitcher)
    const sum = Object.values(blended).reduce((a, b) => a + b, 0)
    
    expect(sum).toBeCloseTo(1, 3)
  })

  it('respects custom weight', () => {
    const batter = { K: 0.2, BB: 0.1, OUT: 0.4, '1B': 0.15, '2B': 0.05, '3B': 0.02, HR: 0.08 }
    const pitcher = { K: 0.3, BB: 0.1, OUT: 0.4, '1B': 0.1, '2B': 0.05, '3B': 0.01, HR: 0.04 }
    
    // 100% batter
    const allBatter = blendProbabilities(batter, pitcher, 1.0)
    expect(allBatter.K).toBeCloseTo(0.2, 2)
    
    // 100% pitcher
    const allPitcher = blendProbabilities(batter, pitcher, 0.0)
    expect(allPitcher.K).toBeCloseTo(0.3, 2)
  })
})

describe('probabilitiesToDiceRanges', () => {
  it('creates valid ranges', () => {
    const ranges = probabilitiesToDiceRanges(LEAGUE_AVERAGE_PROBS)
    
    // Each range should be [min, max] where min <= max (or empty)
    Object.values(ranges).forEach(([min, max]) => {
      // Empty ranges have min > max, which is valid
      if (max >= 0) {
        expect(min).toBeLessThanOrEqual(max)
      }
    })
  })

  it('assigns all dice indices to outcomes', () => {
    const ranges = probabilitiesToDiceRanges(LEAGUE_AVERAGE_PROBS)
    
    // Every dice index (0-15) should map to exactly one outcome
    for (let i = 0; i <= 15; i++) {
      const outcome = getOutcomeFromDiceIndex(i, ranges, LEAGUE_AVERAGE_PROBS)
      expect(['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']).toContain(outcome)
    }
  })
})

describe('getOutcomeFromDiceIndex', () => {
  it('returns valid outcome for all indices', () => {
    const ranges = probabilitiesToDiceRanges(LEAGUE_AVERAGE_PROBS)
    const validOutcomes = ['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']
    
    for (let i = 0; i <= 15; i++) {
      const outcome = getOutcomeFromDiceIndex(i, ranges)
      expect(validOutcomes).toContain(outcome)
    }
  })
})

describe('createDiceTable', () => {
  it('creates table of correct length', () => {
    const table = createDiceTable(LEAGUE_AVERAGE_PROBS)
    expect(table).toHaveLength(16) // 3d6 gives 3-18, 16 possible outcomes
  })

  it('contains only valid outcomes', () => {
    const table = createDiceTable(LEAGUE_AVERAGE_PROBS)
    const validOutcomes = ['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']
    
    table.forEach(outcome => {
      expect(validOutcomes).toContain(outcome)
    })
  })
})

describe('calculateBattingProbabilities', () => {
  it('calculates probabilities from stats', () => {
    const stats = {
      pa: 500,
      ab: 450,
      h: 135,
      '2b': 25,
      '3b': 5,
      hr: 20,
      bb: 45,
      so: 100
    }
    
    const probs = calculateBattingProbabilities(stats)
    
    // K% should be ~20%
    expect(probs.K).toBeCloseTo(0.2, 1)
    // BB% should be ~9%
    expect(probs.BB).toBeCloseTo(0.09, 1)
    // Probabilities should sum to 1
    const sum = Object.values(probs).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 3)
  })

  it('returns league average for empty stats', () => {
    const probs = calculateBattingProbabilities({
      pa: 0, ab: 0, h: 0, '2b': 0, '3b': 0, hr: 0, bb: 0, so: 0
    })
    
    expect(probs).toEqual(LEAGUE_AVERAGE_PROBS)
  })
})

describe('calculatePitchingProbabilities', () => {
  it('calculates probabilities from stats', () => {
    const stats = {
      ip_outs: 600, // 200 IP
      h: 180,
      hr: 20,
      bb: 60,
      so: 200
    }
    
    const probs = calculatePitchingProbabilities(stats)
    
    // Probabilities should sum to 1
    const sum = Object.values(probs).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 3)
  })
})

describe('diceIndexToCumulativeProbability', () => {
  it('returns values between 0 and 1', () => {
    for (let i = 0; i <= 15; i++) {
      const prob = diceIndexToCumulativeProbability(i)
      expect(prob).toBeGreaterThanOrEqual(0)
      expect(prob).toBeLessThanOrEqual(1)
    }
  })

  it('increases monotonically', () => {
    let prev = 0
    for (let i = 0; i <= 15; i++) {
      const prob = diceIndexToCumulativeProbability(i)
      expect(prob).toBeGreaterThan(prev)
      prev = prob
    }
  })

  it('extreme indices have extreme probabilities', () => {
    // Index 0 (sum 3) should be very low probability (~0.46%)
    expect(diceIndexToCumulativeProbability(0)).toBeLessThan(0.01)
    // Index 15 (sum 18) should equal 1.0 (cumulative of all outcomes)
    expect(diceIndexToCumulativeProbability(15)).toBeCloseTo(1.0, 3)
  })
})

describe('3d6 probability-weighted outcomes', () => {
  it('actual outcome distribution matches intended probabilities', () => {
    // This test verifies that when we account for 3d6 distribution,
    // outcomes occur at rates matching the intended probabilities
    const probs = LEAGUE_AVERAGE_PROBS
    const ranges = probabilitiesToDiceRanges(probs)
    
    // Count outcomes across all 216 possible 3d6 combinations
    const counts: Record<string, number> = { K: 0, BB: 0, OUT: 0, '1B': 0, '2B': 0, '3B': 0, HR: 0 }
    
    // For each possible 3d6 roll (1-1-1 through 6-6-6)
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        for (let d3 = 1; d3 <= 6; d3++) {
          const sum = d1 + d2 + d3
          const index = sum - 3
          // Use probability-weighted selection (pass probs as 3rd arg)
          const outcome = getOutcomeFromDiceIndex(index, ranges, probs)
          counts[outcome]++
        }
      }
    }
    
    // Convert counts to probabilities
    const totalRolls = 216
    const actualProbs = {
      K: counts.K / totalRolls,
      BB: counts.BB / totalRolls,
      OUT: counts.OUT / totalRolls,
      '1B': counts['1B'] / totalRolls,
      '2B': counts['2B'] / totalRolls,
      '3B': counts['3B'] / totalRolls,
      HR: counts.HR / totalRolls,
    }
    
    // Verify actual probabilities are close to intended
    // Allow 5% tolerance due to discrete dice mapping
    expect(actualProbs.K).toBeCloseTo(probs.K, 1)
    expect(actualProbs.BB).toBeCloseTo(probs.BB, 1)
    expect(actualProbs.OUT).toBeCloseTo(probs.OUT, 1)
    expect(actualProbs['1B']).toBeCloseTo(probs['1B'], 1)
  })
})
