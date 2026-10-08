// Reproducible audit of the room protocol. Uses only isolated process memory.
// Run: node scripts/audit-room.mjs
import { writeFile, mkdir } from 'node:fs/promises'

process.env.DUM_MEMORY = '1'
globalThis.fetch = async () => { throw new Error('Network is disabled in this audit.') }
const { handle } = await import('../server/room.mjs')

const initialState = () => ({
  players: [
    { id: 'p-1', name: 'Host', heroClass: { id: 'warrior' }, gold: 5 },
    { id: 'p-2', name: 'Waiting', heroClass: { id: 'mage' }, gold: 3 },
  ],
  activePlayerIndex: 0, phase: 'START', turnNumber: 1,
  diceValues: [1, 1], isDiceRolling: false,
  currentCard: null, combat: null, gameLog: [], winner: null,
})

async function room() {
  const initial = initialState()
  const host = await handle({ action: 'create', name: 'Host', heroClassId: 'warrior', initialState: initial })
  const guest = await handle({ action: 'join', code: host.code, name: 'Guest', heroClassId: 'ranger' })
  return { initial, host, guest }
}

const checks = []
async function check(id, expected, run) {
  const actual = await run()
  checks.push({ id, expected, ...actual })
}

await check('guest-hero-selection', 'Guest hero choice is reflected in the game state.', async () => {
  const { guest } = await room()
  return { passed: guest.state.players[1].heroClass.id === 'ranger', observed: guest.state.players[1].heroClass.id }
})

await check('host-start-preserves-guest', 'Starting with a pre-join host snapshot preserves the joined guest.', async () => {
  const { initial, host } = await room()
  const result = await handle({ action: 'start', code: host.code, token: host.token, state: initial })
  return { passed: result.state.players[1].name === 'Guest', observed: result.state.players[1].name }
})

await check('only-host-starts', 'Guest cannot start the room.', async () => {
  const { guest } = await room()
  try {
    await handle({ action: 'start', code: guest.code, token: guest.token })
    return { passed: false, observed: 'Guest start accepted.' }
  } catch (error) {
    return { passed: error.status === 403, observed: `HTTP ${error.status}` }
  }
})

await check('inactive-seat-update', 'Inactive player cannot replace the active game state.', async () => {
  const { host, guest } = await room()
  await handle({ action: 'start', code: host.code, token: host.token })
  const state = structuredClone(guest.state)
  state.players[1].gold = 999
  try {
    const result = await handle({ action: 'update', code: guest.code, token: guest.token, state })
    return { passed: false, observed: `Inactive guest update accepted; gold=${result.state.players[1].gold}.` }
  } catch (error) {
    return { passed: error.status === 403, observed: `HTTP ${error.status}` }
  }
})

await check('stale-state-update', 'An update based on an older revision is rejected.', async () => {
  const { host } = await room()
  const started = await handle({ action: 'start', code: host.code, token: host.token })
  const first = structuredClone(started.state)
  first.players[0].gold = 6
  await handle({ action: 'update', code: host.code, token: host.token, expectedV: started.v, state: first })
  const stale = structuredClone(started.state)
  stale.players[0].gold = 4
  try {
    const result = await handle({ action: 'update', code: host.code, token: host.token, expectedV: started.v, state: stale })
    return { passed: false, observed: `Stale update accepted; newer gold=6 overwritten with ${result.state.players[0].gold}.` }
  } catch (error) {
    return { passed: error.status === 409, observed: `HTTP ${error.status}` }
  }
})

const report = {
  date: '2026-10-08', scope: 'Local room handler, two seats in process memory, network disabled.',
  fixture: 'Minimal room-state fixture; this is not a complete gameplay or browser test.',
  checks,
}
await mkdir(new URL('../docs/reports/', import.meta.url), { recursive: true })
await writeFile(new URL('../docs/reports/2026-10-08-room-audit.json', import.meta.url), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
process.exitCode = checks.every(result => result.passed) ? 0 : 1
