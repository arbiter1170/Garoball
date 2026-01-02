# Drama, Announcer, and Achievement Systems - Integration Guide

This guide shows how to integrate the new drama, announcer, and achievement systems into your Garoball game.

## Core Systems

### 1. Drama Engine (`lib/drama.ts`)

The drama engine calculates game tension based on leverage index.

```typescript
import { getDramaContext } from '@/lib/drama'

// In your game component
const drama = getDramaContext(game)

console.log(`Leverage: ${drama.leverageIndex}`)
console.log(`Drama Level: ${drama.dramaLevel}`) // routine | tense | clutch | legendary
console.log(`Crowd Mood: ${drama.crowdMood}`) // quiet | buzzing | roaring | deafening
```

#### Player Momentum

Track player hot/cold streaks:

```typescript
import { calculatePlayerMomentum, updateMomentum } from '@/lib/drama'

// Track a player's recent outcomes
const recentOutcomes: Outcome[] = ['HR', '2B', '1B', 'OUT', 'HR']
const momentum = calculatePlayerMomentum('player-id', recentOutcomes)

console.log(momentum.state) // 'hot' | 'cold' | 'neutral'
console.log(momentum.emoji) // '🔥' | '❄️' | ''

// Update after each plate appearance
const updatedMomentum = updateMomentum(momentum, 'HR')
```

### 2. Announcer System (`lib/announcer.ts`)

Generate dynamic play-by-play commentary:

```typescript
import { generateAnnouncerCall, generatePrePitchTension } from '@/lib/announcer'

// Before the pitch
const tension = generatePrePitchTension(game, drama.dramaLevel)
console.log(tension) // "Bases loaded... the tension is unbearable..."

// After the outcome
const call = generateAnnouncerCall(
  game,
  outcome,
  runsScored,
  drama.dramaLevel,
  drama.isWalkOffSituation,
  drama.isComebackPotential
)

console.log(call.playByPlay) // "SWING AND A DRIVE... GONE!!!"
console.log(call.colorCommentary) // "WALK-OFF HOME RUN! ..."
```

### 3. Achievement System (`lib/achievements.ts`)

Check for and unlock achievements:

```typescript
import { 
  checkBattingAchievements,
  checkPitchingAchievements,
  checkGameAchievements,
  ACHIEVEMENTS 
} from '@/lib/achievements'

// After a plate appearance
const playerStats = {
  hits: ['1B', 'HR', '2B'],
  homeRuns: 1,
  rbi: 3
}

const unlocked = checkBattingAchievements(
  playerId,
  game,
  outcome,
  runsScored,
  playerStats
)

// Display achievement notifications
unlocked.forEach(achievement => {
  console.log(`${achievement.emoji} ${achievement.name}`)
  console.log(`${achievement.description} [${achievement.rarity}]`)
})
```

## UI Components

### DramaOverlay Component

Display visual drama indicators:

```tsx
import { DramaOverlay } from '@/components/game'

function GameView({ game }: { game: Game }) {
  // Calculate player momentum (from stored state)
  const currentBatter = getCurrentBatter(game)
  const momentum = getPlayerMomentum(currentBatter.id)
  
  return (
    <div className="game-container">
      {/* Drama overlay shows leverage, crowd mood, momentum */}
      <DramaOverlay 
        game={game}
        playerMomentum={momentum ? {
          playerId: momentum.playerId,
          emoji: momentum.emoji,
          state: momentum.state
        } : undefined}
      />
      
      {/* Rest of your game UI */}
    </div>
  )
}
```

### AchievementToast Component

Show achievement notifications:

```tsx
import { AchievementToastContainer } from '@/components/game'
import { useState } from 'react'

function GamePage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  
  // When an achievement is unlocked
  const handleAchievementUnlock = (achievement: Achievement) => {
    setAchievements(prev => [...prev, achievement])
  }
  
  const handleDismiss = (id: string) => {
    setAchievements(prev => prev.filter(a => a.id !== id))
  }
  
  return (
    <>
      <AchievementToastContainer
        achievements={achievements}
        onDismiss={handleDismiss}
      />
      
      {/* Your game content */}
    </>
  )
}
```

## Integration Example

Complete example of using all systems together:

```typescript
import { 
  getDramaContext,
  calculatePlayerMomentum,
  updateMomentum
} from '@/lib/drama'
import { generateAnnouncerCall } from '@/lib/announcer'
import { checkBattingAchievements } from '@/lib/achievements'

// During game simulation
function handlePlateAppearance(game: Game, result: PlateAppearanceResult) {
  // 1. Get drama context
  const drama = getDramaContext(game)
  
  // 2. Generate announcer call
  const call = generateAnnouncerCall(
    game,
    result.outcome,
    result.runsScored,
    drama.dramaLevel,
    drama.isWalkOffSituation,
    drama.isComebackPotential
  )
  
  // 3. Update player momentum
  const batterId = getCurrentBatter(game)
  const currentMomentum = getPlayerMomentum(batterId)
  const newMomentum = updateMomentum(currentMomentum, result.outcome)
  savePlayerMomentum(batterId, newMomentum)
  
  // 4. Check for achievements
  const playerStats = getPlayerGameStats(batterId)
  const achievements = checkBattingAchievements(
    batterId,
    game,
    result.outcome,
    result.runsScored,
    playerStats
  )
  
  // 5. Display everything
  displayAnnouncerCall(call)
  if (achievements.length > 0) {
    displayAchievements(achievements)
  }
}
```

## Achievement Categories

### Batting
- **First Blood** (common) - First hit
- **Going Yard** (common) - Home run
- **Getting Hot** (uncommon) - Multi-hit game
- **Grand Salami** (rare) - Grand slam
- **Walk-Off Hero** (epic) - Walk-off home run
- **Hit for the Cycle** (legendary) - 1B, 2B, 3B, HR in one game

### Pitching
- **First K** (common) - First strikeout
- **Double Digits** (rare) - 10+ strikeouts
- **Immaculate** (rare) - 3 strikeouts on 9 pitches
- **No-No** (legendary) - No-hitter
- **Perfection** (legendary) - Perfect game

### Team
- **Crooked Number** (uncommon) - 5+ runs in an inning
- **Lockdown** (uncommon) - Shutout win
- **Mercy Rule** (uncommon) - Win by 10+ runs
- **Never Say Die** (rare) - Win after trailing by 5+ runs

### Game
- **Walk It Off** (rare) - Walk-off win
- **Marathon** (uncommon) - Extra innings
- **Slugfest** (uncommon) - Both teams score 8+ runs

### Season
- **On The Board** (common) - First win
- **Rolling** (rare) - 5-game winning streak
- **Hot Start** (epic) - Start season 5-0

## Drama Levels

The drama level affects announcer calls and UI intensity:

- **Routine** (0-1.2) - Normal gameplay, quiet crowd
- **Tense** (1.2-2.0) - Close game, buzzing crowd
- **Clutch** (2.0-3.5) - High leverage, roaring crowd, pulsing effects
- **Legendary** (3.5+) - Maximum drama, deafening crowd, special animations

Leverage is calculated from:
- Inning (later = higher)
- Score differential (closer = higher)
- Runners on base (more = higher)
- Outs (2 outs = highest)
- Walk-off situations (2x multiplier)

## Best Practices

1. **Calculate drama context once per plate appearance** to avoid unnecessary recalculations
2. **Store player momentum** across games to track career streaks
3. **Persist unlocked achievements** to prevent duplicates
4. **Use drama level to adjust audio/visual effects** for immersive experience
5. **Display achievements briefly** (5 seconds) to avoid cluttering UI
6. **Check for achievements after key events** (play, inning end, game end)

## Testing

All systems have comprehensive test coverage. Run tests with:

```bash
npm test -- __tests__/drama.test.ts
```

The test suite validates:
- Leverage calculation logic
- Drama level thresholds
- Momentum state changes
- Walk-off and comeback detection
- Emoji displays
