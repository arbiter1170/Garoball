// Seed script for populating the database with sample data
// Run with: npx tsx scripts/seed.ts

import { createClient } from '@supabase/supabase-js'
import { samplePlayers, teamTemplates } from '../data'
import { 
  calculateBattingProbabilities, 
  calculatePitchingProbabilities,
  createDiceTable,
  outcomeToCode
} from '../lib/probabilities'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedGlossary() {
  console.log('Seeding glossary...')
  
  const { glossaryData } = await import('../data/glossary')
  
  for (const entry of glossaryData) {
    const { error } = await supabase
      .from('glossary')
      .upsert({
        term: entry.term,
        abbreviation: entry.abbreviation,
        category: entry.category,
        short_description: entry.short_description,
        long_description: entry.long_description,
        formula: entry.formula,
        example: entry.example
      }, { onConflict: 'term' })
    
    if (error) {
      console.error(`Error inserting glossary entry "${entry.term}":`, error.message)
    }
  }
  
  console.log(`✓ Seeded ${glossaryData.length} glossary entries`)
}

async function seedPlayers() {
  console.log('Seeding players...')
  
  const playerIds: string[] = []
  
  for (const playerData of samplePlayers) {
    // Insert player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        first_name: playerData.first_name,
        last_name: playerData.last_name,
        bats: playerData.bats,
        throws: playerData.throws,
        primary_position: playerData.primary_position
      })
      .select()
      .single()
    
    if (playerError) {
      console.error(`Error inserting player "${playerData.first_name} ${playerData.last_name}":`, playerError.message)
      continue
    }
    
    playerIds.push(player.id)
    
    // Calculate probabilities and create rating
    if ('batting_stats' in playerData && playerData.batting_stats) {
      const stats = playerData.batting_stats
      const probs = calculateBattingProbabilities(stats)
      const diceTable = createDiceTable(probs)
      const diceTableCodes = diceTable.map(outcomeToCode)
      
      const { error: ratingError } = await supabase
        .from('player_ratings')
        .insert({
          player_id: player.id,
          year: 2024,
          rating_type: 'batting',
          stats: stats,
          p_k: probs.K,
          p_bb: probs.BB,
          p_1b: probs['1B'],
          p_2b: probs['2B'],
          p_3b: probs['3B'],
          p_hr: probs.HR,
          p_out: probs.OUT,
          dice_table: diceTableCodes
        })
      
      if (ratingError) {
        console.error(`Error inserting batting rating for "${playerData.first_name}":`, ratingError.message)
      }
    }
    
    if ('pitching_stats' in playerData && playerData.pitching_stats) {
      const stats = playerData.pitching_stats
      const probs = calculatePitchingProbabilities(stats)
      const diceTable = createDiceTable(probs)
      const diceTableCodes = diceTable.map(outcomeToCode)
      
      // Calculate fatigue threshold (outs before pitcher tires)
      const avgOutsPerStart = Math.floor(stats.ip_outs / 30) // Assume ~30 starts
      
      const { error: ratingError } = await supabase
        .from('player_ratings')
        .insert({
          player_id: player.id,
          year: 2024,
          rating_type: 'pitching',
          stats: stats,
          p_k: probs.K,
          p_bb: probs.BB,
          p_1b: probs['1B'],
          p_2b: probs['2B'],
          p_3b: probs['3B'],
          p_hr: probs.HR,
          p_out: probs.OUT,
          dice_table: diceTableCodes,
          fatigue_threshold: avgOutsPerStart
        })
      
      if (ratingError) {
        console.error(`Error inserting pitching rating for "${playerData.first_name}":`, ratingError.message)
      }
    }
  }
  
  console.log(`✓ Seeded ${playerIds.length} players with ratings`)
  return playerIds
}

async function seedDemoLeague(playerIds: string[]) {
  console.log('Seeding demo league...')
  
  // Create demo league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .insert({
      name: 'Demo League',
      settings: {
        dh_enabled: true,
        games_per_matchup: 3,
        innings_per_game: 9
      }
    })
    .select()
    .single()
  
  if (leagueError) {
    console.error('Error creating demo league:', leagueError.message)
    return
  }
  
  console.log(`✓ Created league: ${league.name}`)
  
  // Create two teams
  const teamData = teamTemplates.slice(0, 2)
  const teamIds: string[] = []
  
  for (const template of teamData) {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        league_id: league.id,
        name: template.name,
        abbreviation: template.abbreviation,
        city: template.city,
        primary_color: template.primary_color,
        secondary_color: template.secondary_color
      })
      .select()
      .single()
    
    if (teamError) {
      console.error(`Error creating team "${template.name}":`, teamError.message)
      continue
    }
    
    teamIds.push(team.id)
    console.log(`✓ Created team: ${team.city} ${team.name}`)
  }
  
  // Split players between teams
  const batters = playerIds.slice(0, 9)
  const pitchers = playerIds.slice(9)
  
  // Assign first half of batters and pitchers to team 1
  const team1Batters = batters.slice(0, 5)
  const team1Pitchers = pitchers.slice(0, 3)
  
  // Assign second half to team 2
  const team2Batters = batters.slice(5)
  const team2Pitchers = pitchers.slice(3)
  
  // Team 1 roster
  for (const playerId of [...team1Batters, ...team1Pitchers]) {
    await supabase.from('rosters').insert({
      team_id: teamIds[0],
      player_id: playerId,
      is_active: true
    })
  }
  
  // Team 2 roster  
  for (const playerId of [...team2Batters, ...team2Pitchers]) {
    await supabase.from('rosters').insert({
      team_id: teamIds[1],
      player_id: playerId,
      is_active: true
    })
  }
  
  console.log(`✓ Assigned players to rosters`)
  
  // Create season
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .insert({
      league_id: league.id,
      name: '2024 Season',
      year: 2024,
      status: 'active',
      settings: { games_per_matchup: 3 },
      schedule: [
        { home_team_id: teamIds[0], away_team_id: teamIds[1], game_number: 1 },
        { home_team_id: teamIds[1], away_team_id: teamIds[0], game_number: 2 },
        { home_team_id: teamIds[0], away_team_id: teamIds[1], game_number: 3 }
      ]
    })
    .select()
    .single()
  
  if (seasonError) {
    console.error('Error creating season:', seasonError.message)
    return
  }
  
  console.log(`✓ Created season: ${season.name}`)
  
  // Create standings
  for (const teamId of teamIds) {
    await supabase.from('standings').insert({
      season_id: season.id,
      team_id: teamId,
      wins: 0,
      losses: 0,
      runs_for: 0,
      runs_against: 0,
      games_played: 0
    })
  }
  
  console.log(`✓ Initialized standings`)
  
  return { league, teamIds, season }
}

async function main() {
  console.log('🌱 Starting database seed...\n')
  
  try {
    await seedGlossary()
    const playerIds = await seedPlayers()
    await seedDemoLeague(playerIds)
    
    console.log('\n✅ Seed completed successfully!')
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    process.exit(1)
  }
}

main()
