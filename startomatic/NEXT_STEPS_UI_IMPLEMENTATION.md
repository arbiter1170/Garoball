# Next Steps: UI Implementation for Handedness & NPC Manager Features

This document outlines the steps needed to create UI components and prepare Supabase for the handedness-aware matchups and NPC pitching manager features implemented in the previous PR.

## Overview

The backend features are complete and production-ready. This PR will focus on:
1. Creating Supabase migrations for game settings
2. Building React UI components for user interaction
3. Integrating features into the game interface
4. Adding visual indicators and controls

---

## Phase 1: Supabase Schema Updates

### 1.1 Add Game Settings Table

Create a new migration to store game-level settings for features:

**File:** `supabase/migrations/0005_game_settings.sql`

```sql
-- Add game settings for handedness and NPC manager features
-- This allows per-game configuration of features

-- Add settings column to games table if not exists
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{
  "useHandedness": true,
  "useNpcManager": true,
  "gameMode": "QUICK_MANAGE",
  "autoAdvance": true,
  "promptForSubstitutions": true
}'::jsonb;

-- Create index for settings queries
CREATE INDEX IF NOT EXISTS idx_games_settings ON public.games USING gin(settings);

-- Add comment
COMMENT ON COLUMN public.games.settings IS 'Game-specific settings for handedness, NPC manager, and pacing features';
```

### 1.2 Add League Settings for Defaults

Update league settings to include default game mode preferences:

**File:** `supabase/migrations/0006_league_game_defaults.sql`

```sql
-- Add league-level defaults for game features
-- Allows leagues to set default game modes and features

-- Example league settings structure:
-- {
--   "dh_enabled": true,
--   "games_per_matchup": 3,
--   "innings_per_game": 9,
--   "default_game_mode": "QUICK_MANAGE",
--   "default_use_handedness": true,
--   "default_use_npc_manager": true,
--   "allow_player_override": true
-- }

-- Update existing leagues with defaults if needed
UPDATE public.leagues
SET settings = settings || jsonb_build_object(
  'default_game_mode', 'QUICK_MANAGE',
  'default_use_handedness', true,
  'default_use_npc_manager', true,
  'allow_player_override', true
)
WHERE settings IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.leagues.settings IS 'League settings including game mode defaults and feature flags';
```

### 1.3 Add Pitcher State Tracking (Optional)

For advanced features, track pitcher usage across multiple games:

**File:** `supabase/migrations/0007_pitcher_tracking.sql`

```sql
-- Track pitcher usage for multi-game rest periods and availability
-- This is optional for MVP but enables more realistic bullpen management

CREATE TABLE IF NOT EXISTS public.pitcher_usage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id uuid REFERENCES public.seasons(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  
  -- Usage statistics
  outs_recorded integer DEFAULT 0,
  runs_allowed integer DEFAULT 0,
  hits_allowed integer DEFAULT 0,
  walks_allowed integer DEFAULT 0,
  
  -- State tracking
  last_inning_pitched integer,
  is_available boolean DEFAULT true,
  rest_innings_needed integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  UNIQUE(game_id, player_id)
);

CREATE INDEX idx_pitcher_usage_season ON public.pitcher_usage(season_id);
CREATE INDEX idx_pitcher_usage_player ON public.pitcher_usage(player_id);
CREATE INDEX idx_pitcher_usage_game ON public.pitcher_usage(game_id);

COMMENT ON TABLE public.pitcher_usage IS 'Tracks pitcher usage for multi-game availability and rest management';
```

---

## Phase 2: UI Component Development

### 2.1 Game Mode Selector Component

**File:** `components/game/GameModeSelector.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { GameMode } from '@/lib/gameMode'

interface GameModeSelectorProps {
  currentMode: GameMode
  onModeChange: (mode: GameMode) => void
  disabled?: boolean
}

export function GameModeSelector({ 
  currentMode, 
  onModeChange, 
  disabled = false 
}: GameModeSelectorProps) {
  const modes: { mode: GameMode; label: string; description: string }[] = [
    {
      mode: 'FULL_CONTROL',
      label: 'Full Control',
      description: 'Watch every play, make all decisions (~30 min)'
    },
    {
      mode: 'QUICK_MANAGE',
      label: 'Quick Manage',
      description: 'Auto-advance, key decisions only (~18 min)'
    },
    {
      mode: 'FULL_SIM',
      label: 'Sim to End',
      description: 'Instant simulation (~30 sec)'
    }
  ]

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Game Mode</label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {modes.map(({ mode, label, description }) => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            disabled={disabled}
            className={`
              p-4 rounded-lg border-2 text-left transition-all
              ${currentMode === mode 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="font-semibold">{label}</div>
            <div className="text-sm text-gray-600 mt-1">{description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

### 2.2 Pitcher Substitution Dialog

**File:** `components/game/PitcherSubstitutionDialog.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { Player, PlayerRating } from '@/types'

interface PitcherSubstitutionDialogProps {
  isOpen: boolean
  onClose: () => void
  currentPitcher: Player
  availablePitchers: Player[]
  ratings: Map<string, PlayerRating>
  reason: string
  urgency: 'low' | 'medium' | 'high'
  onSubstitute: (newPitcherId: string) => void
  onKeep: () => void
}

export function PitcherSubstitutionDialog({
  isOpen,
  onClose,
  currentPitcher,
  availablePitchers,
  ratings,
  reason,
  urgency,
  onSubstitute,
  onKeep
}: PitcherSubstitutionDialogProps) {
  const [selectedPitcher, setSelectedPitcher] = useState<string | null>(null)

  const urgencyColors = {
    low: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    medium: 'bg-orange-100 text-orange-800 border-orange-300',
    high: 'bg-red-100 text-red-800 border-red-300'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pitching Change?">
      <div className="space-y-4">
        {/* Current Situation */}
        <div className={`p-3 rounded border ${urgencyColors[urgency]}`}>
          <div className="font-semibold">
            {urgency === 'high' ? '⚠️ ' : urgency === 'medium' ? '⚡ ' : 'ℹ️ '}
            {reason}
          </div>
        </div>

        {/* Current Pitcher */}
        <div className="border rounded p-3">
          <div className="text-sm text-gray-600">Current Pitcher</div>
          <div className="font-semibold">
            {currentPitcher.first_name} {currentPitcher.last_name}
          </div>
          <div className="text-sm text-gray-500">
            {currentPitcher.throws === 'L' ? 'Left-handed' : 'Right-handed'}
          </div>
        </div>

        {/* Available Relievers */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Available Relievers</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availablePitchers.map(pitcher => {
              const rating = ratings.get(`${pitcher.id}:pitching`)
              const era = rating?.stats?.era || 0
              
              return (
                <button
                  key={pitcher.id}
                  onClick={() => setSelectedPitcher(pitcher.id)}
                  className={`
                    w-full p-3 rounded border-2 text-left transition-all
                    ${selectedPitcher === pitcher.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                    }
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">
                        {pitcher.first_name} {pitcher.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {pitcher.throws === 'L' ? 'LHP' : 'RHP'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {era.toFixed(2)} ERA
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (selectedPitcher) {
                onSubstitute(selectedPitcher)
                onClose()
              }
            }}
            disabled={!selectedPitcher}
            className="flex-1"
          >
            Make Change
          </Button>
          <Button
            onClick={() => {
              onKeep()
              onClose()
            }}
            variant="outline"
            className="flex-1"
          >
            Keep Current
          </Button>
        </div>
      </div>
    </Modal>
  )
}
```

### 2.3 Platoon Advantage Indicator

**File:** `components/game/PlatoonIndicator.tsx`

```typescript
'use client'

import { getMatchupDescription } from '@/lib/handedness'
import type { Handedness } from '@/types'

interface PlatoonIndicatorProps {
  batterHand: Handedness
  pitcherHand: Handedness
  className?: string
}

export function PlatoonIndicator({
  batterHand,
  pitcherHand,
  className = ''
}: PlatoonIndicatorProps) {
  const description = getMatchupDescription(batterHand, pitcherHand)
  
  // Determine advantage
  const hasAdvantage = 
    (batterHand === 'L' && pitcherHand === 'R') ||
    (batterHand === 'R' && pitcherHand === 'L') ||
    batterHand === 'S'
  
  const hasDisadvantage = 
    (batterHand === 'L' && pitcherHand === 'L') ||
    (batterHand === 'R' && pitcherHand === 'R')

  if (batterHand === 'S') {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 ${className}`}>
        <span>⚖️</span>
        <span>{description}</span>
      </div>
    )
  }

  if (hasAdvantage) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 ${className}`}>
        <span>↗️</span>
        <span>{description}</span>
      </div>
    )
  }

  if (hasDisadvantage) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 ${className}`}>
        <span>↘️</span>
        <span>{description}</span>
      </div>
    )
  }

  return null
}
```

### 2.4 Pitcher Fatigue Meter

**File:** `components/game/PitcherFatigueMeter.tsx`

```typescript
'use client'

interface PitcherFatigueMeterProps {
  outsRecorded: number
  fatigueThreshold: number
  runsAllowed: number
  className?: string
}

export function PitcherFatigueMeter({
  outsRecorded,
  fatigueThreshold,
  runsAllowed,
  className = ''
}: PitcherFatigueMeterProps) {
  const percentage = Math.min((outsRecorded / fatigueThreshold) * 100, 100)
  const isFatigued = outsRecorded >= fatigueThreshold
  const isWarning = percentage >= 75
  
  let barColor = 'bg-green-500'
  let bgColor = 'bg-green-100'
  
  if (isFatigued) {
    barColor = 'bg-red-500'
    bgColor = 'bg-red-100'
  } else if (isWarning) {
    barColor = 'bg-yellow-500'
    bgColor = 'bg-yellow-100'
  }

  const innings = Math.floor(outsRecorded / 3)
  const partialOuts = outsRecorded % 3

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium">Pitch Count</span>
        <span className={isFatigued ? 'text-red-600 font-bold' : 'text-gray-600'}>
          {innings}.{partialOuts} IP
          {isFatigued && ' ⚠️'}
        </span>
      </div>
      <div className={`h-2 rounded-full ${bgColor} overflow-hidden`}>
        <div 
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {runsAllowed > 3 && (
        <div className="text-xs text-red-600">
          {runsAllowed} runs allowed
        </div>
      )}
    </div>
  )
}
```

### 2.5 Game Settings Panel (Pre-Game)

**File:** `components/game/GameSettingsPanel.tsx`

```typescript
'use client'

import { useState } from 'react'
import { GameModeSelector } from './GameModeSelector'
import type { GameMode } from '@/lib/gameMode'

interface GameSettingsProps {
  onSave: (settings: GameSettings) => void
  initialSettings?: GameSettings
}

export interface GameSettings {
  gameMode: GameMode
  useHandedness: boolean
  useNpcManager: boolean
  autoAdvance: boolean
  promptForSubstitutions: boolean
}

export function GameSettingsPanel({ 
  onSave, 
  initialSettings 
}: GameSettingsProps) {
  const [settings, setSettings] = useState<GameSettings>(
    initialSettings || {
      gameMode: 'QUICK_MANAGE',
      useHandedness: true,
      useNpcManager: true,
      autoAdvance: true,
      promptForSubstitutions: true
    }
  )

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border">
      <h3 className="text-lg font-semibold">Game Settings</h3>
      
      {/* Game Mode Selection */}
      <GameModeSelector
        currentMode={settings.gameMode}
        onModeChange={(mode) => setSettings({ ...settings, gameMode: mode })}
      />

      {/* Feature Toggles */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Features</label>
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.useHandedness}
              onChange={(e) => 
                setSettings({ ...settings, useHandedness: e.target.checked })
              }
              className="w-4 h-4"
            />
            <div>
              <div className="font-medium text-sm">Handedness Matchups</div>
              <div className="text-xs text-gray-600">
                Apply platoon advantages based on batter/pitcher handedness
              </div>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.useNpcManager}
              onChange={(e) => 
                setSettings({ ...settings, useNpcManager: e.target.checked })
              }
              className="w-4 h-4"
            />
            <div>
              <div className="font-medium text-sm">NPC Pitching Manager</div>
              <div className="text-xs text-gray-600">
                Automatic pitcher substitutions based on game situation
              </div>
            </div>
          </label>

          {settings.gameMode === 'QUICK_MANAGE' && (
            <label className="flex items-center gap-2 cursor-pointer ml-6">
              <input
                type="checkbox"
                checked={settings.promptForSubstitutions}
                onChange={(e) => 
                  setSettings({ ...settings, promptForSubstitutions: e.target.checked })
                }
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium text-sm">Prompt for Key Substitutions</div>
                <div className="text-xs text-gray-600">
                  Ask before making high-urgency pitching changes
                </div>
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={() => onSave(settings)}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
      >
        Start Game
      </button>
    </div>
  )
}
```

---

## Phase 3: Integration into Game Page

### 3.1 Update Game Page with New Features

**File:** `app/games/[id]/page.tsx` (modifications)

Key changes needed:
1. Add state for game settings
2. Integrate `PitcherSubstitutionDialog`
3. Add `PlatoonIndicator` to batter/pitcher display
4. Add `PitcherFatigueMeter` to pitcher info
5. Handle NPC manager decisions based on game mode

```typescript
// Add to existing game page state
const [gameSettings, setGameSettings] = useState<GameSettings>({
  gameMode: 'QUICK_MANAGE',
  useHandedness: true,
  useNpcManager: true,
  autoAdvance: true,
  promptForSubstitutions: true
})

const [showSubstitutionDialog, setShowSubstitutionDialog] = useState(false)
const [substitutionData, setSubstitutionData] = useState<any>(null)

// Add to simulate call
const simulatePlay = async () => {
  const response = await fetch(`/api/games/${gameId}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'play',
      useHandedness: gameSettings.useHandedness,
      useNpcManager: gameSettings.useNpcManager
    })
  })
  // ... handle response
}
```

### 3.2 Add Pre-Game Setup

Create a new route or modal for game setup:

**File:** `app/games/[id]/setup/page.tsx`

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { GameSettingsPanel } from '@/components/game/GameSettingsPanel'
import type { GameSettings } from '@/components/game/GameSettingsPanel'

export default function GameSetupPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  const handleSave = async (settings: GameSettings) => {
    // Save settings to game
    await fetch(`/api/games/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings })
    })

    // Redirect to game
    router.push(`/games/${params.id}`)
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Game Setup</h1>
      <GameSettingsPanel onSave={handleSave} />
    </div>
  )
}
```

---

## Phase 4: API Endpoint Updates

### 4.1 Add Game Settings Endpoint

**File:** `app/api/games/[id]/settings/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/games/[id]/settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: game, error } = await supabase
    .from('games')
    .select('settings')
    .eq('id', id)
    .single()

  if (error || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  return NextResponse.json({ settings: game.settings || {} })
}

// PATCH /api/games/[id]/settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('games')
    .update({ settings: body })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: data.settings })
}
```

### 4.2 Update Simulate Endpoint

The simulate endpoint already supports the features via body parameters, but we should also read from game settings:

```typescript
// In simulate route.ts, check game settings first
const gameSettings = game.settings || {}
const { 
  mode = 'play', 
  useHandedness = gameSettings.useHandedness ?? true, 
  useNpcManager = gameSettings.useNpcManager ?? true 
} = body
```

---

## Phase 5: Testing Plan

### 5.1 Component Tests

Create tests for new UI components:

**File:** `__tests__/components/GameModeSelector.test.tsx`
**File:** `__tests__/components/PitcherSubstitutionDialog.test.tsx`
**File:** `__tests__/components/PlatoonIndicator.test.tsx`

### 5.2 Integration Tests

Test the full game flow with UI:

**File:** `__tests__/e2e/game-with-features.test.ts`

Test scenarios:
1. Start game with Quick Manage mode
2. Verify platoon indicators show correctly
3. Trigger pitching change dialog
4. Complete game with NPC manager enabled

### 5.3 Visual Regression Tests

Take screenshots of:
1. Game mode selector
2. Pitcher substitution dialog
3. Platoon indicators
4. Fatigue meter

---

## Phase 6: Documentation Updates

### 6.1 User Guide

**File:** `docs/USER_GUIDE_GAME_FEATURES.md`

Create user-facing documentation:
- How to select game mode
- What platoon advantages mean
- Understanding pitcher fatigue
- NPC manager behavior

### 6.2 Developer Guide

**File:** `docs/DEV_GUIDE_UI_COMPONENTS.md`

Document component APIs:
- Component props and usage
- State management patterns
- Integration examples

---

## Implementation Checklist

### Supabase (Phase 1)
- [ ] Create migration 0005_game_settings.sql
- [ ] Create migration 0006_league_game_defaults.sql
- [ ] Create migration 0007_pitcher_tracking.sql (optional)
- [ ] Run migrations on development database
- [ ] Test migrations on staging
- [ ] Verify database schema changes

### UI Components (Phase 2)
- [ ] Implement GameModeSelector component
- [ ] Implement PitcherSubstitutionDialog component
- [ ] Implement PlatoonIndicator component
- [ ] Implement PitcherFatigueMeter component
- [ ] Implement GameSettingsPanel component
- [ ] Add TypeScript types for all components
- [ ] Write unit tests for each component

### Integration (Phase 3)
- [ ] Update game page with new features
- [ ] Create game setup page
- [ ] Integrate substitution dialog into game flow
- [ ] Add platoon indicators to player displays
- [ ] Add fatigue meter to pitcher info
- [ ] Test full game flow

### API (Phase 4)
- [ ] Create settings endpoint
- [ ] Update simulate endpoint to read game settings
- [ ] Add validation for settings
- [ ] Test API endpoints

### Testing (Phase 5)
- [ ] Write component tests
- [ ] Write integration tests
- [ ] Run visual regression tests
- [ ] Test on multiple browsers
- [ ] Test mobile responsiveness

### Documentation (Phase 6)
- [ ] Write user guide
- [ ] Write developer guide
- [ ] Update README with new features
- [ ] Create video walkthrough (optional)

---

## Estimated Timeline

- **Phase 1 (Supabase)**: 2-4 hours
- **Phase 2 (UI Components)**: 8-12 hours
- **Phase 3 (Integration)**: 6-8 hours
- **Phase 4 (API)**: 2-3 hours
- **Phase 5 (Testing)**: 4-6 hours
- **Phase 6 (Documentation)**: 3-4 hours

**Total**: 25-37 hours of development time

---

## Success Criteria

The UI implementation will be considered complete when:

1. ✅ All Supabase migrations run successfully
2. ✅ All UI components render without errors
3. ✅ Game mode selection works and persists
4. ✅ Pitcher substitution dialog shows at appropriate times
5. ✅ Platoon indicators display correct matchup info
6. ✅ Fatigue meter updates in real-time
7. ✅ All tests pass (unit, integration, visual)
8. ✅ Documentation is complete and accurate
9. ✅ Features work across all supported browsers
10. ✅ Mobile experience is functional

---

## Notes for Implementation

1. **Start with Supabase**: Run migrations first to ensure database is ready
2. **Build Components in Isolation**: Use Storybook or similar if available
3. **Test Early and Often**: Don't wait until the end to test integration
4. **Mobile First**: Design components to work well on mobile
5. **Accessibility**: Ensure all components are keyboard navigable
6. **Performance**: Keep component re-renders minimal
7. **Error Handling**: Add proper error states for all API calls
8. **Loading States**: Show loading indicators during async operations

---

## Future Enhancements (Post-MVP)

Once the core UI is complete, consider these enhancements:

1. **Advanced Analytics**: Show historical platoon advantage stats
2. **Pitcher Heat Maps**: Visualize pitcher fatigue over multiple games
3. **Manager Profiles**: Customizable NPC manager strategies
4. **Mobile App**: Native iOS/Android apps
5. **Real-time Multiplayer**: Watch games together
6. **Replay System**: Watch past games with commentary
7. **AI Coach**: Suggestions for optimal substitutions
8. **Custom Scenarios**: Create specific game situations to test

---

## Questions to Resolve

Before starting implementation, confirm:

1. Should game settings be editable mid-game?
2. What happens if a user changes mode during a game?
3. Should we track pitcher usage across multiple games in the season?
4. Do we need admin controls to enable/disable features at league level?
5. Should substitution prompts pause the game or be dismissible?

---

**Last Updated**: January 7, 2026  
**Status**: Ready for implementation  
**Owner**: TBD  
**Reviewers**: TBD
