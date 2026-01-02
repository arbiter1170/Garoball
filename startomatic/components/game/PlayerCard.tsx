import { Player, PlayerRating, DiceTableRanges, BattingStats, PitchingStats } from '@/types'
import { DiceTable } from './DiceTable'

interface PlayerCardProps {
  player: Player
  rating: PlayerRating
  type: 'batter' | 'pitcher'
  diceTable?: DiceTableRanges
  mlbTeam?: string | null
  className?: string
  teamColor?: string // Primary team color (hex)
  teamSecondaryColor?: string // Secondary team color (hex)
}

export function PlayerCard({ player, rating, type, diceTable, mlbTeam, className = '', teamColor, teamSecondaryColor }: PlayerCardProps) {
  const isBatter = type === 'batter'
  const stats = rating.stats as (BattingStats & PitchingStats) // Union for easier access

  // Helper to format percentage
  const fmtPct = (val: number) => (val * 100).toFixed(0) + '%'
  const fmtAvg = (val: number) => val.toFixed(3).replace(/^0/, '')
  const fmtEra = (val: number) => val.toFixed(2)

  // Calculate derived stats if needed
  const ip = isBatter ? 0 : Math.floor(stats.ip_outs / 3) + (stats.ip_outs % 3) / 10
  const era = isBatter ? 0 : (stats.era || 0)
  const k_rate = isBatter ? stats.k_pct : (stats.so / (stats.ip_outs + stats.h + stats.bb)) // Approx for pitcher

  // Use team color or default dark blue
  const headerBgColor = teamColor || '#1e3a8a'
  const headerBorderColor = teamSecondaryColor || teamColor || '#1e3a8a'

  return (
    <div className={`bg-gray-800 text-white rounded-lg overflow-hidden shadow-lg border border-gray-700 font-sans ${className}`}>
      {/* Header with team color */}
      <div 
        className="text-white p-2 px-3 flex justify-between items-center"
        style={{ 
          backgroundColor: headerBgColor,
          borderBottom: `3px solid ${headerBorderColor}`
        }}
      >
        <div className="font-bold text-lg truncate">
          {player.first_name} {player.last_name}
        </div>
        <div className="text-right leading-tight">
          <div className="text-sm font-mono opacity-90">
            {player.primary_position || (isBatter ? 'DH' : 'P')}
          </div>
          {mlbTeam ? (
            <div className="text-xs font-mono opacity-80">{mlbTeam}</div>
          ) : null}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4">
        {isBatter ? (
          <>
            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              <div>
                <div className="text-xs text-gray-400 uppercase font-bold">PA</div>
                <div className="font-bold text-lg text-white">{stats.pa}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase font-bold">AVG</div>
                <div className="font-bold text-lg text-white">{fmtAvg(stats.avg)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase font-bold">HR</div>
                <div className="font-bold text-lg text-white">{stats.hr}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase font-bold">K%</div>
                <div className="font-bold text-lg text-white">{fmtPct(stats.k_pct)}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              <div>
                <div className="text-xs text-gray-400 uppercase font-bold">BABIP</div>
                <div className="font-bold text-gray-300">{fmtAvg(stats.babip)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase font-bold">OBP</div>
                <div className="font-bold text-gray-300">{fmtAvg((stats.h + stats.bb) / (stats.pa || 1))}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase font-bold">SLG</div>
                <div className="font-bold text-gray-300">{fmtAvg(stats.slg)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase font-bold">ISO</div>
                <div className="font-bold text-gray-300">{fmtAvg(stats.iso)}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center mb-2">
            <div>
              <div className="text-xs text-gray-400 uppercase font-bold">IP</div>
              <div className="font-bold text-xl text-white">{ip}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-bold">ERA</div>
              <div className="font-bold text-xl text-white">{fmtEra(era)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-bold">K%</div>
              <div className="font-bold text-xl text-white">{fmtPct(rating.p_k)}</div>
            </div>
          </div>
        )}

        {/* Dice Table (Batter only usually) */}
        {(diceTable || rating.dice_table?.length) && (
          <div className="mt-4">
            <DiceTable ranges={diceTable} table={rating.dice_table} />
          </div>
        )}
      </div>
    </div>
  )
}
