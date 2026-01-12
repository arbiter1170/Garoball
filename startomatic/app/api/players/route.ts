// API route for player search and listing
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/players - Search and list players
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const year = searchParams.get('year')
    const position = searchParams.get('position')
    const type = searchParams.get('type') // 'batting' or 'pitching'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('players')
      .select(`
        *,
        ratings:player_ratings (*)
      `, { count: 'exact' })
      .order('last_name')
      .range(offset, offset + limit - 1)

    // Search by name
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    // Filter by position
    if (position) {
      query = query.eq('primary_position', position)
    }

    const { data: players, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter ratings by year and type if specified
    let filteredPlayers = players
    if (year || type) {
      filteredPlayers = players
        ?.map(player => ({
          ...player,
          ratings: player.ratings?.filter((r: { year: number; rating_type: string }) => {
            if (year && r.year !== parseInt(year)) return false
            if (type && r.rating_type !== type) return false
            return true
          })
        }))
        .filter(player => (player.ratings?.length || 0) > 0)
    }

    return NextResponse.json({ 
      players: filteredPlayers,
      total: count,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
