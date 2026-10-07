import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronRight, Compass, ScrollText, Swords, Users } from 'lucide-react'
import { BOARD_TILES } from '../data/board'
import type { BoardTile, GameState, Item, SphereElement } from '../engine/types'
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
  const trackRef = useRef<HTMLDivElement>(null)
  const activePlayer = game.players[game.activePlayerIndex]
  const currentTile = BOARD_TILES[activePlayer.currentTileId]
  const canActOnTile = isMyTurn && game.phase === 'TILE_ACTION'
  const shopAvailable = ['city', 'training', 'temple', 'camp', 'castle'].includes(currentTile.terrain)
  const ownPlayerIndex = isOnline && mySeat === 'p2' ? 1 : 0

  useEffect(() => {
    if (tab !== 'map') return
    const tile = trackRef.current?.querySelector<HTMLElement>(`[data-tile-id="${activePlayer.currentTileId}"]`)
    tile?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activePlayer.currentTileId, tab])

  return (
    <div className="mobile-game lg:hidden">
      <header className="mobile-header">
        <div>
          <div className="mobile-brand">✦ PROROCTVÍ</div>
          <div className="mobile-header-meta">Kolo {game.turnNumber} · {isOnline ? `Místnost ${roomCode}` : 'Hra na jednom zařízení'}</div>
        </div>
        <button type="button" className="mobile-header-button" onClick={onLobby}>Lobby</button>
      </header>

      <div className="mobile-scoreboard" aria-label="Stav hráčů">
        {game.players.map((player, index) => (
          <div key={player.id} className={`mobile-player ${index === game.activePlayerIndex ? 'is-active' : ''}`}>
            <div className="mobile-player-portrait">
              {player.heroClass.image
                ? <img src={player.heroClass.image} alt="" />
                : <span>{player.heroClass.avatar}</span>}
            </div>
            <div className="mobile-player-info">
              <span className="mobile-player-label">{isOnline ? (index === ownPlayerIndex ? 'TY' : 'SOUPEŘ') : `HRÁČ ${index + 1}`}{index === game.activePlayerIndex ? ' · NA TAHU' : ''}</span>
              <strong>{player.name}</strong>
              <span className="mobile-player-stats">♥ {player.currentStrength}/{player.maxStrength} · ✦ {player.currentWill}/{player.maxWill} · ◈ {player.artifacts.length}/4</span>
            </div>
          </div>
        ))}
      </div>

      {tab === 'map' ? (
        <main className="mobile-main">
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

          <section className="mobile-turn" aria-live="polite">
            <div className="mobile-section-label">{isMyTurn ? 'TVŮJ TAH' : 'TAH SOUPEŘE'} <span>{!hasRolledForMove ? '1 / 2 · POHYB' : '2 / 2 · AKCE'}</span></div>
            {!isMyTurn ? (
              <div className="mobile-wait"><Swords size={22} /><div><strong>Hraje {activePlayer.name}</strong><p>Jeho tah uvidíš tady živě. Mezitím si můžeš prohlédnout plán a hrdiny.</p></div></div>
            ) : !hasRolledForMove ? (
              <div className="mobile-dice"><div><strong>Vydej se na cestu</strong><p>Zvol směr. Po hodu tě hra automaticky přesune o součet obou kostek.</p></div><div className="mobile-direction" role="group" aria-label="Směr pohybu"><button type="button" className={direction === 'cw' ? 'is-active' : ''} onClick={() => setDirection('cw')}>↻ Po směru</button><button type="button" className={direction === 'ccw' ? 'is-active' : ''} onClick={() => setDirection('ccw')}>↺ Proti směru</button></div><DiceRoller onRollComplete={(dice) => onRollDice(dice, direction)} label="Hodit a jít" /></div>
            ) : (
              <div className="mobile-prompt"><strong>Co podnikneš v {currentTile.name}?</strong><p>Hod {lastDiceRoll?.[0]} + {lastDiceRoll?.[1]} = {(lastDiceRoll?.[0] || 0) + (lastDiceRoll?.[1] || 0)}. Vyber akci, nebo předej tah.</p>{!hasCompletedTileAction && <button type="button" className="mobile-switch" onClick={onSwitchDirection}>↩ Raději jít na pole {alternateTile.id}: {alternateTile.name}</button>}</div>
            )}
          </section>

          <section className="mobile-route" aria-label="Herní plán">
            <div className="mobile-section-label">CESTA KRÁLOVSTVÍ <span>POSUŇ DO STRANY →</span></div>
            <div className="mobile-track" ref={trackRef}>
              {BOARD_TILES.map((tile) => {
                const isHere = game.players.some((player) => player.currentTileId === tile.id)
                return <button type="button" data-tile-id={tile.id} key={tile.id} onClick={() => onSelectTile(tile)} className={`mobile-tile ${tile.id === activePlayer.currentTileId ? 'is-current' : ''} ${tile.id === selectedTile.id ? 'is-selected' : ''}`} aria-label={`Pole ${tile.id}: ${tile.name}`}>
                  <span className="mobile-tile-number">{String(tile.id).padStart(2, '0')}</span>
                  <span className="mobile-tile-icon" aria-hidden="true">{terrainIcon[tile.terrain]}</span>
                  <strong>{tile.name}</strong>
                  {isHere && <span className="mobile-tile-pawns">{game.players.filter((player) => player.currentTileId === tile.id).map((player) => player.heroClass.avatar).join(' ')}</span>}
                </button>
              })}
            </div>
            {selectedTile.id !== currentTile.id && <div className="mobile-tile-detail"><strong>{selectedTile.name}</strong><p>{selectedTile.description}</p></div>}
          </section>

          {canActOnTile && <section className="mobile-actions" aria-label="Akce na aktuálním poli">
            <div className="mobile-section-label">AKCE NA POLI</div>
            {shopAvailable && <button type="button" onClick={onOpenShop} className="mobile-action"><span className="mobile-action-icon">🏪</span><span><strong>{currentTile.specialActionTitle || 'Navštívit místo'}</strong><small>Výbava, trénink a léčení</small></span><ChevronRight size={18} /></button>}
            {currentTile.hasAstralGate && <button type="button" onClick={() => onEnterSphere(currentTile.hasAstralGate!)} className="mobile-action"><span className="mobile-action-icon">🌀</span><span><strong>Vstoupit do astrální sféry</strong><small>Vyzvat strážce a získat artefakt</small></span><ChevronRight size={18} /></button>}
            <button type="button" onClick={onDrawCard} className="mobile-action"><span className="mobile-action-icon">🎴</span><span><strong>Tahat kartu dobrodružství</strong><small>Událost, poklad nebo souboj</small></span><ChevronRight size={18} /></button>
            <button type="button" onClick={onRest} className="mobile-action"><span className="mobile-action-icon">🌿</span><span><strong>Odpočinout si</strong><small>Obnovit 1 Sílu nebo 1 Vůli</small></span><ChevronRight size={18} /></button>
            <button type="button" onClick={onEndTurn} className="mobile-end-turn">Ukončit tah a předat hru <ChevronRight size={18} /></button>
          </section>}
        </main>
      ) : tab === 'players' ? (
        <main className="mobile-secondary"><h1><Users size={20} /> Hrdinové</h1>{game.players.map((player, index) => <PlayerSheet key={player.id} player={player} isActive={index === game.activePlayerIndex} onUseItem={index === game.activePlayerIndex && isMyTurn ? onUseItem : undefined} />)}</main>
      ) : (
        <main className="mobile-secondary"><h1><ScrollText size={20} /> Záznam hry</h1><div className="mobile-log">{game.gameLog.map((entry, index) => <p key={`${index}-${entry}`}>{entry}</p>)}</div></main>
      )}

      <nav className="mobile-nav" aria-label="Navigace hry">
        <button type="button" onClick={() => setTab('map')} className={tab === 'map' ? 'is-active' : ''} aria-current={tab === 'map' ? 'page' : undefined}><Compass size={21} /> Plán</button>
        <button type="button" onClick={() => setTab('players')} className={tab === 'players' ? 'is-active' : ''} aria-current={tab === 'players' ? 'page' : undefined}><BookOpen size={21} /> Hrdinové</button>
        <button type="button" onClick={() => setTab('log')} className={tab === 'log' ? 'is-active' : ''} aria-current={tab === 'log' ? 'page' : undefined}><ScrollText size={21} /> Záznam</button>
      </nav>
    </div>
  )
}
