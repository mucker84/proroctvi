import React, { useState } from 'react'
import { BoardTile, Player, SphereElement } from '../engine/types'
import { DiceRoller } from './DiceRoller'

interface TurnActionPanelProps {
  player: Player
  currentTile: BoardTile
  alternateTile: BoardTile
  isMyTurn: boolean
  hasRolledForMove: boolean
  hasCompletedTileAction: boolean
  lastDiceRoll: [number, number] | null
  onRollDice: (dice: [number, number], direction: 'cw' | 'ccw') => void
  onSwitchDirection: () => void
  onDrawCard: () => void
  onOpenShop: () => void
  onEnterSphere: (sphereId: SphereElement) => void
  onRest: () => void
  onEndTurn: () => void
}

export const TurnActionPanel: React.FC<TurnActionPanelProps> = ({
  player,
  currentTile,
  alternateTile,
  isMyTurn,
  hasRolledForMove,
  hasCompletedTileAction,
  lastDiceRoll,
  onRollDice,
  onSwitchDirection,
  onDrawCard,
  onOpenShop,
  onEnterSphere,
  onRest,
  onEndTurn,
}) => {
  const [preferredDirection, setPreferredDirection] = useState<'cw' | 'ccw'>('cw')

  const totalDice = lastDiceRoll ? lastDiceRoll[0] + lastDiceRoll[1] : 0

  const isCityOrBuilding =
    currentTile.terrain === 'city' ||
    currentTile.terrain === 'training' ||
    currentTile.terrain === 'temple' ||
    currentTile.terrain === 'camp' ||
    currentTile.terrain === 'castle'

  return (
    <div className="w-full max-w-4xl bg-stone-900/95 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl backdrop-blur-md flex flex-col gap-5 text-stone-100 transition-all">
      {/* 1. Turn Step Indicator */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚔️</span>
          <div>
            <h3 className="text-base font-extrabold text-amber-400 font-serif uppercase tracking-wider m-0 leading-tight">
              Tah hráče: {player.name}
            </h3>
            <p className="text-xs text-stone-400 m-0">
              {player.heroClass.name} • Pozice: #{currentTile.id} ({currentTile.name})
            </p>
          </div>
        </div>

        {/* 3-Step Wizard */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-bold">
          <div
            className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${
              !hasRolledForMove
                ? 'bg-amber-500 text-stone-950 font-black animate-pulse shadow-md'
                : 'bg-stone-800 text-stone-400'
            }`}
          >
            <span>1.</span> 🎲 Hod kostkou
          </div>
          <span className="text-stone-600">➔</span>
          <div
            className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${
              hasRolledForMove && !hasCompletedTileAction
                ? 'bg-amber-500 text-stone-950 font-black animate-pulse shadow-md'
                : 'bg-stone-800 text-stone-400'
            }`}
          >
            <span>2.</span> 📍 Akce na poli
          </div>
          <span className="text-stone-600">➔</span>
          <div
            className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${
              hasCompletedTileAction
                ? 'bg-emerald-500 text-stone-950 font-black animate-pulse shadow-md'
                : 'bg-stone-800 text-stone-400'
            }`}
          >
            <span>3.</span> 🏁 Konec tahu
          </div>
        </div>
      </div>

      {/* When Opponent is playing in online match */}
      {!isMyTurn ? (
        <div className="flex flex-col items-center justify-center p-8 bg-stone-950/60 rounded-2xl border border-stone-800 text-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <h4 className="text-lg font-bold text-stone-200">Čeká se na soupeře</h4>
          <p className="text-xs text-stone-400 max-w-md">
            Hráč <span className="text-amber-400 font-bold">{player.name}</span> právě provádí svůj tah.
            Jeho pohyb a vyhodnocení uvidíš živě na herním plánu.
          </p>
        </div>
      ) : !hasRolledForMove ? (
        /* STEP 1: ROLL DICE TO MOVE AUTOMATICALLY */
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-stone-950/70 rounded-2xl border border-stone-800">
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-mono">
              Krok 1: Pohyb hrdiny
            </span>
            <h4 className="text-xl font-black text-stone-100 font-serif">
              Hoď kostkami a postup vpřed!
            </h4>
            <p className="text-xs text-stone-300 leading-relaxed">
              Po hodu kostkami se tvůj hrdina <strong>automaticky přesune</strong> na cílové pole, kde se ti
              rovnou otevře nabídka možností a akcí pro danou provincii či město.
            </p>

            {/* Direction Selector */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-stone-400">Směr postupu:</span>
              <div className="flex rounded-xl bg-stone-900 p-1 border border-stone-800">
                <button
                  type="button"
                  onClick={() => setPreferredDirection('cw')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    preferredDirection === 'cw'
                      ? 'bg-amber-500 text-stone-950 shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  ↻ Po směru hodin
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredDirection('ccw')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    preferredDirection === 'ccw'
                      ? 'bg-amber-500 text-stone-950 shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  ↺ Proti směru
                </button>
              </div>
            </div>
          </div>

          {/* Dice roller interactive widget */}
          <div>
            <DiceRoller
              onRollComplete={(dice) => onRollDice(dice, preferredDirection)}
              label="Hodit a posunout hrdinu"
            />
          </div>
        </div>
      ) : (
        /* STEP 2: TILE ARRIVAL & ACTIONS SELECTION */
        <div className="flex flex-col gap-4">
          {/* Arrival info header */}
          <div className="flex flex-wrap items-center justify-between bg-stone-950/80 p-3.5 rounded-2xl border border-stone-800 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-2xl shadow-inner">
                {currentTile.terrain === 'city' && '🏰'}
                {currentTile.terrain === 'forest' && '🌲'}
                {currentTile.terrain === 'mountain' && '⛰️'}
                {currentTile.terrain === 'plains' && '🌾'}
                {currentTile.terrain === 'water' && '🌊'}
                {currentTile.terrain === 'training' && '⚔️'}
                {currentTile.terrain === 'temple' && '☀️'}
                {currentTile.terrain === 'camp' && '🏕️'}
                {currentTile.terrain === 'castle' && '🛡️'}
                {currentTile.terrain === 'astral_gate' && '🌀'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-widest font-mono">
                    Pole #{currentTile.id}
                  </span>
                  <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full font-bold uppercase">
                    {currentTile.terrain}
                  </span>
                  {lastDiceRoll && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                      🎲 Hod: {lastDiceRoll[0]} + {lastDiceRoll[1]} = {totalDice}
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-black text-stone-100 font-serif leading-tight">
                  {currentTile.name}
                </h4>
                <p className="text-xs text-stone-300 mt-0.5 max-w-xl">{currentTile.description}</p>
              </div>
            </div>

            {/* Quick Switch Direction Button */}
            {!hasCompletedTileAction && (
              <button
                onClick={onSwitchDirection}
                className="px-3 py-1.5 bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-300 text-xs font-bold rounded-xl border border-stone-700 flex items-center gap-1.5 cursor-pointer transition-all"
                title={`Otočit směr a jít na pole #${alternateTile.id} (${alternateTile.name})`}
              >
                <span>↩️</span>
                <span>Jít raději na #{alternateTile.id} ({alternateTile.name})</span>
              </button>
            )}
          </div>

          {/* Action Choice Cards */}
          <div>
            <div className="text-xs font-extrabold text-stone-400 uppercase tracking-wider mb-2 font-mono">
              Co chceš na tomto poli udělat?
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* ACTION 1: SPECIAL LOCATION (CITY, TRAINING, TEMPLE) */}
              {isCityOrBuilding && (
                <button
                  onClick={onOpenShop}
                  className="flex flex-col items-start justify-between p-4 bg-gradient-to-br from-indigo-950/80 to-stone-900 border-2 border-indigo-500/60 hover:border-indigo-400 rounded-2xl shadow-lg cursor-pointer hover:scale-[1.02] transition-all text-left group"
                >
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🏪</span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                      Doporučeno
                    </span>
                  </div>
                  <div>
                    <div className="font-black text-sm text-stone-100 group-hover:text-indigo-300">
                      {currentTile.specialActionTitle || 'Vstoupit do lokace'}
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                      Nákup zbraní, lektvarů, trénink atributů Síly/Vůle a léčení zranění.
                    </p>
                  </div>
                  <div className="w-full mt-3 pt-2 border-t border-indigo-900/60 text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
                    Otevřít nabídku ➔
                  </div>
                </button>
              )}

              {/* ACTION 2: ASTRAL GATE */}
              {currentTile.hasAstralGate && (
                <button
                  onClick={() => onEnterSphere(currentTile.hasAstralGate!)}
                  className="flex flex-col items-start justify-between p-4 bg-gradient-to-br from-purple-950/90 to-stone-900 border-2 border-purple-500 hover:border-purple-300 rounded-2xl shadow-xl shadow-purple-950/50 cursor-pointer hover:scale-[1.02] transition-all text-left group animate-pulse"
                >
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-2xl group-hover:scale-110 transition-transform">🌀</span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500 text-white px-2 py-0.5 rounded-full">
                      Astrální Výzva
                    </span>
                  </div>
                  <div>
                    <div className="font-black text-sm text-stone-100 group-hover:text-purple-300">
                      Vstoupit do Astrální Sféry
                    </div>
                    <p className="text-[11px] text-stone-300 mt-1 leading-snug">
                      Vyzvi mocného Strážce sféry k boji a získej 1 z 5 legendárních artefaktů!
                    </p>
                  </div>
                  <div className="w-full mt-3 pt-2 border-t border-purple-900/60 text-xs font-bold text-purple-300 group-hover:translate-x-1 transition-transform">
                    Vstoupit do sféry ➔
                  </div>
                </button>
              )}

              {/* ACTION 3: DRAW ADVENTURE CARD (ALWAYS AVAILABLE IN WILDERNESS OR AS ALTERNATIVE) */}
              <button
                onClick={onDrawCard}
                className="flex flex-col items-start justify-between p-4 bg-gradient-to-br from-amber-950/60 to-stone-900 border-2 border-amber-600/60 hover:border-amber-400 rounded-2xl shadow-lg cursor-pointer hover:scale-[1.02] transition-all text-left group"
              >
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🎴</span>
                  {!isCityOrBuilding && !currentTile.hasAstralGate && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full">
                      Hlavní akce
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-black text-sm text-stone-100 group-hover:text-amber-300">
                    Prozkoumat provincii (Karta)
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                    Vytáhni kartu dobrodružství. Čekají tě monstra, poklady, tajemné bytosti či události.
                  </p>
                </div>
                <div className="w-full mt-3 pt-2 border-t border-amber-900/60 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                  Tahat kartu ➔
                </div>
              </button>

              {/* ACTION 4: REST AND RECOVER */}
              <button
                onClick={onRest}
                className="flex flex-col items-start justify-between p-4 bg-gradient-to-br from-emerald-950/60 to-stone-900 border-2 border-emerald-600/60 hover:border-emerald-400 rounded-2xl shadow-lg cursor-pointer hover:scale-[1.02] transition-all text-left group"
              >
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🌿</span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-stone-100 px-2 py-0.5 rounded-full">
                    Zotavení
                  </span>
                </div>
                <div>
                  <div className="font-black text-sm text-stone-100 group-hover:text-emerald-300">
                    Odpočinek a zotavení
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                    Udělej si tábor a zotav se: Obnoví +1 Sílu (život) nebo +1 Vůli (mana).
                  </p>
                </div>
                <div className="w-full mt-3 pt-2 border-t border-emerald-900/60 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  Odpočívat ➔
                </div>
              </button>

              {/* ACTION 5: END TURN DIRECTLY */}
              <button
                onClick={onEndTurn}
                className={`flex flex-col items-start justify-between p-4 rounded-2xl shadow-lg cursor-pointer hover:scale-[1.02] transition-all text-left group border-2 ${
                  hasCompletedTileAction
                    ? 'bg-gradient-to-br from-emerald-900 to-stone-900 border-emerald-500 animate-pulse'
                    : 'bg-stone-900 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-2xl group-hover:scale-110 transition-transform">⏩</span>
                  {hasCompletedTileAction && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-stone-950 px-2 py-0.5 rounded-full">
                      Hotovo!
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-black text-sm text-stone-100 group-hover:text-amber-300">
                    {hasCompletedTileAction ? 'Ukončit tah a předat hru' : 'Přeskočit akce a ukončit tah'}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1 leading-snug">
                    {hasCompletedTileAction
                      ? 'Tvoje akce je hotova. Můžeš předat tah dalšímu hrdinovi.'
                      : 'Pokud nechceš na poli nic dělat, předej rovnou tah.'}
                  </p>
                </div>
                <div className="w-full mt-3 pt-2 border-t border-stone-800 text-xs font-bold text-stone-400 group-hover:text-stone-200 group-hover:translate-x-1 transition-transform">
                  Ukončit tah ➔
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
