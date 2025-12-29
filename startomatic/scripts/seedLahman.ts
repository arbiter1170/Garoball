// Ingest a subset of Lahman CSVs into Supabase.
// Expected files (from Lahman CSV download):
// - People.csv
// - Batting.csv
// - Pitching.csv
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   LAHMAN_PATH=/absolute/path/to/lahman/csv \
//   npm run seed:lahman

import path from 'node:path'
import { loadScriptEnv } from './_env'
import { createClient } from '@supabase/supabase-js'
import { readCsvRows, n, s, formatYmd } from './_lahman'

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
  console.error('Missing env: LAHMAN_PATH (folder containing People.csv, Batting.csv, Pitching.csv)')
  process.exit(1)
}

if (/^[A-Za-z]:\\/.test(lahmanPath) || (lahmanPath.includes('\\') && lahmanPath.includes(':'))) {
  console.error('LAHMAN_PATH looks like a Windows path. This script is running in Linux, so it cannot read C:\\... directly.')
  console.error('Fix: copy the Lahman CSV folder into this workspace (e.g. /workspaces/Garoball/lahman_csv) and set LAHMAN_PATH to that Linux path.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

type Person = {
  playerID: string
  nameFirst: string | null
  nameLast: string | null
  birthDate: string | null
  bats: 'L' | 'R' | 'S' | null
  throws: 'L' | 'R' | null
  debut: string | null
  finalGame: string | null
}

function pickHand(value: string | null, allowed: readonly string[]) {
  if (!value) return null
  const v = value.trim().toUpperCase()
  return allowed.includes(v) ? (v as any) : null
}

function loadPeople(filePath: string): Map<string, Person> {
  const rows = readCsvRows(filePath)
  const byId = new Map<string, Person>()
  for (const r of rows) {
    const playerID = (r.playerID ?? '').trim()
    if (!playerID) continue
    const birth = formatYmd(s(r.birthYear) && s(r.birthMonth) && s(r.birthDay)
      ? `${r.birthYear}-${String(r.birthMonth).padStart(2, '0')}-${String(r.birthDay).padStart(2, '0')}`
      : s(r.birthDate))
    byId.set(playerID, {
      playerID,
      nameFirst: s(r.nameFirst),
      nameLast: s(r.nameLast),
      birthDate: birth,
      bats: pickHand(s(r.bats), ['L', 'R', 'S']),
      throws: pickHand(s(r.throws), ['L', 'R']),
      debut: s(r.debut),
      finalGame: s(r.finalGame),
    })
  }
  return byId
}

async function upsertPlayersFromPeople(people: Map<string, Person>, playerIDs: string[]) {
  const payload = playerIDs.map(id => {
    const p = people.get(id)
    return {
      lahman_player_id: id,
      first_name: p?.nameFirst ?? 'Unknown',
      last_name: p?.nameLast ?? id,
      birth_date: p?.birthDate ?? null,
      bats: p?.bats ?? null,
      throws: p?.throws ?? null,
      primary_position: null,
      debut_year: p?.debut ? Number(String(p.debut).slice(0, 4)) || null : null,
      final_year: p?.finalGame ? Number(String(p.finalGame).slice(0, 4)) || null : null,
    }
  })

  // Upsert by lahman_player_id; the table allows null but we want it set.
  const { error } = await supabase
    .from('players')
    .upsert(payload, { onConflict: 'lahman_player_id' })

  if (error) throw new Error(`Upserting players failed: ${error.message}`)
}

function collectActivePlayerIds(battingPath: string, pitchingPath: string, year: number): string[] {
  const batRows = readCsvRows(battingPath)
  const pitRows = readCsvRows(pitchingPath)
  const set = new Set<string>()
  for (const r of batRows) {
    if (n(r.yearID) !== year) continue
    const id = (r.playerID ?? '').trim()
    if (id) set.add(id)
  }
  for (const r of pitRows) {
    if (n(r.yearID) !== year) continue
    const id = (r.playerID ?? '').trim()
    if (id) set.add(id)
  }
  return [...set]
}

async function main() {
  const peopleCsv = path.join(lahmanPath, 'People.csv')
  const battingCsv = path.join(lahmanPath, 'Batting.csv')
  const pitchingCsv = path.join(lahmanPath, 'Pitching.csv')

  console.log(`Loading People.csv from ${peopleCsv}`)
  const people = loadPeople(peopleCsv)

  console.log(`Scanning ${year} batting/pitching for active playerIDs...`)
  let playerIDs = collectActivePlayerIds(battingCsv, pitchingCsv, year)
  if (limit > 0) playerIDs = playerIDs.slice(0, limit)
  console.log(`Found ${playerIDs.length} unique playerIDs for year ${year}`)

  console.log('Upserting players into public.players...')
  await upsertPlayersFromPeople(people, playerIDs)
  console.log('✓ Players upserted')

  console.log('Next: run `npm run seed:ratings` to build player_ratings for this year.')
}

main().catch(err => {
  console.error('❌ Lahman ingest failed:', err)
  process.exit(1)
})
