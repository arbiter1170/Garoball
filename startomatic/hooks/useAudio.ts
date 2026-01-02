'use client'

import { useCallback, useState, useEffect } from 'react'
import { audioEngine, Outcome } from '@/lib/audio'

/**
 * React hook for audio controls
 */
export function useAudio() {
    const [muted, setMuted] = useState(false)
    const [volume, setVolumeState] = useState(0.5)

    // Sync state with audio engine on mount
    useEffect(() => {
        // Try to restore from localStorage
        const savedMuted = localStorage.getItem('garoball-audio-muted')
        const savedVolume = localStorage.getItem('garoball-audio-volume')

        if (savedMuted !== null) {
            const isMuted = savedMuted === 'true'
            audioEngine.muted = isMuted
            setMuted(isMuted)
        }

        if (savedVolume !== null) {
            const vol = parseFloat(savedVolume)
            if (!isNaN(vol)) {
                audioEngine.volume = vol
                setVolumeState(vol)
            }
        }
    }, [])

    const toggleMute = useCallback(() => {
        const newMuted = audioEngine.toggleMute()
        setMuted(newMuted)
        localStorage.setItem('garoball-audio-muted', String(newMuted))
    }, [])

    const setVolume = useCallback((v: number) => {
        audioEngine.volume = v
        setVolumeState(v)
        localStorage.setItem('garoball-audio-volume', String(v))
    }, [])

    const playOutcome = useCallback((outcome: Outcome) => {
        audioEngine.playOutcome(outcome)
    }, [])

    const playDiceRoll = useCallback(() => {
        audioEngine.playDiceRoll()
    }, [])

    const playClick = useCallback(() => {
        audioEngine.playClick()
    }, [])

    const playSuccess = useCallback(() => {
        audioEngine.playSuccess()
    }, [])

    const playError = useCallback(() => {
        audioEngine.playError()
    }, [])

    return {
        muted,
        volume,
        toggleMute,
        setVolume,
        playOutcome,
        playDiceRoll,
        playClick,
        playSuccess,
        playError,
    }
}
