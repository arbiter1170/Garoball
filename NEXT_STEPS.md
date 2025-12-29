# Deployment + Asset Integration Next Steps

## 1) Vercel + Supabase deployment checklist

1. **Create Supabase project**
   - Add a new project in the Supabase dashboard.
   - Record `Project URL` and `anon` public API key; generate a **service role key** for server actions.

2. **Apply DB schema to your hosted Supabase project**
   The app expects tables like `public.leagues` to exist. If you see errors like
   “Could not find the table 'public.leagues' in the schema cache”, the migrations were not applied (or PostgREST needs a schema reload).

   Option A (simplest): **Supabase Dashboard → SQL Editor**
   - Run `startomatic/supabase/migrations/0001_init.sql`
   - Run `startomatic/supabase/migrations/0002_standings_function.sql`
   - Then go to **Settings → API → Reload schema** (refreshes PostgREST schema cache)

   Option B: **Supabase CLI (hosted push)**
   - Install CLI: `npm i -g supabase`
   - Authenticate: `supabase login`
   - Link your project: `supabase link --project-ref <your-project-ref>`
   - Push migrations: `supabase db push`

3. **Run database migrations and seeds locally**
   - Install the Supabase CLI (`npm i -g supabase`).
   - Copy the repo skeleton under `garoball/` (see README) into this repo structure when implemented.
   - From the repo root, run:
     ```bash
     supabase init
     supabase db start
     supabase db reset
     supabase db seed
     ```
   - Confirm the Lahman 2024 pack, glossary, and ratings seed files are available in `supabase/seed/` before seeding.

4. **Configure environment variables (Vercel)**
   Set these in Vercel Project Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase service role key (Server Actions / API routes only)
   - `SUPABASE_JWT_SECRET` = from Supabase Settings → API
   - `APP_BASE_URL` = Vercel domain (used in emails/links)
   - `SIM_RULESET` = `basicPlus` (or desired ruleset ID)
   - `SEED_DATA_PATH` = `supabase/seed/lahman_2024_pack`
   - `GLOSSARY_PATH` = `supabase/seed/glossary.json`

5. **Configure environment variables (Supabase)**
   - Add `SITE_URL` to match your Vercel domain for Auth redirects.
   - Enable email auth and set SMTP (or use Magic Links).

6. **Vercel build settings**
   - Framework: Next.js (App Router).
   - Install command: `npm install` (or `pnpm install`).
   - Build command: `next build`.
   - Output directory: `.next`.
   - Add `SUPABASE_URL` and keys as Vercel **Encrypted** vars; never expose service key in client bundles.

7. **Post-deploy verification**
   - Create a test account, create a league, seed rosters, start a game, and simulate to completion.
   - Confirm deterministic replay by re-running a finished game with the same seed and comparing play logs.

## 2) Asset manifest + renderer workflow

We have mixed assets (tileable ground PNGs + sprite sheets with XML atlases). Use the new helper to generate a manifest your renderer can consume.

### Analyze and emit a manifest

```bash
python scripts/analyze_assets.py . --output asset_manifest.json
```

- Requires Python and Pillow (`pip install pillow`).
- Outputs `asset_manifest.json` with surfaces, spritesheets (frames + coordinates), and standalone images, ready to load in a canvas/WebGL renderer.

### Suggested renderer usage

1. **Load the manifest** and preload the referenced PNGs.
2. **Surfaces**: treat entries under `surfaces` as background tiles (e.g., choose `groundGrass_mown.png` for outfield, `groundBeige_red.png` for infield cutouts).
3. **Spritesheets**: each entry contains `file`, `dimensions`, and `frames` (`name`, `x`, `y`, `width`, `height`). Use these to build `Texture` objects and frame-based animations (e.g., `characterBlue (1–10)` for running cycles; `characterBlue (11–14)` for batting/fielding overlays).
4. **Standalone images**: fall back to `images` for elements that are not in XML atlases (e.g., `elements.png`).
5. **Coordinate system**: the XML coordinates match the PNG origin at the top-left. Use `x`, `y`, `width`, `height` directly when copying into sprite atlases or Canvas draw calls.

### Updating assets later

- Drop new PNG/XML pairs into the repo root (or specify a directory) and rerun the analyzer to refresh the manifest.
- The script skips duplicate PNGs already referenced by ground tiles or sprite sheets.

## 3) Operational next steps

- Add CI to lint, type-check, and run determinism tests once the codebase is present.
- Protect secrets: restrict the Supabase service role key to server-side usage only.
- Schedule periodic reseeds from Lahman updates; keep versioned packs under `supabase/seed/`.
- Document renderer expectations in the future `components/game/FieldCanvas.tsx` once implemented, referencing the manifest structure above.
