// Baseball glossary data for Startomatic 2D

export interface GlossaryEntry {
  term: string
  abbreviation: string | null
  category: string
  short_description: string
  long_description: string | null
  formula: string | null
  example: string | null
}

export const glossaryData: GlossaryEntry[] = [
  // Batting Statistics
  {
    term: 'Batting Average',
    abbreviation: 'AVG',
    category: 'Batting Statistics',
    short_description: 'The ratio of hits to at-bats, measuring how often a batter gets a hit.',
    long_description: 'Batting average has been the traditional measure of batting success since the early days of baseball. A .300 average is considered excellent, while the league average is typically around .250-.260.',
    formula: 'AVG = Hits / At-Bats',
    example: 'A player with 150 hits in 500 at-bats has a .300 batting average.'
  },
  {
    term: 'On-Base Percentage',
    abbreviation: 'OBP',
    category: 'Batting Statistics',
    short_description: 'The percentage of plate appearances where the batter reaches base.',
    long_description: 'OBP includes hits, walks, and hit-by-pitches, making it a more complete measure of a hitter\'s ability to avoid making outs. A .350 OBP is considered above average.',
    formula: 'OBP = (H + BB + HBP) / (AB + BB + HBP + SF)',
    example: 'A player reaching base 180 times in 500 plate appearances has a .360 OBP.'
  },
  {
    term: 'Slugging Percentage',
    abbreviation: 'SLG',
    category: 'Batting Statistics',
    short_description: 'A measure of hitting power calculated by total bases divided by at-bats.',
    long_description: 'Unlike batting average, slugging percentage gives more weight to extra-base hits. A single counts as 1, double as 2, triple as 3, and home run as 4.',
    formula: 'SLG = (1B + 2×2B + 3×3B + 4×HR) / AB',
    example: 'A player with 200 total bases in 500 at-bats has a .400 slugging percentage.'
  },
  {
    term: 'On-Base Plus Slugging',
    abbreviation: 'OPS',
    category: 'Batting Statistics',
    short_description: 'A combined measure of reaching base and hitting for power.',
    long_description: 'OPS is widely used as a quick measure of overall offensive value. An OPS over .900 is excellent, while league average is around .700-.750.',
    formula: 'OPS = OBP + SLG',
    example: 'A player with .350 OBP and .500 SLG has an .850 OPS.'
  },
  {
    term: 'Isolated Power',
    abbreviation: 'ISO',
    category: 'Batting Statistics',
    short_description: 'A measure of raw power, representing extra bases per at-bat.',
    long_description: 'ISO removes singles from slugging percentage to focus purely on extra-base hit ability. League average is around .140, while power hitters often exceed .200.',
    formula: 'ISO = SLG - AVG',
    example: 'A player with .500 SLG and .280 AVG has a .220 ISO.'
  },
  {
    term: 'Strikeout Rate',
    abbreviation: 'K%',
    category: 'Batting Statistics',
    short_description: 'The percentage of plate appearances that result in a strikeout.',
    long_description: 'Lower is generally better for batters. League average is around 22-23%, though many power hitters have higher rates.',
    formula: 'K% = Strikeouts / Plate Appearances × 100',
    example: 'A player with 100 strikeouts in 500 plate appearances has a 20% K rate.'
  },
  {
    term: 'Walk Rate',
    abbreviation: 'BB%',
    category: 'Batting Statistics',
    short_description: 'The percentage of plate appearances that result in a walk.',
    long_description: 'Higher walk rates indicate good plate discipline. League average is around 8-9%, while elite hitters can exceed 15%.',
    formula: 'BB% = Walks / Plate Appearances × 100',
    example: 'A player with 50 walks in 500 plate appearances has a 10% walk rate.'
  },
  {
    term: 'Batting Average on Balls in Play',
    abbreviation: 'BABIP',
    category: 'Batting Statistics',
    short_description: 'Batting average on balls put in play, excluding home runs and strikeouts.',
    long_description: 'BABIP helps identify luck factors. League average is around .300, and extreme values often regress toward the mean.',
    formula: 'BABIP = (H - HR) / (AB - K - HR + SF)',
    example: 'A BABIP of .350 might indicate luck, while .250 might indicate bad luck.'
  },

  // Pitching Statistics
  {
    term: 'Earned Run Average',
    abbreviation: 'ERA',
    category: 'Pitching Statistics',
    short_description: 'The average number of earned runs allowed per nine innings pitched.',
    long_description: 'ERA is the most traditional measure of pitching effectiveness. A sub-3.00 ERA is excellent, while league average is typically 4.00-4.50.',
    formula: 'ERA = (Earned Runs × 9) / Innings Pitched',
    example: 'A pitcher allowing 60 earned runs in 180 innings has a 3.00 ERA.'
  },
  {
    term: 'Walks and Hits per Inning Pitched',
    abbreviation: 'WHIP',
    category: 'Pitching Statistics',
    short_description: 'The average number of baserunners allowed per inning.',
    long_description: 'WHIP measures a pitcher\'s ability to prevent baserunners. Elite pitchers have WHIPs under 1.00, while league average is around 1.30.',
    formula: 'WHIP = (Walks + Hits) / Innings Pitched',
    example: 'A pitcher with 50 walks and 150 hits in 200 innings has a 1.00 WHIP.'
  },
  {
    term: 'Strikeouts per Nine Innings',
    abbreviation: 'K/9',
    category: 'Pitching Statistics',
    short_description: 'The average number of strikeouts per nine innings pitched.',
    long_description: 'Higher is better for pitchers. Elite strikeout pitchers exceed 10 K/9, while league average is around 8-9.',
    formula: 'K/9 = (Strikeouts × 9) / Innings Pitched',
    example: 'A pitcher with 200 strikeouts in 180 innings has an 10.0 K/9.'
  },
  {
    term: 'Walks per Nine Innings',
    abbreviation: 'BB/9',
    category: 'Pitching Statistics',
    short_description: 'The average number of walks issued per nine innings pitched.',
    long_description: 'Lower is better. Elite control pitchers have BB/9 under 2.0, while league average is around 3.0.',
    formula: 'BB/9 = (Walks × 9) / Innings Pitched',
    example: 'A pitcher with 40 walks in 180 innings has a 2.0 BB/9.'
  },
  {
    term: 'Home Runs per Nine Innings',
    abbreviation: 'HR/9',
    category: 'Pitching Statistics',
    short_description: 'The average number of home runs allowed per nine innings pitched.',
    long_description: 'Lower is better. League average varies by era but is typically around 1.2-1.4 HR/9.',
    formula: 'HR/9 = (Home Runs × 9) / Innings Pitched',
    example: 'A pitcher allowing 20 home runs in 180 innings has a 1.0 HR/9.'
  },

  // Game Mechanics
  {
    term: 'Plate Appearance',
    abbreviation: 'PA',
    category: 'Game Mechanics',
    short_description: 'Any time a batter completes a turn at bat, regardless of outcome.',
    long_description: 'Plate appearances include at-bats plus walks, hit-by-pitches, sacrifices, and interference calls.',
    formula: 'PA = AB + BB + HBP + SF + SH + Interference',
    example: 'A batter with 500 AB, 50 BB, and 5 HBP has 555 plate appearances.'
  },
  {
    term: 'At-Bat',
    abbreviation: 'AB',
    category: 'Game Mechanics',
    short_description: 'A plate appearance that results in a hit or out (excluding walks, HBP, sacrifices).',
    long_description: 'At-bats are used to calculate batting average. Walks and sacrifices don\'t count as at-bats because they\'re not considered failures.',
    formula: null,
    example: 'A strikeout, groundout, or single all count as at-bats.'
  },
  {
    term: 'Run Batted In',
    abbreviation: 'RBI',
    category: 'Game Mechanics',
    short_description: 'Credit given to a batter who causes a run to score.',
    long_description: 'RBIs are awarded for runs that score as a direct result of a batter\'s at-bat, except in certain situations like double plays.',
    formula: null,
    example: 'A grand slam gives the batter 4 RBIs.'
  },
  {
    term: 'Innings Pitched',
    abbreviation: 'IP',
    category: 'Game Mechanics',
    short_description: 'The number of innings a pitcher has pitched, including partial innings.',
    long_description: 'Each out recorded counts as one-third of an inning. "6.2 IP" means 6 and 2/3 innings (20 outs).',
    formula: 'IP = Outs Recorded / 3',
    example: 'A pitcher who records 20 outs has pitched 6.2 innings.'
  },

  // Simulation
  {
    term: 'Dice Roll',
    abbreviation: null,
    category: 'Simulation',
    short_description: 'The random element in Startomatic that determines play outcomes.',
    long_description: 'Three six-sided dice are rolled, producing a sum from 3 to 18. This sum is mapped to outcome probabilities based on the batter and pitcher ratings.',
    formula: '3d6 → Sum (3-18) → Outcome',
    example: 'Rolling 4-3-5 gives a sum of 12, which maps to a specific outcome range.'
  },
  {
    term: 'Probability Blending',
    abbreviation: null,
    category: 'Simulation',
    short_description: 'How batter and pitcher probabilities are combined to determine outcomes.',
    long_description: 'In Startomatic 2D, batter and pitcher probabilities are blended 50/50 to determine the outcome distribution for each plate appearance.',
    formula: 'Blended = (Batter × 0.5) + (Pitcher × 0.5)',
    example: 'A high-power batter vs a strikeout pitcher will have moderate HR and K probabilities.'
  },
  {
    term: 'Dice Table',
    abbreviation: null,
    category: 'Simulation',
    short_description: 'A mapping of dice sums to outcomes based on probability distributions.',
    long_description: 'The dice table converts the 16 possible outcomes of 3d6 (sums 3-18) into seven possible results: K, BB, OUT, 1B, 2B, 3B, HR.',
    formula: null,
    example: 'If K probability is 22%, roughly 3-4 slots on the dice table will be strikeouts.'
  },
  {
    term: 'Deterministic Replay',
    abbreviation: null,
    category: 'Simulation',
    short_description: 'The ability to replay a game with identical results using the same seed.',
    long_description: 'Startomatic uses a seeded random number generator. Given the same seed, lineups, and roster, a game will always produce identical results.',
    formula: null,
    example: 'Two users can verify game results by replaying with the same seed.'
  },
  {
    term: 'Seed',
    abbreviation: null,
    category: 'Simulation',
    short_description: 'A value used to initialize the random number generator for reproducible results.',
    long_description: 'The seed ensures games can be replayed exactly. It\'s generated randomly when a game starts but can be shared to verify results.',
    formula: null,
    example: 'Seed "abc123xyz" will always produce the same sequence of dice rolls.'
  }
]
