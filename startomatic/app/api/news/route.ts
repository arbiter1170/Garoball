import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/news - Get user's news feed
export async function GET(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    let query = supabase
        .from('news_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (unreadOnly) {
        query = query.eq('is_read', false)
    }

    const { data: news, error } = await query

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Count unread
    const { count: unreadCount } = await supabase
        .from('news_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

    return NextResponse.json({
        news: news || [],
        unreadCount: unreadCount || 0
    })
}

// PATCH /api/news - Mark news as read
export async function PATCH(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { newsIds, markAllRead } = body

    if (markAllRead) {
        // Mark all news as read
        const { error } = await supabase
            .from('news_events')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
    } else if (Array.isArray(newsIds) && newsIds.length > 0) {
        // Mark specific news as read
        const { error } = await supabase
            .from('news_events')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .in('id', newsIds)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
    } else {
        return NextResponse.json({ error: 'No news IDs provided' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
}

// POST /api/news - Create a news event (internal use)
export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, category, headline, body: newsBody, metadata } = body

    if (!type || !category || !headline) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
        .from('news_events')
        .insert({
            user_id: user.id,
            type,
            category,
            headline,
            body: newsBody,
            metadata: metadata || {}
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ news: data })
}
