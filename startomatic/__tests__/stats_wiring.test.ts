import { describe, it, expect } from 'vitest'
import { samplePlayers } from '@/data/samplePlayers'
import { 
  calculateBattingProbabilities,
  calculatePitchingProbabilities,
  LEAGUE_AVERAGE_PROBS,
  probabilitiesToDiceRanges,
} from '@/lib/probabilities'

describe('Stats wiring (sample players)', () => {
  it('batting stats keys and derived metrics are consistent', () => {
    const batters = samplePlayers.filter(p => 'batting_stats' in p && p.batting_stats)
    expect(batters.length).toBeGreaterThan(0)

    for (const p of batters) {
      const s = (p as any).batting_stats as {
        pa: number; ab: number; h: number; '2b': number; '3b': number; hr: number; bb: number; so: number; avg: number; slg: number; iso: number; babip: number; k_pct: number; bb_pct: number
      }

      // Basic field presence
      expect(typeof s.pa).toBe('number')
      expect(typeof s.ab).toBe('number')
      expect(typeof s.h).toBe('number')
      expect(typeof s['2b']).toBe('number')
      expect(typeof s['3b']).toBe('number')
      expect(typeof s.hr).toBe('number')
      expect(typeof s.bb).toBe('number')
      expect(typeof s.so).toBe('number')

      // AVG ~ H/AB
      const avgCalc = s.ab ? (s.h / s.ab) : 0
      expect(Math.abs(s.avg - avgCalc)).toBeLessThan(0.02)

      // ISO = SLG - AVG
      expect(Math.abs(s.iso - (s.slg - s.avg))).toBeLessThan(0.02)

      // K% and BB% ~ rates per PA
      const pa = s.pa || (s.ab + s.bb)
      expect(Math.abs(s.k_pct - (s.so / pa))).toBeLessThan(0.05)
      expect(Math.abs(s.bb_pct - (s.bb / pa))).toBeLessThan(0.05)

      // Probability calculation returns valid values
      const probs = calculateBattingProbabilities(s)
      const total = probs.K + probs.BB + probs.OUT + probs['1B'] + probs['2B'] + probs['3B'] + probs.HR
      expect(Math.abs(total - 1)).toBeLessThan(1e-6)
      // Dice ranges should be created without error
      const ranges = probabilitiesToDiceRanges(probs)
      expect(ranges).toBeDefined()
    }
  })

  it('pitching stats keys and probability calculations are consistent', () => {
    const pitchers = samplePlayers.filter(p => 'pitching_stats' in p && p.pitching_stats)
    expect(pitchers.length).toBeGreaterThan(0)

    for (const p of pitchers) {
      const s = (p as any).pitching_stats as {
        ip_outs: number; h: number; hr: number; bb: number; so: number; k_pct: number; bb_pct: number; era: number; whip: number
      }

      // Basic field presence
      expect(typeof s.ip_outs).toBe('number')
      expect(typeof s.h).toBe('number')
      expect(typeof s.hr).toBe('number')
      expect(typeof s.bb).toBe('number')
      expect(typeof s.so).toBe('number')
      expect(typeof s.era).toBe('number')
      expect(typeof s.whip).toBe('number')

      const pa = s.ip_outs + s.h + s.bb
      expect(pa).toBeGreaterThan(0)

      const probs = calculatePitchingProbabilities(s)
      const total = probs.K + probs.BB + probs.OUT + probs['1B'] + probs['2B'] + probs['3B'] + probs.HR
      expect(Math.abs(total - 1)).toBeLessThan(1e-6)

      // Dice ranges should be created without error
      const ranges = probabilitiesToDiceRanges(probs)
      expect(ranges).toBeDefined()
    }
  })

  it('falls back to league averages when stats are zero', () => {
    const zeroBatting = { pa: 0, ab: 0, h: 0, '2b': 0, '3b': 0, hr: 0, bb: 0, so: 0 }
    const bp = calculateBattingProbabilities(zeroBatting as any)
    expect(bp).toEqual(LEAGUE_AVERAGE_PROBS)

    const zeroPitching = { ip_outs: 0, h: 0, hr: 0, bb: 0, so: 0 }
    const pp = calculatePitchingProbabilities(zeroPitching as any)
    expect(pp).toEqual(LEAGUE_AVERAGE_PROBS)
  })
})
