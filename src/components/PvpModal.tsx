import { calculatePlayerAttack } from '../engine/gameEngine'
import { mentalCostVsPlayer, PvpOutcome } from '../engine/rules'
import { Player } from '../engine/types'

interface PvpModalProps {
  attacker: Player
  defender: Player
  finalBattle: boolean
  outcome: PvpOutcome | null
  onAttack: (mode: 'physical' | 'mental') => void
  onClose: () => void
}

/** Boj s jinou postavou: útočník volí sílu, nebo zaplatí za vyvolání boje vůlí; rozhodne jeden hod */
export function PvpModal({ attacker, defender, finalBattle, outcome, onAttack, onClose }: PvpModalProps) {
  const cost = mentalCostVsPlayer(defender)
  const row = (p: Player, mode: 'physical' | 'mental') => calculatePlayerAttack(p, mode, 0, { vsPlayer: true }).total
  return (
    <div className="battle-overlay" role="presentation">
      <section className="battle-dialog" role="dialog" aria-modal="true" aria-label="Boj s postavou">
        <div className="battle-scroll">
          <header className="battle-heading">
            <div><span className="battle-eyebrow">{finalBattle ? 'ZÁVĚREČNÝ BOJ' : 'BOJ S POSTAVOU'}</span><h2>{attacker.name} proti {defender.name}</h2></div>
            <span className="battle-heading-icon" aria-hidden="true">⚔</span>
          </header>
          <div className="battle-rows">
            <div className="battle-row"><strong>{row(attacker, 'physical')}</strong><span>⚔ Síla</span><strong>{row(defender, 'physical')}</strong></div>
            <div className="battle-row"><strong>{row(attacker, 'mental')}</strong><span>✦ Vůle</span><strong>{row(defender, 'mental')}</strong></div>
          </div>
          <p className="battle-hint">
            Na boj silou může obránce odpovědět vyvoláním boje vůlí. Poražený {finalBattle ? 'odevzdá vítězi jeden artefakt' : 'ztratí 1 život, nebo dá vítězi předmět podle jeho volby'}. Remíza nic nemění.
            {defender.artifacts.length > 0 && ` Soupeř má ${defender.artifacts.length} artefakt(y), boj vůlí proti němu stojí ${cost} magů.`}
          </p>
          {outcome && (
            <div className={`battle-outcome ${outcome.result === 'win' ? 'is-win' : 'is-loss'}`} role="status">
              <strong>{outcome.result === 'win' ? 'Vítězství' : outcome.result === 'draw' ? 'Remíza' : 'Porážka'}</strong>
              <span>🎲 {outcome.attackerRoll} → {outcome.attackerTotal} : {outcome.defenderTotal} ← 🎲 {outcome.defenderRoll}</span>
              <span>{outcome.summary}</span>
            </div>
          )}
        </div>
        <footer className="battle-actions">
          {outcome ? (
            <button className="battle-button-primary" onClick={onClose}>Pokračovat</button>
          ) : (
            <>
              {!finalBattle && <button className="battle-button-secondary" onClick={onClose}>Zpět</button>}
              <button className="battle-button-secondary" disabled={attacker.currentWill < cost} onClick={() => onAttack('mental')}>
                ✦ Boj vůlí (−{cost} 🔮)
              </button>
              <button className="battle-button-primary" onClick={() => onAttack('physical')}>⚔ Zaútočit silou</button>
            </>
          )}
        </footer>
      </section>
    </div>
  )
}
