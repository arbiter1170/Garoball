// API route for games
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/games - List games (with filters)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('season_id')
    const teamId = searchParams.get('team_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('games')
      .select(`
        *,
        home_team:teams!home_team_id (id, name, abbreviation, primary_color),
        away_team:teams!away_team_id (id, name, abbreviation, primary_color)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (seasonId) {
      query = query.eq('season_id', seasonId)
    }

    if (teamId) {
      query = query.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: games, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ games })
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/games - Create a new game
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      season_id,
      home_team_id,
      away_team_id,
      home_lineup,
      away_lineup,
      home_pitcher_id,
      away_pitcher_id,
      game_number = 1
    } = body

    // Validate required fields
    if (!season_id || !home_team_id || !away_team_id) {
      return NextResponse.json(
        { error: 'Season and team IDs are required' }, 
        { status: 400 }
      )
    }

    if (!home_lineup?.length || !away_lineup?.length) {
      return NextResponse.json(
        { error: 'Lineups are required' }, 
        { status: 400 }
      )
    }

    if (!home_pitcher_id || !away_pitcher_id) {
      return NextResponse.json(
        { error: 'Starting pitchers are required' }, 
        { status: 400 }
      )
    }

    // Generate seed for deterministic simulation
    const seed = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15)

    // Initialize empty box score
    const homeBatting: Record<string, unknown> = {}
    const awayBatting: Record<string, unknown> = {}
    home_lineup.forEach((id: string) => {
      homeBatting[id] = { ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, '2b': 0, '3b': 0, hr: 0 }
    })
    away_lineup.forEach((id: string) => {
      awayBatting[id] = { ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, '2b': 0, '3b': 0, hr: 0 }
    })

    const boxScore = {
      home: {
        innings: [],
        hits: 0,
        errors: 0,
        batting: homeBatting,
        pitching: {
          [home_pitcher_id]: { ip_outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0 }
        }
      },
      away: {
        innings: [],
        hits: 0,
        errors: 0,
        batting: awayBatting,
        pitching: {
          [away_pitcher_id]: { ip_outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0 }
        }
      }
    }

    const { data: game, error } = await supabase
      .from('games')
      .insert({
        season_id,
        home_team_id,
        away_team_id,
        game_number,
        status: 'scheduled',
        inning: 1,
        half: 'top',
        outs: 0,
        home_score: 0,
        away_score: 0,
        runner_1b: null,
        runner_2b: null,
        runner_3b: null,
        current_batter_idx: 0,
        current_pitcher_id: home_pitcher_id,
        pitcher_outs: 0,
        home_lineup,
        away_lineup,
        home_pitchers: [home_pitcher_id],
        away_pitchers: [away_pitcher_id],
        seed,
        rng_state: { callCount: 0 },
        box_score: boxScore
      })
      .select(`
        *,
        home_team:teams!home_team_id (id, name, abbreviation),
        away_team:teams!away_team_id (id, name, abbreviation)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ game }, { status: 201 })
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
