import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { RosterManager } from './RosterManager'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ManageRosterPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get team with league
    const { data: team, error } = await supabase
        .from('teams')
        .select(`
      *,
      league:leagues (id, name)
    `)
        .eq('id', id)
        .single()

    if (error || !team) {
        notFound()
    }

    // Check ownership
    if (team.owner_id !== user.id) {
        redirect(`/teams/${id}`)
    }

    // Get current roster
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

    // Get season for player ratings year
    const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id, year')
        .eq('league_id', team.league_id)
        .eq('status', 'active')
        .single()

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <Link href="/dashboard" className="text-2xl font-bold">
                        ⚾ Garoball
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <Link href={`/teams/${id}`} className="text-blue-400 hover:text-blue-300">
                        ← Back to {team.city && `${team.city} `}{team.name}
                    </Link>
                </div>

                {/* Page Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Manage Roster</h1>
                        <p className="text-gray-400 mt-1">
                            {team.city && `${team.city} `}{team.name} • {team.league.name}
                        </p>
                    </div>
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                        style={{ backgroundColor: team.primary_color }}
                    >
                        {team.abbreviation}
                    </div>
                </div>

                {/* Roster Manager Component */}
                <RosterManager
                    teamId={id}
                    initialRoster={roster || []}
                    seasonYear={activeSeason?.year || new Date().getFullYear()}
                />
            </main>
        </div>
    )
}
