import { describe, it, expect } from 'vitest'
import { advanceRunners, basesLoaded, runnersOnBase, runnerInScoringPosition } from '../lib/baserunning'
import type { Outcome } from '../types'

describe('advanceRunners', () => {
  const emptyBases = { runner1b: null, runner2b: null, runner3b: null }
  const batterId = 'batter-1'

  describe('Home Run', () => {
    it('clears bases and scores everyone', () => {
      const result = advanceRunners(emptyBases, batterId, 'HR', 0)
      
      expect(result.newState.runner1b).toBeNull()
      expect(result.newState.runner2b).toBeNull()
      expect(result.newState.runner3b).toBeNull()
      expect(result.runsScored).toBe(1) // Just the batter
      expect(result.runnersScored).toContain(batterId)
    })

    it('scores grand slam with bases loaded', () => {
      const loaded = { runner1b: 'r1', runner2b: 'r2', runner3b: 'r3' }
      const result = advanceRunners(loaded, batterId, 'HR', 0)
      
      expect(result.runsScored).toBe(4)
      expect(result.runnersScored).toHaveLength(4)
    })
  })

  describe('Triple', () => {
    it('puts batter on third, scores everyone else', () => {
      const loaded = { runner1b: 'r1', runner2b: 'r2', runner3b: 'r3' }
      const result = advanceRunners(loaded, batterId, '3B', 0)
      
      expect(result.newState.runner1b).toBeNull()
      expect(result.newState.runner2b).toBeNull()
      expect(result.newState.runner3b).toBe(batterId)
      expect(result.runsScored).toBe(3)
    })
  })

  describe('Double', () => {
    it('puts batter on second', () => {
      const result = advanceRunners(emptyBases, batterId, '2B', 0)
      
      expect(result.newState.runner2b).toBe(batterId)
      expect(result.newState.runner1b).toBeNull()
    })

    it('advances runner from first to third', () => {
      const bases = { runner1b: 'r1', runner2b: null, runner3b: null }
      const result = advanceRunners(bases, batterId, '2B', 0)
      
      expect(result.newState.runner3b).toBe('r1')
      expect(result.newState.runner2b).toBe(batterId)
    })
  })

  describe('Single', () => {
    it('puts batter on first', () => {
      const result = advanceRunners(emptyBases, batterId, '1B', 0)
      
      expect(result.newState.runner1b).toBe(batterId)
    })

    it('advances runners', () => {
      const bases = { runner1b: 'r1', runner2b: 'r2', runner3b: null }
      const result = advanceRunners(bases, batterId, '1B', 0)
      
      expect(result.newState.runner1b).toBe(batterId)
      expect(result.newState.runner2b).toBe('r1')
      expect(result.newState.runner3b).toBe('r2')
      expect(result.runsScored).toBe(0)
    })

    it('scores from third', () => {
      const bases = { runner1b: null, runner2b: null, runner3b: 'r3' }
      const result = advanceRunners(bases, batterId, '1B', 0)
      
      expect(result.runsScored).toBe(1)
      expect(result.runnersScored).toContain('r3')
    })
  })

  describe('Walk', () => {
    it('puts batter on first', () => {
      const result = advanceRunners(emptyBases, batterId, 'BB', 0)
      
      expect(result.newState.runner1b).toBe(batterId)
    })

    it('forces runners', () => {
      const loaded = { runner1b: 'r1', runner2b: 'r2', runner3b: 'r3' }
      const result = advanceRunners(loaded, batterId, 'BB', 0)
      
      expect(result.newState.runner1b).toBe(batterId)
      expect(result.newState.runner2b).toBe('r1')
      expect(result.newState.runner3b).toBe('r2')
      expect(result.runsScored).toBe(1)
    })

    it('does not force runners if first is empty', () => {
      const bases = { runner1b: null, runner2b: 'r2', runner3b: null }
      const result = advanceRunners(bases, batterId, 'BB', 0)
      
      expect(result.newState.runner1b).toBe(batterId)
      expect(result.newState.runner2b).toBe('r2')
      expect(result.runsScored).toBe(0)
    })
  })

  describe('Out/Strikeout', () => {
    it('keeps runners in place', () => {
      const bases = { runner1b: 'r1', runner2b: 'r2', runner3b: null }
      const resultK = advanceRunners(bases, batterId, 'K', 0)
      const resultOut = advanceRunners(bases, batterId, 'OUT', 0)
      
      expect(resultK.newState).toEqual(bases)
      expect(resultOut.newState).toEqual(bases)
      expect(resultK.runsScored).toBe(0)
    })
  })
})

describe('basesLoaded', () => {
  it('returns true when all bases occupied', () => {
    expect(basesLoaded({ runner1b: 'a', runner2b: 'b', runner3b: 'c' })).toBe(true)
  })

  it('returns false when any base empty', () => {
    expect(basesLoaded({ runner1b: 'a', runner2b: 'b', runner3b: null })).toBe(false)
    expect(basesLoaded({ runner1b: null, runner2b: null, runner3b: null })).toBe(false)
  })
})

describe('runnersOnBase', () => {
  it('counts occupied bases', () => {
    expect(runnersOnBase({ runner1b: null, runner2b: null, runner3b: null })).toBe(0)
    expect(runnersOnBase({ runner1b: 'a', runner2b: null, runner3b: null })).toBe(1)
    expect(runnersOnBase({ runner1b: 'a', runner2b: 'b', runner3b: null })).toBe(2)
    expect(runnersOnBase({ runner1b: 'a', runner2b: 'b', runner3b: 'c' })).toBe(3)
  })
})

describe('runnerInScoringPosition', () => {
  it('returns true with runner on 2nd or 3rd', () => {
    expect(runnerInScoringPosition({ runner1b: null, runner2b: 'a', runner3b: null })).toBe(true)
    expect(runnerInScoringPosition({ runner1b: null, runner2b: null, runner3b: 'a' })).toBe(true)
    expect(runnerInScoringPosition({ runner1b: 'a', runner2b: 'b', runner3b: null })).toBe(true)
  })

  it('returns false with only runner on 1st', () => {
    expect(runnerInScoringPosition({ runner1b: 'a', runner2b: null, runner3b: null })).toBe(false)
  })

  it('returns false with bases empty', () => {
    expect(runnerInScoringPosition({ runner1b: null, runner2b: null, runner3b: null })).toBe(false)
  })
})
