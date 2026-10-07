import confetti from 'canvas-confetti'
import React, { useState } from 'react'
import { Board } from './components/Board'
import { CardModal } from './components/CardModal'
import { CombatModal } from './components/CombatModal'
import { DiceRoller } from './components/DiceRoller'
import { PlayerSheet } from './components/PlayerSheet'
import { ShopModal } from './components/ShopModal'
import { BOARD_TILES } from './data/board'
import { HERO_CLASSES } from './data/characters'
import { ASTRAL_SPHERES } from './data/spheres'
import {
  createInitialGame,
  drawCardForTerrain,
  getPossibleMoves,
  startCombatWithMonster,
} from './engine/gameEngine'
import {
  AdventureCard,
  BoardTile,
  CombatState,
  GameState,
  Item,
  Skill,
  SphereElement,
} from './engine/types'

export const App: React.FC = () => {
  const [game, setGame] = useState<GameState>(() => createInitialGame())
  const [selectedTile, setSelectedTile] = useState<BoardTile>(BOARD_TILES[0])
  const [validMoves, setValidMoves] = useState<number[]>([])
  const [showShop, setShowShop] = useState(false)
  const [drawnCard, setDrawnCard] = useState<AdventureCard | null>(null)
  const [activeCombat, setActiveCombat] = useState<CombatState | null>(null)
  const [hasRolledForMove, setHasRolledForMove] = useState(false)
  const [claimedSpheres, setClaimedSpheres] = useState<Record<SphereElement, string | null>>({
    fire: null,
    ice: null,
    shadow: null,
    storm: null,
    magic: null,
  })

  const activePlayer = game.players[game.activePlayerIndex]
  const currentTile = BOARD_TILES[activePlayer.currentTileId]

  // Dice roll for movement
  const handleMoveDiceRoll = (dice: [number, number]) => {
    const totalSteps = dice[0] + dice[1]
    const moves = getPossibleMoves(activePlayer.currentTileId, totalSteps)
    setValidMoves(moves)
    setHasRolledForMove(true)

    setGame((prev) => ({
      ...prev,
      diceValues: dice,
      phase: 'MOVEMENT',
      gameLog: [
        `${activePlayer.name} hodil ${dice[0]} + ${dice[1]} = ${totalSteps}. Vyber cílové pole na plánu.`,
        ...prev.gameLog.slice(0, 15),
      ],
    }))
  }

  // Player clicked a valid tile to move
  const handleTileClick = (targetTileId: number) => {
    if (!validMoves.includes(targetTileId)) return

    const targetTile = BOARD_TILES.find((t) => t.id === targetTileId) || BOARD_TILES[0]

    setGame((prev) => {
      const updatedPlayers = [...prev.players]
      updatedPlayers[prev.activePlayerIndex] = {
        ...updatedPlayers[prev.activePlayerIndex],
        currentTileId: targetTileId,
      }
      return {
        ...prev,
        players: updatedPlayers,
        phase: 'TILE_ACTION',
        gameLog: [
          `${activePlayer.name} se přesunul na pole #${targetTileId} (${targetTile.name}).`,
          ...prev.gameLog.slice(0, 15),
        ],
      }
    })

    setValidMoves([])
    setSelectedTile(targetTile)
  }

  // Draw adventure card for terrain
  const handleDrawCard = () => {
    const terrain = currentTile.terrain
    // If city or special, use forest or default
    const cardTerrain =
      terrain === 'forest' || terrain === 'mountain' || terrain === 'plains' || terrain === 'water'
        ? terrain
        : 'forest'

    const card = drawCardForTerrain(cardTerrain)
    setDrawnCard(card)
  }

  // Combat engagement
  const handleEngageCombat = () => {
    if (!drawnCard || !drawnCard.monster) return
    const combat = startCombatWithMonster(drawnCard.monster)
    setActiveCombat(combat)
    setDrawnCard(null)
  }

  // Enter Astral Sphere
  const handleEnterSphere = (sphereId: SphereElement) => {
    const sphere = ASTRAL_SPHERES.find((s) => s.id === sphereId)
    if (!sphere) return

    if (claimedSpheres[sphereId]) {
      alert(`Tento artefakt již získal ${claimedSpheres[sphereId]}!`)
      return
    }

    const combat = startCombatWithMonster(sphere.guardian, true)
    setActiveCombat(combat)
  }

  // Resolve combat end
  const handleCombatEnd = (playerWon: boolean) => {
    if (!activeCombat) return

    setGame((prev) => {
      const updatedPlayers = [...prev.players]
      const currentPlayer = { ...updatedPlayers[prev.activePlayerIndex] }

      if (playerWon) {
        currentPlayer.gold += activeCombat.enemy.rewardGold
        currentPlayer.experience += activeCombat.enemy.rewardExp

        // If sphere guardian was defeated, claim artifact!
        if (activeCombat.isSphereGuardian) {
          const sphere = ASTRAL_SPHERES.find((s) => s.guardian.id === activeCombat.enemy.id)
          if (sphere && !currentPlayer.artifacts.some((a) => a.id === sphere.artifact.id)) {
            currentPlayer.artifacts.push(sphere.artifact)
            setClaimedSpheres((c) => ({ ...c, [sphere.id]: currentPlayer.name }))
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
          }
        }
      } else {
        // Player defeated: respawn at start city with recovered health
        currentPlayer.currentStrength = currentPlayer.maxStrength
        currentPlayer.currentWill = currentPlayer.maxWill
        currentPlayer.currentTileId = currentPlayer.heroClass.startTileId
      }

      updatedPlayers[prev.activePlayerIndex] = currentPlayer

      // Check win condition (4 artifacts)
      let winner = prev.winner
      if (currentPlayer.artifacts.length >= 4) {
        winner = currentPlayer
        confetti({ particleCount: 200, spread: 100 })
      }

      return {
        ...prev,
        players: updatedPlayers,
        winner,
        gameLog: [
          playerWon
            ? `${currentPlayer.name} porazil ${activeCombat.enemy.name}! (+${activeCombat.enemy.rewardGold} zl., +${activeCombat.enemy.rewardExp} exp)`
            : `${currentPlayer.name} padl v boji a obrodil se ve městě.`,
          ...prev.gameLog.slice(0, 15),
        ],
      }
    })

    setActiveCombat(null)
  }

  // Claim treasure card
  const handleClaimTreasure = () => {
    if (!drawnCard) return

    setGame((prev) => {
      const updatedPlayers = [...prev.players]
      const currentPlayer = { ...updatedPlayers[prev.activePlayerIndex] }

      if (drawnCard.rewardGold) currentPlayer.gold += drawnCard.rewardGold
      if (drawnCard.rewardExp) currentPlayer.experience += drawnCard.rewardExp

      updatedPlayers[prev.activePlayerIndex] = currentPlayer
      return {
        ...prev,
        players: updatedPlayers,
        gameLog: [
          `${currentPlayer.name} získal poklad: +${drawnCard.rewardGold || 0} zlaťáků, +${
            drawnCard.rewardExp || 0
          } exp.`,
          ...prev.gameLog.slice(0, 15),
        ],
      }
    })

    setDrawnCard(null)
  }

  // Item & Training Shop actions
  const handleBuyItem = (item: Item) => {
    setGame((prev) => {
      const updatedPlayers = [...prev.players]
      const currentPlayer = { ...updatedPlayers[prev.activePlayerIndex] }
      if (currentPlayer.gold >= item.price) {
        currentPlayer.gold -= item.price
        currentPlayer.inventory.push(item)
      }
      updatedPlayers[prev.activePlayerIndex] = currentPlayer
      return { ...prev, players: updatedPlayers }
    })
  }

  const handleLearnSkill = (skill: Skill) => {
    setGame((prev) => {
      const updatedPlayers = [...prev.players]
      const currentPlayer = { ...updatedPlayers[prev.activePlayerIndex] }
      if (currentPlayer.experience >= skill.costExp) {
        currentPlayer.experience -= skill.costExp
        currentPlayer.skills.push(skill)
      }
      updatedPlayers[prev.activePlayerIndex] = currentPlayer
      return { ...prev, players: updatedPlayers }
    })
  }

  const handleTrainStat = (stat: 'strength' | 'will') => {
    setGame((prev) => {
      const updatedPlayers = [...prev.players]
      const currentPlayer = { ...updatedPlayers[prev.activePlayerIndex] }
      if (currentPlayer.experience >= 4) {
        currentPlayer.experience -= 4
        if (stat === 'strength') {
          currentPlayer.maxStrength += 1
          currentPlayer.currentStrength += 1
        } else {
          currentPlayer.maxWill += 1
          currentPlayer.currentWill += 1
        }
      }
      updatedPlayers[prev.activePlayerIndex] = currentPlayer
      return { ...prev, players: updatedPlayers }
    })
  }

  const handleHeal = () => {
    setGame((prev) => {
      const updatedPlayers = [...prev.players]
      const currentPlayer = { ...updatedPlayers[prev.activePlayerIndex] }
      if (currentPlayer.gold >= 2) {
        currentPlayer.gold -= 2
        currentPlayer.currentStrength = currentPlayer.maxStrength
        currentPlayer.currentWill = currentPlayer.maxWill
      }
      updatedPlayers[prev.activePlayerIndex] = currentPlayer
      return { ...prev, players: updatedPlayers }
    })
  }

  const handleUseItem = (item: Item) => {
    setGame((prev) => {
      const updatedPlayers = [...prev.players]
      const currentPlayer = { ...updatedPlayers[prev.activePlayerIndex] }
      if (item.effect === 'heal_3_str') {
        currentPlayer.currentStrength = Math.min(
          currentPlayer.maxStrength,
          currentPlayer.currentStrength + 3
        )
      } else if (item.effect === 'heal_3_will') {
        currentPlayer.currentWill = Math.min(
          currentPlayer.maxWill,
          currentPlayer.currentWill + 3
        )
      }
      // Remove used potion
      currentPlayer.inventory = currentPlayer.inventory.filter((i) => i.id !== item.id)
      updatedPlayers[prev.activePlayerIndex] = currentPlayer
      return { ...prev, players: updatedPlayers }
    })
  }

  // End turn
  const handleEndTurn = () => {
    setHasRolledForMove(false)
    setValidMoves([])
    setDrawnCard(null)

    setGame((prev) => {
      const nextPlayerIndex = (prev.activePlayerIndex + 1) % prev.players.length
      const nextTurnNumber =
        nextPlayerIndex === 0 ? prev.turnNumber + 1 : prev.turnNumber
      return {
        ...prev,
        activePlayerIndex: nextPlayerIndex,
        turnNumber: nextTurnNumber,
        phase: 'START',
        gameLog: [
          `Tah ukončen. Nyní hraje ${prev.players[nextPlayerIndex].name}.`,
          ...prev.gameLog.slice(0, 15),
        ],
      }
    })
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950 pb-8">
      {/* Top Header Navbar */}
      <header className="w-full bg-stone-900/90 border-b border-stone-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔮</span>
          <div>
            <h1 className="text-xl font-black text-amber-400 font-serif tracking-wider uppercase m-0 leading-tight">
              Proroctví
            </h1>
            <p className="text-[11px] text-stone-400 m-0">
              Desková hra • Kolo {game.turnNumber} • Vercel Edition
            </p>
          </div>
        </div>

        {/* Turn indicator & Quick action buttons */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
            <span className="text-xs text-stone-400">Hraje:</span>
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <span>{activePlayer.heroClass.avatar}</span>
              <span>{activePlayer.name}</span>
            </span>
          </div>

          <button
            onClick={handleEndTurn}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase rounded-xl border border-stone-700 cursor-pointer transition-all"
          >
            Ukončit tah ➔
          </button>
        </div>
      </header>

      {/* Main Game Container */}
      <main className="w-full max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left Column: Board & Movement Controls */}
        <div className="flex-1 flex flex-col items-center gap-4">
          <Board
            players={game.players}
            activePlayer={activePlayer}
            validMoves={validMoves}
            onTileClick={handleTileClick}
            onEnterSphereClick={handleEnterSphere}
            selectedTileId={selectedTile.id}
            onSelectTile={setSelectedTile}
          />

          {/* Action Dashboard Under Board */}
          <div className="w-full max-w-4xl bg-stone-900/80 border border-stone-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
            {/* Dice Roller */}
            <DiceRoller
              onRollComplete={handleMoveDiceRoll}
              disabled={hasRolledForMove}
              label={hasRolledForMove ? 'Hod vyhodnocen' : 'Hodit na pohyb'}
            />

            {/* Tile Interaction Buttons */}
            <div className="flex flex-col gap-2">
              <div className="text-xs text-stone-400">
                Stojíš na poli: <span className="font-bold text-stone-100">{currentTile.name}</span> (
                {currentTile.terrain})
              </div>

              <div className="flex items-center gap-2">
                {/* Shop/Training action */}
                {(currentTile.terrain === 'city' ||
                  currentTile.terrain === 'training' ||
                  currentTile.terrain === 'temple' ||
                  currentTile.terrain === 'camp') && (
                  <button
                    onClick={() => setShowShop(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase rounded-xl shadow cursor-pointer transition-all"
                  >
                    🏪 {currentTile.specialActionTitle || 'Otevřít nabídku'}
                  </button>
                )}

                {/* Astral Gate action */}
                {currentTile.hasAstralGate && (
                  <button
                    onClick={() => handleEnterSphere(currentTile.hasAstralGate!)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase rounded-xl shadow animate-pulse cursor-pointer transition-all"
                  >
                    🌀 Vstoupit do Sféry
                  </button>
                )}

                {/* Draw Card button */}
                <button
                  onClick={handleDrawCard}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl shadow cursor-pointer transition-all"
                >
                  🎴 Tahat kartu dobrodružství
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Player Sheets & Game Log */}
        <div className="w-full lg:w-96 flex flex-col gap-4">
          <h2 className="text-sm font-extrabold text-stone-400 uppercase tracking-wider font-mono">
            Hráči v aréně
          </h2>

          {game.players.map((p, idx) => (
            <PlayerSheet
              key={p.id}
              player={p}
              isActive={idx === game.activePlayerIndex}
              onUseItem={handleUseItem}
            />
          ))}

          {/* Game Log */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 flex flex-col gap-2">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
              Záznam hry
            </h3>
            <div className="h-44 overflow-y-auto flex flex-col gap-1 text-[11px] font-mono text-stone-300 pr-1">
              {game.gameLog.map((log, i) => (
                <div key={i} className="border-b border-stone-800/60 pb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {drawnCard && (
        <CardModal
          card={drawnCard}
          onEngageCombat={handleEngageCombat}
          onClaimTreasure={handleClaimTreasure}
          onFlee={() => setDrawnCard(null)}
        />
      )}

      {activeCombat && (
        <CombatModal
          player={activePlayer}
          combat={activeCombat}
          onCombatEnd={handleCombatEnd}
          onUpdatePlayerStats={(str, will) => {
            setGame((prev) => {
              const updatedPlayers = [...prev.players]
              updatedPlayers[prev.activePlayerIndex] = {
                ...updatedPlayers[prev.activePlayerIndex],
                currentStrength: str,
                currentWill: will,
              }
              return { ...prev, players: updatedPlayers }
            })
          }}
        />
      )}

      {showShop && (
        <ShopModal
          player={activePlayer}
          tileTerrain={currentTile.terrain}
          onBuyItem={handleBuyItem}
          onLearnSkill={handleLearnSkill}
          onTrainStat={handleTrainStat}
          onHeal={handleHeal}
          onClose={() => setShowShop(false)}
        />
      )}

      {/* Victory Announcement Banner */}
      {game.winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-stone-900 border-4 border-amber-500 rounded-3xl p-8 max-w-md text-center flex flex-col items-center shadow-2xl">
            <div className="text-6xl mb-4">👑</div>
            <h2 className="text-3xl font-black text-amber-400 font-serif uppercase tracking-wider">
              Proroctví naplněno!
            </h2>
            <p className="text-sm text-stone-200 mt-2">
              Hrdina <span className="font-bold text-amber-400">{game.winner.name}</span> shromáždil
              4 artefakty ze sfér a stal se novým vládcem království!
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black text-sm uppercase rounded-xl shadow-lg cursor-pointer"
            >
              Nová hra
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
