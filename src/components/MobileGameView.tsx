import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronRight, Compass, ScrollText, Sparkles, Swords, Users } from 'lucide-react'
import { BOARD_TILES } from '../data/board'
import { ASTRAL_SPHERES } from '../data/spheres'
import { calculatePlayerAttack, calculatePlayerDefense, getTacticalMoveOptions } from '../engine/gameEngine'
import type { BoardTile, GameState, Item, SphereElement } from '../engine/types'
import { IntroGuideModal } from './IntroGuideModal'
import { PlayerSheet } from './PlayerSheet'

type MobileTab = 'map' | 'players' | 'log'

interface MobileGameViewProps {
  game: GameState
  roomCode: string | null
  isOnline: boolean
  isMyTurn: boolean
  mySeat: 'p1' | 'p2' | null
  selectedTile: BoardTile
  hasMoved: boolean
  hasCompletedTileAction: boolean
  claimedSpheres: Record<SphereElement, string | null>
  validMoves: number[]
  onSelectTile: (tile: BoardTile) => void
  onExecuteMove: (targetTileId: number, costGold: number, moveType: string) => void
  onWorkAction: (type: 'city_work' | 'guild_work' | 'fortress_training') => void
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
  hasMoved, hasCompletedTileAction, claimedSpheres, validMoves,
  onSelectTile, onExecuteMove, onWorkAction, onDrawCard,
  onOpenShop, onEnterSphere, onEndTurn, onRest, onUseItem, onLobby,
}: MobileGameViewProps) {
  const [tab, setTab] = useState<MobileTab>('map')
  const [inspectingPlayerId, setInspectingPlayerId] = useState<string | null>(null)
  const [showIntro, setShowIntro] = useState<boolean>(
    () => localStorage.getItem('proroctvi_intro_seen') !== 'true'
  )
  const trackRef = useRef<HTMLDivElement>(null)
  const activePlayer = game.players[game.activePlayerIndex]
  const currentTile = BOARD_TILES[activePlayer.currentTileId] || BOARD_TILES[0]
  const canActOnTile = isMyTurn && hasMoved && !hasCompletedTileAction
  const shopAvailable = ['city', 'training', 'temple', 'camp', 'castle'].includes(currentTile.terrain) || !!currentTile.isGuild
  const ownPlayerIndex = isOnline && mySeat === 'p2' ? 1 : 0
  const hudPlayer = isOnline ? game.players[ownPlayerIndex] : activePlayer
  const inspectingPlayer = game.players.find((player) => player.id === inspectingPlayerId) ?? null
  const latestLog = game.gameLog && game.gameLog.length > 0 ? game.gameLog[0] : null
  const tileMonsters = game.tileMonsters || {}
  const lyingHere = tileMonsters[currentTile.id]
  const lyingSelected = tileMonsters[selectedTile.id]

  const moveOptions = getTacticalMoveOptions(activePlayer, claimedSpheres)
  const walkOptions = moveOptions.filter((o) => o.type === 'walk' || o.type === 'stay')
  const horseOptions = moveOptions.filter((o) => o.type === 'horse')
  const travelOptions = moveOptions.filter((o) => o.type === 'ship' || o.type === 'gate')
  const workOptions = moveOptions.filter((o) => o.type === 'work')
  const sphereOptions = moveOptions.filter((o) => o.type === 'enter_sphere')

  const physAttack = calculatePlayerAttack(hudPlayer, 'physical', 0)
  const mentalAttack = calculatePlayerAttack(hudPlayer, 'mental', 0)
  const defense = calculatePlayerDefense(hudPlayer)

  useEffect(() => {
    if (tab !== 'map') return
    const track = trackRef.current
    const tile = track?.querySelector<HTMLElement>(`[data-tile-id="${activePlayer.currentTileId}"]`)
    if (!track || !tile) return
    const trackBounds = track.getBoundingClientRect()
    const tileBounds = tile.getBoundingClientRect()
    track.scrollBy({
      left: tileBounds.left - trackBounds.left - (trackBounds.width - tileBounds.width) / 2,
      behavior: 'smooth',
    })
  }, [activePlayer.currentTileId, tab])

  return (
    <div className="mobile-game">
      <div className="mobile-topbar">
      <header className="mobile-header">
        <div>
          <div className="mobile-brand">✦ PROROCTVÍ</div>
          <div className="mobile-header-meta">Kolo {game.turnNumber} · {isOnline ? `Místnost ${roomCode}` : 'Hra na jednom zařízení'}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="mobile-header-button cursor-pointer flex items-center gap-1 font-semibold"
            onClick={() => setShowIntro(true)}
            title="Průvodce hrou a pravidla"
          >
            ❓ Průvodce
          </button>
          <button type="button" className="mobile-header-button cursor-pointer" onClick={onLobby} title="Ukončit hru a vrátit se do lobby">
            ✕ Ukončit hru
          </button>
        </div>
      </header>

      <div className="mobile-scoreboard" aria-label="Zdroje obou hráčů">
        {game.players.map((player, index) => (
          <button
            type="button"
            key={player.id}
            onClick={() => setInspectingPlayerId(player.id)}
            className={`mobile-player cursor-pointer ${index === game.activePlayerIndex ? 'is-active' : ''}`}
            aria-label={`${isOnline ? (index === ownPlayerIndex ? 'Ty' : 'Soupeř') : `Hráč ${index + 1}`}, ${player.name}. Síla ${player.currentStrength} z ${player.maxStrength}, vůle ${player.currentWill} z ${player.maxWill}, zlato ${player.gold}, zkušenosti ${player.experience}, artefakty ${player.artifacts.length} ze 4, předměty ${player.inventory.length}. Otevřít deník.`}
          >
            <span className="mobile-player-identity">
              <span className="mobile-player-portrait" aria-hidden="true">
                {player.heroClass.image
                  ? <img src={player.heroClass.image} alt="" />
                  : <span>{player.heroClass.avatar}</span>}
              </span>
              <span className="mobile-player-label">{isOnline ? (index === ownPlayerIndex ? 'TY' : 'SOUPĚŘ') : `HRÁČ ${index + 1}`}</span>
              <span className="mobile-player-name">{player.name}</span>
              {index === game.activePlayerIndex && <span className="mobile-player-turn">TAH</span>}
            </span>
            <span className="mobile-stat stat-strength"><span>SÍLA</span><strong>{player.currentStrength}/{player.maxStrength}</strong></span>
            <span className="mobile-stat stat-will"><span>VŮLE</span><strong>{player.currentWill}/{player.maxWill}</strong></span>
            <span className="mobile-stat stat-gold"><span>ZLATO</span><strong>{player.gold}</strong></span>
            <span className="mobile-stat stat-exp"><span>ZKUŠ.</span><strong>{player.experience}</strong></span>
            <span className="mobile-stat stat-art"><span>ARTEF.</span><strong>{player.artifacts.length}/4</strong></span>
            <span className="mobile-stat stat-items"><span>VĚCI</span><strong>{player.inventory.length}</strong></span>
          </button>
        ))}
      </div>

      {/* Live Status Ticker (Poslední akce ze záznamu) */}
      {latestLog && (
        <button
          type="button"
          onClick={() => setTab('log')}
          className="mobile-status-ticker cursor-pointer text-left"
          title="Poslední událost ve hře (Klepnutím otevřeš celý záznam)"
          aria-label={`Poslední událost: ${latestLog}`}
        >
          <span className="mobile-status-ticker-tag">ŽIVĚ</span>
          <span className="mobile-status-ticker-text">{latestLog}</span>
          <span className="mobile-status-ticker-more">Záznam ›</span>
        </button>
      )}
      </div>

      {tab === 'map' ? (
        <main className="mobile-main">
          {/* Turn status & dice section */}
          <section className="mobile-turn" aria-live="polite">
            <div className="mobile-section-label">
              {isMyTurn ? (
                <span className="text-emerald-400 font-black">🟢 TVŮJ TAH</span>
              ) : (
                <span className="text-amber-400 font-black">⏳ TAH SOUPEŘE</span>
              )}
              <span>
                {!isMyTurn
                  ? `ČEKÁ SE NA ${activePlayer.name.toUpperCase()}`
                  : !hasMoved
                  ? 'KROK 1 / 2 · VOLBA POHYBU (BEZ KOSTEK)'
                  : !hasCompletedTileAction
                  ? 'KROK 2 / 2 · AKCE NA POLI'
                  : '✅ AKCE DOKONČENA · PŘEDÁVÁM TAH'}
              </span>
            </div>
            {!isMyTurn ? (
              <div className="mobile-wait">
                <Swords size={22} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <strong>Hraje soupeř: {activePlayer.name}</strong>
                  <p className="line-clamp-2 mt-0.5 text-stone-300">
                    {latestLog || 'Jeho tah probíhá živě na plánu. Jakmile skončí, budeš na řadě.'}
                  </p>
                </div>
              </div>
            ) : !hasMoved ? (
              <div className="mobile-move-panel">
                <div>
                  <strong className="text-[#fff3d8] font-serif text-base block">Zvol svůj pohyb (Žádné kostky!)</strong>
                  <p className="text-xs text-stone-300 mt-1">
                    Volíš si sám: Pěšky (zdarma), Kůň (1 zl), Loď (1 zl), Brána (2 zl) nebo akce místo pohybu.
                  </p>
                </div>

                {/* Pěšky */}
                <div className="mobile-move-group">
                  <div className="mobile-move-group-title">
                    <span>🚶 Pěšky (o 1 pole nebo na místě)</span>
                    <span className="text-emerald-400 font-bold">Zdarma</span>
                  </div>
                  <div className="mobile-move-grid">
                    {walkOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onExecuteMove(opt.targetTileId, opt.costGold, opt.type)}
                        className="mobile-move-btn is-free"
                      >
                        <div className="mobile-move-btn-header">
                          <span className="text-base">{opt.icon}</span>
                          <span className="mobile-move-btn-cost text-emerald-400">0 zl</span>
                        </div>
                        <span className="mobile-move-btn-title">{opt.label}</span>
                        <span className="mobile-move-btn-detail">{opt.detail}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Na koni */}
                <div className="mobile-move-group">
                  <div className="mobile-move-group-title">
                    <span>🐎 Na koni (o 2 pole)</span>
                    <span className="text-amber-400 font-bold">1 🪙 zlaťák</span>
                  </div>
                  <div className="mobile-move-grid">
                    {horseOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={!opt.isAvailable}
                        title={opt.unavailableReason}
                        onClick={() => onExecuteMove(opt.targetTileId, opt.costGold, opt.type)}
                        className="mobile-move-btn is-horse"
                      >
                        <div className="mobile-move-btn-header">
                          <span className="text-base">{opt.icon}</span>
                          <span className="mobile-move-btn-cost text-amber-400">1 🪙</span>
                        </div>
                        <span className="mobile-move-btn-title">{opt.label}</span>
                        <span className="mobile-move-btn-detail">{opt.detail}</span>
                        {!opt.isAvailable && (
                          <span className="text-[9px] text-red-400 font-semibold">{opt.unavailableReason}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cesta lodí & Magická brána */}
                {travelOptions.length > 0 && (
                  <div className="mobile-move-group">
                    <div className="mobile-move-group-title">
                      <span>⛵ Speciální doprava (Přístav & Brány)</span>
                    </div>
                    <div className="mobile-move-grid">
                      {travelOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={!opt.isAvailable}
                          title={opt.unavailableReason}
                          onClick={() => onExecuteMove(opt.targetTileId, opt.costGold, opt.type)}
                          className={`mobile-move-btn ${opt.type === 'ship' ? 'is-ship' : 'is-gate'}`}
                        >
                          <div className="mobile-move-btn-header">
                            <span className="text-base">{opt.icon}</span>
                            <span className="mobile-move-btn-cost text-amber-400">{opt.costGold} 🪙</span>
                          </div>
                          <span className="mobile-move-btn-title">{opt.label}</span>
                          <span className="mobile-move-btn-detail">{opt.detail}</span>
                          {!opt.isAvailable && (
                            <span className="text-[9px] text-red-400 font-semibold">{opt.unavailableReason}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Akce místo pohybu (Práce ve městě, Výcvik v pevnosti, Špinavá práce) */}
                {workOptions.length > 0 && (
                  <div className="mobile-move-group">
                    <div className="mobile-move-group-title">
                      <span>🛠️ Akce místo pohybu</span>
                      <span className="text-orange-400 font-bold">Vyčerpá tah</span>
                    </div>
                    <div className="mobile-move-grid">
                      {workOptions.map((opt) => {
                        const wType = opt.id.replace('work-', '') as 'city_work' | 'guild_work' | 'fortress_training'
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={!opt.isAvailable}
                            title={opt.unavailableReason}
                            onClick={() => onWorkAction(wType)}
                            className="mobile-move-btn is-work"
                          >
                            <div className="mobile-move-btn-header">
                              <span className="text-base">{opt.icon}</span>
                              <span className="mobile-move-btn-cost text-orange-400">Práce</span>
                            </div>
                            <span className="mobile-move-btn-title">{opt.label}</span>
                            <span className="mobile-move-btn-detail">{opt.detail}</span>
                            {!opt.isAvailable && (
                              <span className="text-[9px] text-red-400 font-semibold">{opt.unavailableReason}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Vstup do Astrální sféry místo pohybu */}
                {sphereOptions.length > 0 && (
                  <div className="mobile-move-group">
                    <div className="mobile-move-group-title">
                      <span>🌌 Vstup do Astrální sféry</span>
                    </div>
                    <div className="mobile-move-grid">
                      {sphereOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={!opt.isAvailable}
                          title={opt.unavailableReason}
                          onClick={() => onEnterSphere(opt.sphereId!)}
                          className="mobile-move-btn is-gate"
                        >
                          <div className="mobile-move-btn-header">
                            <span className="text-base">{opt.icon}</span>
                            <span className="mobile-move-btn-cost text-purple-400">Výzva</span>
                          </div>
                          <span className="mobile-move-btn-title">{opt.label}</span>
                          <span className="mobile-move-btn-detail">{opt.detail}</span>
                          {!opt.isAvailable && (
                            <span className="text-[9px] text-red-400 font-semibold">{opt.unavailableReason}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : hasCompletedTileAction ? (
              <div className="mobile-completed-box animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <span className="text-3xl shrink-0">✅</span>
                  <div>
                    <strong className="text-emerald-300 font-serif text-base">Akce na poli dokončena!</strong>
                    <p className="text-xs text-stone-300 mt-0.5">
                      Všechny možnosti pro tento tah byly vyčerpány. Předávám tah soupeři...
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onEndTurn}
                  className="mobile-end-turn is-urgent cursor-pointer"
                >
                  Předat tah hned ⏩
                </button>
              </div>
            ) : (
              <div className="mobile-prompt">
                <strong>Jsi na poli #{currentTile.id}: {currentTile.name}</strong>
                <p>
                  Pohyb dokončen. V tomto tahu smíš provést <strong>právě 1 akci</strong> (karta v divočině, návštěva cechu/tržiště nebo odpočinek).
                </p>
              </div>
            )}
          </section>

          {/* Tile actions */}
          {canActOnTile && (
            <section className="mobile-actions" aria-label="Akce na aktuálním poli">
              <div className="mobile-section-label">
                AKCE NA POLI <span>ZVOL PRÁVĚ 1 AKCI</span>
              </div>
              {shopAvailable && (
                <button type="button" onClick={onOpenShop} className="mobile-action cursor-pointer">
                  <span className="mobile-action-icon">🏪</span>
                  <span>
                    <strong>{currentTile.specialActionTitle || 'Navštívit místo'}</strong>
                    <small>Výbava a trénink (Máš k dispozici: {activePlayer.gold} 🪙 zl, {activePlayer.experience} ⭐ exp)</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              )}
              {currentTile.hasAstralGate && (
                <button type="button" onClick={() => onEnterSphere(currentTile.hasAstralGate!)} className="mobile-action cursor-pointer">
                  <span className="mobile-action-icon">🌀</span>
                  <span>
                    <strong>Vstoupit do astrální sféry</strong>
                    <small>Vyzvat strážce a získat artefakt</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              )}
              <button type="button" onClick={onDrawCard} className="mobile-action cursor-pointer">
                <span className="mobile-action-icon">{lyingHere ? '👹' : '🎴'}</span>
                <span>
                  <strong>{lyingHere ? `Postavit se: ${lyingHere.name}` : 'Tahat kartu dobrodružství (1× za tah)'}</strong>
                  <small>{lyingHere ? 'Neporažený netvor leží na tomto poli' : 'Událost, poklad nebo souboj s netvorem v divočině'}</small>
                </span>
                <ChevronRight size={18} />
              </button>
              <button type="button" onClick={onRest} className="mobile-action cursor-pointer">
                <span className="mobile-action-icon">🌿</span>
                <span>
                  <strong>Odpočinout si</strong>
                  <small>Obnovit 1 Sílu nebo 1 Vůli</small>
                </span>
                <ChevronRight size={18} />
              </button>
              <button type="button" onClick={onEndTurn} className="mobile-end-turn cursor-pointer">
                Přeskočit akce a předat hru <ChevronRight size={18} />
              </button>
            </section>
          )}

          {/* Grand Prophecy Quest Tracker Banner */}
          <section className="mobile-quest-banner" aria-label="Cíl hry: 4 z 5 astrálních artefaktů">
            <div className="mobile-quest-header">
              <div className="flex items-center gap-1.5 font-bold text-purple-200 text-xs">
                <span>👑</span>
                <span>4 ARTEFAKTY = VÍTĚZSTVÍ</span>
              </div>
            </div>
            <div className="mobile-quest-spheres">
              {ASTRAL_SPHERES.map((sphere) => {
                const owner = game.players.find((p) => p.artifacts.some((a) => a.id === sphere.artifact.id))
                const isClaimedByMe = hudPlayer.artifacts.some((a) => a.id === sphere.artifact.id)
                const ownerIndex = owner ? game.players.indexOf(owner) : -1
                const sphereEmoji = sphere.id === 'fire' ? '🔥' : sphere.id === 'ice' ? '❄️' : sphere.id === 'shadow' ? '🌑' : sphere.id === 'storm' ? '⚡' : '🔮'
                return (
                  <div
                    key={sphere.id}
                    className={`mobile-sphere-slot ${isClaimedByMe ? 'is-mine' : owner ? 'is-taken' : 'is-open'}`}
                    title={`${sphere.name} (Brána #${sphere.gateTileId}): ${sphere.artifact.name} ${owner ? `[Drží: ${owner.name}]` : '[Volné v astrální sféře]'}`}
                  >
                    <span className="text-sm">{sphereEmoji}</span>
                    <span className="text-[9.5px] font-bold text-stone-200">
                      {owner ? (isOnline ? (ownerIndex === ownPlayerIndex ? 'Ty' : 'Soupeř') : `Hráč ${ownerIndex + 1}`) : 'Volná'}
                    </span>
                  </div>
                )
              })}
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
                {lyingHere?.monster && (
                  <div className="mobile-scene-monster">
                    👹 Číhá tu neporažený <strong>{lyingHere.name}</strong> · Síla {lyingHere.monster.strength} · Vůle {lyingHere.monster.will}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Board route */}
          <section className="mobile-route" aria-label="Herní plán">
            <div className="mobile-section-label">CESTA KRÁLOVSTVÍ <span>POSUŇ DO STRANY →</span></div>
            <div className="mobile-track" ref={trackRef}>
              {BOARD_TILES.map((tile) => {
                const isHere = game.players.some((player) => player.currentTileId === tile.id)
                const isReachable = !hasMoved && isMyTurn && validMoves.includes(tile.id)
                return (
                  <button
                    type="button"
                    data-tile-id={tile.id}
                    key={tile.id}
                    onClick={() => {
                      onSelectTile(tile)
                      if (isReachable) {
                        const matching = moveOptions.filter((o) => o.targetTileId === tile.id && o.isAvailable)
                        if (matching.length > 0) {
                          const chosen = matching.find((m) => m.type === 'walk' || m.type === 'stay') || matching[0]
                          if (chosen.type !== 'work' && chosen.type !== 'enter_sphere') {
                            onExecuteMove(chosen.targetTileId, chosen.costGold, chosen.type)
                          }
                        }
                      }
                    }}
                    className={`mobile-tile cursor-pointer ${tileMonsters[tile.id] ? 'has-monster' : ''} ${
                      tile.id === activePlayer.currentTileId ? 'is-current' : ''
                    } ${tile.id === selectedTile.id ? 'is-selected' : ''} ${
                      isReachable ? 'is-move' : ''
                    }`}
                    aria-label={`Pole ${tile.id}: ${tile.name}`}
                  >
                    <span className="mobile-tile-number">{String(tile.id).padStart(2, '0')}</span>
                    <span className="mobile-tile-icon" aria-hidden="true">{terrainIcon[tile.terrain]}</span>
                    <strong>{tile.name}</strong>
                    {tile.hasPort && <span className="text-[10px]" title="Přístav">⛵</span>}
                    {tile.hasMagicGate && <span className="text-[10px]" title="Magická brána">🌀</span>}
                    {tileMonsters[tile.id] && (
                      <span className="mobile-tile-monster" title={`Neporažený netvor: ${tileMonsters[tile.id].name}`}>
                        👹 {tileMonsters[tile.id].name}
                      </span>
                    )}
                    {isReachable && <span className="mobile-tile-go">ZVOLIT ›</span>}
                    {isHere && (
                      <span className="mobile-tile-pawns">
                        {game.players
                          .filter((player) => player.currentTileId === tile.id)
                          .map((player) => player.heroClass.avatar)
                          .join(' ')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {selectedTile.id !== currentTile.id && <div className="mobile-tile-detail"><strong>{selectedTile.name}</strong><p>{selectedTile.description}</p>{lyingSelected?.monster && <p className="mobile-tile-detail-monster">👹 Číhá tu neporažený {lyingSelected.name} (Síla {lyingSelected.monster.strength}, Vůle {lyingSelected.monster.will}). Kdo sem vstoupí, musí s ním bojovat.</p>}</div>}
          </section>

          {/* HERO HUD & INVENTORY SECTION (Always accessible on map!) */}
          <section className="mobile-hero-hud" aria-label={isOnline ? 'Moje výbava a inventář' : 'Výbava a inventář hráče na tahu'}>
            <div className="mobile-hud-header">
              <div className="flex items-center gap-2">
                <span className="text-base">🎒</span>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-serif">
                  {isOnline ? 'Moje výbava' : 'Výbava hráče na tahu'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingPlayerId(hudPlayer.id)}
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
                    (Síla {hudPlayer.currentStrength} + {physAttack.equipmentBonus})
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
                    (Vůle {hudPlayer.currentWill} + {mentalAttack.equipmentBonus})
                  </span>
                </span>
              </div>
            </div>

            {/* Artifacts badges if any */}
            {hudPlayer.artifacts.length > 0 && (
              <div className="mb-2.5 p-2 rounded-xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-between text-xs">
                <span className="font-bold text-purple-300 flex items-center gap-1">
                  <Sparkles size={14} /> Získané Artefakty ({hudPlayer.artifacts.length}/4):
                </span>
                <div className="flex gap-1.5">
                  {hudPlayer.artifacts.map((art) => (
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
            {hudPlayer.inventory.length === 0 ? (
              <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800/80 text-center text-xs text-stone-400">
                <span>Inventář je prázdný. Zbraně, zbroj a lektvary získáš nákupem ve městě či v provinciích.</span>
              </div>
            ) : (
              <div className="mobile-inventory-list">
                {hudPlayer.inventory.map((item, idx) => (
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
                    {item.type === 'potion' && isMyTurn && hudPlayer.id === activePlayer.id && (
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
          onClick={() => setInspectingPlayerId(null)}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <PlayerSheet
              player={inspectingPlayer}
              isActive={inspectingPlayer.id === activePlayer.id}
              onUseItem={inspectingPlayer.id === activePlayer.id && isMyTurn ? onUseItem : undefined}
              onClose={() => setInspectingPlayerId(null)}
            />
          </div>
        </div>
      )}

      <nav className="mobile-nav" aria-label="Navigace hry">
        <button type="button" onClick={() => setTab('map')} className={tab === 'map' ? 'is-active cursor-pointer' : 'cursor-pointer'} aria-current={tab === 'map' ? 'page' : undefined}><Compass size={21} /> Plán</button>
        <button type="button" onClick={() => setTab('players')} className={tab === 'players' ? 'is-active cursor-pointer' : 'cursor-pointer'} aria-current={tab === 'players' ? 'page' : undefined}><BookOpen size={21} /> Hrdinové</button>
        <button type="button" onClick={() => setTab('log')} className={tab === 'log' ? 'is-active cursor-pointer' : 'cursor-pointer'} aria-current={tab === 'log' ? 'page' : undefined}><ScrollText size={21} /> Záznam</button>
      </nav>

      {/* Intro / Quick Rules Guide Modal */}
      <IntroGuideModal
        isOpen={showIntro}
        onClose={() => {
          localStorage.setItem('proroctvi_intro_seen', 'true')
          setShowIntro(false)
        }}
      />
    </div>
  )
}
