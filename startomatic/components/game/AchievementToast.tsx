'use client'

import { useEffect, useState } from 'react'
import type { Achievement, AchievementRarity } from '@/lib/achievements'
import { getRarityColor, getRarityLabel } from '@/lib/achievements'
import { cn } from '@/lib/utils'

interface AchievementToastProps {
  achievement: Achievement
  onDismiss?: () => void
  autoHideDuration?: number
}

/**
 * Toast notification for unlocked achievements
 */
export function AchievementToast({ 
  achievement, 
  onDismiss,
  autoHideDuration = 5000 
}: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  
  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(() => {
      if (onDismiss) onDismiss()
    }, 300)
  }
  
  useEffect(() => {
    // Fade in
    setTimeout(() => setIsVisible(true), 100)
    
    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss()
    }, autoHideDuration)
    
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoHideDuration])
  
  const rarityColors: Record<AchievementRarity, string> = {
    common: 'bg-gray-100 border-gray-400 text-gray-800',
    uncommon: 'bg-green-100 border-green-400 text-green-800',
    rare: 'bg-blue-100 border-blue-400 text-blue-800',
    epic: 'bg-purple-100 border-purple-400 text-purple-800',
    legendary: 'bg-gradient-to-r from-yellow-200 via-orange-200 to-yellow-200 border-yellow-500 text-yellow-900'
  }
  
  const rarityColor = rarityColors[achievement.rarity]
  const isLegendary = achievement.rarity === 'legendary'
  
  return (
    <div 
      className={cn(
        'transform transition-all duration-300 ease-out',
        isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div 
        className={cn(
          'rounded-lg border-2 p-4 shadow-lg backdrop-blur-sm',
          rarityColor,
          isLegendary && 'animate-shimmer bg-shimmer',
          'min-w-[280px] max-w-[320px]'
        )}
        onClick={handleDismiss}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-start gap-3">
          {/* Emoji Icon */}
          <div className={cn(
            'text-3xl flex-shrink-0',
            isLegendary && 'animate-bounce'
          )}>
            {achievement.emoji}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wide opacity-75">
                {getRarityLabel(achievement.rarity)}
              </span>
              {isLegendary && <span className="text-xs">✨</span>}
            </div>
            
            <h3 className="font-bold text-sm mb-1 leading-tight">
              {achievement.name}
            </h3>
            
            <p className="text-xs opacity-90 leading-snug">
              {achievement.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Container for stacking multiple achievement toasts
 */
export function AchievementToastContainer({ 
  achievements,
  onDismiss
}: { 
  achievements: Achievement[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      <div className="pointer-events-auto space-y-3">
        {achievements.map((achievement) => (
          <AchievementToast
            key={achievement.id}
            achievement={achievement}
            onDismiss={() => onDismiss(achievement.id)}
          />
        ))}
      </div>
    </div>
  )
}
