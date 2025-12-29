// Database types for Startomatic 2D MVP

export type Outcome = 'K' | 'BB' | 'OUT' | '1B' | '2B' | '3B' | 'HR'
export type InningHalf = 'top' | 'bottom'
export type GameStatus = 'scheduled' | 'in_progress' | 'completed'
export type SeasonStatus = 'setup' | 'active' | 'completed'
export type Handedness = 'L' | 'R' | 'S'
export type RatingType = 'batting' | 'pitching'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface League {
  id: string
  name: string
  commissioner_id: string | null
  settings: LeagueSettings
  created_at: string
  updated_at: string
}

export interface LeagueSettings {
  dh_enabled?: boolean
  games_per_matchup?: number
  innings_per_game?: number
}

export interface Team {
  id: string
  league_id: string
  owner_id: string | null
  name: string
  abbreviation: string
  city: string | null
  primary_color: string
  secondary_color: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  lahman_player_id: string | null
  first_name: string
  last_name: string
  birth_date: string | null
  bats: Handedness | null
  throws: Handedness | null
  primary_position: string | null
  debut_year: number | null
  final_year: number | null
  created_at: string
}

export interface PlayerRating {
  id: string
  player_id: string
  year: number
  rating_type: RatingType
  stats: BattingStats | PitchingStats
  p_k: number
  p_bb: number
  p_1b: number
  p_2b: number
  p_3b: number
  p_hr: number
  p_out: number
  dice_table: number[]
  fatigue_threshold: number | null
  created_at: string
}

export interface BattingStats {
  pa: number
  ab: number
  h: number
  '2b': number
  '3b': number
  hr: number
  bb: number
  so: number
  avg: number
  slg: number
  iso: number
  babip: number
  k_pct: number
  bb_pct: number
}

export interface PitchingStats {
  ip_outs: number
  h: number
  hr: number
  bb: number
  so: number
  k_pct: number
  bb_pct: number
  era: number
  whip: number
}

export interface Roster {
  id: string
  team_id: string
  season_id: string | null
  player_id: string
  position: string | null
  jersey_number: number | null
  is_active: boolean
  created_at: string
}

export interface Season {
  id: string
  league_id: string
  name: string
  year: number
  status: SeasonStatus
  settings: SeasonSettings
  schedule: ScheduleGame[]
  created_at: string
  updated_at: string
}

export interface SeasonSettings {
  games_per_matchup?: number
}

export interface ScheduleGame {
  home_team_id: string
  away_team_id: string
  game_number: number
}

export interface Game {
  id: string
  season_id: string
  home_team_id: string
  away_team_id: string
  game_number: number
  status: GameStatus
  inning: number
  half: InningHalf
  outs: number
  home_score: number
  away_score: number
  runner_1b: string | null
  runner_2b: string | null
  runner_3b: string | null
  current_batter_idx: number
  current_pitcher_id: string | null
  pitcher_outs: number
  home_lineup: string[]
  away_lineup: string[]
  home_pitchers: string[]
  away_pitchers: string[]
  seed: string
  rng_state: RngState | null
  box_score: BoxScore
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface RngState {
  callCount: number
}

export interface BoxScore {
  home: TeamBoxScore
  away: TeamBoxScore
}

export interface TeamBoxScore {
  innings: number[]
  hits: number
  errors: number
  batting: Record<string, PlayerBattingLine>
  pitching: Record<string, PlayerPitchingLine>
}

export interface PlayerBattingLine {
  ab: number
  r: number
  h: number
  rbi: number
  bb: number
  so: number
  '2b': number
  '3b': number
  hr: number
}

export interface PlayerPitchingLine {
  ip_outs: number
  h: number
  r: number
  er: number
  bb: number
  so: number
  hr: number
}

export interface Play {
  id: string
  game_id: string
  play_number: number
  inning: number
  half: InningHalf
  outs_before: number
  runner_1b_before: string | null
  runner_2b_before: string | null
  runner_3b_before: string | null
  home_score_before: number
  away_score_before: number
  batter_id: string
  pitcher_id: string
  outcome: Outcome
  runs_scored: number
  dice_values: [number, number, number]
  dice_index: number
  batter_probs: OutcomeProbabilities
  pitcher_probs: OutcomeProbabilities
  blended_probs: OutcomeProbabilities
  dice_table_ranges: DiceTableRanges
  explanation: string
  created_at: string
}

export interface OutcomeProbabilities {
  K: number
  BB: number
  OUT: number
  '1B': number
  '2B': number
  '3B': number
  HR: number
}

export interface DiceTableRanges {
  K: [number, number]
  BB: [number, number]
  OUT: [number, number]
  '1B': [number, number]
  '2B': [number, number]
  '3B': [number, number]
  HR: [number, number]
}

export interface Standing {
  id: string
  season_id: string
  team_id: string
  wins: number
  losses: number
  runs_for: number
  runs_against: number
  games_played: number
  updated_at: string
}

export interface GlossaryEntry {
  id: string
  term: string
  abbreviation: string | null
  category: string | null
  short_description: string
  long_description: string | null
  formula: string | null
  example: string | null
  created_at: string
}

// Joined types for UI
export interface TeamWithRoster extends Team {
  roster: (Roster & { player: Player; rating?: PlayerRating })[]
}

export interface GameWithTeams extends Game {
  home_team: Team
  away_team: Team
}

export interface PlayWithPlayers extends Play {
  batter: Player
  pitcher: Player
}

export interface StandingWithTeam extends Standing {
  team: Team
  win_pct: number
  games_back: number
}
