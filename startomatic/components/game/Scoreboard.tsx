'use client'

import type { Game } from '@/types'

interface ScoreboardProps {
  game: Game
}

export function Scoreboard({ game }: ScoreboardProps) {
  const homeTeam = (game as unknown as { home_team?: { name: string; abbreviation: string; primary_color: string } }).home_team
  const awayTeam = (game as unknown as { away_team?: { name: string; abbreviation: string; primary_color: string } }).away_team
  
  // Generate inning headers
  const totalInnings = Math.max(9, game.inning)
  const innings = Array.from({ length: totalInnings }, (_, i) => i + 1)
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6 overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="text-gray-400 text-sm">
            <th className="text-left py-2 px-3 w-32">Team</th>
            {innings.map((inning) => (
              <th key={inning} className="text-center py-2 px-2 w-8">{inning}</th>
            ))}
            <th className="text-center py-2 px-3 w-12 border-l border-gray-700">R</th>
            <th className="text-center py-2 px-3 w-12">H</th>
            <th className="text-center py-2 px-3 w-12">E</th>
          </tr>
        </thead>
        <tbody>
          {/* Away Team */}
          <tr className="border-t border-gray-700">
            <td className="py-3 px-3">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: awayTeam?.primary_color || '#666' }}
                >
                  {awayTeam?.abbreviation?.[0] || 'A'}
                </div>
                <span className="font-medium">{awayTeam?.abbreviation || 'AWAY'}</span>
              </div>
            </td>
            {innings.map((inning) => (
              <td key={inning} className="text-center py-3 px-2 text-sm">
                {game.box_score.away.innings[inning - 1] ?? (
                  inning < game.inning || (inning === game.inning && game.half === 'bottom')
                    ? '0' 
                    : '-'
                )}
              </td>
            ))}
            <td className="text-center py-3 px-3 font-bold text-lg border-l border-gray-700">
              {game.away_score}
            </td>
            <td className="text-center py-3 px-3">{game.box_score.away.hits}</td>
            <td className="text-center py-3 px-3">{game.box_score.away.errors}</td>
          </tr>
          
          {/* Home Team */}
          <tr className="border-t border-gray-700">
            <td className="py-3 px-3">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: homeTeam?.primary_color || '#666' }}
                >
                  {homeTeam?.abbreviation?.[0] || 'H'}
                </div>
                <span className="font-medium">{homeTeam?.abbreviation || 'HOME'}</span>
              </div>
            </td>
            {innings.map((inning) => (
              <td key={inning} className="text-center py-3 px-2 text-sm">
                {game.box_score.home.innings[inning - 1] ?? (
                  inning < game.inning 
                    ? '0' 
                    : '-'
                )}
              </td>
            ))}
            <td className="text-center py-3 px-3 font-bold text-lg border-l border-gray-700">
              {game.home_score}
            </td>
            <td className="text-center py-3 px-3">{game.box_score.home.hits}</td>
            <td className="text-center py-3 px-3">{game.box_score.home.errors}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
