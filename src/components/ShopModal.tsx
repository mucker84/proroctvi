import React from 'react'
import { AVAILABLE_SKILLS, SHOP_ITEMS } from '../data/cards'
import { Item, Player, Skill, TerrainType } from '../engine/types'

interface ShopModalProps {
  player: Player
  tileTerrain: TerrainType
  onBuyItem: (item: Item) => void
  onLearnSkill: (skill: Skill) => void
  onTrainStat: (stat: 'strength' | 'will') => void
  onHeal: () => void
  onClose: () => void
  onFinishTurn?: () => void
}

export const ShopModal: React.FC<ShopModalProps> = ({
  player,
  tileTerrain,
  onBuyItem,
  onLearnSkill,
  onTrainStat,
  onHeal,
  onClose,
  onFinishTurn,
}) => {
  const isCity = tileTerrain === 'city'
  const isTraining = tileTerrain === 'training'
  const isTemple = tileTerrain === 'temple'
  const isCamp = tileTerrain === 'camp'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-stone-900 border-2 border-stone-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {isCity ? '🏰' : isTraining ? '⚔️' : isTemple ? '☀️' : '🏕️'}
            </span>
            <div>
              <h2 className="text-xl font-black text-amber-400 font-serif">
                {isCity
                  ? 'Městské Tržiště & Zbrojnice'
                  : isTraining
                  ? 'Bojové Cvičiště'
                  : isTemple
                  ? 'Posvátný Chrám'
                  : 'Tábor Kočovníků'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/50 rounded-lg text-xs font-black text-amber-300 shadow-sm">
                  🪙 {player.gold} Zlaťáků
                </span>
                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-xs font-black text-emerald-300 shadow-sm">
                  ⭐ {player.experience} Zkušeností
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
          >
            Zavřít ✕
          </button>
        </div>

        {/* Temple Services (Heal & Will) */}
        {isTemple && (
          <div className="bg-stone-950/70 p-4 rounded-xl border border-yellow-900/50">
            <h3 className="text-sm font-bold text-yellow-300 mb-2">Chrámové služby</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onHeal}
                disabled={player.gold < 2 || player.currentStrength >= player.maxStrength}
                className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-left hover:border-yellow-500 disabled:opacity-40 cursor-pointer"
              >
                <div className="font-bold text-xs text-stone-100">🌿 Úplné vyléčení těla</div>
                <div className="text-[11px] text-stone-400">Obnoví všechny chybějící životy (Sílu).</div>
                <div className="text-xs font-bold text-amber-400 mt-1">Cena: 2 Zlaťáky</div>
              </button>

              <button
                onClick={() => onTrainStat('will')}
                disabled={player.experience < 4}
                className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-left hover:border-blue-500 disabled:opacity-40 cursor-pointer"
              >
                <div className="font-bold text-xs text-stone-100">🔮 Trénink Vůle (+1 Max Vůle)</div>
                <div className="text-[11px] text-stone-400">Trvalé posílení mentální kapacity a many.</div>
                <div className="text-xs font-bold text-emerald-400 mt-1">Cena: 4 Zkušenosti</div>
              </button>
            </div>
          </div>
        )}

        {/* Training Grounds (Strength) */}
        {isTraining && (
          <div className="bg-stone-950/70 p-4 rounded-xl border border-orange-900/50">
            <h3 className="text-sm font-bold text-orange-300 mb-2">Výcvik bojovníků</h3>
            <button
              onClick={() => onTrainStat('strength')}
              disabled={player.experience < 4}
              className="w-full p-3 bg-stone-900 border border-stone-800 rounded-lg text-left hover:border-orange-500 disabled:opacity-40 cursor-pointer"
            >
              <div className="font-bold text-xs text-stone-100">💪 Posílení Síly (+1 Max Síla)</div>
              <div className="text-[11px] text-stone-400">Zvyšuje základní fyzické poškození a maximální zdraví.</div>
              <div className="text-xs font-bold text-emerald-400 mt-1">Cena: 4 Zkušenosti</div>
            </button>

            <div className="mt-4">
              <h4 className="text-xs font-bold text-stone-300 mb-2">Bojové dovednosti k naučení:</h4>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SKILLS.map((skill) => {
                  const alreadyLearned = player.skills.some((s) => s.id === skill.id)
                  return (
                    <button
                      key={skill.id}
                      onClick={() => onLearnSkill(skill)}
                      disabled={alreadyLearned || player.experience < skill.costExp}
                      className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg text-left hover:border-amber-500 disabled:opacity-40 cursor-pointer"
                    >
                      <div className="font-bold text-xs text-stone-200">{skill.name}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">{skill.effect}</div>
                      <div className="text-xs font-bold text-emerald-400 mt-1">
                        {alreadyLearned ? '✓ Již umíš' : `Cena: ${skill.costExp} Zkušeností`}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Items Shop (City or Camp) */}
        {(isCity || isCamp) && (
          <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800">
            <h3 className="text-sm font-bold text-stone-300 mb-2">Zboží na prodej</h3>
            <div className="grid grid-cols-2 gap-3">
              {SHOP_ITEMS.map((item) => {
                const canAfford = player.gold >= item.price
                const alreadyOwned = player.inventory.some((i) => i.id === item.id)

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-stone-900 border border-stone-800 rounded-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-stone-100">{item.name}</span>
                        <span className="text-[10px] uppercase font-semibold text-stone-500">
                          {item.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-1">{item.description}</div>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-stone-800">
                      <span className="text-xs font-extrabold text-amber-400">
                        🪙 {item.price} zl.
                      </span>
                      <button
                        onClick={() => onBuyItem(item)}
                        disabled={!canAfford || alreadyOwned}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black text-[11px] uppercase rounded-lg cursor-pointer transition-all"
                      >
                        {alreadyOwned ? 'Vlastníš' : 'Koupit'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 mt-2">
          <p className="text-[11px] text-stone-400">
            💡 Podle pravidel deskovky návštěvou místa vyčerpáš svou 1 akci pro tento tah.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-xl cursor-pointer transition-all"
            >
              ✕ Jen prohlédnout
            </button>
            <button
              type="button"
              onClick={onFinishTurn || onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg transition-all"
            >
              ✅ Dokončit akci & předat tah
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
