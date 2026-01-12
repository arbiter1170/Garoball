import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/store - Get available store items
export async function GET() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get store items
    const { data: items, error } = await supabase
        .from('store_items')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get user's credits
    const { data: credits } = await supabase
        .from('manager_credits')
        .select('credits')
        .eq('user_id', user.id)
        .single()

    // Get user's purchases (to show what they own)
    const { data: purchases } = await supabase
        .from('user_purchases')
        .select('item_id, quantity')
        .eq('user_id', user.id)

    const purchaseMap = new Map<string, number>()
    purchases?.forEach(p => {
        purchaseMap.set(p.item_id, (purchaseMap.get(p.item_id) || 0) + p.quantity)
    })

    const itemsWithOwnership = items?.map(item => ({
        ...item,
        owned: purchaseMap.get(item.id) || 0
    }))

    return NextResponse.json({
        items: itemsWithOwnership || [],
        userCredits: credits?.credits || 0
    })
}

// POST /api/store - Purchase an item
export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId } = body

    if (!itemId) {
        return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    // Get the item
    const { data: item, error: itemError } = await supabase
        .from('store_items')
        .select('*')
        .eq('id', itemId)
        .eq('is_active', true)
        .single()

    if (itemError || !item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Get user's credits
    const { data: userCredits, error: creditsError } = await supabase
        .from('manager_credits')
        .select('credits')
        .eq('user_id', user.id)
        .single()

    if (creditsError) {
        return NextResponse.json({ error: 'Could not fetch credits' }, { status: 500 })
    }

    const currentCredits = userCredits?.credits || 0

    if (currentCredits < item.price) {
        return NextResponse.json({
            error: 'Insufficient credits',
            required: item.price,
            available: currentCredits
        }, { status: 400 })
    }

    // Deduct credits
    const { error: deductError } = await supabase
        .from('manager_credits')
        .update({
            credits: currentCredits - item.price,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

    if (deductError) {
        return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 })
    }

    // Record purchase
    const { error: purchaseError } = await supabase
        .from('user_purchases')
        .insert({
            user_id: user.id,
            item_id: itemId,
            quantity: 1,
            credits_spent: item.price
        })

    if (purchaseError) {
        // Rollback credits
        await supabase
            .from('manager_credits')
            .update({ credits: currentCredits })
            .eq('user_id', user.id)

        return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 })
    }

    // Create news event for purchase
    await supabase.rpc('create_news_event', {
        p_user_id: user.id,
        p_type: 'achievement',
        p_category: 'system',
        p_headline: `Purchased: ${item.name}`,
        p_body: `You spent ${item.price} credits on ${item.name}.`,
        p_metadata: { item_id: itemId, price: item.price }
    })

    return NextResponse.json({
        success: true,
        item: item.name,
        newBalance: currentCredits - item.price
    })
}
