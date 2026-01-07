-- Migration 0006: League Game Defaults
-- Adds default game mode and feature settings to leagues table
-- Created: 2026-01-07

-- Update leagues settings to include game feature defaults
-- This allows leagues to set default preferences for all games

-- Example league settings structure after migration:
-- {
--   "dh_enabled": true,
--   "games_per_matchup": 3,
--   "innings_per_game": 9,
--   "default_game_mode": "QUICK_MANAGE",
--   "default_use_handedness": true,
--   "default_use_npc_manager": true,
--   "allow_player_override": true
-- }

-- Update existing leagues with game feature defaults
UPDATE public.leagues
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
  'default_game_mode', 'QUICK_MANAGE',
  'default_use_handedness', true,
  'default_use_npc_manager', true,
  'allow_player_override', true
);

-- Add comment for documentation
COMMENT ON COLUMN public.leagues.settings IS 'League settings including DH rules, game scheduling, and default feature flags (game_mode, handedness, NPC manager)';

-- Create helper function to get game defaults from league
CREATE OR REPLACE FUNCTION get_league_game_defaults(league_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  league_settings jsonb;
BEGIN
  SELECT settings INTO league_settings
  FROM public.leagues
  WHERE id = league_uuid;
  
  -- Return default game settings based on league preferences
  RETURN jsonb_build_object(
    'useHandedness', COALESCE((league_settings->>'default_use_handedness')::boolean, true),
    'useNpcManager', COALESCE((league_settings->>'default_use_npc_manager')::boolean, true),
    'gameMode', COALESCE(league_settings->>'default_game_mode', 'QUICK_MANAGE'),
    'autoAdvance', true,
    'promptForSubstitutions', true
  );
END;
$$;

COMMENT ON FUNCTION get_league_game_defaults IS 'Returns default game settings for a league based on league preferences';
