import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs'
import { parse } from 'csv-parse/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getLahmanPath() {
  return (
    process.env.LAHMAN_PATH ||
    path.resolve(process.cwd(), '..', 'lahman_1871-2024u_csv')
  )
}

function readCsv(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, 'utf8')
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[]
}

const n = (v: string | undefined) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

// GET /api/mlb/roster?year=2024&teamID=BOS
// Uses Lahman Appearances.csv + People.csv to return a roster-ish list.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const year = Number(searchParams.get('year') || '')
    const teamID = (searchParams.get('teamID') || '').trim()

    if (!Number.isFinite(year) || year < 1871 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }
    if (!teamID) {
      return NextResponse.json({ error: 'teamID is required' }, { status: 400 })
    }

    const lahmanPath = getLahmanPath()
    const appearancesPath = path.join(lahmanPath, 'Appearances.csv')
    const peoplePath = path.join(lahmanPath, 'People.csv')

    const appearances = readCsv(appearancesPath)
    const people = readCsv(peoplePath)

    const peopleById = new Map<string, { first_name: string; last_name: string }>()
    for (const p of people) {
      const playerID = (p.playerID || '').trim()
      if (!playerID) continue
      peopleById.set(playerID, {
        first_name: p.nameFirst || '',
        last_name: p.nameLast || '',
      })
    }

    const rosterRows = appearances
      .filter(r => Number(r.yearID) === year && (r.teamID || '').trim() === teamID)
      .map(r => {
        const playerID = (r.playerID || '').trim()
        const gAll = n(r.G_all)
        const gP = n(r.G_p)
        const g1b = n(r.G_1b)
        const g2b = n(r.G_2b)
        const g3b = n(r.G_3b)
        const gSS = n(r.G_ss)
        const gOF = n(r.G_of)
        const gC = n(r.G_c)
        const gLF = n(r.G_lf)
        const gCF = n(r.G_cf)
        const gRF = n(r.G_rf)

        // Crude "primary" position by max games.
        const posCandidates: Array<[string, number]> = [
          ['P', gP],
          ['C', gC],
          ['1B', g1b],
          ['2B', g2b],
          ['3B', g3b],
          ['SS', gSS],
          ['LF', gLF],
          ['CF', gCF],
          ['RF', gRF],
          ['OF', gOF],
        ]
        posCandidates.sort((a, b) => b[1] - a[1])
        const primaryPos = posCandidates[0]?.[1] > 0 ? posCandidates[0][0] : ''

        const name = peopleById.get(playerID)
        return {
          playerID,
          first_name: name?.first_name || '',
          last_name: name?.last_name || '',
          primary_position: primaryPos,
          games: gAll,
        }
      })
      .filter(r => r.playerID && r.games > 0)
      .sort((a, b) => b.games - a.games)
      .slice(0, 60)

    return NextResponse.json({ roster: rosterRows })
  } catch (error) {
    console.error('Error loading MLB roster:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
