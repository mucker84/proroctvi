import { useState } from 'react'
import { BattleComparison } from './BattleComparison'
import { AdventureCard, Player } from '../engine/types'

interface CardModalProps {
  card: AdventureCard
  player?: Player
  onEngageCombat: (chosenMode: 'physical' | 'mental') => void
  onClaimTreasure: () => void
  onFlee: () => void
}

export function CardModal({ card, player, onEngageCombat, onClaimTreasure, onFlee }: CardModalProps) {
  const [revealed, setRevealed] = useState(false)
  const monster = card.monster
  const physicalAllowed = monster?.combatType !== 'mental'
  const mentalAllowed = monster?.combatType !== 'physical'
  const isBoth = monster?.combatType === 'both'

  const [mode, setMode] = useState<'physical' | 'mental'>(
    monster?.combatType === 'mental' ? 'mental' : 'physical'
  )

  const terrainName = { forest: 'Les', mountain: 'Hory', plains: 'Pláně', water: 'Voda' }[card.terrain]
  const currentWill = player?.currentWill ?? 0
  const canAffordMental = currentWill >= 2
  const effectiveWill = isBoth && mode === 'mental' ? Math.max(0, currentWill - 2) : currentWill

  return (
    <div className="battle-overlay" role="presentation">
      <section className="battle-dialog adventure-dialog" role="dialog" aria-modal="true" aria-label="Karta dobrodružství">
        {!revealed ? (
          <button className="adventure-back" onClick={() => setRevealed(true)} aria-label="Otočit kartu dobrodružství">
            <span className="adventure-sigil">✦</span>
            <strong>PROROCTVÍ</strong>
            <span>Karta dobrodružství · {terrainName}</span>
            <em>Otočit kartu</em>
          </button>
        ) : (
          <>
            <div className="battle-scroll">
              <header className="battle-heading">
                <div><span className="battle-eyebrow">KARTA DOBRODRUŽSTVÍ · {terrainName}</span><h2>{card.name}</h2></div>
                <span className="battle-heading-icon" aria-hidden="true">{monster ? '⚔' : card.type === 'treasure' ? '✦' : '📜'}</span>
              </header>
              <p className="adventure-description">{card.description}</p>
              {monster && player && (
                <>
                  <p className="battle-section-title">
                    Před soubojem · {isBoth ? 'Zvol způsob boje' : 'Základ bez hodu'}
                  </p>

                  {isBoth ? (
                    <div className="battle-mode-choices" role="group" aria-label="Volba způsobu boje">
                      <button
                        type="button"
                        className={mode === 'physical' ? 'is-selected' : ''}
                        onClick={() => setMode('physical')}
                      >
                        ⚔ Boj silou <small>zbraně a zbroj · zdarma</small>
                      </button>
                      <button
                        type="button"
                        className={mode === 'mental' ? 'is-selected' : ''}
                        disabled={!canAffordMental}
                        onClick={() => setMode('mental')}
                        title={!canAffordMental ? 'Nemáš dost Vůle (vyžaduje min. 2)' : ''}
                      >
                        ✦ Boj vůlí <small>{canAffordMental ? 'kouzla a mysl · stojí 2 🔮' : 'nedostatek Vůle (min. 2 🔮)'}</small>
                      </button>
                    </div>
                  ) : (
                    <div className="battle-modes-summary">
                      <span className={physicalAllowed ? 'is-allowed' : ''}>⚔ Síla {physicalAllowed ? 'povinná' : 'nedostupná'}</span>
                      <span className={mentalAllowed ? 'is-allowed' : ''}>✦ Vůle {mentalAllowed ? 'povinná' : 'nedostupná'}</span>
                    </div>
                  )}

                  <BattleComparison
                    player={player}
                    enemy={monster}
                    mode={mode}
                    strength={player.currentStrength}
                    will={effectiveWill}
                  />

                  <p className="battle-hint">
                    {isBoth
                      ? mode === 'mental'
                        ? '🔮 Zlaté pravidlo: Kdo vyvolá Boj vůlí proti inteligentnímu nepříteli, zaplatí předem 2 Vůli. Bojuješ pak kouzly a silou mysli!'
                        : '⚔ Bojuješ silou: Použiješ své zbraně, zbroje a tělesnou sílu (zdarma).'
                      : monster.combatType === 'physical'
                        ? 'Tento nepřítel nemá rozum – bojovat lze pouze silou (zbraně a zbroj).'
                        : 'Tento nepřítel je beztělesný – bojuje se výhradně silou Vůle a mysli.'}
                  </p>

                  {monster.specialAbility && <p className="battle-warning">⚠ {monster.specialAbility}</p>}
                  <p className="battle-reward">Za vítězství <strong>🪙 +{monster.rewardGold}</strong><strong>✦ +{monster.rewardExp} zkušeností</strong></p>
                </>
              )}
              {!monster && (
                <p className="battle-reward">Odměna {card.rewardGold ? <strong>🪙 +{card.rewardGold}</strong> : null}{card.rewardExp ? <strong>✦ +{card.rewardExp} zkušeností</strong> : null}</p>
              )}
            </div>
            <footer className="battle-actions">
              {monster ? (
                <>
                  <button className="battle-button-secondary" onClick={onFlee}>Uprchnout</button>
                  {isBoth ? (
                    mode === 'mental' ? (
                      <button
                        className="battle-button-primary"
                        disabled={!canAffordMental}
                        onClick={() => onEngageCombat('mental')}
                      >
                        🔮 Vyvolat boj vůlí (−2 🔮)
                      </button>
                    ) : (
                      <button
                        className="battle-button-primary"
                        onClick={() => onEngageCombat('physical')}
                      >
                        ⚔ Bojovat silou (Zdarma)
                      </button>
                    )
                  ) : (
                    <button
                      className="battle-button-primary"
                      onClick={() => onEngageCombat(mode)}
                    >
                      {mode === 'physical' ? '⚔ Vstoupit do boje silou' : '✦ Vstoupit do boje vůlí'}
                    </button>
                  )}
                </>
              ) : (
                <button className="battle-button-primary" onClick={onClaimTreasure}>Přijmout odměnu</button>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  )
}
