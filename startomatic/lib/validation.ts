import type { PlayerRating, RatingType } from '@/types'

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

const DEFAULT_MIN_LINEUP_SIZE = 9
const DEFAULT_MIN_BATTERS = 18
const DEFAULT_MIN_PITCHERS = 2

function buildResult(errors: string[]): ValidationResult {
  return { ok: errors.length === 0, errors }
}

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values))
}

function findDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1))
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
}

function summarizeIds(ids: string[], limit = 5): string {
  if (ids.length <= limit) return ids.join(', ')
  return `${ids.slice(0, limit).join(', ')} (+${ids.length - limit} more)`
}

export function validateSeasonRatingCounts(options: {
  battingCount: number
  pitchingCount: number
  minBatters?: number
  minPitchers?: number
}): ValidationResult {
  const minBatters = options.minBatters ?? DEFAULT_MIN_BATTERS
  const minPitchers = options.minPitchers ?? DEFAULT_MIN_PITCHERS
  const errors: string[] = []

  if (options.battingCount < minBatters) {
    errors.push(`Need at least ${minBatters} batting ratings, found ${options.battingCount}.`)
  }
  if (options.pitchingCount < minPitchers) {
    errors.push(`Need at least ${minPitchers} pitching ratings, found ${options.pitchingCount}.`)
  }

  return buildResult(errors)
}

function validateLineup(lineup: string[], label: string, minSize: number): string[] {
  const errors: string[] = []

  if (!Array.isArray(lineup) || lineup.length === 0) {
    return [`${label} lineup is missing.`]
  }

  if (lineup.length < minSize) {
    errors.push(`${label} lineup needs at least ${minSize} players.`)
  }

  const invalidIds = lineup.filter((id) => typeof id !== 'string' || id.trim().length === 0)
  if (invalidIds.length > 0) {
    errors.push(`${label} lineup has invalid player ids.`)
  }

  const duplicates = findDuplicates(lineup)
  if (duplicates.length > 0) {
    errors.push(`${label} lineup has duplicate player ids: ${summarizeIds(duplicates)}.`)
  }

  return errors
}

function validatePitcher(pitcherId: string | null | undefined, label: string): string[] {
  if (!pitcherId || typeof pitcherId !== 'string' || pitcherId.trim().length === 0) {
    return [`${label} pitcher is required.`]
  }
  return []
}

function findMissingRatings(
  playerIds: string[],
  ratingType: RatingType,
  ratings: Map<string, PlayerRating>
): string[] {
  const missing = playerIds.filter((id) => !ratings.has(`${id}:${ratingType}`))
  return uniqueList(missing)
}

export function validateGameSetup(options: {
  homeLineup: string[]
  awayLineup: string[]
  homePitcherId: string
  awayPitcherId: string
  ratings: Map<string, PlayerRating>
  minLineupSize?: number
}): ValidationResult {
  const errors: string[] = []
  const minLineupSize = options.minLineupSize ?? DEFAULT_MIN_LINEUP_SIZE

  errors.push(...validateLineup(options.homeLineup, 'Home', minLineupSize))
  errors.push(...validateLineup(options.awayLineup, 'Away', minLineupSize))
  errors.push(...validatePitcher(options.homePitcherId, 'Home'))
  errors.push(...validatePitcher(options.awayPitcherId, 'Away'))

  if (errors.length > 0) {
    return buildResult(errors)
  }

  const missingHomeBatters = findMissingRatings(options.homeLineup, 'batting', options.ratings)
  if (missingHomeBatters.length > 0) {
    errors.push(`Missing batting ratings for home lineup: ${summarizeIds(missingHomeBatters)}.`)
  }

  const missingAwayBatters = findMissingRatings(options.awayLineup, 'batting', options.ratings)
  if (missingAwayBatters.length > 0) {
    errors.push(`Missing batting ratings for away lineup: ${summarizeIds(missingAwayBatters)}.`)
  }

  const missingHomePitcher = findMissingRatings([options.homePitcherId], 'pitching', options.ratings)
  if (missingHomePitcher.length > 0) {
    errors.push(`Missing pitching rating for home pitcher: ${missingHomePitcher[0]}.`)
  }

  const missingAwayPitcher = findMissingRatings([options.awayPitcherId], 'pitching', options.ratings)
  if (missingAwayPitcher.length > 0) {
    errors.push(`Missing pitching rating for away pitcher: ${missingAwayPitcher[0]}.`)
  }

  return buildResult(errors)
}
