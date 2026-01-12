import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { QuickStartGame } from './QuickStartGame'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LeagueDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get league with teams and seasons
  const { data: league, error } = await supabase
    .from('leagues')
    .select(`
      *,
      commissioner:profiles!commissioner_id (id, username, display_name),
      teams (
        *,
        owner:profiles!owner_id (id, username, display_name)
      ),
      seasons (*)
    `)
    .eq('id', id)
    .single()

  if (error || !league) {
    notFound()
  }

  const isCommissioner = league.commissioner_id === user.id
  const userTeam = league.teams?.find((t: { owner_id: string }) => t.owner_id === user.id)

  // Get standings for active season
  let standings: unknown[] = []
  const activeSeason = league.seasons?.find((s: { status: string }) => s.status === 'active')

  if (activeSeason) {
    const { data: standingsData } = await supabase
      .from('standings')
      .select(`
        *,
        team:teams (id, name, abbreviation, primary_color)
      `)
      .eq('season_id', activeSeason.id)
      .order('wins', { ascending: false })

    standings = standingsData || []
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
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/leagues" className="text-blue-400 hover:text-blue-300">
            ← Back to Leagues
          </Link>
        </div>

        {/* League Header */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{league.name}</h1>
              <p className="text-gray-400">
                Commissioner: {league.commissioner?.display_name || league.commissioner?.username}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {league.settings?.dh_enabled && (
                  <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">DH Enabled</span>
                )}
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                  {league.settings?.innings_per_game || 9} innings
                </span>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                  {league.teams?.length || 0} teams
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              {!userTeam && (
                <Link href={`/leagues/${id}/join`}>
                  <Button>Join League</Button>
                </Link>
              )}
              {isCommissioner && (
                <Link href={`/leagues/${id}/manage`}>
                  <Button variant="outline">Manage</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Getting Started Banner - Show for commissioners with empty leagues */}
        {isCommissioner && (!league.teams || league.teams.length === 0) && (
          <div className="bg-gradient-to-r from-green-900 via-green-800 to-green-900 rounded-xl p-6 mb-8 border border-green-600 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-shrink-0 text-5xl">⚾</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">Great! Your league is ready!</h2>
                <p className="text-green-200 mb-4">
                  Now let&apos;s get some games going. Choose how you want to start:
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-green-950/50 rounded-lg p-4 border-2 border-green-500">
                    <div className="font-bold text-white text-lg mb-2">⚡ Quick Start (Recommended)</div>
                    <p className="text-green-300 text-sm mb-3">
                      Instantly creates 2 teams with auto-drafted rosters and starts a game. Perfect for trying things out!
                    </p>
                    <QuickStartGame leagueId={id} prominent />
                  </div>
                  <div className="bg-green-950/50 rounded-lg p-4 border border-green-700">
                    <div className="font-bold text-white text-lg mb-2">🛠️ Manual Setup</div>
                    <p className="text-green-300 text-sm mb-3">
                      Create teams, draft specific players, then create a season. More control, more time.
                    </p>
                    <Link href={`/leagues/${id}/teams/new`}>
                      <Button variant="outline" className="w-full border-green-500 text-green-200 hover:bg-green-800">
                        Create Team Manually
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Standings */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">
                {activeSeason ? `${activeSeason.name} Standings` : 'Standings'}
              </h2>

              {standings.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                      <th className="pb-2">Team</th>
                      <th className="pb-2 text-center">W</th>
                      <th className="pb-2 text-center">L</th>
                      <th className="pb-2 text-center">PCT</th>
                      <th className="pb-2 text-center">GB</th>
                      <th className="pb-2 text-center">RS</th>
                      <th className="pb-2 text-center">RA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((standing: unknown, idx: number) => {
                      const s = standing as {
                        id: string
                        wins: number
                        losses: number
                        runs_for: number
                        runs_against: number
                        team: { id: string; name: string; abbreviation: string; primary_color: string }
                      }
                      const pct = s.wins + s.losses > 0
                        ? (s.wins / (s.wins + s.losses)).toFixed(3)
                        : '.000'
                      const leader = standings[0] as typeof s
                      const gb = idx === 0
                        ? '-'
                        : ((leader.wins - s.wins + s.losses - leader.losses) / 2).toFixed(1)

                      return (
                        <tr key={s.id} className="border-b border-gray-700/50">
                          <td className="py-2">
                            <Link href={`/teams/${s.team.id}`} className="flex items-center hover:text-blue-400">
                              <div
                                className="w-4 h-4 rounded-full mr-2"
                                style={{ backgroundColor: s.team.primary_color }}
                              />
                              {s.team.name}
                            </Link>
                          </td>
                          <td className="py-2 text-center">{s.wins}</td>
                          <td className="py-2 text-center">{s.losses}</td>
                          <td className="py-2 text-center">{pct}</td>
                          <td className="py-2 text-center">{gb}</td>
                          <td className="py-2 text-center">{s.runs_for}</td>
                          <td className="py-2 text-center">{s.runs_against}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400">
                  {activeSeason
                    ? 'No games played yet.'
                    : 'No active season. The commissioner needs to start a season.'}
                </p>
              )}
            </div>
          </div>

          {/* Teams List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Teams</h2>

              {league.teams && league.teams.length > 0 ? (
                <div className="space-y-3">
                  {league.teams.map((team: {
                    id: string
                    name: string
                    abbreviation: string
                    primary_color: string
                    owner: { id: string; username: string; display_name: string | null } | null
                  }) => (
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
                          <div className="text-sm text-gray-400">
                            {team.owner?.display_name || team.owner?.username || 'No owner'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No teams yet.</p>
              )}
            </div>

            {isCommissioner && <QuickStartGame leagueId={id} />}

            {/* Seasons */}
            {isCommissioner && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-6">
                <h2 className="text-xl font-semibold mb-4">Seasons</h2>

                {league.seasons && league.seasons.length > 0 ? (
                  <div className="space-y-2">
                    {league.seasons.map((season: { id: string; name: string; status: string; year: number }) => (
                      <div key={season.id} className="p-3 rounded bg-gray-700">
                        <div className="flex justify-between items-center">
                          <span>{season.name}</span>
                          <span className={`text-xs px-2 py-1 rounded ${season.status === 'active' ? 'bg-green-900 text-green-200' :
                              season.status === 'completed' ? 'bg-gray-600 text-gray-300' :
                                'bg-yellow-900 text-yellow-200'
                            }`}>
                            {season.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 mb-4">No seasons yet.</p>
                )}

                <Link href={`/leagues/${id}/seasons/new`} className="block mt-4">
                  <Button variant="outline" className="w-full">Create Season</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
