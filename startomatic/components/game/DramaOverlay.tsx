'use client'

import type { Game } from '@/types'
import { getDramaContext, type DramaLevel, type CrowdMood } from '@/lib/drama'
import { cn } from '@/lib/utils'

interface DramaOverlayProps {
  game: Game
  playerMomentum?: {
    playerId: string
    emoji: string
    state: 'hot' | 'cold' | 'neutral'
  }
}

/**
 * Visual drama overlay showing leverage, crowd mood, and momentum
 */
export function DramaOverlay({ game, playerMomentum }: DramaOverlayProps) {
  const drama = getDramaContext(game)
  
  return (
    <div className="space-y-3">
      {/* Leverage Meter */}
      <LeverageMeter 
        leverageIndex={drama.leverageIndex} 
        dramaLevel={drama.dramaLevel}
      />
      
      {/* Crowd Energy Indicator */}
      <CrowdEnergyIndicator crowdMood={drama.crowdMood} />
      
      {/* Player Momentum Badge */}
      {playerMomentum && playerMomentum.emoji && (
        <MomentumBadge momentum={playerMomentum} />
      )}
      
      {/* Special Situation Indicators */}
      {drama.isWalkOffSituation && (
        <SpecialSituationBadge text="WALK-OFF SITUATION" />
      )}
      {drama.isComebackPotential && (
        <SpecialSituationBadge text="COMEBACK POTENTIAL" variant="secondary" />
      )}
    </div>
  )
}

/**
 * Leverage meter with color-coded levels
 */
function LeverageMeter({ 
  leverageIndex, 
  dramaLevel 
}: { 
  leverageIndex: number
  dramaLevel: DramaLevel 
}) {
  const percentage = Math.min(100, (leverageIndex / 5) * 100)
  
  const colors: Record<DramaLevel, string> = {
    routine: 'bg-gray-400',
    tense: 'bg-yellow-400',
    clutch: 'bg-orange-500',
    legendary: 'bg-red-600'
  }
  
  const textColors: Record<DramaLevel, string> = {
    routine: 'text-gray-700',
    tense: 'text-yellow-700',
    clutch: 'text-orange-700',
    legendary: 'text-red-700'
  }
  
  const labels: Record<DramaLevel, string> = {
    routine: 'Routine',
    tense: 'Tense',
    clutch: 'CLUTCH',
    legendary: 'LEGENDARY'
  }
  
  const shouldPulse = dramaLevel === 'clutch' || dramaLevel === 'legendary'
  
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border-2 border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600">LEVERAGE</span>
        <span className={cn(
          'text-sm font-bold',
          textColors[dramaLevel],
          shouldPulse && 'animate-pulse'
        )}>
          {labels[dramaLevel]}
        </span>
      </div>
      
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn(
            'h-full transition-all duration-500',
            colors[dramaLevel],
            shouldPulse && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="mt-1 text-right text-xs text-gray-500">
        {leverageIndex.toFixed(2)}
      </div>
    </div>
  )
}

/**
 * Crowd energy indicator
 */
function CrowdEnergyIndicator({ crowdMood }: { crowdMood: CrowdMood }) {
  const moodConfig: Record<CrowdMood, { emoji: string; label: string; color: string }> = {
    quiet: { emoji: '😐', label: 'Quiet', color: 'text-gray-500' },
    buzzing: { emoji: '🙂', label: 'Buzzing', color: 'text-blue-500' },
    roaring: { emoji: '😃', label: 'Roaring', color: 'text-orange-500' },
    deafening: { emoji: '🤯', label: 'DEAFENING', color: 'text-red-600' }
  }
  
  const config = moodConfig[crowdMood]
  const shouldAnimate = crowdMood === 'roaring' || crowdMood === 'deafening'
  
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border-2 border-gray-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600">CROWD</span>
        <div className={cn(
          'flex items-center gap-2 font-bold',
          config.color,
          shouldAnimate && 'animate-pulse'
        )}>
          <span className="text-lg">{config.emoji}</span>
          <span className="text-sm">{config.label}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Player momentum badge
 */
function MomentumBadge({ 
  momentum 
}: { 
  momentum: { 
    playerId: string
    emoji: string
    state: 'hot' | 'cold' | 'neutral'
  } 
}) {
  const stateConfig = {
    hot: { label: 'HOT', color: 'bg-red-500 text-white border-red-600' },
    cold: { label: 'COLD', color: 'bg-blue-400 text-white border-blue-500' },
    neutral: { label: '', color: '' }
  }
  
  if (momentum.state === 'neutral') return null
  
  const config = stateConfig[momentum.state]
  
  return (
    <div className={cn(
      'rounded-lg p-2 border-2',
      config.color,
      'animate-pulse'
    )}>
      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl">{momentum.emoji}</span>
        <span className="text-xs font-bold">{config.label}</span>
      </div>
    </div>
  )
}

/**
 * Special situation badge
 */
function SpecialSituationBadge({ 
  text, 
  variant = 'primary' 
}: { 
  text: string
  variant?: 'primary' | 'secondary' 
}) {
  return (
    <div className={cn(
      'rounded-lg p-2 border-2 text-center animate-pulse',
      variant === 'primary' 
        ? 'bg-purple-600 text-white border-purple-700 font-bold'
        : 'bg-blue-500 text-white border-blue-600 font-semibold'
    )}>
      <div className="text-xs">
        {text}
      </div>
    </div>
  )
}
