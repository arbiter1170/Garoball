import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  // Use request origin for redirect
  const origin = request.nextUrl.origin
  return NextResponse.redirect(new URL('/login', origin))
}
