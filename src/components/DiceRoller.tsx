import React, { useState } from 'react'

interface DiceRollerProps {
  onRollComplete: (dice: [number, number]) => void
  disabled?: boolean
  label?: string
}

export const DiceRoller: React.FC<DiceRollerProps> = ({
  onRollComplete,
  disabled = false,
  label = 'Hodit kostkami na pohyb',
}) => {
  const [isRolling, setIsRolling] = useState(false)
  const [currentDice, setCurrentDice] = useState<[number, number]>([1, 1])

  const triggerRoll = () => {
    if (disabled || isRolling) return

    setIsRolling(true)
    let rollCount = 0
    const interval = setInterval(() => {
      const d1 = Math.floor(Math.random() * 6) + 1
      const d2 = Math.floor(Math.random() * 6) + 1
      setCurrentDice([d1, d2])
      rollCount++

      if (rollCount >= 10) {
        clearInterval(interval)
        setIsRolling(false)
        onRollComplete([d1, d2])
      }
    }, 60)
  }

  const renderDieFace = (val: number) => {
    // 3x3 grid dots for standard d6
    const dotsMap: Record<number, number[]> = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    }
    const activeDots = dotsMap[val] || [4]

    return (
      <div
        className={`w-14 h-14 bg-gradient-to-br from-amber-50 to-amber-200 border-2 border-amber-500 rounded-xl shadow-lg p-2 grid grid-cols-3 grid-rows-3 gap-1 transition-transform ${
          isRolling ? 'animate-bounce rotate-12 scale-105' : 'hover:scale-105'
        }`}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            {activeDots.includes(i) && (
              <div className="w-2.5 h-2.5 bg-stone-900 rounded-full shadow-inner" />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-stone-900/90 border border-stone-800 rounded-2xl shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-4">
        {renderDieFace(currentDice[0])}
        {renderDieFace(currentDice[1])}
        <div className="text-left ml-2">
          <div className="text-xs text-stone-400 uppercase tracking-widest font-semibold">
            Součet
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {currentDice[0] + currentDice[1]}
          </div>
        </div>
      </div>

      <button
        onClick={triggerRoll}
        disabled={disabled || isRolling}
        className={`px-5 py-2.5 rounded-xl font-bold text-sm tracking-wider uppercase transition-all shadow-md flex items-center gap-2 ${
          disabled || isRolling
            ? 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
            : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black cursor-pointer shadow-amber-900/40 hover:shadow-lg'
        }`}
      >
        <span>🎲</span>
        <span>{isRolling ? 'Házím...' : label}</span>
      </button>
    </div>
  )
}
