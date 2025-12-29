import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'

export default async function LeaguesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get all leagues with team count
  const { data: leagues } = await supabase
    .from('leagues')
    .select(`
      *,
      commissioner:profiles!commissioner_id (id, username, display_name),
      teams (id)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold">
            ⚾ Garoball
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/leagues" className="text-white font-medium">
              Leagues
            </Link>
            <Link href="/mlb" className="text-gray-300 hover:text-white">
              MLB
            </Link>
            <Link href="/glossary" className="text-gray-300 hover:text-white">
              Glossary
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Leagues</h1>
          <Link href="/leagues/new">
            <Button>Create League</Button>
          </Link>
        </div>

        {leagues && leagues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues.map((league) => (
              <Link
                key={league.id}
                href={`/leagues/${league.id}`}
                className="block bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-500 transition"
              >
                <h2 className="text-xl font-semibold mb-2">{league.name}</h2>
                <div className="text-gray-400 text-sm space-y-1">
                  <p>Commissioner: {league.commissioner?.display_name || league.commissioner?.username || 'Unknown'}</p>
                  <p>{league.teams?.length || 0} teams</p>
                  <p>Created: {new Date(league.created_at).toLocaleDateString()}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {league.settings?.dh_enabled && (
                    <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">DH</span>
                  )}
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                    {league.settings?.innings_per_game || 9} innings
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">No leagues found.</p>
            <Link href="/leagues/new">
              <Button>Create the first league</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
