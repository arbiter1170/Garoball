# Handedness-Aware Matchups & NPC Pitching Manager

## Overview

This document describes the implementation of handedness-aware batting matchups and the NPC pitching manager system in Garoball.

## Features

### 1. Handedness-Aware Matchup System

The handedness system adjusts batter probabilities based on the platoon advantage/disadvantage in the batter-pitcher matchup.

#### Platoon Advantages

Based on MLB historical data:

**Left-handed batter vs Right-handed pitcher:**
- 12% increase in power (HR, 2B, 3B)
- 8% increase in contact (singles)
- 12% fewer strikeouts
- 10% more walks

**Right-handed batter vs Left-handed pitcher:**
- 15% increase in power
- 10% increase in contact
- 15% fewer strikeouts
- 12% more walks

**Same-handed matchups:**
- Disadvantage in power (~12-15% reduction)
- More strikeouts (~15% increase)
- Fewer walks (~10% reduction)

**Switch hitters:**
- Small advantage in all matchups (~2-3%)
- Can adjust to face either handedness

#### Usage

```typescript
import { calculateMatchupProbabilities } from '@/lib/handedness'

const matchupProbs = calculateMatchupProbabilities(
  batterProbs,
  pitcherProbs,
  'L', // Batter handedness
  'R', // Pitcher handedness
  0.65 // Batter weight (default)
)
```

#### Integration with Simulation

The simulation engine automatically applies handedness adjustments when:
1. Player data is available (bats/throws fields)
2. `useHandednessMatchups` flag is enabled in SimulationContext
3. Pitcher substitutions occur (probabilities are recalculated)

### 2. NPC Pitching Manager

The `PitchingManager` class provides intelligent pitcher substitution decisions based on game state.

#### Substitution Triggers

The manager evaluates several factors:

**1. Early Blowup**
- Pulls pitcher if allows 5+ runs
- Urgency: HIGH

**2. Fatigue/Pitch Count**
- Default threshold: 21 outs (~7 innings)
- Can be customized per pitcher via `fatigue_threshold`
- Higher urgency in high leverage situations

**3. High Leverage Situations**
- Late innings (8+) with close score
- Runners in scoring position
- Uses closer when available

**4. Platoon Disadvantage**
- Considers batter vs pitcher handedness
- May bring in specialist reliever
- Only after pitcher has recorded at least 3 outs

#### Pitcher Roles

Pitchers are automatically classified by innings pitched:
- **Starter**: 150+ innings (IP outs >= 450)
- **Reliever**: 50-150 innings
- **Closer**: < 50 innings

#### Availability & Rest

- Starters: Cannot re-enter same game
- Relievers: Need 2 innings rest
- Tracks last inning used
- Respects availability flags

#### Usage

```typescript
import { PitchingManager } from '@/lib/pitchingManager'

// Initialize with roster
const manager = new PitchingManager(
  playersMap,
  ratingsMap,
  { maxPlayers: 20, minPitchers: 5 }, // Constraints
  { maxOutsPerStarter: 21 } // Triggers
)

// Check if pitcher should be pulled
const decision = manager.shouldPullPitcher(game, currentPitcherId)
if (decision.shouldPull) {
  const newPitcher = manager.selectReliefPitcher(game, currentPitcherId)
  // Make substitution
  manager.markPitcherUsed(newPitcher, game.inning)
}

// Update pitcher state after each play
manager.updatePitcherState(pitcherId, outcome, runsScored)
```

#### Leverage Calculation

The manager calculates situation leverage based on:
- Score differential (closer = higher leverage)
- Inning (late game = higher leverage)
- Runners on base (scoring position = higher)
- Number of outs (2 outs = higher)

Formula:
```
leverage = scoreFactor × inningFactor × (1 + runnersFactor) × outsFactor
```

### 3. Game Mode System

Three game modes control pacing and user interaction:

#### FULL_CONTROL
- Watch every play
- Full control over all substitutions
- Dice rolls shown
- ~30 minutes per game
- Target: 10 plays/minute

#### QUICK_MANAGE
- Auto-advance through routine plays
- Pause for key decisions
- Prompts for medium+ urgency substitutions
- ~15-20 minutes per game
- Target: 18 plays/minute

#### FULL_SIM
- Instant simulation
- No user prompts
- No animations
- ~30 seconds per game
- Target: 600 plays/minute

#### Usage

```typescript
import { GameMode, DEFAULT_MODE_SETTINGS, shouldPromptForSubstitution } from '@/lib/gameMode'

const settings = DEFAULT_MODE_SETTINGS[GameMode.QUICK_MANAGE]

// Check if we should prompt
if (shouldPromptForSubstitution(settings, urgency)) {
  // Show substitution dialog
}

// Get appropriate delay between plays
const delay = getPlayDelay(settings, game, isKeyMoment)
```

### 4. API Integration

The game simulation API (`/api/games/[id]/simulate`) supports the new features:

#### Request Body Options

```typescript
{
  mode: 'play' | 'inning' | 'game',  // Simulation mode
  useHandedness: true,                // Enable handedness (default: true)
  useNpcManager: true                 // Enable NPC manager (default: true)
}
```

#### Handedness in API

- Automatically loads player data from database
- Applies handedness modifiers to all plate appearances
- Recalculates probabilities after pitcher changes

#### NPC Manager in API

- Evaluates substitution triggers before each PA
- Automatically makes substitutions when needed
- Updates pitcher states after each outcome
- Adds new pitchers to game roster as needed

## Testing

### Unit Tests

- `handedness.test.ts`: Tests platoon modifiers and matchup calculations
- `pitchingManager.test.ts`: Tests substitution logic and pitcher management

### Integration Tests

- `integration.test.ts`: Tests full game flow with both features
  - Verifies probability recalculation on pitcher changes
  - Tests NPC manager decision-making
  - Validates combined handedness + manager functionality

### Running Tests

```bash
npm test -- handedness.test.ts
npm test -- pitchingManager.test.ts
npm test -- integration.test.ts
npm test  # Run all tests
```

## Performance Considerations

- Handedness calculations are lightweight (~microseconds per PA)
- Pitching manager evaluation is O(n) where n = number of available pitchers
- Both features add negligible overhead to simulation (<1% slowdown)

## Future Enhancements

1. **Handedness System:**
   - Historical split data per player
   - Park factors and adjustments
   - Defensive positioning based on handedness

2. **Pitching Manager:**
   - Machine learning for optimal decisions
   - Team-specific bullpen strategies
   - Multi-game rest patterns

3. **Game Modes:**
   - Custom mode creation
   - Adaptive pacing based on situation
   - Save/resume for long games

## References

- Platoon split data based on MLB historical averages (2015-2024)
- Leverage Index concept from FanGraphs
- Pitching management strategies from MLB managerial best practices
