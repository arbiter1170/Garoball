# AGENTS.md - AI Agent Guidelines for Garoball

This document provides guidance for AI agents working on the Garoball codebase.

## Project Overview

**Garoball** is a web-based baseball simulation game built with:
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Backend**: Supabase (Auth, Postgres, RLS)
- **Styling**: Tailwind CSS
- **Testing**: Vitest

## Directory Structure

```
startomatic/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── api/               # API routes
│   ├── dashboard/         # Main dashboard
│   ├── games/             # Game views
│   ├── leagues/           # League management
│   └── mlb/               # MLB data browser
├── components/            # React components
├── data/                  # Static data (samplePlayers, glossary)
├── lib/                   # Core logic
│   ├── baserunning.ts     # Base advancement rules
│   ├── probabilities.ts   # Outcome probability calculations
│   ├── rng.ts             # Seeded RNG for determinism
│   ├── simulation.ts      # Game simulation engine
│   └── supabase/          # Supabase clients (+ mock mode)
├── scripts/               # Database seeding scripts
├── __tests__/             # Vitest test files
└── types/                 # TypeScript types
```

## Development Modes

### Mock Mode (No Backend Required)
Set `NEXT_PUBLIC_USE_MOCK=true` in `.env.local` to use mock data:
- Auto-authenticates as demo user
- Returns static leagues, teams, players
- Ideal for UI development and testing

### Live Mode (Requires Supabase)
Requires valid Supabase credentials in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Run ESLint

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once

# Database (requires Supabase)
npm run seed             # Seed demo data
npm run seed:lahman      # Seed Lahman MLB data
npm run smoke:db         # Test DB connection
```

## Key Patterns

### Simulation Engine
The core game logic is in `lib/simulation.ts`:
- `initializeGame()` - Create new game state
- `simulatePlateAppearance()` - Resolve one PA
- `applyPlateAppearance()` - Update game state
- `simulateFullGame()` - Run complete game

### Deterministic RNG
Games are reproducible via seeded RNG (`lib/rng.ts`):
- Each game has a `seed` stored in DB
- Same seed = same dice rolls = same outcome
- Critical for replay and debugging

### Protected Routes
Middleware protects `/dashboard`, `/leagues`, `/games`:
- Unauthenticated users redirect to `/login`
- In mock mode, all users are auto-authenticated

## Testing Guidelines

1. **Run tests before committing**: `npm run test:run`
2. **All 52 tests must pass**
3. **Test files mirror source**: `lib/simulation.ts` → `__tests__/simulation.test.ts`
4. **Use mock ratings for tests** (see `simulation.test.ts` for patterns)

## Code Style

- Use TypeScript strict mode
- Prefer async/await over .then()
- Document complex functions with JSDoc
- Keep components focused (single responsibility)

## Important Files

| File | Purpose |
|------|---------|
| `lib/simulation.ts` | Core game engine |
| `lib/probabilities.ts` | Outcome calculations |
| `lib/supabase/mock.ts` | Mock mode for dev |
| `app/dashboard/page.tsx` | Main dashboard UI |
| `scripts/seed.ts` | Database seeding |
