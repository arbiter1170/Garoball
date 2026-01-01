// Mock Supabase client for local development without a live backend
// Enable with NEXT_PUBLIC_USE_MOCK=true in .env.local

import { samplePlayers, teamTemplates } from '@/data/samplePlayers'

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
    first_name: p.first_name,
    last_name: p.last_name,
    bats: p.bats,
    throws: p.throws,
    primary_position: p.primary_position,
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
    created_at: '2024-01-01T00:00:00.000Z'
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
        created_at: '2024-01-01T00:00:00.000Z'
    }
]

// Generate mock games
export const MOCK_GAMES = [
    {
        id: 'game-1',
        season_id: 'season-1',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        game_number: 1,
        status: 'completed',
        home_score: 5,
        away_score: 3,
        inning: 9,
        half: 'bottom',
        home_team: MOCK_TEAMS[0],
        away_team: MOCK_TEAMS[1],
        created_at: '2024-01-01T00:00:00.000Z'
    }
]

// Check if mock mode is enabled
export function isMockMode(): boolean {
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
    private newItem: Partial<T> | null = null

    constructor(data: T[], item: Partial<T>) {
        this.data = data
        this.newItem = item
    }

    select() {
        return this
    }

    single() {
        return this
    }

    async then<TResult>(
        resolve: (value: { data: T | null; error: null }) => TResult
    ): Promise<TResult> {
        const item = {
            id: `mock-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...this.newItem
        } as T
        this.data.push(item)
        return resolve({ data: item, error: null })
    }
}

// Mock Supabase client
export function createMockClient() {
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
                        upsert: () => ({ error: null })
                    }
                case 'players':
                    return {
                        select: () => new MockQueryBuilder(MOCK_PLAYERS),
                        insert: (item: unknown) => new MockInsertBuilder(MOCK_PLAYERS, item as Partial<typeof MOCK_PLAYERS[0]>)
                    }
                case 'teams':
                    return {
                        select: () => new MockQueryBuilder(MOCK_TEAMS),
                        insert: (item: unknown) => new MockInsertBuilder(MOCK_TEAMS, item as Partial<typeof MOCK_TEAMS[0]>)
                    }
                case 'leagues':
                    return {
                        select: () => new MockQueryBuilder(MOCK_LEAGUES),
                        insert: (item: unknown) => new MockInsertBuilder(MOCK_LEAGUES, item as Partial<typeof MOCK_LEAGUES[0]>)
                    }
                case 'seasons':
                    return {
                        select: () => new MockQueryBuilder(MOCK_SEASONS),
                        insert: (item: unknown) => new MockInsertBuilder(MOCK_SEASONS, item as Partial<typeof MOCK_SEASONS[0]>)
                    }
                case 'games':
                    return {
                        select: () => new MockQueryBuilder(MOCK_GAMES),
                        insert: (item: unknown) => new MockInsertBuilder(MOCK_GAMES, item as Partial<typeof MOCK_GAMES[0]>)
                    }
                default:
                    return {
                        select: () => new MockQueryBuilder([]),
                        insert: () => new MockInsertBuilder([], {})
                    }
            }
        }
    }
}
