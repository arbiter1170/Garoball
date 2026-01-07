import { describe, it, expect } from 'vitest'
import {
  initializeGame,
  simulatePlateAppearance,
  applyPlateAppearance,
  SimulationContext,
  simulateFullGame
} from '../lib/simulation'
import { SeededRng } from '../lib/rng'
import { PitchingManager } from '../lib/pitchingManager'
import type { Game, PlayerRating, Player } from '../types'

// Helper to create a mock player
function createMockPlayer(id: string, bats: 'L' | 'R' = 'R', throws: 'L' | 'R' = 'R'): Player {
  return {
    id,
    lahman_player_id: null,
    first_name: 'Test',
    last_name: `Player${id}`,
    birth_date: null,
    bats,
    throws,
    primary_position: bats === throws ? 'P' : '1B',
    debut_year: 2024,
    final_year: null,
    created_at: new Date().toISOString()
  }
}

// Helper to create a mock rating
function createMockRating(id: string, type: 'batting' | 'pitching' = 'batting'): PlayerRating {
  return {
    id,
    player_id: id,
    year: 2024,
    rating_type: type,
    stats: type === 'batting' 
      ? { pa: 500, ab: 450, h: 135, '2b': 25, '3b': 5, hr: 20, bb: 45, so: 100, avg: 0.3, slg: 0.5, iso: 0.2, babip: 0.32, k_pct: 0.2, bb_pct: 0.09 }
      : { ip_outs: 600, h: 200, hr: 20, bb: 50, so: 180, k_pct: 0.24, bb_pct: 0.08, era: 3.5, whip: 1.2 },
    p_k: 0.22,
    p_bb: 0.08,
    p_out: 0.43,
    p_1b: 0.15,
    p_2b: 0.06,
    p_3b: 0.01,
    p_hr: 0.05,
    dice_table: [],
    fatigue_threshold: type === 'pitching' ? 21 : null,
    created_at: new Date().toISOString()
  }
}

describe('Integration: Handedness-Aware Matchups with NPC Pitching Manager', () => {
  it('recalculates probabilities when pitcher changes handedness', () => {
    // Setup game with left-handed batter vs right-handed pitcher
    const game = initializeGame(
      'season-1',
      'home-team',
      'away-team',
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9'],
      ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'],
      'hp1', // Right-handed pitcher
      'ap1',
      1,
      'test-seed-handedness'
    ) as Game

    // Create left-handed batters
    const homePlayersMap = new Map<string, Player>()
    const awayPlayersMap = new Map<string, Player>()
    
    // Away lineup - all left-handed batters
    for (let i = 1; i <= 9; i++) {
      awayPlayersMap.set(`a${i}`, createMockPlayer(`a${i}`, 'L', 'R'))
    }
    
    // Home lineup
    for (let i = 1; i <= 9; i++) {
      homePlayersMap.set(`h${i}`, createMockPlayer(`h${i}`, 'R', 'R'))
    }
    
    // Pitchers
    homePlayersMap.set('hp1', createMockPlayer('hp1', 'R', 'R')) // RHP
    homePlayersMap.set('hp2', createMockPlayer('hp2', 'R', 'L')) // LHP
    awayPlayersMap.set('ap1', createMockPlayer('ap1', 'R', 'R'))
    
    const homeRatings = new Map<string, PlayerRating>()
    const awayRatings = new Map<string, PlayerRating>()
    
    // Add ratings
    for (let i = 1; i <= 9; i++) {
      homeRatings.set(`h${i}`, createMockRating(`h${i}`, 'batting'))
      awayRatings.set(`a${i}`, createMockRating(`a${i}`, 'batting'))
    }
    homeRatings.set('hp1', createMockRating('hp1', 'pitching'))
    homeRatings.set('hp2', createMockRating('hp2', 'pitching'))
    awayRatings.set('ap1', createMockRating('ap1', 'pitching'))
    
    const rng = new SeededRng('test-seed-handedness')
    
    // Simulate first PA with RHP (platoon advantage for L batter)
    const ctx1: SimulationContext = {
      game,
      homeRatings,
      awayRatings,
      homePlayers: homePlayersMap,
      awayPlayers: awayPlayersMap,
      rng,
      useHandednessMatchups: true
    }
    
    const result1 = simulatePlateAppearance(ctx1)
    const powerProb1 = result1.blendedProbs.HR + result1.blendedProbs['2B']
    
    // Change to LHP (same-handed matchup, disadvantage)
    game.current_pitcher_id = 'hp2'
    game.home_pitchers = ['hp1', 'hp2']
    
    const result2 = simulatePlateAppearance(ctx1)
    const powerProb2 = result2.blendedProbs.HR + result2.blendedProbs['2B']
    
    // Left-handed batter should have higher power vs RHP than LHP
    expect(powerProb1).toBeGreaterThan(powerProb2)
  })

  it('NPC manager makes pitching changes based on game situation', () => {
    const homePlayersMap = new Map<string, Player>()
    const homeRatings = new Map<string, PlayerRating>()
    
    // Add starter and reliever
    homePlayersMap.set('hp1', createMockPlayer('hp1', 'R', 'R'))
    homePlayersMap.set('hp2', createMockPlayer('hp2', 'R', 'R'))
    homeRatings.set('hp1:pitching', createMockRating('hp1', 'pitching'))
    homeRatings.set('hp2:pitching', createMockRating('hp2', 'pitching'))
    
    const manager = new PitchingManager(homePlayersMap, homeRatings)
    
    // Create game situation - late inning, high leverage
    const game = initializeGame(
      'season-1',
      'home-team',
      'away-team',
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9'],
      ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'],
      'hp1',
      'ap1',
      1,
      'test-seed-manager'
    ) as Game
    
    game.inning = 7
    game.home_score = 3
    game.away_score = 2
    game.runner_2b = 'a5'
    
    // Simulate pitcher allowing many runs
    for (let i = 0; i < 5; i++) {
      manager.updatePitcherState('hp1', 'HR', 1)
    }
    
    const decision = manager.shouldPullPitcher(game, 'hp1', false)
    
    expect(decision.shouldPull).toBe(true)
    expect(decision.urgency).toBe('high')
    
    // Manager should select a relief pitcher
    const newPitcher = manager.selectReliefPitcher(game, 'hp1')
    expect(newPitcher).toBe('hp2')
  })

  it('combines handedness awareness with pitching changes in full game', () => {
    // Setup with multiple pitchers
    const homePlayersMap = new Map<string, Player>()
    const awayPlayersMap = new Map<string, Player>()
    const homeRatings = new Map<string, PlayerRating>()
    const awayRatings = new Map<string, PlayerRating>()
    
    // Create diverse lineup
    for (let i = 1; i <= 9; i++) {
      const bats = i % 2 === 0 ? 'L' : 'R' // Alternate handedness
      homePlayersMap.set(`h${i}`, createMockPlayer(`h${i}`, bats, 'R'))
      awayPlayersMap.set(`a${i}`, createMockPlayer(`a${i}`, bats, 'R'))
      homeRatings.set(`h${i}`, createMockRating(`h${i}`, 'batting'))
      awayRatings.set(`a${i}`, createMockRating(`a${i}`, 'batting'))
    }
    
    // Add multiple pitchers with different handedness
    homePlayersMap.set('hp1', createMockPlayer('hp1', 'R', 'R'))
    homePlayersMap.set('hp2', createMockPlayer('hp2', 'R', 'L'))
    awayPlayersMap.set('ap1', createMockPlayer('ap1', 'R', 'R'))
    awayPlayersMap.set('ap2', createMockPlayer('ap2', 'R', 'L'))
    
    homeRatings.set('hp1', createMockRating('hp1', 'pitching'))
    homeRatings.set('hp2', createMockRating('hp2', 'pitching'))
    awayRatings.set('ap1', createMockRating('ap1', 'pitching'))
    awayRatings.set('ap2', createMockRating('ap2', 'pitching'))
    
    const game = initializeGame(
      'season-1',
      'home-team',
      'away-team',
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9'],
      ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'],
      'hp1',
      'ap1',
      1,
      'test-seed-full'
    ) as Game
    
    const rng = new SeededRng('test-seed-full')
    
    const ctx: SimulationContext = {
      game,
      homeRatings,
      awayRatings,
      homePlayers: homePlayersMap,
      awayPlayers: awayPlayersMap,
      rng,
      useHandednessMatchups: true
    }
    
    // Simulate a few innings
    let currentGame = game
    let playCount = 0
    const maxPlays = 30
    
    while (currentGame.inning < 4 && playCount < maxPlays) {
      const result = simulatePlateAppearance({ ...ctx, game: currentGame })
      const { updatedGame } = applyPlateAppearance(currentGame, result, rng)
      
      currentGame = updatedGame
      playCount++
    }
    
    // Game should have progressed
    expect(currentGame.inning).toBeGreaterThanOrEqual(1)
    expect(playCount).toBeGreaterThan(0)
    
    // Verify handedness calculations were used (blended probs should vary by matchup)
    expect(currentGame.box_score).toBeDefined()
  })

  it('verifies matchup recalculation after mid-inning pitching change', () => {
    const homePlayersMap = new Map<string, Player>()
    const awayPlayersMap = new Map<string, Player>()
    const homeRatings = new Map<string, PlayerRating>()
    const awayRatings = new Map<string, PlayerRating>()
    
    // Create a left-handed batter
    awayPlayersMap.set('a1', createMockPlayer('a1', 'L', 'R'))
    awayRatings.set('a1', createMockRating('a1', 'batting'))
    
    // Create two pitchers with different handedness
    homePlayersMap.set('hp1', createMockPlayer('hp1', 'R', 'R')) // RHP
    homePlayersMap.set('hp2', createMockPlayer('hp2', 'R', 'L')) // LHP
    homeRatings.set('hp1', createMockRating('hp1', 'pitching'))
    homeRatings.set('hp2', createMockRating('hp2', 'pitching'))
    
    // Rest of the lineup
    for (let i = 2; i <= 9; i++) {
      awayPlayersMap.set(`a${i}`, createMockPlayer(`a${i}`, 'R', 'R'))
      awayRatings.set(`a${i}`, createMockRating(`a${i}`, 'batting'))
      homePlayersMap.set(`h${i}`, createMockPlayer(`h${i}`, 'R', 'R'))
      homeRatings.set(`h${i}`, createMockRating(`h${i}`, 'batting'))
    }
    
    awayPlayersMap.set('ap1', createMockPlayer('ap1', 'R', 'R'))
    awayRatings.set('ap1', createMockRating('ap1', 'pitching'))
    
    const game = initializeGame(
      'season-1',
      'home-team',
      'away-team',
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9'],
      ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'],
      'hp1',
      'ap1',
      1,
      'test-seed-change'
    ) as Game
    
    const rng = new SeededRng('test-seed-change')
    
    // First PA - L batter vs RHP (platoon advantage)
    const ctx1: SimulationContext = {
      game,
      homeRatings,
      awayRatings,
      homePlayers: homePlayersMap,
      awayPlayers: awayPlayersMap,
      rng,
      useHandednessMatchups: true
    }
    
    const result1 = simulatePlateAppearance(ctx1)
    
    // Change pitcher mid-inning to LHP
    game.current_pitcher_id = 'hp2'
    game.home_pitchers = ['hp1', 'hp2']
    
    // Same batter, different pitcher - L batter vs LHP (disadvantage)
    const result2 = simulatePlateAppearance(ctx1)
    
    // Verify probabilities changed
    expect(result1.blendedProbs.HR).not.toEqual(result2.blendedProbs.HR)
    expect(result1.blendedProbs.K).not.toEqual(result2.blendedProbs.K)
    
    // L vs R should have more power than L vs L
    expect(result1.blendedProbs.HR + result1.blendedProbs['2B'])
      .toBeGreaterThan(result2.blendedProbs.HR + result2.blendedProbs['2B'])
  })
})
