export type TerrainType =
  | 'forest'
  | 'mountain'
  | 'plains'
  | 'water'
  | 'city'
  | 'training'
  | 'temple'
  | 'camp'
  | 'castle'
  | 'astral_gate'

export type SphereElement = 'fire' | 'ice' | 'shadow' | 'storm' | 'magic'

export type CombatType = 'physical' | 'mental' | 'both'

export interface Item {
  id: string
  name: string
  type: 'weapon' | 'armor' | 'shield' | 'potion' | 'accessory' | 'artifact'
  price: number
  strengthBonus?: number
  willBonus?: number
  defenseBonus?: number
  description: string
  effect?: string
  isEquipped?: boolean
  /** Kolik rukou předmět v boji zabere (zbraně, štíty, hole). Bez údaje = nedrží se v ruce. */
  hands?: 1 | 2
  /** Běžný (hnědý rub) nebo vzácný (zlatý rub) předmět */
  rarity?: 'common' | 'rare'
}

/** Pět cechů blízko středu plánu */
export type GuildId = 'fortress' | 'guild' | 'camp' | 'tower' | 'monastery'

export interface Skill {
  id: string
  name: string
  category: 'combat' | 'magic' | 'survival'
  costExp: number
  description: string
  effect: string
  guild?: GuildId
  /** Jednorázový výcvik: kartu hrdina nespotřebuje do schopností, jen trvale zvýší vlastnost */
  training?: 'strength' | 'will'
}

export interface Spell {
  id: string
  name: string
  willCost: number
  description: string
  combatBonus?: number
  effect: string
  guild?: GuildId
  costExp?: number
}

export interface Monster {
  id: string
  name: string
  combatType: CombatType
  strength: number
  will: number
  rewardGold: number
  rewardExp: number
  description: string
  specialAbility?: string
  image?: string
  /** Kořist navíc ke zlatu a zkušenostem: náhodný běžný nebo vzácný předmět */
  loot?: 'common' | 'rare'
}

export interface AdventureCard {
  id: string
  name: string
  terrain: 'forest' | 'mountain' | 'plains' | 'water'
  type: 'monster' | 'event' | 'treasure'
  monster?: Monster
  rewardGold?: number
  rewardExp?: number
  description: string
}

export interface Artifact {
  id: string
  name: string
  sphereElement: SphereElement
  strengthBonus: number
  willBonus: number
  description: string
  specialPower: string
}

export interface AstralSphere {
  id: SphereElement
  name: string
  elementName: string
  color: string
  description: string
  hazardRules: string
  guardian: Monster
  artifact: Artifact
  gateTileId: number
}

export interface BoardTile {
  id: number
  name: string
  image?: string
  terrain: TerrainType
  connections: number[]
  waterConnections?: number[]
  description: string
  specialActionTitle?: string
  hasAstralGate?: SphereElement
  hasPort?: boolean
  hasMagicGate?: boolean
  nearSphere?: SphereElement
  isGuild?: boolean
  workAction?: {
    type: 'city_work' | 'guild_work' | 'fortress_training'
    title: string
    description: string
    costHp?: number
    costWill?: number
    rewardGold?: number
    rewardExp?: number
  }
}

export interface HeroClass {
  id: string
  name: string
  title: string
  description: string
  avatar: string
  image?: string
  baseStrength: number
  baseWill: number
  baseGold: number
  startTileId: number
  passiveAbility: string
  /** Dva cechy, jejichž je postava členem (výcvik bez příplatku ve zlatě) */
  guilds: GuildId[]
}

/** Karta dobrodružství ležící na poli */
export interface TileCard {
  uid: string
  cardId: string
  faceUp: boolean
  /** Předem vylosovaná kořist, aby ji hráč viděl ještě před bojem */
  lootItemId?: string
}

export type ChanceKind =
  | 'terrain'
  | 'guild'
  | 'free_training'
  | 'market'
  | 'calm'
  | 'wind'
  | 'charity'
  | 'crisis'

export interface ChanceCard {
  id: string
  name: string
  kind: ChanceKind
  text: string
  terrain?: 'forest' | 'mountain' | 'plains'
  guild?: GuildId
  marketTileId?: number
  wind?: 'fresh' | 'magic' | 'kind' | 'good_times'
}

export interface Player {
  id: string
  name: string
  heroClass: HeroClass
  currentStrength: number
  maxStrength: number
  currentWill: number
  maxWill: number
  gold: number
  experience: number
  currentTileId: number
  currentSphereId?: SphereElement
  inventory: Item[]
  skills: Skill[]
  spells: Spell[]
  artifacts: Artifact[]
  isAI?: boolean
  /** Číslo kola, ve kterém hrdina využil Únik do stínů (jednou za kolo) */
  escapeUsedTurn?: number
}

export type GamePhase =
  | 'START'
  | 'MOVEMENT'
  | 'TILE_ACTION'
  | 'ADVENTURE_DRAW'
  | 'COMBAT'
  | 'SHOP'
  | 'END_TURN'
  | 'GAME_OVER'

export interface CombatState {
  enemy: Monster
  isSphereGuardian: boolean
  round: number
  combatType: 'physical' | 'mental'
  playerRoll: number | null
  enemyRoll: number | null
  playerTotalAttack: number | null
  enemyTotalAttack: number | null
  log: string[]
  isFinished: boolean
  playerWon: boolean | null
  result?: 'win' | 'loss' | 'draw'
  invokedMentalCostPaid?: boolean
}

export interface GameState {
  players: Player[]
  activePlayerIndex: number
  phase: GamePhase
  turnNumber: number
  diceValues: [number, number]
  isDiceRolling: boolean
  currentCard: AdventureCard | null
  combat: CombatState | null
  gameLog: string[]
  winner: Player | null
  /** Karty dobrodružství ležící na polích (klíč = id pole), nejvýš dvě */
  tileCards: Record<number, TileCard[]>
  adventureDecks: Record<'forest' | 'mountain' | 'plains', string[]>
  adventureDiscard: Record<'forest' | 'mountain' | 'plains', string[]>
  chanceDeck: string[]
  chanceDiscard: string[]
  /** Schopnosti nabízené v cechu (klíč = id pole cechu), [0] je nejstarší */
  guildOffers: Record<number, string[]>
  guildDecks: Record<GuildId, string[]>
  /** Zboží ležící na prodej ve Městě a Vesnici (id instancí předmětů) */
  marketGoods: Record<number, string[]>
  commonDeck: string[]
  rareDeck: string[]
  itemDiscard: string[]
  /** Artefakty padlých postav ležící na poli */
  tileArtifacts: Record<number, Artifact[]>
  /** Poslední karta náhody, aby ji viděli všichni hráči */
  lastChance: { cardId: string; playerName: string; detail: string } | null
  /** Hráč, který má díky Klidným časům v tomto kole ještě jeden tah */
  extraTurnFor: string | null
  /** Hráči v bezpečí po noclehu v hospodě (do svého dalšího tahu) */
  safeInInn: string[]
  /** Závěrečný boj: favorité na bitevním poli */
  finalBattle: { tileId: number } | null
}
