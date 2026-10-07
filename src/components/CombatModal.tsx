import React, { useState } from 'react'
import {
  calculatePlayerAttack,
  calculatePlayerDefense,
} from '../engine/gameEngine'
import { CombatState, Player, Spell } from '../engine/types'

interface CombatModalProps {
  player: Player
  combat: CombatState
  onCombatEnd: (playerWon: boolean) => void
  onUpdatePlayerStats: (newStrength: number, newWill: number) => void
}

export const CombatModal: React.FC<CombatModalProps> = ({
  player,
  combat,
  onCombatEnd,
  onUpdatePlayerStats,
}) => {
  const [currentCombat, setCurrentCombat] = useState<CombatState>(combat)
  const [monsterStrength, setMonsterStrength] = useState(
    combat.combatType === 'mental' ? combat.enemy.will : combat.enemy.strength
  )
  const [playerStrength, setPlayerStrength] = useState(player.currentStrength)
  const [playerWill, setPlayerWill] = useState(player.currentWill)
  const [isRolling, setIsRolling] = useState(false)
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null)

  const executeRound = () => {
    if (isRolling || currentCombat.isFinished) return

    setIsRolling(true)

    // Simulate dice roll
    setTimeout(() => {
      const pRoll = Math.floor(Math.random() * 6) + 1
      const eRoll = Math.floor(Math.random() * 6) + 1

      const combatType = currentCombat.combatType === 'both' ? 'physical' : currentCombat.combatType
      const pAttack = calculatePlayerAttack(player, combatType, pRoll)
      let spellBonus = 0

      if (selectedSpell && playerWill >= selectedSpell.willCost) {
        spellBonus = selectedSpell.combatBonus || 0
        setPlayerWill((w) => Math.max(0, w - selectedSpell.willCost))
        setSelectedSpell(null)
      }

      const playerTotal = pAttack.total + spellBonus
      const enemyBase = combatType === 'physical' ? currentCombat.enemy.strength : currentCombat.enemy.will
      const enemyTotal = enemyBase + eRoll

      const newLog = [...currentCombat.log]
      let newMonStr = monsterStrength
      let newPlStr = playerStrength

      newLog.push(
        `Kolo ${currentCombat.round}: Hráč hodil ${pRoll} (celkem ${playerTotal}) vs ${currentCombat.enemy.name} hodil ${eRoll} (celkem ${enemyTotal})`
      )

      if (playerTotal > enemyTotal) {
        const damage = Math.max(1, playerTotal - enemyTotal)
        newMonStr = Math.max(0, newMonStr - damage)
        newLog.push(`💥 Zásah! Udělil jsi nepříteli ${damage} zranění. (Zbývá: ${newMonStr})`)
      } else if (enemyTotal > playerTotal) {
        const defense = calculatePlayerDefense(player)
        const rawDamage = enemyTotal - playerTotal
        const damage = Math.max(1, rawDamage - defense)
        newPlStr = Math.max(0, newPlStr - damage)
        newLog.push(
          `🩸 Nepřítel zasáhl! Utrpěl jsi ${damage} zranění (zbroj absorbovala ${defense}). (Zbývá: ${newPlStr})`
        )
      } else {
        newLog.push('🛡️ Vyrovnaný střet! Zbraně se zkřížily, nikdo nebyl zraněn.')
      }

      setMonsterStrength(newMonStr)
      setPlayerStrength(newPlStr)
      onUpdatePlayerStats(newPlStr, playerWill)

      let finished = false
      let won: boolean | null = null

      if (newMonStr <= 0) {
        finished = true
        won = true
        newLog.push(`🏆 Vítězství! Porazil jsi ${currentCombat.enemy.name}!`)
      } else if (newPlStr <= 0) {
        finished = true
        won = false
        newLog.push(`💀 Porážka! Tvůj hrdina padl v boji...`)
      }

      setCurrentCombat({
        ...currentCombat,
        round: currentCombat.round + 1,
        playerRoll: pRoll,
        enemyRoll: eRoll,
        playerTotalAttack: playerTotal,
        enemyTotalAttack: enemyTotal,
        log: newLog,
        isFinished: finished,
        playerWon: won,
      })

      setIsRolling(false)
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-stone-900 border-2 border-red-900/80 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        {/* Arena Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <div>
              <h2 className="text-xl font-black text-red-500 uppercase tracking-wider font-serif">
                Bojová Aréna
              </h2>
              <p className="text-xs text-stone-400">
                {currentCombat.combatType === 'physical'
                  ? 'Fyzický souboj zbraněmi a silou'
                  : 'Mentální střet vůlí a kouzly'}
              </p>
            </div>
          </div>
          <div className="px-3 py-1 bg-stone-800 rounded-full text-xs font-bold text-amber-400">
            Kolo {currentCombat.round}
          </div>
        </div>

        {/* Combatants Showcase */}
        <div className="grid grid-cols-2 gap-4">
          {/* Player Card */}
          <div className="p-4 bg-stone-950/80 rounded-xl border border-stone-800 flex flex-col items-center">
            <div className="text-3xl mb-1">{player.heroClass.avatar}</div>
            <div className="font-bold text-sm text-stone-100">{player.name}</div>
            <div className="text-xs text-amber-400 font-semibold">{player.heroClass.name}</div>

            <div className="w-full mt-3 flex justify-between text-xs px-2">
              <span className="text-red-400 font-bold">❤️ Životy (Síla):</span>
              <span className="text-stone-100 font-black">
                {playerStrength} / {player.maxStrength}
              </span>
            </div>
            <div className="w-full flex justify-between text-xs px-2 mt-1">
              <span className="text-blue-400 font-bold">🔮 Mana (Vůle):</span>
              <span className="text-stone-100 font-black">{playerWill} / {player.maxWill}</span>
            </div>

            {currentCombat.playerRoll !== null && (
              <div className="mt-3 p-2 bg-stone-900 rounded-lg text-center w-full border border-stone-800">
                <div className="text-[10px] text-stone-400 uppercase">Hod kostkou</div>
                <div className="text-xl font-black text-amber-400">
                  🎲 {currentCombat.playerRoll} (Útok: {currentCombat.playerTotalAttack})
                </div>
              </div>
            )}
          </div>

          {/* Enemy Card */}
          <div className="p-4 bg-stone-950/80 rounded-xl border border-red-950 flex flex-col items-center">
            <div className="text-3xl mb-1">
              {currentCombat.isSphereGuardian ? '👑' : '👹'}
            </div>
            <div className="font-bold text-sm text-red-400">{currentCombat.enemy.name}</div>
            <div className="text-xs text-stone-400 font-semibold">
              {currentCombat.isSphereGuardian ? 'Strážce Sféry' : 'Monstrum'}
            </div>

            <div className="w-full mt-3 flex justify-between text-xs px-2">
              <span className="text-red-400 font-bold">❤️ Životy:</span>
              <span className="text-stone-100 font-black">{monsterStrength}</span>
            </div>
            <div className="w-full flex justify-between text-xs px-2 mt-1">
              <span className="text-stone-400">Základní síla:</span>
              <span className="text-stone-200 font-bold">{currentCombat.enemy.strength}</span>
            </div>

            {currentCombat.enemyRoll !== null && (
              <div className="mt-3 p-2 bg-stone-900 rounded-lg text-center w-full border border-stone-800">
                <div className="text-[10px] text-stone-400 uppercase">Hod nepřítele</div>
                <div className="text-xl font-black text-red-400">
                  🎲 {currentCombat.enemyRoll} (Útok: {currentCombat.enemyTotalAttack})
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Combat Log */}
        <div className="h-32 overflow-y-auto bg-stone-950/90 rounded-xl p-3 border border-stone-800 text-xs font-mono flex flex-col gap-1">
          {currentCombat.log.map((entry, idx) => (
            <div key={idx} className="text-stone-300">
              {entry}
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-stone-800 flex justify-between items-center">
          {!currentCombat.isFinished ? (
            <div className="w-full flex items-center justify-between gap-4">
              {/* Optional Spells / Potions */}
              {player.spells.length > 0 && (
                <div className="flex gap-1">
                  {player.spells.map((spell) => (
                    <button
                      key={spell.id}
                      onClick={() =>
                        setSelectedSpell(selectedSpell?.id === spell.id ? null : spell)
                      }
                      className={`px-2 py-1 rounded text-[11px] font-bold border ${
                        selectedSpell?.id === spell.id
                          ? 'bg-blue-600 border-blue-400 text-white'
                          : 'bg-stone-800 border-stone-700 text-blue-300'
                      }`}
                    >
                      ✨ {spell.name} ({spell.willCost} 🔮)
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={executeRound}
                disabled={isRolling}
                className="ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>🎲</span>
                <span>{isRolling ? 'Vyhodnocuji hod...' : 'Hodit kostkou na útok!'}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onCombatEnd(currentCombat.playerWon || false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black text-sm uppercase tracking-wider shadow-lg cursor-pointer"
            >
              {currentCombat.playerWon ? '🎉 Dokončit vítězný boj' : '💀 Zpět do města (obrození)'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
