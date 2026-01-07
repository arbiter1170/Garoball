import { describe, it, expect } from 'vitest'
import {
  getPlatoonModifiers,
  applyHandednessModifiers,
  calculateMatchupProbabilities,
  getMatchupDescription
} from '../lib/handedness'
import type { OutcomeProbabilities, Handedness } from '../types'

const baseBatterProbs: OutcomeProbabilities = {
  K: 0.22,
  BB: 0.08,
  OUT: 0.45,
  '1B': 0.15,
  '2B': 0.05,
  '3B': 0.01,
  HR: 0.04
}

const basePitcherProbs: OutcomeProbabilities = {
  K: 0.24,
  BB: 0.07,
  OUT: 0.46,
  '1B': 0.14,
  '2B': 0.05,
  '3B': 0.01,
  HR: 0.03
}

describe('getPlatoonModifiers', () => {
  it('gives left-handed batter advantage vs RHP', () => {
    const modifiers = getPlatoonModifiers('L', 'R')
    expect(modifiers.powerBoost).toBeGreaterThan(1.0)
    expect(modifiers.contactBoost).toBeGreaterThan(1.0)
    expect(modifiers.strikeoutPenalty).toBeLessThan(1.0)
  })

  it('gives right-handed batter advantage vs LHP', () => {
    const modifiers = getPlatoonModifiers('R', 'L')
    expect(modifiers.powerBoost).toBeGreaterThan(1.0)
    expect(modifiers.contactBoost).toBeGreaterThan(1.0)
    expect(modifiers.strikeoutPenalty).toBeLessThan(1.0)
  })

  it('gives disadvantage for same-handed matchups', () => {
    const leftVsLeft = getPlatoonModifiers('L', 'L')
    expect(leftVsLeft.powerBoost).toBeLessThan(1.0)
    expect(leftVsLeft.strikeoutPenalty).toBeGreaterThan(1.0)

    const rightVsRight = getPlatoonModifiers('R', 'R')
    expect(rightVsRight.powerBoost).toBeLessThan(1.0)
    expect(rightVsRight.strikeoutPenalty).toBeGreaterThan(1.0)
  })

  it('gives switch hitter slight advantage in all matchups', () => {
    const vsRHP = getPlatoonModifiers('S', 'R')
    expect(vsRHP.powerBoost).toBeGreaterThanOrEqual(1.0)

    const vsLHP = getPlatoonModifiers('S', 'L')
    expect(vsLHP.powerBoost).toBeGreaterThanOrEqual(1.0)
  })
})

describe('applyHandednessModifiers', () => {
  it('increases power stats with platoon advantage', () => {
    const adjusted = applyHandednessModifiers(baseBatterProbs, 'L', 'R')
    
    // Left vs Right should boost power
    expect(adjusted.HR).toBeGreaterThan(baseBatterProbs.HR)
    expect(adjusted['2B']).toBeGreaterThan(baseBatterProbs['2B'])
  })

  it('decreases strikeouts with platoon advantage', () => {
    const adjusted = applyHandednessModifiers(baseBatterProbs, 'L', 'R')
    expect(adjusted.K).toBeLessThan(baseBatterProbs.K)
  })

  it('normalizes probabilities to sum to 1', () => {
    const adjusted = applyHandednessModifiers(baseBatterProbs, 'R', 'L')
    const sum = adjusted.K + adjusted.BB + adjusted.OUT + adjusted['1B'] + 
                adjusted['2B'] + adjusted['3B'] + adjusted.HR
    expect(sum).toBeCloseTo(1.0, 5)
  })

  it('penalizes same-handed matchups', () => {
    const adjusted = applyHandednessModifiers(baseBatterProbs, 'L', 'L')
    
    // Left vs Left should reduce power and increase strikeouts
    expect(adjusted.HR).toBeLessThan(baseBatterProbs.HR)
    expect(adjusted.K).toBeGreaterThan(baseBatterProbs.K)
  })
})

describe('calculateMatchupProbabilities', () => {
  it('blends batter and pitcher probs with handedness adjustment', () => {
    const matchup = calculateMatchupProbabilities(
      baseBatterProbs,
      basePitcherProbs,
      'L',
      'R',
      0.65
    )
    
    // Should be normalized
    const sum = matchup.K + matchup.BB + matchup.OUT + matchup['1B'] + 
                matchup['2B'] + matchup['3B'] + matchup.HR
    expect(sum).toBeCloseTo(1.0, 5)
  })

  it('produces different results for different handedness matchups', () => {
    const leftVsRight = calculateMatchupProbabilities(
      baseBatterProbs,
      basePitcherProbs,
      'L',
      'R',
      0.65
    )
    
    const leftVsLeft = calculateMatchupProbabilities(
      baseBatterProbs,
      basePitcherProbs,
      'L',
      'L',
      0.65
    )
    
    // Power should be higher with platoon advantage
    expect(leftVsRight.HR).toBeGreaterThan(leftVsLeft.HR)
    expect(leftVsRight['2B']).toBeGreaterThan(leftVsLeft['2B'])
  })

  it('recalculates correctly when pitcher changes', () => {
    // Simulate mid-inning pitcher change scenario
    const vsRHP = calculateMatchupProbabilities(
      baseBatterProbs,
      basePitcherProbs,
      'L',
      'R',
      0.65
    )
    
    const vsLHP = calculateMatchupProbabilities(
      baseBatterProbs,
      basePitcherProbs,
      'L',
      'L',
      0.65
    )
    
    // Results should be different after pitcher swap
    expect(vsRHP.HR).not.toEqual(vsLHP.HR)
    expect(vsRHP.K).not.toEqual(vsLHP.K)
  })
})

describe('getMatchupDescription', () => {
  it('identifies platoon advantage', () => {
    expect(getMatchupDescription('L', 'R')).toBe('Platoon advantage')
    expect(getMatchupDescription('R', 'L')).toBe('Platoon advantage')
  })

  it('identifies same-handed matchup', () => {
    expect(getMatchupDescription('L', 'L')).toBe('Same-handed matchup')
    expect(getMatchupDescription('R', 'R')).toBe('Same-handed matchup')
  })

  it('identifies switch hitter advantage', () => {
    expect(getMatchupDescription('S', 'R')).toBe('Switch hitter advantage')
    expect(getMatchupDescription('S', 'L')).toBe('Switch hitter advantage')
  })
})
