import { Player, PlayerRating, DiceTableRanges, BattingStats, PitchingStats } from '@/types'
import { DiceTable } from './DiceTable'

interface PlayerCardProps {
  player: Player
  rating: PlayerRating
  type: 'batter' | 'pitcher'
  diceTable?: DiceTableRanges
  className?: string
}

export function PlayerCard({ player, rating, type, diceTable, className = '' }: PlayerCardProps) {
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

  return (
    <div className={`bg-[#f3f0e6] text-gray-900 rounded-lg overflow-hidden shadow-lg border border-gray-300 font-sans ${className}`}>
      {/* Header */}
      <div className="bg-[#1e3a8a] text-white p-2 px-3 flex justify-between items-center">
        <div className="font-bold text-lg truncate">
          {player.first_name} {player.last_name}
        </div>
        <div className="text-sm font-mono opacity-80">
          {player.primary_position || (isBatter ? 'DH' : 'P')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4">
        {isBatter ? (
          <>
            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">PA</div>
                <div className="font-bold text-lg">{stats.pa}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">AVG</div>
                <div className="font-bold text-lg">{fmtAvg(stats.avg)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">HR</div>
                <div className="font-bold text-lg">{stats.hr}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">K%</div>
                <div className="font-bold text-lg">{fmtPct(stats.k_pct)}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">BABIP</div>
                <div className="font-bold">{fmtAvg(stats.babip)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">OBP</div>
                <div className="font-bold">{fmtAvg((stats.h + stats.bb) / (stats.pa || 1))}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">SLG</div>
                <div className="font-bold">{fmtAvg(stats.slg)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase font-bold">ISO</div>
                <div className="font-bold">{fmtAvg(stats.iso)}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center mb-2">
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold">IP</div>
              <div className="font-bold text-xl">{ip}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold">ERA</div>
              <div className="font-bold text-xl">{fmtEra(era)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold">K%</div>
              <div className="font-bold text-xl">{fmtPct(rating.p_k)}</div>
            </div>
          </div>
        )}

        {/* Dice Table (Batter only usually) */}
        {diceTable && (
          <div className="mt-4">
            <DiceTable ranges={diceTable} />
          </div>
        )}
      </div>
    </div>
  )
}
