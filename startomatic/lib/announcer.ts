// Announcer/Commentary System for Garoball
// Generates contextual play-by-play text based on outcome and drama level

import type { Outcome, Game } from '@/types'
import type { DramaLevel } from './drama'

export interface AnnouncerCall {
  playByPlay: string
  colorCommentary?: string
}

/**
 * Get a random item from an array
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generate play-by-play call based on outcome and drama level
 */
export function generatePlayByPlayCall(
  outcome: Outcome,
  dramaLevel: DramaLevel,
  runsScored: number
): string {
  const calls = getCallTemplates(outcome, dramaLevel)
  return pickRandom(calls)
}

/**
 * Get call templates for each outcome and drama level
 */
function getCallTemplates(outcome: Outcome, dramaLevel: DramaLevel): string[] {
  const templates: Record<Outcome, Record<DramaLevel, string[]>> = {
    'HR': {
      routine: [
        "Deep drive... it's gone! Home run!",
        "Touch 'em all! That ball is outta here!",
        "Way back... see ya! Home run!"
      ],
      tense: [
        "High fly ball... going, going... GONE! What a shot!",
        "Crushed! That ball had a family! Home run!",
        "He got all of that one! Upper deck, home run!"
      ],
      clutch: [
        "Swing and a BLAST! This could be HUGE! IT'S GONE!",
        "OH MY! That ball is DESTROYED! HOME RUN!",
        "CRUSHED INTO THE NIGHT! What a time for a home run!"
      ],
      legendary: [
        "SWING AND A DRIVE... DEEP... WAY BACK... GONE!!! OH MY GOODNESS!!!",
        "TOUCH 'EM ALL! ABSOLUTE MOONSHOT! THE CROWD GOES WILD!",
        "FORGET ABOUT IT! THAT BALL IS HEADED TO THE PARKING LOT! LEGENDARY!"
      ]
    },
    '3B': {
      routine: [
        "Into the gap! He's flying... slides in, triple!",
        "Down the line, fair ball! All the way to the corner, triple!",
        "Base hit to the outfield, he's motoring! Triple!"
      ],
      tense: [
        "Gap shot! He's off and running! Around second, into third standing up!",
        "Oh what a hit! That's in the gap and he'll leg out a triple!",
        "Ropes one into the corner! Triple all the way!"
      ],
      clutch: [
        "Shot into the gap! He's churning! THIRD BASE! What timing!",
        "He DRIVES one to the wall! Around second! YES! Triple!",
        "In the air, to the gap! This is dropping! LEG IT OUT! Triple!"
      ],
      legendary: [
        "SMOKED into the gap! He is FLYING! SLIDES INTO THIRD! SAFE! TRIPLE!",
        "DEMOLISHED! To the wall! Around second, heading to third! HE'S IN! WOW!",
        "CLUTCH HIT! Off the wall! He's going for three! MAKES IT! INCREDIBLE!"
      ]
    },
    '2B': {
      routine: [
        "Base hit to the outfield! Into second with a double!",
        "That's down the line for a double!",
        "Nice stroke, into the gap for two!"
      ],
      tense: [
        "Line drive! Over the infield, that'll be extra bases!",
        "Rips one into left-center! Hustles into second, double!",
        "Shot into the gap! Standing up double!"
      ],
      clutch: [
        "Drives one to the wall! He's got second base! Big hit!",
        "Right down the line! That finds grass! Double!",
        "Perfect placement! Into the gap! Double at a crucial moment!"
      ],
      legendary: [
        "SMASH! That's to the wall! DOUBLE! Just what they needed!",
        "RIPS one into the corner! Around first! INTO SECOND! YES!",
        "CLUTCH DOUBLE! Right when it matters most! Wow!"
      ]
    },
    '1B': {
      routine: [
        "Base hit to the outfield.",
        "There's a single through the infield.",
        "Drops in for a base hit."
      ],
      tense: [
        "Clean single to center field!",
        "Finds a hole! Base hit!",
        "Punches one through for a single!"
      ],
      clutch: [
        "Right through the infield! BIG single!",
        "He comes through! Base hit at a key moment!",
        "Clutch hitting! Single up the middle!"
      ],
      legendary: [
        "DELIVERS! Base hit! Runners are moving!",
        "THROUGH THE HOLE! Single! This is HUGE!",
        "COMES UP BIG! Single at the perfect time!"
      ]
    },
    'BB': {
      routine: [
        "Ball four, takes his base.",
        "Works a walk.",
        "Good eye, draws the walk."
      ],
      tense: [
        "Ball four! Patient approach pays off!",
        "Fouled off some tough pitches, draws the walk!",
        "Great plate discipline! Walk!"
      ],
      clutch: [
        "Ball four! Important walk here!",
        "Doesn't chase! Takes ball four in a big spot!",
        "Professional at-bat! Works the walk!"
      ],
      legendary: [
        "BALL FOUR! Takes the walk in a MASSIVE situation!",
        "Won't give in! That's ball four! Incredible discipline!",
        "WALKS with the game on the line! Nerves of steel!"
      ]
    },
    'K': {
      routine: [
        "Strike three called, he's out.",
        "Swings and misses, strike three.",
        "Caught looking, strikeout."
      ],
      tense: [
        "Strike three! Got him!",
        "Swing and a miss! Punches him out!",
        "Frozen! Strike three called!"
      ],
      clutch: [
        "STRIKE THREE! Huge strikeout!",
        "Got him looking! What a pitch!",
        "Paints the corner! Strike three!"
      ],
      legendary: [
        "STRIKE THREE! WHAT A PITCH! What a moment!",
        "GOT HIM! Struck him out! The crowd erupts!",
        "SWUNG ON AND MISSED! STRIKE THREE! WOW!"
      ]
    },
    'OUT': {
      routine: [
        "Routine fly ball, caught for the out.",
        "Ground ball, thrown to first, out.",
        "That's an easy out."
      ],
      tense: [
        "High fly ball... caught! That's an out!",
        "Ground ball, quick throw! Got him!",
        "Line drive... snared! Nice catch!"
      ],
      clutch: [
        "Pop fly... under it... GOT IT! Big out!",
        "Grounder! Quick play! OUT! Escapes trouble!",
        "Fly ball... plenty of room... CAUGHT! Crucial out!"
      ],
      legendary: [
        "SOARING fly ball! Way back... CAUGHT! WOW! What an out!",
        "SHARP grounder! GREAT PLAY! OUT! Unbelievable!",
        "HIGH pop-up! Plenty of time to think... SECURED! HUGE out!"
      ]
    }
  }

  return templates[outcome]?.[dramaLevel] || [
    `${outcome} - ${dramaLevel} situation`
  ]
}

/**
 * Generate pre-pitch tension text based on game situation
 */
export function generatePrePitchTension(game: Game, dramaLevel: DramaLevel): string {
  const { outs, runner_1b, runner_2b, runner_3b } = game
  
  const runnersOn = [runner_1b, runner_2b, runner_3b].filter(r => r !== null).length
  
  if (dramaLevel === 'legendary') {
    if (runnersOn === 3) {
      return "Bases loaded... the tension is unbearable... here's the pitch..."
    }
    if (runnersOn >= 1) {
      return "The crowd is on its feet... this is what baseball is all about..."
    }
    return "You can feel it in the air... something special is about to happen..."
  }
  
  if (dramaLevel === 'clutch') {
    if (outs === 2) {
      return "Two outs... runners in scoring position... here we go..."
    }
    if (runnersOn >= 2) {
      return "Big situation here... multiple runners on... the pitch..."
    }
    return "This could be the moment... here's the delivery..."
  }
  
  if (dramaLevel === 'tense') {
    if (runnersOn > 0) {
      return "Runners on... let's see what happens here..."
    }
    return "Close game... every pitch matters..."
  }
  
  return "" // No tension text for routine plays
}

/**
 * Generate color commentary for special situations
 */
export function generateColorCommentary(
  game: Game,
  outcome: Outcome,
  runsScored: number,
  isWalkOff: boolean,
  isComeback: boolean
): string | undefined {
  // Walk-off situation
  if (isWalkOff && runsScored > 0 && game.half === 'bottom') {
    const homeWon = game.home_score > game.away_score
    if (homeWon) {
      if (outcome === 'HR') {
        return "WALK-OFF HOME RUN! The home team wins it in dramatic fashion! What a finish!"
      }
      return "WALK-OFF! That's the ballgame! The home team wins it! Unbelievable!"
    }
  }
  
  // Big comeback
  if (isComeback && runsScored >= 2) {
    return "They're battling back! This team refuses to quit! What a gutsy performance!"
  }
  
  // Grand slam
  if (outcome === 'HR' && runsScored === 4) {
    return "GRAND SLAM! Four runs cross the plate on one swing! That's a game-changer!"
  }
  
  // Multiple runs scored
  if (runsScored >= 3 && outcome !== 'HR') {
    return `${runsScored} runs score on the play! What a big hit!`
  }
  
  return undefined
}

/**
 * Generate complete announcer call with play-by-play and optional color commentary
 */
export function generateAnnouncerCall(
  game: Game,
  outcome: Outcome,
  runsScored: number,
  dramaLevel: DramaLevel,
  isWalkOff: boolean,
  isComeback: boolean
): AnnouncerCall {
  const playByPlay = generatePlayByPlayCall(outcome, dramaLevel, runsScored)
  const colorCommentary = generateColorCommentary(
    game,
    outcome,
    runsScored,
    isWalkOff,
    isComeback
  )
  
  return {
    playByPlay,
    colorCommentary
  }
}
