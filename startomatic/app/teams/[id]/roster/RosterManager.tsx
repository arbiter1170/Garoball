'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface RosterEntry {
    id: string
    player_id: string
    position: string | null
    player: {
        id: string
        first_name: string
        last_name: string
        primary_position: string | null
        ratings: Array<{
            rating_type: string
            stats: Record<string, unknown>
        }>
    }
}

interface RosterManagerProps {
    teamId: string
    initialRoster: RosterEntry[]
    seasonYear: number
}

export function RosterManager({ teamId, initialRoster, seasonYear }: RosterManagerProps) {
    const router = useRouter()
    const [roster, setRoster] = useState<RosterEntry[]>(initialRoster)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Array<{
        id: string
        first_name: string
        last_name: string
        primary_position: string | null
    }>>([])
    const [searching, setSearching] = useState(false)
    const [adding, setAdding] = useState<string | null>(null)
    const [removing, setRemoving] = useState<string | null>(null)

    const searchPlayers = async () => {
        if (!searchQuery.trim()) return

        setSearching(true)
        try {
            const res = await fetch(`/api/players/search?q=${encodeURIComponent(searchQuery)}&year=${seasonYear}`)
            if (res.ok) {
                const data = await res.json()
                setSearchResults(data.players || [])
            }
        } catch (error) {
            console.error('Search failed:', error)
        } finally {
            setSearching(false)
        }
    }

    const addPlayer = async (playerId: string) => {
        setAdding(playerId)
        try {
            const res = await fetch(`/api/teams/${teamId}/roster`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_id: playerId })
            })

            if (res.ok) {
                router.refresh()
                // Remove from search results
                setSearchResults(prev => prev.filter(p => p.id !== playerId))
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to add player')
            }
        } catch (error) {
            console.error('Add failed:', error)
        } finally {
            setAdding(null)
        }
    }

    const removePlayer = async (rosterId: string) => {
        if (!confirm('Remove this player from your roster?')) return

        setRemoving(rosterId)
        try {
            const res = await fetch(`/api/teams/${teamId}/roster/${rosterId}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                setRoster(prev => prev.filter(r => r.id !== rosterId))
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to remove player')
            }
        } catch (error) {
            console.error('Remove failed:', error)
        } finally {
            setRemoving(null)
        }
    }

    const batters = roster.filter(r =>
        r.player?.ratings?.some(rat => rat.rating_type === 'batting')
    )
    const pitchers = roster.filter(r =>
        r.player?.ratings?.some(rat => rat.rating_type === 'pitching')
    )

    return (
        <div className="space-y-8">
            {/* Search for Players */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-semibold mb-4">🔍 Add Players</h2>
                <div className="flex gap-2 mb-4">
                    <Input
                        type="text"
                        placeholder="Search by player name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchPlayers()}
                        className="flex-1"
                    />
                    <Button onClick={searchPlayers} disabled={searching}>
                        {searching ? 'Searching...' : 'Search'}
                    </Button>
                </div>

                {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {searchResults.map(player => (
                            <div
                                key={player.id}
                                className="flex items-center justify-between bg-gray-700/50 rounded p-3"
                            >
                                <div>
                                    <span className="font-medium">{player.first_name} {player.last_name}</span>
                                    {player.primary_position && (
                                        <span className="text-gray-400 ml-2 text-sm">({player.primary_position})</span>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => addPlayer(player.id)}
                                    disabled={adding === player.id}
                                >
                                    {adding === player.id ? 'Adding...' : 'Add'}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {searchResults.length === 0 && searchQuery && !searching && (
                    <p className="text-gray-400 text-sm">No players found. Try a different search.</p>
                )}
            </div>

            {/* Current Roster */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Batters */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">⚾ Batters ({batters.length})</h2>
                    {batters.length > 0 ? (
                        <div className="space-y-2">
                            {batters.map(entry => (
                                <div
                                    key={entry.id}
                                    className="flex items-center justify-between bg-gray-700/30 rounded p-3"
                                >
                                    <div>
                                        <span className="font-medium">
                                            {entry.player?.first_name} {entry.player?.last_name}
                                        </span>
                                        <span className="text-gray-400 ml-2 text-sm">
                                            {entry.position || entry.player?.primary_position || '-'}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removePlayer(entry.id)}
                                        disabled={removing === entry.id}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                    >
                                        {removing === entry.id ? '...' : '✕'}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400">No batters on roster.</p>
                    )}
                </div>

                {/* Pitchers */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4">🎯 Pitchers ({pitchers.length})</h2>
                    {pitchers.length > 0 ? (
                        <div className="space-y-2">
                            {pitchers.map(entry => (
                                <div
                                    key={entry.id}
                                    className="flex items-center justify-between bg-gray-700/30 rounded p-3"
                                >
                                    <div>
                                        <span className="font-medium">
                                            {entry.player?.first_name} {entry.player?.last_name}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removePlayer(entry.id)}
                                        disabled={removing === entry.id}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                    >
                                        {removing === entry.id ? '...' : '✕'}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400">No pitchers on roster.</p>
                    )}
                </div>
            </div>

            {/* Help Text */}
            <div className="text-center text-gray-400 text-sm">
                <p>Need 9 batters and at least 1 pitcher to play a game.</p>
                <p>You have {batters.length} batters and {pitchers.length} pitchers.</p>
            </div>
        </div>
    )
}
