// Build `player_ratings` rows from Lahman batting/pitching CSVs.
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   LAHMAN_PATH=/absolute/path/to/lahman/csv \
//   LAHMAN_YEAR=2024 \
//   npm run seed:ratings

import path from 'node:path'
import { loadScriptEnv } from './_env'
import { createClient } from '@supabase/supabase-js'
import { readCsvRows, n } from './_lahman'
import {
  calculateBattingProbabilities,
  calculatePitchingProbabilities,
  createDiceTable,
} from '@/lib/probabilities'

loadScriptEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const lahmanPath = process.env.LAHMAN_PATH
const year = Number(process.env.LAHMAN_YEAR ?? '2024')
const limit = Number(process.env.LAHMAN_LIMIT ?? '0') // 0 = no limit

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!lahmanPath) {
  console.error('Missing env: LAHMAN_PATH (folder containing Batting.csv, Pitching.csv)')
  process.exit(1)
}

if (/^[A-Za-z]:\\/.test(lahmanPath) || (lahmanPath.includes('\\') && lahmanPath.includes(':'))) {
  console.error('LAHMAN_PATH looks like a Windows path. This script is running in Linux, so it cannot read C:\\... directly.')
  console.error('Fix: copy the Lahman CSV folder into this workspace (e.g. /workspaces/Garoball/lahman_csv) and set LAHMAN_PATH to that Linux path.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function mapLahmanIdsToPlayerUuids(lahmanIds: string[]) {
  const { data, error } = await supabase
    .from('players')
    .select('id, lahman_player_id')
    .in('lahman_player_id', lahmanIds)

  if (error) throw new Error(`Fetching players failed: ${error.message}`)
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    if (row.lahman_player_id) map.set(row.lahman_player_id, row.id)
  }
  return map
}

function aggregateBatting(rows: Record<string, string>[]) {
  const byPlayer = new Map<string, any>()
  for (const r of rows) {
    if (n(r.yearID) !== year) continue
    const playerID = (r.playerID ?? '').trim()
    if (!playerID) continue

    const cur = byPlayer.get(playerID) ?? {
      pa: 0, ab: 0, h: 0, '2b': 0, '3b': 0, hr: 0, bb: 0, so: 0,
    }

    // Lahman Batting.csv fields: AB, H, 2B, 3B, HR, BB, SO, HBP, SH, SF...
    cur.ab += n(r.AB)
    cur.h += n(r.H)
    cur['2b'] += n(r['2B'])
    cur['3b'] += n(r['3B'])
    cur.hr += n(r.HR)
    cur.bb += n(r.BB)
    cur.so += n(r.SO)

    const hbp = n(r.HBP)
    const sf = n(r.SF)
    cur.pa += n(r.AB) + n(r.BB) + hbp + sf

    byPlayer.set(playerID, cur)
  }
  return byPlayer
}

function aggregatePitching(rows: Record<string, string>[]) {
  const byPlayer = new Map<string, any>()
  for (const r of rows) {
    if (n(r.yearID) !== year) continue
    const playerID = (r.playerID ?? '').trim()
    if (!playerID) continue

    const cur = byPlayer.get(playerID) ?? {
      ip_outs: 0, h: 0, hr: 0, bb: 0, so: 0,
      // We keep era/whip in stats; compute later.
    }

    // Lahman Pitching.csv fields: IPouts, H, HR, BB, SO
    cur.ip_outs += n(r.IPouts)
    cur.h += n(r.H)
    cur.hr += n(r.HR)
    cur.bb += n(r.BB)
    cur.so += n(r.SO)

    byPlayer.set(playerID, cur)
  }
  return byPlayer
}

function addDerivedBattingStats(s: any) {
  const singles = Math.max(0, s.h - s['2b'] - s['3b'] - s.hr)
  const tb = singles + 2 * s['2b'] + 3 * s['3b'] + 4 * s.hr
  const avg = s.ab ? s.h / s.ab : 0
  const slg = s.ab ? tb / s.ab : 0
  const iso = slg - avg

  // BABIP needs SF; if unavailable we approximate without SF.
  const denom = Math.max(1, s.ab - s.so - s.hr)
  const babip = Math.max(0, (s.h - s.hr) / denom)

  const pa = s.pa || (s.ab + s.bb)
  const k_pct = pa ? (s.so / pa) : 0
  const bb_pct = pa ? (s.bb / pa) : 0

  return { ...s, avg, slg, iso, babip, k_pct, bb_pct }
}

function addDerivedPitchingStats(s: any) {
  // ERA = ER * 9 / IP. Lahman has ER but we don't aggregate it right now.
  // For now, set ERA/WHIP to 0 when missing; can be enhanced later with ER and HBP.
  const ip = s.ip_outs / 3
  const whip = ip > 0 ? (s.bb + s.h) / ip : 0
  const era = 0

  const pa = s.ip_outs + s.h + s.bb
  const k_pct = pa ? (s.so / pa) : 0
  const bb_pct = pa ? (s.bb / pa) : 0

  return { ...s, era, whip, k_pct, bb_pct }
}

async function upsertRating(playerId: string, ratingType: 'batting' | 'pitching', stats: any, probs: any, diceTable: any, fatigueThreshold?: number | null) {
  const payload: any = {
    player_id: playerId,
    year,
    rating_type: ratingType,
    stats,
    p_k: probs.K,
    p_bb: probs.BB,
    p_1b: probs['1B'],
    p_2b: probs['2B'],
    p_3b: probs['3B'],
    p_hr: probs.HR,
    p_out: probs.OUT,
    dice_table: diceTable,
  }
  if (ratingType === 'pitching') payload.fatigue_threshold = fatigueThreshold ?? null

  const { error } = await supabase
    .from('player_ratings')
    .upsert(payload, { onConflict: 'player_id,year,rating_type' })

  if (error) throw new Error(`Upserting ${ratingType} rating failed: ${error.message}`)
}

async function main() {
  const battingCsv = path.join(lahmanPath, 'Batting.csv')
  const pitchingCsv = path.join(lahmanPath, 'Pitching.csv')

  const battingRows = readCsvRows(battingCsv)
  const pitchingRows = readCsvRows(pitchingCsv)

  const battingAgg = aggregateBatting(battingRows)
  const pitchingAgg = aggregatePitching(pitchingRows)

  let lahmanIds = [...new Set([...battingAgg.keys(), ...pitchingAgg.keys()])]
  if (limit > 0) lahmanIds = lahmanIds.slice(0, limit)

  console.log(`Resolving ${lahmanIds.length} Lahman ids to players...`)
  const idMap = await mapLahmanIdsToPlayerUuids(lahmanIds)
  console.log(`Matched ${idMap.size} players in public.players`)

  let written = 0
  for (const lahmanId of lahmanIds) {
    const playerId = idMap.get(lahmanId)
    if (!playerId) continue

    const bat = battingAgg.get(lahmanId)
    if (bat) {
      const stats = addDerivedBattingStats(bat)
      const probs = calculateBattingProbabilities(stats)
      const diceTable = createDiceTable(probs)
      await upsertRating(playerId, 'batting', stats, probs, diceTable)
      written++
    }

    const pit = pitchingAgg.get(lahmanId)
    if (pit) {
      const stats = addDerivedPitchingStats(pit)
      const probs = calculatePitchingProbabilities(stats)
      const diceTable = createDiceTable(probs)

      // Very rough fatigue threshold: ~ avg outs per start assuming 30 starts.
      const fatigue = Math.floor(stats.ip_outs / 30)
      await upsertRating(playerId, 'pitching', stats, probs, diceTable, fatigue)
      written++
    }
  }

  console.log(`✓ Upserted ${written} player_ratings rows for year ${year}`)
}

main().catch(err => {
  console.error('❌ Ratings build failed:', err)
  process.exit(1)
})
