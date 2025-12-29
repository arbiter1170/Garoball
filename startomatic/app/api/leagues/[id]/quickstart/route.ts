import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initializeGame } from '@/lib/simulation'

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

function newId(): string {
  // Node 18+ / modern runtimes
  return crypto.randomUUID()
}

async function getCandidateYears(supabase: any, preferredYear?: number): Promise<number[]> {
  const years: number[] = []
  if (Number.isFinite(preferredYear)) years.push(preferredYear as number)

  // Pull a small window of recent years from ratings (may include duplicates).
  const { data } = await supabase
    .from('player_ratings')
    .select('year')
    .order('year', { ascending: false })
    .limit(500)

  const yearsFromRatings: number[] = (data || [])
    .map((r: any) => Number(r.year))
    .filter((y: number) => Number.isFinite(y))

  const fromRatings = uniq(yearsFromRatings)

  return uniq([...years, ...fromRatings])
}

async function findPlayableYear(supabase: any, preferredYear?: number): Promise<number | null> {
  const years = await getCandidateYears(supabase, preferredYear)

  for (const year of years) {
    const [{ data: bat }, { data: pit }] = await Promise.all([
      supabase
        .from('player_ratings')
        .select('player_id')
        .eq('year', year)
        .eq('rating_type', 'batting')
        .limit(3000),
      supabase
        .from('player_ratings')
        .select('player_id')
        .eq('year', year)
        .eq('rating_type', 'pitching')
        .limit(3000),
    ])

    const batIds = uniq((bat || []).map((r: any) => r.player_id as string)).filter(Boolean)
    const pitIds = uniq((pit || []).map((r: any) => r.player_id as string)).filter(Boolean)

    if (batIds.length >= 18 && pitIds.length >= 2) return year
  }

  return null
}

// POST /api/leagues/[id]/quickstart
// Commissioner-only: ensure an active season + 2 teams + basic rosters, then create a game.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, commissioner_id, name')
      .eq('id', leagueId)
      .single()

    if (leagueError || !league) {
      if (leagueError) console.error('Quickstart: league fetch error', leagueError)
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (league.commissioner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Find most relevant season (if any).
    const { data: seasons, error: seasonsError } = await supabase
      .from('seasons')
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })

    if (seasonsError) {
      console.error('Quickstart: seasons fetch error', seasonsError)
      return NextResponse.json({ error: seasonsError.message }, { status: 500 })
    }

    let activeSeason = seasons?.find((s: any) => s.status === 'active')

    // Choose a year that actually has enough ratings to play.
    const preferredYear = activeSeason?.year ?? new Date().getFullYear()
    const playableYear = await findPlayableYear(supabase, Number(preferredYear))
    if (!playableYear) {
      return NextResponse.json(
        {
          error:
            'Not enough player ratings found for any recent year. Run Lahman seeding/ratings build first (e.g. LAHMAN_YEAR=2024 npm run seed:ratings).',
        },
        { status: 400 }
      )
    }

    if (!activeSeason) {
      const seasonId = newId()
      const seasonPayload = {
        id: seasonId,
        league_id: leagueId,
        name: `${league.name} Season 1`,
        year: playableYear,
        status: 'active',
        updated_at: new Date().toISOString(),
      }

      const { error: seasonError } = await supabase
        .from('seasons')
        .insert(seasonPayload)

      if (seasonError) {
        if (seasonError) console.error('Quickstart: season create error', seasonError)
        return NextResponse.json({ error: seasonError?.message || 'Failed to create season' }, { status: 500 })
      }

      activeSeason = seasonPayload
    } else if (Number(activeSeason.year) !== playableYear) {
      const { error: updateError } = await supabase
        .from('seasons')
        .update({ year: playableYear, updated_at: new Date().toISOString() })
        .eq('id', activeSeason.id)

      if (updateError) console.error('Quickstart: season year update error', updateError)
      if (!updateError) activeSeason = { ...activeSeason, year: playableYear }
    }

    // Ensure at least 2 teams.
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: true })

    if (teamsError) {
      console.error('Quickstart: teams fetch error', teamsError)
      return NextResponse.json({ error: teamsError.message }, { status: 500 })
    }

    const existingTeams = teams || []

    const createTeam = async (payload: {
      name: string
      abbreviation: string
      city?: string | null
      owner_id?: string | null
    }) => {
      const teamId = newId()
      const teamPayload = {
        id: teamId,
        league_id: leagueId,
        owner_id: payload.owner_id ?? null,
        name: payload.name,
        abbreviation: payload.abbreviation,
        city: payload.city ?? null,
      }

      const { error } = await supabase
        .from('teams')
        .insert(teamPayload)

      if (error) throw new Error(error.message)
      return teamPayload
    }

    let homeTeam = existingTeams[0]
    let awayTeam = existingTeams[1]

    if (!homeTeam) {
      homeTeam = await createTeam({
        name: 'Home',
        abbreviation: 'HME',
        owner_id: user.id,
      })
    }

    if (!awayTeam) {
      // Leave unowned so commissioner can create both.
      // If HME exists already, keep away abbreviation distinct.
      const awayAbbr = homeTeam.abbreviation === 'AWY' ? 'VIS' : 'AWY'
      awayTeam = await createTeam({
        name: 'Away',
        abbreviation: awayAbbr,
        owner_id: null,
      })
    }

    // Build simple rosters for the active season (9 batters + 1 pitcher each).
    const seasonYear = Number(activeSeason.year)

    const [{ data: battingRatings, error: batErr }, { data: pitchingRatings, error: pitErr }] = await Promise.all([
      supabase
        .from('player_ratings')
        .select('player_id')
        .eq('year', seasonYear)
        .eq('rating_type', 'batting')
        .limit(5000),
      supabase
        .from('player_ratings')
        .select('player_id')
        .eq('year', seasonYear)
        .eq('rating_type', 'pitching')
        .limit(5000),
    ])

    if (batErr) throw new Error(batErr.message)
    if (pitErr) throw new Error(pitErr.message)

    const batIds = uniq((battingRatings || []).map((r: any) => r.player_id as string)).filter(Boolean)
    const pitIds = uniq((pitchingRatings || []).map((r: any) => r.player_id as string)).filter(Boolean)

    if (batIds.length < 18 || pitIds.length < 2) {
      return NextResponse.json(
        {
          error: `Not enough player ratings found for season year ${seasonYear}. Run Lahman seeding/ratings build for that year (e.g. LAHMAN_YEAR=${seasonYear} npm run seed:ratings).`,
        },
        { status: 400 }
      )
    }

    // Deterministic-ish pick: take the first N unique IDs.
    const homePitcherId = pitIds[0]
    const awayPitcherId = pitIds[1]

    const eligibleBatIds = batIds.filter(id => id !== homePitcherId && id !== awayPitcherId)
    if (eligibleBatIds.length < 18) {
      return NextResponse.json(
        {
          error: `Not enough distinct batting ratings found for season year ${seasonYear} after selecting pitchers. Try rebuilding ratings for that year.`,
        },
        { status: 400 }
      )
    }

    const homeLineup = eligibleBatIds.slice(0, 9)
    const awayLineup = eligibleBatIds.slice(9, 18)

    const homeRosterIds = uniq([...homeLineup, homePitcherId])
    const awayRosterIds = uniq([...awayLineup, awayPitcherId])

    const rosterRows = [
      ...homeRosterIds.map(playerId => ({
        team_id: homeTeam.id,
        season_id: activeSeason.id,
        player_id: playerId,
        is_active: true,
      })),
      ...awayRosterIds.map(playerId => ({
        team_id: awayTeam.id,
        season_id: activeSeason.id,
        player_id: playerId,
        is_active: true,
      })),
    ]

    // Best-effort: upsert roster rows (unique(team_id, season_id, player_id)).
    const { error: rosterError } = await supabase
      .from('rosters')
      .upsert(rosterRows, { onConflict: 'team_id,season_id,player_id' })

    if (rosterError) {
      console.error('Quickstart: roster upsert error', rosterError)
      return NextResponse.json({ error: rosterError.message }, { status: 500 })
    }

    // Create a new scheduled game.
    const payload = initializeGame(
      activeSeason.id,
      homeTeam.id,
      awayTeam.id,
      homeLineup,
      awayLineup,
      homePitcherId,
      awayPitcherId,
      1
    )

    const gameId = newId()
    ;(payload as any).id = gameId

    const { error: gameError } = await supabase
      .from('games')
      .insert(payload)

    if (gameError) {
      if (gameError) console.error('Quickstart: game create error', gameError)
      return NextResponse.json({ error: gameError?.message || 'Failed to create game' }, { status: 500 })
    }

    return NextResponse.json({
      season: activeSeason,
      home_team: homeTeam,
      away_team: awayTeam,
      game: { id: gameId },
    })
  } catch (error) {
    console.error('Error quickstarting league:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
