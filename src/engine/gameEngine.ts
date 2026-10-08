import { BOARD_TILES } from '../data/board'
import { HERO_CLASSES } from '../data/characters'
import { ASTRAL_SPHERES } from '../data/spheres'
import {
  BoardTile,
  CombatState,
  GameState,
  Item,
  Monster,
  Player,
  SphereElement,
} from './types'

/** Základ stavu bez rozložených karet; hru zakládá createGame v rules.ts. */
export function createInitialGame(
  playerConfigs: { name: string; heroClassId: string; isAI?: boolean }[] = [
    { name: 'Hrdina 1', heroClassId: 'warrior' },
    { name: 'Hrdina 2', heroClassId: 'mage' },
  ]
): GameState {
  const players: Player[] = playerConfigs.map((cfg, index) =>
    createHero(`p-${index + 1}`, cfg.name, cfg.heroClassId, cfg.isAI || false)
  )

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
    tileCards: {},
    adventureDecks: { forest: [], mountain: [], plains: [] },
    adventureDiscard: { forest: [], mountain: [], plains: [] },
    chanceDeck: [],
    chanceDiscard: [],
    guildOffers: {},
    guildDecks: { fortress: [], guild: [], camp: [], tower: [], monastery: [] },
    marketGoods: {},
    commonDeck: [],
    rareDeck: [],
    itemDiscard: [],
    tileArtifacts: {},
    lastChance: null,
    extraTurnFor: null,
    safeInInn: [],
    finalBattle: null,
  }
}

/** Nová postava podle pravidel ALTAR: 3 body zkušenosti, žádné schopnosti ani kouzla. */
export function createHero(id: string, name: string, heroClassId: string, isAI: boolean): Player {
  const heroClass =
    HERO_CLASSES.find((h) => h.id === heroClassId) || HERO_CLASSES[0]

  return {
    id,
    name,
    heroClass,
    currentStrength: heroClass.baseStrength,
    maxStrength: heroClass.baseStrength,
    currentWill: heroClass.baseWill,
    maxWill: heroClass.baseWill,
    gold: heroClass.baseGold,
    experience: 3,
    currentTileId: heroClass.startTileId,
    inventory: [],
    skills: [],
    spells: [],
    artifacts: [],
    isAI,
  }
}

/** Kdo drží artefakt které sféry; artefakt ležící na poli už ve sféře není. */
export function getClaimedSpheres(
  players: Player[],
  tileArtifacts: GameState['tileArtifacts'] = {}
): Record<SphereElement, string | null> {
  const claimed: Record<SphereElement, string | null> = { fire: null, ice: null, shadow: null, storm: null, magic: null }
  const lying = Object.entries(tileArtifacts).flatMap(([tileId, arts]) => arts.map((a) => ({ a, tileId })))
  for (const sphere of ASTRAL_SPHERES) {
    const owner = players.find((p) => p.artifacts.some((a) => a.id === sphere.artifact.id))
    const onTile = lying.find((l) => l.a.id === sphere.artifact.id)
    claimed[sphere.id] = owner ? owner.name : onTile ? `leží na poli #${onTile.tileId}` : null
  }
  return claimed
}

export interface TacticalMovementOption {
  id: string
  type: 'walk' | 'horse' | 'ship' | 'gate' | 'boots' | 'stay' | 'work' | 'enter_sphere'
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
    detail: '1 💰 zl. · 2 pole proti směru',
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
    detail: '1 💰 zl. · 2 pole po směru',
    icon: '🐎',
    costGold: 1,
    isAvailable: player.gold >= 1,
    unavailableReason: player.gold < 1 ? 'Nemáš 1 zlaťák na koně' : undefined,
  })

  // Pohybový předmět (symbol botičky): Okřídlené boty
  if (player.inventory.some((i) => i.effect === 'move_3')) {
    for (const dir of [-1, 1] as const) {
      const targetId = (player.currentTileId + dir * 3 + total) % total
      options.push({
        id: `boots-${dir}-${targetId}`,
        type: 'boots',
        targetTileId: targetId,
        label: `Okřídlené boty ${dir < 0 ? 'vlevo' : 'vpravo'} (#${targetId} ${BOARD_TILES[targetId].name})`,
        detail: 'Zdarma · 3 pole',
        icon: '👢',
        costGold: 0,
        isAvailable: true,
      })
    }
  }

  // 3. Ship: nejbližší přístav nalevo a napravo (pravidla ALTAR, Pohyb d)
  if (currentTile.hasPort) {
    const nearestPort = (dir: 1 | -1) => {
      for (let step = 1; step < total; step++) {
        const tile = BOARD_TILES[(currentTile.id + dir * step + total) % total]
        if (tile.hasPort) return tile
      }
      return null
    }
    const ports = [nearestPort(1), nearestPort(-1)].filter(
      (t, i, arr): t is NonNullable<typeof t> => !!t && t.id !== currentTile.id && arr.findIndex((x) => x?.id === t.id) === i
    )
    for (const port of ports) {
      options.push({
        id: `ship-${port.id}`,
        type: 'ship',
        targetTileId: port.id,
        label: `Cesta lodí do #${port.id} (${port.name})`,
        detail: '1 💰 zl. · Plavba přes moře',
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
        detail: '2 💰 zl. · Okamžitý přenos',
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
        unavailableReason: isTaken ? `Artefakt už ${claimedSpheres[currentTile.nearSphere]?.startsWith('leží') ? '' : 'získal '}${claimedSpheres[currentTile.nearSphere]}` : undefined,
      })
    }
  }

  return options
}

type CombatMode = 'physical' | 'mental'

const itemBonus = (item: Item, mode: CombatMode) =>
  mode === 'physical' ? (item.strengthBonus || 0) + (item.defenseBonus || 0) : item.willBonus || 0

/**
 * Co hrdina v boji skutečně použije. Má dvě ruce a jednu hlavu: v rukou buď jednu obouruční zbraň,
 * nebo jednu jednoruční zbraň a jeden štít; na hlavě jednu věc; k tomu jednu zbroj.
 * Prsteny a amulety působí vždy. Lektvary a pohybové předměty se v boji nepočítají.
 */
export function selectCombatLoadout(player: Player, mode: CombatMode): { used: Item[]; unused: Item[] } {
  const usable = player.inventory.filter((i) => i.type !== 'potion' && i.effect !== 'move_3')
  const best = (items: Item[]) =>
    items.reduce<Item | null>((top, i) => (itemBonus(i, mode) > (top ? itemBonus(top, mode) : 0) ? i : top), null)

  const weapons = usable.filter((i) => i.type === 'weapon')
  const oneHanded = best(weapons.filter((i) => (i.hands ?? 1) === 1))
  const twoHanded = best(weapons.filter((i) => i.hands === 2))
  const shield = best(usable.filter((i) => i.type === 'shield'))
  const oneHandSet = [oneHanded, shield].filter((i): i is Item => !!i)
  const oneHandScore = oneHandSet.reduce((sum, i) => sum + itemBonus(i, mode), 0)
  const hands = twoHanded && itemBonus(twoHanded, mode) > oneHandScore ? [twoHanded] : oneHandSet

  const armor = best(usable.filter((i) => i.type === 'armor'))
  const head = best(usable.filter((i) => i.effect === 'head'))
  const always = usable.filter((i) => i.type === 'accessory' && i.effect !== 'head' && itemBonus(i, mode) > 0)

  const used = [...hands, armor, head, ...always].filter((i): i is Item => !!i && itemBonus(i, mode) > 0)
  const unused = usable.filter((i) => !used.includes(i))
  return { used, unused }
}

export interface CombatContext {
  monster?: Monster
  tile?: BoardTile
  vsPlayer?: boolean
}

const hasSkill = (player: Player, id: string) => player.skills.some((s) => s.id === id)

export function calculatePlayerAttack(
  player: Player,
  type: CombatMode,
  roll: number,
  ctx: CombatContext = {}
): { base: number; equipmentBonus: number; skillBonus: number; total: number; used: Item[]; unused: Item[] } {
  const base = type === 'physical' ? player.currentStrength : player.currentWill
  const { used, unused } = selectCombatLoadout(player, type)
  let equipmentBonus = used.reduce((sum, i) => sum + itemBonus(i, type), 0)
  equipmentBonus += player.artifacts.reduce((sum, a) => sum + (type === 'physical' ? a.strengthBonus : a.willBonus), 0)

  let skillBonus = 0
  if (type === 'physical') {
    if (player.heroClass.id === 'warrior') skillBonus += 1
    if (hasSkill(player, 'skill_weapon_master')) skillBonus += 1
    if (hasSkill(player, 'skill_shield_wall') && used.some((i) => i.type === 'shield')) skillBonus += 1
  } else {
    if (hasSkill(player, 'skill_iron_will')) skillBonus += 1
    if (hasSkill(player, 'skill_arcane')) skillBonus += 1
  }
  if (hasSkill(player, 'skill_woodcraft') && ctx.tile?.terrain === 'forest') skillBonus += 1
  if (hasSkill(player, 'skill_hunter') && ctx.monster?.combatType === 'physical') skillBonus += 1
  if (hasSkill(player, 'skill_dirty_fight') && ctx.vsPlayer) skillBonus += 2

  return {
    base,
    equipmentBonus,
    skillBonus,
    total: base + equipmentBonus + skillBonus + roll,
    used,
    unused,
  }
}

/** Součet bonusů zbroje a štítu, které hrdina v boji silou opravdu použije. */
export function calculatePlayerDefense(player: Player): number {
  return selectCombatLoadout(player, 'physical').used.reduce((sum, i) => sum + (i.defenseBonus || 0), 0)
}

export type CombatResult = 'win' | 'loss' | 'draw'

/** Jeden hod souboje podle pravidel ALTAR: hrdina i netvor hodí kostkou, vyšší součet vyhrává, rovnost = remíza. */
export function rollCombat(playerBase: number, enemyBase: number) {
  const playerRoll = Math.floor(Math.random() * 6) + 1
  const enemyRoll = Math.floor(Math.random() * 6) + 1
  const playerTotal = playerBase + playerRoll
  const enemyTotal = enemyBase + enemyRoll
  const result: CombatResult = playerTotal > enemyTotal ? 'win' : playerTotal < enemyTotal ? 'loss' : 'draw'
  return { playerRoll, enemyRoll, playerTotal, enemyTotal, result }
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
