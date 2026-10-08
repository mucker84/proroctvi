// Simulace partií bot proti botovi nad skutečnými pravidly (engine/rules.ts + engine/ai.ts).
// Spuštění: npx vite build --ssr scripts/sim.ts --outDir node_modules/.sim && node node_modules/.sim/sim.js [počet]
import { ADVENTURE_CARDS, CHANCE_CARDS } from '../src/data/cards'
import { ASTRAL_SPHERES } from '../src/data/spheres'
import { HERO_CLASSES } from '../src/data/characters'
import { decideAIMovement, resolveAICombat, runAIActions } from '../src/engine/ai'
import { createGame, doWork, endTurn, executeMove, resolveGuardianFight } from '../src/engine/rules'
import { BOARD_TILES } from '../src/data/board'
import { GameState } from '../src/engine/types'

const games = Number(process.argv[2] || 200)
const MAX_TURNS = 600
const problems: string[] = []
const stats = { wins: 0, finalBattles: 0, finalBattleWins: 0, stalled: 0, deaths: 0, turns: 0, pvp: 0, chance: new Map<string, number>() }

function check(s: GameState, label: string) {
  const onTiles = Object.values(s.tileCards).flat().length
  const advTotal = Object.values(s.adventureDecks).flat().length + Object.values(s.adventureDiscard).flat().length + onTiles
  if (advTotal !== ADVENTURE_CARDS.length) problems.push(`${label}: karet dobrodružství ${advTotal} místo ${ADVENTURE_CARDS.length}`)
  if (s.chanceDeck.length + s.chanceDiscard.length !== CHANCE_CARDS.length) problems.push(`${label}: karet náhody ${s.chanceDeck.length + s.chanceDiscard.length}`)
  for (const [tileId, cards] of Object.entries(s.tileCards)) if (cards.length > 2) problems.push(`${label}: na poli ${tileId} je ${cards.length} karet`)
  const artifacts = s.players.reduce((n, p) => n + p.artifacts.length, 0) + Object.values(s.tileArtifacts).flat().length
  if (artifacts > ASTRAL_SPHERES.length) problems.push(`${label}: ${artifacts} artefaktů`)
  for (const p of s.players) {
    if (p.currentStrength < 0 || p.currentWill < 0 || p.gold < 0 || p.experience < 0) problems.push(`${label}: záporná hodnota u ${p.name}`)
    if (p.maxStrength > 8 || p.maxWill > 10) problems.push(`${label}: přes strop vlastností u ${p.name}`)
    if (p.skills.length + p.spells.length > 7) problems.push(`${label}: víc než 7 schopností`)
    const ids = p.inventory.map((i) => i.id)
    if (new Set(ids).size !== ids.length) problems.push(`${label}: duplicitní instance předmětu u ${p.name}`)
  }
}

for (let g = 0; g < games; g++) {
  const heroes = [...HERO_CLASSES].sort(() => Math.random() - 0.5)
  let s = createGame([
    { name: `A-${heroes[0].id}`, heroClassId: heroes[0].id, isAI: true },
    { name: `B-${heroes[1].id}`, heroClassId: heroes[1].id, isAI: true },
  ])
  let sawFinal = false
  let turn = 0
  try {
    for (; turn < MAX_TURNS && !s.winner; turn++) {
      const idx = s.activePlayerIndex
      const before = s.gameLog.length
      const choice = decideAIMovement(s, idx)
      if (choice.type === 'enter_sphere' && choice.sphereId) {
        const sphere = ASTRAL_SPHERES.find((sp) => sp.id === choice.sphereId)!
        const fight = resolveAICombat(s.players[idx], sphere.guardian, true, { tile: BOARD_TILES[s.players[idx].currentTileId] })
        s = { ...s, players: s.players.map((p, i) => (i === idx ? { ...p, currentWill: fight.newWill } : p)) }
        s = resolveGuardianFight(s, idx, sphere.id, fight.result)
      } else {
        const workType = choice.id.replace('work-', '') as 'city_work' | 'guild_work' | 'fortress_training'
        s = choice.type === 'work' ? doWork(s, idx, workType) : executeMove(s, idx, choice)
        s = runAIActions(s, idx)
      }
      if (s.finalBattle) sawFinal = true
      for (const line of s.gameLog.slice(0, Math.max(0, s.gameLog.length - before + 5))) {
        if (line.includes('zahynul')) stats.deaths++
      }
      if (!s.winner) s = endTurn(s)
      const ch = s.lastChance?.cardId.split('#')[0]
      if (ch) stats.chance.set(ch, (stats.chance.get(ch) || 0) + 1)
      for (const p of s.players) {
        // Zlato může přibýt kartou náhody v cizím tahu (pravidla to dovolují), zkušenosti a předměty ne
        if (p.experience > 15 && s.players[s.activePlayerIndex].id !== p.id) problems.push(`hra ${g}: ${p.name} má po konci tahu ${p.experience} zkušeností`)
        if (p.inventory.length > 7 && s.players[s.activePlayerIndex].id !== p.id) problems.push(`hra ${g}: ${p.name} má ${p.inventory.length} předmětů`)
      }
      check(s, `hra ${g} tah ${turn}`)
    }
  } catch (err) {
    problems.push(`hra ${g} tah ${turn}: VÝJIMKA ${(err as Error).stack}`)
  }
  stats.turns += turn
  if (sawFinal) stats.finalBattles++
  if (s.winner) {
    stats.wins++
    if (sawFinal) stats.finalBattleWins++
  } else stats.stalled++
}

console.log(`Partií: ${games}, s vítězem: ${stats.wins}, bez vítěze po ${MAX_TURNS} tazích: ${stats.stalled}`)
console.log(`Průměrně tahů: ${(stats.turns / games).toFixed(0)}, závěrečný boj: ${stats.finalBattles} (vyhráno ${stats.finalBattleWins}), úmrtí: ${stats.deaths}`)
console.log(`Problémů: ${problems.length}`)
for (const p of [...new Set(problems)].slice(0, 15)) console.log(' - ' + p)
process.exit(problems.length ? 1 : 0)
