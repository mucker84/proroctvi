import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronRight, Compass, ScrollText, Sparkles, Swords, Users } from 'lucide-react'
import { BOARD_TILES } from '../data/board'
import { ASTRAL_SPHERES } from '../data/spheres'
import { calculatePlayerAttack, calculatePlayerDefense } from '../engine/gameEngine'
import type { BoardTile, GameState, Item, Player, SphereElement } from '../engine/types'
import { DiceRoller } from './DiceRoller'
import { PlayerSheet } from './PlayerSheet'

type MobileTab = 'map' | 'players' | 'log'

interface MobileGameViewProps {
  game: GameState
  roomCode: string | null
  isOnline: boolean
  isMyTurn: boolean
  mySeat: 'p1' | 'p2' | null
  selectedTile: BoardTile
  hasRolledForMove: boolean
  hasCompletedTileAction: boolean
  lastDiceRoll: [number, number] | null
  alternateTile: BoardTile
  onSelectTile: (tile: BoardTile) => void
  onRollDice: (dice: [number, number], direction: 'cw' | 'ccw') => void
  onSwitchDirection: () => void
  onDrawCard: () => void
  onOpenShop: () => void
  onEnterSphere: (sphereId: SphereElement) => void
  onEndTurn: () => void
  onRest: () => void
  onUseItem: (item: Item) => void
  onLobby: () => void
}

const terrainIcon: Record<BoardTile['terrain'], string> = {
  forest: '🌲', mountain: '⛰️', plains: '🌾', water: '🌊', city: '🏰',
  training: '⚔️', temple: '☀️', camp: '🏕️', castle: '🛡️', astral_gate: '🌀',
}

export function MobileGameView({
  game, roomCode, isOnline, isMyTurn, mySeat, selectedTile,
  hasRolledForMove, hasCompletedTileAction, lastDiceRoll, alternateTile,
  onSelectTile, onRollDice, onSwitchDirection, onDrawCard,
  onOpenShop, onEnterSphere, onEndTurn, onRest, onUseItem, onLobby,
}: MobileGameViewProps) {
  const [tab, setTab] = useState<MobileTab>('map')
  const [direction, setDirection] = useState<'cw' | 'ccw'>('cw')
  const [inspectingPlayer, setInspectingPlayer] = useState<Player | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const activePlayer = game.players[game.activePlayerIndex]
  const currentTile = BOARD_TILES[activePlayer.currentTileId]
  const canActOnTile = isMyTurn && game.phase === 'TILE_ACTION'
  const shopAvailable = ['city', 'training', 'temple', 'camp', 'castle'].includes(currentTile.terrain)
  const ownPlayerIndex = isOnline && mySeat === 'p2' ? 1 : 0

  const physAttack = calculatePlayerAttack(activePlayer, 'physical', 0)
  const mentalAttack = calculatePlayerAttack(activePlayer, 'mental', 0)
  const defense = calculatePlayerDefense(activePlayer)

  useEffect(() => {
    if (tab !== 'map') return
    const tile = trackRef.current?.querySelector<HTMLElement>(`[data-tile-id="${activePlayer.currentTileId}"]`)
    tile?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activePlayer.currentTileId, tab])

  return (
    <div className="mobile-game">
      <header className="mobile-header">
        <div>
          <div className="mobile-brand">✦ PROROCTVÍ</div>
          <div className="mobile-header-meta">Kolo {game.turnNumber} · {isOnline ? `Místnost ${roomCode}` : 'Hra na jednom zařízení'}</div>
        </div>
        <button type="button" className="mobile-header-button cursor-pointer" onClick={onLobby}>Lobby</button>
      </header>

      {/* Scoreboard with clickable player sheets */}
      <div className="mobile-scoreboard" aria-label="Stav hráčů">
        {game.players.map((player, index) => (
          <button
            type="button"
            key={player.id}
            onClick={() => setInspectingPlayer(player)}
            className={`mobile-player text-left cursor-pointer transition-all hover:border-amber-400/80 ${index === game.activePlayerIndex ? 'is-active' : ''}`}
            title="Klikni pro detail hrdiny a inventář"
          >
            <div className="mobile-player-portrait">
              {player.heroClass.image
                ? <img src={player.heroClass.image} alt="" />
                : <span>{player.heroClass.avatar}</span>}
            </div>
            <div className="mobile-player-info">
              <span className="mobile-player-label">
                {isOnline ? (index === ownPlayerIndex ? 'TY' : 'SOUPEŘ') : `HRÁČ ${index + 1}`}
                {index === game.activePlayerIndex ? ' · NA TAHU' : ''}
              </span>
              <strong>{player.name}</strong>
              <div className="mobile-player-pills">
                <span className="mobile-pill pill-gold" title="Zlaťáky">🪙 {player.gold} zl</span>
                <span className="mobile-pill pill-exp" title="Zkušenosti">⭐ {player.experience} xp</span>
                <span className="mobile-pill pill-hp" title="Síla / Životy">❤️ {player.currentStrength}/{player.maxStrength}</span>
                <span className="mobile-pill pill-will" title="Vůle / Mana">🔮 {player.currentWill}/{player.maxWill}</span>
                <span className="mobile-pill pill-art" title="Získané artefakty">🏆 {player.artifacts.length}/4</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {tab === 'map' ? (
        <main className="mobile-main">
          {/* Grand Prophecy Quest Tracker Banner */}
          <section className="mobile-quest-banner" aria-label="Cíl hry: 4 z 5 astrálních artefaktů">
            <div className="mobile-quest-header">
              <div className="flex items-center gap-1.5 font-bold text-purple-200 text-xs">
                <span>👑</span>
                <span>CÍL HRY: ZÍSKEJ 4 Z 5 ARTEFAKTŮ ZE SFÉR</span>
              </div>
              <span className="text-[10px] font-black bg-purple-500/30 text-purple-200 border border-purple-400/50 px-2 py-0.5 rounded-full">
                Tvůj postup: {activePlayer.artifacts.length} / 4
              </span>
            </div>
            <div className="mobile-quest-spheres">
              {ASTRAL_SPHERES.map((sphere) => {
                const owner = game.players.find((p) => p.artifacts.some((a) => a.id === sphere.artifact.id))
                const isClaimedByMe = activePlayer.artifacts.some((a) => a.id === sphere.artifact.id)
                const sphereEmoji = sphere.id === 'fire' ? '🔥' : sphere.id === 'ice' ? '❄️' : sphere.id === 'shadow' ? '🌑' : sphere.id === 'storm' ? '⚡' : '🔮'
                return (
                  <div
                    key={sphere.id}
                    className={`mobile-sphere-slot ${isClaimedByMe ? 'is-mine' : owner ? 'is-taken' : 'is-open'}`}
                    title={`${sphere.name} (Brána #${sphere.gateTileId}): ${sphere.artifact.name} ${owner ? `[Drží: ${owner.name}]` : '[Volné v astrální sféře]'}`}
                  >
                    <span className="text-sm">{sphereEmoji}</span>
                    <span className="text-[9.5px] font-bold text-stone-200">
                      {isClaimedByMe ? 'Máš!' : owner ? owner.name.slice(0, 6) : sphere.elementName}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Active Hero Resource Bar */}
          <section className="mobile-resource-bar" aria-label="Suroviny aktivního hrdiny">
            <div className="mobile-res-chip res-gold" title="Zlaťáky – k nákupu zbraní, zbrojí a léčení ve městech">
              <span className="res-icon">🪙</span>
              <div className="res-meta">
                <strong className="res-val">{activePlayer.gold}</strong>
                <span className="res-label">Zlaťáků</span>
              </div>
            </div>

            <div className="mobile-res-chip res-exp" title="Zkušenosti – k tréninku Síly, Vůle a bojových dovedností">
              <span className="res-icon">⭐</span>
              <div className="res-meta">
                <strong className="res-val">{activePlayer.experience}</strong>
                <span className="res-label">Zkušeností</span>
              </div>
            </div>

            <div className="mobile-res-chip res-str" title="Síla / HP – fyzické zdraví a útočné číslo">
              <span className="res-icon">❤️</span>
              <div className="res-meta">
                <strong className="res-val">{activePlayer.currentStrength}/{activePlayer.maxStrength}</strong>
                <span className="res-label">Síla / HP</span>
              </div>
            </div>

            <div className="mobile-res-chip res-will" title="Vůle / Mana – duševní zdraví a mentální kouzla">
              <span className="res-icon">🔮</span>
              <div className="res-meta">
                <strong className="res-val">{activePlayer.currentWill}/{activePlayer.maxWill}</strong>
                <span className="res-label">Vůle / Mana</span>
              </div>
            </div>
          </section>

          {/* Tile scene banner */}
          <section className="mobile-scene" style={{ backgroundImage: `linear-gradient(180deg, rgba(13, 12, 20, .12), rgba(13, 12, 20, .94)), url('${currentTile.image || `${import.meta.env.BASE_URL}art/map.jpg`}')` }}>
            <div className="mobile-scene-top"><Compass size={15} /> KRÁLOVSTVÍ · POLE {currentTile.id}</div>
            <div className="mobile-scene-bottom">
              <div className="mobile-scene-icon" aria-hidden="true">{terrainIcon[currentTile.terrain]}</div>
              <div>
                <h1>{currentTile.name}</h1>
                <p>{currentTile.description}</p>
              </div>
            </div>
          </section>

          {/* Turn status & dice section */}
          <section className="mobile-turn" aria-live="polite">
            <div className="mobile-section-label">{isMyTurn ? 'TVŮJ TAH' : 'TAH SOUPEŘE'} <span>{!hasRolledForMove ? '1 / 2 · POHYB' : '2 / 2 · AKCE'}</span></div>
            {!isMyTurn ? (
              <div className="mobile-wait"><Swords size={22} /><div><strong>Hraje {activePlayer.name}</strong><p>Jeho tah uvidíš tady živě. Mezitím si můžeš prohlédnout plán a hrdiny.</p></div></div>
            ) : !hasRolledForMove ? (
              <div className="mobile-dice"><div><strong>Vydej se na cestu</strong><p>Zvol směr. Po hodu tě hra automaticky přesune o součet obou kostek.</p></div><div className="mobile-direction" role="group" aria-label="Směr pohybu"><button type="button" className={direction === 'cw' ? 'is-active cursor-pointer' : 'cursor-pointer'} onClick={() => setDirection('cw')}>↻ Po směru</button><button type="button" className={direction === 'ccw' ? 'is-active cursor-pointer' : 'cursor-pointer'} onClick={() => setDirection('ccw')}>↺ Proti směru</button></div><DiceRoller onRollComplete={(dice) => onRollDice(dice, direction)} label="Hodit a jít" /></div>
            ) : (
              <div className="mobile-prompt"><strong>Co podnikneš v {currentTile.name}?</strong><p>Hod {lastDiceRoll?.[0]} + {lastDiceRoll?.[1]} = {(lastDiceRoll?.[0] || 0) + (lastDiceRoll?.[1] || 0)}. Vyber akci, nebo předej tah.</p>{!hasCompletedTileAction && <button type="button" className="mobile-switch cursor-pointer" onClick={onSwitchDirection}>↩ Raději jít na pole {alternateTile.id}: {alternateTile.name}</button>}</div>
            )}
          </section>

          {/* Board route */}
          <section className="mobile-route" aria-label="Herní plán">
            <div className="mobile-section-label">CESTA KRÁLOVSTVÍ <span>POSUŇ DO STRANY →</span></div>
            <div className="mobile-track" ref={trackRef}>
              {BOARD_TILES.map((tile) => {
                const isHere = game.players.some((player) => player.currentTileId === tile.id)
                return <button type="button" data-tile-id={tile.id} key={tile.id} onClick={() => onSelectTile(tile)} className={`mobile-tile cursor-pointer ${tile.id === activePlayer.currentTileId ? 'is-current' : ''} ${tile.id === selectedTile.id ? 'is-selected' : ''}`} aria-label={`Pole ${tile.id}: ${tile.name}`}>
                  <span className="mobile-tile-number">{String(tile.id).padStart(2, '0')}</span>
                  <span className="mobile-tile-icon" aria-hidden="true">{terrainIcon[tile.terrain]}</span>
                  <strong>{tile.name}</strong>
                  {isHere && <span className="mobile-tile-pawns">{game.players.filter((player) => player.currentTileId === tile.id).map((player) => player.heroClass.avatar).join(' ')}</span>}
                </button>
              })}
            </div>
            {selectedTile.id !== currentTile.id && <div className="mobile-tile-detail"><strong>{selectedTile.name}</strong><p>{selectedTile.description}</p></div>}
          </section>

          {/* Tile actions */}
          {canActOnTile && <section className="mobile-actions" aria-label="Akce na aktuálním poli">
            <div className="mobile-section-label">AKCE NA POLI</div>
            {shopAvailable && <button type="button" onClick={onOpenShop} className="mobile-action cursor-pointer"><span className="mobile-action-icon">🏪</span><span><strong>{currentTile.specialActionTitle || 'Navštívit místo'}</strong><small>Výbava a trénink (Máš k dispozici: {activePlayer.gold} 🪙 zl, {activePlayer.experience} ⭐ exp)</small></span><ChevronRight size={18} /></button>}
            {currentTile.hasAstralGate && <button type="button" onClick={() => onEnterSphere(currentTile.hasAstralGate!)} className="mobile-action cursor-pointer"><span className="mobile-action-icon">🌀</span><span><strong>Vstoupit do astrální sféry</strong><small>Vyzvat strážce a získat artefakt</small></span><ChevronRight size={18} /></button>}
            <button type="button" onClick={onDrawCard} className="mobile-action cursor-pointer"><span className="mobile-action-icon">🎴</span><span><strong>Tahat kartu dobrodružství</strong><small>Událost, poklad nebo souboj</small></span><ChevronRight size={18} /></button>
            <button type="button" onClick={onRest} className="mobile-action cursor-pointer"><span className="mobile-action-icon">🌿</span><span><strong>Odpočinout si</strong><small>Obnovit 1 Sílu nebo 1 Vůli</small></span><ChevronRight size={18} /></button>
            <button type="button" onClick={onEndTurn} className="mobile-end-turn cursor-pointer">Ukončit tah a předat hru <ChevronRight size={18} /></button>
          </section>}

          {/* HERO HUD & INVENTORY SECTION (Always accessible on map!) */}
          <section className="mobile-hero-hud" aria-label="Výbava a inventář aktivního hrdiny">
            <div className="mobile-hud-header">
              <div className="flex items-center gap-2">
                <span className="text-base">🎒</span>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-serif">
                  Výbava & Karty: {activePlayer.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingPlayer(activePlayer)}
                className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer flex items-center gap-1"
              >
                <span>📜 Celý deník</span>
              </button>
            </div>

            {/* Combat Power stats row */}
            <div className="mobile-hud-combat">
              <div className="mobile-hud-stat-box">
                <span className="mobile-hud-stat-title">⚔️ Fyzický útok</span>
                <span className="mobile-hud-stat-val text-orange-400">
                  {physAttack.total}{' '}
                  <span className="text-[10px] text-stone-400 font-normal">
                    (Síla {activePlayer.currentStrength} + {physAttack.equipmentBonus})
                  </span>
                </span>
              </div>
              <div className="mobile-hud-stat-box">
                <span className="mobile-hud-stat-title">🛡️ Zbroj / Obrana</span>
                <span className="mobile-hud-stat-val text-emerald-400">
                  +{defense}{' '}
                  <span className="text-[10px] text-stone-400 font-normal">krytí</span>
                </span>
              </div>
              <div className="mobile-hud-stat-box">
                <span className="mobile-hud-stat-title">🔮 Mentální síla</span>
                <span className="mobile-hud-stat-val text-indigo-300">
                  {mentalAttack.total}{' '}
                  <span className="text-[10px] text-stone-400 font-normal">
                    (Vůle {activePlayer.currentWill} + {mentalAttack.equipmentBonus})
                  </span>
                </span>
              </div>
            </div>

            {/* Artifacts badges if any */}
            {activePlayer.artifacts.length > 0 && (
              <div className="mb-2.5 p-2 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-between text-xs">
                <span className="font-bold text-purple-300 flex items-center gap-1">
                  <Sparkles size={14} /> Získané Artefakty ({activePlayer.artifacts.length}/4):
                </span>
                <div className="flex gap-1.5">
                  {activePlayer.artifacts.map((art) => (
                    <span
                      key={art.id}
                      className="px-2 py-0.5 rounded bg-purple-900 border border-purple-500 font-bold text-[10px] text-purple-200"
                      title={art.description}
                    >
                      ✨ {art.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Inventory cards */}
            {activePlayer.inventory.length === 0 ? (
              <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800/80 text-center text-xs text-stone-400">
                <span>Inventář je prázdný. Zbraně, zbroj a lektvary získáš nákupem ve městě či v provinciích.</span>
              </div>
            ) : (
              <div className="mobile-inventory-list">
                {activePlayer.inventory.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="mobile-item-chip">
                    <div className="mobile-item-chip-header">
                      <span className="mobile-item-chip-name" title={item.name}>
                        {item.type === 'weapon' ? '⚔️' : item.type === 'armor' ? '🛡️' : item.type === 'potion' ? '🧪' : '💍'} {item.name}
                      </span>
                      <span className="mobile-item-chip-bonus">
                        {item.strengthBonus ? `+${item.strengthBonus}⚔️` : ''}
                        {item.defenseBonus ? `+${item.defenseBonus}🛡️` : ''}
                        {item.willBonus ? `+${item.willBonus}🔮` : ''}
                      </span>
                    </div>
                    <span className="mobile-item-chip-desc">{item.description}</span>
                    {item.type === 'potion' && isMyTurn && (
                      <button
                        type="button"
                        onClick={() => onUseItem(item)}
                        className="mobile-item-use-btn"
                      >
                        Vypít lektvar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      ) : tab === 'players' ? (
        <main className="mobile-secondary">
          <h1><Users size={20} /> Hrdinové</h1>
          {game.players.map((player, index) => (
            <PlayerSheet
              key={player.id}
              player={player}
              isActive={index === game.activePlayerIndex}
              onUseItem={index === game.activePlayerIndex && isMyTurn ? onUseItem : undefined}
            />
          ))}
        </main>
      ) : (
        <main className="mobile-secondary">
          <h1><ScrollText size={20} /> Záznam hry</h1>
          <div className="mobile-log">
            {game.gameLog.map((entry, index) => (
              <p key={`${index}-${entry}`}>{entry}</p>
            ))}
          </div>
        </main>
      )}

      {/* Inspect Player Modal */}
      {inspectingPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setInspectingPlayer(null)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <PlayerSheet
              player={inspectingPlayer}
              isActive={inspectingPlayer.id === activePlayer.id}
              onUseItem={inspectingPlayer.id === activePlayer.id && isMyTurn ? onUseItem : undefined}
              onClose={() => setInspectingPlayer(null)}
            />
          </div>
        </div>
      )}

      <nav className="mobile-nav" aria-label="Navigace hry">
        <button type="button" onClick={() => setTab('map')} className={tab === 'map' ? 'is-active cursor-pointer' : 'cursor-pointer'} aria-current={tab === 'map' ? 'page' : undefined}><Compass size={21} /> Plán</button>
        <button type="button" onClick={() => setTab('players')} className={tab === 'players' ? 'is-active cursor-pointer' : 'cursor-pointer'} aria-current={tab === 'players' ? 'page' : undefined}><BookOpen size={21} /> Hrdinové</button>
        <button type="button" onClick={() => setTab('log')} className={tab === 'log' ? 'is-active cursor-pointer' : 'cursor-pointer'} aria-current={tab === 'log' ? 'page' : undefined}><ScrollText size={21} /> Záznam</button>
      </nav>
    </div>
  )
}
