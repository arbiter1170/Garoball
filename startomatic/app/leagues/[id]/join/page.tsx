'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const TEAM_COLORS = [
  { name: 'Navy', primary: '#1a365d', secondary: '#e53e3e' },
  { name: 'Red', primary: '#9b2c2c', secondary: '#ecc94b' },
  { name: 'Green', primary: '#276749', secondary: '#f6e05e' },
  { name: 'Orange', primary: '#c05621', secondary: '#1a365d' },
  { name: 'Purple', primary: '#553c9a', secondary: '#f6ad55' },
  { name: 'Teal', primary: '#234e52', secondary: '#fc8181' },
  { name: 'Black', primary: '#1a202c', secondary: '#f6e05e' },
  { name: 'Blue', primary: '#2b6cb0', secondary: '#ed8936' },
]

export default function JoinLeaguePage() {
  const router = useRouter()
  const params = useParams()
  const leagueId = params.id as string
  
  const [name, setName] = useState('')
  const [abbreviation, setAbbreviation] = useState('')
  const [city, setCity] = useState('')
  const [selectedColors, setSelectedColors] = useState(TEAM_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/leagues/${leagueId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          abbreviation,
          city: city || null,
          primary_color: selectedColors.primary,
          secondary_color: selectedColors.secondary,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create team')
      }

      router.push(`/teams/${data.team.id}`)
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
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={`/leagues/${leagueId}`} className="text-blue-400 hover:text-blue-300">
            ← Back to League
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h1 className="text-2xl font-bold mb-6">Create Your Team</h1>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Team Name *
              </label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Yankees, Red Sox, Cubs"
              />
            </div>

            <div>
              <label htmlFor="abbreviation" className="block text-sm font-medium text-gray-300 mb-2">
                Abbreviation * (3 letters)
              </label>
              <Input
                id="abbreviation"
                type="text"
                required
                maxLength={3}
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value.toUpperCase())}
                placeholder="e.g., NYY, BOS, CHC"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">
                City (optional)
              </label>
              <Input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., New York, Boston, Chicago"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Team Colors
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TEAM_COLORS.map((colors) => (
                  <button
                    key={colors.name}
                    type="button"
                    onClick={() => setSelectedColors(colors)}
                    className={`p-2 rounded border-2 transition ${
                      selectedColors.name === colors.name
                        ? 'border-white'
                        : 'border-transparent hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: colors.primary }}
                      />
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: colors.secondary }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 mt-1">{colors.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Preview</h3>
              <div className="flex items-center space-x-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: selectedColors.primary }}
                >
                  {abbreviation || 'XXX'}
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {city && `${city} `}{name || 'Team Name'}
                  </div>
                  <div className="text-gray-400">{abbreviation || 'XXX'}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Link href={`/leagues/${leagueId}`}>
                <Button variant="ghost" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Team'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
