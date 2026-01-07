// NPC Pitching Manager for Garoball
// Handles intelligent pitcher substitutions based on game state

import type { Game, Player, PlayerRating, Handedness } from '@/types'
import { getPlatoonModifiers } from './handedness'

export interface PitcherState {
  playerId: string
  outsRecorded: number
  runsAllowed: number
  hitsAllowed: number
  walksAllowed: number
  isAvailable: boolean
  lastUsedInning?: number
  role: 'starter' | 'reliever' | 'closer'
}

export interface RosterConstraints {
  maxPlayers: number
  minPitchers: number
}

export interface SubstitutionTriggers {
  maxOutsPerStarter: number
  maxRunsBeforePull: number
  leverageThreshold: number
  fatigueFactor: number
}

const DEFAULT_CONSTRAINTS: RosterConstraints = {
  maxPlayers: 20,
  minPitchers: 5
}

const DEFAULT_TRIGGERS: SubstitutionTriggers = {
  maxOutsPerStarter: 21, // ~7 innings
  maxRunsBeforePull: 5,   // Pull if allows 5+ runs
  leverageThreshold: 0.7,  // High leverage situations
  fatigueFactor: 1.2      // Multiplier when fatigue kicks in
}

export class PitchingManager {
  private pitcherStates: Map<string, PitcherState>
  private constraints: RosterConstraints
  private triggers: SubstitutionTriggers
  private roster: Map<string, Player>
  private ratings: Map<string, PlayerRating>

  constructor(
    roster: Map<string, Player>,
    ratings: Map<string, PlayerRating>,
    constraints: Partial<RosterConstraints> = {},
    triggers: Partial<SubstitutionTriggers> = {}
  ) {
    this.roster = roster
    this.ratings = ratings
    this.constraints = { ...DEFAULT_CONSTRAINTS, ...constraints }
    this.triggers = { ...DEFAULT_TRIGGERS, ...triggers }
    this.pitcherStates = new Map()

    // Initialize pitcher states
    this.initializePitchers()
  }

  private initializePitchers(): void {
    for (const [playerId, player] of this.roster) {
      if (player.throws) {
        // Determine pitcher role based on rating (simplified for MVP)
        const rating = this.ratings.get(`${playerId}:pitching`)
        const role = this.determinePitcherRole(rating)

        this.pitcherStates.set(playerId, {
          playerId,
          outsRecorded: 0,
          runsAllowed: 0,
          hitsAllowed: 0,
          walksAllowed: 0,
          isAvailable: true,
          role
        })
      }
    }
  }

  private determinePitcherRole(rating?: PlayerRating): 'starter' | 'reliever' | 'closer' {
    if (!rating) return 'reliever'

    // Use IP as a proxy for role (starters have more innings)
    const ipOuts = (rating.stats as any).ip_outs || 0
    const innings = ipOuts / 3

    if (innings >= 150) return 'starter'
    if (innings >= 50) return 'reliever'
    return 'closer'
  }

  /**
   * Evaluate if current pitcher should be pulled
   */
  shouldPullPitcher(
    game: Game,
    currentPitcherId: string,
    isPlayerControlled: boolean = false
  ): { shouldPull: boolean; reason: string; urgency: 'low' | 'medium' | 'high' } {
    const state = this.pitcherStates.get(currentPitcherId)
    if (!state) {
      return { shouldPull: false, reason: 'Unknown pitcher', urgency: 'low' }
    }

    const pitcher = this.roster.get(currentPitcherId)
    const pitcherRating = this.ratings.get(`${currentPitcherId}:pitching`)
    
    // Calculate leverage
    const leverage = this.calculateLeverage(game)
    
    // Check various triggers
    
    // 1. Early blowup - pitcher allows too many runs
    if (state.runsAllowed >= this.triggers.maxRunsBeforePull) {
      return {
        shouldPull: true,
        reason: `Allowed ${state.runsAllowed} runs`,
        urgency: 'high'
      }
    }

    // 2. Fatigue/pitch count (using outs as proxy)
    const fatigueThreshold = pitcherRating?.fatigue_threshold || this.triggers.maxOutsPerStarter
    if (state.outsRecorded >= fatigueThreshold) {
      // If high leverage and fatigued, urgent pull
      if (leverage >= this.triggers.leverageThreshold) {
        return {
          shouldPull: true,
          reason: 'Fatigued in high leverage situation',
          urgency: 'high'
        }
      }
      return {
        shouldPull: true,
        reason: 'Reached pitch limit',
        urgency: 'medium'
      }
    }

    // 3. High leverage, late innings - consider closer
    if (game.inning >= 8 && leverage >= this.triggers.leverageThreshold) {
      const closerAvailable = this.hasAvailableCloser(currentPitcherId)
      if (closerAvailable && state.role !== 'closer') {
        return {
          shouldPull: true,
          reason: 'High leverage late inning - bring in closer',
          urgency: 'medium'
        }
      }
    }

    // 4. Platoon disadvantage with runners on
    if (game.runner_1b || game.runner_2b || game.runner_3b) {
      const currentBatterId = this.getCurrentBatterId(game)
      const batter = this.roster.get(currentBatterId)
      
      if (batter && pitcher && batter.bats && pitcher.throws) {
        const modifiers = getPlatoonModifiers(batter.bats, pitcher.throws)
        
        // If batter has significant advantage and runners on, consider change
        if (modifiers.powerBoost > 1.10) {
          const specialistAvailable = this.hasAvailablePlatoonSpecialist(
            pitcher.throws === 'L' ? 'R' : 'L',
            currentPitcherId
          )
          
          if (specialistAvailable && state.outsRecorded >= 3) { // At least 1 inning
            return {
              shouldPull: true,
              reason: 'Platoon disadvantage with runners on',
              urgency: 'low'
            }
          }
        }
      }
    }

    return { shouldPull: false, reason: 'Pitcher performing well', urgency: 'low' }
  }

  /**
   * Select best available relief pitcher for the situation
   */
  selectReliefPitcher(
    game: Game,
    currentPitcherId: string
  ): string | null {
    const leverage = this.calculateLeverage(game)
    const currentBatterId = this.getCurrentBatterId(game)
    const batter = this.roster.get(currentBatterId)

    // Get available pitchers
    const available = Array.from(this.pitcherStates.values())
      .filter(state => 
        state.isAvailable && 
        state.playerId !== currentPitcherId &&
        this.isPitcherRested(state, game.inning)
      )

    if (available.length === 0) {
      return null // No one available
    }

    // Prioritize by situation
    
    // 1. High leverage late game - use closer
    if (game.inning >= 8 && leverage >= this.triggers.leverageThreshold) {
      const closers = available.filter(s => s.role === 'closer')
      if (closers.length > 0) {
        return this.selectBestMatchup(closers, batter)
      }
    }

    // 2. Middle innings - use best available reliever
    if (game.inning >= 6) {
      const relievers = available.filter(s => s.role === 'reliever' || s.role === 'closer')
      if (relievers.length > 0) {
        return this.selectBestMatchup(relievers, batter)
      }
    }

    // 3. Early/emergency - use any available pitcher
    return this.selectBestMatchup(available, batter)
  }

  /**
   * Update pitcher state after a play
   */
  updatePitcherState(
    pitcherId: string,
    outcome: string,
    runsScored: number
  ): void {
    const state = this.pitcherStates.get(pitcherId)
    if (!state) return

    if (outcome === 'K' || outcome === 'OUT') {
      state.outsRecorded++
    }
    
    if (outcome !== 'K' && outcome !== 'BB' && outcome !== 'OUT') {
      state.hitsAllowed++
    }
    
    if (outcome === 'BB') {
      state.walksAllowed++
    }
    
    state.runsAllowed += runsScored
  }

  /**
   * Mark pitcher as used (after substitution)
   */
  markPitcherUsed(pitcherId: string, inning: number): void {
    const state = this.pitcherStates.get(pitcherId)
    if (state) {
      state.lastUsedInning = inning
      // Reset counting stats for new appearance
      state.outsRecorded = 0
      state.runsAllowed = 0
      state.hitsAllowed = 0
      state.walksAllowed = 0
    }
  }

  /**
   * Mark pitcher as unavailable (injured, used recently, etc.)
   */
  setPitcherAvailability(pitcherId: string, available: boolean): void {
    const state = this.pitcherStates.get(pitcherId)
    if (state) {
      state.isAvailable = available
    }
  }

  private getCurrentBatterId(game: Game): string {
    const lineup = game.half === 'top' ? game.away_lineup : game.home_lineup
    return lineup[game.current_batter_idx % lineup.length]
  }

  private calculateLeverage(game: Game): number {
    // Simple leverage calculation based on game state
    const scoreDiff = Math.abs(game.home_score - game.away_score)
    const inningFactor = game.inning >= 7 ? 1.5 : 1.0
    const runnersFactor = (game.runner_1b ? 0.3 : 0) +
                          (game.runner_2b ? 0.5 : 0) +
                          (game.runner_3b ? 0.7 : 0)
    
    // Lower score differential = higher leverage
    const scoreFactor = scoreDiff === 0 ? 1.5 : Math.max(0.3, 1.5 - (scoreDiff * 0.2))
    
    // Outs matter too
    const outsFactor = game.outs === 2 ? 1.3 : 1.0
    
    return Math.min(2.0, scoreFactor * inningFactor * (1 + runnersFactor) * outsFactor)
  }

  private hasAvailableCloser(excludeId: string): boolean {
    return Array.from(this.pitcherStates.values()).some(
      state => state.role === 'closer' && 
               state.isAvailable && 
               state.playerId !== excludeId
    )
  }

  private hasAvailablePlatoonSpecialist(
    preferredHand: Handedness,
    excludeId: string
  ): boolean {
    return Array.from(this.pitcherStates.values()).some(state => {
      if (!state.isAvailable || state.playerId === excludeId) return false
      const pitcher = this.roster.get(state.playerId)
      return pitcher?.throws === preferredHand
    })
  }

  private isPitcherRested(state: PitcherState, currentInning: number): boolean {
    // Simple rest rule: need at least 1 inning rest for relievers
    if (!state.lastUsedInning) return true
    
    if (state.role === 'starter') {
      return false // Starters don't come back same game
    }
    
    // Relievers need at least 2 innings rest
    return (currentInning - state.lastUsedInning) >= 2
  }

  private selectBestMatchup(
    candidates: PitcherState[],
    batter?: Player
  ): string {
    if (candidates.length === 0) return ''
    if (candidates.length === 1) return candidates[0].playerId

    // If we know the batter, consider platoon advantage
    if (batter?.bats) {
      // Look for platoon advantage
      for (const state of candidates) {
        const pitcher = this.roster.get(state.playerId)
        if (!pitcher?.throws) continue

        const modifiers = getPlatoonModifiers(batter.bats, pitcher.throws)
        // Pitcher wants to negate batter advantage
        if (modifiers.powerBoost < 1.0) {
          return state.playerId
        }
      }
    }

    // Fallback: use first available (or could use rating-based selection)
    return candidates[0].playerId
  }

  /**
   * Get current state for a pitcher
   */
  getPitcherState(pitcherId: string): PitcherState | undefined {
    return this.pitcherStates.get(pitcherId)
  }

  /**
   * Get all available pitchers
   */
  getAvailablePitchers(): PitcherState[] {
    return Array.from(this.pitcherStates.values())
      .filter(state => state.isAvailable)
  }
}
