import { getItem } from '../engine/rules'

interface LootLineProps {
  label: string
  gold: number
  exp: number
  itemId?: string
}

/** Řádek s kořistí: zlato, zkušenosti a případný předmět i s tím, co dělá */
export function LootLine({ label, gold, exp, itemId }: LootLineProps) {
  const item = itemId ? getItem(itemId) : null
  return (
    <div className="battle-reward">
      {label}
      {gold > 0 && <strong>💰 +{gold}</strong>}
      {exp > 0 && <strong>⭐ +{exp} zkušeností</strong>}
      {item && (
        <strong className={item.rarity === 'rare' ? 'loot-rare' : 'loot-common'} title={item.description}>
          🎁 {item.name}{item.rarity === 'rare' ? ' · vzácný' : ''}
        </strong>
      )}
      {item && <small className="loot-item-desc">{item.description}</small>}
    </div>
  )
}
