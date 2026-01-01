// Supabase client for browser/client-side usage
import { createBrowserClient } from '@supabase/ssr'
import { createMockClient, isMockMode } from './mock'

export function createClient() {
  if (isMockMode()) {
    return createMockClient() as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
