import Link from 'next/link'
import { glossaryData } from '@/data/glossary'

export default function GlossaryPage() {
  // Group entries by category
  const categories = glossaryData.reduce((acc, entry) => {
    const cat = entry.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(entry)
    return acc
  }, {} as Record<string, typeof glossaryData>)

  const categoryOrder = [
    'Batting Statistics',
    'Pitching Statistics',
    'Game Mechanics',
    'Simulation',
    'General'
  ]

  const sortedCategories = Object.entries(categories).sort((a, b) => {
    const aIdx = categoryOrder.indexOf(a[0])
    const bIdx = categoryOrder.indexOf(b[0])
    if (aIdx === -1 && bIdx === -1) return a[0].localeCompare(b[0])
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold">
            ⚾ Garoball
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-300 hover:text-white">
              Dashboard
            </Link>
            <Link href="/leagues" className="text-gray-300 hover:text-white">
              Leagues
            </Link>
            <Link href="/glossary" className="text-white font-medium">
              Glossary
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-2">Baseball Glossary</h1>
        <p className="text-gray-400 mb-8">
          Understanding the statistics and terminology used in Garoball.
        </p>

        {/* Quick Navigation */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-8">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Jump to Category</h2>
          <div className="flex flex-wrap gap-2">
            {sortedCategories.map(([category]) => (
              <a
                key={category}
                href={`#${category.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
              >
                {category}
              </a>
            ))}
          </div>
        </div>

        {/* Glossary Entries */}
        <div className="space-y-12">
          {sortedCategories.map(([category, entries]) => (
            <section 
              key={category} 
              id={category.toLowerCase().replace(/\s+/g, '-')}
            >
              <h2 className="text-2xl font-bold mb-6 pb-2 border-b border-gray-700">
                {category}
              </h2>
              
              <div className="space-y-6">
                {entries
                  .sort((a, b) => a.term.localeCompare(b.term))
                  .map((entry) => (
                    <div 
                      key={entry.term}
                      className="bg-gray-800 rounded-lg p-5 border border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold">{entry.term}</h3>
                        {entry.abbreviation && (
                          <span className="bg-blue-900 text-blue-200 px-2 py-1 rounded text-sm font-mono">
                            {entry.abbreviation}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-300 mb-3">{entry.short_description}</p>
                      
                      {entry.long_description && (
                        <p className="text-gray-400 text-sm mb-3">{entry.long_description}</p>
                      )}
                      
                      {entry.formula && (
                        <div className="bg-gray-700 rounded p-3 mb-3">
                          <div className="text-xs text-gray-400 mb-1">Formula</div>
                          <code className="text-green-400 font-mono text-sm">{entry.formula}</code>
                        </div>
                      )}
                      
                      {entry.example && (
                        <div className="text-sm text-gray-400">
                          <span className="font-medium">Example:</span> {entry.example}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
