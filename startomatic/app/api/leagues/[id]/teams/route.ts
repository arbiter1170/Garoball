// API route for teams in a league
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/leagues/[id]/teams - List teams in league
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

    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        *,
        owner:profiles!owner_id (id, username, display_name, avatar_url)
      `)
      .eq('league_id', id)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/leagues/[id]/teams - Create a team in league
export async function POST(
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
    const { 
      name, 
      abbreviation, 
      city,
      owner_id,
      primary_color = '#1a365d',
      secondary_color = '#e53e3e'
    } = body

    if (!name || !abbreviation) {
      return NextResponse.json(
        { error: 'Team name and abbreviation are required' }, 
        { status: 400 }
      )
    }

    // Determine requested owner.
    // Default behavior: team is owned by the creating user.
    // Commissioner may optionally create an unowned team (owner_id = null) or assign ownership.
    const requestedOwnerId: string | null = owner_id === undefined ? user.id : owner_id

    if (requestedOwnerId !== user.id) {
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('commissioner_id')
        .eq('id', id)
        .single()

      if (leagueError) {
        return NextResponse.json({ error: leagueError.message }, { status: 500 })
      }

      if (!league || league.commissioner_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // If the team will be owned by the current user, enforce one-team-per-user per league.
    if (requestedOwnerId === user.id) {
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('league_id', id)
        .eq('owner_id', user.id)
        .single()

      if (existingTeam) {
        return NextResponse.json(
          { error: 'You already have a team in this league' },
          { status: 400 }
        )
      }
    }

    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        league_id: id,
        owner_id: requestedOwnerId,
        name: name.trim(),
        abbreviation: abbreviation.toUpperCase().substring(0, 3),
        city: city?.trim() || null,
        primary_color,
        secondary_color
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ team }, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
