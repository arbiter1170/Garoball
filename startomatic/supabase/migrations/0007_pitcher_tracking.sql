-- Migration 0007: Pitcher Usage Tracking (Optional)
-- Tracks pitcher usage across games for advanced bullpen management
-- Created: 2026-01-07
-- Status: Optional for MVP - can be added later if needed

-- This table enables multi-game pitcher tracking for:
-- - Season-long rest management
-- - Availability across series
-- - Historical usage patterns
-- - Workload analysis

CREATE TABLE IF NOT EXISTS public.pitcher_usage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id uuid REFERENCES public.seasons(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  
  -- Usage statistics from this game
  outs_recorded integer DEFAULT 0 CHECK (outs_recorded >= 0),
  runs_allowed integer DEFAULT 0 CHECK (runs_allowed >= 0),
  hits_allowed integer DEFAULT 0 CHECK (hits_allowed >= 0),
  walks_allowed integer DEFAULT 0 CHECK (walks_allowed >= 0),
  strikeouts integer DEFAULT 0 CHECK (strikeouts >= 0),
  
  -- State tracking
  last_inning_pitched integer CHECK (last_inning_pitched > 0),
  is_available boolean DEFAULT true NOT NULL,
  rest_innings_needed integer DEFAULT 0 CHECK (rest_innings_needed >= 0),
  
  -- Role in this game
  role text CHECK (role IN ('starter', 'reliever', 'closer')),
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Ensure one record per game per player
  UNIQUE(game_id, player_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_pitcher_usage_season ON public.pitcher_usage(season_id);
CREATE INDEX idx_pitcher_usage_player ON public.pitcher_usage(player_id);
CREATE INDEX idx_pitcher_usage_game ON public.pitcher_usage(game_id);
CREATE INDEX idx_pitcher_usage_availability ON public.pitcher_usage(player_id, is_available) 
  WHERE is_available = true;

-- Comments for documentation
COMMENT ON TABLE public.pitcher_usage IS 'Tracks pitcher usage across games for advanced bullpen management and season-long rest patterns';
COMMENT ON COLUMN public.pitcher_usage.outs_recorded IS 'Number of outs recorded in this game (3 outs = 1 inning)';
COMMENT ON COLUMN public.pitcher_usage.is_available IS 'Whether pitcher is available for next game based on rest requirements';
COMMENT ON COLUMN public.pitcher_usage.rest_innings_needed IS 'Number of innings of rest needed before next appearance';
COMMENT ON COLUMN public.pitcher_usage.role IS 'Role pitcher had in this game (starter/reliever/closer)';

-- Helper function to calculate pitcher availability
CREATE OR REPLACE FUNCTION calculate_pitcher_availability(
  pitcher_uuid uuid,
  season_uuid uuid,
  games_back integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  recent_usage jsonb;
  total_outs integer;
  games_pitched integer;
  last_appearance_innings_ago integer;
BEGIN
  -- Get recent usage statistics
  SELECT 
    jsonb_agg(jsonb_build_object(
      'game_id', game_id,
      'outs_recorded', outs_recorded,
      'last_inning_pitched', last_inning_pitched,
      'role', role
    ) ORDER BY created_at DESC),
    SUM(outs_recorded),
    COUNT(*),
    -- Calculate innings since last appearance (would need game data)
    0
  INTO recent_usage, total_outs, games_pitched, last_appearance_innings_ago
  FROM public.pitcher_usage
  WHERE player_id = pitcher_uuid 
    AND season_id = season_uuid
  ORDER BY created_at DESC
  LIMIT games_back;
  
  -- Return availability analysis
  RETURN jsonb_build_object(
    'is_available', CASE 
      WHEN last_appearance_innings_ago >= 2 THEN true
      WHEN games_pitched = 0 THEN true
      ELSE false
    END,
    'recent_usage', COALESCE(recent_usage, '[]'::jsonb),
    'total_outs_last_n_games', COALESCE(total_outs, 0),
    'games_pitched', COALESCE(games_pitched, 0),
    'recommended_rest', CASE
      WHEN total_outs > 9 THEN 3  -- More than 3 innings in recent games
      WHEN total_outs > 6 THEN 2  -- 2-3 innings
      ELSE 1                       -- Light usage
    END
  );
END;
$$;

COMMENT ON FUNCTION calculate_pitcher_availability IS 'Analyzes pitcher availability based on recent usage patterns. Returns availability status and recommendations.';

-- Function to update pitcher usage after a game
CREATE OR REPLACE FUNCTION record_pitcher_usage(
  p_game_id uuid,
  p_player_id uuid,
  p_season_id uuid,
  p_outs_recorded integer,
  p_runs_allowed integer DEFAULT 0,
  p_hits_allowed integer DEFAULT 0,
  p_walks_allowed integer DEFAULT 0,
  p_strikeouts integer DEFAULT 0,
  p_last_inning integer DEFAULT NULL,
  p_role text DEFAULT 'reliever'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  usage_id uuid;
  rest_needed integer;
BEGIN
  -- Calculate rest needed based on workload
  rest_needed := CASE
    WHEN p_outs_recorded >= 18 THEN 4  -- 6+ innings (starter)
    WHEN p_outs_recorded >= 9 THEN 3   -- 3+ innings (long relief)
    WHEN p_outs_recorded >= 3 THEN 2   -- 1+ innings (normal relief)
    ELSE 1                              -- Less than 1 inning
  END;
  
  -- Insert or update usage record
  INSERT INTO public.pitcher_usage (
    game_id,
    player_id,
    season_id,
    outs_recorded,
    runs_allowed,
    hits_allowed,
    walks_allowed,
    strikeouts,
    last_inning_pitched,
    role,
    is_available,
    rest_innings_needed
  ) VALUES (
    p_game_id,
    p_player_id,
    p_season_id,
    p_outs_recorded,
    p_runs_allowed,
    p_hits_allowed,
    p_walks_allowed,
    p_strikeouts,
    p_last_inning,
    p_role,
    false,  -- Not available immediately after pitching
    rest_needed
  )
  ON CONFLICT (game_id, player_id) DO UPDATE SET
    outs_recorded = EXCLUDED.outs_recorded,
    runs_allowed = EXCLUDED.runs_allowed,
    hits_allowed = EXCLUDED.hits_allowed,
    walks_allowed = EXCLUDED.walks_allowed,
    strikeouts = EXCLUDED.strikeouts,
    last_inning_pitched = EXCLUDED.last_inning_pitched,
    role = EXCLUDED.role,
    is_available = EXCLUDED.is_available,
    rest_innings_needed = EXCLUDED.rest_innings_needed,
    updated_at = now()
  RETURNING id INTO usage_id;
  
  RETURN usage_id;
END;
$$;

COMMENT ON FUNCTION record_pitcher_usage IS 'Records or updates pitcher usage for a game. Automatically calculates rest requirements based on workload.';
