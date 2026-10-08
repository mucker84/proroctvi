import { BOARD_TILES } from '../data/board'
import { ADVENTURE_CARDS, AVAILABLE_SPELLS } from '../data/cards'
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

    const startingSpells: Spell[] = []
    if (heroClass.id === 'mage') {
      const fb = AVAILABLE_SPELLS.find((s) => s.id === 'spell_fireball')
      if (fb) startingSpells.push(fb)
    } else if (heroClass.id === 'warlock') {
      const mb = AVAILABLE_SPELLS.find((s) => s.id === 'spell_mind_blast')
      if (mb) startingSpells.push(mb)
    } else if (heroClass.id === 'witch') {
      const fb = AVAILABLE_SPELLS.find((s) => s.id === 'spell_fireball')
      if (fb) startingSpells.push(fb)
    } else if (heroClass.id === 'druid') {
      const heal = AVAILABLE_SPELLS.find((s) => s.id === 'spell_heal')
      if (heal) startingSpells.push(heal)
    }

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
      spells: startingSpells,
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
    tileMonsters: {},
    winner: null,
    gameLog: ['Hra Proroctví zahájena! Cílem je získat 4 z 5 magických artefaktů ze sfér.'],
  }
}

export function rollDice(): [number, number] {
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  return [d1, d2]
}

export interface TacticalMovementOption {
  id: string
  type: 'walk' | 'horse' | 'ship' | 'gate' | 'stay' | 'work' | 'enter_sphere'
  targetTileId: number
  label: string
  detail: string
  icon: string
  costGold: number
  costHp?: number
  costWill?: number
  rewardGold?: number
  rewardExp?: number
  sphereId?: SphereElement
  isAvailable: boolean
  unavailableReason?: string
}

export function getTacticalMoveOptions(
  player: Player,
  claimedSpheres: Record<SphereElement, string | null>
): TacticalMovementOption[] {
  const currentTile = BOARD_TILES[player.currentTileId] || BOARD_TILES[0]
  const total = BOARD_TILES.length
  const options: TacticalMovementOption[] = []

  // 1. Walk: Left (-1), Stay (0), Right (+1)
  const leftTileId = (player.currentTileId - 1 + total) % total
  const rightTileId = (player.currentTileId + 1) % total
  const leftTile = BOARD_TILES[leftTileId]
  const rightTile = BOARD_TILES[rightTileId]

  options.push({
    id: `walk-left-${leftTileId}`,
    type: 'walk',
    targetTileId: leftTileId,
    label: `Pěšky vlevo (#${leftTileId} ${leftTile.name})`,
    detail: 'Zdarma · 1 pole proti směru',
    icon: '🚶',
    costGold: 0,
    isAvailable: true,
  })

  options.push({
    id: `stay-${player.currentTileId}`,
    type: 'stay',
    targetTileId: player.currentTileId,
    label: `Zůstat na místě (#${player.currentTileId} ${currentTile.name})`,
    detail: 'Zdarma · Žádný přesun',
    icon: '🛑',
    costGold: 0,
    isAvailable: true,
  })

  options.push({
    id: `walk-right-${rightTileId}`,
    type: 'walk',
    targetTileId: rightTileId,
    label: `Pěšky vpravo (#${rightTileId} ${rightTile.name})`,
    detail: 'Zdarma · 1 pole po směru',
    icon: '🚶',
    costGold: 0,
    isAvailable: true,
  })

  // 2. Horse: Left (-2), Right (+2)
  const horseLeftId = (player.currentTileId - 2 + total) % total
  const horseRightId = (player.currentTileId + 2) % total
  const hLeftTile = BOARD_TILES[horseLeftId]
  const hRightTile = BOARD_TILES[horseRightId]

  options.push({
    id: `horse-left-${horseLeftId}`,
    type: 'horse',
    targetTileId: horseLeftId,
    label: `Na koni vlevo (#${horseLeftId} ${hLeftTile.name})`,
    detail: '1 🪙 zl. · 2 pole proti směru',
    icon: '🐎',
    costGold: 1,
    isAvailable: player.gold >= 1,
    unavailableReason: player.gold < 1 ? 'Nemáš 1 zlaťák na koně' : undefined,
  })

  options.push({
    id: `horse-right-${horseRightId}`,
    type: 'horse',
    targetTileId: horseRightId,
    label: `Na koni vpravo (#${horseRightId} ${hRightTile.name})`,
    detail: '1 🪙 zl. · 2 pole po směru',
    icon: '🐎',
    costGold: 1,
    isAvailable: player.gold >= 1,
    unavailableReason: player.gold < 1 ? 'Nemáš 1 zlaťák na koně' : undefined,
  })

  // 3. Ship: Ports (if on port)
  if (currentTile.hasPort) {
    const ports = BOARD_TILES.filter((t) => t.hasPort && t.id !== currentTile.id)
    for (const port of ports) {
      options.push({
        id: `ship-${port.id}`,
        type: 'ship',
        targetTileId: port.id,
        label: `Cesta lodí do #${port.id} (${port.name})`,
        detail: '1 🪙 zl. · Plavba přes moře',
        icon: '⛵',
        costGold: 1,
        isAvailable: player.gold >= 1,
        unavailableReason: player.gold < 1 ? 'Nemáš 1 zlaťák na lodní lístek' : undefined,
      })
    }
  }

  // 4. Magic Gate: (if on magic gate)
  if (currentTile.hasMagicGate) {
    const gates = BOARD_TILES.filter((t) => t.hasMagicGate && t.id !== currentTile.id)
    for (const gate of gates) {
      options.push({
        id: `gate-${gate.id}`,
        type: 'gate',
        targetTileId: gate.id,
        label: `Magická brána do #${gate.id} (${gate.name})`,
        detail: '2 🪙 zl. · Okamžitý přenos',
        icon: '🌀',
        costGold: 2,
        isAvailable: player.gold >= 2,
        unavailableReason: player.gold < 2 ? 'Nemáš 2 zlaťáky na teleport' : undefined,
      })
    }
  }

  // 5. Work instead of movement (if tile offers work)
  if (currentTile.workAction) {
    const wa = currentTile.workAction
    const canAfford =
      (wa.costHp ? player.currentStrength > wa.costHp : true) &&
      (wa.costWill ? player.currentWill >= wa.costWill : true)

    options.push({
      id: `work-${wa.type}`,
      type: 'work',
      targetTileId: currentTile.id,
      label: wa.title,
      detail: wa.description,
      icon: '🛠️',
      costGold: 0,
      costHp: wa.costHp,
      costWill: wa.costWill,
      rewardGold: wa.rewardGold,
      rewardExp: wa.rewardExp,
      isAvailable: canAfford,
      unavailableReason: !canAfford ? 'Nemáš dostatek Síly nebo Vůle' : undefined,
    })
  }

  // 6. Enter Astral Sphere instead of movement (if nearSphere)
  if (currentTile.nearSphere) {
    const sphere = ASTRAL_SPHERES.find((s) => s.id === currentTile.nearSphere)
    const isTaken = claimedSpheres[currentTile.nearSphere] !== null
    if (sphere) {
      options.push({
        id: `sphere-${sphere.id}`,
        type: 'enter_sphere',
        targetTileId: currentTile.id,
        label: `Vstup do sféry: ${sphere.name}`,
        detail: `Místo pohybu · Výzva pro ${sphere.guardian.name}`,
        icon: '🌌',
        costGold: 0,
        sphereId: sphere.id,
        isAvailable: !isTaken,
        unavailableReason: isTaken ? `Artefakt již získal ${claimedSpheres[currentTile.nearSphere]}` : undefined,
      })
    }
  }

  return options
}

export function getPossibleMoves(currentTileId: number, steps: number): number[] {
  // Legacy fallback for tests
  const totalTiles = BOARD_TILES.length
  const clockwise = (currentTileId + steps) % totalTiles
  const counterClockwise = (currentTileId - steps + totalTiles) % totalTiles

  const results = new Set<number>()
  results.add(clockwise)
  results.add(counterClockwise)
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
  isSphereGuardian = false,
  chosenCombatType?: 'physical' | 'mental',
  invokedMentalCostPaid = false
): CombatState {
  const combatType = chosenCombatType ?? (enemy.combatType === 'both' ? 'physical' : enemy.combatType)
  const modeLabel = combatType === 'physical' ? 'Fyzický boj (Síla)' : 'Mentální boj (Vůle)'
  const extraNote = combatType === 'mental' && enemy.combatType === 'both' ? ' · Vyvolán boj vůlí (-2 🔮 Vůle)' : ''
  return {
    enemy,
    isSphereGuardian,
    round: 1,
    combatType,
    playerRoll: null,
    enemyRoll: null,
    playerTotalAttack: null,
    enemyTotalAttack: null,
    log: [`Boj začíná! Protivník: ${enemy.name} (${modeLabel}${extraNote}).`],
    isFinished: false,
    playerWon: null,
    invokedMentalCostPaid,
  }
}
