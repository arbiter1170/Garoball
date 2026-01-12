'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CreditsDisplay } from '@/components/around-the-horn/CreditsDisplay'

interface StoreItem {
    id: string
    name: string
    description: string | null
    category: string
    price: number
    icon: string
    owned: number
}

const CATEGORY_LABELS: Record<string, string> = {
    boost: '⚡ Boosts',
    cosmetic: '🎨 Cosmetics',
    pack: '📦 Packs',
    upgrade: '⬆️ Upgrades',
}

export function StoreView() {
    const [items, setItems] = useState<StoreItem[]>([])
    const [userCredits, setUserCredits] = useState(0)
    const [loading, setLoading] = useState(true)
    const [purchasing, setPurchasing] = useState<string | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    const fetchStore = async () => {
        try {
            const res = await fetch('/api/store')
            if (res.ok) {
                const data = await res.json()
                setItems(data.items || [])
                setUserCredits(data.userCredits || 0)
            }
        } catch (error) {
            console.error('Failed to fetch store:', error)
        } finally {
            setLoading(false)
        }
    }

    const purchaseItem = async (itemId: string) => {
        setPurchasing(itemId)
        try {
            const res = await fetch('/api/store', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId })
            })

            const data = await res.json()

            if (res.ok) {
                setUserCredits(data.newBalance)
                setItems(prev => prev.map(item =>
                    item.id === itemId ? { ...item, owned: item.owned + 1 } : item
                ))
                // Dispatch event to update credits display elsewhere
                window.dispatchEvent(new CustomEvent('credits-updated'))
            } else {
                alert(data.error || 'Purchase failed')
            }
        } catch (error) {
            console.error('Purchase failed:', error)
            alert('Purchase failed. Please try again.')
        } finally {
            setPurchasing(null)
        }
    }

    useEffect(() => {
        fetchStore()
    }, [])

    const categories = Array.from(new Set(items.map(i => i.category)))
    const filteredItems = selectedCategory
        ? items.filter(i => i.category === selectedCategory)
        : items

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 bg-gray-700 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with Credits */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">🏪 Store</h1>
                    <p className="text-gray-400 mt-1">Spend your hard-earned credits on upgrades and goodies</p>
                </div>
                <CreditsDisplay className="self-start" />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!selectedCategory
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    All Items
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selectedCategory === cat
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        {CATEGORY_LABELS[cat] || cat}
                    </button>
                ))}
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    No items available in this category.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map(item => {
                        const canAfford = userCredits >= item.price
                        const isPurchasing = purchasing === item.id

                        return (
                            <div
                                key={item.id}
                                className={`bg-gray-800 rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg ${canAfford ? 'border-gray-600 hover:border-blue-500' : 'border-gray-700 opacity-75'
                                    }`}
                            >
                                {/* Item Icon */}
                                <div className="bg-gradient-to-b from-gray-700 to-gray-800 p-6 text-center">
                                    <span className="text-5xl">{item.icon}</span>
                                </div>

                                {/* Item Details */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-bold text-white">{item.name}</h3>
                                        {item.owned > 0 && (
                                            <span className="text-xs bg-green-900 text-green-200 px-2 py-0.5 rounded">
                                                Owned: {item.owned}
                                            </span>
                                        )}
                                    </div>

                                    {item.description && (
                                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                                            {item.description}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-1">
                                            <span className="text-yellow-400">💰</span>
                                            <span className={`font-bold ${canAfford ? 'text-yellow-200' : 'text-red-400'}`}>
                                                {item.price.toLocaleString()}
                                            </span>
                                        </div>

                                        <Button
                                            onClick={() => purchaseItem(item.id)}
                                            disabled={!canAfford || isPurchasing}
                                            size="sm"
                                            className={canAfford ? '' : 'opacity-50 cursor-not-allowed'}
                                        >
                                            {isPurchasing ? '...' : canAfford ? 'Buy' : 'Need Credits'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
