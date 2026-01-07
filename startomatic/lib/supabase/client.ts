// Supabase client for browser/client-side usage
import { createBrowserClient } from '@supabase/ssr'
import { createMockClient, isMockMode } from './mock'

export function createClient() {
  if (isMockMode()) {
    // Cast through unknown for mock client compatibility with stricter Supabase types
    return createMockClient() as unknown as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
