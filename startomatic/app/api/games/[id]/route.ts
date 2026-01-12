// API route for single game operations
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/games/[id] - Get game details with plays
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get game with teams (including league info)
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!home_team_id (*, league:leagues (id, name)),
        away_team:teams!away_team_id (*, league:leagues (id, name))
      `)
      .eq('id', id)
      .single()

    if (gameError) {
      if (gameError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 })
      }
      return NextResponse.json({ error: gameError.message }, { status: 500 })
    }

    // Get plays for this game
    const { data: plays, error: playsError } = await supabase
      .from('plays')
      .select(`
        *,
        batter:players!batter_id (id, first_name, last_name),
        pitcher:players!pitcher_id (id, first_name, last_name)
      `)
      .eq('game_id', id)
      .order('play_number', { ascending: true })

    if (playsError) {
      console.error('Error fetching plays:', playsError)
    }

    // Get player details for lineup
    const allPlayerIds = [
      ...game.home_lineup,
      ...game.away_lineup,
      ...game.home_pitchers,
      ...game.away_pitchers
    ]

    const batterIds = [...game.home_lineup, ...game.away_lineup]
    const pitcherIds = [...game.home_pitchers, ...game.away_pitchers]

    const { data: season } = await supabase
      .from('seasons')
      .select('year')
      .eq('id', game.season_id)
      .single()

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .in('id', allPlayerIds)

    const seasonYear = season?.year
    let ratings: unknown[] = []
    if (seasonYear) {
      const [{ data: bat }, { data: pit }] = await Promise.all([
        supabase
          .from('player_ratings')
          .select('*')
          .eq('year', seasonYear)
          .eq('rating_type', 'batting')
          .in('player_id', batterIds),
        supabase
          .from('player_ratings')
          .select('*')
          .eq('year', seasonYear)
          .eq('rating_type', 'pitching')
          .in('player_id', pitcherIds),
      ])
      ratings = [...(bat || []), ...(pit || [])]
    } else {
      const { data: fallback } = await supabase
        .from('player_ratings')
        .select('*')
        .in('player_id', allPlayerIds)
      ratings = fallback || []
    }

    // Determine which team the user owns (if any)
    let userTeamId: string | null = null
    if (game.home_team?.owner_id === user.id) {
      userTeamId = game.home_team.id
    } else if (game.away_team?.owner_id === user.id) {
      userTeamId = game.away_team.id
    }

    return NextResponse.json({ 
      game, 
      plays: plays || [],
      players: players || [],
      ratings,
      season_year: seasonYear || null,
      userTeamId
    })
  } catch (error) {
    console.error('Error fetching game:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/games/[id] - Update game state
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data: game, error } = await supabase
      .from('games')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ game })
  } catch (error) {
    console.error('Error updating game:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
