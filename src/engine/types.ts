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
}

export interface Skill {
  id: string
  name: string
  category: 'combat' | 'magic' | 'survival'
  costExp: number
  description: string
  effect: string
}

export interface Spell {
  id: string
  name: string
  willCost: number
  description: string
  combatBonus?: number
  effect: string
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
  /** Neporažení netvoři ležící na polích (klíč = id pole), podle pravidel ALTAR */
  tileMonsters?: Record<number, AdventureCard>
}
