// Smoke test against a real (hosted) Supabase DB.
// Requires SERVICE ROLE key because it reads across tables.
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run smoke:db
import { loadScriptEnv } from "./_env";

loadScriptEnv();

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function hasKeys(obj: any, keys: string[]) {
  return obj && typeof obj === 'object' && keys.every(k => k in obj)
}

async function main() {
  console.log('DB smoke: fetching one player with ratings...')
  const { data: players, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, lahman_player_id, ratings:player_ratings (year, rating_type, stats, p_k, p_bb, p_out, p_1b, p_2b, p_3b, p_hr)')
    .limit(5)

  if (error) throw new Error(error.message)
  if (!players || players.length === 0) {
    console.log('No players found. Run seed scripts first.')
    return
  }

  for (const p of players) {
    console.log(`- ${p.first_name} ${p.last_name} (${p.lahman_player_id ?? 'no-lahman-id'})`) 
    const ratings = (p as any).ratings ?? []
    console.log(`  ratings: ${ratings.length}`)

    for (const r of ratings) {
      const stats = r.stats
      const isBat = r.rating_type === 'batting'
      const isPit = r.rating_type === 'pitching'

      if (isBat) {
        const ok = hasKeys(stats, ['pa', 'ab', 'h', '2b', '3b', 'hr', 'bb', 'so', 'avg', 'slg', 'iso', 'babip', 'k_pct', 'bb_pct'])
        if (!ok) {
          throw new Error(`Batting stats missing keys for player ${p.id} year ${r.year}`)
        }
      }

      if (isPit) {
        const ok = hasKeys(stats, ['ip_outs', 'h', 'hr', 'bb', 'so', 'k_pct', 'bb_pct', 'era', 'whip'])
        if (!ok) {
          throw new Error(`Pitching stats missing keys for player ${p.id} year ${r.year}`)
        }
      }
    }
  }

  console.log('✓ Smoke test passed: ratings stats keys look correct')
}

main().catch(err => {
  console.error('❌ DB smoke failed:', err)
  process.exit(1)
})
