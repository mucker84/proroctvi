import React from 'react'
import { calculatePlayerAttack, calculatePlayerDefense } from '../engine/gameEngine'
import { Item, Player } from '../engine/types'

interface PlayerSheetProps {
  player: Player
  isActive: boolean
  onUseItem?: (item: Item) => void
  onClose?: () => void
}

export const PlayerSheet: React.FC<PlayerSheetProps> = ({
  player,
  isActive,
  onUseItem,
  onClose,
}) => {
  const physAttack = calculatePlayerAttack(player, 'physical', 0)
  const mentalAttack = calculatePlayerAttack(player, 'mental', 0)
  const defense = calculatePlayerDefense(player)

  return (
    <div
      className={`p-4 rounded-2xl border-2 transition-all backdrop-blur-md flex flex-col gap-3.5 ${
        isActive
          ? 'bg-stone-900/95 border-amber-500 shadow-xl shadow-amber-900/20 ring-1 ring-amber-400'
          : 'bg-stone-950/80 border-stone-800 opacity-90'
      }`}
    >
      {/* Header Profile */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-stone-800 border-2 border-stone-700 overflow-hidden flex items-center justify-center text-3xl shadow-inner shrink-0">
            {player.heroClass.image ? (
              <img
                src={player.heroClass.image}
                alt={player.heroClass.name}
                className="w-full h-full object-cover"
              />
            ) : (
              player.heroClass.avatar
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-stone-100">{player.name}</span>
              {isActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black uppercase tracking-wider">
                  Na tahu
                </span>
              )}
            </div>
            <div className="text-xs text-amber-400/90 font-medium">
              {player.heroClass.name} • {player.heroClass.title}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              Základna: Pole #{player.heroClass.startTileId}
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            ✕ Zavřít
          </button>
        )}
      </div>

      {/* Core Stats Bar */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {/* Strength (Health & Physical attack) */}
        <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-800/60 shadow-sm">
          <div className="text-[10px] text-red-400 uppercase font-black tracking-wider">❤️ Síla / HP</div>
          <div className="text-xl font-black text-red-200 mt-0.5">
            {player.currentStrength}{' '}
            <span className="text-xs font-semibold text-stone-400">/ {player.maxStrength}</span>
          </div>
        </div>

        {/* Will (Mana & Mental attack) */}
        <div className="p-2.5 rounded-xl bg-blue-950/50 border border-blue-800/60 shadow-sm">
          <div className="text-[10px] text-blue-400 uppercase font-black tracking-wider">🔮 Vůle / Mana</div>
          <div className="text-xl font-black text-blue-200 mt-0.5">
            {player.currentWill}{' '}
            <span className="text-xs font-semibold text-stone-400">/ {player.maxWill}</span>
          </div>
        </div>

        {/* Gold */}
        <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-800/60 shadow-sm">
          <div className="text-[10px] text-amber-400 uppercase font-black tracking-wider">🪙 Zlaťáky</div>
          <div className="text-xl font-black text-amber-300 mt-0.5">{player.gold}</div>
        </div>

        {/* Experience */}
        <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 shadow-sm">
          <div className="text-[10px] text-emerald-400 uppercase font-black tracking-wider">⭐ Zkušenosti</div>
          <div className="text-xl font-black text-emerald-300 mt-0.5">{player.experience}</div>
        </div>
      </div>

      {/* Combat Power Breakdown */}
      <div className="grid grid-cols-3 gap-2 bg-stone-950/80 p-2.5 rounded-xl border border-stone-800 text-center">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-stone-400 uppercase font-bold">⚔️ Fyzický útok</span>
          <span className="text-sm font-black text-orange-400">
            {physAttack.total} <span className="text-[11px] font-normal text-stone-400">(+{physAttack.equipmentBonus} zbraně)</span>
          </span>
        </div>
        <div className="flex flex-col items-center border-x border-stone-800">
          <span className="text-[10px] text-stone-400 uppercase font-bold">🛡️ Obrana</span>
          <span className="text-sm font-black text-emerald-400">
            +{defense} <span className="text-[11px] font-normal text-stone-400">zbroj</span>
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-stone-400 uppercase font-bold">✨ Mentální útok</span>
          <span className="text-sm font-black text-indigo-400">
            {mentalAttack.total} <span className="text-[11px] font-normal text-stone-400">(+{mentalAttack.equipmentBonus} bonus)</span>
          </span>
        </div>
      </div>

      {/* Artifacts Stash (Goal is 4 to win) */}
      <div className="bg-purple-950/40 border border-purple-800/60 p-2.5 rounded-xl">
        <div className="flex items-center justify-between text-xs font-bold text-purple-300 mb-1.5">
          <span className="flex items-center gap-1.5">
            <span>🏆</span>
            <span>Astrální artefakty:</span>
          </span>
          <span className="text-amber-400 font-extrabold">{player.artifacts.length} / 4 pro vítězství</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {player.artifacts.length === 0 ? (
            <span className="text-[11px] text-stone-500 italic py-0.5">Zatím žádný artefakt ze sfér</span>
          ) : (
            player.artifacts.map((art) => (
              <div
                key={art.id}
                title={`${art.name}: ${art.specialPower}`}
                className="px-2.5 py-1 bg-purple-900/60 border border-purple-500/80 rounded-lg text-xs font-bold text-purple-200 flex items-center gap-1.5 shadow-sm"
              >
                <span>✨</span>
                <span>{art.name}</span>
                <span className="text-[10px] text-purple-300 font-mono">
                  ({art.strengthBonus > 0 ? `+${art.strengthBonus}⚔️` : ''} {art.willBonus > 0 ? `+${art.willBonus}🔮` : ''})
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Inventory & Equipment */}
      <div className="bg-stone-950/60 border border-stone-800 p-3 rounded-xl">
        <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
          <span>🎒 Inventář & Karty předmětů ({player.inventory.length})</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {player.inventory.length === 0 ? (
            <div className="col-span-full text-xs text-stone-500 italic py-2 text-center">
              Inventář je prázdný. Zbraně a lektvary lze koupit ve městě, na cvičišti nebo najít v provinciích.
            </div>
          ) : (
            player.inventory.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="p-2 bg-stone-900/90 border border-stone-800 rounded-lg flex items-start justify-between gap-2 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">
                    {item.type === 'weapon' ? '⚔️' : item.type === 'armor' ? '🛡️' : item.type === 'shield' ? '🛡️' : item.type === 'potion' ? '🧪' : '💍'}
                  </span>
                  <div>
                    <div className="font-bold text-xs text-stone-200">{item.name}</div>
                    <div className="text-[10px] text-stone-400 leading-snug">{item.description}</div>
                    <div className="flex gap-2 text-[10px] text-amber-400 font-bold mt-0.5">
                      {item.strengthBonus ? <span>+{item.strengthBonus} Síla</span> : null}
                      {item.willBonus ? <span>+{item.willBonus} Vůle</span> : null}
                      {item.defenseBonus ? <span>+{item.defenseBonus} Obrana</span> : null}
                    </div>
                  </div>
                </div>

                {item.type === 'potion' && onUseItem && (
                  <button
                    type="button"
                    onClick={() => onUseItem(item)}
                    className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-stone-950 border border-amber-500/50 rounded text-[10px] font-black uppercase cursor-pointer transition-colors shrink-0"
                  >
                    Vypít
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Skills & Spells */}
      {((player.skills && player.skills.length > 0) || (player.spells && player.spells.length > 0)) && (
        <div className="bg-stone-950/60 border border-stone-800 p-3 rounded-xl flex flex-col gap-2">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
            📜 Dovednosti & Kouzla
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {player.skills?.map((sk) => (
              <div key={sk.id} className="p-2 bg-stone-900 border border-stone-800 rounded-lg text-xs">
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  <span>🎖️</span> {sk.name}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">{sk.effect}</div>
              </div>
            ))}
            {player.spells?.map((sp) => (
              <div key={sp.id} className="p-2 bg-stone-900 border border-stone-800 rounded-lg text-xs">
                <div className="font-bold text-blue-400 flex items-center gap-1">
                  <span>⚡</span> {sp.name} ({sp.willCost} Vůle)
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">{sp.effect}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Passive Ability */}
      <div className="text-[11px] text-stone-300 bg-stone-950/80 p-2.5 rounded-lg border border-stone-800">
        <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] block mb-0.5">
          Vrozená schopnost hrdiny:
        </span>
        {player.heroClass.passiveAbility}
      </div>
    </div>
  )
}
