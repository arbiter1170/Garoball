import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateSeasonRatingCounts } from '@/lib/validation'

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

// POST /api/leagues/[id]/seasons - Create a season (commissioner only)
export async function POST(
  request: NextRequest,
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
      .select('id, commissioner_id')
      .eq('id', leagueId)
      .single()

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (league.commissioner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const year = Number(body?.year)

    if (!name) {
      return NextResponse.json({ error: 'Season name is required' }, { status: 400 })
    }

    if (!Number.isFinite(year) || year < 1871 || year > 2100) {
      return NextResponse.json({ error: 'Season year is invalid' }, { status: 400 })
    }

    const [{ data: battingRatings }, { data: pitchingRatings }] = await Promise.all([
      supabase
        .from('player_ratings')
        .select('player_id')
        .eq('year', year)
        .eq('rating_type', 'batting')
        .limit(5000),
      supabase
        .from('player_ratings')
        .select('player_id')
        .eq('year', year)
        .eq('rating_type', 'pitching')
        .limit(5000),
    ])

    const battingCount = uniq((battingRatings || []).map((r: any) => r.player_id as string).filter(Boolean)).length
    const pitchingCount = uniq((pitchingRatings || []).map((r: any) => r.player_id as string).filter(Boolean)).length
    const ratingsCheck = validateSeasonRatingCounts({ battingCount, pitchingCount })

    if (!ratingsCheck.ok) {
      return NextResponse.json(
        { error: ratingsCheck.errors.join(' ') },
        { status: 400 }
      )
    }

    // Keep it simple: creating a season makes it active.
    // Best-effort: mark any existing active seasons as completed.
    await supabase
      .from('seasons')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('league_id', leagueId)
      .eq('status', 'active')

    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .insert({
        league_id: leagueId,
        name,
        year,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (seasonError) {
      return NextResponse.json({ error: seasonError.message }, { status: 500 })
    }

    return NextResponse.json({ season })
  } catch (error) {
    console.error('Error creating season:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
