import { describe, it, expect } from 'vitest'
import { createDiceTable, DICE_3D6_PROBABILITIES } from '../lib/probabilities'
import type { OutcomeProbabilities, Outcome } from '@/types'

describe('3d6 Distribution Integrity', () => {
  it('should match target probabilities within acceptable margin using the weighted 3d6 distribution', () => {
    // A diverse set of target probabilities
    const targetProbs: OutcomeProbabilities = {
      K: 0.22,    // 22%
      BB: 0.08,   // 8%
      OUT: 0.46,  // 46%
      '1B': 0.15, // 15%
      '2B': 0.05, // 5%
      '3B': 0.01, // 1%
      HR: 0.03    // 3%
    }

    // 1. Create the dice table using our optimal allocation algorithm
    const table = createDiceTable(targetProbs)
    
    // 2. Sum the mathematical weight of each outcome based on the table
    const actualWeightedProbs: Record<Outcome, number> = {
      K: 0, BB: 0, OUT: 0, '1B': 0, '2B': 0, '3B': 0, HR: 0
    }

    table.forEach((outcome, index) => {
      actualWeightedProbs[outcome] += DICE_3D6_PROBABILITIES[index]
    })

    // 3. Verify results
    // Since 3d6 granularity is 1/216 (~0.46%), we expect some rounding error.
    // However, the greedy algorithm should get us very close to target values.
    const TOLERANCE = 0.02 // 2% tolerance for any single outcome

    const outcomes: Outcome[] = ['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']
    
    outcomes.forEach(outcome => {
      const target = targetProbs[outcome]
      const actual = actualWeightedProbs[outcome]
      
      // Calculate absolute difference
      const diff = Math.abs(target - actual)
      
      // console.log(`${outcome}: Target ${target.toFixed(4)}, Actual ${actual.toFixed(4)}, Diff ${diff.toFixed(4)}`)
      
      expect(diff).toBeLessThan(TOLERANCE)
    })
    
    // 4. Ensure total probability is still 1.0
    const totalActual = Object.values(actualWeightedProbs).reduce((a, b) => a + b, 0)
    expect(totalActual).toBeCloseTo(1.0, 5)
  })

  it('should handle extreme probabilities (e.g. 0% for some outcomes)', () => {
    const targetProbs: OutcomeProbabilities = {
      K: 0.30,
      BB: 0, // Rare but possible in some simulations
      OUT: 0.60,
      '1B': 0.10,
      '2B': 0,
      '3B': 0,
      HR: 0
    }

    const table = createDiceTable(targetProbs)
    const actualWeightedProbs: Record<Outcome, number> = {
      K: 0, BB: 0, OUT: 0, '1B': 0, '2B': 0, '3B': 0, HR: 0
    }

    table.forEach((outcome, index) => {
      actualWeightedProbs[outcome] += DICE_3D6_PROBABILITIES[index]
    })

    // Outcomes with 0% target should have 0% actual
    expect(actualWeightedProbs['BB']).toBe(0)
    expect(actualWeightedProbs['2B']).toBe(0)
    expect(actualWeightedProbs['3B']).toBe(0)
    expect(actualWeightedProbs['HR']).toBe(0)
    
    // Total should still be 1.0
    const totalActual = Object.values(actualWeightedProbs).reduce((a, b) => a + b, 0)
    expect(totalActual).toBeCloseTo(1.0, 5)
  })
})

