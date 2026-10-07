import React, { useState } from 'react'
import { AdventureCard } from '../engine/types'

interface CardModalProps {
  card: AdventureCard
  onEngageCombat: () => void
  onClaimTreasure: () => void
  onFlee: () => void
}

export const CardModal: React.FC<CardModalProps> = ({
  card,
  onEngageCombat,
  onClaimTreasure,
  onFlee,
}) => {
  const [isFlipped, setIsFlipped] = useState(false)

  const isMonster = card.type === 'monster'
  const isTreasure = card.type === 'treasure'

  return (
    <div className="mobile-modal fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex flex-col items-center max-w-sm w-full">
        {/* Animated Card Container */}
        <div
          onClick={() => setIsFlipped(true)}
          className={`mobile-flip-card relative w-72 h-96 cursor-pointer rounded-2xl transition-all duration-700 [transform-style:preserve-3d] shadow-2xl ${
            isFlipped ? '[transform:rotateY(180deg)]' : 'hover:scale-105 animate-pulse'
          }`}
        >
          {/* Card Back (Rub karty) */}
          <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-amber-950 via-stone-900 to-amber-950 border-4 border-amber-600/80 p-6 flex flex-col items-center justify-between shadow-2xl [backface-visibility:hidden]">
            <div className="w-12 h-12 rounded-full border-2 border-amber-500/50 flex items-center justify-center text-amber-400 font-serif text-xl">
              ⚔️
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-amber-400 font-serif tracking-widest uppercase">
                Proroctví
              </div>
              <div className="text-xs text-amber-200/60 uppercase tracking-widest mt-1">
                Karta Dobrodružství ({card.terrain})
              </div>
            </div>
            <div className="text-xs text-amber-400/80 font-semibold animate-bounce">
              👉 Klikni pro odhalení karty
            </div>
          </div>

          {/* Card Front (Líc karty) */}
          <div className="mobile-flip-front absolute inset-0 w-full h-full rounded-2xl bg-stone-900 border-4 border-amber-500 p-5 flex flex-col justify-between shadow-2xl [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  {card.terrain.toUpperCase()} • {card.type.toUpperCase()}
                </span>
                <span className="text-lg">
                  {isMonster ? '👹' : isTreasure ? '💎' : '📜'}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-stone-100 mt-2 font-serif">
                {card.name}
              </h3>

              {/* Card Description */}
              <p className="text-xs text-stone-300 mt-2 italic bg-stone-950/60 p-2 rounded-lg border border-stone-800">
                "{card.description}"
              </p>

              {/* Monster Stats or Rewards */}
              {card.monster && (
                <div className="mt-4 p-3 bg-stone-950/80 rounded-xl border border-red-950">
                  <div className="text-xs font-semibold text-stone-400 mb-1">
                    Atributy nepřítele:
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold">
                      <span>❤️ Síla:</span>
                      <span className="text-stone-100">{card.monster.strength}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <span>🔮 Vůle:</span>
                      <span className="text-stone-100">{card.monster.will}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-stone-400">
                    Typ boje:{' '}
                    <span className="text-amber-400 font-bold uppercase">
                      {card.monster.combatType === 'physical'
                        ? 'Fyzický'
                        : card.monster.combatType === 'mental'
                        ? 'Mentální'
                        : 'Fyzický i Mentální'}
                    </span>
                  </div>
                  {card.monster.specialAbility && (
                    <div className="mt-1 text-[11px] text-amber-300 font-medium">
                      ⚠️ {card.monster.specialAbility}
                    </div>
                  )}

                  {/* Monster Bounty Rewards */}
                  <div className="mt-2.5 pt-2 border-t border-stone-800 flex items-center justify-between text-xs font-bold">
                    <span className="text-stone-400">Kořist za zabití:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400">🪙 +{card.monster.rewardGold} Zl.</span>
                      <span className="text-emerald-400">⭐ +{card.monster.rewardExp} Exp</span>
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] text-emerald-400/90 font-mono text-center">
                    ⚡ Stačí 1 úspěšný zásah k poražení netvora!
                  </div>
                </div>
              )}

              {/* Treasure Rewards */}
              {isTreasure && (card.rewardGold || card.rewardExp) && (
                <div className="mt-4 p-3 bg-stone-950/80 rounded-xl border border-amber-900/50 flex items-center justify-around text-xs">
                  {card.rewardGold && (
                    <div className="text-amber-400 font-bold">
                      🪙 +{card.rewardGold} Zlaťáků
                    </div>
                  )}
                  {card.rewardExp && (
                    <div className="text-emerald-400 font-bold">
                      ⭐ +{card.rewardExp} Zkušeností
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Interaction Buttons */}
            <div className="pt-2 border-t border-stone-800">
              {isMonster ? (
                <div className="flex gap-2">
                  <button
                    onClick={onEngageCombat}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase shadow-md cursor-pointer"
                  >
                    ⚔️ Zaútočit!
                  </button>
                  <button
                    onClick={onFlee}
                    className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs uppercase cursor-pointer"
                  >
                    🏃 Uprchnout
                  </button>
                </div>
              ) : (
                <button
                  onClick={onClaimTreasure}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-950 font-black text-xs uppercase shadow-md cursor-pointer"
                >
                  ✨ Sebrat odměnu
                </button>
              )}
            </div>
          </div>
        </div>

        {!isFlipped && (
          <button
            onClick={() => setIsFlipped(true)}
            className="mt-4 px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-lg"
          >
            Otočit kartu
          </button>
        )}
      </div>
    </div>
  )
}
