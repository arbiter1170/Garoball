// Supabase client for browser/client-side usage
import { createBrowserClient } from '@supabase/ssr'
import { createMockClient, isMockMode } from './mock'

export function createClient() {
  if (isMockMode()) {
    // Cast through unknown for mock client compatibility with stricter Supabase types
    return createMockClient() as unknown as ReturnType<typeof createBrowserClient>
  }

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file, ' +
      'or set NEXT_PUBLIC_USE_MOCK=true to use mock mode for development.'
    )
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
