// API route for team operations
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/teams/[id] - Get team details with roster
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

    const { data: team, error } = await supabase
      .from('teams')
      .select(`
        *,
        owner:profiles!owner_id (id, username, display_name, avatar_url),
        league:leagues (id, name, settings)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/teams/[id] - Update team
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

    // Check if user owns the team
    const { data: team } = await supabase
      .from('teams')
      .select('owner_id, league_id')
      .eq('id', id)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if user is owner or commissioner
    const { data: league } = await supabase
      .from('leagues')
      .select('commissioner_id')
      .eq('id', team.league_id)
      .single()

    if (team.owner_id !== user.id && league?.commissioner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, abbreviation, city, primary_color, secondary_color } = body

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name) updates.name = name.trim()
    if (abbreviation) updates.abbreviation = abbreviation.toUpperCase().substring(0, 3)
    if (city !== undefined) updates.city = city?.trim() || null
    if (primary_color) updates.primary_color = primary_color
    if (secondary_color) updates.secondary_color = secondary_color

    const { data: updatedTeam, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ team: updatedTeam })
  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
