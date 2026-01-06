# How Garoball Works

A plain English guide to understanding and playing Garoball — a baseball simulation game inspired by Strat-O-Matic.

---

## What Is Garoball?

Garoball is a **dice-based baseball simulation game**. Instead of controlling players with a joystick or timing button presses, you roll dice to determine what happens at each at-bat. Every player has a "card" with their real statistics, and the dice decide whether they get a hit, strike out, walk, or something else.

Think of it like playing a baseball board game, but on your computer.

---

## The Basic Idea

Baseball is a simple sport at its core:
- **Batter tries to get on base**
- **Runners try to score**
- **Pitcher tries to get batters out**
- **Three outs ends your turn**

In Garoball, each at-bat works like this:

1. **The game looks at who's batting and who's pitching**
2. **It blends their stats together** (good hitter vs. good pitcher = toss-up)
3. **You roll three dice**
4. **The dice total tells you what happened**

That's it. Simple.

---

## Before vs. After: What Changed

### How It Used To Work (Before)

The old system had a problem: **the dice were just for show**.

Here's what was happening behind the scenes:
1. You'd roll three dice and see them on screen
2. But the game ignored those dice
3. A separate random number decided what actually happened
4. The dice display was basically a lie

**Why this was bad:**
- If you rolled an 18 (the best roll), you might still strike out
- The dice table on screen didn't match reality
- It broke the trust of "dice + card = result"

### How It Works Now (After)

Now **the dice actually matter**:

1. You roll three dice (each 1-6)
2. Add them up (totals range from 3 to 18)
3. Look at the batter's dice table
4. The table tells you exactly what happened

**Example:**
- You roll 4 + 5 + 6 = **15**
- The dice table shows: 14-16 = Double
- Result: **Double!**

The dice you see are the dice that count. No tricks.

---

## How the Dice Table Works

Every at-bat creates a custom dice table based on the batter and pitcher.

### The Math (Don't Worry, It's Simple)

Three dice can total anywhere from **3** (rolling 1-1-1) to **18** (rolling 6-6-6). That's 16 possible results.

But here's the trick: **not all totals are equally likely!**

Rolling a 10 or 11 is much more common than rolling a 3 or 18:
- Rolling a **10 or 11**: ~12.5% each (very common)
- Rolling a **3 or 18**: ~0.5% each (very rare)

The game accounts for this bell curve distribution when building the dice table. Common outcomes (like outs) are assigned to the common dice totals (8-12), while rare outcomes (like home runs) are assigned to the rare totals (like 18).

### The 7 Possible Outcomes

- **K** (Strikeout)
- **BB** (Walk)  
- **OUT** (Ground out, fly out, etc.)
- **1B** (Single)
- **2B** (Double)
- **3B** (Triple)
- **HR** (Home Run)

### How Dice Totals Are Assigned

The game uses a smart algorithm that:
1. Looks at the batter and pitcher's real statistics
2. Calculates the probability of each outcome
3. Assigns dice totals to outcomes so that the actual probability of each outcome matches the player's stats

**Example**: If a batter should strikeout 22% of the time, the algorithm assigns enough dice totals to K so that when you account for the 3d6 bell curve, strikeouts happen about 22% of the time.

### Good vs. Bad Players

A great hitter like Mike Trout would have:
- Fewer dice totals leading to strikeouts
- More dice totals leading to hits
- Better chance of home runs on those rare 17-18 rolls

A pitcher like Jacob deGrom would shift things toward:
- More dice totals leading to strikeouts
- Fewer dice totals leading to hits

When a great hitter faces a great pitcher, their stats blend 50/50, creating a balanced table.

---

## How Runners Move

Once you know the outcome (single, double, etc.), runners advance according to simple rules:

### The Runner Movement Chart

| What Happened | Runner on 3rd | Runner on 2nd | Runner on 1st | Batter |
|---------------|---------------|---------------|---------------|--------|
| **Home Run** | Scores | Scores | Scores | Scores |
| **Triple** | Scores | Scores | Scores | → 3rd |
| **Double** | Scores | Scores | → 3rd | → 2nd |
| **Single** | Scores | → 3rd | → 2nd | → 1st |
| **Walk** | Scores* | → 3rd* | → 2nd* | → 1st |
| **Out/K** | Stays | Stays | Stays | Out |

*Runners only move on a walk if they're **forced** (someone behind them is pushing them forward).

### Examples

**Bases empty, single:**
- Batter goes to 1st base
- No runs score

**Runner on 3rd, single:**
- Runner scores (1 run!)
- Batter goes to 1st

**Bases loaded, home run (Grand Slam!):**
- All 3 runners score
- Batter scores
- **4 runs!**

---

## How a Game Flows

### Starting the Game

1. Away team bats first (top of the 1st inning)
2. Home team's pitcher is on the mound
3. First batter in the away lineup steps up

### Each At-Bat

1. Game calculates the dice table (batter + pitcher blend)
2. Dice are rolled
3. Outcome is determined from the table
4. Runners advance (if applicable)
5. Runs score (if applicable)
6. Next batter comes up

### Three Outs

When the batting team gets 3 outs:
- Bases are cleared
- Teams switch (batting ↔ fielding)
- The lineup picks up where it left off

**Important:** The lineup doesn't reset! If batter #7 made the last out, batter #8 leads off the next inning.

### End of Game

- A standard game is 9 innings
- After 9 innings, the team with more runs wins
- If tied, extra innings continue until someone wins
- Walk-off: If the home team takes the lead in the bottom of the 9th (or later), the game ends immediately

---

## Reading the Box Score

After each game, you'll see a box score showing:

### Team Line Score
```
        1  2  3  4  5  6  7  8  9  |  R   H   E
Away    0  2  0  1  0  0  0  0  0  |  3   8   0
Home    1  0  0  0  2  0  1  0  X  |  4   9   0
```

- Each column = runs scored that inning
- R = Total Runs
- H = Total Hits
- E = Errors (not tracked yet)
- X = Home team didn't bat (they were already winning)

### Player Stats

**Batting:**
| Player | AB | R | H | RBI | BB | SO |
|--------|----|----|---|-----|----|----|
| Jones | 4 | 1 | 2 | 1 | 0 | 1 |

- **AB** = At Bats (times they batted, not counting walks)
- **R** = Runs scored
- **H** = Hits
- **RBI** = Runs Batted In (runs they drove in)
- **BB** = Walks
- **SO** = Strikeouts

**Pitching:**
| Pitcher | IP | H | R | ER | BB | SO |
|---------|-----|---|---|----|----|-----|
| Smith | 7.0 | 6 | 3 | 3 | 2 | 8 |

- **IP** = Innings Pitched
- **H** = Hits allowed
- **R** = Runs allowed
- **ER** = Earned Runs
- **BB** = Walks issued
- **SO** = Strikeouts

---

## Understanding Player Cards

Each player has a card based on their real statistics.

### Batter Card Shows:
- **AVG** = Batting Average (hits ÷ at bats)
- **HR** = Home Runs
- **RBI** = Runs Batted In
- **K%** = Strikeout percentage (lower is better)
- **BB%** = Walk percentage (higher is better)
- **SLG** = Slugging percentage (power stat)

### Pitcher Card Shows:
- **ERA** = Earned Run Average (lower is better)
- **K%** = Strikeout percentage (higher is better)
- **BB%** = Walk percentage (lower is better)
- **WHIP** = Walks + Hits per Inning Pitched

### The Dice Table

This is the most important part of the card. It shows exactly what dice rolls produce what outcomes for this player.

A power hitter might have:
```
3-4:  K
5-6:  BB
7-11: OUT
12-14: 1B
15-16: 2B
17:   3B
18:   HR
```

A contact hitter might have:
```
3-5:  K
6:    BB
7-10: OUT
11-15: 1B
16-17: 2B
18:   3B/HR
```

---

## What Makes Games Different

### The Matchup Matters

When a batter faces a pitcher, their tables blend together:
- **50%** from the batter's stats
- **50%** from the pitcher's stats

This means:
- A great hitter vs. a weak pitcher = lots of hits
- A weak hitter vs. a great pitcher = lots of outs
- Two evenly matched players = realistic outcomes

### The Dice Add Drama

Because dice are random, anything can happen:
- Your star player might strike out
- Your weakest batter might hit a home run
- A pitcher might walk 3 guys in a row

This randomness creates exciting, realistic baseball games.

---

## Game Modes

### Watch Mode (Step-by-Step)
- See each at-bat one at a time
- Watch the dice roll
- Follow the action closely
- Great for important games

### Simulate Mode (Fast)
- Entire game plays out instantly
- See final box score
- Good for simulating seasons quickly

---

## Tips for New Players

1. **Pay attention to the dice table** — it tells you the odds
2. **Lineup order matters** — your best hitters should bat 3rd/4th
3. **Pitching matchups are key** — a good pitcher limits hits
4. **Anything can happen** — that's the beauty of dice baseball
5. **Watch for clutch moments** — late innings with close scores are exciting

---

## Quick Reference

### Outcomes (Best to Worst for Batter)
1. **HR** — Home Run (everyone scores!)
2. **3B** — Triple (all runners score)
3. **2B** — Double (runners advance 2 bases)
4. **1B** — Single (runners advance 1 base)
5. **BB** — Walk (batter takes 1st, runners may advance)
6. **OUT** — Ground out, fly out, etc.
7. **K** — Strikeout

### Dice Probabilities
The most common dice totals are 10 and 11 (each has 12.5% chance).
The rarest are 3 and 18 (each has 0.46% chance).

This is why the middle of the dice table usually has outs — they're the most likely results.

---

## Glossary

| Term | Meaning |
|------|---------|
| **At-Bat (AB)** | A plate appearance that counts (not walks) |
| **RBI** | Runs Batted In — runs you drove in with your hit |
| **ERA** | Earned Run Average — average runs allowed per 9 innings |
| **WHIP** | Walks + Hits per Inning Pitched |
| **Bases Loaded** | Runners on 1st, 2nd, and 3rd |
| **Grand Slam** | Home run with bases loaded (4 runs!) |
| **Walk-Off** | Home team wins in their final at-bat |
| **Shutout** | Winning team allows 0 runs |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial release with Strat-O-Matic style dice |

---

*Garoball is inspired by Strat-O-Matic Baseball, the classic dice-based baseball simulation game. Strat-O-Matic is a registered trademark of Strat-O-Matic Media, LLC.*

