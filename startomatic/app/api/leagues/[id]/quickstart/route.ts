import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initializeGame } from '@/lib/simulation'

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
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
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (league.commissioner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure an active season.
    const { data: seasons, error: seasonsError } = await supabase
      .from('seasons')
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })

    if (seasonsError) {
      return NextResponse.json({ error: seasonsError.message }, { status: 500 })
    }

    let activeSeason = seasons?.find(s => s.status === 'active')

    if (!activeSeason) {
      const currentYear = new Date().getFullYear()
      const { data: season, error: seasonError } = await supabase
        .from('seasons')
        .insert({
          league_id: leagueId,
          name: `${league.name} Season 1`,
          year: currentYear,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single()

      if (seasonError || !season) {
        return NextResponse.json({ error: seasonError?.message || 'Failed to create season' }, { status: 500 })
      }

      activeSeason = season
    }

    // Ensure at least 2 teams.
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: true })

    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 500 })
    }

    const existingTeams = teams || []

    const createTeam = async (payload: {
      name: string
      abbreviation: string
      city?: string | null
      owner_id?: string | null
    }) => {
      const { data: team, error } = await supabase
        .from('teams')
        .insert({
          league_id: leagueId,
          owner_id: payload.owner_id ?? null,
          name: payload.name,
          abbreviation: payload.abbreviation,
          city: payload.city ?? null,
        })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return team
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

    const pickPlayers = async () => {
      const { data: battingRatings, error: batErr } = await supabase
        .from('player_ratings')
        .select('player_id')
        .eq('year', seasonYear)
        .eq('rating_type', 'batting')
        .limit(2000)

      if (batErr) throw new Error(batErr.message)

      const { data: pitchingRatings, error: pitErr } = await supabase
        .from('player_ratings')
        .select('player_id')
        .eq('year', seasonYear)
        .eq('rating_type', 'pitching')
        .limit(2000)

      if (pitErr) throw new Error(pitErr.message)

      const batIds = uniq((battingRatings || []).map(r => r.player_id as string)).filter(Boolean)
      const pitIds = uniq((pitchingRatings || []).map(r => r.player_id as string)).filter(Boolean)

      if (batIds.length < 18 || pitIds.length < 2) {
        throw new Error(
          'Not enough player ratings found for this season year. Run Lahman seeding / ratings build first.'
        )
      }

      // Deterministic-ish pick: take the first N unique IDs.
      const homeLineup = batIds.slice(0, 9)
      const awayLineup = batIds.slice(9, 18)
      const homePitcherId = pitIds[0]
      const awayPitcherId = pitIds[1]

      return { homeLineup, awayLineup, homePitcherId, awayPitcherId }
    }

    const { homeLineup, awayLineup, homePitcherId, awayPitcherId } = await pickPlayers()

    const rosterRows = [
      ...homeLineup.map(playerId => ({
        team_id: homeTeam.id,
        season_id: activeSeason.id,
        player_id: playerId,
        is_active: true,
      })),
      ...awayLineup.map(playerId => ({
        team_id: awayTeam.id,
        season_id: activeSeason.id,
        player_id: playerId,
        is_active: true,
      })),
      {
        team_id: homeTeam.id,
        season_id: activeSeason.id,
        player_id: homePitcherId,
        is_active: true,
      },
      {
        team_id: awayTeam.id,
        season_id: activeSeason.id,
        player_id: awayPitcherId,
        is_active: true,
      },
    ]

    // Best-effort: upsert roster rows (unique(team_id, season_id, player_id)).
    const { error: rosterError } = await supabase
      .from('rosters')
      .upsert(rosterRows, { onConflict: 'team_id,season_id,player_id' })

    if (rosterError) {
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

    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert(payload)
      .select('*')
      .single()

    if (gameError || !game) {
      return NextResponse.json({ error: gameError?.message || 'Failed to create game' }, { status: 500 })
    }

    return NextResponse.json({
      season: activeSeason,
      home_team: homeTeam,
      away_team: awayTeam,
      game,
    })
  } catch (error) {
    console.error('Error quickstarting league:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
