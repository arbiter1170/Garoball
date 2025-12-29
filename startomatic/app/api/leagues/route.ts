// API route for leagues CRUD operations
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isMissingTableSchemaCacheError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const anyError = error as { code?: unknown; message?: unknown }
  const code = typeof anyError.code === 'string' ? anyError.code : ''
  const message = typeof anyError.message === 'string' ? anyError.message : ''

  // PostgREST: { code: 'PGRST205', message: "Could not find the table 'public.leagues' in the schema cache" }
  return code === 'PGRST205' || /schema cache/i.test(message) || /could not find the table/i.test(message)
}

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
      if (isMissingTableSchemaCacheError(error)) {
        return NextResponse.json(
          {
            error:
              "Database schema is not installed (missing 'public.leagues'). Apply the migrations in startomatic/supabase/migrations to your Supabase project (or run `supabase db reset` locally), then reload the schema cache in Supabase (Settings → API → Reload schema).",
          },
          { status: 500 },
        )
      }
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

    // Ensure a profile row exists for this user to satisfy FK commissioner_id -> profiles(id)
    const { data: profiles, error: profileSelectError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)

    if (!profiles || profiles.length === 0) {
      const { error: profileInsertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: user.id,
          display_name: (user as any).email ?? null,
          avatar_url: null,
        })

      if (profileInsertError) {
        return NextResponse.json(
          {
            error:
              'Could not create user profile required for leagues. Please ensure your account has a profile row in public.profiles with id = your user id.',
          },
          { status: 500 },
        )
      }
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
      if (isMissingTableSchemaCacheError(error)) {
        return NextResponse.json(
          {
            error:
              "Database schema is not installed (missing 'public.leagues'). Apply the migrations in startomatic/supabase/migrations to your Supabase project (or run `supabase db reset` locally), then reload the schema cache in Supabase (Settings → API → Reload schema).",
          },
          { status: 500 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ league }, { status: 201 })
  } catch (error) {
    console.error('Error creating league:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
