# Authentication and User Persistence Setup

## Overview

This document explains the authentication system and how to configure proper user persistence for Garoball.

## Problem Fixed

Previously, the application was hardcoded to run in "mock mode" where:
- All users were treated as the same demo user
- No real authentication was performed
- All games and data were shared across all users
- No user-specific data isolation

## Solution

We've restored proper authentication by:
1. Removing the hardcoded `return true` from `isMockMode()` functions
2. Making mock mode controllable via `NEXT_PUBLIC_USE_MOCK` environment variable
3. Ensuring proper Supabase client configuration when not in mock mode

## Configuration

### For Development with Supabase

1. **Create a Supabase project** at https://supabase.com

2. **Apply database migrations**:
   ```bash
   cd startomatic
   supabase link --project-ref your-project-ref
   supabase db push
   ```
   
   Or manually in Supabase Dashboard → SQL Editor:
   - Run `supabase/migrations/0001_init.sql`
   - Run `supabase/migrations/0002_standings_function.sql`
   - Run `supabase/migrations/0003_gameplay_rls.sql`
   - Run `supabase/migrations/0004_team_claim_rls.sql`
   - Run `supabase/migrations/0005_game_settings.sql`
   - Run `supabase/migrations/0006_league_game_defaults.sql`
   - Run `supabase/migrations/0007_pitcher_tracking.sql`
   - Then: Settings → API → Reload schema

3. **Configure environment variables**:
   Create `.env.local` file:
   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   
   # Disable mock mode for real auth
   NEXT_PUBLIC_USE_MOCK=false
   
   # App settings
   APP_BASE_URL=http://localhost:3000
   SIM_RULESET=basicPlus
   SEED_DATA_PATH=supabase/seed/lahman_2024_pack
   GLOSSARY_PATH=supabase/seed/glossary.json
   ```

4. **Enable authentication in Supabase**:
   - Dashboard → Authentication → Providers
   - Enable Email provider
   - Optionally enable OAuth (Google, GitHub)
   - Set Site URL to your app URL

5. **Start the app**:
   ```bash
   npm run dev
   ```

### For Development with Mock Mode (No Supabase)

If you want to develop without a Supabase backend:

1. **Configure environment**:
   Create `.env.local` file:
   ```bash
   # Enable mock mode
   NEXT_PUBLIC_USE_MOCK=true
   
   # Mock Supabase values (won't be used but Next.js requires them)
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-key
   ```

2. **Start the app**:
   ```bash
   npm run dev
   ```

**Important**: In mock mode:
- All users share the same demo account
- No real authentication occurs
- Data is not persisted between restarts
- Not suitable for production or multi-user testing

### For Production Deployment (Vercel)

1. **Set environment variables in Vercel**:
   - Project Settings → Environment Variables
   - Add all Supabase credentials
   - Set `NEXT_PUBLIC_USE_MOCK=false`

2. **Configure Supabase for production**:
   - Add your Vercel domain to Supabase → Authentication → URL Configuration
   - Set redirect URLs for OAuth

## User Data Isolation

The application uses Row Level Security (RLS) policies to ensure data isolation:

- **Teams**: Users can only modify teams they own or commission
- **Games**: Games are visible to users whose teams are playing
- **Leagues**: Users can only modify leagues they commission
- **Profiles**: Users can only modify their own profile

## Authentication Flow

1. **Sign Up** (`/signup`):
   - User creates account with email/password or OAuth
   - Profile is automatically created via database trigger
   - User is redirected to dashboard

2. **Sign In** (`/login`):
   - User authenticates with email/password or OAuth
   - Session is established with Supabase
   - Middleware validates session on protected routes
   - User is redirected to dashboard

3. **Sign Out**:
   - User clicks "Sign Out"
   - Session is terminated
   - User is redirected to login page

4. **Session Persistence**:
   - Sessions are stored in HTTP-only cookies
   - Middleware refreshes sessions automatically
   - Protected routes redirect to login if not authenticated

## Troubleshooting

### "Application error: a server-side exception has occurred"

This error typically means:
- Supabase credentials are not configured
- Database migrations have not been applied
- Mock mode is enabled but shouldn't be
- Profile doesn't exist for the user

**Solution**:
1. Verify environment variables are set correctly
2. Check that `NEXT_PUBLIC_USE_MOCK=false` in production
3. Apply all database migrations
4. Check Supabase logs for specific errors

### "Could not find the table 'public.leagues' in the schema cache"

**Solution**:
1. Apply database migrations
2. Reload schema in Supabase: Settings → API → Reload schema

### Users seeing other users' games

This means mock mode is enabled. Set `NEXT_PUBLIC_USE_MOCK=false` and configure proper Supabase credentials.

### OAuth redirect not working

**Solution**:
1. Add your domain to Supabase → Authentication → URL Configuration
2. Ensure Site URL matches your deployment URL
3. Check OAuth provider configuration

## Testing Authentication

To test the authentication system:

1. **Create a test account** at `/signup`
2. **Verify you can log in** at `/login`
3. **Create a league** - it should be associated with your user
4. **Create teams** - they should be owned by your user
5. **Log out and create another account**
6. **Verify the first user's data is not visible** to the second user

## Migration from Mock Mode

If you've been running in mock mode and want to switch to real authentication:

1. **Set up Supabase** as described above
2. **Change environment variable**: `NEXT_PUBLIC_USE_MOCK=false`
3. **Restart the application**
4. **Create new accounts** - mock data will not be migrated
5. **Users will need to create new leagues and games**

Note: There is no automatic migration path from mock data to real data.
