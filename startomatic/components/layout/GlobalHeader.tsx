'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CreditsDisplay } from '@/components/around-the-horn/CreditsDisplay'

interface GlobalHeaderProps {
    user: {
        email?: string
    }
    profile?: {
        display_name?: string | null
        username?: string
    } | null
    unreadNewsCount?: number
}

export function GlobalHeader({ user, profile, unreadNewsCount = 0 }: GlobalHeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const displayName = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'Manager'

    return (
        <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
            {/* Top Bar - Logo, User Actions */}
            <div className="bg-gray-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex justify-between items-center">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-white hover:text-green-400 transition">
                        <span>⚾</span>
                        <span className="hidden sm:inline">GAROBALL</span>
                    </Link>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* News/Notifications */}
                        <Link
                            href="/around-the-horn"
                            className="relative p-2 text-gray-300 hover:text-white transition"
                            title="News & Events"
                        >
                            <span className="text-xl">🔔</span>
                            {unreadNewsCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                    {unreadNewsCount > 9 ? '9+' : unreadNewsCount}
                                </span>
                            )}
                        </Link>

                        {/* Credits */}
                        <CreditsDisplay />

                        {/* Profile Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:block text-gray-300 text-sm">{displayName}</span>
                            <form action="/auth/signout" method="post">
                                <button
                                    type="submit"
                                    className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-gray-700 transition"
                                >
                                    Sign Out
                                </button>
                            </form>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="sm:hidden p-2 text-gray-300 hover:text-white"
                        >
                            <span className="text-xl">{mobileMenuOpen ? '✕' : '☰'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Bar */}
            <nav className="hidden sm:block">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-1">
                        <NavLink href="/dashboard" icon="🏠">Dashboard</NavLink>
                        <NavLink href="/leagues" icon="🏆">My Leagues</NavLink>
                        <NavLink href="/store" icon="🏪">Store</NavLink>
                        <NavLink href="/glossary" icon="📖">Glossary</NavLink>
                    </div>
                </div>
            </nav>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <nav className="sm:hidden border-t border-gray-700 bg-gray-800">
                    <div className="py-2 space-y-1">
                        <MobileNavLink href="/dashboard" icon="🏠" onClick={() => setMobileMenuOpen(false)}>
                            Dashboard
                        </MobileNavLink>
                        <MobileNavLink href="/leagues" icon="🏆" onClick={() => setMobileMenuOpen(false)}>
                            My Leagues
                        </MobileNavLink>
                        <MobileNavLink href="/store" icon="🏪" onClick={() => setMobileMenuOpen(false)}>
                            Store
                        </MobileNavLink>
                        <MobileNavLink href="/around-the-horn" icon="📰" onClick={() => setMobileMenuOpen(false)}>
                            News
                        </MobileNavLink>
                        <MobileNavLink href="/glossary" icon="📖" onClick={() => setMobileMenuOpen(false)}>
                            Glossary
                        </MobileNavLink>
                    </div>
                </nav>
            )}
        </header>
    )
}

function NavLink({ href, icon, children }: { href: string; icon: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-1.5 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700/50 transition text-sm font-medium"
        >
            <span>{icon}</span>
            <span>{children}</span>
        </Link>
    )
}

function MobileNavLink({
    href,
    icon,
    children,
    onClick
}: {
    href: string;
    icon: string;
    children: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 transition"
        >
            <span className="text-lg">{icon}</span>
            <span>{children}</span>
        </Link>
    )
}
