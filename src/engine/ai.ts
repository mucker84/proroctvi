import { BOARD_TILES } from '../data/board'
import { SHOP_ITEMS } from '../data/cards'
import { calculatePlayerAttack, calculatePlayerDefense } from './gameEngine'
import { BoardTile, Item, Monster, Player, SphereElement } from './types'

/**
 * Evaluates whether moving clockwise or counter-clockwise is better for the AI.
 */
export function decideAIDirection(
  player: Player,
  totalSteps: number,
  claimedSpheres: Record<SphereElement, string | null>
): 'cw' | 'ccw' {
  const currentId = player.currentTileId
  const total = BOARD_TILES.length

  const cwId = (currentId + totalSteps) % total
  const ccwId = (currentId - totalSteps + total) % total

  const cwTile = BOARD_TILES.find((t) => t.id === cwId) || BOARD_TILES[0]
  const ccwTile = BOARD_TILES.find((t) => t.id === ccwId) || BOARD_TILES[0]

  const scoreTile = (tile: BoardTile): number => {
    let score = 10

    // Priority 1: If injured, strongly prefer cities, temples, camps
    const isInjured = player.currentStrength < player.maxStrength - 2
    if (isInjured) {
      if (tile.terrain === 'temple' && player.gold >= 2) score += 50
      if (tile.terrain === 'city') score += 30
      if (tile.terrain === 'camp') score += 20
    }

    // Priority 2: If healthy and high exp, prefer training grounds or temple
    if (player.experience >= 4) {
      if (tile.terrain === 'training') score += 35
      if (tile.terrain === 'temple') score += 25
    }

    // Priority 3: Astral gate with unclaimed artifact when healthy
    if (tile.hasAstralGate && !claimedSpheres[tile.hasAstralGate]) {
      if (player.currentStrength >= 6) {
        score += 60 // Ready to challenge sphere!
      } else {
        score -= 10 // Not strong enough yet
      }
    }

    // Priority 4: City for shopping if wealthy
    if (tile.terrain === 'city' && player.gold >= 4 && player.inventory.length < 2) {
      score += 25
    }

    return score
  }

  const cwScore = scoreTile(cwTile)
  const ccwScore = scoreTile(ccwTile)

  return cwScore >= ccwScore ? 'cw' : 'ccw'
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
  playerWon: boolean
  newStrength: number
  newWill: number
  log: string[]
} {
  let pStr = player.currentStrength
  let pWill = player.currentWill
  let guardianHits = isGuardian ? 2 : 1
  let won = false
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
  const defense = calculatePlayerDefense(player)

  let round = 1
  while (round <= 15) {
    const pRoll = Math.floor(Math.random() * 6) + 1
    const eRoll = Math.floor(Math.random() * 6) + 1
    const pAttack = calculatePlayerAttack({ ...player, currentStrength: pStr, currentWill: pWill }, combatType, pRoll)
    const pTotal = pAttack.total
    const eTotal = enemyBase + eRoll

    if (pTotal > eTotal) {
      // AI hits
      if (!isGuardian) {
        won = true
        log.push(`Kolo ${round}: 🤖 ${player.name} hodil ${pTotal} vs ${monster.name} ${eTotal} ➔ Netvor padl!`)
        break
      } else {
        guardianHits--
        log.push(`Kolo ${round}: 🤖 ${player.name} zasáhl Strážce! (Zbývá ${guardianHits} zásah)`)
        if (guardianHits <= 0) {
          won = true
          break
        }
      }
    } else if (eTotal > pTotal) {
      // AI takes damage
      if (combatType === 'physical') {
        const dmg = Math.max(1, eTotal - pTotal - defense)
        pStr = Math.max(0, pStr - dmg)
        log.push(`Kolo ${round}: ${monster.name} (${eTotal}) zranil 🤖 ${player.name} (${pTotal}) o ${dmg} HP.`)
      } else {
        const dmg = Math.max(1, eTotal - pTotal)
        pWill = Math.max(0, pWill - dmg)
        log.push(`Kolo ${round}: ${monster.name} (${eTotal}) ubral 🤖 ${player.name} (${pTotal}) ${dmg} Vůle.`)
      }

      if (pStr <= 0 || (combatType === 'mental' && pWill <= 0)) {
        won = false
        log.push(`💀 🤖 ${player.name} podlehl v boji s ${monster.name}!`)
        break
      }
    } else {
      log.push(`Kolo ${round}: Vyrovnaný souboj (${pTotal} vs ${eTotal}).`)
    }
    round++
  }

  return {
    playerWon: won,
    newStrength: pStr,
    newWill: pWill,
    log,
  }
}
