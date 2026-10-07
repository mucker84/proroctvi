import { BOARD_TILES } from '../data/board'
import { ADVENTURE_CARDS } from '../data/cards'
import { HERO_CLASSES } from '../data/characters'
import { ASTRAL_SPHERES } from '../data/spheres'
import {
  AdventureCard,
  CombatState,
  GameState,
  Item,
  Monster,
  Player,
  Skill,
  Spell,
  SphereElement,
} from './types'

export function createInitialGame(
  playerConfigs: { name: string; heroClassId: string; isAI?: boolean }[] = [
    { name: 'Hrdina 1', heroClassId: 'warrior' },
    { name: 'Hrdina 2', heroClassId: 'mage' },
  ]
): GameState {
  const players: Player[] = playerConfigs.map((cfg, index) => {
    const heroClass =
      HERO_CLASSES.find((h) => h.id === cfg.heroClassId) || HERO_CLASSES[0]
    return {
      id: `p-${index + 1}`,
      name: cfg.name,
      heroClass,
      currentStrength: heroClass.baseStrength,
      maxStrength: heroClass.baseStrength,
      currentWill: heroClass.baseWill,
      maxWill: heroClass.baseWill,
      gold: heroClass.baseGold,
      experience: 0,
      currentTileId: heroClass.startTileId,
      inventory: [],
      skills: [],
      spells: [],
      artifacts: [],
      isAI: cfg.isAI || false,
    }
  })

  return {
    players,
    activePlayerIndex: 0,
    phase: 'START',
    turnNumber: 1,
    diceValues: [1, 1],
    isDiceRolling: false,
    currentCard: null,
    combat: null,
    winner: null,
    gameLog: ['Hra Proroctví zahájena! Cílem je získat 4 z 5 magických artefaktů ze sfér.'],
  }
}

export function rollDice(): [number, number] {
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  return [d1, d2]
}

export function getPossibleMoves(currentTileId: number, steps: number): number[] {
  // Movement around circular board of 32 tiles (clockwise and counter-clockwise)
  const totalTiles = BOARD_TILES.length
  const clockwise = (currentTileId + steps) % totalTiles
  const counterClockwise = (currentTileId - steps + totalTiles) % totalTiles

  const results = new Set<number>()
  results.add(clockwise)
  results.add(counterClockwise)

  // Check water connections if on water tile
  const tile = BOARD_TILES.find((t) => t.id === currentTileId)
  if (tile && tile.waterConnections) {
    for (const wc of tile.waterConnections) {
      results.add(wc)
    }
  }

  return Array.from(results)
}

export function drawCardForTerrain(terrain: string): AdventureCard {
  const matching = ADVENTURE_CARDS.filter((c) => c.terrain === terrain)
  if (matching.length === 0) {
    return ADVENTURE_CARDS[0]
  }
  const randomIndex = Math.floor(Math.random() * matching.length)
  return matching[randomIndex]
}

export function calculatePlayerAttack(
  player: Player,
  type: 'physical' | 'mental',
  roll: number
): { base: number; equipmentBonus: number; total: number } {
  let base = type === 'physical' ? player.currentStrength : player.currentWill
  let equipmentBonus = 0

  if (type === 'physical') {
    player.inventory.forEach((item) => {
      if (item.strengthBonus) equipmentBonus += item.strengthBonus
    })
    player.artifacts.forEach((art) => {
      equipmentBonus += art.strengthBonus
    })
    // Warrior class passive bonus
    if (player.heroClass.id === 'warrior') {
      equipmentBonus += 1
    }
  } else {
    player.inventory.forEach((item) => {
      if (item.willBonus) equipmentBonus += item.willBonus
    })
    player.artifacts.forEach((art) => {
      equipmentBonus += art.willBonus
    })
  }

  return {
    base,
    equipmentBonus,
    total: base + equipmentBonus + roll,
  }
}

export function calculatePlayerDefense(player: Player): number {
  let defense = 0
  player.inventory.forEach((item) => {
    if (item.defenseBonus) defense += item.defenseBonus
  })
  return defense
}

export function startCombatWithMonster(
  enemy: Monster,
  isSphereGuardian = false
): CombatState {
  const combatType = enemy.combatType === 'both' ? 'physical' : enemy.combatType
  return {
    enemy,
    isSphereGuardian,
    round: 1,
    combatType,
    playerRoll: null,
    enemyRoll: null,
    playerTotalAttack: null,
    enemyTotalAttack: null,
    log: [`Boj začíná! Protivník: ${enemy.name} (${combatType === 'physical' ? 'Fyzický boj' : 'Mentální boj'}).`],
    isFinished: false,
    playerWon: null,
  }
}
