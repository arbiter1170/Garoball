# Garoball Feature Map

## Overview

Live demo: **https://startomatic.vercel.app**

---

## ✅ Working Features

### Authentication & Navigation

| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Landing Page | `/` | ✅ Working | Beautiful design |
| Dashboard | `/dashboard` | ✅ Working | Shows user's teams, games, leagues |
| Sign Out | - | ✅ Working | Button in header |
| Mock Mode Auth | - | ✅ Working | Auto-authenticates as Demo User |

### Game Simulation (Core Feature)

| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Game View | `/games/[id]` | ✅ Working | Main game UI |
| Live View Tab | - | ✅ Working | Shows batter/pitcher cards, dice, diamond |
| Box Score Tab | - | ✅ Working | Full batting and pitching stats |
| Play-by-Play Tab | - | ✅ Working | Full game log |
| Next At-Bat | - | ✅ Working | Single PA simulation |
| Sim Inning | - | ✅ Working | Simulate full half-inning |
| Sim Game | - | ✅ Working | Simulate to completion |
| Diamond Display | - | ✅ Working | Shows runners on bases |
| Dice Display | - | ✅ Working | Shows 3d6 roll values |
| Drama System | - | ✅ Working | Leverage index + crowd mood |
| Game Over Banner | - | ✅ Working | Shows final score |
| Scoreboard | - | ✅ Working | Line score with R/H/E |

### Leagues

| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Leagues List | `/leagues` | ✅ Working | Shows all leagues |
| League Detail | `/leagues/[id]` | ✅ Working | Shows teams, standings, settings |
| Create League | `/leagues/new` | ✅ Working | Form with DH, innings, games per matchup |
| Quick Start Game | - | ✅ Working | On league detail page |

### Reference

| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Glossary | `/glossary` | ✅ Working | Comprehensive baseball stat explanations |

---

## ⚠️ Broken Features (Mock Mode)

| Feature | Route | Error | Root Cause |
|---------|-------|-------|------------|
| Team Detail | `/teams/[id]` | 500 Server Error | Queries `rosters` table not in mock |
| MLB Browser | `/mlb` | Internal Server Error | API needs mock data for teams |

---

## 📊 Testing Results

### Game Simulation Outcomes (After Bug Fixes)

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Strikeout Rate | ~20-25% | ~15-20% | ✅ Realistic |
| Hits per Game | 15-20 total | 17 (9+8) | ✅ Realistic |
| Outcome Variety | All 7 outcomes | K, BB, OUT, 1B, 2B, 3B, HR | ✅ All present |
| Unique Rosters | Different players | BOS ≠ NYY | ✅ Fixed |

### Bugs Fixed (Jan 7, 2026)

1. **Critical: Wrong Dice Outcomes** - Fixed missing `blendedProbs` param
2. **Medium: Same Players on Both Teams** - Added 13 new players

---

## 🗺️ Route Map

```
/                      → Landing page (public)
├── /login             → Login form
├── /signup            → Signup form
├── /dashboard         → Main user dashboard [protected]
├── /games/[id]        → Game simulation view [protected]
├── /teams/[id]        → Team detail (BROKEN) [protected]
├── /leagues           → Leagues list [protected]
│   ├── /new           → Create league form
│   └── /[id]          → League detail
│       ├── /manage    → League management
│       ├── /join      → Join league
│       └── /seasons/new → Create season
├── /mlb               → MLB roster browser (BROKEN)
└── /glossary          → Baseball terminology
```

---

## 🎮 Game UI Components

### Player Card
- Name and position
- Stats: PA, AVG, HR, K%, BABIP, OBP, SLG, ISO (batters)
- Stats: IP, ERA, K% (pitchers)
- Team color accent bar

### Diamond View
- Visual baseball diamond
- Runner indicators on bases
- Outs indicator (filled/empty circles)

### Dice Display
- 3D dice images (1-6)
- Sum total display

### Drama Overlay
- Leverage Index (0.65 - 4.0+)
- Crowd Mood (Quiet → Roaring)
- Labels: Routine, Important, High, CLUTCH

### Scoreboard
- Line score by inning
- R/H/E totals
- Team abbreviations with color badges

---

## 🔧 Mock Mode Data

### Available Mock Data

| Entity | Count | Notes |
|--------|-------|-------|
| Users | 1 | Demo User |
| Teams | 2 | Yankees, Red Sox |
| Players | 28 | 18 batters + 10 pitchers |
| Leagues | 1 | Demo League |
| Seasons | 1 | 2024 Season |
| Games | 1 | game-1 (resets on load) |

### Missing Mock Data

| Entity | Impact |
|--------|--------|
| `rosters` table | Breaks `/teams/[id]` page |
| MLB teams API | Breaks `/mlb` page |

---

## 📱 Responsive Design

| Breakpoint | Status | Notes |
|------------|--------|-------|
| Desktop (1280px+) | ✅ Working | 3-column layout |
| Tablet (768px) | ✅ Working | 2-column, stacked elements |
| Mobile (375px) | ✅ Working | Single column, compact cards |

---

## 🚀 Next Steps

### Quick Wins
1. Add `rosters` mock table to fix team pages
2. Add MLB teams mock data to fix browser
3. Dice roll animation (keyframes exist)

### Future Features
1. Handedness matchups (platoon advantage)
2. NPC pitching manager
3. GIDP (double plays)
4. Stolen bases
5. Custom typography

