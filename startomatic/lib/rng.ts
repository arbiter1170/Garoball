// Seedable Mulberry32 PRNG for deterministic game simulation
// Allows replay of games with same seed to get identical results

export interface RngState {
  seed: number
  callCount: number
}

export class SeededRng {
  private state: number
  private callCount: number
  private initialSeed: number

  constructor(seed: string | number) {
    this.initialSeed = typeof seed === 'string' ? this.hashString(seed) : seed
    this.state = this.initialSeed
    this.callCount = 0
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) || 1
  }

  // Mulberry32 algorithm - fast and high quality 32-bit PRNG
  private mulberry32(): number {
    let t = this.state += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }

  // Get a random number between 0 and 1
  random(): number {
    this.callCount++
    return this.mulberry32()
  }

  // Get a random integer between min (inclusive) and max (inclusive)
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min
  }

  // Roll three dice (each 1-6)
  rollDice(): [number, number, number] {
    return [
      this.randomInt(1, 6),
      this.randomInt(1, 6),
      this.randomInt(1, 6)
    ]
  }

  // Calculate dice index (sum of 3d6 ranges from 3 to 18, map to 0-15)
  rollDiceIndex(): { dice: [number, number, number]; index: number } {
    const dice = this.rollDice()
    const sum = dice[0] + dice[1] + dice[2]
    const index = sum - 3 // 3-18 maps to 0-15
    return { dice, index }
  }

  // Get current state for serialization
  getState(): RngState {
    return {
      seed: this.initialSeed,
      callCount: this.callCount
    }
  }

  // Restore RNG to a specific state
  static fromState(state: RngState): SeededRng {
    const rng = new SeededRng(state.seed)
    // Fast-forward to the saved call count
    for (let i = 0; i < state.callCount; i++) {
      rng.random()
    }
    return rng
  }
}

// Generate a random seed string
export function generateSeed(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}
