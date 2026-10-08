import { useState } from 'react'
import { BattleComparison } from './BattleComparison'
import { LootLine } from './LootLine'
import { AdventureCard, BoardTile, Player, TileCard } from '../engine/types'

interface CardModalProps {
  card: AdventureCard
  tileCard: TileCard
  player?: Player
  tile: BoardTile
  /** Nestvůra na poli: boj je povinný, kartu nejde jen zavřít */
  forced: boolean
  onEngageCombat: (chosenMode: 'physical' | 'mental') => void
  onClaimTreasure: () => void
  onClose: () => void
  onFlee: () => void
}

export function CardModal({ card, tileCard, player, tile, forced, onEngageCombat, onClaimTreasure, onClose, onFlee }: CardModalProps) {
  const [revealed, setRevealed] = useState(!forced)
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
            <span>Na poli tě čeká nestvůra · {terrainName}</span>
            <em>Otočit kartu</em>
          </button>
        ) : (
          <>
            <div className="battle-scroll">
              <header className="battle-heading">
                <div><span className="battle-eyebrow">{monster ? 'NESTVŮRA' : 'PŘÍLEŽITOST'} · POLE #{tile.id} {tile.name}</span><h2>{card.name}</h2></div>
                <span className="battle-heading-icon" aria-hidden="true">{monster ? '⚔' : '✦'}</span>
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
                    tile={tile}
                  />

                  <p className="battle-hint">
                    Rozhodne jeden hod. Prohra = −1 život a konec tahu, remíza = konec tahu. V obou případech nestvůra zůstává na poli.
                  </p>

                  {monster.specialAbility && <p className="battle-warning">⚠ {monster.specialAbility}</p>}
                  <LootLine label="Kořist za vítězství" gold={monster.rewardGold} exp={monster.rewardExp} itemId={tileCard.lootItemId} />
                </>
              )}
              {!monster && (
                <LootLine label="Využitím získáš" gold={card.rewardGold || 0} exp={card.rewardExp || 0} />
              )}
            </div>
            <footer className="battle-actions">
              {monster ? (
                <>
                  <button className="battle-button-secondary" onClick={onFlee} title="Pravidla útěk neznají; tah skončí a nestvůra zůstane na poli">Utéct (konec tahu)</button>
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
                <>
                  <button className="battle-button-secondary" onClick={onClose}>Zavřít</button>
                  <button className="battle-button-primary" onClick={onClaimTreasure}>Využít příležitost</button>
                </>
              )}
            </footer>
          </>
        )}
      </section>
    </div>
  )
}
