'use client'

import { useEffect, useState } from 'react'

interface CreditsDisplayProps {
    className?: string
}

export function CreditsDisplay({ className = '' }: CreditsDisplayProps) {
    const [credits, setCredits] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [animating, setAnimating] = useState(false)

    const fetchCredits = async () => {
        try {
            const res = await fetch('/api/credits')
            if (res.ok) {
                const data = await res.json()
                const newCredits = data.credits?.credits ?? 0

                // Animate if credits changed
                if (credits !== null && newCredits !== credits) {
                    setAnimating(true)
                    setTimeout(() => setAnimating(false), 500)
                }

                setCredits(newCredits)
            }
        } catch (error) {
            console.error('Failed to fetch credits:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCredits()

        // Poll for updates every 30 seconds
        const interval = setInterval(fetchCredits, 30000)
        return () => clearInterval(interval)
    }, [])

    // Listen for credit updates
    useEffect(() => {
        const handleCreditUpdate = () => fetchCredits()
        window.addEventListener('credits-updated', handleCreditUpdate)
        return () => window.removeEventListener('credits-updated', handleCreditUpdate)
    }, [])

    if (loading) {
        return (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 bg-yellow-900/50 rounded-lg ${className}`}>
                <span className="text-yellow-400">💰</span>
                <span className="text-yellow-200 font-medium text-sm">...</span>
            </div>
        )
    }

    return (
        <div
            className={`flex items-center gap-1.5 px-3 py-1.5 bg-yellow-900/50 rounded-lg transition-all ${animating ? 'scale-110 bg-yellow-700/50' : ''
                } ${className}`}
        >
            <span className="text-yellow-400">💰</span>
            <span className={`text-yellow-200 font-bold text-sm ${animating ? 'text-yellow-100' : ''}`}>
                {credits?.toLocaleString() ?? 0}
            </span>
        </div>
    )
}
