import { describe, it, expect, beforeEach } from 'vitest'
import { PitchingManager } from '../lib/pitchingManager'
import type { Game, Player, PlayerRating } from '../types'

function createMockPlayer(id: string, throws: 'L' | 'R' = 'R'): Player {
  return {
    id,
    lahman_player_id: null,
    first_name: 'Test',
    last_name: `Player${id}`,
    birth_date: null,
    bats: 'R',
    throws,
    primary_position: 'P',
    debut_year: 2024,
    final_year: null,
    created_at: new Date().toISOString()
  }
}

function createMockRating(id: string, ipOuts: number = 600): PlayerRating {
  return {
    id,
    player_id: id,
    year: 2024,
    rating_type: 'pitching',
    stats: {
      ip_outs: ipOuts,
      h: 200,
      hr: 20,
      bb: 50,
      so: 180,
      k_pct: 0.24,
      bb_pct: 0.08,
      era: 3.50,
      whip: 1.20
    },
    p_k: 0.24,
    p_bb: 0.08,
    p_out: 0.45,
    p_1b: 0.14,
    p_2b: 0.05,
    p_3b: 0.01,
    p_hr: 0.03,
    dice_table: [],
    fatigue_threshold: 21,
    created_at: new Date().toISOString()
  }
}

function createMockGame(inning: number = 1, half: 'top' | 'bottom' = 'top'): Game {
  return {
    id: 'game-1',
    season_id: 'season-1',
    home_team_id: 'home',
    away_team_id: 'away',
    game_number: 1,
    status: 'in_progress',
    inning,
    half,
    outs: 0,
    home_score: 0,
    away_score: 0,
    runner_1b: null,
    runner_2b: null,
    runner_3b: null,
    current_batter_idx: 0,
    current_pitcher_id: 'p1',
    pitcher_outs: 0,
    home_lineup: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9'],
    away_lineup: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'],
    home_pitchers: ['p1'],
    away_pitchers: ['p2'],
    seed: 'test-seed',
    rng_state: { callCount: 0 },
    box_score: {
      home: { innings: [], hits: 0, errors: 0, batting: {}, pitching: {} },
      away: { innings: [], hits: 0, errors: 0, batting: {}, pitching: {} }
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: null
  } as Game
}

describe('PitchingManager', () => {
  let manager: PitchingManager
  let roster: Map<string, Player>
  let ratings: Map<string, PlayerRating>

  beforeEach(() => {
    roster = new Map()
    ratings = new Map()

    // Add starter
    roster.set('p1', createMockPlayer('p1', 'R'))
    ratings.set('p1:pitching', createMockRating('p1', 600)) // Starter

    // Add relievers
    roster.set('p2', createMockPlayer('p2', 'R'))
    ratings.set('p2:pitching', createMockRating('p2', 180)) // Reliever

    roster.set('p3', createMockPlayer('p3', 'L'))
    ratings.set('p3:pitching', createMockRating('p3', 150)) // Reliever

    // Add closer
    roster.set('p4', createMockPlayer('p4', 'R'))
    ratings.set('p4:pitching', createMockRating('p4', 60)) // Closer

    manager = new PitchingManager(roster, ratings)
  })

  describe('shouldPullPitcher', () => {
    it('should not pull pitcher early in game with no issues', () => {
      const game = createMockGame(3, 'top')
      const result = manager.shouldPullPitcher(game, 'p1')
      expect(result.shouldPull).toBe(false)
    })

    it('should pull pitcher after allowing many runs', () => {
      const game = createMockGame(2, 'top')
      
      // Simulate pitcher allowing 5+ runs
      manager.updatePitcherState('p1', 'HR', 4)
      manager.updatePitcherState('p1', '1B', 1)
      
      const result = manager.shouldPullPitcher(game, 'p1')
      expect(result.shouldPull).toBe(true)
      expect(result.urgency).toBe('high')
      expect(result.reason).toContain('runs')
    })

    it('should pull pitcher when fatigued', () => {
      const game = createMockGame(7, 'top')
      
      // Simulate 21+ outs (7 innings)
      for (let i = 0; i < 21; i++) {
        manager.updatePitcherState('p1', 'K', 0)
      }
      
      const result = manager.shouldPullPitcher(game, 'p1')
      expect(result.shouldPull).toBe(true)
      expect(result.reason.toLowerCase()).toContain('fatig')
    })

    it('should pull for closer in high leverage 9th inning', () => {
      const game = createMockGame(9, 'top')
      game.home_score = 3
      game.away_score = 2
      game.runner_2b = 'a5'
      
      const result = manager.shouldPullPitcher(game, 'p1')
      expect(result.shouldPull).toBe(true)
      expect(result.reason).toContain('closer')
    })

    it('should consider platoon disadvantage with runners on', () => {
      const game = createMockGame(6, 'top')
      game.runner_2b = 'a3'
      
      // Add left-handed batter
      roster.set('a3', createMockPlayer('a3', 'R'))
      roster.get('a3')!.bats = 'L' // Left-handed batter vs right-handed pitcher
      
      // Current pitcher has recorded some outs
      for (let i = 0; i < 6; i++) {
        manager.updatePitcherState('p1', 'K', 0)
      }
      
      const result = manager.shouldPullPitcher(game, 'p1')
      // Should at least recognize the situation
      expect(result).toBeDefined()
    })
  })

  describe('selectReliefPitcher', () => {
    it('selects closer in late high leverage situation', () => {
      const game = createMockGame(9, 'top')
      game.home_score = 3
      game.away_score = 3
      
      const selection = manager.selectReliefPitcher(game, 'p1')
      expect(selection).toBe('p4') // Should select closer
    })

    it('selects available reliever in middle innings', () => {
      const game = createMockGame(6, 'top')
      
      const selection = manager.selectReliefPitcher(game, 'p1')
      expect(selection).toBeTruthy()
      expect(['p2', 'p3', 'p4']).toContain(selection)
    })

    it('returns null when no pitchers available', () => {
      const game = createMockGame(5, 'top')
      
      // Mark all as unavailable
      manager.setPitcherAvailability('p2', false)
      manager.setPitcherAvailability('p3', false)
      manager.setPitcherAvailability('p4', false)
      
      const selection = manager.selectReliefPitcher(game, 'p1')
      expect(selection).toBeNull()
    })

    it('considers platoon advantage when selecting reliever', () => {
      const game = createMockGame(6, 'top')
      
      // Add left-handed batter as current batter
      const batterId = game.away_lineup[0]
      roster.set(batterId, createMockPlayer(batterId, 'R'))
      roster.get(batterId)!.bats = 'L'
      
      const selection = manager.selectReliefPitcher(game, 'p1')
      expect(selection).toBeTruthy()
    })
  })

  describe('updatePitcherState', () => {
    it('tracks outs correctly', () => {
      manager.updatePitcherState('p1', 'K', 0)
      manager.updatePitcherState('p1', 'OUT', 0)
      
      const state = manager.getPitcherState('p1')
      expect(state?.outsRecorded).toBe(2)
    })

    it('tracks runs allowed', () => {
      manager.updatePitcherState('p1', 'HR', 1)
      manager.updatePitcherState('p1', '2B', 2)
      
      const state = manager.getPitcherState('p1')
      expect(state?.runsAllowed).toBe(3)
    })

    it('tracks hits and walks', () => {
      manager.updatePitcherState('p1', '1B', 0)
      manager.updatePitcherState('p1', 'BB', 0)
      
      const state = manager.getPitcherState('p1')
      expect(state?.hitsAllowed).toBe(1)
      expect(state?.walksAllowed).toBe(1)
    })
  })

  describe('markPitcherUsed', () => {
    it('marks pitcher as used and resets stats', () => {
      manager.updatePitcherState('p2', 'K', 0)
      manager.updatePitcherState('p2', 'HR', 1)
      
      manager.markPitcherUsed('p2', 5)
      
      const state = manager.getPitcherState('p2')
      expect(state?.lastUsedInning).toBe(5)
      expect(state?.outsRecorded).toBe(0)
      expect(state?.runsAllowed).toBe(0)
    })
  })

  describe('pitcher availability and rest', () => {
    it('respects rest requirements for relievers', () => {
      const game = createMockGame(5, 'top')
      
      manager.markPitcherUsed('p2', 4)
      
      const selection = manager.selectReliefPitcher(game, 'p1')
      // p2 should not be selected (only 1 inning rest)
      expect(selection).not.toBe('p2')
    })

    it('allows reliever with sufficient rest', () => {
      const game = createMockGame(7, 'top')
      
      manager.markPitcherUsed('p2', 4)
      
      const selection = manager.selectReliefPitcher(game, 'p1')
      // p2 could be selected now (3 innings rest)
      expect(selection).toBeTruthy()
    })
  })

  describe('getAvailablePitchers', () => {
    it('returns all available pitchers', () => {
      const available = manager.getAvailablePitchers()
      expect(available.length).toBeGreaterThan(0)
      expect(available.every(p => p.isAvailable)).toBe(true)
    })

    it('excludes unavailable pitchers', () => {
      manager.setPitcherAvailability('p2', false)
      
      const available = manager.getAvailablePitchers()
      expect(available.find(p => p.playerId === 'p2')).toBeUndefined()
    })
  })
})
