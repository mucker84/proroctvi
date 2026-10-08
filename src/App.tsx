import confetti from 'canvas-confetti'
import React, { useEffect, useRef, useState } from 'react'
import { CardModal } from './components/CardModal'
import { CombatModal } from './components/CombatModal'
import { LobbyScreen } from './components/LobbyScreen'
import { MobileGameView } from './components/MobileGameView'
import { PvpModal } from './components/PvpModal'
import { GuildModal, MarketModal } from './components/ShopModal'
import { BOARD_TILES } from './data/board'
import { HERO_CLASSES } from './data/characters'
import { ASTRAL_SPHERES } from './data/spheres'
import { decideAIMovement, resolveAICombat, runAIActions } from './engine/ai'
import {
  CombatResult,
  startCombatWithMonster,
  TacticalMovementOption,
} from './engine/gameEngine'
import {
  createOnlineRoom,
  joinOnlineRoom,
  RoomSeat,
  startOnlineRoomGame,
  syncOnlineRoom,
  updateOnlineRoomState,
} from './engine/multiplayer'
import {
  buyGood,
  claimedSpheresOf,
  createGame,
  doWork,
  endTurn,
  executeMove,
  fleeFromMonster,
  getAdventureCard,
  learnFromGuild,
  monstersOnTile,
  pickUpArtifact,
  PvpOutcome,
  resolveGuardianFight,
  resolveMonsterFight,
  resolvePvp,
  sellItem,
  ServiceId,
  drinkPotion,
  takeOpportunity,
  applyService,
} from './engine/rules'
import { BoardTile, CombatState, GameState, SphereElement } from './engine/types'

type CombatSource = { kind: 'monster'; uid: string } | { kind: 'guardian'; sphereId: SphereElement }

export const App: React.FC = () => {
  const [appScreen, setAppScreen] = useState<'LOBBY' | 'GAME'>('LOBBY')
  const [game, setGame] = useState<GameState>(() => createGame([
    { name: 'Hrdina 1', heroClassId: 'warrior' },
    { name: 'Hrdina 2', heroClassId: 'mage' },
  ]))
  const [selectedTile, setSelectedTile] = useState<BoardTile>(BOARD_TILES[0])
  const [showMarket, setShowMarket] = useState(false)
  const [showGuild, setShowGuild] = useState(false)
  const [openCardUid, setOpenCardUid] = useState<string | null>(null)
  const [activeCombat, setActiveCombat] = useState<CombatState | null>(null)
  const [combatSource, setCombatSource] = useState<CombatSource | null>(null)
  const [pvpTarget, setPvpTarget] = useState<number | null>(null)
  const [pvpOutcome, setPvpOutcome] = useState<PvpOutcome | null>(null)
  // Stav rozehraného tahu (jen na zařízení hráče na tahu)
  const [hasMoved, setHasMoved] = useState(false)
  const [turnOver, setTurnOver] = useState(false)
  const [usedServices, setUsedServices] = useState<ServiceId[]>([])
  const [attackedThisTurn, setAttackedThisTurn] = useState(false)

  // Online Multiplayer State
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [myToken, setMyToken] = useState<string | null>(null)
  const [mySeat, setMySeat] = useState<'p1' | 'p2' | null>(null)
  const [roomSeats, setRoomSeats] = useState<{ p1: RoomSeat | null; p2: RoomSeat | null } | null>(null)
  const [urlJoinCode, setUrlJoinCode] = useState<string | null>(null)
  const stateVersionRef = useRef(1)

  // Detect ?room=123456 in URL, or restore session from localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlRoom = params.get('room')
    if (urlRoom && urlRoom.length === 6) {
      setUrlJoinCode(urlRoom)
      return
    }

    // Try restoring saved online session if exists
    const saved = localStorage.getItem('proroctvi_online_session')
    if (saved) {
      try {
        const { roomCode: savedCode, token: savedToken, seat: savedSeat } = JSON.parse(saved)
        if (savedCode && savedToken) {
          syncOnlineRoom(savedCode, savedToken).then((res) => {
            // Partie uložená starší verzí hry nemá karty na polích; tu už nejde dohrát
            if (res.ok && (!res.state || res.state.tileCards)) {
              setRoomCode(savedCode)
              setMyToken(savedToken)
              setMySeat(savedSeat || 'p1')
              if (res.seats) setRoomSeats(res.seats)
              if (res.state) setGame(res.state)
              if (res.started) setAppScreen('GAME')
            } else {
              localStorage.removeItem('proroctvi_online_session')
            }
          })
        }
      } catch {
        localStorage.removeItem('proroctvi_online_session')
      }
    }
  }, [])

  // Auto-sync polling when connected to an online room
  useEffect(() => {
    if (!roomCode || !myToken) return

    const interval = setInterval(async () => {
      try {
        const res = await syncOnlineRoom(roomCode, myToken)
        if (res.ok) {
          if (res.seats) setRoomSeats(res.seats)

          // If Host started the game, transition to GAME screen automatically
          if (res.started && appScreen === 'LOBBY') {
            setAppScreen('GAME')
          }

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
  }, [roomCode, myToken, appScreen])

  const activeIdx = game.activePlayerIndex
  const activePlayer = game.players[activeIdx]
  const currentTile = BOARD_TILES[activePlayer.currentTileId]
  const claimedSpheres = claimedSpheresOf(game)

  const isOnline = Boolean(roomCode && mySeat)
  const isMyTurn =
    (!isOnline && !activePlayer.isAI) ||
    (mySeat === 'p1' && activeIdx === 0) ||
    (mySeat === 'p2' && activeIdx === 1)
  // V závěrečném boji se favorité nepohybují
  const moved = hasMoved || !!game.finalBattle
  const pendingMonsters = isMyTurn && moved && !turnOver && !activeCombat ? monstersOnTile(game, currentTile.id) : []
  const shownCardUid = openCardUid ?? pendingMonsters[0]?.uid ?? null
  const shownCard = shownCardUid ? (game.tileCards[currentTile.id] || []).find((c) => c.uid === shownCardUid) : undefined

  // Broadcast state changes in online room
  const pushStateUpdate = async (nextState: GameState) => {
    setGame(nextState)
    if (nextState.winner && !game.winner) confetti({ particleCount: 200, spread: 100 })
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

  const resetTurnState = () => {
    setHasMoved(false)
    setTurnOver(false)
    setUsedServices([])
    setAttackedThisTurn(false)
    setOpenCardUid(null)
    setShowMarket(false)
    setShowGuild(false)
  }

  // Lobby Handlers
  const startLocalGame = (initial: GameState) => {
    resetTurnState()
    setActiveCombat(null)
    setGame(initial)
    setRoomCode(null)
    setMySeat(null)
    setMyToken(null)
    localStorage.removeItem('proroctvi_online_session')
    setAppScreen('GAME')
  }

  const handleStartHotseat = (p1HeroId: string, p2HeroId: string) => {
    const p1Hero = HERO_CLASSES.find((h) => h.id === p1HeroId) || HERO_CLASSES[0]
    const p2Hero = HERO_CLASSES.find((h) => h.id === p2HeroId) || HERO_CLASSES[1]
    startLocalGame(createGame([
      { name: `Hráč 1 (${p1Hero.name})`, heroClassId: p1HeroId },
      { name: `Hráč 2 (${p2Hero.name})`, heroClassId: p2HeroId },
    ]))
  }

  const handleStartAI = (playerHeroId: string, aiHeroId: string, playerName: string) => {
    const p1Hero = HERO_CLASSES.find((h) => h.id === playerHeroId) || HERO_CLASSES[0]
    const aiHero = HERO_CLASSES.find((h) => h.id === aiHeroId) || HERO_CLASSES[1]
    startLocalGame(createGame([
      { name: playerName || `Hráč (${p1Hero.name})`, heroClassId: playerHeroId, isAI: false },
      { name: `🤖 ${aiHero.name} (AI)`, heroClassId: aiHeroId, isAI: true },
    ]))
  }

  const handleCreateOnlineRoom = async (name: string, heroClassId: string): Promise<string | null> => {
    const initial = createGame([
      { name, heroClassId },
      { name: 'Čeká se na Hráče 2...', heroClassId: 'mage' },
    ])

    const res = await createOnlineRoom(name, heroClassId, initial)
    if (res.ok && res.code && res.token) {
      setRoomCode(res.code)
      setMyToken(res.token)
      setMySeat('p1')
      setRoomSeats(res.seats || null)
      setGame(initial)
      stateVersionRef.current = res.v || 1
      localStorage.setItem(
        'proroctvi_online_session',
        JSON.stringify({ roomCode: res.code, token: res.token, seat: 'p1' })
      )
      return res.code
    }
    return null
  }

  const handleJoinOnlineRoom = async (code: string, name: string, heroClassId: string): Promise<boolean> => {
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
      localStorage.setItem(
        'proroctvi_online_session',
        JSON.stringify({ roomCode: code, token: res.token, seat: 'p2' })
      )
      return true
    }
    return false
  }

  const handleStartOnlineGame = async () => {
    if (!roomCode || !myToken || !roomSeats?.p1 || !roomSeats.p2) return
    // Hru zakládá hostitel až teď, aby měl hráč 2 hrdinu, kterého si v lobby zvolil
    const fresh = createGame([
      { name: roomSeats.p1.name, heroClassId: roomSeats.p1.heroClassId },
      { name: roomSeats.p2.name, heroClassId: roomSeats.p2.heroClassId },
    ])
    const res = await startOnlineRoomGame(roomCode, myToken, fresh)
    if (res.ok) {
      setGame(fresh)
      if (res.v) stateVersionRef.current = res.v
      resetTurnState()
      setAppScreen('GAME')
    }
  }

  const handleLeaveRoom = () => {
    setRoomCode(null)
    setMyToken(null)
    setMySeat(null)
    setRoomSeats(null)
    localStorage.removeItem('proroctvi_online_session')
    setAppScreen('LOBBY')
  }

  // Ukončení rozehrané partie a návrat do úvodního lobby (online i lokální)
  const handleQuitGame = () => {
    const question = isOnline
      ? 'Opustit online hru? Vrátíš se do lobby a můžeš se připojit k jiné místnosti.'
      : 'Ukončit rozehranou hru a vrátit se do lobby?'
    if (!window.confirm(question)) return
    resetTurnState()
    setActiveCombat(null)
    setCombatSource(null)
    setPvpTarget(null)
    handleLeaveRoom()
  }

  // ---------- tah hráče ----------

  const handleMove = (option: TacticalMovementOption) => {
    if (!isMyTurn || moved) return
    if (option.type === 'enter_sphere' && option.sphereId) {
      const sphere = ASTRAL_SPHERES.find((s) => s.id === option.sphereId)
      if (!sphere) return
      setHasMoved(true)
      setCombatSource({ kind: 'guardian', sphereId: sphere.id })
      setActiveCombat(startCombatWithMonster(sphere.guardian, true, sphere.guardian.combatType === 'mental' ? 'mental' : 'physical', false))
      return
    }
    const workType = option.id.replace('work-', '') as 'city_work' | 'guild_work' | 'fortress_training'
    const next = option.type === 'work' ? doWork(game, activeIdx, workType) : executeMove(game, activeIdx, option)
    if (next === game) return
    setHasMoved(true)
    setSelectedTile(BOARD_TILES[next.players[activeIdx].currentTileId])
    pushStateUpdate(next)
  }

  const handleEngageCombat = (chosenMode: 'physical' | 'mental') => {
    const card = shownCard && getAdventureCard(shownCard.cardId)
    if (!shownCard || !card?.monster || !isMyTurn) return
    const payingWill = chosenMode === 'mental' && card.monster.combatType === 'both'
    if (payingWill) {
      if (activePlayer.currentWill < 2) return
      pushStateUpdate({
        ...game,
        players: game.players.map((p, i) => (i === activeIdx ? { ...p, currentWill: p.currentWill - 2 } : p)),
      })
    }
    setCombatSource({ kind: 'monster', uid: shownCard.uid })
    setActiveCombat(startCombatWithMonster(card.monster, false, chosenMode, payingWill))
    setOpenCardUid(null)
  }

  const handleCombatEnd = (result: CombatResult) => {
    if (!combatSource) return
    const next = combatSource.kind === 'monster'
      ? resolveMonsterFight(game, activeIdx, combatSource.uid, result)
      : resolveGuardianFight(game, activeIdx, combatSource.sphereId, result)
    if (combatSource.kind === 'guardian' && result === 'win') confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
    // Prohra i remíza tah ukončí; útok na sféru je činnost místo pohybu a tah po něm končí také
    if (result !== 'win' || combatSource.kind === 'guardian') setTurnOver(true)
    setActiveCombat(null)
    setCombatSource(null)
    pushStateUpdate(next)
  }

  const handleFlee = () => {
    const uid = combatSource?.kind === 'monster' ? combatSource.uid : shownCard?.uid
    const next = uid ? fleeFromMonster(game, activeIdx, uid) : game
    setActiveCombat(null)
    setCombatSource(null)
    setOpenCardUid(null)
    setTurnOver(true)
    pushStateUpdate(next)
  }

  const handleService = (id: ServiceId) => {
    const next = applyService(game, activeIdx, id)
    if (next === game) return
    setUsedServices((u) => [...u, id])
    pushStateUpdate(next)
  }

  const handlePvp = (mode: 'physical' | 'mental') => {
    if (pvpTarget === null) return
    const { state, outcome } = resolvePvp(game, activeIdx, pvpTarget, mode)
    if (!outcome) return
    setAttackedThisTurn(true)
    setPvpOutcome(outcome)
    pushStateUpdate(state)
  }

  const handleEndTurn = () => {
    if (!isMyTurn && !activePlayer.isAI) return
    resetTurnState()
    pushStateUpdate(endTurn(game))
  }

  // ---------- tah bota ----------

  useEffect(() => {
    if (appScreen !== 'GAME' || !activePlayer.isAI || game.winner || isOnline) return
    const timer = setTimeout(() => {
      let s = game
      const choice = decideAIMovement(s, activeIdx)
      if (choice.type === 'enter_sphere' && choice.sphereId) {
        const sphere = ASTRAL_SPHERES.find((sp) => sp.id === choice.sphereId)!
        const fight = resolveAICombat(activePlayer, sphere.guardian, true, { tile: currentTile })
        s = { ...s, players: s.players.map((p, i) => (i === activeIdx ? { ...p, currentWill: fight.newWill } : p)) }
        s = resolveGuardianFight(s, activeIdx, sphere.id, fight.result)
      } else {
        const workType = choice.id.replace('work-', '') as 'city_work' | 'guild_work' | 'fortress_training'
        s = choice.type === 'work' ? doWork(s, activeIdx, workType) : executeMove(s, activeIdx, choice)
        s = runAIActions(s, activeIdx)
      }
      pushStateUpdate(s.winner ? s : endTurn(s))
    }, 1400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appScreen, game.activePlayerIndex, game.turnNumber, game.extraTurnFor, activePlayer.isAI, game.winner])

  // Po prohře, remíze, útěku nebo útoku na sféru se tah předá sám
  useEffect(() => {
    if (appScreen !== 'GAME' || activePlayer.isAI || !isMyTurn || game.winner || !turnOver) return
    const timer = setTimeout(handleEndTurn, 1500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appScreen, activePlayer.isAI, isMyTurn, game.winner, turnOver, game.activePlayerIndex])

  // If user is on Lobby Screen, render LobbyScreen
  if (appScreen === 'LOBBY') {
    return (
      <LobbyScreen
        onStartHotseat={handleStartHotseat}
        onStartAI={handleStartAI}
        onCreateOnlineRoom={handleCreateOnlineRoom}
        onJoinOnlineRoom={handleJoinOnlineRoom}
        onStartOnlineGame={handleStartOnlineGame}
        onLeaveRoom={handleLeaveRoom}
        roomCode={roomCode}
        mySeat={mySeat}
        seats={roomSeats}
        initialJoinCode={urlJoinCode}
        onClearJoinCode={() => {
          setUrlJoinCode(null)
          if (window.history.replaceState) {
            window.history.replaceState({}, '', window.location.pathname)
          }
        }}
      />
    )
  }

  const shownAdventure = shownCard ? getAdventureCard(shownCard.cardId) : null

  return (
    <>
      <MobileGameView
        game={game}
        roomCode={roomCode}
        isOnline={isOnline}
        isMyTurn={isMyTurn}
        mySeat={mySeat}
        selectedTile={selectedTile}
        hasMoved={moved}
        turnOver={turnOver}
        claimedSpheres={claimedSpheres}
        usedServices={usedServices}
        attackedThisTurn={attackedThisTurn}
        onSelectTile={setSelectedTile}
        onMove={handleMove}
        onOpenCard={setOpenCardUid}
        onPickArtifact={(id) => pushStateUpdate(pickUpArtifact(game, activeIdx, id))}
        onService={handleService}
        onOpenMarket={() => setShowMarket(true)}
        onOpenGuild={() => setShowGuild(true)}
        onAttackPlayer={(idx) => { setPvpOutcome(null); setPvpTarget(idx) }}
        onEndTurn={handleEndTurn}
        onUseItem={(item) => pushStateUpdate(drinkPotion(game, activeIdx, item.id))}
        onLobby={handleQuitGame}
      />

      {/* Modals */}
      {shownCard && shownAdventure && !activeCombat && (
        <CardModal
          key={shownCard.uid}
          card={shownAdventure}
          tileCard={shownCard}
          player={activePlayer}
          tile={currentTile}
          forced={!openCardUid}
          onEngageCombat={handleEngageCombat}
          onClaimTreasure={() => {
            setOpenCardUid(null)
            pushStateUpdate(takeOpportunity(game, activeIdx, shownCard.uid))
          }}
          onClose={() => setOpenCardUid(null)}
          onFlee={handleFlee}
        />
      )}

      {activeCombat && (
        <CombatModal
          player={activePlayer}
          combat={activeCombat}
          tile={currentTile}
          lootItemId={combatSource?.kind === 'monster' ? (game.tileCards[currentTile.id] || []).find((c) => c.uid === combatSource.uid)?.lootItemId : undefined}
          onCombatEnd={handleCombatEnd}
          onFleeCombat={handleFlee}
          onUpdatePlayerStats={(str, will) => {
            pushStateUpdate({
              ...game,
              players: game.players.map((p, i) => (i === activeIdx ? { ...p, currentStrength: str, currentWill: will } : p)),
            })
          }}
        />
      )}

      {pvpTarget !== null && (
        <PvpModal
          attacker={activePlayer}
          defender={game.players[pvpTarget]}
          finalBattle={!!game.finalBattle}
          outcome={pvpOutcome}
          onAttack={handlePvp}
          onClose={() => { setPvpTarget(null); setPvpOutcome(null) }}
        />
      )}

      {showMarket && (
        <MarketModal
          game={game}
          player={activePlayer}
          onBuy={(id) => pushStateUpdate(buyGood(game, activeIdx, id))}
          onSell={(id) => pushStateUpdate(sellItem(game, activeIdx, id))}
          onClose={() => setShowMarket(false)}
        />
      )}

      {showGuild && (
        <GuildModal
          game={game}
          player={activePlayer}
          onLearn={(id) => pushStateUpdate(learnFromGuild(game, activeIdx, id))}
          onClose={() => setShowGuild(false)}
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
              Hrdina <span className="font-bold text-amber-400">{game.winner.name}</span>{' '}
              {game.winner.artifacts.length >= 4 ? 'shromáždil 4 artefakty ze sfér' : 'zvítězil v závěrečném boji'} a stal se novým vládcem království!
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
    </>
  )
}

export default App
