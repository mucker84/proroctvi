import { BOARD_TILES } from '../data/board'
import {
  ADVENTURE_CARDS,
  ALL_ITEMS,
  AVAILABLE_SKILLS,
  AVAILABLE_SPELLS,
  CHANCE_CARDS,
  COMMON_COPIES,
  RARE_ITEMS,
} from '../data/cards'
import { ASTRAL_SPHERES } from '../data/spheres'
import {
  calculatePlayerAttack,
  CombatResult,
  createHero,
  createInitialGame,
  getClaimedSpheres,
  rollCombat,
  TacticalMovementOption,
} from './gameEngine'
import {
  AdventureCard,
  ChanceCard,
  GameState,
  GuildId,
  Item,
  Player,
  Skill,
  Spell,
  SphereElement,
  TileCard,
} from './types'

// Pravidla deskové hry Proroctví (ALTAR, 3. vydání) jako čisté funkce nad GameState.
// Každá funkce vrací nový stav, takže ho jde rovnou poslat druhému hráči online.

export type Terrain = 'forest' | 'mountain' | 'plains'

export const GUILD_TILE: Record<GuildId, number> = { fortress: 0, guild: 4, camp: 8, tower: 12, monastery: 16 }
export const GUILD_NAME: Record<GuildId, string> = {
  fortress: 'Pevnost',
  guild: 'Gilda',
  camp: 'Lesní tábor',
  tower: 'Magická věž',
  monastery: 'Klášter',
}
export const TILE_GUILD: Record<number, GuildId> = Object.fromEntries(
  Object.entries(GUILD_TILE).map(([g, t]) => [t, g as GuildId])
) as Record<number, GuildId>

export const MARKET_TILES = [5, 17]
const MARKET_SIZE: Record<number, number> = { 5: 3, 17: 2 }
/** Pole, kde nejde napadnout postavu bez artefaktu (Klášter, Lesní tábor; Vesnice po noclehu) */
const SAFE_TILES = [8, 16]
const MAX_ITEMS = 7
const MAX_SKILLS = 7
const MAX_GOLD = 15
const MAX_EXP = 15
const MAX_STRENGTH = 8
const MAX_WILL = 10

// ---------- pomocné ----------

const clone = <T,>(v: T): T => structuredClone(v)
const baseId = (instanceId: string) => instanceId.split('#')[0]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

let uidCounter = 0
const newUid = () => `${Date.now().toString(36)}${(uidCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function getAdventureCard(cardId: string): AdventureCard {
  return ADVENTURE_CARDS.find((c) => c.id === cardId) || ADVENTURE_CARDS[0]
}

export function getChanceCard(cardId: string): ChanceCard | undefined {
  return CHANCE_CARDS.find((c) => c.id === cardId)
}

/** Předmět podle id instance („item_sword#2“); id instance zůstává, aby šly rozlišit dva stejné meče. */
export function getItem(instanceId: string): Item {
  const item = ALL_ITEMS.find((i) => i.id === baseId(instanceId)) || ALL_ITEMS[0]
  return { ...item, id: instanceId }
}

export function getGuildCard(id: string): Skill | Spell | undefined {
  return AVAILABLE_SKILLS.find((s) => s.id === id) || AVAILABLE_SPELLS.find((s) => s.id === id)
}

export const guildCardCost = (card: Skill | Spell) => ('costExp' in card && card.costExp) || 3
export const isSpell = (card: Skill | Spell): card is Spell => 'willCost' in card

export const deckTerrain = (card: AdventureCard): Terrain =>
  card.terrain === 'water' ? 'mountain' : (card.terrain as Terrain)

function log(s: GameState, msg: string) {
  s.gameLog = [msg, ...s.gameLog].slice(0, 30)
}

const hasSkill = (p: Player, id: string) => p.skills.some((sk) => sk.id === id)

// ---------- balíčky ----------

function drawAdventure(s: GameState, terrain: Terrain): string | null {
  if (s.adventureDecks[terrain].length === 0) {
    s.adventureDecks[terrain] = shuffle(s.adventureDiscard[terrain])
    s.adventureDiscard[terrain] = []
  }
  return s.adventureDecks[terrain].shift() ?? null
}

function discardAdventure(s: GameState, cardId: string) {
  s.adventureDiscard[deckTerrain(getAdventureCard(cardId))].push(cardId)
}

function drawItem(s: GameState, rarity: 'common' | 'rare'): string | null {
  const key = rarity === 'rare' ? 'rareDeck' : 'commonDeck'
  if (s[key].length === 0) {
    const isRare = (id: string) => RARE_ITEMS.some((r) => r.id === baseId(id))
    const back = s.itemDiscard.filter((id) => isRare(id) === (rarity === 'rare'))
    s.itemDiscard = s.itemDiscard.filter((id) => !back.includes(id))
    s[key] = shuffle(back)
  }
  return s[key].shift() ?? null
}

function drawChance(s: GameState): ChanceCard | null {
  if (s.chanceDeck.length === 0) {
    s.chanceDeck = shuffle(s.chanceDiscard)
    s.chanceDiscard = []
  }
  const id = s.chanceDeck.shift()
  if (!id) return null
  s.chanceDiscard.push(id)
  return getChanceCard(id) ?? null
}

// ---------- karty na polích ----------

function placeAdventure(s: GameState, tileId: number, terrain: Terrain): string | null {
  const cards = s.tileCards[tileId] || []
  if (cards.length >= 2) return null
  const cardId = drawAdventure(s, terrain)
  if (!cardId) return null
  const card = getAdventureCard(cardId)
  const tileCard: TileCard = { uid: newUid(), cardId, faceUp: cards.length === 0 }
  if (card.monster?.loot) tileCard.lootItemId = drawItem(s, card.monster.loot) ?? undefined
  s.tileCards[tileId] = [...cards, tileCard]
  return tileCard.faceUp ? card.name : 'zakrytá karta'
}

/** Karta náhody Hory/Lesy/Pláně: karty na všechna pole terénu po směru hodinových ručiček od táhnoucího hráče */
function placeOnTerrain(s: GameState, terrain: Terrain, fromTileId: number): string[] {
  const total = BOARD_TILES.length
  const placed: string[] = []
  for (let step = 0; step < total; step++) {
    const tile = BOARD_TILES[(fromTileId + step) % total]
    if (tile.terrain !== terrain) continue
    const name = placeAdventure(s, tile.id, terrain)
    if (name) placed.push(`#${tile.id} ${name}`)
  }
  return placed
}

function placeGuildCard(s: GameState, guild: GuildId): string | null {
  const tileId = GUILD_TILE[guild]
  const offers = [...(s.guildOffers[tileId] || [])]
  const deck = [...s.guildDecks[guild]]
  const next = deck.shift()
  if (!next) return null
  if (offers.length >= 2) deck.push(offers.shift()!)
  offers.push(next)
  s.guildOffers[tileId] = offers
  s.guildDecks[guild] = deck
  return getGuildCard(next)?.name ?? null
}

function refreshMarket(s: GameState, tileId: number): string[] {
  s.itemDiscard.push(...(s.marketGoods[tileId] || []))
  const goods: string[] = []
  for (let i = 0; i < (MARKET_SIZE[tileId] ?? 2); i++) {
    const id = drawItem(s, 'common')
    if (id) goods.push(id)
  }
  s.marketGoods[tileId] = goods
  return goods.map((id) => getItem(id).name)
}

// ---------- založení hry ----------

export function createGame(configs: { name: string; heroClassId: string; isAI?: boolean }[]): GameState {
  const s = createInitialGame(configs)
  for (const t of ['forest', 'mountain', 'plains'] as Terrain[]) {
    s.adventureDecks[t] = shuffle(ADVENTURE_CARDS.filter((c) => deckTerrain(c) === t).map((c) => c.id))
  }
  s.commonDeck = shuffle(
    Object.entries(COMMON_COPIES).flatMap(([id, n]) => Array.from({ length: n }, (_, i) => `${id}#${i + 1}`))
  )
  s.rareDeck = shuffle(RARE_ITEMS.map((r) => `${r.id}#1`))
  s.chanceDeck = shuffle(CHANCE_CARDS.map((c) => c.id))
  for (const guild of Object.keys(GUILD_TILE) as GuildId[]) {
    s.guildDecks[guild] = shuffle(
      [...AVAILABLE_SKILLS, ...AVAILABLE_SPELLS].filter((c) => c.guild === guild).map((c) => c.id)
    )
    placeGuildCard(s, guild)
  }
  for (const tileId of MARKET_TILES) refreshMarket(s, tileId)
  // Počáteční situace: na všechna pole jednoho terénu jedna odkrytá karta
  const startTerrain = shuffle<Terrain>(['forest', 'mountain', 'plains'])[0]
  placeOnTerrain(s, startTerrain, 0)
  log(s, `Země se probouzí: dobrodružství se objevila na polích typu ${terrainName(startTerrain)}.`)
  return beginTurn(s)
}

const terrainName = (t: Terrain) => ({ forest: 'Les', mountain: 'Hory', plains: 'Pláně' })[t]

// ---------- tah ----------

function applyChance(s: GameState) {
  const player = s.players[s.activePlayerIndex]
  const card = drawChance(s)
  if (!card) return
  let detail = card.text
  const all = s.players
  switch (card.kind) {
    case 'terrain': {
      const placed = placeOnTerrain(s, card.terrain!, player.currentTileId)
      detail = placed.length ? `Nové karty: ${placed.join(', ')}.` : 'Všechna pole terénu jsou už plná.'
      break
    }
    case 'guild': {
      const name = placeGuildCard(s, card.guild!)
      detail = name ? `${GUILD_NAME[card.guild!]} nabízí: ${name}.` : `${GUILD_NAME[card.guild!]} už nemá co nabídnout.`
      break
    }
    case 'free_training': {
      const guild = player.heroClass.guilds[0]
      const name = placeGuildCard(s, guild)
      detail = name ? `${GUILD_NAME[guild]} (cech hráče ${player.name}) nabízí: ${name}.` : card.text
      break
    }
    case 'market': {
      const names = refreshMarket(s, card.marketTileId!)
      detail = `${BOARD_TILES[card.marketTileId!].name} nabízí: ${names.join(', ') || 'nic'}.`
      break
    }
    case 'calm':
      s.extraTurnFor = player.id
      break
    case 'wind':
      for (const p of all) {
        const drawer = p.id === player.id
        if (card.wind === 'fresh') p.currentStrength = Math.min(p.maxStrength, p.currentStrength + (drawer ? 2 : 1))
        if (card.wind === 'magic') p.currentWill = Math.min(p.maxWill, p.currentWill + (drawer ? 2 : 1))
        if (card.wind === 'kind') {
          p.currentStrength = Math.min(p.maxStrength, p.currentStrength + 1)
          p.currentWill = Math.min(p.maxWill, p.currentWill + 1)
        }
        if (card.wind === 'good_times') p.gold += drawer ? 2 : 1
      }
      break
    case 'charity': {
      const minGold = Math.min(...all.map((p) => p.gold))
      const maxWound = Math.max(...all.map((p) => p.maxStrength - p.currentStrength))
      for (const p of all) {
        if (p.gold === minGold) p.gold += 3
        if (maxWound > 0 && p.maxStrength - p.currentStrength === maxWound) p.currentStrength += 1
      }
      break
    }
    case 'crisis':
      for (const p of all) p.gold -= Math.floor(p.gold / 2)
      break
  }
  s.lastChance = { cardId: card.id, playerName: player.name, detail }
  log(s, `🎴 Karta náhody „${card.name}“ (${player.name}): ${detail}`)
}

/** Začátek tahu: karta náhody (pokud nejde o druhý tah z Klidných časů), konec bezpečí v hospodě, meditace */
export function beginTurn(state: GameState): GameState {
  const s = clone(state)
  const player = s.players[s.activePlayerIndex]
  s.phase = 'START'
  s.safeInInn = s.safeInInn.filter((id) => id !== player.id)
  if (hasSkill(player, 'skill_meditation')) player.currentWill = Math.min(player.maxWill, player.currentWill + 1)
  if (s.extraTurnFor === player.id) {
    s.extraTurnFor = null
    log(s, `${player.name} hraje druhý tah díky Klidným časům.`)
    return s
  }
  applyChance(s)
  return s
}

/** Konec tahu: odhození nadbytečného zlata, zkušeností a předmětů, další hráč a jeho karta náhody */
export function endTurn(state: GameState): GameState {
  const s = clone(state)
  const player = s.players[s.activePlayerIndex]
  player.gold = Math.min(MAX_GOLD, player.gold)
  player.experience = Math.min(MAX_EXP, player.experience)
  while (player.inventory.length > MAX_ITEMS) {
    const cheapest = [...player.inventory].sort((a, b) => a.price - b.price)[0]
    player.inventory = player.inventory.filter((i) => i.id !== cheapest.id)
    s.itemDiscard.push(cheapest.id)
    log(s, `${player.name} musel odhodit ${cheapest.name} (nejvýš ${MAX_ITEMS} předmětů).`)
  }
  if (s.extraTurnFor !== player.id) {
    // V závěrečném boji hrají jen favorité (hráči s artefaktem)
    do {
      s.activePlayerIndex = (s.activePlayerIndex + 1) % s.players.length
      if (s.activePlayerIndex === 0) s.turnNumber += 1
    } while (s.finalBattle && s.players[s.activePlayerIndex].artifacts.length === 0)
  }
  log(s, `Tah ukončen. Nyní hraje ${s.players[s.activePlayerIndex].name}.`)
  return beginTurn(s)
}

// ---------- pohyb a příchod na pole ----------

export function executeMove(state: GameState, pIdx: number, option: TacticalMovementOption): GameState {
  const s = clone(state)
  const player = s.players[pIdx]
  if (option.costGold > player.gold) return state
  player.gold -= option.costGold
  player.currentTileId = option.targetTileId
  const tile = BOARD_TILES[option.targetTileId]
  const how: Record<string, string> = {
    horse: `jel na koni na pole #${tile.id} ${tile.name} (−1 💰)`,
    ship: `se přeplavil lodí do #${tile.id} ${tile.name} (−1 💰)`,
    gate: `prošel magickou bránou na #${tile.id} ${tile.name} (−2 💰)`,
    boots: `přeletěl v Okřídlených botách na #${tile.id} ${tile.name}`,
    stay: `zůstává na poli #${tile.id} ${tile.name}`,
    walk: `došel pěšky na pole #${tile.id} ${tile.name}`,
  }
  log(s, `${player.name} ${how[option.type] ?? how.walk}.`)
  s.phase = 'TILE_ACTION'
  revealTile(s, tile.id)
  return s
}

export function doWork(state: GameState, pIdx: number, type: 'city_work' | 'guild_work' | 'fortress_training'): GameState {
  const s = clone(state)
  const p = s.players[pIdx]
  if (type === 'city_work') {
    if (p.currentWill < 1) return state
    p.currentWill -= 1
    p.gold += 2
    log(s, `${p.name} vykonal odbornou práci ve městě (−1 mag, +2 💰).`)
  } else if (type === 'guild_work') {
    if (p.currentWill < 1) return state
    p.currentWill -= 1
    p.gold += 3
    log(s, `${p.name} splnil špinavou práci pro Gildu (−1 vůle, +3 💰).`)
  } else {
    if (p.currentStrength <= 1) return state
    p.currentStrength -= 1
    p.experience += 2
    log(s, `${p.name} prošel drilem na cvičišti Pevnosti (−1 život, +2 ⭐).`)
  }
  s.phase = 'TILE_ACTION'
  return s
}

/** Kdo na pole přijde (nebo na něm zůstane), odkryje zakryté karty */
function revealTile(s: GameState, tileId: number) {
  const cards = s.tileCards[tileId]
  if (!cards?.some((c) => !c.faceUp)) return
  s.tileCards[tileId] = cards.map((c) => ({ ...c, faceUp: true }))
  const names = cards.filter((c) => !c.faceUp).map((c) => getAdventureCard(c.cardId).name)
  log(s, `Na poli #${tileId} se odkrylo: ${names.join(', ')}.`)
}

export function monstersOnTile(s: GameState, tileId: number): TileCard[] {
  return (s.tileCards[tileId] || []).filter((c) => c.faceUp && getAdventureCard(c.cardId).monster)
}

export function opportunitiesOnTile(s: GameState, tileId: number): TileCard[] {
  return (s.tileCards[tileId] || []).filter((c) => c.faceUp && !getAdventureCard(c.cardId).monster)
}

function removeTileCard(s: GameState, tileId: number, uid: string): TileCard | undefined {
  const card = (s.tileCards[tileId] || []).find((c) => c.uid === uid)
  if (!card) return undefined
  s.tileCards[tileId] = s.tileCards[tileId].filter((c) => c.uid !== uid)
  discardAdventure(s, card.cardId)
  return card
}

// ---------- výsledky bojů ----------

function grantVictory(s: GameState, p: Player, gold: number, exp: number, lootItemId?: string): string {
  const parts = [`+${gold} 💰`, `+${exp} ⭐`]
  p.gold += gold
  p.experience += exp
  if (hasSkill(p, 'skill_veteran')) { p.experience += 1; parts.push('+1 ⭐ Veterán') }
  if (hasSkill(p, 'skill_pickpocket')) { p.gold += 1; parts.push('+1 💰 Kapsářství') }
  if (p.heroClass.id === 'mercenary') { p.gold += 1; parts.push('+1 💰 kořist žoldnéře') }
  if (hasSkill(p, 'skill_first_aid') && p.currentStrength < p.maxStrength) { p.currentStrength += 1; parts.push('+1 ♥ ošetření') }
  if (lootItemId) {
    const item = getItem(lootItemId)
    p.inventory = [...p.inventory, item]
    parts.push(`🎁 ${item.name}${item.rarity === 'rare' ? ' (vzácný)' : ''}`)
  }
  return parts.join(', ')
}

/**
 * Prohra: −1 život. Kdo prohraje se silou 0, zahyne. Jeho artefakty zůstanou ležet na poli (nebo je získá vítěz
 * boje mezi postavami spolu se zlatem a předměty), schopnosti se vrátí dospod balíčků cechů a hráč pokračuje
 * novou postavou téhož povolání na startovním cechu (−1 život, −2 magy).
 */
function applyLoss(s: GameState, pIdx: number, killer?: Player): { died: boolean } {
  const p = s.players[pIdx]
  if (p.currentStrength > 0) {
    p.currentStrength -= 1
    return { died: false }
  }
  const tileId = p.currentTileId
  if (killer) {
    killer.gold += p.gold
    killer.inventory = [...killer.inventory, ...p.inventory]
    killer.artifacts = [...killer.artifacts, ...p.artifacts]
  } else {
    s.itemDiscard.push(...p.inventory.map((i) => i.id))
    if (p.artifacts.length) s.tileArtifacts[tileId] = [...(s.tileArtifacts[tileId] || []), ...p.artifacts]
  }
  for (const card of [...p.skills, ...p.spells]) {
    if (card.guild) s.guildDecks[card.guild].push(card.id)
  }
  const fresh = createHero(p.id, p.name, p.heroClass.id, p.isAI || false)
  fresh.currentStrength = Math.max(0, fresh.maxStrength - 1)
  fresh.currentWill = Math.max(0, fresh.maxWill - 2)
  s.players[pIdx] = fresh
  return { died: true }
}

export function resolveMonsterFight(state: GameState, pIdx: number, uid: string, rawResult: CombatResult): GameState {
  const s = clone(state)
  const p = s.players[pIdx]
  const tileId = p.currentTileId
  const tileCard = (s.tileCards[tileId] || []).find((c) => c.uid === uid)
  if (!tileCard) return state
  const card = getAdventureCard(tileCard.cardId)
  const monster = card.monster!
  let result = rawResult
  if (result === 'loss' && hasSkill(p, 'skill_shadow_escape') && p.escapeUsedTurn !== s.turnNumber) {
    p.escapeUsedTurn = s.turnNumber
    result = 'draw'
    log(s, `${p.name} unikl do stínů — prohra se mění v remízu.`)
  }
  if (result === 'win') {
    removeTileCard(s, tileId, uid)
    log(s, `⚔️ ${p.name} porazil ${monster.name}: ${grantVictory(s, p, monster.rewardGold, monster.rewardExp, tileCard.lootItemId)}.`)
  } else if (result === 'loss') {
    const { died } = applyLoss(s, pIdx)
    log(s, died
      ? `💀 ${p.name} zahynul v boji s ${monster.name}. Výbava propadla${p.artifacts.length ? ', artefakty leží na poli' : ''}; pokračuje nová postava.`
      : `${p.name} prohrál s ${monster.name} a ztratil 1 život. Netvor dál číhá na poli #${tileId}.`)
  } else {
    log(s, `${p.name} remizoval s ${monster.name}. Netvor dál číhá na poli #${tileId}.`)
  }
  return checkVictory(s, pIdx)
}

export function resolveGuardianFight(state: GameState, pIdx: number, sphereId: SphereElement, result: CombatResult): GameState {
  const s = clone(state)
  const p = s.players[pIdx]
  const sphere = ASTRAL_SPHERES.find((sp) => sp.id === sphereId)!
  if (result === 'win') {
    const reward = grantVictory(s, p, sphere.guardian.rewardGold, sphere.guardian.rewardExp)
    p.artifacts = [...p.artifacts, sphere.artifact]
    log(s, `🏆 ${p.name} porazil strážce ${sphere.name} a získal ${sphere.artifact.name}! (${reward})`)
  } else if (result === 'loss') {
    const { died } = applyLoss(s, pIdx)
    log(s, died ? `💀 ${p.name} zahynul ve sféře. Pokračuje nová postava.` : `${p.name} prohrál se strážcem sféry a ztratil 1 život.`)
  } else {
    log(s, `${p.name} remizoval se strážcem ${sphere.name}.`)
  }
  return checkVictory(s, pIdx)
}

/** Útěk před nestvůrou pravidla neznají; v adaptaci tah končí a nestvůra zůstává na poli. */
export function fleeFromMonster(state: GameState, pIdx: number, uid: string): GameState {
  const s = clone(state)
  const p = s.players[pIdx]
  const card = (s.tileCards[p.currentTileId] || []).find((c) => c.uid === uid)
  if (card) log(s, `${p.name} utekl před ${getAdventureCard(card.cardId).name}. Netvor dál číhá na poli #${p.currentTileId}.`)
  return s
}

// ---------- možnosti pole ----------

export function takeOpportunity(state: GameState, pIdx: number, uid: string): GameState {
  const s = clone(state)
  const p = s.players[pIdx]
  const card = removeTileCard(s, p.currentTileId, uid)
  if (!card) return state
  const adv = getAdventureCard(card.cardId)
  const bonus = p.heroClass.id === 'thief' ? 2 : 0
  p.gold += (adv.rewardGold || 0) + bonus
  p.experience += adv.rewardExp || 0
  log(s, `✨ ${p.name} využil příležitost ${adv.name}: +${(adv.rewardGold || 0) + bonus} 💰, +${adv.rewardExp || 0} ⭐${bonus ? ' (šikovné ruce zloděje)' : ''}.`)
  return s
}

export function pickUpArtifact(state: GameState, pIdx: number, artifactId: string): GameState {
  const s = clone(state)
  const p = s.players[pIdx]
  const lying = s.tileArtifacts[p.currentTileId] || []
  const art = lying.find((a) => a.id === artifactId)
  if (!art || monstersOnTile(s, p.currentTileId).length) return state
  s.tileArtifacts[p.currentTileId] = lying.filter((a) => a.id !== artifactId)
  p.artifacts = [...p.artifacts, art]
  log(s, `👑 ${p.name} zvedl artefakt ${art.name}.`)
  return checkVictory(s, pIdx)
}

export type ServiceId = 'monastery_heal' | 'camp_heal' | 'wasteland_mana' | 'tower_mana' | 'inn'

export interface TileService {
  id: ServiceId
  title: string
  detail: string
  cost: number
  oncePerTurn: boolean
  available: boolean
}

export function getTileServices(s: GameState, pIdx: number): TileService[] {
  const p = s.players[pIdx]
  const hurt = p.currentStrength < p.maxStrength
  const drained = p.currentWill < p.maxWill
  const list: TileService[] = []
  switch (p.currentTileId) {
    case 16:
      list.push({ id: 'monastery_heal', title: 'Požehnání kláštera', detail: 'Zdarma vyléčí 1 život (jednou za tah)', cost: 0, oncePerTurn: true, available: hurt })
      break
    case 8:
      list.push({ id: 'camp_heal', title: 'Ošetření v táboře', detail: '1 život za 1 💰, kolikrát chceš', cost: 1, oncePerTurn: false, available: hurt && p.gold >= 1 })
      break
    case 13:
      list.push({ id: 'wasteland_mana', title: 'Zřídlo magické pustiny', detail: 'Zdarma doplní 3 magy (jednou za tah)', cost: 0, oncePerTurn: true, available: drained })
      break
    case 12:
      list.push({ id: 'tower_mana', title: 'Magenergie ve věži', detail: '2 magy za 1 💰, kolikrát chceš', cost: 1, oncePerTurn: false, available: drained && p.gold >= 1 })
      break
    case 17:
      list.push({ id: 'inn', title: 'Nocleh v hospodě', detail: '1 💰: +1 život, +1 mag a bezpečí do tvého dalšího tahu', cost: 1, oncePerTurn: true, available: p.gold >= 1 })
      break
  }
  return list
}

export function applyService(state: GameState, pIdx: number, id: ServiceId): GameState {
  const s = clone(state)
  const p = s.players[pIdx]
  const service = getTileServices(state, pIdx).find((sv) => sv.id === id)
  if (!service?.available) return state
  p.gold -= service.cost
  if (id === 'monastery_heal' || id === 'camp_heal') p.currentStrength = Math.min(p.maxStrength, p.currentStrength + 1)
  if (id === 'wasteland_mana') p.currentWill = Math.min(p.maxWill, p.currentWill + 3)
  if (id === 'tower_mana') p.currentWill = Math.min(p.maxWill, p.currentWill + 2)
  if (id === 'inn') {
    p.currentStrength = Math.min(p.maxStrength, p.currentStrength + 1)
    p.currentWill = Math.min(p.maxWill, p.currentWill + 1)
    if (!s.safeInInn.includes(p.id)) s.safeInInn = [...s.safeInInn, p.id]
  }
  log(s, `${p.name}: ${service.title}${service.cost ? ` (−${service.cost} 💰)` : ''}.`)
  return s
}

export const buyPrice = (p: Player, item: Item) =>
  hasSkill(p, 'skill_merchant') ? Math.max(1, item.price - 1) : item.price
export const sellPrice = (item: Item) => Math.ceil(item.price / 2)

export function buyGood(state: GameState, pIdx: number, instanceId: string): GameState {
  const s = clone(state)
  const p = s.players[pIdx]
  const goods = s.marketGoods[p.currentTileId] || []
  if (!goods.includes(instanceId)) return state
  const item = getItem(instanceId)
  const price = buyPrice(p, item)
  if (p.gold < price) return state
  p.gold -= price
  p.inventory = [...p.inventory, item]
  s.marketGoods[p.currentTileId] = goods.filter((g) => g !== instanceId)
  log(s, `${p.name} koupil ${item.name} (−${price} 💰).`)
  return s
}

export function sellItem(state: GameState, pIdx: number, instanceId: string): GameState {
  const s = clone(state)
  const p = s.players[pIdx]
  if (!MARKET_TILES.includes(p.currentTileId)) return state
  const item = p.inventory.find((i) => i.id === instanceId)
  if (!item) return state
  p.inventory = p.inventory.filter((i) => i.id !== instanceId)
  p.gold += sellPrice(item)
  s.itemDiscard.push(instanceId)
  log(s, `${p.name} prodal ${item.name} (+${sellPrice(item)} 💰).`)
  return s
}

export function guildLearnCost(p: Player, guild: GuildId, card: Skill | Spell) {
  const exp = guildCardCost(card)
  return { exp, gold: p.heroClass.guilds.includes(guild) ? 0 : exp }
}

export function canLearn(p: Player, guild: GuildId, card: Skill | Spell): string | null {
  const { exp, gold } = guildLearnCost(p, guild, card)
  if (p.experience < exp) return `Chybí zkušenosti (${exp} ⭐)`
  if (p.gold < gold) return `Nejsi členem cechu, chybí ${gold} 💰`
  const training = 'training' in card ? card.training : undefined
  if (training === 'strength' && p.maxStrength >= MAX_STRENGTH) return `Síla je na maximu ${MAX_STRENGTH}`
  if (training === 'will' && p.maxWill >= MAX_WILL) return `Vůle je na maximu ${MAX_WILL}`
  if (!training && p.skills.length + p.spells.length >= MAX_SKILLS) return `Nejvýš ${MAX_SKILLS} schopností`
  if (p.skills.some((sk) => sk.id === card.id) || p.spells.some((sp) => sp.id === card.id)) return 'Už umíš'
  return null
}

export function learnFromGuild(state: GameState, pIdx: number, cardId: string): GameState {
  const s = clone(state)
  const p = s.players[pIdx]
  const guild = TILE_GUILD[p.currentTileId]
  const card = getGuildCard(cardId)
  if (!guild || !card || !(s.guildOffers[p.currentTileId] || []).includes(cardId) || canLearn(p, guild, card)) return state
  const { exp, gold } = guildLearnCost(p, guild, card)
  p.experience -= exp
  p.gold -= gold
  s.guildOffers[p.currentTileId] = s.guildOffers[p.currentTileId].filter((id) => id !== cardId)
  const training = 'training' in card ? card.training : undefined
  if (training === 'strength') {
    p.maxStrength += 1
    p.currentStrength += 1
    s.guildDecks[guild].push(cardId)
  } else if (training === 'will') {
    p.maxWill += 1
    p.currentWill += 1
    s.guildDecks[guild].push(cardId)
  } else if (isSpell(card)) {
    p.spells = [...p.spells, card]
  } else {
    p.skills = [...p.skills, card]
  }
  log(s, `${p.name} se v cechu ${GUILD_NAME[guild]} naučil: ${card.name} (−${exp} ⭐${gold ? `, −${gold} 💰 jako nečlen` : ''}).`)
  return s
}

export function drinkPotion(state: GameState, pIdx: number, instanceId: string): GameState {
  const s = clone(state)
  const p = s.players[pIdx]
  const item = p.inventory.find((i) => i.id === instanceId)
  if (!item || item.type !== 'potion') return state
  if (item.effect === 'heal_3_str') p.currentStrength = Math.min(p.maxStrength, p.currentStrength + 3)
  if (item.effect === 'heal_3_will') p.currentWill = Math.min(p.maxWill, p.currentWill + 3)
  if (item.effect === 'heal_full') {
    p.currentStrength = p.maxStrength
    p.currentWill = p.maxWill
  }
  p.inventory = p.inventory.filter((i) => i.id !== instanceId)
  s.itemDiscard.push(instanceId)
  log(s, `${p.name} použil ${item.name}.`)
  return s
}

// ---------- boj mezi postavami ----------

export function canAttackPlayer(s: GameState, aIdx: number, dIdx: number): string | null {
  const a = s.players[aIdx]
  const d = s.players[dIdx]
  if (aIdx === dIdx || a.currentTileId !== d.currentTileId) return 'Soupeř není na tvém poli'
  if (monstersOnTile(s, a.currentTileId).length) return 'Nejdřív musíš porazit nestvůry na poli'
  if (!s.finalBattle && d.artifacts.length === 0) {
    if (SAFE_TILES.includes(d.currentTileId)) return 'Soupeř je tu v bezpečí'
    if (s.safeInInn.includes(d.id)) return 'Soupeř je v bezpečí v hospodě'
  }
  return null
}

/** Cena za vyvolání boje vůlí proti postavě: 2 magy a 1 navíc za každý soupeřův artefakt */
export const mentalCostVsPlayer = (target: Player) => 2 + target.artifacts.length

export interface PvpOutcome {
  mode: 'physical' | 'mental'
  attackerTotal: number
  defenderTotal: number
  attackerRoll: number
  defenderRoll: number
  result: CombatResult
  summary: string
}

/**
 * Útočník zvolí boj silou, nebo zaplatí a vyvolá boj vůlí. Na boj silou může obránce odpovědět
 * vyvoláním boje vůlí (rozhodne se sám podle šancí). Oba hodí, vyšší součet vyhrává.
 * Poražený buď ztratí 1 život, nebo dá vítězi předmět dle vítězovy volby; v závěrečném boji odevzdá artefakt.
 */
export function resolvePvp(state: GameState, aIdx: number, dIdx: number, wanted: 'physical' | 'mental'): { state: GameState; outcome: PvpOutcome | null } {
  if (canAttackPlayer(state, aIdx, dIdx)) return { state, outcome: null }
  const s = clone(state)
  const a = s.players[aIdx]
  const d = s.players[dIdx]
  let mode = wanted
  const notes: string[] = []
  if (mode === 'mental') {
    const cost = mentalCostVsPlayer(d)
    if (a.currentWill < cost) return { state, outcome: null }
    a.currentWill -= cost
    notes.push(`${a.name} vyvolal boj vůlí (−${cost} magů)`)
  } else {
    const cost = mentalCostVsPlayer(a)
    const dStr = calculatePlayerAttack(d, 'physical', 0, { vsPlayer: true }).total
    const aStr = calculatePlayerAttack(a, 'physical', 0, { vsPlayer: true }).total
    const dWill = calculatePlayerAttack({ ...d, currentWill: d.currentWill - cost }, 'mental', 0, { vsPlayer: true }).total
    const aWill = calculatePlayerAttack(a, 'mental', 0, { vsPlayer: true }).total
    if (d.currentWill >= cost && dWill - aWill > dStr - aStr) {
      d.currentWill -= cost
      mode = 'mental'
      notes.push(`${d.name} odpověděl vyvoláním boje vůlí (−${cost} magů)`)
    }
  }
  const aBase = calculatePlayerAttack(a, mode, 0, { vsPlayer: true }).total
  const dBase = calculatePlayerAttack(d, mode, 0, { vsPlayer: true }).total
  const roll = rollCombat(aBase, dBase)
  let summary = `${a.name} ${roll.playerTotal} : ${roll.enemyTotal} ${d.name} (${mode === 'physical' ? 'boj silou' : 'boj vůlí'}). `
  if (roll.result === 'draw') {
    summary += 'Remíza, nic se neděje.'
  } else {
    const winner = roll.result === 'win' ? a : d
    const loserIdx = roll.result === 'win' ? dIdx : aIdx
    summary += `${winner.name} vítězí. ` + settlePvpLoss(s, loserIdx, winner)
  }
  log(s, `⚔️ ${[...notes, summary].join(' · ')}`)
  const checked = checkVictory(s, aIdx)
  return {
    state: checked,
    outcome: { mode, attackerTotal: roll.playerTotal, defenderTotal: roll.enemyTotal, attackerRoll: roll.playerRoll, defenderRoll: roll.enemyRoll, result: roll.result, summary },
  }
}

function settlePvpLoss(s: GameState, loserIdx: number, winner: Player): string {
  const loser = s.players[loserIdx]
  if (s.finalBattle && loser.artifacts.length) {
    const art = loser.artifacts[0]
    loser.artifacts = loser.artifacts.slice(1)
    winner.artifacts = [...winner.artifacts, art]
    return `${loser.name} odevzdává artefakt ${art.name}.`
  }
  // Poražený volí: život, nebo předmět. Bot i vzdálený hráč volí automaticky: život, dokud mu zbývají aspoň 2.
  const valuables = [...loser.artifacts.map((a) => ({ kind: 'artifact' as const, a })), ...loser.inventory.map((i) => ({ kind: 'item' as const, i }))]
  if (loser.currentStrength >= 2 || valuables.length === 0) {
    const { died } = applyLoss(s, loserIdx, winner)
    return died ? `${loser.name} zahynul; vítěz bere jeho zlato, předměty i artefakty.` : `${loser.name} ztrácí 1 život.`
  }
  // Vítěz si vybere: artefakt, jinak nejdražší předmět
  if (loser.artifacts.length) {
    const art = loser.artifacts[0]
    loser.artifacts = loser.artifacts.slice(1)
    winner.artifacts = [...winner.artifacts, art]
    return `${loser.name} raději nabídl výbavu a ${winner.name} si vzal artefakt ${art.name}.`
  }
  const best = [...loser.inventory].sort((x, y) => y.price - x.price)[0]
  loser.inventory = loser.inventory.filter((i) => i.id !== best.id)
  winner.inventory = [...winner.inventory, best]
  return `${loser.name} raději nabídl výbavu a ${winner.name} si vzal ${best.name}.`
}

// ---------- vítězství a závěrečný boj ----------

function checkVictory(s: GameState, pIdx: number): GameState {
  const p = s.players[pIdx]
  const champion = s.players.find((pl) => pl.artifacts.length >= 4)
  if (champion) {
    s.winner = champion
    s.phase = 'GAME_OVER'
    return s
  }
  const held = s.players.reduce((n, pl) => n + pl.artifacts.length, 0)
  if (s.finalBattle) {
    const favorites = s.players.filter((pl) => pl.artifacts.length > 0)
    if (favorites.length === 1) {
      s.winner = favorites[0]
      s.phase = 'GAME_OVER'
    }
    return s
  }
  if (held === ASTRAL_SPHERES.length) {
    s.finalBattle = { tileId: p.currentTileId }
    for (const pl of s.players) {
      if (pl.artifacts.length === 0) continue
      pl.currentTileId = p.currentTileId
      pl.currentStrength = pl.maxStrength
      pl.currentWill = pl.maxWill
    }
    log(s, `⚡ Všech pět artefaktů je rozebráno a nikdo nemá čtyři: ZAČÍNÁ ZÁVĚREČNÝ BOJ na poli #${p.currentTileId} ${BOARD_TILES[p.currentTileId].name}! Favorité se uzdravili a v každém tahu musí zaútočit na soupeře; poražený odevzdá artefakt.`)
  }
  return s
}

export const isFavorite = (s: GameState, p: Player) => !!s.finalBattle && p.artifacts.length > 0

export const claimedSpheresOf = (s: GameState) => getClaimedSpheres(s.players, s.tileArtifacts)
