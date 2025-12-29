'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Scoreboard } from '@/components/game/Scoreboard'
import { DiamondView } from '@/components/game/DiamondView'
import { PlayByPlay } from '@/components/game/PlayByPlay'
import { BoxScore } from '@/components/game/BoxScore'
import { DiceDisplay } from '@/components/game/DiceDisplay'
import { PlayerCard } from '@/components/game/PlayerCard'
import type { Game, Play, Player, PlayerRating } from '@/types'
import { 
  getRatingProbabilities, 
  blendProbabilities, 
  probabilitiesToDiceRanges 
} from '@/lib/probabilities'

type GameTab = 'live' | 'boxscore' | 'plays'

export default function GamePage() {
  const params = useParams()
  const gameId = params.id as string
  
  const [game, setGame] = useState<Game | null>(null)
  const [plays, setPlays] = useState<Play[]>([])
  const [players, setPlayers] = useState<Map<string, Player>>(new Map())
  const [ratings, setRatings] = useState<Map<string, PlayerRating>>(new Map())
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [activeTab, setActiveTab] = useState<GameTab>('live')
  const [lastPlay, setLastPlay] = useState<Play | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`)
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error)
      
      setGame(data.game)
      setPlays(data.plays || [])
      
      // Build player map
      const playerMap = new Map<string, Player>()
      data.players?.forEach((p: Player) => playerMap.set(p.id, p))
      setPlayers(playerMap)
      
      // Build ratings map
      const ratingsMap = new Map<string, PlayerRating>()
      data.ratings?.forEach((r: PlayerRating) => ratingsMap.set(r.player_id, r))
      setRatings(ratingsMap)
      
      if (data.plays?.length > 0) {
        setLastPlay(data.plays[data.plays.length - 1])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game')
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    fetchGame()
  }, [fetchGame])

  const simulatePlay = async (mode: 'play' | 'inning' | 'game' = 'play') => {
    if (!game || simulating) return
    
    setSimulating(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/games/${gameId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error)
      
      setGame(data.game)
      setPlays(prev => [...prev, ...data.plays])
      
      if (data.plays?.length > 0) {
        setLastPlay(data.plays[data.plays.length - 1])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed')
    } finally {
      setSimulating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading game...</div>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-400 mb-4">{error || 'Game not found'}</div>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const currentBatterId = game.half === 'top' 
    ? game.away_lineup[game.current_batter_idx % game.away_lineup.length]
    : game.home_lineup[game.current_batter_idx % game.home_lineup.length]
  
  const currentBatter = players.get(currentBatterId)
  const currentPitcher = players.get(game.current_pitcher_id || '')
  
  const currentBatterRating = ratings.get(currentBatterId)
  const currentPitcherRating = ratings.get(game.current_pitcher_id || '')

  const currentDiceTable = useMemo(() => {
    if (!currentBatterRating || !currentPitcherRating) return undefined
    
    const batterProbs = getRatingProbabilities(currentBatterRating)
    const pitcherProbs = getRatingProbabilities(currentPitcherRating)
    const blended = blendProbabilities(batterProbs, pitcherProbs)
    return probabilitiesToDiceRanges(blended)
  }, [currentBatterRating, currentPitcherRating])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold">
            ⚾ Startomatic 2D
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-300 hover:text-white">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Scoreboard */}
        <Scoreboard game={game} />

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-6">
          {(['live', 'boxscore', 'plays'] as GameTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab === 'live' ? 'Live View' : tab === 'boxscore' ? 'Box Score' : 'Play-by-Play'}
            </button>
          ))}
        </div>

        {/* Live View Tab */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Batter Card */}
            <div className="lg:col-span-3">
              {currentBatter && currentBatterRating ? (
                <PlayerCard 
                  player={currentBatter} 
                  rating={currentBatterRating} 
                  type="batter" 
                  diceTable={currentDiceTable}
                />
              ) : (
                <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
                  No batter info
                </div>
              )}
            </div>

            {/* Center: Dice Tray + Pitcher Card */}
            <div className="lg:col-span-5 flex flex-col items-center space-y-6">
              <DiceDisplay values={lastPlay?.dice_values || [1, 1, 1]} />
              
              {currentPitcher && currentPitcherRating ? (
                <PlayerCard 
                  player={currentPitcher} 
                  rating={currentPitcherRating} 
                  type="pitcher"
                  className="w-full max-w-sm"
                />
              ) : (
                <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400 w-full">
                  No pitcher info
                </div>
              )}

              {/* Simulation Controls */}
              {game.status !== 'completed' && (
                <div className="flex justify-center space-x-3 w-full">
                  <Button 
                    onClick={() => simulatePlay('play')}
                    disabled={simulating}
                    className="flex-1"
                  >
                    {simulating ? 'Simulating...' : 'Next At-Bat'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => simulatePlay('inning')}
                    disabled={simulating}
                    className="text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white"
                  >
                    Sim Inning
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => simulatePlay('game')}
                    disabled={simulating}
                    className="text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white"
                  >
                    Sim Game
                  </Button>
                </div>
              )}
            </div>

            {/* Right: Diamond + Play-by-Play */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-center mb-2 text-sm text-gray-400">
                  <span>
                    {game.half === 'top' ? 'Top' : 'Bottom'} {game.inning}
                  </span>
                  <span>{game.outs} out{game.outs !== 1 ? 's' : ''}</span>
                </div>
                <DiamondView 
                  runner1b={game.runner_1b}
                  runner2b={game.runner_2b}
                  runner3b={game.runner_3b}
                  outs={game.outs}
                  players={players}
                />
              </div>

              {/* Last Play / Mini Play-by-Play */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 h-64 overflow-y-auto">
                <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase">Play-by-Play</h3>
                {plays.length > 0 ? (
                  <div className="space-y-3">
                    {[...plays].reverse().slice(0, 5).map((play, idx) => {
                      const batter = players.get(play.batter_id)
                      return (
                        <div key={play.id || idx} className="text-sm border-b border-gray-700 pb-2 last:border-0">
                          <div className="font-semibold text-gray-300">
                            {play.half === 'top' ? 'Top' : 'Bot'} {play.inning}, {play.outs_before} Out
                          </div>
                          <div className="text-gray-400">
                            {batter?.last_name}: {play.explanation}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-4">No plays yet</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Box Score Tab */}
        {activeTab === 'boxscore' && (
          <BoxScore game={game} players={players} ratings={ratings} />
        )}

        {/* Play-by-Play Tab */}
        {activeTab === 'plays' && (
          <PlayByPlay plays={plays} players={players} />
        )}
      </main>
    </div>
  )
}
