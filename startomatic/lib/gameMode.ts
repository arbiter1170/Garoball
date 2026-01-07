// Game mode and pacing controls for Garoball
// Supports different levels of user control and simulation speed

import type { Game } from '@/types'

export type GameMode = 'FULL_CONTROL' | 'QUICK_MANAGE' | 'FULL_SIM'

export interface GameModeSettings {
  mode: GameMode
  autoAdvance: boolean
  promptForSubstitutions: boolean
  showDiceRolls: boolean
  animationSpeed: number // 0-1, where 1 is normal speed
  pauseOnKeyMoments: boolean
}

export interface PacingMetrics {
  estimatedMinutesPerGame: number
  playsPerMinute: number
  userInteractionsPerInning: number
}

export const DEFAULT_MODE_SETTINGS: Record<GameMode, GameModeSettings> = {
  FULL_CONTROL: {
    mode: 'FULL_CONTROL',
    autoAdvance: false,
    promptForSubstitutions: true,
    showDiceRolls: true,
    animationSpeed: 1.0,
    pauseOnKeyMoments: true
  },
  QUICK_MANAGE: {
    mode: 'QUICK_MANAGE',
    autoAdvance: true,
    promptForSubstitutions: true,
    showDiceRolls: true,
    animationSpeed: 0.5,
    pauseOnKeyMoments: true
  },
  FULL_SIM: {
    mode: 'FULL_SIM',
    autoAdvance: true,
    promptForSubstitutions: false,
    showDiceRolls: false,
    animationSpeed: 0,
    pauseOnKeyMoments: false
  }
}

export const PACING_METRICS: Record<GameMode, PacingMetrics> = {
  FULL_CONTROL: {
    estimatedMinutesPerGame: 30,
    playsPerMinute: 10,
    userInteractionsPerInning: 8
  },
  QUICK_MANAGE: {
    estimatedMinutesPerGame: 18,
    playsPerMinute: 18,
    userInteractionsPerInning: 2
  },
  FULL_SIM: {
    estimatedMinutesPerGame: 0.5,
    playsPerMinute: 600,
    userInteractionsPerInning: 0
  }
}

export interface SubstitutionPrompt {
  type: 'pitcher' | 'pinch_hitter' | 'defensive'
  reason: string
  urgency: 'low' | 'medium' | 'high'
  recommendation: string
  options: SubstitutionOption[]
}

export interface SubstitutionOption {
  playerId: string
  playerName: string
  reason: string
  matchupAdvantage?: string
}

/**
 * Determine if we should prompt user for a substitution based on game mode
 */
export function shouldPromptForSubstitution(
  settings: GameModeSettings,
  urgency: 'low' | 'medium' | 'high'
): boolean {
  if (settings.mode === 'FULL_SIM') {
    return false
  }

  if (settings.mode === 'FULL_CONTROL') {
    return true
  }

  // QUICK_MANAGE: only prompt on medium+ urgency
  return urgency !== 'low'
}

/**
 * Check if a moment is considered "key" for pacing purposes
 */
export function isKeyMoment(game: Game): boolean {
  // High leverage situations
  const runners = [game.runner_1b, game.runner_2b, game.runner_3b].filter(r => r !== null)
  const hasRunners = runners.length > 0
  const twoOuts = game.outs === 2
  const closeGame = Math.abs(game.home_score - game.away_score) <= 3
  const lateInning = game.inning >= 7

  // Key moments include:
  // - 2 outs with runners on in a close game
  // - Late inning close game with runners in scoring position
  // - Any situation in 9th inning or later with close score

  if (game.inning >= 9 && closeGame) {
    return true
  }

  if (lateInning && closeGame && hasRunners && twoOuts) {
    return true
  }

  if (closeGame && (game.runner_2b || game.runner_3b) && game.inning >= 7) {
    return true
  }

  return false
}

/**
 * Calculate appropriate delay between plays based on mode and situation
 */
export function getPlayDelay(
  settings: GameModeSettings,
  game: Game,
  isKeyMoment: boolean
): number {
  if (settings.mode === 'FULL_SIM') {
    return 0
  }

  const baseDelay = settings.mode === 'FULL_CONTROL' ? 2000 : 1000 // ms

  let delay = baseDelay * settings.animationSpeed

  // Add extra delay for key moments if enabled
  if (isKeyMoment && settings.pauseOnKeyMoments) {
    delay *= 1.5
  }

  return delay
}

/**
 * Get mode description for UI
 */
export function getGameModeDescription(mode: GameMode): string {
  switch (mode) {
    case 'FULL_CONTROL':
      return 'Watch every play with full control over substitutions and strategy. ~30 minutes per game.'
    case 'QUICK_MANAGE':
      return 'Auto-advance through routine plays, pause for key decisions. ~15-20 minutes per game.'
    case 'FULL_SIM':
      return 'Simulate entire game instantly, see final box score. ~30 seconds per game.'
  }
}

/**
 * Season simulation mode - for simulating multiple games
 */
export interface SeasonSimOptions {
  mode: 'ONE_GAME' | 'SERIES' | 'FULL_SEASON'
  gamesPerSim: number
  showHighlights: boolean
}

export const SEASON_SIM_PRESETS: Record<SeasonSimOptions['mode'], SeasonSimOptions> = {
  ONE_GAME: {
    mode: 'ONE_GAME',
    gamesPerSim: 1,
    showHighlights: true
  },
  SERIES: {
    mode: 'SERIES',
    gamesPerSim: 3,
    showHighlights: true
  },
  FULL_SEASON: {
    mode: 'FULL_SEASON',
    gamesPerSim: 162,
    showHighlights: false
  }
}

/**
 * Calculate estimated time for season simulation
 */
export function estimateSeasonSimTime(options: SeasonSimOptions): number {
  const secondsPerGame = options.showHighlights ? 2 : 0.5
  return options.gamesPerSim * secondsPerGame
}
