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

// GET /api/mlb/teams?year=2024
// Returns a list of Lahman Teams.csv entries for that year.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const year = Number(searchParams.get('year') || '')

    if (!Number.isFinite(year) || year < 1871 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    const teamsPath = path.join(getLahmanPath(), 'Teams.csv')
    const rows = readCsv(teamsPath)

    const teams = rows
      .filter(r => Number(r.yearID) === year)
      .map(r => ({
        year: Number(r.yearID),
        lgID: r.lgID,
        teamID: r.teamID,
        franchID: r.franchID,
        name: r.name,
        abbr: (r.teamID || '').toUpperCase(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Error loading MLB teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
