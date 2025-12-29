// API route for leagues CRUD operations
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/leagues - List user's leagues
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get leagues where user is commissioner or has a team
    const { data: leagues, error } = await supabase
      .from('leagues')
      .select(`
        *,
        teams!inner(id, owner_id)
      `)
      .or(`commissioner_id.eq.${user.id},teams.owner_id.eq.${user.id}`)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ leagues })
  } catch (error) {
    console.error('Error fetching leagues:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/leagues - Create a new league
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, settings = {} } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'League name is required' }, { status: 400 })
    }

    const { data: league, error } = await supabase
      .from('leagues')
      .insert({
        name: name.trim(),
        commissioner_id: user.id,
        settings: {
          dh_enabled: settings.dh_enabled ?? true,
          games_per_matchup: settings.games_per_matchup ?? 3,
          innings_per_game: settings.innings_per_game ?? 9,
          ...settings
        }
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ league }, { status: 201 })
  } catch (error) {
    console.error('Error creating league:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
