import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get team with roster
  const { data: team, error } = await supabase
    .from('teams')
    .select(`
      *,
      owner:profiles!owner_id (id, username, display_name),
      league:leagues (id, name)
    `)
    .eq('id', id)
    .single()

  if (error || !team) {
    notFound()
  }

  // Get roster with player details
  const { data: roster } = await supabase
    .from('rosters')
    .select(`
      *,
      player:players (
        *,
        ratings:player_ratings (*)
      )
    `)
    .eq('team_id', id)
    .eq('is_active', true)
    .order('position')

  const isOwner = team.owner_id === user.id

  // Separate batters and pitchers
  const batters = roster?.filter(r => 
    r.player?.ratings?.some((rat: { rating_type: string }) => rat.rating_type === 'batting')
  ) || []
  const pitchers = roster?.filter(r => 
    r.player?.ratings?.some((rat: { rating_type: string }) => rat.rating_type === 'pitching')
  ) || []

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
          <Link href={`/leagues/${team.league.id}`} className="text-blue-400 hover:text-blue-300">
            ← Back to {team.league.name}
          </Link>
        </div>

        {/* Team Header */}
        <div 
          className="rounded-lg p-6 border border-gray-700 mb-8"
          style={{ backgroundColor: `${team.primary_color}20` }}
        >
          <div className="flex items-center space-x-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white"
              style={{ backgroundColor: team.primary_color }}
            >
              {team.abbreviation}
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {team.city && `${team.city} `}{team.name}
              </h1>
              <p className="text-gray-400 mt-1">
                Owner: {team.owner?.display_name || team.owner?.username || 'Unowned'}
              </p>
              <p className="text-gray-400">
                League: {team.league.name}
              </p>
            </div>
            {isOwner && (
              <div className="ml-auto">
                <Link href={`/teams/${id}/roster`}>
                  <Button>Manage Roster</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Batters */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Batting Lineup</h2>
            
            {batters.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Player</th>
                    <th className="pb-2">Pos</th>
                    <th className="pb-2 text-right">AVG</th>
                    <th className="pb-2 text-right">HR</th>
                  </tr>
                </thead>
                <tbody>
                  {batters.map((entry, idx) => {
                    const rating = entry.player?.ratings?.find(
                      (r: { rating_type: string }) => r.rating_type === 'batting'
                    )
                    const stats = rating?.stats as { avg?: number; hr?: number } | undefined
                    return (
                      <tr key={entry.id} className="border-b border-gray-700/50">
                        <td className="py-2 text-gray-400">{idx + 1}</td>
                        <td className="py-2">
                          {entry.player?.first_name} {entry.player?.last_name}
                        </td>
                        <td className="py-2 text-gray-400">{entry.position || entry.player?.primary_position || '-'}</td>
                        <td className="py-2 text-right">{stats?.avg?.toFixed(3) || '-'}</td>
                        <td className="py-2 text-right">{stats?.hr || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400">No batters on roster.</p>
            )}
          </div>

          {/* Pitchers */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Pitching Staff</h2>
            
            {pitchers.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                    <th className="pb-2">Player</th>
                    <th className="pb-2 text-right">ERA</th>
                    <th className="pb-2 text-right">K</th>
                    <th className="pb-2 text-right">WHIP</th>
                  </tr>
                </thead>
                <tbody>
                  {pitchers.map((entry) => {
                    const rating = entry.player?.ratings?.find(
                      (r: { rating_type: string }) => r.rating_type === 'pitching'
                    )
                    const stats = rating?.stats as { era?: number; so?: number; whip?: number } | undefined
                    return (
                      <tr key={entry.id} className="border-b border-gray-700/50">
                        <td className="py-2">
                          {entry.player?.first_name} {entry.player?.last_name}
                        </td>
                        <td className="py-2 text-right">{stats?.era?.toFixed(2) || '-'}</td>
                        <td className="py-2 text-right">{stats?.so || '-'}</td>
                        <td className="py-2 text-right">{stats?.whip?.toFixed(2) || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400">No pitchers on roster.</p>
            )}
          </div>
        </div>

        {/* Empty Roster Message */}
        {roster?.length === 0 && (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <p className="text-gray-400 text-lg mb-4">This team doesn&apos;t have any players yet.</p>
            {isOwner && (
              <Link href={`/teams/${id}/roster`}>
                <Button>Build Your Roster</Button>
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
