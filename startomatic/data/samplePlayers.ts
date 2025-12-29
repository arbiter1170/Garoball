// Sample player data for seeding the database

export const samplePlayers = [
  // Sample Batters
  {
    first_name: 'Mike',
    last_name: 'Johnson',
    bats: 'R',
    throws: 'R',
    primary_position: 'CF',
    batting_stats: {
      pa: 650,
      ab: 580,
      h: 175,
      '2b': 35,
      '3b': 8,
      hr: 28,
      bb: 55,
      so: 120,
      avg: 0.302,
      slg: 0.520,
      iso: 0.218,
      babip: 0.330,
      k_pct: 0.185,
      bb_pct: 0.085
    }
  },
  {
    first_name: 'David',
    last_name: 'Martinez',
    bats: 'L',
    throws: 'R',
    primary_position: '1B',
    batting_stats: {
      pa: 620,
      ab: 540,
      h: 160,
      '2b': 40,
      '3b': 2,
      hr: 42,
      bb: 70,
      so: 150,
      avg: 0.296,
      slg: 0.590,
      iso: 0.294,
      babip: 0.320,
      k_pct: 0.242,
      bb_pct: 0.113
    }
  },
  {
    first_name: 'James',
    last_name: 'Wilson',
    bats: 'S',
    throws: 'R',
    primary_position: 'SS',
    batting_stats: {
      pa: 680,
      ab: 600,
      h: 168,
      '2b': 28,
      '3b': 6,
      hr: 18,
      bb: 60,
      so: 100,
      avg: 0.280,
      slg: 0.440,
      iso: 0.160,
      babip: 0.300,
      k_pct: 0.147,
      bb_pct: 0.088
    }
  },
  {
    first_name: 'Carlos',
    last_name: 'Rodriguez',
    bats: 'R',
    throws: 'R',
    primary_position: '3B',
    batting_stats: {
      pa: 600,
      ab: 530,
      h: 145,
      '2b': 32,
      '3b': 3,
      hr: 35,
      bb: 55,
      so: 140,
      avg: 0.274,
      slg: 0.530,
      iso: 0.256,
      babip: 0.290,
      k_pct: 0.233,
      bb_pct: 0.092
    }
  },
  {
    first_name: 'Tyler',
    last_name: 'Anderson',
    bats: 'L',
    throws: 'L',
    primary_position: 'RF',
    batting_stats: {
      pa: 550,
      ab: 480,
      h: 130,
      '2b': 25,
      '3b': 4,
      hr: 22,
      bb: 55,
      so: 110,
      avg: 0.271,
      slg: 0.475,
      iso: 0.204,
      babip: 0.295,
      k_pct: 0.200,
      bb_pct: 0.100
    }
  },
  {
    first_name: 'Brandon',
    last_name: 'Lee',
    bats: 'R',
    throws: 'R',
    primary_position: 'C',
    batting_stats: {
      pa: 480,
      ab: 430,
      h: 108,
      '2b': 22,
      '3b': 1,
      hr: 18,
      bb: 40,
      so: 95,
      avg: 0.251,
      slg: 0.420,
      iso: 0.169,
      babip: 0.275,
      k_pct: 0.198,
      bb_pct: 0.083
    }
  },
  {
    first_name: 'Ryan',
    last_name: 'Thompson',
    bats: 'L',
    throws: 'L',
    primary_position: 'LF',
    batting_stats: {
      pa: 590,
      ab: 520,
      h: 148,
      '2b': 30,
      '3b': 5,
      hr: 25,
      bb: 55,
      so: 125,
      avg: 0.285,
      slg: 0.500,
      iso: 0.215,
      babip: 0.315,
      k_pct: 0.212,
      bb_pct: 0.093
    }
  },
  {
    first_name: 'Kevin',
    last_name: 'Brown',
    bats: 'R',
    throws: 'R',
    primary_position: '2B',
    batting_stats: {
      pa: 640,
      ab: 570,
      h: 160,
      '2b': 35,
      '3b': 7,
      hr: 15,
      bb: 55,
      so: 90,
      avg: 0.281,
      slg: 0.440,
      iso: 0.159,
      babip: 0.300,
      k_pct: 0.141,
      bb_pct: 0.086
    }
  },
  {
    first_name: 'Alex',
    last_name: 'Garcia',
    bats: 'S',
    throws: 'R',
    primary_position: 'DH',
    batting_stats: {
      pa: 560,
      ab: 490,
      h: 135,
      '2b': 28,
      '3b': 2,
      hr: 30,
      bb: 55,
      so: 130,
      avg: 0.276,
      slg: 0.510,
      iso: 0.234,
      babip: 0.295,
      k_pct: 0.232,
      bb_pct: 0.098
    }
  },
  
  // Sample Pitchers
  {
    first_name: 'Jacob',
    last_name: 'Miller',
    bats: 'R',
    throws: 'R',
    primary_position: 'SP',
    pitching_stats: {
      ip_outs: 600, // 200 IP
      h: 165,
      hr: 22,
      bb: 50,
      so: 220,
      k_pct: 0.275,
      bb_pct: 0.063,
      era: 3.15,
      whip: 1.08
    }
  },
  {
    first_name: 'Chris',
    last_name: 'Davis',
    bats: 'L',
    throws: 'L',
    primary_position: 'SP',
    pitching_stats: {
      ip_outs: 540, // 180 IP
      h: 155,
      hr: 18,
      bb: 55,
      so: 195,
      k_pct: 0.260,
      bb_pct: 0.073,
      era: 3.40,
      whip: 1.17
    }
  },
  {
    first_name: 'Matt',
    last_name: 'Harris',
    bats: 'R',
    throws: 'R',
    primary_position: 'SP',
    pitching_stats: {
      ip_outs: 480, // 160 IP
      h: 145,
      hr: 20,
      bb: 45,
      so: 160,
      k_pct: 0.240,
      bb_pct: 0.068,
      era: 3.75,
      whip: 1.19
    }
  },
  {
    first_name: 'Josh',
    last_name: 'Clark',
    bats: 'R',
    throws: 'R',
    primary_position: 'RP',
    pitching_stats: {
      ip_outs: 210, // 70 IP
      h: 55,
      hr: 6,
      bb: 25,
      so: 85,
      k_pct: 0.310,
      bb_pct: 0.091,
      era: 2.85,
      whip: 1.14
    }
  },
  {
    first_name: 'Nick',
    last_name: 'Robinson',
    bats: 'L',
    throws: 'L',
    primary_position: 'RP',
    pitching_stats: {
      ip_outs: 180, // 60 IP
      h: 48,
      hr: 5,
      bb: 20,
      so: 72,
      k_pct: 0.300,
      bb_pct: 0.083,
      era: 2.70,
      whip: 1.13
    }
  },
  {
    first_name: 'Eric',
    last_name: 'Walker',
    bats: 'R',
    throws: 'R',
    primary_position: 'CL',
    pitching_stats: {
      ip_outs: 195, // 65 IP
      h: 45,
      hr: 4,
      bb: 18,
      so: 90,
      k_pct: 0.360,
      bb_pct: 0.072,
      era: 2.35,
      whip: 0.97
    }
  }
]

// Team templates for quick setup
export const teamTemplates = [
  { name: 'Yankees', abbreviation: 'NYY', city: 'New York', primary_color: '#1a365d', secondary_color: '#c9c9c9' },
  { name: 'Red Sox', abbreviation: 'BOS', city: 'Boston', primary_color: '#bd1c2c', secondary_color: '#0d2b56' },
  { name: 'Cubs', abbreviation: 'CHC', city: 'Chicago', primary_color: '#0e3386', secondary_color: '#cc3433' },
  { name: 'Dodgers', abbreviation: 'LAD', city: 'Los Angeles', primary_color: '#005a9c', secondary_color: '#ef3e42' },
  { name: 'Giants', abbreviation: 'SFG', city: 'San Francisco', primary_color: '#fd5a1e', secondary_color: '#27251f' },
  { name: 'Cardinals', abbreviation: 'STL', city: 'St. Louis', primary_color: '#c41e3a', secondary_color: '#0c2340' },
  { name: 'Braves', abbreviation: 'ATL', city: 'Atlanta', primary_color: '#ce1141', secondary_color: '#13274f' },
  { name: 'Astros', abbreviation: 'HOU', city: 'Houston', primary_color: '#002d62', secondary_color: '#eb6e1f' }
]
