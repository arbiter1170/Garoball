// Achievement System for Garoball
// Defines unlockable achievements and checker functions

import type { Game, Outcome, Play } from '@/types'

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type AchievementCategory = 'batting' | 'pitching' | 'team' | 'game' | 'season'

export interface Achievement {
  id: string
  name: string
  description: string
  category: AchievementCategory
  rarity: AchievementRarity
  emoji: string
}

export interface UnlockedAchievement extends Achievement {
  unlockedAt: Date
  context?: string
}

/**
 * All available achievements
 */
export const ACHIEVEMENTS: Achievement[] = [
  // Batting achievements
  {
    id: 'first-hit',
    name: 'First Blood',
    description: 'Record your first hit',
    category: 'batting',
    rarity: 'common',
    emoji: '🎯'
  },
  {
    id: 'home-run',
    name: 'Going Yard',
    description: 'Hit a home run',
    category: 'batting',
    rarity: 'common',
    emoji: '⚾'
  },
  {
    id: 'multi-hit-game',
    name: 'Getting Hot',
    description: 'Record multiple hits in a game',
    category: 'batting',
    rarity: 'uncommon',
    emoji: '🔥'
  },
  {
    id: 'grand-slam',
    name: 'Grand Salami',
    description: 'Hit a grand slam home run',
    category: 'batting',
    rarity: 'rare',
    emoji: '💥'
  },
  {
    id: 'hit-for-cycle',
    name: 'Hit for the Cycle',
    description: 'Hit a single, double, triple, and home run in one game',
    category: 'batting',
    rarity: 'legendary',
    emoji: '🎡'
  },
  {
    id: 'walk-off-hr',
    name: 'Walk-Off Hero',
    description: 'Hit a walk-off home run',
    category: 'batting',
    rarity: 'epic',
    emoji: '🌟'
  },
  
  // Pitching achievements
  {
    id: 'first-strikeout',
    name: 'First K',
    description: 'Record your first strikeout',
    category: 'pitching',
    rarity: 'common',
    emoji: 'K'
  },
  {
    id: 'immaculate',
    name: 'Immaculate',
    description: 'Strike out 3 batters on 9 pitches in an inning',
    category: 'pitching',
    rarity: 'rare',
    emoji: '🎯'
  },
  {
    id: 'no-hitter',
    name: 'No-No',
    description: 'Throw a no-hitter',
    category: 'pitching',
    rarity: 'legendary',
    emoji: '🚫'
  },
  {
    id: 'perfect-game',
    name: 'Perfection',
    description: 'Throw a perfect game',
    category: 'pitching',
    rarity: 'legendary',
    emoji: '💎'
  },
  {
    id: 'ten-strikeouts',
    name: 'Double Digits',
    description: 'Strike out 10+ batters in a game',
    category: 'pitching',
    rarity: 'rare',
    emoji: '🔟'
  },
  
  // Team achievements
  {
    id: 'big-inning',
    name: 'Crooked Number',
    description: 'Score 5+ runs in a single inning',
    category: 'team',
    rarity: 'uncommon',
    emoji: '📊'
  },
  {
    id: 'comeback-win',
    name: 'Never Say Die',
    description: 'Win after trailing by 5+ runs',
    category: 'team',
    rarity: 'rare',
    emoji: '💪'
  },
  {
    id: 'shutout',
    name: 'Lockdown',
    description: 'Win without allowing a single run',
    category: 'team',
    rarity: 'uncommon',
    emoji: '🔒'
  },
  {
    id: 'blowout',
    name: 'Mercy Rule',
    description: 'Win by 10+ runs',
    category: 'team',
    rarity: 'uncommon',
    emoji: '💨'
  },
  
  // Game achievements
  {
    id: 'walk-off-win',
    name: 'Walk It Off',
    description: 'Win the game with a walk-off',
    category: 'game',
    rarity: 'rare',
    emoji: '🚶'
  },
  {
    id: 'extra-innings',
    name: 'Marathon',
    description: 'Play a game that goes to extra innings',
    category: 'game',
    rarity: 'uncommon',
    emoji: '⏱️'
  },
  {
    id: 'high-scoring',
    name: 'Slugfest',
    description: 'Both teams score 8+ runs',
    category: 'game',
    rarity: 'uncommon',
    emoji: '🎆'
  },
  
  // Season achievements
  {
    id: 'first-win',
    name: 'On The Board',
    description: 'Win your first game of the season',
    category: 'season',
    rarity: 'common',
    emoji: '🎉'
  },
  {
    id: 'winning-streak',
    name: 'Rolling',
    description: 'Win 5 games in a row',
    category: 'season',
    rarity: 'rare',
    emoji: '🔥'
  },
  {
    id: 'undefeated-start',
    name: 'Hot Start',
    description: 'Start the season 5-0',
    category: 'season',
    rarity: 'epic',
    emoji: '🚀'
  }
]

/**
 * Get achievement by ID
 */
export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id)
}

/**
 * Check for batting achievements after a play
 */
export function checkBattingAchievements(
  playerId: string,
  game: Game,
  outcome: Outcome,
  runsScored: number,
  playerGameStats: { hits: Outcome[], homeRuns: number, rbi: number }
): Achievement[] {
  const unlocked: Achievement[] = []
  
  // First hit
  if (playerGameStats.hits.length === 1) {
    const achievement = getAchievement('first-hit')
    if (achievement) unlocked.push(achievement)
  }
  
  // Home run
  if (outcome === 'HR') {
    const achievement = getAchievement('home-run')
    if (achievement) unlocked.push(achievement)
    
    // Grand slam
    if (runsScored === 4) {
      const grandSlam = getAchievement('grand-slam')
      if (grandSlam) unlocked.push(grandSlam)
    }
    
    // Walk-off home run
    if (game.half === 'bottom' && game.inning >= 9) {
      const homeScore = game.home_score + runsScored
      if (homeScore > game.away_score) {
        const walkOffHr = getAchievement('walk-off-hr')
        if (walkOffHr) unlocked.push(walkOffHr)
      }
    }
  }
  
  // Multi-hit game
  if (playerGameStats.hits.length === 2) {
    const achievement = getAchievement('multi-hit-game')
    if (achievement) unlocked.push(achievement)
  }
  
  // Hit for the cycle
  const hasHR = playerGameStats.hits.includes('HR')
  const has3B = playerGameStats.hits.includes('3B')
  const has2B = playerGameStats.hits.includes('2B')
  const has1B = playerGameStats.hits.includes('1B')
  if (hasHR && has3B && has2B && has1B) {
    const achievement = getAchievement('hit-for-cycle')
    if (achievement) unlocked.push(achievement)
  }
  
  return unlocked
}

/**
 * Check for pitching achievements after a game
 */
export function checkPitchingAchievements(
  pitcherId: string,
  game: Game,
  pitcherGameStats: { strikeouts: number, hitsAllowed: number, walksAllowed: number, inningsPitched: number }
): Achievement[] {
  const unlocked: Achievement[] = []
  
  // First strikeout
  if (pitcherGameStats.strikeouts === 1) {
    const achievement = getAchievement('first-strikeout')
    if (achievement) unlocked.push(achievement)
  }
  
  // Ten strikeouts
  if (pitcherGameStats.strikeouts >= 10) {
    const achievement = getAchievement('ten-strikeouts')
    if (achievement) unlocked.push(achievement)
  }
  
  // Check for complete game scenarios
  if (game.status === 'completed') {
    // No-hitter
    if (pitcherGameStats.hitsAllowed === 0 && pitcherGameStats.inningsPitched >= 27) {
      const achievement = getAchievement('no-hitter')
      if (achievement) unlocked.push(achievement)
      
      // Perfect game
      if (pitcherGameStats.walksAllowed === 0) {
        const perfect = getAchievement('perfect-game')
        if (perfect) unlocked.push(perfect)
      }
    }
  }
  
  return unlocked
}

/**
 * Check for team achievements after an inning
 */
export function checkInningAchievements(
  game: Game,
  inningRuns: number
): Achievement[] {
  const unlocked: Achievement[] = []
  
  // Big inning
  if (inningRuns >= 5) {
    const achievement = getAchievement('big-inning')
    if (achievement) unlocked.push(achievement)
  }
  
  return unlocked
}

/**
 * Check for game achievements after game completion
 */
export function checkGameAchievements(
  game: Game,
  maxDeficit: number
): Achievement[] {
  const unlocked: Achievement[] = []
  
  if (game.status !== 'completed') return unlocked
  
  const homeWon = game.home_score > game.away_score
  const awayWon = game.away_score > game.home_score
  const finalDiff = Math.abs(game.home_score - game.away_score)
  
  // Walk-off win
  if (homeWon && game.half === 'bottom') {
    const achievement = getAchievement('walk-off-win')
    if (achievement) unlocked.push(achievement)
  }
  
  // Extra innings
  if (game.inning > 9) {
    const achievement = getAchievement('extra-innings')
    if (achievement) unlocked.push(achievement)
  }
  
  // High scoring
  if (game.home_score >= 8 && game.away_score >= 8) {
    const achievement = getAchievement('high-scoring')
    if (achievement) unlocked.push(achievement)
  }
  
  // Comeback win
  if (maxDeficit >= 5 && (homeWon || awayWon)) {
    const achievement = getAchievement('comeback-win')
    if (achievement) unlocked.push(achievement)
  }
  
  // Shutout
  if ((homeWon && game.away_score === 0) || (awayWon && game.home_score === 0)) {
    const achievement = getAchievement('shutout')
    if (achievement) unlocked.push(achievement)
  }
  
  // Blowout
  if (finalDiff >= 10) {
    const achievement = getAchievement('blowout')
    if (achievement) unlocked.push(achievement)
  }
  
  return unlocked
}

/**
 * Check for season achievements
 */
export function checkSeasonAchievements(
  wins: number,
  losses: number,
  currentStreak: number,
  streakType: 'win' | 'loss'
): Achievement[] {
  const unlocked: Achievement[] = []
  
  // First win
  if (wins === 1 && losses === 0) {
    const achievement = getAchievement('first-win')
    if (achievement) unlocked.push(achievement)
  }
  
  // Winning streak
  if (streakType === 'win' && currentStreak === 5) {
    const achievement = getAchievement('winning-streak')
    if (achievement) unlocked.push(achievement)
  }
  
  // Undefeated start
  if (wins === 5 && losses === 0) {
    const achievement = getAchievement('undefeated-start')
    if (achievement) unlocked.push(achievement)
  }
  
  return unlocked
}

/**
 * Get rarity color for UI display
 */
export function getRarityColor(rarity: AchievementRarity): string {
  switch (rarity) {
    case 'common': return 'gray'
    case 'uncommon': return 'green'
    case 'rare': return 'blue'
    case 'epic': return 'purple'
    case 'legendary': return 'gold'
  }
}

/**
 * Get rarity display name
 */
export function getRarityLabel(rarity: AchievementRarity): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1)
}
