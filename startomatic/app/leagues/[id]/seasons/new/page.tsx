'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function NewSeasonPage() {
  const params = useParams()
  const router = useRouter()
  const leagueId = params.id as string

  const defaultYear = useMemo(() => new Date().getFullYear(), [])

  const [name, setName] = useState(`${defaultYear} Season`)
  const [year, setYear] = useState(String(defaultYear))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leagueId) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/leagues/${leagueId}/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          year: Number(year),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to create season')

      router.push(`/leagues/${leagueId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create season')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold">
            ⚾ Garoball
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href={`/leagues/${leagueId}`} className="text-gray-300 hover:text-white">
              Back to League
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h1 className="text-2xl font-bold mb-2">Create Season</h1>
          <p className="text-gray-400 mb-6">Start a new season for this league.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              id="season-name"
              label="Season Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="2025 Season"
            />

            <Input
              id="season-year"
              label="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              inputMode="numeric"
              placeholder="2025"
            />

            {error && (
              <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded p-3">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Creating…' : 'Create Season'}
              </Button>
              <Link href={`/leagues/${leagueId}`} className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
