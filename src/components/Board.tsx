import React from 'react'
import { BOARD_TILES } from '../data/board'
import { ASTRAL_SPHERES } from '../data/spheres'
import { BoardTile, Player, SphereElement, TerrainType } from '../engine/types'

interface BoardProps {
  players: Player[]
  activePlayer: Player
  validMoves: number[]
  onTileClick: (tileId: number) => void
  onEnterSphereClick?: (sphereId: SphereElement) => void
  selectedTileId: number | null
  onSelectTile: (tile: BoardTile) => void
}

const getTerrainStyle = (terrain: TerrainType) => {
  switch (terrain) {
    case 'forest':
      return { bg: 'bg-emerald-950/80', border: 'border-emerald-600', text: 'text-emerald-400', icon: '🌲' }
    case 'mountain':
      return { bg: 'bg-stone-800/80', border: 'border-stone-500', text: 'text-stone-300', icon: '⛰️' }
    case 'plains':
      return { bg: 'bg-amber-950/70', border: 'border-amber-600', text: 'text-amber-400', icon: '🌾' }
    case 'water':
      return { bg: 'bg-cyan-950/80', border: 'border-cyan-600', text: 'text-cyan-400', icon: '🌊' }
    case 'city':
      return { bg: 'bg-indigo-950/80', border: 'border-indigo-400', text: 'text-indigo-300', icon: '🏰' }
    case 'castle':
      return { bg: 'bg-rose-950/80', border: 'border-rose-600', text: 'text-rose-300', icon: '🛡️' }
    case 'temple':
      return { bg: 'bg-yellow-950/80', border: 'border-yellow-400', text: 'text-yellow-300', icon: '☀️' }
    case 'training':
      return { bg: 'bg-orange-950/80', border: 'border-orange-500', text: 'text-orange-300', icon: '⚔️' }
    case 'camp':
      return { bg: 'bg-lime-950/80', border: 'border-lime-600', text: 'text-lime-300', icon: '🏕️' }
    case 'astral_gate':
      return { bg: 'bg-purple-950/90', border: 'border-purple-400', text: 'text-purple-300', icon: '🌀' }
    default:
      return { bg: 'bg-stone-900', border: 'border-stone-700', text: 'text-stone-300', icon: '📍' }
  }
}

export const Board: React.FC<BoardProps> = ({
  players,
  activePlayer,
  validMoves,
  onTileClick,
  onEnterSphereClick,
  selectedTileId,
  onSelectTile,
}) => {
  // 20 tiles arranged around a 6x6 ring:
  // 6 tiles top (0..5), 4 tiles right (6..9), 6 tiles bottom (10..15), 4 tiles left (16..19)
  const getTileGridPosition = (id: number) => {
    if (id >= 0 && id <= 5) {
      // Top row: 0 to 5 (left to right)
      return { col: id + 1, row: 1 }
    } else if (id >= 6 && id <= 9) {
      // Right col: 6 to 9 (top to bottom)
      return { col: 6, row: id - 6 + 2 }
    } else if (id >= 10 && id <= 15) {
      // Bottom row: 10 to 15 (right to left)
      return { col: 6 - (id - 10), row: 6 }
    } else {
      // Left col: 16 to 19 (bottom to top)
      return { col: 1, row: 6 - (id - 16 + 1) }
    }
  }

  return (
    <div className="relative w-full max-w-6xl mx-auto p-4 select-none">
      {/* 20-Tile 6x6 Grid Track */}
      <div
        className="grid grid-cols-6 grid-rows-6 gap-2 bg-stone-950/80 p-4 rounded-3xl border-2 border-stone-800 shadow-2xl backdrop-blur-md"
        style={{ minHeight: '580px' }}
      >
        {/* Render 20 Board Tiles */}
        {BOARD_TILES.map((tile) => {
          const pos = getTileGridPosition(tile.id)
          const style = getTerrainStyle(tile.terrain)
          const isValidMove = validMoves.includes(tile.id)
          const isSelected = selectedTileId === tile.id
          const playersOnTile = players.filter((p) => p.currentTileId === tile.id)

          return (
            <button
              key={tile.id}
              onClick={() => {
                onSelectTile(tile)
                if (isValidMove) {
                  onTileClick(tile.id)
                }
              }}
              style={{
                gridColumn: pos.col,
                gridRow: pos.row,
              }}
              className={`relative flex flex-col items-center justify-between p-1.5 rounded-xl border-2 transition-all cursor-pointer text-left overflow-hidden h-22 ${
                style.bg
              } ${style.border} ${
                isValidMove
                  ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-stone-900 scale-105 z-20 animate-pulse bg-amber-900/40'
                  : ''
              } ${isSelected ? 'ring-2 ring-white z-10' : ''} hover:scale-105`}
            >
              {/* Tile Header: ID, Port/Gate icon and Terrain icon */}
              <div className="w-full flex items-center justify-between text-[11px] font-bold">
                <span className="text-stone-400 font-mono">#{tile.id}</span>
                <div className="flex items-center gap-1">
                  {tile.hasPort && <span title="Přístav (cesta lodí za 1 zl)">⛵</span>}
                  {tile.hasMagicGate && <span title="Magická brána (teleport za 2 zl)">🌀</span>}
                  {tile.isGuild && <span title="Cechovní výcvik">🏛️</span>}
                  <span title={tile.terrain}>{style.icon}</span>
                </div>
              </div>

              {/* Tile Name */}
              <div className="w-full text-center text-[10px] font-bold leading-tight line-clamp-2 px-0.5 text-stone-100">
                {tile.name}
              </div>

              {/* Near Sphere or Astral Gate indicator */}
              {(tile.hasAstralGate || tile.nearSphere) && (
                <div
                  className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping"
                  title={`Sféra: ${tile.hasAstralGate || tile.nearSphere}`}
                />
              )}

              {/* Player Pawns on this tile */}
              <div className="w-full flex items-center justify-center gap-1 mt-0.5">
                {playersOnTile.map((p) => (
                  <div
                    key={p.id}
                    title={`${p.name} (${p.heroClass.name})`}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md border-2 ${
                      p.id === activePlayer.id
                        ? 'bg-amber-500 border-white scale-110 z-10 animate-bounce'
                        : 'bg-stone-800 border-stone-400'
                    }`}
                  >
                    {p.heroClass.avatar}
                  </div>
                ))}
              </div>
            </button>
          )
        })}

        {/* Center of the Board: The 5 Astral Spheres & Kingdom Heart */}
        <div
          className="col-start-2 col-end-6 row-start-2 row-end-6 bg-stone-900/80 rounded-2xl border border-stone-800 p-5 flex flex-col justify-between items-center relative overflow-hidden backdrop-blur-sm shadow-inner"
        >
          {/* Background Map Artwork */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-35 pointer-events-none"
            style={{ backgroundImage: `url('art/map.jpg')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/50 to-stone-950/80 pointer-events-none" />

          <div className="text-center z-10">
            <h2 className="text-2xl font-black text-amber-400 tracking-wider uppercase font-serif">
              Království Proroctví
            </h2>
            <p className="text-xs text-stone-400 max-w-md mx-auto mt-1">
              Vydej se do divočiny, trénuj schopnosti, porážej monstra a získej 4 artefakty z 5 astrálních sfér!
            </p>
          </div>

          {/* 5 Astral Spheres Center Display */}
          <div className="grid grid-cols-5 gap-3 w-full z-10 my-auto">
            {ASTRAL_SPHERES.map((sphere) => {
              const gateTile = BOARD_TILES.find((t) => t.id === sphere.gateTileId)
              const isAtGate = activePlayer.currentTileId === sphere.gateTileId

              return (
                <div
                  key={sphere.id}
                  className="flex flex-col items-center p-3 rounded-xl border bg-stone-950/80 shadow-lg text-center transition-all hover:scale-105"
                  style={{ borderColor: sphere.color }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl mb-1 shadow-inner"
                    style={{ backgroundColor: `${sphere.color}25`, color: sphere.color }}
                  >
                    🌀
                  </div>
                  <div className="font-bold text-xs text-stone-100">{sphere.name}</div>
                  <div className="text-[10px] text-stone-400 mt-1 line-clamp-1">
                    {sphere.guardian.name}
                  </div>

                  <div className="mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                    🏆 {sphere.artifact.name}
                  </div>

                  <div className="text-[9px] text-stone-500 mt-1">
                    Brána: Pole #{sphere.gateTileId}
                  </div>

                  {isAtGate && onEnterSphereClick && (
                    <button
                      onClick={() => onEnterSphereClick(sphere.id)}
                      className="mt-2 px-2.5 py-1 text-[11px] font-black uppercase rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg animate-pulse cursor-pointer"
                    >
                      Vstoupit do sféry!
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Turn & Status Ribbon */}
          <div className="w-full flex items-center justify-between px-4 py-2 bg-stone-950/80 rounded-xl border border-stone-800 text-xs text-stone-300 z-10">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-400">Na tahu:</span>
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <span>{activePlayer.heroClass.avatar}</span>
                <span>{activePlayer.name} ({activePlayer.heroClass.name})</span>
              </span>
            </div>
            <div>
              <span className="text-stone-400">Aktuální pole: </span>
              <span className="font-bold text-stone-200">
                #{activePlayer.currentTileId} - {BOARD_TILES[activePlayer.currentTileId]?.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
