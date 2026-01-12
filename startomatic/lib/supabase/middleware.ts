// Supabase middleware helper for session management
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Inline mock mode check to avoid edge runtime compatibility issues
function isMockMode(): boolean {
  // Mock mode must be explicitly enabled - no auto-fallback
  return process.env.NEXT_PUBLIC_USE_MOCK === 'true'
}

// Check if Supabase credentials are configured
function hasSupabaseCredentials(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function updateSession(request: NextRequest) {
  // In mock mode, skip Supabase auth and treat user as logged in
  if (isMockMode()) {
    // Still handle auth page redirects
    const authPaths = ['/login', '/signup']
    const isAuthPath = authPaths.some(path => request.nextUrl.pathname === path)

    if (isAuthPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return NextResponse.next({ request })
  }

  // If Supabase credentials are missing, allow the request through
  // The page-level auth checks will handle the error display
  if (!hasSupabaseCredentials()) {
    console.error('[Middleware] Supabase credentials not configured')
    return NextResponse.next({ request })
  }

  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANT: Do not add code between createServerClient and supabase.auth.getUser()
    // A simple mistake could make your app very slow!
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Protected routes - redirect to login if not authenticated
    const protectedPaths = ['/dashboard', '/leagues', '/games']
    const isProtectedPath = protectedPaths.some(path =>
      request.nextUrl.pathname.startsWith(path)
    )

    if (isProtectedPath && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // Redirect logged-in users away from auth pages
    const authPaths = ['/login', '/signup']
    const isAuthPath = authPaths.some(path =>
      request.nextUrl.pathname === path
    )

    if (isAuthPath && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error('[Middleware] Error:', error)
    // On error, allow the request through - page-level checks will handle auth
    return NextResponse.next({ request })
  }
}
