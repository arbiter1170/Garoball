'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const redirect = searchParams.get('redirect') || '/dashboard'
  const authError = searchParams.get('error')

  const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Sign-in timed out. Please try again.')), ms)
      ),
    ])
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    const supabase = createClient()
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        }),
        15000
      )

      if (error) {
        setError(error.message)
        return
      }

      // If the session cookie races the server render, the user can briefly bounce
      // back to /login. Never leave the UI stuck disabled.
      router.replace(redirect)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${redirect}`,
      },
    })

    if (error) {
      setError(error.message)
    }
  }

  return (
    <div className="bg-[#f3f0e6] rounded-2xl shadow-2xl border-4 border-[#1e3a8a] overflow-hidden max-w-md w-full">
      {/* Header */}
      <div className="bg-[#1e3a8a] py-4 px-6">
        <Link href="/" className="block">
          <h1 className="text-3xl font-black text-white text-center tracking-tight">
            ⚾ GAROBALL
          </h1>
        </Link>
      </div>

      {/* Card body */}
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 text-center mb-1">
          Welcome Back!
        </h2>
        <p className="text-center text-sm text-gray-600 mb-6">
          Sign in to continue your season
        </p>

        {(error || authError) && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error || 'Authentication error. Please try again.'}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none transition-all bg-white text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a] outline-none transition-all bg-white text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 px-6 rounded-xl text-lg transition-all transform hover:scale-[1.02] shadow-lg"
          >
            {loading ? '⏳ Signing in...' : '🎮 PLAY BALL'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-bold text-[#1e3a8a] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a472a] py-12 px-4 relative overflow-hidden">
      {/* Background grass pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,0,0,0.1) 20px, rgba(0,0,0,0.1) 40px)`
        }} />
      </div>

      {/* Diamond decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-10">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="50,10 90,50 50,90 10,50" fill="#c4a77d" />
        </svg>
      </div>

      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
