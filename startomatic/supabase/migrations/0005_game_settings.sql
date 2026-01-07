-- Migration 0005: Game Settings for Handedness and NPC Manager Features
-- Adds settings column to games table to store per-game configuration
-- Created: 2026-01-07

-- Add settings column to games table
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{
  "useHandedness": true,
  "useNpcManager": true,
  "gameMode": "QUICK_MANAGE",
  "autoAdvance": true,
  "promptForSubstitutions": true
}'::jsonb;

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_games_settings ON public.games USING gin(settings);

-- Add comment for documentation
COMMENT ON COLUMN public.games.settings IS 'Game-specific settings: useHandedness (enable platoon matchups), useNpcManager (auto pitcher changes), gameMode (FULL_CONTROL/QUICK_MANAGE/FULL_SIM), autoAdvance (skip routine plays), promptForSubstitutions (ask before changes)';

-- Update existing games with default settings if needed
UPDATE public.games
SET settings = '{
  "useHandedness": true,
  "useNpcManager": true,
  "gameMode": "QUICK_MANAGE",
  "autoAdvance": true,
  "promptForSubstitutions": true
}'::jsonb
WHERE settings IS NULL;
