// API route for glossary entries
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/glossary - Get all glossary entries
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    let query = supabase
      .from('glossary')
      .select('*')
      .order('term')

    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`term.ilike.%${search}%,abbreviation.ilike.%${search}%,short_description.ilike.%${search}%`)
    }

    const { data: entries, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by category
    const grouped = entries?.reduce((acc, entry) => {
      const cat = entry.category || 'General'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(entry)
      return acc
    }, {} as Record<string, typeof entries>)

    return NextResponse.json({ entries, grouped })
  } catch (error) {
    console.error('Error fetching glossary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
