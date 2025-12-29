import { describe, it, expect } from 'vitest'
import {
  LEAGUE_AVERAGE_PROBS,
  blendProbabilities,
  probabilitiesToDiceRanges,
  getOutcomeFromDiceIndex,
  createDiceTable,
  calculateBattingProbabilities,
  calculatePitchingProbabilities
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
    
    // Each range should be [min, max] where min <= max
    Object.values(ranges).forEach(([min, max]) => {
      expect(min).toBeLessThanOrEqual(max)
    })
  })

  it('covers full dice range (0-15)', () => {
    const ranges = probabilitiesToDiceRanges(LEAGUE_AVERAGE_PROBS)
    
    // First range should start at 0
    const firstRange = Object.values(ranges)[0]
    expect(firstRange[0]).toBe(0)
    
    // Last range should end at 15
    expect(ranges.HR[1]).toBe(15)
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
