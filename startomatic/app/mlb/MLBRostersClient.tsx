'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Select } from '@/components/ui/Select'

type Team = {
  year: number
  lgID: string
  teamID: string
  franchID: string
  name: string
  abbr: string
}

type RosterRow = {
  playerID: string
  first_name: string
  last_name: string
  primary_position: string
  games: number
}

function yearOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear; y >= 1901 && years.length < 35; y--) years.push(y)
  return years.map(y => ({ value: String(y), label: String(y) }))
}

export function MLBRostersClient() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [teams, setTeams] = useState<Team[]>([])
  const [teamID, setTeamID] = useState<string>('')
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const teamOptions = useMemo(() => {
    const opts = teams.map(t => ({
      value: t.teamID,
      label: `${t.teamID} — ${t.name}`,
    }))
    return [{ value: '', label: 'Select a team…' }, ...opts]
  }, [teams])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoadingTeams(true)
      setError(null)
      setTeams([])
      setTeamID('')
      setRoster([])

      try {
        const res = await fetch(`/api/mlb/teams?year=${encodeURIComponent(year)}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Failed to load teams')
        if (cancelled) return
        setTeams(data.teams || [])
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load teams')
      } finally {
        if (!cancelled) setLoadingTeams(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [year])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!teamID) return
      setLoadingRoster(true)
      setError(null)
      setRoster([])

      try {
        const res = await fetch(
          `/api/mlb/roster?year=${encodeURIComponent(year)}&teamID=${encodeURIComponent(teamID)}`
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Failed to load roster')
        if (cancelled) return
        setRoster(data.roster || [])
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load roster')
      } finally {
        if (!cancelled) setLoadingRoster(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [teamID, year])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold">
            ⚾ Garoball
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-300 hover:text-white">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-2">MLB Rosters</h1>
        <p className="text-gray-400 mb-6">
          Pick a year and team to see who appeared for them (Lahman Appearances).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Select
            label="Year"
            id="mlb-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            options={yearOptions()}
            disabled={loadingTeams}
          />

          <Select
            label={loadingTeams ? 'Team (loading…)'
              : 'Team'}
            id="mlb-team"
            value={teamID}
            onChange={(e) => setTeamID(e.target.value)}
            options={teamOptions}
            disabled={loadingTeams || teams.length === 0}
          />
        </div>

        {error && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-red-300 mb-6">
            {error}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {teamID ? `${teamID} Roster` : 'Roster'}
            </h2>
            {loadingRoster && <span className="text-sm text-gray-400">Loading…</span>}
          </div>

          {teamID && roster.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="py-2 pr-2">Player</th>
                    <th className="py-2 px-2">Pos</th>
                    <th className="py-2 pl-2 text-right">G</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((p) => (
                    <tr key={p.playerID} className="border-b border-gray-700/50">
                      <td className="py-2 pr-2">
                        {p.first_name} {p.last_name}
                        <span className="text-gray-500 ml-2">({p.playerID})</span>
                      </td>
                      <td className="py-2 px-2 text-gray-300">{p.primary_position || '-'}</td>
                      <td className="py-2 pl-2 text-right">{p.games}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-400">
              {teamID ? (loadingRoster ? 'Loading roster…' : 'No appearances found for that team/year.') : 'Select a team to view the roster.'}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
