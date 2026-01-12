'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface NewsEvent {
    id: string
    type: 'news' | 'event' | 'milestone' | 'achievement'
    category: string
    headline: string
    body: string | null
    metadata: Record<string, unknown>
    is_read: boolean
    created_at: string
}

const TYPE_ICONS: Record<string, string> = {
    news: '📰',
    event: '⚡',
    milestone: '🏆',
    achievement: '⭐',
}

const CATEGORY_COLORS: Record<string, string> = {
    game: 'bg-green-900/50 border-green-600',
    player: 'bg-blue-900/50 border-blue-600',
    league: 'bg-purple-900/50 border-purple-600',
    achievement: 'bg-yellow-900/50 border-yellow-600',
    system: 'bg-gray-800/50 border-gray-600',
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
}

interface NewsFeedProps {
    limit?: number
    compact?: boolean
}

export function NewsFeed({ limit = 10, compact = false }: NewsFeedProps) {
    const [news, setNews] = useState<NewsEvent[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)

    const fetchNews = async () => {
        try {
            const res = await fetch(`/api/news?limit=${limit}`)
            if (res.ok) {
                const data = await res.json()
                setNews(data.news || [])
                setUnreadCount(data.unreadCount || 0)
            }
        } catch (error) {
            console.error('Failed to fetch news:', error)
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (newsIds: string[]) => {
        try {
            await fetch('/api/news', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newsIds })
            })
            setNews(prev => prev.map(n =>
                newsIds.includes(n.id) ? { ...n, is_read: true } : n
            ))
            setUnreadCount(prev => Math.max(0, prev - newsIds.length))
        } catch (error) {
            console.error('Failed to mark as read:', error)
        }
    }

    const markAllRead = async () => {
        try {
            await fetch('/api/news', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllRead: true })
            })
            setNews(prev => prev.map(n => ({ ...n, is_read: true })))
            setUnreadCount(0)
        } catch (error) {
            console.error('Failed to mark all as read:', error)
        }
    }

    useEffect(() => {
        fetchNews()
    }, [limit])

    if (loading) {
        return (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-700 rounded w-1/4"></div>
                    <div className="h-20 bg-gray-700 rounded"></div>
                    <div className="h-20 bg-gray-700 rounded"></div>
                </div>
            </div>
        )
    }

    if (news.length === 0) {
        return (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
                <div className="text-4xl mb-3">📭</div>
                <h3 className="text-lg font-semibold text-gray-300 mb-1">No News Yet</h3>
                <p className="text-gray-500 text-sm">
                    Play some games to see news and events here!
                </p>
            </div>
        )
    }

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/80">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">📰 Around the Horn</h2>
                    {unreadCount > 0 && (
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllRead}
                        className="text-xs text-blue-400 hover:text-blue-300"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {/* News Items */}
            <div className={`divide-y divide-gray-700 ${compact ? 'max-h-80 overflow-y-auto' : ''}`}>
                {news.map((item) => (
                    <div
                        key={item.id}
                        className={`p-4 transition-colors ${!item.is_read ? 'bg-gray-750' : ''
                            } hover:bg-gray-700/50`}
                        onClick={() => !item.is_read && markAsRead([item.id])}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl border ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.system
                                }`}>
                                {TYPE_ICONS[item.type] || '📌'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {!item.is_read && (
                                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                                    )}
                                    <h3 className="font-semibold text-white truncate">{item.headline}</h3>
                                </div>
                                {item.body && !compact && (
                                    <p className="text-gray-400 text-sm line-clamp-2">{item.body}</p>
                                )}
                                <p className="text-gray-500 text-xs mt-1">
                                    {formatTimeAgo(item.created_at)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* View All Link */}
            {compact && news.length >= limit && (
                <Link
                    href="/around-the-horn"
                    className="block text-center py-3 text-blue-400 hover:text-blue-300 text-sm border-t border-gray-700"
                >
                    View All News →
                </Link>
            )}
        </div>
    )
}
