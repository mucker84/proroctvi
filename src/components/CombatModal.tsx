import { useState } from 'react'
import { calculatePlayerAttack, CombatResult, rollCombat } from '../engine/gameEngine'
import { BoardTile, CombatState, Item, Player, Spell } from '../engine/types'
import { BattleComparison } from './BattleComparison'
import { LootLine } from './LootLine'

type BattleMode = 'physical' | 'mental'

interface CombatModalProps {
  player: Player
  combat: CombatState
  tile: BoardTile
  /** Předem vylosovaný předmět z kořisti nestvůry */
  lootItemId?: string
  onCombatEnd: (result: CombatResult) => void
  onUpdatePlayerStats: (newStrength: number, newWill: number) => void
  onFleeCombat?: () => void
}

interface RoundState {
  combat: CombatState
  strength: number
  will: number
  hits: number
}

function isSpellAvailable(spell: Spell, mode: BattleMode, will: number) {
  return spell.willCost <= will && (spell.id !== 'spell_mind_blast' || mode === 'mental')
}

// Jeden hod rozhoduje (pravidla ALTAR). Strážce sféry = nižší a vyšší strážce, tedy dvě vítězství po sobě.
function playRound(state: RoundState, player: Player, mode: BattleMode, spell: Spell | null, tile: BoardTile): RoundState {
  const cast = spell && isSpellAvailable(spell, mode, state.will) ? spell : null
  let strength = state.strength
  const will = state.will - (cast?.willCost ?? 0)
  let hits = state.hits
  const log = [...state.combat.log]
  if (cast?.id === 'spell_heal') strength = Math.min(player.maxStrength, strength + 3)

  const attack = calculatePlayerAttack({ ...player, currentStrength: strength, currentWill: will }, mode, 0, { monster: state.combat.enemy, tile })
  const enemyBase = mode === 'physical' ? state.combat.enemy.strength : state.combat.enemy.will
  const roll = rollCombat(attack.total + (cast?.combatBonus ?? 0), enemyBase)
  let result: CombatResult | undefined
  if (roll.result === 'win') {
    hits = Math.max(0, hits - 1)
    if (hits === 0) result = 'win'
  } else {
    result = roll.result === 'loss' && cast?.id === 'spell_shield_of_light' ? 'draw' : roll.result
  }

  log.push(`Hod ${state.combat.round} · ${mode === 'physical' ? 'Síla' : 'Vůle'}: hrdina ${roll.playerTotal} (🎲 ${roll.playerRoll}) : ${roll.enemyTotal} (🎲 ${roll.enemyRoll}) nepřítel${cast ? ` · ${cast.name}` : ''}`)
  if (roll.result === 'win') log.push(result === 'win' ? 'Vítězství! Nepřítel je poražen.' : 'Nižší strážce poražen! Na řadě je vyšší strážce.')
  else if (roll.result === 'loss' && result === 'draw') log.push('Světelný štít tě uchránil — hod končí remízou.')
  else if (result === 'loss') log.push('Prohra: hrdina ztrácí 1 život a jeho tah končí.')
  else log.push('Remíza: nic se neděje, nepřítel zůstává a tah končí.')

  return {
    strength, will, hits,
    combat: {
      ...state.combat, combatType: mode, round: state.combat.round + 1,
      playerRoll: roll.playerRoll, enemyRoll: roll.enemyRoll, playerTotalAttack: roll.playerTotal, enemyTotalAttack: roll.enemyTotal,
      log, isFinished: !!result, playerWon: result ? result === 'win' : null, result,
    },
  }
}

export function CombatModal({ player, combat, tile, lootItemId, onCombatEnd, onUpdatePlayerStats, onFleeCombat }: CombatModalProps) {
  const [state, setState] = useState<RoundState>({
    combat, strength: player.currentStrength, will: player.currentWill,
    hits: combat.isSphereGuardian ? 2 : 1,
  })
  const [mode, setMode] = useState<BattleMode>(combat.combatType === 'mental' ? 'mental' : 'physical')
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null)
  const [rolling, setRolling] = useState(false)
  const current = state.combat
  const canChooseMode = current.enemy.combatType === 'both'
  const canSwitchMode = current.round === 1 && current.playerRoll === null && !rolling && !current.isFinished
  const canAffordMental = state.will >= 2 || (current.invokedMentalCostPaid ?? false)
  const loadout = calculatePlayerAttack(player, mode, 0, { monster: current.enemy, tile })
  const itemBonus = (item: Item) => (mode === 'physical' ? (item.strengthBonus || 0) + (item.defenseBonus || 0) : item.willBonus || 0)
  const previewStrength = selectedSpell?.id === 'spell_heal' ? Math.min(player.maxStrength, state.strength + 3) : state.strength
  const previewWill = state.will - (selectedSpell?.willCost ?? 0)

  const handleSelectPhysical = () => {
    if (!canSwitchMode || mode === 'physical') return
    let nextWill = state.will
    let costPaid = current.invokedMentalCostPaid
    if (current.enemy.combatType === 'both' && current.invokedMentalCostPaid) {
      nextWill = Math.min(player.maxWill, state.will + 2)
      costPaid = false
      onUpdatePlayerStats(state.strength, nextWill)
    }
    setMode('physical')
    setSelectedSpell(null)
    setState((prev) => ({
      ...prev,
      will: nextWill,
      combat: {
        ...prev.combat,
        combatType: 'physical',
        invokedMentalCostPaid: costPaid,
      },
    }))
  }

  const handleSelectMental = () => {
    if (!canSwitchMode || mode === 'mental') return
    let nextWill = state.will
    let costPaid = current.invokedMentalCostPaid
    if (current.enemy.combatType === 'both' && !current.invokedMentalCostPaid) {
      if (state.will < 2) return
      nextWill = state.will - 2
      costPaid = true
      onUpdatePlayerStats(state.strength, nextWill)
    }
    setMode('mental')
    setSelectedSpell(null)
    setState((prev) => ({
      ...prev,
      will: nextWill,
      combat: {
        ...prev.combat,
        combatType: 'mental',
        invokedMentalCostPaid: costPaid,
      },
    }))
  }

  const commit = (next: RoundState) => {
    setState(next)
    setSelectedSpell(null)
    if (next.strength !== state.strength || next.will !== state.will) onUpdatePlayerStats(next.strength, next.will)
  }

  const attack = () => {
    if (rolling || current.isFinished) return
    setRolling(true)
    window.setTimeout(() => {
      commit(playRound(state, player, mode, selectedSpell, tile))
      setRolling(false)
    }, 380)
  }

  const quickFight = () => {
    if (rolling || current.isFinished) return
    let next = state
    let rounds = 0
    do {
      next = playRound(next, player, mode, rounds === 0 ? selectedSpell : null, tile)
      rounds++
    } while (!next.combat.isFinished && rounds < 100)
    commit(next)
  }

  return (
    <div className="battle-overlay" role="presentation">
      <section className="battle-dialog" role="dialog" aria-modal="true" aria-label="Souboj">
        <div className="battle-scroll">
          <header className="battle-heading">
            <div><span className="battle-eyebrow">{combat.isSphereGuardian ? 'STRÁŽCE SFÉRY' : 'DOBRODRUŽSTVÍ'} · KOLO {current.round}</span><h2>Souboj</h2></div>
            <span className="battle-heading-icon" aria-hidden="true">{combat.isSphereGuardian ? '✦' : '⚔'}</span>
          </header>

          <div className="battle-resource-row"><span>Hrdina <b>♥ {state.strength}/{player.maxStrength}</b><b>✦ {state.will}/{player.maxWill}</b></span><span>Protivník <b>{state.hits} {state.hits === 1 ? 'zásah' : 'zásahy'}</b></span></div>

          <p className="battle-section-title">Způsob boje</p>
          <div className="battle-mode-choices" role="group" aria-label="Způsob boje">
            <button
              className={mode === 'physical' ? 'is-selected' : ''}
              disabled={!canSwitchMode || current.enemy.combatType === 'mental'}
              onClick={handleSelectPhysical}
            >
              ⚔ Síla <small>{current.enemy.combatType === 'mental' ? 'nedostupná' : 'zbraně a zbroj · zdarma'}</small>
            </button>
            <button
              className={mode === 'mental' ? 'is-selected' : ''}
              disabled={!canSwitchMode || current.enemy.combatType === 'physical' || (!canAffordMental && mode !== 'mental')}
              onClick={handleSelectMental}
              title={!canAffordMental ? 'Nemáš dost Vůle (min. 2 🔮)' : ''}
            >
              ✦ Vůle <small>{current.enemy.combatType === 'physical' ? 'nedostupná' : current.enemy.combatType === 'both' ? 'kouzla a mysl · stojí 2 🔮' : 'kouzla a mysl · zdarma'}</small>
            </button>
          </div>
          {!canChooseMode && <p className="battle-hint">Tento nepřítel vyžaduje {mode === 'physical' ? 'boj silou' : 'boj vůlí'}.</p>}
          {canChooseMode && !canSwitchMode && <p className="battle-hint">Způsob boje je pro tento souboj uzamčen ({mode === 'physical' ? 'fyzický boj' : 'boj vůlí'}).</p>}
          {canChooseMode && canSwitchMode && mode === 'mental' && <p className="battle-hint">🔮 Bojuješ vůlí: Za navázání duševního kontaktu odečteny 2 Vůle.</p>}

          <BattleComparison player={player} enemy={current.enemy} mode={mode} strength={previewStrength} will={previewWill}
            playerRoll={current.playerRoll} enemyRoll={current.enemyRoll} playerTotal={current.playerTotalAttack} enemyTotal={current.enemyTotalAttack}
            spellBonus={selectedSpell?.combatBonus ?? 0} tile={tile} />
          {current.enemy.specialAbility && <p className="battle-warning">⚠ {current.enemy.specialAbility}</p>}

          {!current.isFinished && <>
            <p className="battle-section-title">Výbava v boji <span>dvě ruce · jedna hlava · jedna zbroj</span></p>
            <div className="battle-equipment">
              {loadout.used.length ? loadout.used.map((item) => (
                <span key={item.id}>⚔ {item.name}{item.hands === 2 ? ' (obouruční)' : ''} <b>+{itemBonus(item)} {mode === 'physical' ? 'síla' : 'vůle'}</b></span>
              )) : <span>Bez výbavy · základní {mode === 'physical' ? 'síla' : 'vůle'} hrdiny</span>}
              {player.artifacts.map((art) => <span key={art.id}>✦ {art.name} <b>+{mode === 'physical' ? art.strengthBonus : art.willBonus}</b></span>)}
              {loadout.skillBonus > 0 && <span>★ Schopnosti a povolání <b>+{loadout.skillBonus}</b></span>}
            </div>
            {loadout.unused.length > 0 && (
              <p className="battle-hint">
                Nepoužito: {loadout.unused.map((item) => `${item.name} (${itemBonus(item) > 0 ? 'ruce nebo místo jsou obsazené' : mode === 'physical' ? 'v boji silou nepomáhá' : 'v boji vůlí nepomáhá'})`).join(', ')}.
              </p>
            )}

            <p className="battle-section-title">Kouzlo <span>volitelné před hodem</span></p>
            <div className="battle-spells" role="group" aria-label="Kouzlo pro toto kolo">
              <button className={!selectedSpell ? 'is-selected' : ''} onClick={() => setSelectedSpell(null)} disabled={rolling}>Bez kouzla<small>0 vůle</small></button>
              {player.spells.map((spell) => {
                const available = isSpellAvailable(spell, mode, state.will)
                return <button key={spell.id} className={selectedSpell?.id === spell.id ? 'is-selected' : ''} disabled={!available || rolling} onClick={() => setSelectedSpell(spell)} title={spell.effect}>
                  {spell.name}<small>−{spell.willCost} vůle · {spell.effect}</small>
                </button>
              })}
            </div>
            {player.spells.length === 0 && <p className="battle-hint">Hrdina zatím nezná žádné kouzlo.</p>}
            {selectedSpell && <p className="battle-hint">Vybráno: {selectedSpell.name}. Účinek se použije v příštím kole.</p>}
          </>}

          {current.isFinished && <div className={`battle-outcome ${current.result === 'win' ? 'is-win' : 'is-loss'}`} role="status">
            <strong>{current.result === 'win' ? 'Vítězství' : current.result === 'draw' ? 'Remíza' : 'Porážka'}</strong>
            {current.result === 'win' && <LootLine label="Kořist" gold={current.enemy.rewardGold} exp={current.enemy.rewardExp} itemId={lootItemId} />}
            {current.result === 'loss' && <span>−1 život{state.strength === 0 ? ' · při síle 0 to znamená smrt postavy' : ''}{combat.isSphereGuardian ? '' : ' · netvor zůstává na poli'}</span>}
            {current.result === 'draw' && <span>Nic se nestalo{combat.isSphereGuardian ? '' : ' · netvor zůstává na poli'}</span>}
          </div>}
          <details className="battle-log"><summary>Průběh boje · {current.log.length} záznamů</summary><ol>{current.log.map((entry, index) => <li key={index}>{entry}</li>)}</ol></details>
        </div>

        <footer className="battle-actions">
          {current.isFinished ? <button className="battle-button-primary" onClick={() => onCombatEnd(current.result ?? 'loss')}>{current.result === 'win' ? 'Sebrat kořist a pokračovat' : 'Pokračovat'}</button> : <>
            <button className="battle-button-secondary" disabled={rolling} onClick={() => onFleeCombat ? onFleeCombat() : onCombatEnd('loss')}>Uprchnout</button>
            <button className="battle-button-secondary" disabled={rolling} onClick={quickFight}>Rychlý boj</button>
            <button className="battle-button-primary" disabled={rolling} onClick={attack}>{rolling ? 'Házím…' : '🎲 Hodit kostkou'}</button>
          </>}
        </footer>
      </section>
    </div>
  )
}
