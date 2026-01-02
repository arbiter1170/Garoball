// Retro Arcade Audio Engine for Garoball
// 8-bit/chiptune style sound effects using Web Audio API

type Outcome = 'K' | 'BB' | 'OUT' | '1B' | '2B' | '3B' | 'HR'

class AudioEngine {
    private context: AudioContext | null = null
    private masterGain: GainNode | null = null
    private _muted: boolean = false
    private _volume: number = 0.5

    private getContext(): AudioContext {
        if (!this.context) {
            this.context = new AudioContext()
            this.masterGain = this.context.createGain()
            this.masterGain.connect(this.context.destination)
            this.masterGain.gain.value = this._muted ? 0 : this._volume
        }
        // Resume if suspended (browser autoplay policy)
        if (this.context.state === 'suspended') {
            this.context.resume()
        }
        return this.context
    }

    private getMasterGain(): GainNode {
        this.getContext()
        return this.masterGain!
    }

    get volume(): number {
        return this._volume
    }

    set volume(v: number) {
        this._volume = Math.max(0, Math.min(1, v))
        if (this.masterGain && !this._muted) {
            this.masterGain.gain.value = this._volume
        }
    }

    get muted(): boolean {
        return this._muted
    }

    set muted(m: boolean) {
        this._muted = m
        if (this.masterGain) {
            this.masterGain.gain.value = m ? 0 : this._volume
        }
    }

    toggleMute(): boolean {
        this.muted = !this.muted
        return this.muted
    }

    // ========================================
    // Sound Generators - 8-bit style
    // ========================================

    /**
     * Create an oscillator with ADSR envelope
     */
    private playTone(
        frequency: number,
        duration: number,
        type: OscillatorType = 'square',
        attack: number = 0.01,
        decay: number = 0.1,
        sustain: number = 0.3,
        release: number = 0.1
    ): void {
        const ctx = this.getContext()
        const osc = ctx.createOscillator()
        const gainNode = ctx.createGain()

        osc.type = type
        osc.frequency.value = frequency
        osc.connect(gainNode)
        gainNode.connect(this.getMasterGain())

        const now = ctx.currentTime
        const peakTime = now + attack
        const decayTime = peakTime + decay
        const sustainTime = decayTime + duration
        const endTime = sustainTime + release

        gainNode.gain.setValueAtTime(0, now)
        gainNode.gain.linearRampToValueAtTime(0.8, peakTime)
        gainNode.gain.linearRampToValueAtTime(sustain, decayTime)
        gainNode.gain.setValueAtTime(sustain, sustainTime)
        gainNode.gain.linearRampToValueAtTime(0, endTime)

        osc.start(now)
        osc.stop(endTime)
    }

    /**
     * Play white noise burst
     */
    private playNoise(duration: number, volume: number = 0.3): void {
        const ctx = this.getContext()
        const bufferSize = ctx.sampleRate * duration
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * volume
        }

        const noise = ctx.createBufferSource()
        const gainNode = ctx.createGain()
        noise.buffer = buffer
        noise.connect(gainNode)
        gainNode.connect(this.getMasterGain())

        const now = ctx.currentTime
        gainNode.gain.setValueAtTime(volume, now)
        gainNode.gain.linearRampToValueAtTime(0, now + duration)

        noise.start(now)
        noise.stop(now + duration)
    }

    /**
     * Play a sequence of notes (arpeggio)
     */
    private playArpeggio(
        frequencies: number[],
        noteDuration: number = 0.08,
        type: OscillatorType = 'square'
    ): void {
        const ctx = this.getContext()
        const now = ctx.currentTime

        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gainNode = ctx.createGain()

            osc.type = type
            osc.frequency.value = freq
            osc.connect(gainNode)
            gainNode.connect(this.getMasterGain())

            const startTime = now + i * noteDuration
            const endTime = startTime + noteDuration * 0.9

            gainNode.gain.setValueAtTime(0, startTime)
            gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.01)
            gainNode.gain.linearRampToValueAtTime(0, endTime)

            osc.start(startTime)
            osc.stop(endTime + 0.01)
        })
    }

    // ========================================
    // Baseball Sound Effects
    // ========================================

    /** Strikeout - descending sad tones */
    playStrikeout(): void {
        this.playArpeggio([440, 330, 220], 0.12, 'square')
    }

    /** Ball/Walk - neutral ascending chime */
    playWalk(): void {
        this.playArpeggio([330, 440, 550], 0.1, 'triangle')
    }

    /** Out - short low thud */
    playOut(): void {
        this.playTone(150, 0.1, 'square', 0.01, 0.05, 0.2, 0.1)
        this.playNoise(0.05, 0.1)
    }

    /** Single - quick hit sound */
    playSingle(): void {
        this.playNoise(0.03, 0.4) // bat crack
        this.playTone(523, 0.15, 'square', 0.01, 0.05, 0.3, 0.1)
    }

    /** Double - hit with ascending tone */
    playDouble(): void {
        this.playNoise(0.03, 0.4)
        this.playArpeggio([523, 659], 0.1, 'square')
    }

    /** Triple - hit with upward arpeggio */
    playTriple(): void {
        this.playNoise(0.03, 0.4)
        this.playArpeggio([523, 659, 784], 0.1, 'square')
    }

    /** Home Run - victory fanfare! */
    playHomeRun(): void {
        this.playNoise(0.05, 0.5) // big crack
        // C major chord arpeggio ascending
        this.playArpeggio([523, 659, 784, 1047], 0.12, 'square')
        // Follow-up celebration
        setTimeout(() => {
            this.playArpeggio([784, 880, 988, 1047], 0.08, 'triangle')
        }, 500)
    }

    /** Dice roll - clatter effect */
    playDiceRoll(): void {
        const ctx = this.getContext()
        const now = ctx.currentTime

        // Multiple short noise bursts for dice clatter
        for (let i = 0; i < 6; i++) {
            const delay = i * 0.05 + Math.random() * 0.02
            setTimeout(() => this.playNoise(0.03, 0.2 - i * 0.02), delay * 1000)
        }

        // Final "settle" tone
        setTimeout(() => {
            this.playTone(880, 0.05, 'triangle', 0.01, 0.02, 0.3, 0.02)
        }, 350)
    }

    /** Play sound for game outcome */
    playOutcome(outcome: Outcome): void {
        switch (outcome) {
            case 'K':
                this.playStrikeout()
                break
            case 'BB':
                this.playWalk()
                break
            case 'OUT':
                this.playOut()
                break
            case '1B':
                this.playSingle()
                break
            case '2B':
                this.playDouble()
                break
            case '3B':
                this.playTriple()
                break
            case 'HR':
                this.playHomeRun()
                break
        }
    }

    /** Generic UI click sound */
    playClick(): void {
        this.playTone(800, 0.03, 'square', 0.005, 0.01, 0.5, 0.02)
    }

    /** Error/invalid action sound */
    playError(): void {
        this.playArpeggio([200, 150], 0.1, 'sawtooth')
    }

    /** Success/confirm sound */
    playSuccess(): void {
        this.playArpeggio([440, 660], 0.08, 'triangle')
    }
}

// Singleton instance
export const audioEngine = new AudioEngine()

// Re-export type for convenience
export type { Outcome }
