import { BOARD_TILES } from '../data/board'
import { SHOP_ITEMS } from '../data/cards'
import { calculatePlayerAttack, CombatResult, getTacticalMoveOptions, rollCombat } from './gameEngine'
import { BoardTile, Item, Monster, Player, SphereElement } from './types'

export type AIMoveChoice =
  | { type: 'walk'; targetTileId: number; label: string }
  | { type: 'horse'; targetTileId: number; costGold: 1; label: string }
  | { type: 'ship'; targetTileId: number; costGold: 1; label: string }
  | { type: 'gate'; targetTileId: number; costGold: 2; label: string }
  | { type: 'stay'; targetTileId: number; label: string }
  | { type: 'work'; workType: 'city_work' | 'guild_work' | 'fortress_training'; label: string }
  | { type: 'enter_sphere'; sphereId: SphereElement; label: string }

export function scoreTileForAI(
  player: Player,
  tile: BoardTile,
  claimedSpheres: Record<SphereElement, string | null>
): number {
  let score = 10
  const isInjured = player.currentStrength < player.maxStrength - 1
  if (isInjured) {
    if (tile.id === 16) score += 45 // Klášter léčení zdarma
    if (tile.id === 8 && player.gold >= 1) score += 35 // Lesní tábor léčení
    if (tile.terrain === 'city') score += 20
  }
  if (tile.id === 13 && player.currentWill < player.maxWill) {
    score += 30 // Magická pustina (+3 Vůle zdarma)
  }
  if (player.experience >= 4 && tile.isGuild) {
    score += 35 // Cechovní výcvik
  }
  if (tile.hasAstralGate && !claimedSpheres[tile.hasAstralGate]) {
    if (player.currentStrength >= 6) {
      score += 70 // Připraven na astrální sféru!
    } else {
      score -= 10
    }
  }
  if (tile.terrain === 'city' && player.gold >= 4 && player.inventory.length < 2) {
    score += 25
  }
  if (tile.terrain === 'forest' || tile.terrain === 'mountain' || tile.terrain === 'plains') {
    if (!isInjured) score += 20 // Divočina pro karty
  }
  return score
}

/**
 * Decides tactical movement for AI according to official Prophecy rules (No dice!).
 */
export function decideAIMovement(
  player: Player,
  claimedSpheres: Record<SphereElement, string | null>
): AIMoveChoice {
  const currentTile = BOARD_TILES[player.currentTileId] || BOARD_TILES[0]

  // 1. Enter Astral Sphere if ready
  if (currentTile.nearSphere && !claimedSpheres[currentTile.nearSphere] && player.currentStrength >= 6) {
    return {
      type: 'enter_sphere',
      sphereId: currentTile.nearSphere,
      label: `Vstoupit do sféry (${currentTile.nearSphere})`,
    }
  }

  // 2. Action instead of movement (Work / Training)
  if (currentTile.workAction) {
    if (currentTile.workAction.type === 'city_work' && player.gold <= 2 && player.currentWill >= 2) {
      return { type: 'work', workType: 'city_work', label: 'Odborná práce ve městě (+2 zl)' }
    }
    if (currentTile.workAction.type === 'fortress_training' && player.currentStrength >= 5 && player.experience < 4) {
      return { type: 'work', workType: 'fortress_training', label: 'Cvičiště v pevnosti (+2 exp)' }
    }
  }

  // 3. Evaluate Movement options
  const total = BOARD_TILES.length
  const leftId = (player.currentTileId - 1 + total) % total
  const rightId = (player.currentTileId + 1) % total
  const leftTile = BOARD_TILES[leftId]
  const rightTile = BOARD_TILES[rightId]

  const options: { choice: AIMoveChoice; score: number }[] = [
    {
      choice: { type: 'walk', targetTileId: rightId, label: `Pěšky vpravo (${rightTile.name})` },
      score: scoreTileForAI(player, rightTile, claimedSpheres),
    },
    {
      choice: { type: 'walk', targetTileId: leftId, label: `Pěšky vlevo (${leftTile.name})` },
      score: scoreTileForAI(player, leftTile, claimedSpheres),
    },
    {
      choice: { type: 'stay', targetTileId: player.currentTileId, label: `Zůstat na místě (${currentTile.name})` },
      score: scoreTileForAI(player, currentTile, claimedSpheres) - 5,
    },
  ]

  // Horse movement (2 spaces) if wealthy
  if (player.gold >= 2) {
    const horseLeftId = (player.currentTileId - 2 + total) % total
    const horseRightId = (player.currentTileId + 2) % total
    const hLeftTile = BOARD_TILES[horseLeftId]
    const hRightTile = BOARD_TILES[horseRightId]

    options.push({
      choice: { type: 'horse', targetTileId: horseRightId, costGold: 1, label: `Kůň vpravo (${hRightTile.name})` },
      score: scoreTileForAI(player, hRightTile, claimedSpheres) + 2,
    })
    options.push({
      choice: { type: 'horse', targetTileId: horseLeftId, costGold: 1, label: `Kůň vlevo (${hLeftTile.name})` },
      score: scoreTileForAI(player, hLeftTile, claimedSpheres) + 2,
    })
  }

  // Ship movement if in port (jen nejbližší přístavy, stejně jako u hráče)
  if (currentTile.hasPort && player.gold >= 1) {
    const ports = getTacticalMoveOptions(player, claimedSpheres).filter((o) => o.type === 'ship')
    for (const port of ports) {
      const portTile = BOARD_TILES[port.targetTileId]
      options.push({
        choice: { type: 'ship', targetTileId: port.targetTileId, costGold: 1, label: `Cesta lodí do ${portTile.name}` },
        score: scoreTileForAI(player, portTile, claimedSpheres) + 3,
      })
    }
  }

  // Magic gate if in gate
  if (currentTile.hasMagicGate && player.gold >= 2) {
    const gates = BOARD_TILES.filter((t) => t.hasMagicGate && t.id !== currentTile.id)
    for (const gate of gates) {
      options.push({
        choice: { type: 'gate', targetTileId: gate.id, costGold: 2, label: `Magická brána do ${gate.name}` },
        score: scoreTileForAI(player, gate, claimedSpheres) + 4,
      })
    }
  }

  // Pick the highest scoring choice
  options.sort((a, b) => b.score - a.score)
  return options[0].choice
}

/**
 * Decides what action the AI should perform upon landing on a tile.
 */
export function decideAITileAction(
  player: Player,
  tile: BoardTile,
  claimedSpheres: Record<SphereElement, string | null>
): 'heal' | 'train_str' | 'train_will' | 'buy_item' | 'enter_sphere' | 'draw_card' | 'rest' | 'skip' {
  // 1. Temple actions
  if (tile.terrain === 'temple') {
    if (player.currentStrength < player.maxStrength && player.gold >= 2) {
      return 'heal'
    }
    if (player.experience >= 4) {
      return 'train_will'
    }
  }

  // 2. Training ground actions
  if (tile.terrain === 'training') {
    if (player.experience >= 4) {
      return 'train_str'
    }
  }

  // 3. City & Camp Shopping
  if (tile.terrain === 'city' || tile.terrain === 'camp') {
    const canAffordWeaponOrArmor = SHOP_ITEMS.some(
      (item) =>
        player.gold >= item.price &&
        (item.type === 'weapon' || item.type === 'armor' || item.type === 'potion') &&
        !player.inventory.some((i) => i.id === item.id)
    )
    if (canAffordWeaponOrArmor && player.inventory.length < 4) {
      return 'buy_item'
    }
  }

  // 4. Astral Gate
  if (tile.hasAstralGate && !claimedSpheres[tile.hasAstralGate]) {
    // Only enter if AI has solid combat strength
    if (player.currentStrength >= 6) {
      return 'enter_sphere'
    }
  }

  // 5. Wilderness (Forest, Mountain, Plains, Water)
  if (tile.terrain === 'forest' || tile.terrain === 'mountain' || tile.terrain === 'plains' || tile.terrain === 'water') {
    // If critical HP, rest rather than risk monster
    if (player.currentStrength <= 2) {
      return 'rest'
    }
    return 'draw_card'
  }

  return 'skip'
}

/**
 * Picks the best item the AI can afford from the shop.
 */
export function pickAIBestItem(player: Player): Item | null {
  const affordable = SHOP_ITEMS.filter(
    (item) => player.gold >= item.price && !player.inventory.some((i) => i.id === item.id)
  )
  if (affordable.length === 0) return null

  // Prioritize weapons if no weapon
  const hasWeapon = player.inventory.some((i) => i.type === 'weapon')
  if (!hasWeapon) {
    const weapon = affordable.find((i) => i.type === 'weapon')
    if (weapon) return weapon
  }

  // Prioritize armor if no armor
  const hasArmor = player.inventory.some((i) => i.type === 'armor')
  if (!hasArmor) {
    const armor = affordable.find((i) => i.type === 'armor')
    if (armor) return armor
  }

  // Otherwise highest priced affordable item
  return affordable.sort((a, b) => b.price - a.price)[0]
}

/**
 * Resolves a combat for the AI automatically using authentic Prophecy rules.
 */
export function resolveAICombat(
  player: Player,
  monster: Monster,
  isGuardian = false
): {
  result: CombatResult
  newStrength: number
  newWill: number
  log: string[]
} {
  const pStr = player.currentStrength
  let pWill = player.currentWill
  const log: string[] = []

  let combatType: 'physical' | 'mental' = 'physical'
  if (monster.combatType === 'mental') {
    combatType = 'mental'
  } else if (monster.combatType === 'both') {
    // Intelligent choice: compare strength vs will advantages
    const pPhysicalBase = calculatePlayerAttack(player, 'physical', 0).total
    const pMentalBase = calculatePlayerAttack({ ...player, currentWill: Math.max(0, pWill - 2) }, 'mental', 0).total
    const physicalAdvantage = pPhysicalBase - monster.strength
    const mentalAdvantage = pMentalBase - monster.will

    if (pWill >= 2 && mentalAdvantage > physicalAdvantage) {
      combatType = 'mental'
      pWill -= 2 // Paid 2 will to invoke mental combat
      log.push(`🔮 🤖 ${player.name} zaplatil 2 Vůli a vyvolal Boj vůlí proti ${monster.name}!`)
    } else {
      combatType = 'physical'
      log.push(`⚔ 🤖 ${player.name} zvolil Boj silou proti ${monster.name}.`)
    }
  } else {
    combatType = 'physical'
  }

  const enemyBase = combatType === 'physical' ? monster.strength : monster.will
  const playerBase = calculatePlayerAttack({ ...player, currentWill: pWill }, combatType, 0).total

  // Jeden hod rozhoduje; strážce sféry jsou dva (nižší a vyšší) → dvě vítězství po sobě
  let result: CombatResult = 'draw'
  for (let fight = 0; fight < (isGuardian ? 2 : 1); fight++) {
    const roll = rollCombat(playerBase, enemyBase)
    result = roll.result
    log.push(`🤖 ${player.name} ${roll.playerTotal} : ${roll.enemyTotal} ${monster.name}`)
    if (result !== 'win') break
  }

  return {
    result,
    newStrength: pStr,
    newWill: pWill,
    log,
  }
}
