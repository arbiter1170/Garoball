-- Startomatic 2D - MVP Database Schema
-- Run with: supabase db reset

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- USERS / PROFILES
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================
-- LEAGUES
-- ============================================
create table public.leagues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  commissioner_id uuid references public.profiles(id) on delete set null,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_leagues_commissioner on public.leagues(commissioner_id);

-- ============================================
-- TEAMS
-- ============================================
create table public.teams (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid references public.leagues(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  abbreviation text not null,
  city text,
  primary_color text default '#1e40af',
  secondary_color text default '#ffffff',
  logo_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(league_id, abbreviation)
);

create index idx_teams_league on public.teams(league_id);
create index idx_teams_owner on public.teams(owner_id);

-- ============================================
-- PLAYERS (Master player data from Lahman)
-- ============================================
create table public.players (
  id uuid primary key default uuid_generate_v4(),
  lahman_player_id text unique,
  first_name text not null,
  last_name text not null,
  birth_date date,
  bats text check (bats in ('L', 'R', 'S')),
  throws text check (throws in ('L', 'R')),
  primary_position text,
  debut_year integer,
  final_year integer,
  created_at timestamptz default now() not null
);

create index idx_players_lahman_id on public.players(lahman_player_id);
create index idx_players_name on public.players(last_name, first_name);

-- ============================================
-- PLAYER RATINGS (Per-year dice table)
-- ============================================
create table public.player_ratings (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid references public.players(id) on delete cascade not null,
  year integer not null,
  rating_type text not null check (rating_type in ('batting', 'pitching')),
  
  -- Raw stats from Lahman (for display)
  stats jsonb not null default '{}'::jsonb,
  
  -- Computed outcome probabilities (0-1)
  p_k numeric(6,5) default 0,
  p_bb numeric(6,5) default 0,
  p_1b numeric(6,5) default 0,
  p_2b numeric(6,5) default 0,
  p_3b numeric(6,5) default 0,
  p_hr numeric(6,5) default 0,
  p_out numeric(6,5) default 0,
  
  -- Dice table (216 slots mapped to outcomes)
  dice_table integer[] not null default '{}',
  
  -- Fatigue threshold for pitchers (IPouts)
  fatigue_threshold integer,
  
  created_at timestamptz default now() not null,
  unique(player_id, year, rating_type)
);

create index idx_player_ratings_player on public.player_ratings(player_id);
create index idx_player_ratings_year on public.player_ratings(year);

-- ============================================
-- ROSTERS (Team-Player assignment per season)
-- ============================================
create table public.rosters (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id) on delete cascade not null,
  season_id uuid,  -- Will reference seasons table
  player_id uuid references public.players(id) on delete cascade not null,
  position text,
  jersey_number integer,
  is_active boolean default true,
  created_at timestamptz default now() not null,
  unique(team_id, season_id, player_id)
);

create index idx_rosters_team on public.rosters(team_id);
create index idx_rosters_player on public.rosters(player_id);

-- ============================================
-- SEASONS
-- ============================================
create table public.seasons (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid references public.leagues(id) on delete cascade not null,
  name text not null,
  year integer not null,
  status text default 'setup' check (status in ('setup', 'active', 'completed')),
  settings jsonb default '{}'::jsonb,
  schedule jsonb default '[]'::jsonb,  -- Array of {home_team_id, away_team_id, game_number}
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_seasons_league on public.seasons(league_id);

-- Add foreign key from rosters to seasons
alter table public.rosters 
  add constraint fk_rosters_season 
  foreign key (season_id) references public.seasons(id) on delete cascade;

-- ============================================
-- GAMES
-- ============================================
create table public.games (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid references public.seasons(id) on delete cascade not null,
  home_team_id uuid references public.teams(id) on delete cascade not null,
  away_team_id uuid references public.teams(id) on delete cascade not null,
  game_number integer not null,
  
  -- Game state
  status text default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed')),
  inning integer default 1,
  half text default 'top' check (half in ('top', 'bottom')),
  outs integer default 0,
  
  -- Score
  home_score integer default 0,
  away_score integer default 0,
  
  -- Base runners (player_id or null)
  runner_1b uuid references public.players(id),
  runner_2b uuid references public.players(id),
  runner_3b uuid references public.players(id),
  
  -- Current matchup
  current_batter_idx integer default 0,
  current_pitcher_id uuid references public.players(id),
  pitcher_outs integer default 0,
  
  -- Lineups (stored as JSON arrays of player_ids)
  home_lineup jsonb default '[]'::jsonb,
  away_lineup jsonb default '[]'::jsonb,
  home_pitchers jsonb default '[]'::jsonb,
  away_pitchers jsonb default '[]'::jsonb,
  
  -- RNG seed for deterministic replay
  seed text not null,
  rng_state jsonb,
  
  -- Box score data
  box_score jsonb default '{}'::jsonb,
  
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  completed_at timestamptz
);

create index idx_games_season on public.games(season_id);
create index idx_games_teams on public.games(home_team_id, away_team_id);
create index idx_games_status on public.games(status);

-- ============================================
-- PLAYS (Event log for each plate appearance)
-- ============================================
create table public.plays (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references public.games(id) on delete cascade not null,
  play_number integer not null,
  
  -- State before play
  inning integer not null,
  half text not null,
  outs_before integer not null,
  runner_1b_before uuid references public.players(id),
  runner_2b_before uuid references public.players(id),
  runner_3b_before uuid references public.players(id),
  home_score_before integer not null,
  away_score_before integer not null,
  
  -- Participants
  batter_id uuid references public.players(id) not null,
  pitcher_id uuid references public.players(id) not null,
  
  -- Outcome
  outcome text not null check (outcome in ('K', 'BB', 'OUT', '1B', '2B', '3B', 'HR')),
  runs_scored integer default 0,
  
  -- Dice roll
  dice_values integer[] not null,  -- [d1, d2, d3]
  dice_index integer not null,     -- 0-215
  
  -- Explainability
  batter_probs jsonb not null,
  pitcher_probs jsonb not null,
  blended_probs jsonb not null,
  dice_table_ranges jsonb not null,
  explanation text not null,
  
  created_at timestamptz default now() not null,
  unique(game_id, play_number)
);

create index idx_plays_game on public.plays(game_id);
create index idx_plays_batter on public.plays(batter_id);
create index idx_plays_pitcher on public.plays(pitcher_id);

-- ============================================
-- STANDINGS (Materialized view or table)
-- ============================================
create table public.standings (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid references public.seasons(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  wins integer default 0,
  losses integer default 0,
  runs_for integer default 0,
  runs_against integer default 0,
  games_played integer default 0,
  updated_at timestamptz default now() not null,
  unique(season_id, team_id)
);

create index idx_standings_season on public.standings(season_id);

-- ============================================
-- GLOSSARY (Static reference data)
-- ============================================
create table public.glossary (
  id uuid primary key default uuid_generate_v4(),
  term text unique not null,
  abbreviation text,
  category text,
  short_description text not null,
  long_description text,
  formula text,
  example text,
  created_at timestamptz default now() not null
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.player_ratings enable row level security;
alter table public.rosters enable row level security;
alter table public.seasons enable row level security;
alter table public.games enable row level security;
alter table public.plays enable row level security;
alter table public.standings enable row level security;
alter table public.glossary enable row level security;

-- Profiles: users can read all, update own
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Leagues: readable by authenticated, writable by commissioner
create policy "Leagues are viewable by authenticated users" on public.leagues
  for select to authenticated using (true);
create policy "Commissioners can update their leagues" on public.leagues
  for update using (auth.uid() = commissioner_id);
create policy "Authenticated users can create leagues" on public.leagues
  for insert to authenticated with check (true);

-- Teams: readable by authenticated, writable by owner or commissioner
create policy "Teams are viewable by authenticated users" on public.teams
  for select to authenticated using (true);
create policy "Team owners or commissioners can update teams" on public.teams
  for update using (
    auth.uid() = owner_id or 
    auth.uid() = (select commissioner_id from public.leagues where id = league_id)
  );
create policy "Commissioners can create teams" on public.teams
  for insert to authenticated with check (
    auth.uid() = (select commissioner_id from public.leagues where id = league_id)
  );

-- Players & Ratings: readable by all, writable by service role only
create policy "Players are viewable by everyone" on public.players
  for select using (true);
create policy "Player ratings are viewable by everyone" on public.player_ratings
  for select using (true);

-- Rosters: readable by authenticated, writable by team owner/commissioner
create policy "Rosters are viewable by authenticated users" on public.rosters
  for select to authenticated using (true);
create policy "Team owners can manage rosters" on public.rosters
  for all using (
    auth.uid() = (select owner_id from public.teams where id = team_id) or
    auth.uid() = (select l.commissioner_id from public.leagues l 
                  join public.teams t on t.league_id = l.id where t.id = team_id)
  );

-- Seasons: readable by league members
create policy "Seasons are viewable by authenticated users" on public.seasons
  for select to authenticated using (true);
create policy "Commissioners can manage seasons" on public.seasons
  for all using (
    auth.uid() = (select commissioner_id from public.leagues where id = league_id)
  );

-- Games: readable by authenticated
create policy "Games are viewable by authenticated users" on public.games
  for select to authenticated using (true);
-- Games writable by service role only (server-side sim)

-- Plays: readable by authenticated
create policy "Plays are viewable by authenticated users" on public.plays
  for select to authenticated using (true);
-- Plays writable by service role only

-- Standings: readable by authenticated
create policy "Standings are viewable by authenticated users" on public.standings
  for select to authenticated using (true);

-- Glossary: readable by everyone
create policy "Glossary is viewable by everyone" on public.glossary
  for select using (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to update standings after game completion
create or replace function public.update_standings_after_game()
returns trigger as $$
begin
  if new.status = 'completed' and old.status != 'completed' then
    -- Update home team
    insert into public.standings (season_id, team_id, wins, losses, runs_for, runs_against, games_played)
    values (
      new.season_id,
      new.home_team_id,
      case when new.home_score > new.away_score then 1 else 0 end,
      case when new.home_score < new.away_score then 1 else 0 end,
      new.home_score,
      new.away_score,
      1
    )
    on conflict (season_id, team_id) do update set
      wins = standings.wins + case when new.home_score > new.away_score then 1 else 0 end,
      losses = standings.losses + case when new.home_score < new.away_score then 1 else 0 end,
      runs_for = standings.runs_for + new.home_score,
      runs_against = standings.runs_against + new.away_score,
      games_played = standings.games_played + 1,
      updated_at = now();
      
    -- Update away team
    insert into public.standings (season_id, team_id, wins, losses, runs_for, runs_against, games_played)
    values (
      new.season_id,
      new.away_team_id,
      case when new.away_score > new.home_score then 1 else 0 end,
      case when new.away_score < new.home_score then 1 else 0 end,
      new.away_score,
      new.home_score,
      1
    )
    on conflict (season_id, team_id) do update set
      wins = standings.wins + case when new.away_score > new.home_score then 1 else 0 end,
      losses = standings.losses + case when new.away_score < new.home_score then 1 else 0 end,
      runs_for = standings.runs_for + new.away_score,
      runs_against = standings.runs_against + new.home_score,
      games_played = standings.games_played + 1,
      updated_at = now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for game completion
create trigger on_game_completed
  after update on public.games
  for each row execute function public.update_standings_after_game();

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger update_leagues_updated_at before update on public.leagues
  for each row execute function public.update_updated_at();
create trigger update_teams_updated_at before update on public.teams
  for each row execute function public.update_updated_at();
create trigger update_seasons_updated_at before update on public.seasons
  for each row execute function public.update_updated_at();
create trigger update_games_updated_at before update on public.games
  for each row execute function public.update_updated_at();
