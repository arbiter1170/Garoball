'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function NewLeaguePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [dhEnabled, setDhEnabled] = useState(true)
  const [gamesPerMatchup, setGamesPerMatchup] = useState(3)
  const [inningsPerGame, setInningsPerGame] = useState(9)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          settings: {
            dh_enabled: dhEnabled,
            games_per_matchup: gamesPerMatchup,
            innings_per_game: inningsPerGame,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create league')
      }

      router.push(`/leagues/${data.league.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold">
            ⚾ Startomatic 2D
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/leagues" className="text-gray-300 hover:text-white">
              Leagues
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/leagues" className="text-blue-400 hover:text-blue-300">
            ← Back to Leagues
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h1 className="text-2xl font-bold mb-6">Create New League</h1>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                League Name *
              </label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter league name"
              />
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h2 className="text-lg font-medium mb-4">League Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    id="dh"
                    type="checkbox"
                    checked={dhEnabled}
                    onChange={(e) => setDhEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="dh" className="ml-2 text-sm text-gray-300">
                    Enable Designated Hitter (DH)
                  </label>
                </div>

                <div>
                  <label htmlFor="gamesPerMatchup" className="block text-sm font-medium text-gray-300 mb-2">
                    Games per Matchup
                  </label>
                  <select
                    id="gamesPerMatchup"
                    value={gamesPerMatchup}
                    onChange={(e) => setGamesPerMatchup(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 game</option>
                    <option value={3}>3 games (series)</option>
                    <option value={5}>5 games</option>
                    <option value={7}>7 games (playoff style)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="inningsPerGame" className="block text-sm font-medium text-gray-300 mb-2">
                    Innings per Game
                  </label>
                  <select
                    id="inningsPerGame"
                    value={inningsPerGame}
                    onChange={(e) => setInningsPerGame(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={7}>7 innings</option>
                    <option value={9}>9 innings (standard)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Link href="/leagues">
                <Button variant="ghost" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create League'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
