import { calculatePlayerAttack } from '../engine/gameEngine'
import { BoardTile, Monster, Player } from '../engine/types'

type BattleMode = 'physical' | 'mental'

interface BattleComparisonProps {
  player: Player
  enemy: Monster
  mode: BattleMode
  strength?: number
  will?: number
  playerRoll?: number | null
  enemyRoll?: number | null
  playerTotal?: number | null
  enemyTotal?: number | null
  spellBonus?: number
  tile?: BoardTile
}

export function BattleComparison({
  player, enemy, mode, strength = player.currentStrength, will = player.currentWill,
  playerRoll, enemyRoll, playerTotal, enemyTotal, spellBonus = 0, tile,
}: BattleComparisonProps) {
  const livePlayer = { ...player, currentStrength: strength, currentWill: will }
  const physical = calculatePlayerAttack(livePlayer, 'physical', 0, { monster: enemy, tile })
  const mental = calculatePlayerAttack(livePlayer, 'mental', 0, { monster: enemy, tile })
  const physicalPreview = physical.total + (mode === 'physical' ? spellBonus : 0)
  const mentalPreview = mental.total + (mode === 'mental' ? spellBonus : 0)
  const hasRoll = playerTotal != null && enemyTotal != null

  return (
    <div className="battle-comparison" aria-label="Porovnání hrdiny a nepřítele">
      <div className="battle-side battle-hero">
        <div className="battle-portrait">
          {player.heroClass.image ? <img src={player.heroClass.image} alt="" /> : player.heroClass.avatar}
        </div>
        <div className="battle-side-name">Tvůj hrdina</div>
        <div className="battle-side-sub">{player.heroClass.name}</div>
      </div>
      <div className="battle-side battle-enemy">
        <div className="battle-portrait">
          {enemy.image ? <img src={enemy.image} alt="" /> : '👹'}
        </div>
        <div className="battle-side-name">{enemy.name}</div>
        <div className="battle-side-sub">Nepřítel</div>
      </div>
      <div className="battle-rows">
        <div className={`battle-row ${mode === 'physical' ? 'is-active' : ''}`}>
          <strong>{physicalPreview}</strong><span>⚔ Síla</span><strong>{enemy.strength}</strong>
        </div>
        <div className={`battle-row ${mode === 'mental' ? 'is-active' : ''}`}>
          <strong>{mentalPreview}</strong><span>✦ Vůle</span><strong>{enemy.will}</strong>
        </div>
        {hasRoll && (
          <div className="battle-result" aria-live="polite">
            <span className="battle-result-caption">Poslední hod</span>
            <div><small>Hrdina 🎲 {playerRoll}</small><strong>{playerTotal}</strong></div>
            <span>:</span>
            <div><small>Nepřítel · 🎲 {enemyRoll}</small><strong>{enemyTotal}</strong></div>
          </div>
        )}
      </div>
      <div className="battle-formula">
        Příští hod: základ {mode === 'physical' ? strength : will} + výbava {mode === 'physical' ? physical.equipmentBonus : mental.equipmentBonus}
        {(mode === 'physical' ? physical.skillBonus : mental.skillBonus) > 0 ? ` + schopnosti ${mode === 'physical' ? physical.skillBonus : mental.skillBonus}` : ''}
        {spellBonus > 0 ? ` + kouzlo ${spellBonus}` : ''} + hod 🎲 1–6
        <span>proti {mode === 'physical' ? enemy.strength : enemy.will} + hod 🎲 1–6</span>
      </div>
    </div>
  )
}
