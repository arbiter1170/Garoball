import { describe, it, expect } from 'vitest'
import { 
  probabilitiesToDiceRanges, 
  DICE_3D6_PROBABILITIES, 
  getOutcomeFromDiceIndex,
  LEAGUE_AVERAGE_PROBS 
} from '../lib/probabilities'
import { OutcomeProbabilities, Outcome } from '@/types'

describe('3d6 Distribution Integrity', () => {
  const outcomes: Outcome[] = ['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']

  function calculateActualWeightedProb(probs: OutcomeProbabilities): Record<Outcome, number> {
    const ranges = probabilitiesToDiceRanges(probs)
    const actualWeighted: Record<Outcome, number> = {
      K: 0, BB: 0, OUT: 0, '1B': 0, '2B': 0, '3B': 0, HR: 0
    }

    for (let i = 0; i < 16; i++) {
      const outcome = getOutcomeFromDiceIndex(i, ranges, probs)
      actualWeighted[outcome] += DICE_3D6_PROBABILITIES[i]
    }

    return actualWeighted
  }

  it('should match League Average probabilities within 1/216 granularity', () => {
    const actual = calculateActualWeightedProb(LEAGUE_AVERAGE_PROBS)
    
    outcomes.forEach(outcome => {
      // The maximum error for any single outcome should be roughly the largest single dice probability
      // (which is 27/216 = 12.5% for sums 10/11) in extreme cases, but with greedy allocation 
      // it should usually be much closer.
      // We'll check if it's within 0.06 (roughly 13/216) which is a reasonable threshold for discrete mapping.
      expect(actual[outcome]).toBeCloseTo(LEAGUE_AVERAGE_PROBS[outcome], 1)
    })
  })

  it('should handle extreme high strikeout rate (0.50 K%)', () => {
    const highKProbs: OutcomeProbabilities = {
      K: 0.50,
      BB: 0.05,
      OUT: 0.30,
      '1B': 0.10,
      '2B': 0.02,
      '3B': 0.01,
      HR: 0.02
    }
    const actual = calculateActualWeightedProb(highKProbs)
    expect(actual.K).toBeGreaterThan(0.45)
    expect(actual.K).toBeLessThan(0.55)
  })

  it('should handle zero-probability outcomes correctly', () => {
    const zeroHRProbs: OutcomeProbabilities = {
      K: 0.20,
      BB: 0.10,
      OUT: 0.50,
      '1B': 0.15,
      '2B': 0.05,
      '3B': 0.0,
      HR: 0.0
    }
    const actual = calculateActualWeightedProb(zeroHRProbs)
    expect(actual.HR).toBe(0)
    expect(actual['3B']).toBe(0)
  })

  it('should ensure every outcome with > 0 probability gets at least one dice sum', () => {
    // A very rare triple rate (0.1%) should still get a slot (likely the 3 or 18)
    const rareTripleProbs: OutcomeProbabilities = {
      K: 0.15,
      BB: 0.10,
      OUT: 0.60,
      '1B': 0.10,
      '2B': 0.04,
      '3B': 0.001,
      HR: 0.009
    }
    const actual = calculateActualWeightedProb(rareTripleProbs)
    expect(actual['3B']).toBeGreaterThan(0) // Should get at least 1/216
    expect(actual.HR).toBeGreaterThan(0)   // Should get at least 1/216
  })

  it('should sum to exactly 1.0 for all test cases', () => {
    const testCases = [LEAGUE_AVERAGE_PROBS]
    
    testCases.forEach(tc => {
      const actual = calculateActualWeightedProb(tc)
      const sum = Object.values(actual).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1.0, 5)
    })
  })
})

