import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NewsFeed } from '@/components/around-the-horn/NewsFeed'
import { CreditsDisplay } from '@/components/around-the-horn/CreditsDisplay'

export const dynamic = 'force-dynamic'

export default async function AroundTheHornPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get user's stats for display
    const { data: credits } = await supabase
        .from('manager_credits')
        .select('credits, lifetime_credits')
        .eq('user_id', user.id)
        .single()

    const { count: totalNews } = await supabase
        .from('news_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <Link href="/dashboard" className="text-2xl font-bold">
                        ⚾ Garoball
                    </Link>
                    <nav className="flex items-center space-x-4">
                        <Link href="/dashboard" className="text-gray-300 hover:text-white">
                            Dashboard
                        </Link>
                        <Link href="/store" className="text-gray-300 hover:text-white">
                            Store
                        </Link>
                        <CreditsDisplay />
                    </nav>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">📰 Around the Horn</h1>
                    <p className="text-gray-400">
                        Stay up to date with news, events, and milestones from your baseball empire.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-3xl mb-1">💰</div>
                        <div className="text-2xl font-bold text-yellow-400">
                            {credits?.credits?.toLocaleString() ?? 0}
                        </div>
                        <div className="text-sm text-gray-400">Current Credits</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-3xl mb-1">⭐</div>
                        <div className="text-2xl font-bold text-blue-400">
                            {credits?.lifetime_credits?.toLocaleString() ?? 0}
                        </div>
                        <div className="text-sm text-gray-400">Lifetime Credits Earned</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="text-3xl mb-1">📰</div>
                        <div className="text-2xl font-bold text-green-400">
                            {totalNews ?? 0}
                        </div>
                        <div className="text-sm text-gray-400">Total News Events</div>
                    </div>
                </div>

                {/* News Feed */}
                <NewsFeed limit={50} />
            </main>
        </div>
    )
}
