import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/credits - Get current user's credit balance
export async function GET() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create credits record
    let { data: credits, error } = await supabase
        .from('manager_credits')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (error && error.code === 'PGRST116') {
        // No record exists, create one
        const { data: newCredits, error: insertError } = await supabase
            .from('manager_credits')
            .insert({ user_id: user.id, credits: 0, lifetime_credits: 0 })
            .select()
            .single()

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
        credits = newCredits
    } else if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ credits })
}

// POST /api/credits - Award credits to user
export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, reason } = body

    if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Award credits using the helper function
    const { data, error } = await supabase.rpc('award_credits', {
        p_user_id: user.id,
        p_amount: amount
    })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Optionally create a news event for the credit award
    if (reason) {
        await supabase.rpc('create_news_event', {
            p_user_id: user.id,
            p_type: 'achievement',
            p_category: 'system',
            p_headline: `+${amount} Credits Earned!`,
            p_body: reason,
            p_metadata: { amount }
        })
    }

    return NextResponse.json({
        success: true,
        newBalance: data,
        awarded: amount
    })
}
