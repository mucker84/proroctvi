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
  onFleeCombat?: () => void
}

export const CombatModal: React.FC<CombatModalProps> = ({
  player,
  combat,
  onCombatEnd,
  onUpdatePlayerStats,
  onFleeCombat,
}) => {
  const [currentCombat, setCurrentCombat] = useState<CombatState>(combat)
  const isGuardian = combat.isSphereGuardian
  // Guardian needs 2 successful hits to defeat; normal monsters die in 1 hit!
  const [guardianHitsRemaining, setGuardianHitsRemaining] = useState<number>(isGuardian ? 2 : 1)
  const [playerStrength, setPlayerStrength] = useState(player.currentStrength)
  const [playerWill, setPlayerWill] = useState(player.currentWill)
  const [isRolling, setIsRolling] = useState(false)
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null)

  // Single round execution according to official Prophecy board game rules
  const executeRound = () => {
    if (isRolling || currentCombat.isFinished) return

    setIsRolling(true)

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
      let newPlStr = playerStrength
      let newPlWill = playerWill
      let newGuardianHits = guardianHitsRemaining
      let finished = false
      let won: boolean | null = null

      newLog.push(
        `Kolo ${currentCombat.round}: Hráč hodil 🎲 ${pRoll} (celkem ${playerTotal}) vs ${currentCombat.enemy.name} hodil 🎲 ${eRoll} (celkem ${enemyTotal})`
      )

      if (playerTotal > enemyTotal) {
        // PLAYER WINS THIS ROUND!
        if (!isGuardian) {
          // Normal monster is instantly defeated in 1 hit!
          finished = true
          won = true
          newLog.push(`💥 Rozhodující úder! Porazil jsi ${currentCombat.enemy.name}!`)
        } else {
          // Sphere Guardian boss
          newGuardianHits = Math.max(0, newGuardianHits - 1)
          setGuardianHitsRemaining(newGuardianHits)
          if (newGuardianHits === 0) {
            finished = true
            won = true
            newLog.push(`🏆 Strážce sféry byl definitivně poražen! Artefakt je tvůj!`)
          } else {
            newLog.push(`⚔️ Zasáhl jsi Strážce sféry! Zbývá ještě ${newGuardianHits} zásah.`)
          }
        }
      } else if (enemyTotal > playerTotal) {
        // ENEMY WINS THIS ROUND! Player takes damage
        if (combatType === 'physical') {
          const defense = calculatePlayerDefense(player)
          const rawDamage = enemyTotal - playerTotal
          const damage = Math.max(1, rawDamage - defense)
          newPlStr = Math.max(0, newPlStr - damage)
          newLog.push(
            `🩸 Nepřítel tě zasáhl! Utrpěl jsi ${damage} zranění (zbroj odrazila ${defense}). (Zbývá: ${newPlStr} Životů)`
          )
        } else {
          // Mental combat hurts Will
          const damage = Math.max(1, enemyTotal - playerTotal)
          newPlWill = Math.max(0, newPlWill - damage)
          newLog.push(
            `🔮 Nepřítel zlomil tvou mysl! Ztrácíš ${damage} Vůle. (Zbývá: ${newPlWill} Vůle)`
          )
        }

        setPlayerStrength(newPlStr)
        setPlayerWill(newPlWill)
        onUpdatePlayerStats(newPlStr, newPlWill)

        if (newPlStr <= 0 || (combatType === 'mental' && newPlWill <= 0)) {
          finished = true
          won = false
          newLog.push(`💀 Porážka! Tvůj hrdina podlehl v boji...`)
        }
      } else {
        // TIE
        newLog.push('🛡️ Vyrovnaný střet! Zbraně se zkřížily, nikdo nebyl zraněn.')
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
    }, 450)
  }

  // Instant auto-resolve button for quick mobile combat
  const handleAutoResolve = () => {
    if (isRolling || currentCombat.isFinished) return

    let roundCount = currentCombat.round
    let pStr = playerStrength
    let pWill = playerWill
    let gHits = guardianHitsRemaining
    let won: boolean | null = null
    const newLog = [...currentCombat.log, '⚡ Bleskové vyhodnocení souboje:']

    const combatType = currentCombat.combatType === 'both' ? 'physical' : currentCombat.combatType
    const enemyBase = combatType === 'physical' ? currentCombat.enemy.strength : currentCombat.enemy.will
    const defense = calculatePlayerDefense(player)

    while (roundCount < 20) {
      const pRoll = Math.floor(Math.random() * 6) + 1
      const eRoll = Math.floor(Math.random() * 6) + 1
      const pAttack = calculatePlayerAttack(player, combatType, pRoll)
      const pTot = pAttack.total
      const eTot = enemyBase + eRoll

      if (pTot > eTot) {
        if (!isGuardian) {
          won = true
          newLog.push(`Kolo ${roundCount}: Hráč ${pTot} vs Netvor ${eTot} ➔ Vítězný zásah!`)
          break
        } else {
          gHits--
          newLog.push(`Kolo ${roundCount}: Hráč ${pTot} vs Strážce ${eTot} ➔ Zásah! (zbývá ${gHits})`)
          if (gHits <= 0) {
            won = true
            break
          }
        }
      } else if (eTot > pTot) {
        if (combatType === 'physical') {
          const dmg = Math.max(1, (eTot - pTot) - defense)
          pStr = Math.max(0, pStr - dmg)
          newLog.push(`Kolo ${roundCount}: Netvor ${eTot} vs Hráč ${pTot} ➔ Hráč utrpěl ${dmg} zranění.`)
        } else {
          const dmg = Math.max(1, eTot - pTot)
          pWill = Math.max(0, pWill - dmg)
          newLog.push(`Kolo ${roundCount}: Netvor ${eTot} vs Hráč ${pTot} ➔ Hráč ztratil ${dmg} Vůle.`)
        }

        if (pStr <= 0 || (combatType === 'mental' && pWill <= 0)) {
          won = false
          newLog.push(`💀 Hrdina padl v boji.`)
          break
        }
      }
      roundCount++
    }

    setPlayerStrength(pStr)
    setPlayerWill(pWill)
    setGuardianHitsRemaining(gHits)
    onUpdatePlayerStats(pStr, pWill)

    setCurrentCombat({
      ...currentCombat,
      round: roundCount,
      log: newLog,
      isFinished: true,
      playerWon: won,
    })
  }

  // Flee from combat
  const handleFlee = () => {
    if (onFleeCombat) {
      onFleeCombat()
    } else {
      onCombatEnd(false)
    }
  }

  const combatType = currentCombat.combatType === 'both' ? 'physical' : currentCombat.combatType

  return (
    <div className="mobile-modal fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="mobile-combat-content w-full max-w-2xl bg-stone-900 border-2 border-red-900/80 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-stone-100">
        {/* Arena Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{isGuardian ? '👑' : '⚔️'}</span>
            <div>
              <h2 className="text-xl font-black text-red-500 uppercase tracking-wider font-serif m-0 leading-tight">
                {isGuardian ? 'Souboj se Strážcem Sféry' : 'Souboj s Monstrem'}
              </h2>
              <p className="text-xs text-stone-400 m-0 mt-0.5">
                {combatType === 'physical'
                  ? 'Fyzický souboj mečem a zbrojí (stačí 1 vítězný zásah k zabití!)'
                  : 'Mentální střet vůlí a kouzly (útočí se na Vůli!)'}
              </p>
            </div>
          </div>
          <div className="px-3 py-1 bg-stone-800 border border-stone-700 rounded-full text-xs font-bold text-amber-400">
            Kolo {currentCombat.round}
          </div>
        </div>

        {/* Combatants Showcase */}
        <div className="grid grid-cols-2 gap-4">
          {/* Player Card */}
          <div className="p-4 bg-stone-950/80 rounded-xl border border-stone-800 flex flex-col items-center">
            {player.heroClass.image ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-500 shadow-lg mb-2">
                <img
                  src={player.heroClass.image}
                  alt={player.heroClass.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="text-3xl mb-1">{player.heroClass.avatar}</div>
            )}
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
                <div className="text-[10px] text-stone-400 uppercase">Tvůj hod kostkou</div>
                <div className="text-lg font-black text-amber-400">
                  🎲 {currentCombat.playerRoll} (Celkem: {currentCombat.playerTotalAttack})
                </div>
              </div>
            )}
          </div>

          {/* Enemy Card */}
          <div className="p-4 bg-stone-950/80 rounded-xl border border-red-950 flex flex-col items-center">
            {currentCombat.enemy.image ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-red-600 shadow-lg mb-2">
                <img
                  src={currentCombat.enemy.image}
                  alt={currentCombat.enemy.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="text-3xl mb-1">
                {isGuardian ? '👑' : '👹'}
              </div>
            )}
            <div className="font-bold text-sm text-red-400 text-center">{currentCombat.enemy.name}</div>
            <div className="text-xs text-stone-400 font-semibold">
              {isGuardian ? 'Astrální Strážce' : 'Běžný netvor'}
            </div>

            <div className="w-full mt-3 flex justify-between text-xs px-2">
              <span className="text-stone-300 font-bold">
                {combatType === 'physical' ? '⚔️ Síla netvora:' : '🔮 Vůle netvora:'}
              </span>
              <span className="text-amber-400 font-black">
                {combatType === 'physical' ? currentCombat.enemy.strength : currentCombat.enemy.will}
              </span>
            </div>

            <div className="w-full flex justify-between text-xs px-2 mt-1">
              <span className="text-stone-400">Odolnost:</span>
              <span className="text-stone-200 font-bold">
                {isGuardian ? `${guardianHitsRemaining} zásahy` : '1 zásah = smrt'}
              </span>
            </div>

            {currentCombat.enemyRoll !== null && (
              <div className="mt-3 p-2 bg-stone-900 rounded-lg text-center w-full border border-stone-800">
                <div className="text-[10px] text-stone-400 uppercase">Hod netvora</div>
                <div className="text-lg font-black text-red-400">
                  🎲 {currentCombat.enemyRoll} (Celkem: {currentCombat.enemyTotalAttack})
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Victory Reward Preview */}
        {currentCombat.isFinished && currentCombat.playerWon && (
          <div className="p-3 bg-amber-950/70 border-2 border-amber-500 rounded-xl flex items-center justify-around animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <span className="text-xl">🪙</span>
              <span>+{currentCombat.enemy.rewardGold} Zlaťáků</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <span className="text-xl">⭐</span>
              <span>+{currentCombat.enemy.rewardExp} Zkušeností</span>
            </div>
          </div>
        )}

        {/* Combat Log */}
        <div className="h-28 overflow-y-auto bg-stone-950/90 rounded-xl p-3 border border-stone-800 text-xs font-mono flex flex-col gap-1">
          {currentCombat.log.map((entry, idx) => (
            <div key={idx} className="text-stone-300">
              {entry}
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-stone-800 flex flex-col gap-2.5">
          {!currentCombat.isFinished ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 w-full">
              {/* Optional Spells */}
              {player.spells.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {player.spells.map((spell) => (
                    <button
                      key={spell.id}
                      onClick={() =>
                        setSelectedSpell(selectedSpell?.id === spell.id ? null : spell)
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
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

              <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
                {/* Flee button (enabled after round 1 or anytime) */}
                <button
                  onClick={handleFlee}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold text-xs uppercase cursor-pointer border border-stone-700 transition-all"
                  title="Uprchnout z boje a zachránit si holý život"
                >
                  🏃 Uprchnout
                </button>

                {/* Quick Auto-resolve */}
                <button
                  onClick={handleAutoResolve}
                  className="px-4 py-2.5 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-300 font-bold text-xs uppercase cursor-pointer border border-amber-800 transition-all"
                  title="Bleskově vyhodnotit souboj podle pravidel"
                >
                  ⚡ Rychlý boj
                </button>

                {/* Roll attack */}
                <button
                  onClick={executeRound}
                  disabled={isRolling}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>🎲</span>
                  <span>{isRolling ? 'Házím...' : 'Zaútočit!'}</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onCombatEnd(currentCombat.playerWon || false)}
              className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg cursor-pointer transition-all ${
                currentCombat.playerWon
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 shadow-amber-950/50'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
              }`}
            >
              {currentCombat.playerWon ? '🎉 Sebrat kořist a pokračovat' : '💀 Hrdina padl – Obrodit se ve městě'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
