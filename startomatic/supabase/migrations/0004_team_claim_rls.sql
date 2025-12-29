-- Team claiming RLS policies
--
-- Allows authenticated users to claim an unowned team (owner_id is null)
-- and allows authenticated users to create their own team in a league.

-- Claim unowned team by setting owner_id = auth.uid()

drop policy if exists "Authenticated users can claim unowned teams" on public.teams;

create policy "Authenticated users can claim unowned teams" on public.teams
  for update to authenticated
  using (owner_id is null)
  with check (owner_id = auth.uid());

-- Allow authenticated users to create their own team, one per league.
-- (The existing commissioner policy remains and still works.)

drop policy if exists "Authenticated users can create own teams" on public.teams;

create policy "Authenticated users can create own teams" on public.teams
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and not exists (
      select 1
      from public.teams t
      where t.league_id = league_id
        and t.owner_id = auth.uid()
    )
  );
