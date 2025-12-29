import { DiceTableRanges, Outcome } from '@/types'
import { codeToOutcome } from '@/lib/probabilities'

interface DiceTableProps {
  ranges?: DiceTableRanges
  table?: number[]
}

const OUTCOME_COLORS: Record<Outcome, string> = {
  'K': 'bg-red-200 text-red-900',
  'BB': 'bg-blue-200 text-blue-900',
  'OUT': 'bg-red-200 text-red-900',
  '1B': 'bg-green-200 text-green-900',
  '2B': 'bg-green-300 text-green-900',
  '3B': 'bg-yellow-200 text-yellow-900',
  'HR': 'bg-red-300 text-red-900',
}

const OUTCOME_LABELS: Record<Outcome, string> = {
  'K': 'K',
  'BB': 'BB',
  'OUT': 'OUT',
  '1B': '1B',
  '2B': '2B',
  '3B': '3B',
  'HR': 'HR',
}

export function DiceTable({ ranges, table }: DiceTableProps) {
  const resolvedRanges: DiceTableRanges | undefined = (() => {
    if (ranges) return ranges
    if (!table || table.length === 0) return undefined

    // `player_ratings.dice_table` is stored as integer codes (Outcome-order indexed).
    // Convert to per-outcome [start,end] ranges in dice-index space (0-15).
    const init: Record<Outcome, [number, number]> = {
      K: [Number.POSITIVE_INFINITY, -1],
      BB: [Number.POSITIVE_INFINITY, -1],
      OUT: [Number.POSITIVE_INFINITY, -1],
      '1B': [Number.POSITIVE_INFINITY, -1],
      '2B': [Number.POSITIVE_INFINITY, -1],
      '3B': [Number.POSITIVE_INFINITY, -1],
      HR: [Number.POSITIVE_INFINITY, -1],
    }

    for (let i = 0; i < table.length; i++) {
      const outcome = codeToOutcome(table[i])
      const [min, max] = init[outcome]
      init[outcome] = [Math.min(min, i), Math.max(max, i)]
    }

    const toRange = (o: Outcome): [number, number] => {
      const [min, max] = init[o]
      return [Number.isFinite(min) ? min : 0, max]
    }

    return {
      K: toRange('K'),
      BB: toRange('BB'),
      OUT: toRange('OUT'),
      '1B': toRange('1B'),
      '2B': toRange('2B'),
      '3B': toRange('3B'),
      HR: toRange('HR'),
    }
  })()

  if (!resolvedRanges) return null

  // We want to display the ranges in a specific order or just iterate through them.
  // The concept art shows a grid.
  // Let's flatten the ranges into a list of { range, outcome } and sort by start of range.
  const rangeList = Object.entries(resolvedRanges)
    .map(([outcome, range]) => ({
      outcome: outcome as Outcome,
      start: range[0],
      end: range[1]
    }))
    .filter(item => item.start <= item.end) // Filter out empty ranges
    .sort((a, b) => a.start - b.start)

  // We want to display this in a grid, maybe 2 columns like the concept art.
  // 3-8: K   9-11: 1B
  // ...
  
  return (
    <div className="border border-gray-400 rounded overflow-hidden text-sm">
      <div className="bg-gray-100 p-1 text-center font-semibold border-b border-gray-400 text-gray-800">
        Dice Table
      </div>
      <div className="grid grid-cols-2 bg-white">
        {rangeList.map((item, idx) => (
          <div 
            key={item.outcome} 
            className={`flex border-b border-r border-gray-300 last:border-b-0 ${idx % 2 === 1 ? 'border-r-0' : ''}`}
          >
            <div className="w-16 p-1 pl-2 bg-gray-50 text-gray-700 font-mono text-xs flex items-center">
              {item.start === item.end ? item.start + 3 : `${item.start + 3}-${item.end + 3}`}:
            </div>
            <div className={`flex-1 p-1 text-center font-bold ${OUTCOME_COLORS[item.outcome]}`}>
              {OUTCOME_LABELS[item.outcome]}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
