import Link from 'next/link'

interface TeamContextBadgeProps {
    team: {
        id: string
        name: string
        abbreviation: string
        city?: string | null
        primary_color?: string
    }
    league: {
        id: string
        name: string
    }
    record?: {
        wins: number
        losses: number
    }
    showBackLink?: boolean
}

export function TeamContextBadge({ team, league, record, showBackLink = true }: TeamContextBadgeProps) {
    const winPct = record ? (record.wins / (record.wins + record.losses) || 0).toFixed(3) : null

    return (
        <div
            className="bg-gray-800/80 rounded-lg p-3 border border-gray-600 mb-4"
            style={{ borderLeftColor: team.primary_color, borderLeftWidth: '4px' }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Team Logo/Abbrev */}
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: team.primary_color || '#4b5563' }}
                    >
                        {team.abbreviation}
                    </div>

                    {/* Team Info */}
                    <div>
                        <div className="font-semibold text-white">
                            {team.city && `${team.city} `}{team.name}
                        </div>
                        <div className="text-xs text-gray-400">
                            {league.name}
                            {record && (
                                <span className="ml-2 text-gray-300">
                                    {record.wins}-{record.losses} ({winPct})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Back Link */}
                {showBackLink && (
                    <Link
                        href={`/teams/${team.id}`}
                        className="text-sm text-blue-400 hover:text-blue-300"
                    >
                        Team Page →
                    </Link>
                )}
            </div>
        </div>
    )
}
