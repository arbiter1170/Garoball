'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export function QuickStartGame({ leagueId }: { leagueId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onQuickStart = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/leagues/${leagueId}/quickstart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to quick start')
      }

      const gameId = data?.game?.id
      if (!gameId) throw new Error('Quick start did not return a game id')

      router.push(`/games/${gameId}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to quick start')
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-6">
      <h2 className="text-xl font-semibold mb-2">Play</h2>
      <p className="text-gray-400 text-sm mb-4">
        Creates an active season (if needed), two teams, basic rosters, and a first game.
      </p>

      {error && (
        <div className="text-sm text-red-400 mb-3">{error}</div>
      )}

      <Button onClick={onQuickStart} disabled={loading} className="w-full">
        {loading ? 'Setting up…' : 'Quick Start Game'}
      </Button>
    </div>
  )
}
