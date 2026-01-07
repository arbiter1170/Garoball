import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1a472a] relative overflow-hidden">
      {/* Grass pattern overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 20px,
            rgba(0,0,0,0.1) 20px,
            rgba(0,0,0,0.1) 40px
          )`
        }} />
      </div>

      {/* Dirt diamond background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="50,10 90,50 50,90 10,50" fill="#c4a77d" />
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        
        {/* Logo / Title Card */}
        <div className="bg-[#f3f0e6] rounded-2xl shadow-2xl border-4 border-[#1e3a8a] overflow-hidden mb-8 max-w-lg w-full">
          {/* Header stripe */}
          <div className="bg-[#1e3a8a] py-4 px-6">
            <h1 className="text-4xl sm:text-5xl font-black text-white text-center tracking-tight">
              ⚾ GAROBALL
            </h1>
          </div>
          
          {/* Card body */}
          <div className="p-6 text-center">
            <div className="mb-4">
              <span className="inline-block bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                2D Baseball Arcade
              </span>
            </div>
            <p className="text-gray-700 text-lg mb-6">
              Roll the dice. Play ball. Simulate entire seasons with classic tabletop mechanics.
            </p>
            
            {/* Dice decoration */}
            <div className="flex justify-center gap-3 mb-6">
              {[4, 5, 6].map((val, i) => (
                <div key={i} className="w-12 h-12 bg-gray-100 rounded-lg border-2 border-gray-300 flex items-center justify-center shadow-md">
                  <DiceFace value={val} />
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Link
                href="/signup"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all transform hover:scale-105 shadow-lg"
              >
                🎮 START PLAYING
              </Link>
              <Link
                href="/dashboard"
                className="block w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                🧪 TRY THE DEMO
              </Link>
              <Link
                href="/login"
                className="block w-full bg-[#1e3a8a] hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-xl">
          <FeaturePill emoji="🎲" text="3d6 Dice System" />
          <FeaturePill emoji="🃏" text="Player Cards" />
          <FeaturePill emoji="📊" text="Real MLB Stats" />
          <FeaturePill emoji="🏆" text="Season Sims" />
        </div>

        {/* How it works - Baseball card style */}
        <div className="grid md:grid-cols-3 gap-4 max-w-4xl w-full px-4">
          <StepCard number={1} title="Draft Your Team" desc="Build rosters from 150+ years of MLB history" />
          <StepCard number={2} title="Set Your Lineup" desc="Pick your 9 batters and starting rotation" />
          <StepCard number={3} title="Play Ball!" desc="Watch games unfold pitch by pitch or sim seasons" />
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-green-200/60 text-sm">
          <p>Garoball MVP v0.1 • Powered by Lahman Database</p>
        </footer>
      </div>
    </main>
  )
}

function FeaturePill({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="bg-white/90 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2 shadow-md border border-gray-200">
      <span className="text-lg">{emoji}</span>
      <span className="text-gray-800 font-medium text-sm">{text}</span>
    </div>
  )
}

function StepCard({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="bg-[#f3f0e6] rounded-xl border-2 border-[#d4c4a8] p-4 shadow-lg">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-sm">
          {number}
        </div>
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 text-sm">{desc}</p>
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
    <svg viewBox="0 0 100 100" className="w-8 h-8">
      {dots[value]?.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="12" fill="#1f2937" />
      ))}
    </svg>
  )
}
