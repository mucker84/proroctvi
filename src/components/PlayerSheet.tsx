import React from 'react'
import { Item, Player } from '../engine/types'

interface PlayerSheetProps {
  player: Player
  isActive: boolean
  onUseItem?: (item: Item) => void
}

export const PlayerSheet: React.FC<PlayerSheetProps> = ({
  player,
  isActive,
  onUseItem,
}) => {
  return (
    <div
      className={`p-4 rounded-2xl border-2 transition-all backdrop-blur-md flex flex-col gap-3 ${
        isActive
          ? 'bg-stone-900/95 border-amber-500 shadow-xl shadow-amber-900/20 ring-1 ring-amber-400'
          : 'bg-stone-950/80 border-stone-800 opacity-90'
      }`}
    >
      {/* Header Profile */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-12 h-12 rounded-xl bg-stone-800 border border-stone-700 overflow-hidden flex items-center justify-center text-2xl shadow-inner shrink-0">
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
              <span className="font-bold text-sm text-stone-100">{player.name}</span>
              {isActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black uppercase">
                  Na tahu
                </span>
              )}
            </div>
            <div className="text-xs text-amber-400/90 font-medium">
              {player.heroClass.name} • {player.heroClass.title}
            </div>
          </div>
        </div>
      </div>

      {/* Core Stats Bar */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {/* Strength (Health & Physical attack) */}
        <div className="p-2 rounded-xl bg-red-950/40 border border-red-900/50">
          <div className="text-[10px] text-red-400 uppercase font-bold">❤️ Síla / HP</div>
          <div className="text-lg font-black text-red-300">
            {player.currentStrength}{' '}
            <span className="text-xs text-stone-500">/ {player.maxStrength}</span>
          </div>
        </div>

        {/* Will (Mana & Mental attack) */}
        <div className="p-2 rounded-xl bg-blue-950/40 border border-blue-900/50">
          <div className="text-[10px] text-blue-400 uppercase font-bold">🔮 Vůle / Mana</div>
          <div className="text-lg font-black text-blue-300">
            {player.currentWill}{' '}
            <span className="text-xs text-stone-500">/ {player.maxWill}</span>
          </div>
        </div>

        {/* Gold */}
        <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-900/50">
          <div className="text-[10px] text-amber-400 uppercase font-bold">🪙 Zlaťáky</div>
          <div className="text-lg font-black text-amber-300">{player.gold}</div>
        </div>

        {/* Experience */}
        <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-900/50">
          <div className="text-[10px] text-emerald-400 uppercase font-bold">⭐ Zkušenosti</div>
          <div className="text-lg font-black text-emerald-300">{player.experience}</div>
        </div>
      </div>

      {/* Artifacts Stash (Goal is 4 to win) */}
      <div className="bg-purple-950/30 border border-purple-900/50 p-2.5 rounded-xl">
        <div className="flex items-center justify-between text-xs font-bold text-purple-300 mb-1.5">
          <span>🏆 Získané Artefakty ze Sfér:</span>
          <span className="text-amber-400">{player.artifacts.length} / 4 pro výhru!</span>
        </div>
        <div className="flex gap-2">
          {player.artifacts.length === 0 ? (
            <span className="text-[11px] text-stone-500 italic">Zatím žádný artefakt</span>
          ) : (
            player.artifacts.map((art) => (
              <div
                key={art.id}
                title={`${art.name}: ${art.specialPower}`}
                className="px-2 py-1 bg-purple-900/60 border border-purple-500 rounded-lg text-xs font-bold text-purple-200 flex items-center gap-1 shadow-sm"
              >
                <span>✨</span>
                <span>{art.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Inventory & Equipment */}
      <div>
        <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
          Inventář & Vybavení ({player.inventory.length})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {player.inventory.length === 0 ? (
            <span className="text-xs text-stone-500 italic">Prázdný inventář</span>
          ) : (
            player.inventory.map((item) => (
              <div
                key={item.id}
                className="px-2.5 py-1 bg-stone-900 border border-stone-800 rounded-lg text-xs flex items-center gap-1.5 text-stone-200 shadow-sm"
              >
                <span>{item.type === 'weapon' ? '⚔️' : item.type === 'armor' ? '🛡️' : '🧪'}</span>
                <span>{item.name}</span>
                {item.type === 'potion' && onUseItem && (
                  <button
                    onClick={() => onUseItem(item)}
                    className="ml-1 text-[10px] text-amber-400 hover:text-amber-300 font-bold uppercase underline cursor-pointer"
                  >
                    Vypít
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Passive Ability & Skills */}
      <div className="text-[11px] text-stone-400 bg-stone-950/60 p-2 rounded-lg border border-stone-800">
        <span className="text-amber-400 font-semibold">Schopnost: </span>
        {player.heroClass.passiveAbility}
      </div>
    </div>
  )
}
