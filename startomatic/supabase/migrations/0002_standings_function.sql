-- Supabase stored procedure to update standings after a game
-- Run this in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION update_standing(
  p_season_id UUID,
  p_team_id UUID,
  p_won BOOLEAN,
  p_runs_for INTEGER,
  p_runs_against INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE standings
  SET
    wins = wins + CASE WHEN p_won THEN 1 ELSE 0 END,
    losses = losses + CASE WHEN p_won THEN 0 ELSE 1 END,
    runs_for = runs_for + p_runs_for,
    runs_against = runs_against + p_runs_against,
    games_played = games_played + 1,
    updated_at = NOW()
  WHERE season_id = p_season_id AND team_id = p_team_id;
  
  -- If no row was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO standings (season_id, team_id, wins, losses, runs_for, runs_against, games_played)
    VALUES (
      p_season_id, 
      p_team_id, 
      CASE WHEN p_won THEN 1 ELSE 0 END,
      CASE WHEN p_won THEN 0 ELSE 1 END,
      p_runs_for,
      p_runs_against,
      1
    );
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_standing TO authenticated;
GRANT EXECUTE ON FUNCTION update_standing TO service_role;
