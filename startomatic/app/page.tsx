import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f2918] via-[#1a472a] to-[#0f2918] relative overflow-hidden">
      {/* Animated stadium lights effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-green-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Grass texture overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 15px,
            rgba(255,255,255,0.03) 15px,
            rgba(255,255,255,0.03) 30px
          )`
        }} />
      </div>

      {/* Diamond background decoration - larger and more prominent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] opacity-10 pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="#c4a77d" strokeWidth="0.5" />
          <polygon points="50,15 85,50 50,85 15,50" fill="#c4a77d" />
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8 sm:py-12">

        {/* Hero Card */}
        <div className="bg-gradient-to-b from-[#faf8f2] to-[#f0ebe0] rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.4)] border-4 border-[#1e3a8a] overflow-hidden mb-6 sm:mb-10 max-w-lg w-full transform hover:scale-[1.01] transition-transform duration-300">
          {/* Header stripe with gradient */}
          <div className="bg-gradient-to-r from-[#1e3a8a] via-[#2563eb] to-[#1e3a8a] py-5 sm:py-6 px-6 relative">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white text-center tracking-tight drop-shadow-lg relative">
              ⚾ GAROBALL
            </h1>
          </div>

          {/* Card body */}
          <div className="p-5 sm:p-8 text-center">
            <div className="mb-4 sm:mb-5">
              <span className="inline-block bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                Tabletop Baseball Sim
              </span>
            </div>

            <p className="text-gray-700 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed max-w-sm mx-auto">
              Roll the dice. Play ball. Build your dynasty with <span className="font-bold text-[#1e3a8a]">150+ years</span> of MLB history.
            </p>

            {/* Animated Dice decoration */}
            <div className="flex justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[4, 5, 6].map((val, i) => (
                <div
                  key={i}
                  className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl border-2 border-gray-200 flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <DiceFace value={val} />
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Link
                href="/signup"
                className="block w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                🎮 START PLAYING — It&apos;s Free
              </Link>
              <Link
                href="/login"
                className="block w-full bg-[#1e3a8a] hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all hover:shadow-lg"
              >
                Sign In to Existing Account
              </Link>
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 max-w-2xl px-4">
          <FeaturePill emoji="🎲" text="3D6 Dice System" />
          <FeaturePill emoji="🃏" text="Player Cards" />
          <FeaturePill emoji="📊" text="Real MLB Stats" />
          <FeaturePill emoji="🏆" text="Season Simulations" />
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl w-full px-4">
          <StepCard number={1} title="Draft Your Team" desc="Build rosters from 150+ years of MLB history." />
          <StepCard number={2} title="Set Your Lineup" desc="Pick your 9 batters and starting rotation." />
          <StepCard number={3} title="Play Ball!" desc="Watch games unfold pitch-by-pitch or simulate entire seasons." />
        </div>

        {/* New account prompt */}
        <div className="mt-8 sm:mt-10 text-center">
          <p className="text-green-100/80 text-sm sm:text-base">
            New here?{' '}
            <Link href="/signup" className="text-green-300 hover:text-white font-semibold underline underline-offset-2 transition-colors">
              Create a free account
            </Link>
            {' '}and start your dynasty today.
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-10 sm:mt-14 text-center text-green-200/50 text-xs sm:text-sm">
          <p>Garoball MVP v0.1 • Powered by Lahman Database</p>
        </footer>
      </div>
    </main>
  )
}

function FeaturePill({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 sm:px-4 py-2 flex items-center gap-2 shadow-md border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <span className="text-base sm:text-lg">{emoji}</span>
      <span className="text-gray-800 font-medium text-xs sm:text-sm">{text}</span>
    </div>
  )
}

function StepCard({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="bg-gradient-to-b from-[#faf8f2] to-[#f0ebe0] rounded-xl border-2 border-[#d4c4a8] p-4 sm:p-5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
      <div className="flex items-center gap-3 mb-2 sm:mb-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white flex items-center justify-center font-bold text-sm shadow-md">
          {number}
        </div>
        <h3 className="font-bold text-gray-900 text-sm sm:text-base">{title}</h3>
      </div>
      <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function DiceFace({ value }: { value: number }) {
  const dots: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  }

  return (
    <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-10 sm:h-10">
      {dots[value]?.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="11" fill="#1f2937" />
      ))}
    </svg>
  )
}
