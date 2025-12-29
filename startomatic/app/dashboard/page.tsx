import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get user's teams with their leagues
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      *,
      league:leagues (id, name)
    `)
    .eq('owner_id', user.id)

  // Get leagues where user is commissioner
  const { data: ownedLeagues } = await supabase
    .from('leagues')
    .select('*')
    .eq('commissioner_id', user.id)

  // Get recent games for user's teams
  const teamIds = teams?.map(t => t.id) || []
  let recentGames: unknown[] = []
  
  if (teamIds.length > 0) {
    const { data: games } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!home_team_id (id, name, abbreviation),
        away_team:teams!away_team_id (id, name, abbreviation)
      `)
      .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(5)
    
    recentGames = games || []
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
            <Link href="/leagues" className="text-gray-300 hover:text-white">
              Leagues
            </Link>
            <Link href="/glossary" className="text-gray-300 hover:text-white">
              Glossary
            </Link>
            <span className="text-gray-400">|</span>
            <span className="text-gray-300">{profile?.display_name || profile?.username || user.email}</span>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                Sign Out
              </Button>
            </form>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link href="/leagues/new" className="block">
                  <Button className="w-full">Create New League</Button>
                </Link>
                <Link href="/leagues" className="block">
                  <Button variant="outline" className="w-full">Browse Leagues</Button>
                </Link>
              </div>
            </div>

            {/* My Teams */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-6">
              <h2 className="text-xl font-semibold mb-4">My Teams</h2>
              {teams && teams.length > 0 ? (
                <div className="space-y-3">
                  {teams.map((team) => (
                    <Link 
                      key={team.id} 
                      href={`/teams/${team.id}`}
                      className="block p-3 rounded bg-gray-700 hover:bg-gray-600 transition"
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: team.primary_color }}
                        >
                          {team.abbreviation?.[0] || team.name[0]}
                        </div>
                        <div>
                          <div className="font-medium">{team.name}</div>
                          <div className="text-sm text-gray-400">{team.league?.name}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">You don&apos;t have any teams yet.</p>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Recent Games */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Recent Games</h2>
              {recentGames.length > 0 ? (
                <div className="space-y-3">
                  {recentGames.map((game: unknown) => {
                    const g = game as {
                      id: string
                      status: string
                      home_score: number
                      away_score: number
                      home_team: { id: string; name: string; abbreviation: string }
                      away_team: { id: string; name: string; abbreviation: string }
                      created_at: string
                    }
                    return (
                      <Link
                        key={g.id}
                        href={`/games/${g.id}`}
                        className="block p-4 rounded bg-gray-700 hover:bg-gray-600 transition"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span>{g.away_team.abbreviation}</span>
                              <span className="font-bold">{g.away_score}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>{g.home_team.abbreviation}</span>
                              <span className="font-bold">{g.home_score}</span>
                            </div>
                          </div>
                          <div className="ml-4 text-right">
                            <span className={`text-sm px-2 py-1 rounded ${
                              g.status === 'completed' ? 'bg-green-900 text-green-200' :
                              g.status === 'in_progress' ? 'bg-yellow-900 text-yellow-200' :
                              'bg-gray-600 text-gray-300'
                            }`}>
                              {g.status === 'completed' ? 'Final' :
                               g.status === 'in_progress' ? 'Live' : 'Scheduled'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-400">No recent games.</p>
              )}
            </div>

            {/* My Leagues */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-6">
              <h2 className="text-xl font-semibold mb-4">Leagues I Commissioner</h2>
              {ownedLeagues && ownedLeagues.length > 0 ? (
                <div className="space-y-3">
                  {ownedLeagues.map((league) => (
                    <Link
                      key={league.id}
                      href={`/leagues/${league.id}`}
                      className="block p-4 rounded bg-gray-700 hover:bg-gray-600 transition"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{league.name}</div>
                          <div className="text-sm text-gray-400">
                            Created {new Date(league.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <span className="text-blue-400">Manage →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">You haven&apos;t created any leagues yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
