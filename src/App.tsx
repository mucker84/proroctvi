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
  startCombatWithMonster,
} from './engine/gameEngine'
import {
  decideAIDirection,
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
  SphereElement,
} from './engine/types'

export const App: React.FC = () => {
  const [appScreen, setAppScreen] = useState<'LOBBY' | 'GAME'>('LOBBY')
  const [game, setGame] = useState<GameState>(() => createInitialGame())
  const [selectedTile, setSelectedTile] = useState<BoardTile>(BOARD_TILES[0])
  const [validMoves, setValidMoves] = useState<number[]>([])
  const [showShop, setShowShop] = useState(false)
  const [drawnCard, setDrawnCard] = useState<AdventureCard | null>(null)
  const [activeCombat, setActiveCombat] = useState<CombatState | null>(null)
  const [hasRolledForMove, setHasRolledForMove] = useState(false)
  const [hasCompletedTileAction, setHasCompletedTileAction] = useState(false)
  const [lastDiceRoll, setLastDiceRoll] = useState<[number, number] | null>(null)
  const [lastDirection, setLastDirection] = useState<'cw' | 'ccw'>('cw')
  const [tileBeforeRoll, setTileBeforeRoll] = useState<number>(0)
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

  // Automatic move after dice roll
  const handleRollDiceAndMove = (dice: [number, number], direction: 'cw' | 'ccw') => {
    if (!isMyTurn) return

    const totalSteps = dice[0] + dice[1]
    const startTileId = activePlayer.currentTileId
    setTileBeforeRoll(startTileId)

    const targetTileId =
      direction === 'cw'
        ? (startTileId + totalSteps) % BOARD_TILES.length
        : (startTileId - totalSteps + BOARD_TILES.length) % BOARD_TILES.length

    const targetTile = BOARD_TILES.find((t) => t.id === targetTileId) || BOARD_TILES[0]

    const updatedPlayers = [...game.players]
    updatedPlayers[game.activePlayerIndex] = {
      ...updatedPlayers[game.activePlayerIndex],
      currentTileId: targetTileId,
    }

    setLastDiceRoll(dice)
    setLastDirection(direction)
    setHasRolledForMove(true)
    setHasCompletedTileAction(false)
    setSelectedTile(targetTile)
    setValidMoves([])

    const nextState: GameState = {
      ...game,
      players: updatedPlayers,
      diceValues: dice,
      phase: 'TILE_ACTION',
      gameLog: [
        `${activePlayer.name} hodil ${totalSteps} (🎲 ${dice[0]} + ${dice[1]}) a dorazil na pole #${targetTileId} (${targetTile.name}).`,
        ...game.gameLog.slice(0, 15),
      ],
    }
    pushStateUpdate(nextState)
  }

  // Switch direction to the opposite tile
  const handleSwitchDirection = () => {
    if (!isMyTurn || !lastDiceRoll) return

    const totalSteps = lastDiceRoll[0] + lastDiceRoll[1]
    const newDir: 'cw' | 'ccw' = lastDirection === 'cw' ? 'ccw' : 'cw'

    const altTileId =
      newDir === 'cw'
        ? (tileBeforeRoll + totalSteps) % BOARD_TILES.length
        : (tileBeforeRoll - totalSteps + BOARD_TILES.length) % BOARD_TILES.length

    const targetTile = BOARD_TILES.find((t) => t.id === altTileId) || BOARD_TILES[0]

    const updatedPlayers = [...game.players]
    updatedPlayers[game.activePlayerIndex] = {
      ...updatedPlayers[game.activePlayerIndex],
      currentTileId: altTileId,
    }

    setLastDirection(newDir)
    setSelectedTile(targetTile)

    const nextState: GameState = {
      ...game,
      players: updatedPlayers,
      phase: 'TILE_ACTION',
      gameLog: [
        `${activePlayer.name} změnil směr chůze a přešel na pole #${altTileId} (${targetTile.name}).`,
        ...game.gameLog.slice(0, 15),
      ],
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

    const terrain = currentTile.terrain
    const cardTerrain =
      terrain === 'forest' || terrain === 'mountain' || terrain === 'plains' || terrain === 'water'
        ? terrain
        : 'forest'

    const card = drawCardForTerrain(cardTerrain)
    setDrawnCard(card)
  }

  // Engage combat
  const handleEngageCombat = () => {
    if (!drawnCard || !drawnCard.monster || !isMyTurn) return
    const combat = startCombatWithMonster(drawnCard.monster)
    setActiveCombat(combat)
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
      gameLog: [
        playerWon
          ? `${currentPlayer.name} porazil ${activeCombat.enemy.name}! (+${activeCombat.enemy.rewardGold} zl., +${activeCombat.enemy.rewardExp} exp)`
          : `${currentPlayer.name} padl v boji. Obrodil se ve městě (-50 % zlaťáků za vzkříšení).`,
        ...game.gameLog.slice(0, 15),
      ],
    }

    setActiveCombat(null)
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
      gameLog: [
        `${currentPlayer.name} včas uprchl ze souboje s ${activeCombat.enemy.name} a zachránil si život.`,
        ...game.gameLog.slice(0, 15),
      ],
    }
    setActiveCombat(null)
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

    setHasRolledForMove(false)
    setHasCompletedTileAction(false)
    setLastDiceRoll(null)
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

    // Step 1: AI rolls dice and moves
    if (!hasRolledForMove) {
      const timer = setTimeout(() => {
        if (!isMounted) return
        const d1 = Math.floor(Math.random() * 6) + 1
        const d2 = Math.floor(Math.random() * 6) + 1
        const dice: [number, number] = [d1, d2]
        const dir = decideAIDirection(activePlayer, d1 + d2, claimedSpheres)

        const startTileId = activePlayer.currentTileId
        const totalSteps = d1 + d2
        const targetTileId =
          dir === 'cw'
            ? (startTileId + totalSteps) % BOARD_TILES.length
            : (startTileId - totalSteps + BOARD_TILES.length) % BOARD_TILES.length
        const targetTile = BOARD_TILES.find((t) => t.id === targetTileId) || BOARD_TILES[0]

        const updatedPlayers = [...game.players]
        updatedPlayers[game.activePlayerIndex] = {
          ...updatedPlayers[game.activePlayerIndex],
          currentTileId: targetTileId,
        }

        setTileBeforeRoll(startTileId)
        setLastDiceRoll(dice)
        setLastDirection(dir)
        setHasRolledForMove(true)
        setHasCompletedTileAction(false)
        setSelectedTile(targetTile)

        const nextState: GameState = {
          ...game,
          players: updatedPlayers,
          diceValues: dice,
          phase: 'TILE_ACTION',
          gameLog: [
            `🤖 ${activePlayer.name} hodil 🎲 ${d1} + ${d2} (${totalSteps}) a postoupil na pole #${targetTileId} (${targetTile.name}).`,
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
    if (hasRolledForMove && !hasCompletedTileAction) {
      const timer = setTimeout(() => {
        if (!isMounted) return
        const action = decideAITileAction(activePlayer, currentTile, claimedSpheres)
        const updatedPlayers = [...game.players]
        const bot = { ...updatedPlayers[game.activePlayerIndex] }
        let logMsg = ''

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
          const card = drawCardForTerrain(terrain)

          if (card.type === 'treasure') {
            bot.gold += card.rewardGold || 0
            bot.experience += card.rewardExp || 0
            logMsg = `🤖 ${bot.name} našel poklad: ${card.name} (+${card.rewardGold || 0} zl, +${card.rewardExp || 0} exp).`
          } else if (card.monster) {
            const combatRes = resolveAICombat(bot, card.monster, false)
            bot.currentStrength = combatRes.newStrength
            bot.currentWill = combatRes.newWill

            if (combatRes.playerWon) {
              bot.gold += card.monster.rewardGold
              bot.experience += card.monster.rewardExp
              logMsg = `🤖 ${bot.name} v boji porazil ${card.monster.name} (+${card.monster.rewardGold} zl, +${card.monster.rewardExp} exp).`
            } else {
              bot.currentStrength = bot.maxStrength
              bot.currentWill = bot.maxWill
              bot.currentTileId = bot.heroClass.startTileId
              bot.gold = Math.floor(bot.gold / 2)
              logMsg = `💀 🤖 ${bot.name} podlehl v boji s ${card.monster.name} a obrodil se ve městě.`
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
    hasRolledForMove,
    hasCompletedTileAction,
    game.winner,
    game.activePlayerIndex,
    claimedSpheres,
    currentTile,
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
      />
    )
  }

  const steps = lastDiceRoll ? lastDiceRoll[0] + lastDiceRoll[1] : 0
  const altTileId =
    lastDirection === 'cw'
      ? (tileBeforeRoll - steps + BOARD_TILES.length) % BOARD_TILES.length
      : (tileBeforeRoll + steps) % BOARD_TILES.length
  const alternateTile = BOARD_TILES.find((t) => t.id === altTileId) || BOARD_TILES[0]

  return (
    <>
    <MobileGameView
      game={game}
      roomCode={roomCode}
      isOnline={isOnline}
      isMyTurn={isMyTurn}
      mySeat={mySeat}
      selectedTile={selectedTile}
      hasRolledForMove={hasRolledForMove}
      hasCompletedTileAction={hasCompletedTileAction}
      lastDiceRoll={lastDiceRoll}
      alternateTile={alternateTile}
      onSelectTile={setSelectedTile}
      onRollDice={handleRollDiceAndMove}
      onSwitchDirection={handleSwitchDirection}
      onDrawCard={handleDrawCard}
      onOpenShop={() => setShowShop(true)}
      onEnterSphere={handleEnterSphere}
      onEndTurn={handleEndTurn}
      onRest={handleRest}
      onUseItem={handleUseItem}
      onLobby={() => setAppScreen('LOBBY')}
    />

      {/* Modals */}
      {drawnCard && (
        <CardModal
          card={drawnCard}
          onEngageCombat={handleEngageCombat}
          onClaimTreasure={handleClaimTreasure}
          onFlee={() => {
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
          onTrainStat={handleTrainStat}
          onHeal={handleHeal}
          onClose={() => {
            setShowShop(false)
            setHasCompletedTileAction(true)
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
