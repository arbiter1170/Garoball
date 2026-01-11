'use client'

import type { Player } from '@/types'

interface DiamondViewProps {
  runner1b: string | null
  runner2b: string | null
  runner3b: string | null
  outs: number
  players: Map<string, Player>
}

export function DiamondView({ runner1b, runner2b, runner3b, outs, players }: DiamondViewProps) {
  const getRunnerName = (id: string | null) => {
    if (!id) return null
    const player = players.get(id)
    return player ? player.last_name : 'Runner'
  }

  return (
    <div className="flex items-center justify-center py-4">
      <div className="relative w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-[#4ade80] rounded-lg overflow-hidden border-2 sm:border-4 border-[#166534]">
        {/* Diamond SVG */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Grass pattern (optional) */}
          <rect width="100" height="100" fill="#22c55e" />

          {/* Infield dirt */}
          <polygon
            points="50,15 85,50 50,85 15,50"
            fill="#d97706"
          />

          {/* Base paths */}
          <line x1="50" y1="85" x2="85" y2="50" stroke="#fff" strokeWidth="1" opacity="0.8" />
          <line x1="85" y1="50" x2="50" y2="15" stroke="#fff" strokeWidth="1" opacity="0.8" />
          <line x1="50" y1="15" x2="15" y2="50" stroke="#fff" strokeWidth="1" opacity="0.8" />
          <line x1="15" y1="50" x2="50" y2="85" stroke="#fff" strokeWidth="1" opacity="0.8" />

          {/* Home plate */}
          <polygon
            points="50,82 46,85 46,88 54,88 54,85"
            fill="#fff"
          />

          {/* First base */}
          <rect
            x="81" y="46" width="8" height="8"
            fill={runner1b ? '#fbbf24' : '#fff'}
            transform="rotate(45 85 50)"
          />

          {/* Second base */}
          <rect
            x="46" y="11" width="8" height="8"
            fill={runner2b ? '#fbbf24' : '#fff'}
            transform="rotate(45 50 15)"
          />

          {/* Third base */}
          <rect
            x="11" y="46" width="8" height="8"
            fill={runner3b ? '#fbbf24' : '#fff'}
            transform="rotate(45 15 50)"
          />

          {/* Pitcher's mound */}
          <circle cx="50" cy="50" r="3" fill="#d97706" />
        </svg>

        {/* Runner labels */}
        {runner1b && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-blue-600 text-white px-1 rounded shadow border border-white">
            {getRunnerName(runner1b)}
          </div>
        )}
        {runner2b && (
          <div className="absolute left-1/2 -translate-x-1/2 top-2 text-xs bg-blue-600 text-white px-1 rounded shadow border border-white">
            {getRunnerName(runner2b)}
          </div>
        )}
        {runner3b && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs bg-blue-600 text-white px-1 rounded shadow border border-white">
            {getRunnerName(runner3b)}
          </div>
        )}
      </div>

      {/* Outs display */}
      <div className="ml-4 flex flex-col items-center">
        <div className="text-xs text-gray-400 mb-1 uppercase font-bold">Outs</div>
        <div className="flex flex-col space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border-2 ${i < outs
                  ? 'bg-red-500 border-red-500'
                  : 'border-gray-600 bg-gray-800'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
