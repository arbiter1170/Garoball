-- Gameplay RLS policies
--
-- The MVP app currently creates games and writes plays using authenticated user sessions.
-- The initial schema commented "service role only" but did not include policies for those writes,
-- which causes "new row violates row-level security policy" errors on hosted Supabase.

-- GAMES: allow commissioner (and optionally team owners) to write

drop policy if exists "Commissioners can create games" on public.games;
drop policy if exists "Commissioners or team owners can update games" on public.games;

create policy "Commissioners can create games" on public.games
  for insert to authenticated
  with check (
    auth.uid() = (
      select l.commissioner_id
      from public.seasons s
      join public.leagues l on l.id = s.league_id
      where s.id = season_id
    )
  );

create policy "Commissioners or team owners can update games" on public.games
  for update to authenticated
  using (
    auth.uid() = (
      select l.commissioner_id
      from public.seasons s
      join public.leagues l on l.id = s.league_id
      where s.id = season_id
    )
    or auth.uid() = (select owner_id from public.teams where id = home_team_id)
    or auth.uid() = (select owner_id from public.teams where id = away_team_id)
  )
  with check (
    auth.uid() = (
      select l.commissioner_id
      from public.seasons s
      join public.leagues l on l.id = s.league_id
      where s.id = season_id
    )
    or auth.uid() = (select owner_id from public.teams where id = home_team_id)
    or auth.uid() = (select owner_id from public.teams where id = away_team_id)
  );

-- PLAYS: allow commissioner/team owners to insert play log rows

drop policy if exists "Commissioners or team owners can insert plays" on public.plays;

create policy "Commissioners or team owners can insert plays" on public.plays
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.games g
      join public.seasons s on s.id = g.season_id
      join public.leagues l on l.id = s.league_id
      where g.id = plays.game_id
        and (
          l.commissioner_id = auth.uid()
          or auth.uid() = (select owner_id from public.teams where id = g.home_team_id)
          or auth.uid() = (select owner_id from public.teams where id = g.away_team_id)
        )
    )
  );
