'use client'

import type { Game, Player, PlayerRating, PlayerBattingLine, PlayerPitchingLine } from '@/types'

interface BoxScoreProps {
  game: Game
  players: Map<string, Player>
  ratings: Map<string, PlayerRating>
}

export function BoxScore({ game, players }: BoxScoreProps) {
  const homeTeam = (game as unknown as { home_team?: { name: string; abbreviation: string } }).home_team
  const awayTeam = (game as unknown as { away_team?: { name: string; abbreviation: string } }).away_team

  const formatIP = (outs: number) => {
    const innings = Math.floor(outs / 3)
    const remainder = outs % 3
    return remainder === 0 ? `${innings}.0` : `${innings}.${remainder}`
  }

  const renderBattingTable = (
    lineup: string[], 
    boxScore: Record<string, PlayerBattingLine>,
    teamName: string
  ) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-3">{teamName} Batting</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 px-2">Player</th>
              <th className="text-center py-2 px-2">AB</th>
              <th className="text-center py-2 px-2">R</th>
              <th className="text-center py-2 px-2">H</th>
              <th className="text-center py-2 px-2">RBI</th>
              <th className="text-center py-2 px-2">BB</th>
              <th className="text-center py-2 px-2">SO</th>
              <th className="text-center py-2 px-2">2B</th>
              <th className="text-center py-2 px-2">3B</th>
              <th className="text-center py-2 px-2">HR</th>
            </tr>
          </thead>
          <tbody>
            {lineup.map((playerId, idx) => {
              const player = players.get(playerId)
              const line = boxScore[playerId] || { ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, '2b': 0, '3b': 0, hr: 0 }
              
              return (
                <tr key={playerId} className="border-b border-gray-700/50">
                  <td className="py-2 px-2">
                    <span className="text-gray-500 mr-2">{idx + 1}.</span>
                    {player ? `${player.first_name} ${player.last_name}` : 'Unknown'}
                  </td>
                  <td className="text-center py-2 px-2">{line.ab}</td>
                  <td className="text-center py-2 px-2">{line.r}</td>
                  <td className="text-center py-2 px-2">{line.h}</td>
                  <td className="text-center py-2 px-2">{line.rbi}</td>
                  <td className="text-center py-2 px-2">{line.bb}</td>
                  <td className="text-center py-2 px-2">{line.so}</td>
                  <td className="text-center py-2 px-2">{line['2b']}</td>
                  <td className="text-center py-2 px-2">{line['3b']}</td>
                  <td className="text-center py-2 px-2">{line.hr}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold border-t border-gray-600">
              <td className="py-2 px-2">Totals</td>
              <td className="text-center py-2 px-2">
                {Object.values(boxScore).reduce((sum, l) => sum + l.ab, 0)}
              </td>
              <td className="text-center py-2 px-2">
                {Object.values(boxScore).reduce((sum, l) => sum + l.r, 0)}
              </td>
              <td className="text-center py-2 px-2">
                {Object.values(boxScore).reduce((sum, l) => sum + l.h, 0)}
              </td>
              <td className="text-center py-2 px-2">
                {Object.values(boxScore).reduce((sum, l) => sum + l.rbi, 0)}
              </td>
              <td className="text-center py-2 px-2">
                {Object.values(boxScore).reduce((sum, l) => sum + l.bb, 0)}
              </td>
              <td className="text-center py-2 px-2">
                {Object.values(boxScore).reduce((sum, l) => sum + l.so, 0)}
              </td>
              <td className="text-center py-2 px-2">
                {Object.values(boxScore).reduce((sum, l) => sum + l['2b'], 0)}
              </td>
              <td className="text-center py-2 px-2">
                {Object.values(boxScore).reduce((sum, l) => sum + l['3b'], 0)}
              </td>
              <td className="text-center py-2 px-2">
                {Object.values(boxScore).reduce((sum, l) => sum + l.hr, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )

  const renderPitchingTable = (
    pitcherIds: string[],
    boxScore: Record<string, PlayerPitchingLine>,
    teamName: string
  ) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-3">{teamName} Pitching</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 px-2">Pitcher</th>
              <th className="text-center py-2 px-2">IP</th>
              <th className="text-center py-2 px-2">H</th>
              <th className="text-center py-2 px-2">R</th>
              <th className="text-center py-2 px-2">ER</th>
              <th className="text-center py-2 px-2">BB</th>
              <th className="text-center py-2 px-2">SO</th>
              <th className="text-center py-2 px-2">HR</th>
            </tr>
          </thead>
          <tbody>
            {pitcherIds.map((pitcherId) => {
              const player = players.get(pitcherId)
              const line = boxScore[pitcherId] || { ip_outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0 }
              
              return (
                <tr key={pitcherId} className="border-b border-gray-700/50">
                  <td className="py-2 px-2">
                    {player ? `${player.first_name} ${player.last_name}` : 'Unknown'}
                  </td>
                  <td className="text-center py-2 px-2">{formatIP(line.ip_outs)}</td>
                  <td className="text-center py-2 px-2">{line.h}</td>
                  <td className="text-center py-2 px-2">{line.r}</td>
                  <td className="text-center py-2 px-2">{line.er}</td>
                  <td className="text-center py-2 px-2">{line.bb}</td>
                  <td className="text-center py-2 px-2">{line.so}</td>
                  <td className="text-center py-2 px-2">{line.hr}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Away Team */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        {renderBattingTable(
          game.away_lineup,
          game.box_score.away.batting,
          awayTeam?.name || 'Away'
        )}
        {renderPitchingTable(
          game.away_pitchers,
          game.box_score.away.pitching,
          awayTeam?.name || 'Away'
        )}
      </div>

      {/* Home Team */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        {renderBattingTable(
          game.home_lineup,
          game.box_score.home.batting,
          homeTeam?.name || 'Home'
        )}
        {renderPitchingTable(
          game.home_pitchers,
          game.box_score.home.pitching,
          homeTeam?.name || 'Home'
        )}
      </div>
    </div>
  )
}
