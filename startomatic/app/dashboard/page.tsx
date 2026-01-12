import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { GlobalHeader } from '@/components/layout/GlobalHeader'
import { ActiveGamesPanel, type ActiveGame } from '@/components/layout/ActiveGamesPanel'

// Force dynamic rendering to avoid static generation at build time
export const dynamic = 'force-dynamic'

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
  let activeGames: unknown[] = []

  if (teamIds.length > 0) {
    const { data: games } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!home_team_id (id, name, abbreviation, primary_color),
        away_team:teams!away_team_id (id, name, abbreviation, primary_color)
      `)
      .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(10)

    recentGames = games || []
    
    // Filter for active games (in_progress status)
    activeGames = (games || []).filter((g: { status: string }) => g.status === 'in_progress')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Global Header */}
      <GlobalHeader 
        user={{ email: user.email || undefined }} 
        profile={profile} 
        unreadNewsCount={0} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        {/* Active Games Panel */}
        <ActiveGamesPanel 
          games={activeGames as ActiveGame[]}
          userTeamIds={teamIds}
        />

        {/* Getting Started Banner - Show for new users */}
        {(!teams || teams.length === 0) && (!ownedLeagues || ownedLeagues.length === 0) && (
          <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-xl p-6 mb-8 border border-blue-600 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-shrink-0 text-5xl">🎮</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to Garoball!</h2>
                <p className="text-blue-200 mb-4">
                  Ready to build your baseball dynasty? Here&apos;s how to get started:
                </p>
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-950/50 rounded-lg p-3 border border-blue-700">
                    <div className="font-bold text-white mb-1">1. Create a League</div>
                    <p className="text-blue-300">Set up your own league with custom rules and settings.</p>
                  </div>
                  <div className="bg-blue-950/50 rounded-lg p-3 border border-blue-700">
                    <div className="font-bold text-white mb-1">2. Add Teams</div>
                    <p className="text-blue-300">Create teams and draft players from MLB history.</p>
                  </div>
                  <div className="bg-blue-950/50 rounded-lg p-3 border border-blue-700">
                    <div className="font-bold text-white mb-1">3. Play Ball!</div>
                    <p className="text-blue-300">Simulate games with dice rolls and watch your team compete.</p>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Link href="/leagues/new">
                  <Button className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 text-lg shadow-lg">
                    🚀 Create Your League
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

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
                            <span className={`text-sm px-2 py-1 rounded ${g.status === 'completed' ? 'bg-green-900 text-green-200' :
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
