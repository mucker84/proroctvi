import confetti from 'canvas-confetti'
import React, { useEffect, useRef, useState } from 'react'
import { CardModal } from './components/CardModal'
import { CombatModal } from './components/CombatModal'
import { LobbyScreen } from './components/LobbyScreen'
import { MobileGameView } from './components/MobileGameView'
import { ShopModal } from './components/ShopModal'
import { BOARD_TILES } from './data/board'
import { HERO_CLASSES } from './data/characters'
import { ASTRAL_SPHERES } from './data/spheres'
import {
  createInitialGame,
  drawCardForTerrain,
  getTacticalMoveOptions,
  startCombatWithMonster,
} from './engine/gameEngine'
import {
  decideAIMovement,
  decideAITileAction,
  pickAIBestItem,
  resolveAICombat,
} from './engine/ai'
import {
  createOnlineRoom,
  joinOnlineRoom,
  RoomSeat,
  startOnlineRoomGame,
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
  Spell,
  SphereElement,
} from './engine/types'

// Neporažený netvor zůstává ležet na poli (pravidla ALTAR, Prohra/Remíza v boji s nestvůrou)
const withTileMonster = (
  tileMonsters: GameState['tileMonsters'],
  tileId: number,
  card: AdventureCard | null
): Record<number, AdventureCard> => {
  const next = { ...(tileMonsters || {}) }
  if (card) next[tileId] = card
  else delete next[tileId]
  return next
}

export const App: React.FC = () => {
  const [appScreen, setAppScreen] = useState<'LOBBY' | 'GAME'>('LOBBY')
  const [game, setGame] = useState<GameState>(() => createInitialGame())
  const [selectedTile, setSelectedTile] = useState<BoardTile>(BOARD_TILES[0])
  const [validMoves, setValidMoves] = useState<number[]>([])
  const [showShop, setShowShop] = useState(false)
  const [drawnCard, setDrawnCard] = useState<AdventureCard | null>(null)
  const [activeCombat, setActiveCombat] = useState<CombatState | null>(null)
  const [combatCard, setCombatCard] = useState<AdventureCard | null>(null)
  const [hasMoved, setHasMoved] = useState(false)
  const [hasCompletedTileAction, setHasCompletedTileAction] = useState(false)
  const [claimedSpheres, setClaimedSpheres] = useState<Record<SphereElement, string | null>>({
    fire: null,
    ice: null,
    shadow: null,
    storm: null,
    magic: null,
  })

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
            if (res.ok) {
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

  const activePlayer = game.players[game.activePlayerIndex]
  const currentTile = BOARD_TILES[activePlayer.currentTileId]

  const isOnline = Boolean(roomCode && mySeat)
  const isMyTurn =
    (!isOnline && !activePlayer.isAI) ||
    (mySeat === 'p1' && game.activePlayerIndex === 0) ||
    (mySeat === 'p2' && game.activePlayerIndex === 1)

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

  // Lobby Handlers
  const handleStartHotseat = (p1HeroId: string, p2HeroId: string) => {
    const p1Hero = HERO_CLASSES.find((h) => h.id === p1HeroId) || HERO_CLASSES[0]
    const p2Hero = HERO_CLASSES.find((h) => h.id === p2HeroId) || HERO_CLASSES[1]

    const initial = createInitialGame([
      { name: `Hráč 1 (${p1Hero.name})`, heroClassId: p1HeroId },
      { name: `Hráč 2 (${p2Hero.name})`, heroClassId: p2HeroId },
    ])

    setGame(initial)
    setRoomCode(null)
    setMySeat(null)
    setMyToken(null)
    localStorage.removeItem('proroctvi_online_session')
    setAppScreen('GAME')
  }

  const handleStartAI = (playerHeroId: string, aiHeroId: string, playerName: string) => {
    const p1Hero = HERO_CLASSES.find((h) => h.id === playerHeroId) || HERO_CLASSES[0]
    const aiHero = HERO_CLASSES.find((h) => h.id === aiHeroId) || HERO_CLASSES[1]

    const initial = createInitialGame([
      { name: playerName || `Hráč (${p1Hero.name})`, heroClassId: playerHeroId, isAI: false },
      { name: `🤖 ${aiHero.name} (AI)`, heroClassId: aiHeroId, isAI: true },
    ])

    setGame(initial)
    setRoomCode(null)
    setMySeat(null)
    setMyToken(null)
    localStorage.removeItem('proroctvi_online_session')
    setAppScreen('GAME')
  }

  const handleCreateOnlineRoom = async (name: string, heroClassId: string): Promise<string | null> => {
    const initial = createInitialGame([
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
    if (!roomCode || !myToken) return
    const res = await startOnlineRoomGame(roomCode, myToken, game)
    if (res.ok) {
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
    setDrawnCard(null)
    setActiveCombat(null)
    setCombatCard(null)
    setShowShop(false)
    setHasMoved(false)
    setHasCompletedTileAction(false)
    setClaimedSpheres({ fire: null, ice: null, shadow: null, storm: null, magic: null })
    setGame(createInitialGame())
    handleLeaveRoom()
  }

  // Tactical movement (walk, horse, ship, gate, stay)
  const handleExecuteMove = (targetTileId: number, costGold: number, moveType: string) => {
    if (!isMyTurn) return

    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }

    if (costGold > 0) {
      if (currentPlayer.gold < costGold) return
      currentPlayer.gold -= costGold
    }
    currentPlayer.currentTileId = targetTileId
    updatedPlayers[game.activePlayerIndex] = currentPlayer

    const targetTile = BOARD_TILES.find((t) => t.id === targetTileId) || BOARD_TILES[0]
    setHasMoved(true)
    setHasCompletedTileAction(false)
    setSelectedTile(targetTile)
    setValidMoves([])

    let logAction = ''
    if (moveType === 'horse') {
      logAction = `${currentPlayer.name} jel na koni na pole #${targetTileId} (${targetTile.name}) (-1 🪙 zl).`
    } else if (moveType === 'ship') {
      logAction = `${currentPlayer.name} se přeplavil lodí do přístavu #${targetTileId} (${targetTile.name}) (-1 🪙 zl).`
    } else if (moveType === 'gate') {
      logAction = `${currentPlayer.name} prošel magickou bránou na pole #${targetTileId} (${targetTile.name}) (-2 🪙 zl).`
    } else if (moveType === 'stay') {
      logAction = `${currentPlayer.name} zůstává na poli #${targetTileId} (${targetTile.name}).`
    } else {
      logAction = `${currentPlayer.name} došel pěšky na pole #${targetTileId} (${targetTile.name}).`
    }

    // Neporažený netvor na cílovém poli napadne příchozího
    const lyingMonster = game.tileMonsters?.[targetTileId]
    const log = lyingMonster
      ? [`👹 Na poli #${targetTileId} číhá neporažený ${lyingMonster.name}!`, logAction, ...game.gameLog.slice(0, 14)]
      : [logAction, ...game.gameLog.slice(0, 15)]

    const nextState: GameState = {
      ...game,
      players: updatedPlayers,
      phase: 'TILE_ACTION',
      gameLog: log,
    }
    pushStateUpdate(nextState)
    if (lyingMonster) setDrawnCard(lyingMonster)
  }

  // Work or training instead of movement
  const handleWorkAction = (type: 'city_work' | 'guild_work' | 'fortress_training') => {
    if (!isMyTurn) return

    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }
    let logAction = ''

    if (type === 'city_work') {
      if (currentPlayer.currentWill < 1) return
      currentPlayer.currentWill -= 1
      currentPlayer.gold += 2
      logAction = `${currentPlayer.name} vykonal odbornou práci ve městě (-1 Vůle, +2 🪙 zl).`
    } else if (type === 'guild_work') {
      if (currentPlayer.currentStrength <= 1) return
      currentPlayer.currentStrength -= 1
      currentPlayer.gold += 3
      logAction = `${currentPlayer.name} splnil špinavou práci pro Gildu (-1 Síla, +3 🪙 zl).`
    } else if (type === 'fortress_training') {
      if (currentPlayer.currentStrength <= 1) return
      currentPlayer.currentStrength -= 1
      currentPlayer.experience += 2
      logAction = `${currentPlayer.name} podstoupil tvrdý dril v Pevnosti (-1 Síla, +2 ⭐ exp).`
    }

    updatedPlayers[game.activePlayerIndex] = currentPlayer
    setHasMoved(true)
    setHasCompletedTileAction(true)

    const nextState: GameState = {
      ...game,
      players: updatedPlayers,
      phase: 'TILE_ACTION',
      gameLog: [logAction, ...game.gameLog.slice(0, 15)],
    }
    pushStateUpdate(nextState)
  }

  // Resting action: Heal 1 Strength or 1 Will
  const handleRest = () => {
    if (!isMyTurn) return

    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }

    let restMessage = ''
    if (currentPlayer.currentStrength < currentPlayer.maxStrength) {
      currentPlayer.currentStrength += 1
      restMessage = '+1 Síla (Život)'
    } else if (currentPlayer.currentWill < currentPlayer.maxWill) {
      currentPlayer.currentWill += 1
      restMessage = '+1 Vůle (Mana)'
    } else {
      restMessage = 'hrdina je plně zdráv'
    }

    updatedPlayers[game.activePlayerIndex] = currentPlayer
    setHasCompletedTileAction(true)

    const nextState: GameState = {
      ...game,
      players: updatedPlayers,
      gameLog: [
        `${currentPlayer.name} odpočívá na poli #${currentPlayer.currentTileId}: ${restMessage}.`,
        ...game.gameLog.slice(0, 15),
      ],
    }
    pushStateUpdate(nextState)
  }

  // Inspect tile on board click
  const handleTileClick = (targetTileId: number) => {
    const targetTile = BOARD_TILES.find((t) => t.id === targetTileId) || BOARD_TILES[0]
    setSelectedTile(targetTile)
  }

  // Draw adventure card
  const handleDrawCard = () => {
    if (!isMyTurn) return

    const lyingMonster = game.tileMonsters?.[currentTile.id]
    if (lyingMonster) {
      setDrawnCard(lyingMonster)
      return
    }

    const terrain = currentTile.terrain
    const cardTerrain =
      terrain === 'forest' || terrain === 'mountain' || terrain === 'plains' || terrain === 'water'
        ? terrain
        : 'forest'

    const card = drawCardForTerrain(cardTerrain)
    setDrawnCard(card)
  }

  // Engage combat
  const handleEngageCombat = (chosenMode: 'physical' | 'mental' = 'physical') => {
    if (!drawnCard || !drawnCard.monster || !isMyTurn) return
    const monster = drawnCard.monster
    const isBoth = monster.combatType === 'both'
    const payingWill = chosenMode === 'mental' && isBoth

    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }

    if (payingWill) {
      if (currentPlayer.currentWill < 2) return
      currentPlayer.currentWill -= 2
      updatedPlayers[game.activePlayerIndex] = currentPlayer
    }

    const combat = startCombatWithMonster(monster, false, chosenMode, payingWill)

    const nextLog = payingWill
      ? [
          `${currentPlayer.name} zaplatil 2 Vůli a vyvolal boj vůlí proti ${monster.name}!`,
          ...game.gameLog.slice(0, 15),
        ]
      : game.gameLog

    const nextState: GameState = {
      ...game,
      players: updatedPlayers,
      gameLog: nextLog,
    }
    pushStateUpdate(nextState)

    setActiveCombat(combat)
    setCombatCard(drawnCard)
    setDrawnCard(null)
  }

  // Enter astral sphere
  const handleEnterSphere = (sphereId: SphereElement) => {
    if (!isMyTurn) return
    const sphere = ASTRAL_SPHERES.find((s) => s.id === sphereId)
    if (!sphere) return

    if (claimedSpheres[sphereId]) {
      alert(`Tento artefakt již získal ${claimedSpheres[sphereId]}!`)
      return
    }

    const initialMode: 'physical' | 'mental' = sphere.guardian.combatType === 'mental' ? 'mental' : 'physical'
    const combat = startCombatWithMonster(sphere.guardian, true, initialMode, false)
    setActiveCombat(combat)
    setCombatCard(null)
  }

  // Resolve combat end
  const handleCombatEnd = (playerWon: boolean) => {
    if (!activeCombat) return

    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }
    const battleTileId = currentPlayer.currentTileId
    const tileMonsters = combatCard
      ? withTileMonster(game.tileMonsters, battleTileId, playerWon ? null : combatCard)
      : game.tileMonsters

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
      const lostGold = Math.floor(currentPlayer.gold / 2)
      currentPlayer.gold = Math.max(0, currentPlayer.gold - lostGold)
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
      tileMonsters,
      gameLog: [
        playerWon
          ? `${currentPlayer.name} porazil ${activeCombat.enemy.name}! (+${activeCombat.enemy.rewardGold} zl., +${activeCombat.enemy.rewardExp} exp)`
          : `${currentPlayer.name} padl v boji. Obrodil se ve městě (-50 % zlaťáků za vzkříšení).${
              combatCard ? ` ${activeCombat.enemy.name} dál číhá na poli #${battleTileId}.` : ''
            }`,
        ...game.gameLog.slice(0, 15),
      ],
    }

    setActiveCombat(null)
    setCombatCard(null)
    setHasCompletedTileAction(true)
    pushStateUpdate(nextState)
  }

  // Handle fleeing during combat
  const handleFleeCombat = () => {
    if (!activeCombat) return
    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }
    const nextState: GameState = {
      ...game,
      players: updatedPlayers,
      tileMonsters: combatCard
        ? withTileMonster(game.tileMonsters, currentPlayer.currentTileId, combatCard)
        : game.tileMonsters,
      gameLog: [
        `${currentPlayer.name} včas uprchl ze souboje s ${activeCombat.enemy.name} a zachránil si život.${
          combatCard ? ` Netvor dál číhá na poli #${currentPlayer.currentTileId}.` : ''
        }`,
        ...game.gameLog.slice(0, 15),
      ],
    }
    setActiveCombat(null)
    setCombatCard(null)
    setHasCompletedTileAction(true)
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
    setHasCompletedTileAction(true)
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

  const handleLearnSpell = (spell: Spell) => {
    const updatedPlayers = [...game.players]
    const currentPlayer = { ...updatedPlayers[game.activePlayerIndex] }
    if (
      currentPlayer.experience >= 3 &&
      !currentPlayer.spells.some((s) => s.id === spell.id)
    ) {
      currentPlayer.experience -= 3
      currentPlayer.spells.push(spell)
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
    let effectDesc = ''

    if (item.effect === 'heal_3_str') {
      currentPlayer.currentStrength = Math.min(
        currentPlayer.maxStrength,
        currentPlayer.currentStrength + 3
      )
      effectDesc = '+3 Síla (životy)'
    } else if (item.effect === 'heal_3_will') {
      currentPlayer.currentWill = Math.min(
        currentPlayer.maxWill,
        currentPlayer.currentWill + 3
      )
      effectDesc = '+3 Vůle (mana)'
    } else if (item.effect === 'heal_full') {
      currentPlayer.currentStrength = currentPlayer.maxStrength
      currentPlayer.currentWill = currentPlayer.maxWill
      effectDesc = 'plná obnova Síly i Vůle'
    }

    currentPlayer.inventory = currentPlayer.inventory.filter((i) => i.id !== item.id)
    updatedPlayers[game.activePlayerIndex] = currentPlayer

    const nextState: GameState = {
      ...game,
      players: updatedPlayers,
      gameLog: [
        `${currentPlayer.name} použil ${item.name} (${effectDesc}).`,
        ...game.gameLog.slice(0, 15),
      ],
    }
    pushStateUpdate(nextState)
  }

  // End turn
  const handleEndTurn = () => {
    if (!isMyTurn && !activePlayer.isAI) return

    setHasMoved(false)
    setHasCompletedTileAction(false)
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

  // AI Turn Automator State Machine
  useEffect(() => {
    if (appScreen !== 'GAME' || !activePlayer.isAI || game.winner) return

    let isMounted = true

    // Step 1: AI tactical movement choice (no dice)
    if (!hasMoved) {
      const timer = setTimeout(() => {
        if (!isMounted) return
        const choice = decideAIMovement(activePlayer, claimedSpheres)
        const updatedPlayers = [...game.players]
        const bot = { ...updatedPlayers[game.activePlayerIndex] }

        if (choice.type === 'enter_sphere') {
          handleEnterSphere(choice.sphereId)
          setHasMoved(true)
          return
        }

        if (choice.type === 'work') {
          handleWorkAction(choice.workType)
          return
        }

        const cost = 'costGold' in choice ? choice.costGold : 0
        if (cost > 0) {
          bot.gold = Math.max(0, bot.gold - cost)
        }
        bot.currentTileId = choice.targetTileId
        updatedPlayers[game.activePlayerIndex] = bot

        const targetTile = BOARD_TILES.find((t) => t.id === choice.targetTileId) || BOARD_TILES[0]
        setHasMoved(true)
        setHasCompletedTileAction(false)
        setSelectedTile(targetTile)

        const nextState: GameState = {
          ...game,
          players: updatedPlayers,
          phase: 'TILE_ACTION',
          gameLog: [
            `🤖 ${bot.name}: ${choice.label}.`,
            ...game.gameLog.slice(0, 15),
          ],
        }
        pushStateUpdate(nextState)
      }, 1000)

      return () => {
        isMounted = false
        clearTimeout(timer)
      }
    }

    // Step 2: AI executes action on current tile
    if (hasMoved && !hasCompletedTileAction) {
      const timer = setTimeout(() => {
        if (!isMounted) return
        // Neporažený netvor na poli napadne i bota, než udělá cokoli jiného
        const lyingMonster = game.tileMonsters?.[currentTile.id]
        const action = lyingMonster ? 'draw_card' : decideAITileAction(activePlayer, currentTile, claimedSpheres)
        const updatedPlayers = [...game.players]
        const bot = { ...updatedPlayers[game.activePlayerIndex] }
        let logMsg = ''
        let tileMonsters = game.tileMonsters

        if (action === 'heal') {
          bot.gold = Math.max(0, bot.gold - 2)
          bot.currentStrength = bot.maxStrength
          bot.currentWill = bot.maxWill
          logMsg = `🤖 ${bot.name} se nechal v chrámu plně ošetřit (-2 zl).`
        } else if (action === 'train_str') {
          bot.experience -= 4
          bot.maxStrength += 1
          bot.currentStrength += 1
          logMsg = `🤖 ${bot.name} trénoval na cvičišti (+1 Max Síla).`
        } else if (action === 'train_will') {
          bot.experience -= 4
          bot.maxWill += 1
          bot.currentWill += 1
          logMsg = `🤖 ${bot.name} meditoval v chrámu (+1 Max Vůle).`
        } else if (action === 'buy_item') {
          const item = pickAIBestItem(bot)
          if (item) {
            bot.gold -= item.price
            bot.inventory.push(item)
            logMsg = `🤖 ${bot.name} koupil na tržišti ${item.name} (-${item.price} zl).`
          }
        } else if (action === 'enter_sphere') {
          const sphere = ASTRAL_SPHERES.find((s) => s.id === currentTile.hasAstralGate)
          if (sphere) {
            const combatRes = resolveAICombat(bot, sphere.guardian, true)
            bot.currentStrength = combatRes.newStrength
            bot.currentWill = combatRes.newWill

            if (combatRes.playerWon) {
              bot.gold += sphere.guardian.rewardGold
              bot.experience += sphere.guardian.rewardExp
              bot.artifacts.push(sphere.artifact)
              setClaimedSpheres((c) => ({ ...c, [sphere.id]: bot.name }))
              logMsg = `🏆 🤖 ${bot.name} porazil Strážce a získal ${sphere.artifact.name}!`
            } else {
              bot.currentStrength = bot.maxStrength
              bot.currentWill = bot.maxWill
              bot.currentTileId = bot.heroClass.startTileId
              bot.gold = Math.floor(bot.gold / 2)
              logMsg = `💀 🤖 ${bot.name} padl v boji se Strážcem a probudil se ve městě.`
            }
          }
        } else if (action === 'rest') {
          if (bot.currentStrength < bot.maxStrength) {
            bot.currentStrength += 1
            logMsg = `🤖 ${bot.name} odpočívá v táboře (+1 Síla).`
          } else {
            bot.currentWill = Math.min(bot.maxWill, bot.currentWill + 1)
            logMsg = `🤖 ${bot.name} odpočívá v táboře (+1 Vůle).`
          }
        } else if (action === 'draw_card') {
          const terrain =
            currentTile.terrain === 'forest' ||
            currentTile.terrain === 'mountain' ||
            currentTile.terrain === 'plains' ||
            currentTile.terrain === 'water'
              ? currentTile.terrain
              : 'forest'
          const card = lyingMonster || drawCardForTerrain(terrain)

          if (card.type === 'treasure') {
            bot.gold += card.rewardGold || 0
            bot.experience += card.rewardExp || 0
            logMsg = `🤖 ${bot.name} našel poklad: ${card.name} (+${card.rewardGold || 0} zl, +${card.rewardExp || 0} exp).`
          } else if (card.monster) {
            const combatRes = resolveAICombat(bot, card.monster, false)
            bot.currentStrength = combatRes.newStrength
            bot.currentWill = combatRes.newWill

            tileMonsters = withTileMonster(game.tileMonsters, currentTile.id, combatRes.playerWon ? null : card)
            if (combatRes.playerWon) {
              bot.gold += card.monster.rewardGold
              bot.experience += card.monster.rewardExp
              logMsg = `🤖 ${bot.name} v boji porazil ${card.monster.name} (+${card.monster.rewardGold} zl, +${card.monster.rewardExp} exp).`
            } else {
              bot.currentStrength = bot.maxStrength
              bot.currentWill = bot.maxWill
              bot.currentTileId = bot.heroClass.startTileId
              bot.gold = Math.floor(bot.gold / 2)
              logMsg = `💀 🤖 ${bot.name} podlehl v boji s ${card.monster.name} a obrodil se ve městě. Netvor dál číhá na poli #${currentTile.id}.`
            }
          }
        }

        updatedPlayers[game.activePlayerIndex] = bot
        setHasCompletedTileAction(true)

        let winner = game.winner
        if (bot.artifacts.length >= 4) {
          winner = bot
        }

        const nextState: GameState = {
          ...game,
          players: updatedPlayers,
          winner,
          tileMonsters,
          gameLog: logMsg ? [logMsg, ...game.gameLog.slice(0, 15)] : game.gameLog,
        }
        pushStateUpdate(nextState)
      }, 1200)

      return () => {
        isMounted = false
        clearTimeout(timer)
      }
    }

    // Step 3: AI ends turn
    if (hasCompletedTileAction) {
      const timer = setTimeout(() => {
        if (!isMounted) return
        handleEndTurn()
      }, 1000)

      return () => {
        isMounted = false
        clearTimeout(timer)
      }
    }
  }, [
    appScreen,
    activePlayer,
    hasMoved,
    hasCompletedTileAction,
    game.winner,
    game.activePlayerIndex,
    claimedSpheres,
    currentTile,
  ])

  // Step 4: Human player auto-end turn when all tile actions are completed
  useEffect(() => {
    if (appScreen !== 'GAME' || activePlayer.isAI || !isMyTurn || game.winner) return
    if (!hasCompletedTileAction) return

    let isMounted = true
    const timer = setTimeout(() => {
      if (!isMounted) return
      handleEndTurn()
    }, 1500)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [
    appScreen,
    activePlayer.isAI,
    isMyTurn,
    game.winner,
    hasCompletedTileAction,
    game.activePlayerIndex,
  ])

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

  const currentValidMoves =
    !hasMoved && isMyTurn
      ? getTacticalMoveOptions(activePlayer, claimedSpheres)
          .filter((o) => o.isAvailable && o.type !== 'work' && o.type !== 'enter_sphere')
          .map((o) => o.targetTileId)
      : []

  return (
    <>
      <MobileGameView
        game={game}
        roomCode={roomCode}
        isOnline={isOnline}
        isMyTurn={isMyTurn}
        mySeat={mySeat}
        selectedTile={selectedTile}
        hasMoved={hasMoved}
        hasCompletedTileAction={hasCompletedTileAction}
        claimedSpheres={claimedSpheres}
        validMoves={currentValidMoves}
        onSelectTile={setSelectedTile}
        onExecuteMove={handleExecuteMove}
        onWorkAction={handleWorkAction}
        onDrawCard={handleDrawCard}
        onOpenShop={() => setShowShop(true)}
        onEnterSphere={handleEnterSphere}
        onEndTurn={handleEndTurn}
        onRest={handleRest}
        onUseItem={handleUseItem}
        onLobby={handleQuitGame}
      />

      {/* Modals */}
      {drawnCard && (
        <CardModal
          card={drawnCard}
          player={activePlayer}
          onEngageCombat={handleEngageCombat}
          onClaimTreasure={handleClaimTreasure}
          onFlee={() => {
            if (drawnCard.monster) {
              pushStateUpdate({
                ...game,
                tileMonsters: withTileMonster(game.tileMonsters, activePlayer.currentTileId, drawnCard),
                gameLog: [
                  `${activePlayer.name} utekl před ${drawnCard.monster.name}. Netvor dál číhá na poli #${activePlayer.currentTileId}.`,
                  ...game.gameLog.slice(0, 15),
                ],
              })
            }
            setDrawnCard(null)
            setHasCompletedTileAction(true)
          }}
        />
      )}

      {activeCombat && (
        <CombatModal
          player={activePlayer}
          combat={activeCombat}
          onCombatEnd={handleCombatEnd}
          onFleeCombat={handleFleeCombat}
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
          onLearnSpell={handleLearnSpell}
          onTrainStat={handleTrainStat}
          onHeal={handleHeal}
          onFinishTurn={() => {
            setShowShop(false)
            setHasCompletedTileAction(true)
          }}
          onClose={() => {
            setShowShop(false)
          }}
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
    </>
  )
}

export default App
