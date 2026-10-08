import { BOARD_TILES } from '../data/board'
import { ASTRAL_SPHERES } from '../data/spheres'
import {
  calculatePlayerAttack,
  CombatContext,
  CombatResult,
  getTacticalMoveOptions,
  rollCombat,
  TacticalMovementOption,
} from './gameEngine'
import {
  buyGood,
  buyPrice,
  canAttackPlayer,
  canLearn,
  claimedSpheresOf,
  getAdventureCard,
  getGuildCard,
  getItem,
  getTileServices,
  learnFromGuild,
  monstersOnTile,
  opportunitiesOnTile,
  pickUpArtifact,
  resolveMonsterFight,
  resolvePvp,
  TILE_GUILD,
  drinkPotion,
  takeOpportunity,
  applyService,
} from './rules'
import { BoardTile, GameState, Monster, Player } from './types'

/** Pravděpodobnost, že součet hrdiny (základ + k6) přehodí součet soupeře (základ + k6) */
export function winChance(diff: number): number {
  let wins = 0
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (diff + a > b) wins++
  return wins / 36
}

function bestMode(player: Player, monster: Monster, ctx: CombatContext): { mode: 'physical' | 'mental'; chance: number; pay: boolean } {
  const phys = winChance(calculatePlayerAttack(player, 'physical', 0, ctx).total - monster.strength)
  if (monster.combatType === 'physical') return { mode: 'physical', chance: phys, pay: false }
  if (monster.combatType === 'mental') {
    return { mode: 'mental', chance: winChance(calculatePlayerAttack(player, 'mental', 0, ctx).total - monster.will), pay: false }
  }
  if (player.currentWill < 2) return { mode: 'physical', chance: phys, pay: false }
  const ment = winChance(calculatePlayerAttack({ ...player, currentWill: player.currentWill - 2 }, 'mental', 0, ctx).total - monster.will)
  return ment > phys ? { mode: 'mental', chance: ment, pay: true } : { mode: 'physical', chance: phys, pay: false }
}

const guardianChance = (player: Player, monster: Monster, tile: BoardTile) => {
  const c = bestMode(player, monster, { monster, tile }).chance
  return c * c // nižší i vyšší strážce
}

function tileValue(s: GameState, player: Player, tile: BoardTile): number {
  let score = 0
  const hurt = player.currentStrength < player.maxStrength
  const drained = player.currentWill < player.maxWill
  for (const card of s.tileCards[tile.id] || []) {
    const adv = getAdventureCard(card.cardId)
    if (!card.faceUp) score += 3
    else if (adv.monster) {
      const c = bestMode(player, adv.monster, { monster: adv.monster, tile }).chance
      score += c * (adv.monster.rewardExp * 3 + adv.monster.rewardGold + (card.lootItemId ? 6 : 0)) - (1 - c) * (player.currentStrength <= 1 ? 40 : 10)
    } else score += 12
  }
  if ((s.tileArtifacts[tile.id] || []).length) score += 60
  for (const id of s.marketGoods[tile.id] || []) {
    const item = getItem(id)
    if (buyPrice(player, item) <= player.gold && improves(player, item)) score += 12
  }
  const guild = TILE_GUILD[tile.id]
  if (guild) {
    for (const id of s.guildOffers[tile.id] || []) {
      const card = getGuildCard(id)
      if (card && !canLearn(player, guild, card)) score += 18
    }
  }
  if (hurt && (tile.id === 16 || (tile.id === 8 && player.gold >= 1))) score += player.currentStrength <= 2 ? 40 : 15
  if (drained && (tile.id === 13 || (tile.id === 12 && player.gold >= 1))) score += 8
  if (tile.nearSphere && !claimedSpheresOf(s)[tile.nearSphere]) {
    const sphere = ASTRAL_SPHERES.find((sp) => sp.id === tile.nearSphere)!
    if (guardianChance(player, sphere.guardian, tile) > 0.45) score += 45
  }
  return score
}

/** Pomůže předmět v boji? Porovná nejlepší útok silou i vůlí s předmětem a bez něj. */
function improves(player: Player, item: { id: string; type: string }): boolean {
  if (item.type === 'potion') return player.inventory.filter((i) => i.type === 'potion').length < 2
  const withItem = { ...player, inventory: [...player.inventory, getItem(item.id)] }
  const score = (p: Player) => Math.max(calculatePlayerAttack(p, 'physical', 0).total, calculatePlayerAttack(p, 'mental', 0).total)
  return score(withItem) > score(player)
}

export function decideAIMovement(s: GameState, pIdx: number): TacticalMovementOption {
  const player = s.players[pIdx]
  const claimed = claimedSpheresOf(s)
  const options = getTacticalMoveOptions(player, claimed).filter((o) => o.isAvailable)
  const current = BOARD_TILES[player.currentTileId]
  const stay = options.find((o) => o.type === 'stay')!
  if (s.finalBattle) return stay

  const sphereOpt = options.find((o) => o.type === 'enter_sphere')
  if (sphereOpt) {
    const sphere = ASTRAL_SPHERES.find((sp) => sp.id === sphereOpt.sphereId)!
    if (guardianChance(player, sphere.guardian, current) > 0.45) return sphereOpt
  }

  let best = stay
  let bestScore = -Infinity
  for (const opt of options) {
    if (opt.type === 'enter_sphere') continue
    let score: number
    if (opt.type === 'work') {
      score = (opt.rewardGold && player.gold <= 3 ? 14 : 0) + (opt.rewardExp && player.experience < 4 ? 14 : 0) + tileValue(s, player, current) * 0.5
    } else {
      score = tileValue(s, player, BOARD_TILES[opt.targetTileId]) - opt.costGold * 3 + (opt.type === 'stay' ? -2 : 0)
    }
    score += Math.random() * 2
    if (score > bestScore) {
      bestScore = score
      best = opt
    }
  }
  return best
}

/** Automatický boj bota: jeden hod, u strážce sféry dvě vítězství po sobě */
export function resolveAICombat(
  player: Player,
  monster: Monster,
  isGuardian = false,
  ctx: CombatContext = {}
): { result: CombatResult; newWill: number; log: string[] } {
  const choice = bestMode(player, monster, { ...ctx, monster })
  const will = player.currentWill - (choice.pay ? 2 : 0)
  const base = calculatePlayerAttack({ ...player, currentWill: will }, choice.mode, 0, { ...ctx, monster }).total
  const enemyBase = choice.mode === 'physical' ? monster.strength : monster.will
  const log: string[] = choice.pay ? [`🔮 🤖 ${player.name} zaplatil 2 magy a vyvolal boj vůlí.`] : []
  let result: CombatResult = 'draw'
  for (let fight = 0; fight < (isGuardian ? 2 : 1); fight++) {
    const roll = rollCombat(base, enemyBase)
    result = roll.result
    log.push(`🤖 ${player.name} ${roll.playerTotal} : ${roll.enemyTotal} ${monster.name}`)
    if (result !== 'win') break
  }
  return { result, newWill: will, log }
}

/** Celý zbytek tahu bota po pohybu: boje, příležitosti, služby, nákupy, výcvik, útok na hráče */
export function runAIActions(state: GameState, pIdx: number): GameState {
  let s = state
  const me = () => s.players[pIdx]
  const tile = () => BOARD_TILES[me().currentTileId]

  for (const card of monstersOnTile(s, tile().id)) {
    const monster = getAdventureCard(card.cardId).monster!
    const fight = resolveAICombat(me(), monster, false, { tile: tile() })
    s = { ...s, players: s.players.map((p, i) => (i === pIdx ? { ...p, currentWill: fight.newWill } : p)) }
    s = resolveMonsterFight(s, pIdx, card.uid, fight.result)
    if (fight.result !== 'win' || s.winner) return s
  }

  for (const card of opportunitiesOnTile(s, tile().id)) s = takeOpportunity(s, pIdx, card.uid)
  for (const art of s.tileArtifacts[tile().id] || []) s = pickUpArtifact(s, pIdx, art.id)
  if (s.winner) return s

  for (let guard = 0; guard < 10; guard++) {
    const services = getTileServices(s, pIdx).filter((sv) => sv.available)
    const p = me()
    const want = services.find(
      (sv) =>
        (sv.id === 'monastery_heal' && guard === 0) ||
        (sv.id === 'camp_heal' && p.gold > 2) ||
        (sv.id === 'wasteland_mana' && guard === 0) ||
        (sv.id === 'tower_mana' && p.gold > 3) ||
        (sv.id === 'inn' && guard === 0 && p.gold >= 3 && (p.currentStrength < p.maxStrength || p.currentWill < p.maxWill))
    )
    if (!want) break
    s = applyService(s, pIdx, want.id)
  }

  for (const id of [...(s.marketGoods[tile().id] || [])]) {
    const item = getItem(id)
    if (buyPrice(me(), item) <= me().gold - 1 && improves(me(), item)) s = buyGood(s, pIdx, id)
  }

  const guild = TILE_GUILD[tile().id]
  if (guild) {
    for (const id of [...(s.guildOffers[tile().id] || [])]) {
      const card = getGuildCard(id)
      if (card && !canLearn(me(), guild, card)) s = learnFromGuild(s, pIdx, id)
    }
  }

  if (me().currentStrength <= 2) {
    const potion = me().inventory.find((i) => i.effect === 'heal_3_str' || i.effect === 'heal_full')
    if (potion) s = drinkPotion(s, pIdx, potion.id)
  }

  s.players.forEach((target, tIdx) => {
    if (s.winner || canAttackPlayer(s, pIdx, tIdx)) return
    const mine = Math.max(calculatePlayerAttack(me(), 'physical', 0, { vsPlayer: true }).total)
    const theirs = calculatePlayerAttack(target, 'physical', 0, { vsPlayer: true }).total
    const worthIt = target.artifacts.length > 0 || target.inventory.length > 0
    if (s.finalBattle || (worthIt && winChance(mine - theirs) > 0.6)) {
      s = resolvePvp(s, pIdx, tIdx, 'physical').state
    }
  })
  return s
}
