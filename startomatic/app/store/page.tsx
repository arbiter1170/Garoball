import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StoreView } from '@/components/store/StoreView'

export const dynamic = 'force-dynamic'

export default async function StorePage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

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
                        <Link href="/around-the-horn" className="text-gray-300 hover:text-white">
                            News
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
                        ← Back to Dashboard
                    </Link>
                </div>

                <StoreView />
            </main>
        </div>
    )
}
