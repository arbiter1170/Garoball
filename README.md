# Garoball — Full MVP Spec Sheet (v0.1)

## Locked MVP Decisions

- **Seeded dataset:** [Lahman Database](https://sabr.org/lahman-database/) — complete batting, pitching, and fielding stats from 1871–2024.
- **Ruleset v0.1 outcomes (only):** `{K, BB, OUT, 1B, 2B, 3B, HR}`
- **Glossary:** ship `glossary.json` on day 1 with tooltips on every stat label.
- **Simulation mode:** plate-appearance resolution (no pitch-by-pitch in MVP).

---

## 1) Product Summary

**Goal:** modern web-based Strat-style baseball simulator where users create accounts, manage lineups/rotations, and simulate full seasons with “dice + player cards” outcomes while watching the action on a readable 2D field.

**North Star:** “Fast, explainable season sims with tactile dice/card drama + a clean 2D on-field view.”

**MVP success criteria:**

- New user can go **signup → league → start season → simulate game** in under 3 minutes.
- Game results are **deterministic & replayable** (same seed = same game).
- Every play is **explainable** (dice + mapping + why).

---

## 2) MVP Scope

### Must-have user flows
1. **Auth:** sign up / sign in (Supabase Auth)
2. **League setup:** create league → create teams
3. **Roster setup:** assign rosters from seeded dataset (initially via “Import Pack: Lahman 2024”)
4. **Lineups:** set batting order + starting pitcher (+ bullpen list)
5. **Game:** start game, step one PA at a time (watch mode), or sim to completion
6. **Season:** generate schedule, sim one game or entire season, view standings
7. **Views:** 2D field + play-by-play log, box score, team page (roster + stats), player card page (stats + dice table)
8. **Glossary:** tooltips on cards, full glossary drawer/modal + search

### Not in MVP
- Pitch-by-pitch and pitch types
- Steals, bunts, hit-and-run, defensive shifts
- Park/weather, injuries, trades, minors, drafts
- Multiplayer leagues

---

## 3) Ruleset v0.1 (Locked)

### Outcomes
`K, BB, OUT, 1B, 2B, 3B, HR`

### Base-running (deterministic MVP)
| Result | Runner on 3B | Runner on 2B | Runner on 1B | Batter |
| ------ | ------------- | ------------- | ------------- | ------ |
| K      | No advance    | No advance    | No advance    | Out    |
| BB     | Scores only if forced | Advances only if forced | Advances only if forced | To 1B |
| OUT    | No advance    | No advance    | No advance    | Out    |
| 1B     | Scores        | To 3B         | To 2B         | To 1B  |
| 2B     | Scores        | Scores        | To 3B         | To 2B  |
| 3B     | Scores        | Scores        | Scores        | To 3B  |
| HR     | Scores        | Scores        | Scores        | Scores |

Lineup rules: 9 hitters, DH enabled by default, pitcher fatigue via threshold penalty.

---

## 4) Data Pack: Lahman 2024 Seeding

- Seed players, batting, pitching, teams in `/supabase/seed/lahman_2024_pack/`.
- Treat Lahman 2024 as canonical playable data; add ingestion options later.
- Starter `glossary.json` shipped with core stats definitions.

---

## 5) Player Cards

### Batter card
- Back-of-card stats: PA, AB, H, 2B, 3B, HR, BB, SO, AVG, SLG, ISO, BABIP, K%, BB%.
- Outcome probabilities derived per PA (1B, 2B, 3B, HR, BB, K, OUT with pOUT as remainder).

### Pitcher card
- Back-of-card stats: IP (from IPouts), H, HR, BB, SO, K%, BB%.
- Effect profile uses per-out scaling; fatigue reduces K and raises BB/HR after threshold.

---

## 6) Matchup Engine (PA resolution + dice)

1. Compute league-average rates for the year.
2. Compute batter and pitcher rates.
3. Blend via log-odds (logit) with weights `wB = 0.65`, `wP = 0.35` against league baseline.
4. Set `pOUT = 1 - sum(p_final buckets)` and clamp/renormalize.
5. Dice mapping: 3d6 → 216 slots using largest-remainder allocation; `idx = (d1-1)*36 + (d2-1)*6 + (d3-1)`.
6. Store dice values, idx, table ranges, final outcome, and generate explainability strings for each play.

---

## 7) Glossary + Tooltips

- Hover any stat label for a 1-line tooltip; click to open glossary drawer with definition, formula, and notes.
- Seed `glossary.json` with MLB definitions for K%, BB%, BABIP, ISO, SLG, PA, and outcome terms.

---

## 8) System Architecture

- **Frontend:** Next.js (App Router) on Vercel with 2D `FieldCanvas`, dice tray, cards with tooltips, play-by-play log, box score.
- **Backend:** Supabase Postgres + Auth, server-side sim endpoints, event-sourced game logs.

---

## 9) Database Schema (MVP)

Tables: leagues, teams, players, player_ratings, rosters, seasons, games. Event sourcing via plays and dice_rolls, with game_state snapshot. RLS: league data readable by commissioner/owners; plays/dice/game_state writable only by server role.

---

## 10) API Endpoints (MVP)

- `POST /api/leagues` create league
- `POST /api/seasons` create season + schedule
- `POST /api/games/:id/start`
- `POST /api/games/:id/step`
- `POST /api/games/:id/sim`
- `POST /api/seasons/:id/sim`
- `GET /api/games/:id` (state + last N plays)
- `GET /api/standings?season_id=...`
- `GET /api/players/:id/card?year=2024`

---

## 11) Repo Skeleton

```
garoball/
  app/
    (auth)/
      login/page.tsx
      signup/page.tsx
    dashboard/page.tsx

    leagues/
      page.tsx
      new/page.tsx
      [leagueId]/
        page.tsx
        teams/page.tsx
        seasons/page.tsx
        settings/page.tsx

    seasons/
      [seasonId]/
        page.tsx
        teams/[teamId]/page.tsx
        players/[playerId]/page.tsx

    games/
      [gameId]/
        page.tsx
        boxscore/page.tsx

    api/
      leagues/route.ts
      seasons/route.ts
      standings/route.ts
      games/[gameId]/route.ts
      games/[gameId]/start/route.ts
      games/[gameId]/step/route.ts
      games/[gameId]/sim/route.ts
      seasons/[seasonId]/sim/route.ts

  components/
    game/
      FieldCanvas.tsx
      DiceTray.tsx
      PlayByPlay.tsx
      BatterCard.tsx
      PitcherCard.tsx
    tables/
      StandingsTable.tsx
      ScheduleTable.tsx
    glossary/
      GlossaryDrawer.tsx
      StatTooltip.tsx

  lib/
    simulation.ts        # Core game simulation engine
    baserunning.ts       # Runner advancement logic
    probabilities.ts     # Outcome probability calculations
    rng.ts               # Seeded RNG for determinism
    index.ts             # Library exports
    supabase/
      client.ts          # Browser Supabase client
      server.ts          # Server Supabase client
      middleware.ts      # Auth middleware
      mock.ts            # Mock client for dev (no backend)

  data/
    samplePlayers.ts     # Sample player data for seeding
    glossary.ts          # Stat glossary definitions
    index.ts

  supabase/
    migrations/
      0001_init.sql
      0002_standings_function.sql
    seed/
      lahman_2024_pack/...
      glossary.json

  scripts/
    seed.ts              # Main seed script
    seedLahman.ts        # Lahman data import
    buildRatingsFromLahman.ts
    smokeDb.ts           # DB connection test

  __tests__/
    simulation.test.ts
    baserunning.test.ts
    probabilities.test.ts
    rng.test.ts
    stats_wiring.test.ts
```

---

## 12) Quality and Determinism

- Each game has a stored seed; plays and dice rolls are logged for replayability.
- Invariants: outs never exceed three in a half inning, bases never hold multiple runners, score never decreases, replaying with same seed reproduces plays.
- Performance: sim endpoints server-side only; batch writes for plays/dice; standings incremental or via materialized view later.

---

## 13) Delivery Plan

1. DB + Auth + RLS
2. Seed Lahman 2024 + buildRatingsFromLahman
3. Sim engine (PA step + sim-to-end + event log)
4. Game UI (field + log + dice + cards)
5. Season sim (schedule + standings + team/player pages)
6. Glossary drawer + tooltips wired throughout

---

_Last updated from provided Garoball MVP spec sheet v0.1._
