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

    // Get game with teams
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!home_team_id (*),
        away_team:teams!away_team_id (*)
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

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .in('id', allPlayerIds)

    const { data: ratings } = await supabase
      .from('player_ratings')
      .select('*')
      .in('player_id', allPlayerIds)

    return NextResponse.json({ 
      game, 
      plays: plays || [],
      players: players || [],
      ratings: ratings || []
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
