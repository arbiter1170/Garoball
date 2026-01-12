'use client'

import Link from 'next/link'

export interface ActiveGame {
    id: string
    status: string
    inning: number
    half: 'top' | 'bottom'
    outs: number
    home_score: number
    away_score: number
    home_team: { id: string; name: string; abbreviation: string; primary_color?: string }
    away_team: { id: string; name: string; abbreviation: string; primary_color?: string }
    userTeamId?: string
}

interface ActiveGamesPanelProps {
    games: ActiveGame[]
    userTeamIds: string[]
}

export function ActiveGamesPanel({ games, userTeamIds }: ActiveGamesPanelProps) {
    // games are already filtered by the parent component
    if (games.length === 0) {
        return null
    }

    return (
        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl p-4 mb-6 border border-yellow-600/50">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🎮</span>
                <h2 className="text-lg font-bold text-yellow-200">Active Games</h2>
                <span className="bg-yellow-600 text-yellow-100 text-xs font-bold px-2 py-0.5 rounded-full">
                    {games.length} LIVE
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {games.map(game => {
                    const isUserHome = userTeamIds.includes(game.home_team.id)
                    const isUserAway = userTeamIds.includes(game.away_team.id)
                    const userTeam = isUserHome ? game.home_team : (isUserAway ? game.away_team : null)

                    return (
                        <Link
                            key={game.id}
                            href={`/games/${game.id}`}
                            className="bg-gray-800/80 rounded-lg p-3 border border-gray-600 hover:border-yellow-500 transition group"
                        >
                            {/* Game Status */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                                    <span className="text-xs text-yellow-300 font-medium">
                                        {game.half === 'top' ? 'Top' : 'Bot'} {game.inning} • {game.outs} out{game.outs !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Scoreboard */}
                            <div className="space-y-1 mb-3">
                                <div className={`flex justify-between items-center ${isUserAway ? 'bg-blue-900/30 rounded px-2 py-1 -mx-2' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        {isUserAway && <span className="text-xs">👤</span>}
                                        <span className={`font-medium ${isUserAway ? 'text-blue-200' : 'text-gray-300'}`}>
                                            {game.away_team.abbreviation}
                                        </span>
                                    </div>
                                    <span className="font-bold text-lg">{game.away_score}</span>
                                </div>
                                <div className={`flex justify-between items-center ${isUserHome ? 'bg-blue-900/30 rounded px-2 py-1 -mx-2' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        {isUserHome && <span className="text-xs">👤</span>}
                                        <span className={`font-medium ${isUserHome ? 'text-blue-200' : 'text-gray-300'}`}>
                                            {game.home_team.abbreviation}
                                        </span>
                                    </div>
                                    <span className="font-bold text-lg">{game.home_score}</span>
                                </div>
                            </div>

                            {/* Your Team Indicator */}
                            {userTeam && (
                                <div className="text-xs text-gray-400 mb-2">
                                    Your team: <span className="text-blue-300 font-medium">{userTeam.name}</span>
                                </div>
                            )}

                            {/* Resume Button */}
                            <div className="flex justify-end">
                                <span className="text-sm text-green-400 group-hover:text-green-300 font-medium">
                                    Continue →
                                </span>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
