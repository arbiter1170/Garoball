// API route for team roster management
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/teams/[id]/roster - Get team roster
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

    // Get roster with player details and ratings
    const { data: roster, error } = await supabase
      .from('rosters')
      .select(`
        *,
        player:players (
          *,
          ratings:player_ratings (*)
        )
      `)
      .eq('team_id', id)
      .eq('is_active', true)
      .order('position')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ roster })
  } catch (error) {
    console.error('Error fetching roster:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/teams/[id]/roster - Add player to roster
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

    // Check if user owns the team
    const { data: team } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (!team || team.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { player_id, position, jersey_number, season_id } = body

    if (!player_id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    // Check if player is already on roster
    const { data: existing } = await supabase
      .from('rosters')
      .select('id')
      .eq('team_id', id)
      .eq('player_id', player_id)
      .eq('is_active', true)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Player is already on roster' }, 
        { status: 400 }
      )
    }

    const { data: rosterEntry, error } = await supabase
      .from('rosters')
      .insert({
        team_id: id,
        player_id,
        position: position || null,
        jersey_number: jersey_number || null,
        season_id: season_id || null,
        is_active: true
      })
      .select(`
        *,
        player:players (*)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ roster: rosterEntry }, { status: 201 })
  } catch (error) {
    console.error('Error adding to roster:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/teams/[id]/roster - Remove player from roster
export async function DELETE(
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

    // Check if user owns the team
    const { data: team } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (!team || team.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('player_id')

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    // Soft delete - mark as inactive
    const { error } = await supabase
      .from('rosters')
      .update({ is_active: false })
      .eq('team_id', id)
      .eq('player_id', playerId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from roster:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
