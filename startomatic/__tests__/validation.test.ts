import { describe, it, expect } from 'vitest'
import { validateGameSetup, validateSeasonRatingCounts } from '../lib/validation'
import type { PlayerRating } from '../types'

const createBattingStats = () => ({
  pa: 1,
  ab: 1,
  h: 0,
  '2b': 0,
  '3b': 0,
  hr: 0,
  bb: 0,
  so: 0,
  avg: 0,
  slg: 0,
  iso: 0,
  babip: 0,
  k_pct: 0,
  bb_pct: 0
})

const createPitchingStats = () => ({
  ip_outs: 0,
  h: 0,
  hr: 0,
  bb: 0,
  so: 0,
  k_pct: 0,
  bb_pct: 0,
  era: 0,
  whip: 0
})

const createRating = (playerId: string, type: 'batting' | 'pitching'): PlayerRating => ({
  id: `rating-${playerId}-${type}`,
  player_id: playerId,
  year: 2024,
  rating_type: type,
  stats: type === 'batting' ? createBattingStats() : createPitchingStats(),
  p_k: 0.2,
  p_bb: 0.1,
  p_out: 0.4,
  p_1b: 0.1,
  p_2b: 0.05,
  p_3b: 0.02,
  p_hr: 0.03,
  dice_table: [],
  fatigue_threshold: type === 'pitching' ? 27 : null,
  created_at: new Date().toISOString()
})

describe('validateSeasonRatingCounts', () => {
  it('passes when counts meet thresholds', () => {
    const result = validateSeasonRatingCounts({ battingCount: 18, pitchingCount: 2 })
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails when counts are too low', () => {
    const result = validateSeasonRatingCounts({ battingCount: 10, pitchingCount: 1 })
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('validateGameSetup', () => {
  it('passes with valid lineups and ratings', () => {
    const homeLineup = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9']
    const awayLineup = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9']
    const ratings = new Map<string, PlayerRating>()

    homeLineup.forEach((id) => ratings.set(`${id}:batting`, createRating(id, 'batting')))
    awayLineup.forEach((id) => ratings.set(`${id}:batting`, createRating(id, 'batting')))
    ratings.set('hp1:pitching', createRating('hp1', 'pitching'))
    ratings.set('ap1:pitching', createRating('ap1', 'pitching'))

    const result = validateGameSetup({
      homeLineup,
      awayLineup,
      homePitcherId: 'hp1',
      awayPitcherId: 'ap1',
      ratings
    })

    expect(result.ok).toBe(true)
  })

  it('fails when lineup is too short', () => {
    const homeLineup = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8']
    const awayLineup = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9']
    const ratings = new Map<string, PlayerRating>()

    const result = validateGameSetup({
      homeLineup,
      awayLineup,
      homePitcherId: 'hp1',
      awayPitcherId: 'ap1',
      ratings
    })

    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('Home lineup needs at least')
  })

  it('fails when lineup has duplicates', () => {
    const homeLineup = ['h1', 'h2', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8']
    const awayLineup = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9']
    const ratings = new Map<string, PlayerRating>()

    const result = validateGameSetup({
      homeLineup,
      awayLineup,
      homePitcherId: 'hp1',
      awayPitcherId: 'ap1',
      ratings
    })

    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('duplicate player ids')
  })

  it('fails when batting ratings are missing', () => {
    const homeLineup = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9']
    const awayLineup = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9']
    const ratings = new Map<string, PlayerRating>()

    awayLineup.forEach((id) => ratings.set(`${id}:batting`, createRating(id, 'batting')))
    ratings.set('hp1:pitching', createRating('hp1', 'pitching'))
    ratings.set('ap1:pitching', createRating('ap1', 'pitching'))

    const result = validateGameSetup({
      homeLineup,
      awayLineup,
      homePitcherId: 'hp1',
      awayPitcherId: 'ap1',
      ratings
    })

    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('Missing batting ratings for home lineup')
  })

  it('fails when pitching ratings are missing', () => {
    const homeLineup = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9']
    const awayLineup = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9']
    const ratings = new Map<string, PlayerRating>()

    homeLineup.forEach((id) => ratings.set(`${id}:batting`, createRating(id, 'batting')))
    awayLineup.forEach((id) => ratings.set(`${id}:batting`, createRating(id, 'batting')))

    const result = validateGameSetup({
      homeLineup,
      awayLineup,
      homePitcherId: 'hp1',
      awayPitcherId: 'ap1',
      ratings
    })

    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('Missing pitching rating')
  })
})
