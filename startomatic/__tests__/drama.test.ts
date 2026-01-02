import { describe, it, expect } from 'vitest'
import {
  calculateLeverageIndex,
  getDramaLevel,
  getCrowdMood,
  isWalkOffSituation,
  isComebackPotential,
  getDramaContext,
  calculatePlayerMomentum,
  updateMomentum,
  getMomentumEmoji
} from '../lib/drama'
import type { Game, Outcome } from '../types'

// Helper to create a mock game
function createMockGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'game-1',
    season_id: 'season-1',
    home_team_id: 'home',
    away_team_id: 'away',
    game_number: 1,
    status: 'in_progress',
    inning: 5,
    half: 'top',
    outs: 0,
    home_score: 3,
    away_score: 3,
    runner_1b: null,
    runner_2b: null,
    runner_3b: null,
    current_batter_idx: 0,
    current_pitcher_id: 'pitcher-1',
    pitcher_outs: 0,
    home_lineup: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9'],
    away_lineup: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'],
    home_pitchers: ['pitcher-1'],
    away_pitchers: ['pitcher-2'],
    seed: 'test-seed',
    rng_state: { callCount: 0 },
    box_score: {
      home: { innings: [], hits: 0, errors: 0, batting: {}, pitching: {} },
      away: { innings: [], hits: 0, errors: 0, batting: {}, pitching: {} }
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null,
    ...overrides
  }
}

describe('calculateLeverageIndex', () => {
  it('calculates higher leverage for late innings', () => {
    const earlyGame = createMockGame({ inning: 2 })
    const lateGame = createMockGame({ inning: 9 })
    
    const earlyLeverage = calculateLeverageIndex(earlyGame)
    const lateLeverage = calculateLeverageIndex(lateGame)
    
    expect(lateLeverage).toBeGreaterThan(earlyLeverage)
  })
  
  it('calculates higher leverage for tied games', () => {
    const tiedGame = createMockGame({ home_score: 3, away_score: 3 })
    const blowoutGame = createMockGame({ home_score: 10, away_score: 2 })
    
    const tiedLeverage = calculateLeverageIndex(tiedGame)
    const blowoutLeverage = calculateLeverageIndex(blowoutGame)
    
    expect(tiedLeverage).toBeGreaterThan(blowoutLeverage)
  })
  
  it('calculates higher leverage with runners on base', () => {
    const basesEmpty = createMockGame({ runner_1b: null, runner_2b: null, runner_3b: null })
    const basesLoaded = createMockGame({ runner_1b: 'p1', runner_2b: 'p2', runner_3b: 'p3' })
    
    const emptyLeverage = calculateLeverageIndex(basesEmpty)
    const loadedLeverage = calculateLeverageIndex(basesLoaded)
    
    expect(loadedLeverage).toBeGreaterThan(emptyLeverage)
  })
  
  it('calculates higher leverage with two outs', () => {
    const noOuts = createMockGame({ outs: 0 })
    const twoOuts = createMockGame({ outs: 2 })
    
    const noOutsLeverage = calculateLeverageIndex(noOuts)
    const twoOutsLeverage = calculateLeverageIndex(twoOuts)
    
    expect(twoOutsLeverage).toBeGreaterThan(noOutsLeverage)
  })
  
  it('calculates very high leverage for walk-off situations', () => {
    const walkOffGame = createMockGame({
      inning: 9,
      half: 'bottom',
      home_score: 3,
      away_score: 4,
      outs: 2,
      runner_1b: 'p1'
    })
    
    const leverage = calculateLeverageIndex(walkOffGame)
    
    expect(leverage).toBeGreaterThan(3)
  })
})

describe('getDramaLevel', () => {
  it('returns routine for low leverage', () => {
    expect(getDramaLevel(0.5)).toBe('routine')
    expect(getDramaLevel(1.0)).toBe('routine')
  })
  
  it('returns tense for moderate leverage', () => {
    expect(getDramaLevel(1.5)).toBe('tense')
    expect(getDramaLevel(1.9)).toBe('tense')
  })
  
  it('returns clutch for high leverage', () => {
    expect(getDramaLevel(2.5)).toBe('clutch')
    expect(getDramaLevel(3.0)).toBe('clutch')
  })
  
  it('returns legendary for very high leverage', () => {
    expect(getDramaLevel(4.0)).toBe('legendary')
    expect(getDramaLevel(5.0)).toBe('legendary')
  })
})

describe('getCrowdMood', () => {
  it('maps drama levels to crowd moods', () => {
    expect(getCrowdMood('routine')).toBe('quiet')
    expect(getCrowdMood('tense')).toBe('buzzing')
    expect(getCrowdMood('clutch')).toBe('roaring')
    expect(getCrowdMood('legendary')).toBe('deafening')
  })
})

describe('isWalkOffSituation', () => {
  it('returns true for bottom 9th, home team losing by 1', () => {
    const game = createMockGame({
      inning: 9,
      half: 'bottom',
      home_score: 3,
      away_score: 4
    })
    
    expect(isWalkOffSituation(game)).toBe(true)
  })
  
  it('returns true for bottom 9th, tied game', () => {
    const game = createMockGame({
      inning: 9,
      half: 'bottom',
      home_score: 3,
      away_score: 3
    })
    
    expect(isWalkOffSituation(game)).toBe(true)
  })
  
  it('returns false for top of 9th', () => {
    const game = createMockGame({
      inning: 9,
      half: 'top',
      home_score: 3,
      away_score: 4
    })
    
    expect(isWalkOffSituation(game)).toBe(false)
  })
  
  it('returns false when home team is winning', () => {
    const game = createMockGame({
      inning: 9,
      half: 'bottom',
      home_score: 5,
      away_score: 3
    })
    
    expect(isWalkOffSituation(game)).toBe(false)
  })
  
  it('returns false when losing by more than 3', () => {
    const game = createMockGame({
      inning: 9,
      half: 'bottom',
      home_score: 2,
      away_score: 6
    })
    
    expect(isWalkOffSituation(game)).toBe(false)
  })
})

describe('isComebackPotential', () => {
  it('returns true when batting team is down by 3+ in 7th or later', () => {
    const game = createMockGame({
      inning: 7,
      half: 'top',
      home_score: 7,
      away_score: 3
    })
    
    expect(isComebackPotential(game)).toBe(true)
  })
  
  it('returns false for early innings', () => {
    const game = createMockGame({
      inning: 5,
      half: 'top',
      home_score: 7,
      away_score: 3
    })
    
    expect(isComebackPotential(game)).toBe(false)
  })
  
  it('returns false when close game', () => {
    const game = createMockGame({
      inning: 8,
      half: 'top',
      home_score: 4,
      away_score: 3
    })
    
    expect(isComebackPotential(game)).toBe(false)
  })
})

describe('getDramaContext', () => {
  it('returns complete drama context', () => {
    const game = createMockGame({
      inning: 9,
      half: 'bottom',
      home_score: 3,
      away_score: 4,
      outs: 2,
      runner_1b: 'p1',
      runner_2b: 'p2'
    })
    
    const context = getDramaContext(game)
    
    expect(context.leverageIndex).toBeGreaterThan(0)
    expect(context.dramaLevel).toBeDefined()
    expect(context.crowdMood).toBeDefined()
    expect(context.isWalkOffSituation).toBe(true)
  })
})

describe('calculatePlayerMomentum', () => {
  it('returns hot momentum for 3+ hits in last 5 PAs', () => {
    const outcomes: Outcome[] = ['1B', 'HR', '2B', 'OUT', '1B']
    const momentum = calculatePlayerMomentum('player-1', outcomes)
    
    expect(momentum.state).toBe('hot')
    expect(momentum.emoji).toBe('🔥')
  })
  
  it('returns cold momentum for 0 hits in 5 PAs', () => {
    const outcomes: Outcome[] = ['OUT', 'K', 'OUT', 'K', 'OUT']
    const momentum = calculatePlayerMomentum('player-1', outcomes)
    
    expect(momentum.state).toBe('cold')
    expect(momentum.emoji).toBe('❄️')
  })
  
  it('returns neutral momentum for mixed results', () => {
    const outcomes: Outcome[] = ['1B', 'OUT', 'K']
    const momentum = calculatePlayerMomentum('player-1', outcomes)
    
    expect(momentum.state).toBe('neutral')
    expect(momentum.emoji).toBe('')
  })
  
  it('only considers last 5 PAs', () => {
    const outcomes: Outcome[] = ['OUT', 'OUT', 'OUT', '1B', 'HR', '2B', '3B', '1B']
    const momentum = calculatePlayerMomentum('player-1', outcomes)
    
    // Last 5 are: HR, 2B, 3B, 1B - 4 hits, but we take last 5 which is 1B, HR, 2B, 3B, 1B
    expect(momentum.recentOutcomes).toHaveLength(5)
    expect(momentum.state).toBe('hot')
  })
})

describe('getMomentumEmoji', () => {
  it('returns the emoji from momentum state', () => {
    const hotMomentum = calculatePlayerMomentum('p1', ['HR', 'HR', 'HR'])
    const coldMomentum = calculatePlayerMomentum('p1', ['K', 'K', 'K', 'K', 'K'])
    
    expect(getMomentumEmoji(hotMomentum)).toBe('🔥')
    expect(getMomentumEmoji(coldMomentum)).toBe('❄️')
  })
})

describe('updateMomentum', () => {
  it('updates momentum with new outcome', () => {
    const initialMomentum = calculatePlayerMomentum('p1', ['OUT', 'OUT'])
    const updated = updateMomentum(initialMomentum, '1B')
    
    expect(updated.recentOutcomes).toHaveLength(3)
    expect(updated.recentOutcomes[2]).toBe('1B')
  })
  
  it('recalculates state after update', () => {
    const momentum = calculatePlayerMomentum('p1', ['K', 'K', 'K', 'K'])
    const updated = updateMomentum(momentum, 'K')
    
    expect(updated.state).toBe('cold')
    expect(updated.emoji).toBe('❄️')
  })
})
