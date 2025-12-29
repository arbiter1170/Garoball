'use client'

interface DiceDisplayProps {
  values: [number, number, number]
}

const diceFaces: Record<number, JSX.Element> = {
  1: (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" rx="15" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="3"/>
      <circle cx="50" cy="50" r="10" fill="black"/>
    </svg>
  ),
  2: (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" rx="15" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="3"/>
      <circle cx="30" cy="30" r="10" fill="black"/>
      <circle cx="70" cy="70" r="10" fill="black"/>
    </svg>
  ),
  3: (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" rx="15" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="3"/>
      <circle cx="25" cy="25" r="10" fill="black"/>
      <circle cx="50" cy="50" r="10" fill="black"/>
      <circle cx="75" cy="75" r="10" fill="black"/>
    </svg>
  ),
  4: (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" rx="15" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="3"/>
      <circle cx="30" cy="30" r="10" fill="black"/>
      <circle cx="70" cy="30" r="10" fill="black"/>
      <circle cx="30" cy="70" r="10" fill="black"/>
      <circle cx="70" cy="70" r="10" fill="black"/>
    </svg>
  ),
  5: (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" rx="15" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="3"/>
      <circle cx="25" cy="25" r="10" fill="black"/>
      <circle cx="75" cy="25" r="10" fill="black"/>
      <circle cx="50" cy="50" r="10" fill="black"/>
      <circle cx="25" cy="75" r="10" fill="black"/>
      <circle cx="75" cy="75" r="10" fill="black"/>
    </svg>
  ),
  6: (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <rect width="100" height="100" rx="15" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="3"/>
      <circle cx="30" cy="25" r="10" fill="black"/>
      <circle cx="70" cy="25" r="10" fill="black"/>
      <circle cx="30" cy="50" r="10" fill="black"/>
      <circle cx="70" cy="50" r="10" fill="black"/>
      <circle cx="30" cy="75" r="10" fill="black"/>
      <circle cx="70" cy="75" r="10" fill="black"/>
    </svg>
  ),
}

export function DiceDisplay({ values }: DiceDisplayProps) {
  const sum = values.reduce((a, b) => a + b, 0)
  
  return (
    <div className="flex flex-col items-center">
      <div className="text-gray-400 text-sm mb-2">Dice Tray</div>
      <div className="bg-gray-800 border-4 border-gray-700 rounded-xl p-6 shadow-inner flex items-center justify-center space-x-4 w-48 h-48">
        {values.map((value, idx) => (
          <div key={idx} className="w-10 h-10 transform hover:scale-110 transition-transform duration-200">
            {diceFaces[value] || diceFaces[1]}
          </div>
        ))}
      </div>
      <div className="mt-2 text-xl font-bold text-gray-300">
        Total: {sum}
      </div>
    </div>
  )
}
