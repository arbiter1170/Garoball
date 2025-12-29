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
      primary_color = '#1a365d',
      secondary_color = '#e53e3e'
    } = body

    if (!name || !abbreviation) {
      return NextResponse.json(
        { error: 'Team name and abbreviation are required' }, 
        { status: 400 }
      )
    }

    // Check if user already has a team in this league
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

    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        league_id: id,
        owner_id: user.id,
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
