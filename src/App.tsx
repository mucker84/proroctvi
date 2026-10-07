import confetti from 'canvas-confetti'
import React, { useEffect, useRef, useState } from 'react'
import { Board } from './components/Board'
import { CardModal } from './components/CardModal'
import { CombatModal } from './components/CombatModal'
import { DiceRoller } from './components/DiceRoller'
import { MultiplayerModal } from './components/MultiplayerModal'
import { PlayerSheet } from './components/PlayerSheet'
import { ShopModal } from './components/ShopModal'
import { BOARD_TILES } from './data/board'
import { ASTRAL_SPHERES } from './data/spheres'
import {
  createInitialGame,
  drawCardForTerrain,
  getPossibleMoves,
  startCombatWithMonster,
} from './engine/gameEngine'
import {
  createOnlineRoom,
  joinOnlineRoom,
  RoomSeat,
  syncOnlineRoom,
  updateOnlineRoomState,
} from './engine/multiplayer'
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

  // Online Multiplayer State
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState(false)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [myToken, setMyToken] = useState<string | null>(null)
  const [mySeat, setMySeat] = useState<'p1' | 'p2' | null>(null)
  const [roomSeats, setRoomSeats] = useState<{ p1: RoomSeat | null; p2: RoomSeat | null } | null>(null)
  const stateVersionRef = useRef(1)

  // Check URL query parameters for ?room=123456
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlRoom = params.get('room')
    if (urlRoom && urlRoom.length === 6) {
      setIsMultiplayerModalOpen(true)
    }
  }, [])

  // Auto-sync poll when playing online
  useEffect(() => {
    if (!roomCode || !myToken) return

    const interval = setInterval(async () => {
      try {
        const res = await syncOnlineRoom(roomCode, myToken)
        if (res.ok) {
          if (res.seats) setRoomSeats(res.seats)
          if (res.state && res.v && res.v > stateVersionRef.current) {
            stateVersionRef.current = res.v
            setGame(res.state)
          }
        }
      } catch (err) {
        console.error('Chyba synchronizace:', err)
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [roomCode, myToken])

  const activePlayer = game.players[game.activePlayerIndex]
  const currentTile = BOARD_TILES[activePlayer.currentTileId]

  // Is it currently this client's turn?
  const isOnline = Boolean(roomCode && mySeat)
  const isMyTurn = !isOnline || (mySeat === 'p1' && game.activePlayerIndex === 0) || (mySeat === 'p2' && game.activePlayerIndex === 1)

  // Broadcast state changes in online room
  const pushStateUpdate = async (nextState: GameState) => {
    setGame(nextState)
    if (roomCode && myToken) {
      try {
        const res = await updateOnlineRoomState(roomCode, myToken, nextState)
        if (res.ok && res.v) {
          stateVersionRef.current = res.v
        }
      } catch (err) {
        console.error('Chyba odeslání stavu:', err)
      }
    }
  }

  // Create room
  const handleCreateRoom = async (name: string, heroClassId: string): Promise<string | null> => {
    const initial = createInitialGame([
      { name, heroClassId },
      { name: 'Hráč 2', heroClassId: 'mage' },
    ])
    const res = await createOnlineRoom(name, heroClassId, initial)
    if (res.ok && res.code && res.token) {
      setRoomCode(res.code)
      setMyToken(res.token)
      setMySeat('p1')
      setRoomSeats(res.seats || null)
      setGame(initial)
      stateVersionRef.current = res.v || 1
      return res.code
    }
    return null
  }

  // Join room
  const handleJoinRoom = async (code: string, name: string, heroClassId: string): Promise<boolean> => {
    const res = await joinOnlineRoom(code, name, heroClassId)
    if (res.ok && res.token) {
      setRoomCode(code)
      setMyToken(res.token)
      setMySeat('p2')
      setRoomSeats(res.seats || null)
      if (res.state) {
        setGame(res.state)
        stateVersionRef.current = res.v || 1
      }
      return true
    }
    return false
  }

  const handleLeaveRoom = () => {
    setRoomCode(null)
    setMyToken(null)
    setMySeat(null)
    setRoomSeats(null)
    setIsMultiplayerModalOpen(false)
  }

  // Dice roll for movement
  const handleMoveDiceRoll = (dice: [number, number]) => {
    if (!isMyTurn) return

    const totalSteps = dice[0] + dice[1]
    const moves = getPossibleMoves(activePlayer.currentTileId, totalSteps)
    setValidMoves(moves)
    setHasRolledForMove(true)

    const nextState: GameState = {
      ...game,
      diceValues: dice,
      phase: 'MOVEMENT',
      gameLog: [
        `${activePlayer.name} hodil ${dice[0]} + ${dice[1]} = ${totalSteps}. Vyber cílové pole na plánu.`,
        ...game.gameLog.slice(0, 15),
      ],
    }
    pushStateUpdate(nextState)
  }

  // Player clicked a valid tile to move
  const handleTileClick = (targetTileId: number) => {
    if (!isMyTurn || !validMoves.includes(targetTileId)) return

    const targetTile = BOARD_TILES.find((t) => t.id === targetTileId) || BOARD_TILES[0]
    const updatedPlayers = [...game.players]
    updatedPlayers[game.activePlayerIndex] = {
      ...updatedPlayers[game.activePlayerIndex],
      currentTileId: targetTileId,
    }

    const nextState: GameState = {
      ...game,
      players: updatedPlayers,
      phase: 'TILE_ACTION',
      gameLog: [
        `${activePlayer.name} se přesunul na pole #${targetTileId} (${targetTile.name}).`,
        ...game.gameLog.slice(0, 15),
      ],
    }

    setValidMoves([])
    setSelectedTile(targetTile)
    pushStateUpdate(nextState)
  }

  // Draw adventure card for terrain
  const handleDrawCard = () => {
    if (!isMyTurn) return

    const terrain = currentTile.terrain
    const cardTerrain =
      terrain === 'forest' || terrain === 'mountain' || terrain === 'plains' || terrain === 'water'
        ? terrain
        : 'forest'

    const card = drawCardForTerrain(cardTerrain)
    setDrawnCard(card)
  }

  // Combat engagement
  const handleEngageCombat = () => {
    if (!drawnCard || !drawnCard.monster || !isMyTurn) return
    const combat = startCombatWithMonster(drawnCard.monster)
    setActiveCombat(combat)
    setDrawnCard(null)
  }

  // Enter Astral Sphere
  const handleEnterSphere = (sphereId: SphereElement) => {
    if (!isMyTurn) return
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

    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }

    if (playerWon) {
      currentPlayer.gold += activeCombat.enemy.rewardGold
      currentPlayer.experience += activeCombat.enemy.rewardExp

      if (activeCombat.isSphereGuardian) {
        const sphere = ASTRAL_SPHERES.find((s) => s.guardian.id === activeCombat.enemy.id)
        if (sphere && !currentPlayer.artifacts.some((a) => a.id === sphere.artifact.id)) {
          currentPlayer.artifacts.push(sphere.artifact)
          setClaimedSpheres((c) => ({ ...c, [sphere.id]: currentPlayer.name }))
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
        }
      }
    } else {
      currentPlayer.currentStrength = currentPlayer.maxStrength
      currentPlayer.currentWill = currentPlayer.maxWill
      currentPlayer.currentTileId = currentPlayer.heroClass.startTileId
    }

    updatedPlayers[game.activePlayerIndex] = currentPlayer

    let winner = game.winner
    if (currentPlayer.artifacts.length >= 4) {
      winner = currentPlayer
      confetti({ particleCount: 200, spread: 100 })
    }

    const nextState: GameState = {
      ...game,
      players: updatedPlayers,
      winner,
      gameLog: [
        playerWon
          ? `${currentPlayer.name} porazil ${activeCombat.enemy.name}! (+${activeCombat.enemy.rewardGold} zl., +${activeCombat.enemy.rewardExp} exp)`
          : `${currentPlayer.name} padl v boji a obrodil se ve městě.`,
        ...game.gameLog.slice(0, 15),
      ],
    }

    setActiveCombat(null)
    pushStateUpdate(nextState)
  }

  // Claim treasure card
  const handleClaimTreasure = () => {
    if (!drawnCard || !isMyTurn) return

    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }

    if (drawnCard.rewardGold) currentPlayer.gold += drawnCard.rewardGold
    if (drawnCard.rewardExp) currentPlayer.experience += drawnCard.rewardExp

    updatedPlayers[game.activePlayerIndex] = currentPlayer
    const nextState: GameState = {
      ...game,
      players: updatedPlayers,
      gameLog: [
        `${currentPlayer.name} získal poklad: +${drawnCard.rewardGold || 0} zlaťáků, +${
          drawnCard.rewardExp || 0
        } exp.`,
        ...game.gameLog.slice(0, 15),
      ],
    }

    setDrawnCard(null)
    pushStateUpdate(nextState)
  }

  // Item & Training Shop actions
  const handleBuyItem = (item: Item) => {
    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }
    if (currentPlayer.gold >= item.price) {
      currentPlayer.gold -= item.price
      currentPlayer.inventory.push(item)
    }
    updatedPlayers[game.activePlayerIndex] = currentPlayer
    pushStateUpdate({ ...game, players: updatedPlayers })
  }

  const handleLearnSkill = (skill: Skill) => {
    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }
    if (currentPlayer.experience >= skill.costExp) {
      currentPlayer.experience -= skill.costExp
      currentPlayer.skills.push(skill)
    }
    updatedPlayers[game.activePlayerIndex] = currentPlayer
    pushStateUpdate({ ...game, players: updatedPlayers })
  }

  const handleTrainStat = (stat: 'strength' | 'will') => {
    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }
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
    updatedPlayers[game.activePlayerIndex] = currentPlayer
    pushStateUpdate({ ...game, players: updatedPlayers })
  }

  const handleHeal = () => {
    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }
    if (currentPlayer.gold >= 2) {
      currentPlayer.gold -= 2
      currentPlayer.currentStrength = currentPlayer.maxStrength
      currentPlayer.currentWill = currentPlayer.maxWill
    }
    updatedPlayers[game.activePlayerIndex] = currentPlayer
    pushStateUpdate({ ...game, players: updatedPlayers })
  }

  const handleUseItem = (item: Item) => {
    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }
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
    currentPlayer.inventory = currentPlayer.inventory.filter((i) => i.id !== item.id)
    updatedPlayers[game.activePlayerIndex] = currentPlayer
    pushStateUpdate({ ...game, players: updatedPlayers })
  }

  // End turn
  const handleEndTurn = () => {
    if (!isMyTurn) return

    setHasRolledForMove(false)
    setValidMoves([])
    setDrawnCard(null)

    const nextPlayerIndex = (game.activePlayerIndex + 1) % game.players.length
    const nextTurnNumber = nextPlayerIndex === 0 ? game.turnNumber + 1 : game.turnNumber

    const nextState: GameState = {
      ...game,
      activePlayerIndex: nextPlayerIndex,
      turnNumber: nextTurnNumber,
      phase: 'START',
      gameLog: [
        `Tah ukončen. Nyní hraje ${game.players[nextPlayerIndex].name}.`,
        ...game.gameLog.slice(0, 15),
      ],
    }

    pushStateUpdate(nextState)
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
              Desková hra • Kolo {game.turnNumber} • {isOnline ? `Místnost: ${roomCode}` : 'Lokální hra'}
            </p>
          </div>
        </div>

        {/* Turn indicator & Quick action buttons */}
        <div className="flex items-center gap-3">
          {/* Online Multiplayer Lobby Button */}
          <button
            onClick={() => setIsMultiplayerModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isOnline
                ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300'
            }`}
          >
            <span>{isOnline ? '🟢' : '🌐'}</span>
            <span>{isOnline ? `Online (${roomCode})` : 'Hrát Online'}</span>
          </button>

          {/* Turn indicator */}
          <div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
            <span className="text-xs text-stone-400">Na tahu:</span>
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <span>{activePlayer.heroClass.avatar}</span>
              <span>{activePlayer.name}</span>
            </span>
            {isOnline && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                  isMyTurn ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'
                }`}
              >
                {isMyTurn ? 'Jsi na tahu' : 'Soupeř'}
              </span>
            )}
          </div>

          <button
            onClick={handleEndTurn}
            disabled={!isMyTurn}
            className={`px-4 py-2 font-bold text-xs uppercase rounded-xl border transition-all ${
              isMyTurn
                ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700 cursor-pointer'
                : 'bg-stone-900 text-stone-600 border-stone-800 cursor-not-allowed'
            }`}
          >
            Ukončit tah ➔
          </button>
        </div>
      </header>

      {/* Online Status Banner when opponent is playing */}
      {isOnline && !isMyTurn && (
        <div className="w-full bg-indigo-950/90 border-b border-indigo-800/80 px-4 py-2 text-center text-xs font-bold text-indigo-200 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span>Právě hraje soupeř ({activePlayer.name}). Počkej, až dokončí svůj tah...</span>
        </div>
      )}

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
              disabled={hasRolledForMove || !isMyTurn}
              label={
                !isMyTurn
                  ? 'Čekám na soupeře'
                  : hasRolledForMove
                  ? 'Hod vyhodnocen'
                  : 'Hodit na pohyb'
              }
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
                    disabled={!isMyTurn}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase rounded-xl shadow cursor-pointer transition-all"
                  >
                    🏪 {currentTile.specialActionTitle || 'Otevřít nabídku'}
                  </button>
                )}

                {/* Astral Gate action */}
                {currentTile.hasAstralGate && (
                  <button
                    onClick={() => handleEnterSphere(currentTile.hasAstralGate!)}
                    disabled={!isMyTurn}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase rounded-xl shadow animate-pulse cursor-pointer transition-all"
                  >
                    🌀 Vstoupit do Sféry
                  </button>
                )}

                {/* Draw Card button */}
                <button
                  onClick={handleDrawCard}
                  disabled={!isMyTurn}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-black text-xs uppercase rounded-xl shadow cursor-pointer transition-all"
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
      <MultiplayerModal
        isOpen={isMultiplayerModalOpen}
        onClose={() => setIsMultiplayerModalOpen(false)}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        roomCode={roomCode}
        mySeat={mySeat}
        seats={roomSeats}
        onLeaveRoom={handleLeaveRoom}
      />

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
            const updatedPlayers = [...game.players]
            updatedPlayers[game.activePlayerIndex] = {
              ...updatedPlayers[game.activePlayerIndex],
              currentStrength: str,
              currentWill: will,
            }
            pushStateUpdate({ ...game, players: updatedPlayers })
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
