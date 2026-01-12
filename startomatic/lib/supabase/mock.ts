// Mock Supabase client for local development without a live backend
// Enable with NEXT_PUBLIC_USE_MOCK=true in .env.local

import { samplePlayers, teamTemplates } from '@/data/samplePlayers'
import { SeededRng } from '@/lib/rng'
import type { Game, Play, PlayerRating, BoxScore, TeamBoxScore, PlayerBattingLine, PlayerPitchingLine } from '@/types'

// Mock user for development
export const MOCK_USER = {
    id: 'mock-user-id-12345',
    email: 'demo@garoball.dev',
    app_metadata: {},
    user_metadata: { display_name: 'Demo User' },
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z'
}

// Mock profile
export const MOCK_PROFILE = {
    id: MOCK_USER.id,
    username: 'demo_user',
    display_name: 'Demo User',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
}

// Generate mock players with IDs
export const MOCK_PLAYERS = samplePlayers.map((p, idx) => ({
    id: `player-${idx + 1}`,
    lahman_player_id: null,
    first_name: p.first_name,
    last_name: p.last_name,
    bats: p.bats,
    throws: p.throws,
    primary_position: p.primary_position,
    birth_date: null,
    debut_year: 2020,
    final_year: null,
    created_at: '2024-01-01T00:00:00.000Z'
}))

// Generate mock teams
export const MOCK_TEAMS = teamTemplates.slice(0, 2).map((t, idx) => ({
    id: `team-${idx + 1}`,
    league_id: 'league-1',
    owner_id: MOCK_USER.id,
    name: t.name,
    abbreviation: t.abbreviation,
    city: t.city,
    primary_color: t.primary_color,
    secondary_color: t.secondary_color,
    logo_url: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
}))

// Generate mock league
export const MOCK_LEAGUES = [
    {
        id: 'league-1',
        name: 'Demo League',
        commissioner_id: MOCK_USER.id,
        settings: { dh_enabled: true, innings_per_game: 9, games_per_matchup: 3 },
        created_at: '2024-01-01T00:00:00.000Z',
        commissioner: MOCK_PROFILE,
        teams: MOCK_TEAMS
    }
]

// Generate mock season
export const MOCK_SEASONS = [
    {
        id: 'season-1',
        league_id: 'league-1',
        name: '2024 Season',
        year: 2024,
        status: 'active',
        settings: { games_per_matchup: 3 },
        schedule: [
            { home_team_id: 'team-1', away_team_id: 'team-2', game_number: 1 },
            { home_team_id: 'team-2', away_team_id: 'team-1', game_number: 2 },
            { home_team_id: 'team-1', away_team_id: 'team-2', game_number: 3 }
        ],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
    }
]

// Helper to create empty batting line
function createEmptyBattingLine(): PlayerBattingLine {
    return { ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, '2b': 0, '3b': 0, hr: 0 }
}

// Helper to create empty pitching line
function createEmptyPitchingLine(): PlayerPitchingLine {
    return { ip_outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0 }
}

// Create team lineups from mock players
// Team 1 (NYY/Home): Uses players 1-9 (batters) and player-19 (Jacob Miller, SP)
// Team 2 (BOS/Away): Uses players 10-18 (batters) and player-25 (Sergio Alvarez, SP)
const TEAM1_LINEUP = ['player-1', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6', 'player-7', 'player-8', 'player-9']
const TEAM2_LINEUP = ['player-10', 'player-11', 'player-12', 'player-13', 'player-14', 'player-15', 'player-16', 'player-17', 'player-18']
// Pitchers: players 19-24 are original pitchers, 25-28 are new ones
const TEAM1_PITCHERS = ['player-19']  // Jacob Miller (SP)
const TEAM2_PITCHERS = ['player-25']  // Sergio Alvarez (SP)

// Create box score batting records for a lineup
function createBattingRecords(lineup: string[]): Record<string, PlayerBattingLine> {
    const records: Record<string, PlayerBattingLine> = {}
    lineup.forEach(id => {
        records[id] = createEmptyBattingLine()
    })
    return records
}

// Create box score pitching records
function createPitchingRecords(pitchers: string[]): Record<string, PlayerPitchingLine> {
    const records: Record<string, PlayerPitchingLine> = {}
    pitchers.forEach(id => {
        records[id] = createEmptyPitchingLine()
    })
    return records
}

// Create a new game that can be simulated
function createPlayableGame(id: string, status: 'scheduled' | 'in_progress' | 'completed' = 'scheduled'): Game {
    const gameSeed = `mock-seed-${Date.now()}`
    const rngState = new SeededRng(gameSeed).getState()
    const boxScore: BoxScore = {
        home: {
            innings: [],
            hits: 0,
            errors: 0,
            batting: createBattingRecords(TEAM1_LINEUP),
            pitching: createPitchingRecords(TEAM1_PITCHERS)
        },
        away: {
            innings: [],
            hits: 0,
            errors: 0,
            batting: createBattingRecords(TEAM2_LINEUP),
            pitching: createPitchingRecords(TEAM2_PITCHERS)
        }
    }

    return {
        id,
        season_id: 'season-1',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        game_number: 1,
        status,
        inning: 1,
        half: 'top',
        outs: 0,
        home_score: 0,
        away_score: 0,
        runner_1b: null,
        runner_2b: null,
        runner_3b: null,
        current_batter_idx: 0,
        current_pitcher_id: TEAM1_PITCHERS[0], // Home pitcher pitches first
        pitcher_outs: 0,
        home_lineup: TEAM1_LINEUP,
        away_lineup: TEAM2_LINEUP,
        home_pitchers: TEAM1_PITCHERS,
        away_pitchers: TEAM2_PITCHERS,
        seed: gameSeed, // Generate unique seed for each game
        rng_state: { seed: rngState.seed, callCount: 0 },
        box_score: boxScore,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        completed_at: null
    }
}

// Mutable game storage for simulation updates
let mockGamesStorage: Game[] = [createPlayableGame('game-1', 'scheduled')]

// Getter for mock games (returns current state)
export function getMockGames(): Game[] {
    return mockGamesStorage
}

// Reset mock games to initial state
export function resetMockGames(): void {
    mockGamesStorage = [createPlayableGame('game-1', 'scheduled')]
}

// Update a game in storage
export function updateMockGame(id: string, updates: Partial<Game>): Game | null {
    const idx = mockGamesStorage.findIndex(g => g.id === id)
    if (idx === -1) return null
    mockGamesStorage[idx] = { ...mockGamesStorage[idx], ...updates, updated_at: new Date().toISOString() }
    return mockGamesStorage[idx]
}

// Export as MOCK_GAMES for backwards compatibility (though now it's a function reference)
export const MOCK_GAMES = mockGamesStorage

// Storage for mock plays
let mockPlaysStorage: Play[] = []

export function getMockPlays(): Play[] {
    return mockPlaysStorage
}

export function addMockPlay(play: Partial<Play>): Play {
    const newPlay: Play = {
        id: `play-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        game_id: play.game_id || 'game-1',
        play_number: play.play_number || mockPlaysStorage.length,
        inning: play.inning || 1,
        half: play.half || 'top',
        outs_before: play.outs_before || 0,
        runner_1b_before: play.runner_1b_before || null,
        runner_2b_before: play.runner_2b_before || null,
        runner_3b_before: play.runner_3b_before || null,
        home_score_before: play.home_score_before || 0,
        away_score_before: play.away_score_before || 0,
        batter_id: play.batter_id || 'player-1',
        pitcher_id: play.pitcher_id || 'player-10',
        outcome: play.outcome || 'OUT',
        runs_scored: play.runs_scored || 0,
        dice_values: play.dice_values || [3, 3, 3],
        dice_index: play.dice_index || 6,
        batter_probs: play.batter_probs || { K: 0.2, BB: 0.1, OUT: 0.4, '1B': 0.15, '2B': 0.05, '3B': 0.02, HR: 0.08 },
        pitcher_probs: play.pitcher_probs || { K: 0.2, BB: 0.1, OUT: 0.4, '1B': 0.15, '2B': 0.05, '3B': 0.02, HR: 0.08 },
        blended_probs: play.blended_probs || { K: 0.2, BB: 0.1, OUT: 0.4, '1B': 0.15, '2B': 0.05, '3B': 0.02, HR: 0.08 },
        dice_table_ranges: play.dice_table_ranges || { K: [0, 2], BB: [3, 4], OUT: [5, 11], '1B': [12, 13], '2B': [14, 14], '3B': [15, 15], HR: [15, 15] },
        explanation: play.explanation || 'Mock play',
        created_at: new Date().toISOString()
    }
    mockPlaysStorage.push(newPlay)
    return newPlay
}

export function clearMockPlays(): void {
    mockPlaysStorage = []
}

// Generate mock player ratings from sample player stats
export const MOCK_PLAYER_RATINGS: PlayerRating[] = samplePlayers.map((p, idx) => {
    const playerId = `player-${idx + 1}`
    const isBatter = 'batting_stats' in p
    const isPitcher = 'pitching_stats' in p

    if (isBatter && p.batting_stats) {
        const stats = p.batting_stats
        const pa = stats.pa
        const singles = stats.h - stats['2b'] - stats['3b'] - stats.hr
        return {
            id: `rating-bat-${idx + 1}`,
            player_id: playerId,
            year: 2024,
            rating_type: 'batting' as const,
            stats: stats,
            p_k: stats.so / pa,
            p_bb: stats.bb / pa,
            p_1b: singles / pa,
            p_2b: stats['2b'] / pa,
            p_3b: stats['3b'] / pa,
            p_hr: stats.hr / pa,
            p_out: (stats.ab - stats.h) / pa,
            dice_table: [],
            fatigue_threshold: null,
            created_at: '2024-01-01T00:00:00.000Z'
        }
    } else if (isPitcher && p.pitching_stats) {
        const stats = p.pitching_stats
        // Estimate PA from pitcher stats
        const pa = stats.ip_outs + stats.h + stats.bb
        const singles = Math.round(stats.h * 0.7)
        const doubles = Math.round(stats.h * 0.2)
        const triples = Math.round(stats.h * 0.02)
        const outs = stats.ip_outs - stats.so
        return {
            id: `rating-pit-${idx + 1}`,
            player_id: playerId,
            year: 2024,
            rating_type: 'pitching' as const,
            stats: stats,
            p_k: stats.so / pa,
            p_bb: stats.bb / pa,
            p_1b: singles / pa,
            p_2b: doubles / pa,
            p_3b: triples / pa,
            p_hr: stats.hr / pa,
            p_out: Math.max(0, outs / pa),
            dice_table: [],
            fatigue_threshold: 27 * 3, // ~9 innings in outs
            created_at: '2024-01-01T00:00:00.000Z'
        }
    }

    // Fallback for players without stats
    return {
        id: `rating-${idx + 1}`,
        player_id: playerId,
        year: 2024,
        rating_type: 'batting' as const,
        stats: { pa: 500, ab: 450, h: 120, '2b': 20, '3b': 3, hr: 15, bb: 45, so: 100, avg: 0.267, slg: 0.420, iso: 0.153, babip: 0.290, k_pct: 0.2, bb_pct: 0.09 },
        p_k: 0.2,
        p_bb: 0.09,
        p_1b: 0.164,
        p_2b: 0.04,
        p_3b: 0.006,
        p_hr: 0.03,
        p_out: 0.47,
        dice_table: [],
        fatigue_threshold: null,
        created_at: '2024-01-01T00:00:00.000Z'
    }
})

// Check if mock mode is enabled
export function isMockMode(): boolean {
    // Mock mode must be explicitly enabled - no auto-fallback
    // This ensures production builds always use real Supabase
    return process.env.NEXT_PUBLIC_USE_MOCK === 'true'
}

// Mock query builder that mimics Supabase's chaining API
class MockQueryBuilder<T> {
    private data: T[]
    private selectedFields: string[] | null = null
    private filters: Array<(item: T) => boolean> = []
    private orderField: string | null = null
    private orderAsc: boolean = true
    private limitCount: number | null = null
    private isSingle: boolean = false

    constructor(data: T[]) {
        this.data = [...data]
    }

    select(fields?: string) {
        if (fields) {
            this.selectedFields = fields.split(',').map(f => f.trim())
        }
        return this
    }

    eq(field: string, value: unknown) {
        this.filters.push((item: T) => (item as Record<string, unknown>)[field] === value)
        return this
    }

    in(field: string, values: unknown[]) {
        this.filters.push((item: T) => values.includes((item as Record<string, unknown>)[field]))
        return this
    }

    or(_condition: string) {
        // Simplified: just return all for mock
        return this
    }

    order(field: string, options?: { ascending?: boolean }) {
        this.orderField = field
        this.orderAsc = options?.ascending ?? true
        return this
    }

    limit(count: number) {
        this.limitCount = count
        return this
    }

    single() {
        this.isSingle = true
        return this
    }

    async then<TResult>(
        resolve: (value: { data: T | T[] | null; error: null }) => TResult
    ): Promise<TResult> {
        let result = this.data.filter(item =>
            this.filters.every(filter => filter(item))
        )

        if (this.orderField) {
            result.sort((a, b) => {
                const aVal = (a as Record<string, unknown>)[this.orderField!]
                const bVal = (b as Record<string, unknown>)[this.orderField!]
                const cmp = String(aVal).localeCompare(String(bVal))
                return this.orderAsc ? cmp : -cmp
            })
        }

        if (this.limitCount) {
            result = result.slice(0, this.limitCount)
        }

        if (this.isSingle) {
            return resolve({ data: result[0] || null, error: null })
        }

        return resolve({ data: result, error: null })
    }
}

// Mock insert builder
class MockInsertBuilder<T> {
    private data: T[]
    private newItems: Partial<T>[] = []

    constructor(data: T[], item: Partial<T> | Partial<T>[]) {
        this.data = data
        this.newItems = Array.isArray(item) ? item : [item]
    }

    select() {
        return this
    }

    single() {
        return this
    }

    async then<TResult>(
        resolve: (value: { data: T | T[] | null; error: null }) => TResult
    ): Promise<TResult> {
        const inserted = this.newItems.map(newItem => {
            const item = {
                id: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                created_at: new Date().toISOString(),
                ...newItem
            } as T
            this.data.push(item)
            return item
        })
        return resolve({ data: inserted.length === 1 ? inserted[0] : inserted, error: null })
    }
}

// Mock update builder
class MockUpdateBuilder<T> {
    private dataRef: T[]
    private updates: Partial<T>
    private filters: Array<(item: T) => boolean> = []
    private isSingle: boolean = false

    constructor(data: T[], updates: Partial<T>) {
        this.dataRef = data
        this.updates = updates
    }

    eq(field: string, value: unknown) {
        this.filters.push((item: T) => (item as Record<string, unknown>)[field] === value)
        return this
    }

    select() {
        return this
    }

    single() {
        this.isSingle = true
        return this
    }

    async then<TResult>(
        resolve: (value: { data: T | T[] | null; error: null }) => TResult
    ): Promise<TResult> {
        const updated: T[] = []
        for (let i = 0; i < this.dataRef.length; i++) {
            if (this.filters.every(filter => filter(this.dataRef[i]))) {
                this.dataRef[i] = { ...this.dataRef[i], ...this.updates }
                updated.push(this.dataRef[i])
            }
        }
        if (this.isSingle) {
            return resolve({ data: updated[0] || null, error: null })
        }
        return resolve({ data: updated, error: null })
    }
}

// Mock Supabase client
export function createMockClient() {
    // Create a games accessor that always returns current state
    const getGames = () => getMockGames()
    const getPlays = () => getMockPlays()

    return {
        auth: {
            getUser: async () => ({
                data: { user: MOCK_USER },
                error: null
            }),
            getSession: async () => ({
                data: { session: { user: MOCK_USER, access_token: 'mock-token' } },
                error: null
            }),
            signInWithPassword: async () => ({
                data: { user: MOCK_USER, session: { user: MOCK_USER, access_token: 'mock-token' } },
                error: null
            }),
            signUp: async () => ({
                data: { user: MOCK_USER, session: null },
                error: null
            }),
            signOut: async () => ({ error: null })
        },
        from: (table: string) => {
            switch (table) {
                case 'profiles':
                    return {
                        select: () => new MockQueryBuilder([MOCK_PROFILE]),
                        insert: (item: unknown) => new MockInsertBuilder([MOCK_PROFILE], item as Partial<typeof MOCK_PROFILE>),
                        update: (updates: unknown) => new MockUpdateBuilder([MOCK_PROFILE], updates as Partial<typeof MOCK_PROFILE>),
                        upsert: () => ({ error: null })
                    }
                case 'players':
                    return {
                        select: () => new MockQueryBuilder(MOCK_PLAYERS),
                        insert: (item: unknown) => new MockInsertBuilder(MOCK_PLAYERS, item as Partial<typeof MOCK_PLAYERS[0]>),
                        update: (updates: unknown) => new MockUpdateBuilder(MOCK_PLAYERS, updates as Partial<typeof MOCK_PLAYERS[0]>)
                    }
                case 'teams':
                    return {
                        select: () => new MockQueryBuilder(MOCK_TEAMS),
                        insert: (item: unknown) => new MockInsertBuilder(MOCK_TEAMS, item as Partial<typeof MOCK_TEAMS[0]>),
                        update: (updates: unknown) => new MockUpdateBuilder(MOCK_TEAMS, updates as Partial<typeof MOCK_TEAMS[0]>)
                    }
                case 'leagues':
                    return {
                        select: () => new MockQueryBuilder(MOCK_LEAGUES),
                        insert: (item: unknown) => new MockInsertBuilder(MOCK_LEAGUES, item as Partial<typeof MOCK_LEAGUES[0]>),
                        update: (updates: unknown) => new MockUpdateBuilder(MOCK_LEAGUES, updates as Partial<typeof MOCK_LEAGUES[0]>)
                    }
                case 'seasons':
                    return {
                        select: () => new MockQueryBuilder(MOCK_SEASONS),
                        insert: (item: unknown) => new MockInsertBuilder(MOCK_SEASONS, item as Partial<typeof MOCK_SEASONS[0]>),
                        update: (updates: unknown) => new MockUpdateBuilder(MOCK_SEASONS, updates as Partial<typeof MOCK_SEASONS[0]>)
                    }
                case 'games':
                    return {
                        select: () => {
                            // Augment games with team info
                            const gamesWithTeams = getGames().map(g => ({
                                ...g,
                                home_team: MOCK_TEAMS.find(t => t.id === g.home_team_id) || MOCK_TEAMS[0],
                                away_team: MOCK_TEAMS.find(t => t.id === g.away_team_id) || MOCK_TEAMS[1]
                            }))
                            return new MockQueryBuilder(gamesWithTeams)
                        },
                        insert: (item: unknown) => new MockInsertBuilder(getGames() as Game[], item as Partial<Game>),
                        update: (updates: unknown) => new MockUpdateBuilder(getGames() as Game[], updates as Partial<Game>)
                    }
                case 'plays':
                    return {
                        select: () => new MockQueryBuilder(getPlays()),
                        insert: (items: unknown) => {
                            // Handle bulk inserts
                            const itemsArray = Array.isArray(items) ? items : [items]
                            itemsArray.forEach(item => addMockPlay(item as Partial<Play>))
                            return { error: null }
                        },
                        update: (updates: unknown) => new MockUpdateBuilder(getPlays(), updates as Partial<Play>)
                    }
                case 'player_ratings':
                    return {
                        select: () => new MockQueryBuilder(MOCK_PLAYER_RATINGS),
                        insert: (item: unknown) => new MockInsertBuilder(MOCK_PLAYER_RATINGS, item as Partial<PlayerRating>),
                        update: (updates: unknown) => new MockUpdateBuilder(MOCK_PLAYER_RATINGS, updates as Partial<PlayerRating>)
                    }
                case 'standings':
                    // Simple mock for standings
                    return {
                        select: () => new MockQueryBuilder<Record<string, unknown>>([]),
                        insert: (item: unknown) => new MockInsertBuilder<Record<string, unknown>>([], item as Record<string, unknown>),
                        update: (updates: unknown) => new MockUpdateBuilder<Record<string, unknown>>([], updates as Record<string, unknown>)
                    }
                default:
                    return {
                        select: () => new MockQueryBuilder<Record<string, unknown>>([]),
                        insert: () => new MockInsertBuilder<Record<string, unknown>>([], {}),
                        update: () => new MockUpdateBuilder<Record<string, unknown>>([], {})
                    }
            }
        },
        // Mock RPC function for stored procedures
        rpc: async (functionName: string, params?: Record<string, unknown>) => {
            // Handle update_standing RPC - just log and return success
            if (functionName === 'update_standing') {
                console.log('[Mock] update_standing called with:', params)
                return { data: null, error: null }
            }
            console.log(`[Mock] RPC '${functionName}' called with:`, params)
            return { data: null, error: null }
        }
    }
}
