import { describe, it, expect } from 'vitest'
import {
  initializeGame,
  simulatePlateAppearance,
  applyPlateAppearance,
  SimulationContext
} from '../lib/simulation'
import { SeededRng } from '../lib/rng'
import { LEAGUE_AVERAGE_PROBS } from '../lib/probabilities'
import type { Game, PlayerRating } from '../types'

// Mock player ratings
const createMockRating = (id: string): PlayerRating => ({
  id,
  player_id: id,
  year: 2024,
  rating_type: 'batter',
  stats: { pa: 500, ab: 450, h: 135, '2b': 25, '3b': 5, hr: 20, bb: 45, so: 100 },
  p_k: 0.20,
  p_bb: 0.09,
  p_out: 0.40,
  p_1b: 0.17,
  p_2b: 0.05,
  p_3b: 0.01,
  p_hr: 0.08,
  dice_table: [],
  fatigue_threshold: null,
  created_at: new Date().toISOString()
})

// Setup helpers
function createTestGame(): Partial<Game> {
  return initializeGame(
    'season-1',
    'home-team',
    'away-team',
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9'],
    ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'],
    'hp1',
    'ap1',
    1,
    'test-seed'
  )
}

function createTestContext(game: Partial<Game>, seed = 'test-seed'): SimulationContext {
  const homeRatings = new Map<string, PlayerRating>()
  const awayRatings = new Map<string, PlayerRating>()
  
  // Add batter ratings
  for (let i = 1; i <= 9; i++) {
    homeRatings.set(`h${i}`, createMockRating(`h${i}`))
    awayRatings.set(`a${i}`, createMockRating(`a${i}`))
  }
  // Add pitcher ratings
  homeRatings.set('hp1', createMockRating('hp1'))
  awayRatings.set('ap1', createMockRating('ap1'))
  
  return {
    game: game as Game,
    homeRatings,
    awayRatings,
    rng: new SeededRng(seed)
  }
}

describe('initializeGame', () => {
  it('creates valid initial game state', () => {
    const game = createTestGame()
    
    expect(game.inning).toBe(1)
    expect(game.half).toBe('top')
    expect(game.outs).toBe(0)
    expect(game.home_score).toBe(0)
    expect(game.away_score).toBe(0)
    expect(game.runner_1b).toBeNull()
    expect(game.runner_2b).toBeNull()
    expect(game.runner_3b).toBeNull()
    expect(game.current_batter_idx).toBe(0)
    expect(game.status).toBe('scheduled')
  })

  it('uses provided seed', () => {
    const game = initializeGame(
      'season-1', 'home', 'away',
      ['h1'], ['a1'],
      'hp1', 'ap1', 1,
      'my-custom-seed'
    )
    expect(game.seed).toBe('my-custom-seed')
  })

  it('generates seed if not provided', () => {
    const game = initializeGame(
      'season-1', 'home', 'away',
      ['h1'], ['a1'],
      'hp1', 'ap1', 1
    )
    expect(game.seed).toBeTruthy()
    expect(typeof game.seed).toBe('string')
  })

  it('initializes box score for all players', () => {
    const game = createTestGame()
    
    expect(game.box_score).toBeDefined()
    expect(game.box_score?.home.batting).toBeDefined()
    expect(game.box_score?.away.batting).toBeDefined()
    expect(Object.keys(game.box_score?.home.batting || {})).toHaveLength(9)
    expect(Object.keys(game.box_score?.away.batting || {})).toHaveLength(9)
  })
})

describe('simulatePlateAppearance', () => {
  it('returns valid outcome', () => {
    const game = createTestGame()
    const ctx = createTestContext(game)
    
    const result = simulatePlateAppearance(ctx)
    
    expect(result.outcome).toBeTruthy()
    expect(['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']).toContain(result.outcome)
    expect(result.diceValues).toHaveLength(3)
  })

  it('is deterministic with same seed', () => {
    const game1 = createTestGame()
    const game2 = createTestGame()
    
    const ctx1 = createTestContext(game1, 'same-seed')
    const ctx2 = createTestContext(game2, 'same-seed')
    
    const result1 = simulatePlateAppearance(ctx1)
    const result2 = simulatePlateAppearance(ctx2)
    
    expect(result1.outcome).toBe(result2.outcome)
    expect(result1.diceValues).toEqual(result2.diceValues)
  })

  it('returns blended probabilities', () => {
    const game = createTestGame()
    const ctx = createTestContext(game)
    
    const result = simulatePlateAppearance(ctx)
    
    expect(result.blendedProbs).toBeDefined()
    const sum = Object.values(result.blendedProbs).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 2)
  })
})

describe('applyPlateAppearance', () => {
  it('updates game state', () => {
    const game = createTestGame()
    const ctx = createTestContext(game)
    
    const result = simulatePlateAppearance(ctx)
    const { updatedGame, play } = applyPlateAppearance(game as Game, result, ctx.rng)
    
    // Game state should be updated
    expect(updatedGame).toBeDefined()
    expect(play).toBeDefined()
    expect(play.outcome).toBe(result.outcome)
  })

  it('records outcome in play', () => {
    const game = createTestGame()
    const ctx = createTestContext(game)
    
    const result = simulatePlateAppearance(ctx)
    const { play } = applyPlateAppearance(game as Game, result, ctx.rng)
    
    expect(['K', 'BB', 'OUT', '1B', '2B', '3B', 'HR']).toContain(play.outcome)
    expect(play.dice_values).toHaveLength(3)
  })

  it('advances batter index after out', () => {
    // Force strikeout by trying multiple seeds
    for (let i = 0; i < 50; i++) {
      const game = createTestGame()
      const ctx = createTestContext(game, `out-seed-${i}`)
      
      const result = simulatePlateAppearance(ctx)
      if (result.outcome === 'K' || result.outcome === 'OUT') {
        const { updatedGame } = applyPlateAppearance(game as Game, result, ctx.rng)
        
        // Either batter advanced or outs increased
        expect(
          updatedGame.current_batter_idx > (game.current_batter_idx || 0) ||
          updatedGame.outs > (game.outs || 0) ||
          // Or half-inning changed
          updatedGame.half !== game.half
        ).toBe(true)
        break
      }
    }
  })
})

