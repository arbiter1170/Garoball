import Link from 'next/link'
import { ArrowRight, Dice6, Users, Trophy, BarChart3 } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-green-900 text-white">
        <div className="absolute inset-0 bg-[url('/field-pattern.svg')] opacity-10" />
        <div className="relative max-w-6xl mx-auto px-4 py-24 sm:py-32">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
            Garoball
          </h1>
          <p className="text-xl sm:text-2xl text-blue-100 max-w-2xl mb-8">
            Fast, explainable season sims with tactile dice + card drama and a clean 2D on-field view.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-white text-blue-900 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border-2 border-white/50 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need for season simulations
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Dice6 className="w-8 h-8" />}
              title="Dice + Cards"
              description="Classic Strat-style mechanics with 3d6 dice rolls mapped to player outcome tables."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Manage Rosters"
              description="Import real MLB players from Lahman Database (1871-2024). Set lineups and rotations."
            />
            <FeatureCard
              icon={<Trophy className="w-8 h-8" />}
              title="Season Sim"
              description="Generate schedules, simulate games one PA at a time or entire seasons instantly."
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8" />}
              title="Explainable"
              description="Every play shows dice rolls, probability tables, and why the outcome occurred."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Start simulating in under 3 minutes
          </h2>
          <div className="space-y-8">
            <Step
              number={1}
              title="Create your league"
              description="Sign up, create a league, and add teams. Each team gets a full 25-man roster."
            />
            <Step
              number={2}
              title="Import players"
              description="Use the Lahman 2024 pack to populate rosters with real MLB players and their stats."
            />
            <Step
              number={3}
              title="Set your lineup"
              description="Choose your 9 batters, starting pitcher, and bullpen order."
            />
            <Step
              number={4}
              title="Play ball!"
              description="Watch games unfold PA by PA or sim entire seasons. Review standings, stats, and replays."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto text-center">
          <p className="mb-4">
            Garoball — MVP v0.1
          </p>
          <p className="text-sm">
            Powered by{' '}
            <a href="https://sabr.org/lahman-database/" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
              Lahman Database
            </a>
          </p>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="card text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
        {number}
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}
