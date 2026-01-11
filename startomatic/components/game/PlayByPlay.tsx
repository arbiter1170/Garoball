'use client'

import type { Play, Player } from '@/types'

interface PlayByPlayProps {
  plays: Play[]
  players: Map<string, Player>
}

export function PlayByPlay({ plays, players }: PlayByPlayProps) {
  // Group plays by inning
  const playsByInning = plays.reduce((acc, play) => {
    const key = `${play.half}-${play.inning}`
    if (!acc[key]) {
      acc[key] = {
        inning: play.inning,
        half: play.half,
        plays: []
      }
    }
    acc[key].plays.push(play)
    return acc
  }, {} as Record<string, { inning: number; half: string; plays: Play[] }>)

  const innings = Object.values(playsByInning).sort((a, b) => {
    if (a.inning !== b.inning) return a.inning - b.inning
    return a.half === 'top' ? -1 : 1
  })

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'HR': return 'text-purple-400'
      case '3B': return 'text-blue-400'
      case '2B': return 'text-green-400'
      case '1B': return 'text-green-300'
      case 'BB': return 'text-yellow-400'
      case 'K': return 'text-red-400'
      case 'OUT': return 'text-gray-400'
      default: return 'text-white'
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-xl font-semibold mb-6">Play-by-Play</h2>

      {innings.length === 0 ? (
        <p className="text-gray-400">No plays recorded yet.</p>
      ) : (
        <div className="space-y-6">
          {innings.map((inningData) => (
            <div key={`${inningData.half}-${inningData.inning}`}>
              <div className="sticky top-0 bg-gray-800 py-2 border-b border-gray-700 mb-3">
                <h3 className="font-semibold text-gray-300">
                  {inningData.half === 'top' ? '▲' : '▼'} Inning {inningData.inning}
                </h3>
              </div>

              <div className="space-y-2">
                {inningData.plays.map((play, idx) => {
                  const batter = players.get(play.batter_id)
                  const pitcher = players.get(play.pitcher_id)

                  return (
                    <div
                      key={play.id || idx}
                      className="flex items-start space-x-4 p-3 bg-gray-700/50 rounded"
                    >
                      {/* Dice */}
                      <div className="text-xs sm:text-sm text-gray-500 font-mono w-12 sm:w-16 flex-shrink-0">
                        [{play.dice_values.join('-')}]
                      </div>

                      {/* Play description */}
                      <div className="flex-1">
                        <div>
                          <span className="font-medium">
                            {batter ? `${batter.first_name} ${batter.last_name}` : 'Unknown'}
                          </span>
                          {' '}
                          <span className={getOutcomeColor(play.outcome)}>
                            {play.explanation}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          vs {pitcher ? `${pitcher.first_name} ${pitcher.last_name}` : 'Unknown'}
                          {play.runs_scored > 0 && (
                            <span className="ml-2 text-green-400">
                              +{play.runs_scored} run{play.runs_scored > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Outcome badge */}
                      <div className={`text-sm font-bold px-2 py-1 rounded ${play.outcome === 'HR' ? 'bg-purple-900 text-purple-200' :
                          play.outcome === '3B' ? 'bg-blue-900 text-blue-200' :
                            play.outcome === '2B' ? 'bg-green-900 text-green-200' :
                              play.outcome === '1B' ? 'bg-green-800 text-green-200' :
                                play.outcome === 'BB' ? 'bg-yellow-900 text-yellow-200' :
                                  play.outcome === 'K' ? 'bg-red-900 text-red-200' :
                                    'bg-gray-600 text-gray-200'
                        }`}>
                        {play.outcome}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
