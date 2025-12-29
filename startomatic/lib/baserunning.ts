// Baserunning logic for Garoball
// Handles runner advancement on hits and outs

import type { Outcome } from '@/types'

export interface BaseState {
  runner1b: string | null
  runner2b: string | null
  runner3b: string | null
}

export interface BaserunningResult {
  newState: BaseState
  runsScored: number
  runnersScored: string[]
}

// Standard baserunning rules (conservative)
// These can be expanded with runner speed ratings later
export function advanceRunners(
  currentState: BaseState,
  batterId: string,
  outcome: Outcome,
  outs: number
): BaserunningResult {
  const { runner1b, runner2b, runner3b } = currentState
  const runsScored: string[] = []
  let newState: BaseState = { runner1b: null, runner2b: null, runner3b: null }

  switch (outcome) {
    case 'HR':
      // Everyone scores, including batter
      if (runner3b) runsScored.push(runner3b)
      if (runner2b) runsScored.push(runner2b)
      if (runner1b) runsScored.push(runner1b)
      runsScored.push(batterId)
      break

    case '3B':
      // All runners score, batter to third
      if (runner3b) runsScored.push(runner3b)
      if (runner2b) runsScored.push(runner2b)
      if (runner1b) runsScored.push(runner1b)
      newState.runner3b = batterId
      break

    case '2B':
      // Runner from 3B scores, runner from 2B scores
      // Runner from 1B goes to 3B (conservative)
      if (runner3b) runsScored.push(runner3b)
      if (runner2b) runsScored.push(runner2b)
      if (runner1b) newState.runner3b = runner1b
      newState.runner2b = batterId
      break

    case '1B':
      // Runner from 3B scores
      // Runner from 2B goes to 3B (conservative) or scores with 2 outs
      // Runner from 1B goes to 2B
      if (runner3b) runsScored.push(runner3b)
      if (runner2b) {
        if (outs === 2) {
          // With 2 outs, runner goes on contact
          runsScored.push(runner2b)
        } else {
          newState.runner3b = runner2b
        }
      }
      if (runner1b) newState.runner2b = runner1b
      newState.runner1b = batterId
      break

    case 'BB':
      // Walks force runners
      if (runner1b && runner2b && runner3b) {
        runsScored.push(runner3b)
        newState.runner3b = runner2b
        newState.runner2b = runner1b
      } else if (runner1b && runner2b) {
        newState.runner3b = runner2b
        newState.runner2b = runner1b
      } else if (runner1b) {
        newState.runner2b = runner1b
      }
      newState.runner1b = batterId
      // Keep non-forced runners in place
      if (!runner1b) {
        newState.runner2b = runner2b
        newState.runner3b = runner3b
      } else if (!runner2b) {
        newState.runner3b = runner3b
      }
      break

    case 'K':
    case 'OUT':
      // On outs, runners stay (for now - could add GIDP, sac flies, etc.)
      // With less than 2 outs, runner from 3B can score on some outs (sac fly)
      // For MVP, we keep it simple - no advancement on outs
      newState = { ...currentState }
      break
  }

  return {
    newState,
    runsScored: runsScored.length,
    runnersScored: runsScored
  }
}

// Check if bases are loaded
export function basesLoaded(state: BaseState): boolean {
  return !!(state.runner1b && state.runner2b && state.runner3b)
}

// Count runners on base
export function runnersOnBase(state: BaseState): number {
  let count = 0
  if (state.runner1b) count++
  if (state.runner2b) count++
  if (state.runner3b) count++
  return count
}

// Get visual representation of base state
export function getBaseStateString(state: BaseState): string {
  const first = state.runner1b ? '●' : '○'
  const second = state.runner2b ? '●' : '○'
  const third = state.runner3b ? '●' : '○'
  return `${second}\n${third} ${first}`
}

// Check scoring position (runner on 2nd or 3rd)
export function runnerInScoringPosition(state: BaseState): boolean {
  return !!(state.runner2b || state.runner3b)
}
