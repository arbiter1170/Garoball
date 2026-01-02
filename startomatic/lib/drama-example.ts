// Example integration of Drama, Announcer, and Achievement systems
// This demonstrates how to use the new systems in a game simulation

import type { Game, Outcome } from '@/types'
import {
  getDramaContext,
  calculatePlayerMomentum,
  updateMomentum,
  type PlayerMomentum
} from '@/lib/drama'
import { generateAnnouncerCall, generatePrePitchTension } from '@/lib/announcer'
import {
  checkBattingAchievements,
  checkGameAchievements,
  checkInningAchievements,
  type Achievement
} from '@/lib/achievements'

/**
 * Example: Enhanced plate appearance with drama and achievements
 */
export function enhancedPlateAppearance(
  game: Game,
  outcome: Outcome,
  runsScored: number,
  batterId: string,
  playerGameStats: {
    hits: Outcome[]
    homeRuns: number
    rbi: number
  },
  playerMomentumState: Outcome[]
): {
  drama: ReturnType<typeof getDramaContext>
  prePitchText: string
  announcerCall: ReturnType<typeof generateAnnouncerCall>
  momentum: PlayerMomentum
  achievements: Achievement[]
} {
  // 1. Calculate drama context
  const drama = getDramaContext(game)
  
  // 2. Generate pre-pitch tension
  const prePitchText = generatePrePitchTension(game, drama.dramaLevel)
  
  // 3. Generate announcer call
  const announcerCall = generateAnnouncerCall(
    game,
    outcome,
    runsScored,
    drama.dramaLevel,
    drama.isWalkOffSituation,
    drama.isComebackPotential
  )
  
  // 4. Update player momentum
  const momentum = calculatePlayerMomentum(batterId, [...playerMomentumState, outcome])
  
  // 5. Check for achievements
  const achievements = checkBattingAchievements(
    batterId,
    game,
    outcome,
    runsScored,
    playerGameStats
  )
  
  return {
    drama,
    prePitchText,
    announcerCall,
    momentum,
    achievements
  }
}

/**
 * Example: Check for inning and game achievements
 */
export function checkEndOfPlayAchievements(
  game: Game,
  inningRuns: number,
  maxDeficit: number
): {
  inningAchievements: Achievement[]
  gameAchievements: Achievement[]
} {
  const inningAchievements = checkInningAchievements(game, inningRuns)
  const gameAchievements = game.status === 'completed'
    ? checkGameAchievements(game, maxDeficit)
    : []
  
  return {
    inningAchievements,
    gameAchievements
  }
}

/**
 * Example usage in a React component
 */
export function ExampleUsage() {
  /*
  // In your game component state:
  const [currentDrama, setCurrentDrama] = useState<DramaContext | null>(null)
  const [playerMomentum, setPlayerMomentum] = useState<Map<string, PlayerMomentum>>(new Map())
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [announcerText, setAnnouncerText] = useState<string>('')
  
  // Before each pitch:
  const drama = getDramaContext(game)
  const prePitch = generatePrePitchTension(game, drama.dramaLevel)
  setCurrentDrama(drama)
  setAnnouncerText(prePitch)
  
  // After each outcome:
  const result = enhancedPlateAppearance(
    game,
    outcome,
    runsScored,
    batterId,
    playerStats,
    playerMomentumState
  )
  
  // Update UI
  setCurrentDrama(result.drama)
  setAnnouncerText(result.announcerCall.playByPlay)
  if (result.announcerCall.colorCommentary) {
    setTimeout(() => setAnnouncerText(result.announcerCall.colorCommentary!), 2000)
  }
  
  // Update momentum
  setPlayerMomentum(prev => {
    const updated = new Map(prev)
    updated.set(batterId, result.momentum)
    return updated
  })
  
  // Show achievements
  if (result.achievements.length > 0) {
    setAchievements(prev => [...prev, ...result.achievements])
  }
  
  // In your JSX:
  return (
    <>
      <DramaOverlay 
        game={game}
        playerMomentum={playerMomentum.get(currentBatterId)}
      />
      
      <div className="announcer-text">
        {announcerText}
      </div>
      
      <AchievementToastContainer
        achievements={achievements}
        onDismiss={(id) => setAchievements(prev => prev.filter(a => a.id !== id))}
      />
    </>
  )
  */
  
  return null
}

/**
 * Example: Display drama information in console
 */
export function logDramaInformation(game: Game) {
  const drama = getDramaContext(game)
  
  console.log('\n--- DRAMA CONTEXT ---')
  console.log(`Leverage Index: ${drama.leverageIndex.toFixed(2)}`)
  console.log(`Drama Level: ${drama.dramaLevel}`)
  console.log(`Crowd Mood: ${drama.crowdMood}`)
  console.log(`Walk-off Situation: ${drama.isWalkOffSituation}`)
  console.log(`Comeback Potential: ${drama.isComebackPotential}`)
  console.log('--------------------\n')
}

/**
 * Example: Format achievement notification
 */
export function formatAchievementNotification(achievement: Achievement): string {
  return `${achievement.emoji} ${achievement.name} [${achievement.rarity}]\n${achievement.description}`
}
