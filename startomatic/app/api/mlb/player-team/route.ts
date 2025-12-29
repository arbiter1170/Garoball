import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs'
import { parse } from 'csv-parse/sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getLahmanPath() {
  return process.env.LAHMAN_PATH || path.resolve(process.cwd(), '..', 'lahman_1871-2024u_csv')
}

function readCsv(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, 'utf8')
  return parse(raw, { columns: true, skip_empty_lines: true }) as Record<string, string>[]
}

const n = (v: string | undefined) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

// GET /api/mlb/player-team?year=2024&playerID=xxxxxx
// Returns: { teamID: string | null }
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const year = Number(searchParams.get('year') || '')
    const playerID = (searchParams.get('playerID') || '').trim()

    if (!Number.isFinite(year) || year < 1871 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    if (!playerID) {
      return NextResponse.json({ error: 'playerID is required' }, { status: 400 })
    }

    const appearancesPath = path.join(getLahmanPath(), 'Appearances.csv')
    const appearances = readCsv(appearancesPath)

    // pick team with max games
    let bestTeam: string | null = null
    let bestGames = -1

    for (const r of appearances) {
      if (Number(r.yearID) !== year) continue
      if ((r.playerID || '').trim() !== playerID) continue
      const teamID = (r.teamID || '').trim()
      if (!teamID) continue
      const games = n(r.G_all)
      if (games > bestGames) {
        bestGames = games
        bestTeam = teamID
      }
    }

    return NextResponse.json({ teamID: bestTeam })
  } catch (error) {
    console.error('Error loading MLB player team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
