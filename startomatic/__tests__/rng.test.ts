import { describe, it, expect } from 'vitest'
import { SeededRng, generateSeed } from '../lib/rng'

describe('SeededRng', () => {
  it('generates deterministic results with same seed', () => {
    const rng1 = new SeededRng('test-seed')
    const rng2 = new SeededRng('test-seed')
    
    for (let i = 0; i < 10; i++) {
      expect(rng1.random()).toBe(rng2.random())
    }
  })

  it('generates different results with different seeds', () => {
    const rng1 = new SeededRng('seed-1')
    const rng2 = new SeededRng('seed-2')
    
    // Very unlikely to be equal by chance
    expect(rng1.random()).not.toBe(rng2.random())
  })

  it('random() returns values between 0 and 1', () => {
    const rng = new SeededRng('test')
    
    for (let i = 0; i < 100; i++) {
      const value = rng.random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('randomInt() returns values in range', () => {
    const rng = new SeededRng('test')
    
    for (let i = 0; i < 100; i++) {
      const value = rng.randomInt(1, 6)
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(6)
    }
  })

  it('rollDice() returns three values 1-6', () => {
    const rng = new SeededRng('test')
    
    for (let i = 0; i < 100; i++) {
      const dice = rng.rollDice()
      expect(dice).toHaveLength(3)
      dice.forEach(d => {
        expect(d).toBeGreaterThanOrEqual(1)
        expect(d).toBeLessThanOrEqual(6)
      })
    }
  })

  it('rollDiceIndex() returns index 0-15', () => {
    const rng = new SeededRng('test')
    
    for (let i = 0; i < 100; i++) {
      const { index } = rng.rollDiceIndex()
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThanOrEqual(15)
    }
  })

  it('can be restored from state', () => {
    const rng1 = new SeededRng('test-seed')
    
    // Generate some values
    for (let i = 0; i < 50; i++) {
      rng1.random()
    }
    
    // Save state
    const state = rng1.getState()
    
    // Generate more values
    const nextValues1: number[] = []
    for (let i = 0; i < 10; i++) {
      nextValues1.push(rng1.random())
    }
    
    // Restore from state
    const rng2 = SeededRng.fromState(state)
    const nextValues2: number[] = []
    for (let i = 0; i < 10; i++) {
      nextValues2.push(rng2.random())
    }
    
    expect(nextValues1).toEqual(nextValues2)
  })
})

describe('generateSeed', () => {
  it('generates non-empty string', () => {
    const seed = generateSeed()
    expect(seed).toBeTruthy()
    expect(typeof seed).toBe('string')
  })

  it('generates unique seeds', () => {
    const seeds = new Set<string>()
    
    for (let i = 0; i < 100; i++) {
      seeds.add(generateSeed())
    }
    
    // All seeds should be unique
    expect(seeds.size).toBe(100)
  })
})
