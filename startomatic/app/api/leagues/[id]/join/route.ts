import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/leagues/[id]/join
// Body: { team_id: string }
// Claims an unowned team in the league for the current user.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const teamId = typeof body?.team_id === 'string' ? body.team_id.trim() : ''

    if (!teamId) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 })
    }

    // Enforce one-team-per-user per league
    const { data: existingTeam, error: existingTeamError } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (existingTeamError) {
      return NextResponse.json({ error: existingTeamError.message }, { status: 500 })
    }

    if (existingTeam) {
      return NextResponse.json(
        { error: 'You already have a team in this league' },
        { status: 400 }
      )
    }

    // Verify the team is in this league and unowned, then claim it.
    const { data: claimedTeam, error: claimError } = await supabase
      .from('teams')
      .update({ owner_id: user.id, updated_at: new Date().toISOString() })
      .eq('id', teamId)
      .eq('league_id', leagueId)
      .is('owner_id', null)
      .select('*')
      .maybeSingle()

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }

    if (!claimedTeam) {
      return NextResponse.json(
        { error: 'Team is no longer available' },
        { status: 409 }
      )
    }

    return NextResponse.json({ team: claimedTeam })
  } catch (error) {
    console.error('Error joining league:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
