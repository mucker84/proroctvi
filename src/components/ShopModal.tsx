import React from 'react'
import { BOARD_TILES } from '../data/board'
import {
  buyPrice,
  canLearn,
  getGuildCard,
  getItem,
  GUILD_NAME,
  guildLearnCost,
  isSpell,
  sellPrice,
  TILE_GUILD,
} from '../engine/rules'
import { GameState, Item, Player } from '../engine/types'

const itemStats = (item: Item) =>
  [
    item.strengthBonus || item.defenseBonus ? `+${(item.strengthBonus || 0) + (item.defenseBonus || 0)} síla` : '',
    item.willBonus ? `+${item.willBonus} vůle` : '',
    item.hands === 2 ? 'obouruční' : item.hands === 1 ? 'jedna ruka' : '',
    item.effect === 'head' ? 'na hlavu' : '',
    item.type === 'potion' ? 'jednorázový' : '',
  ].filter(Boolean).join(' · ')

function ModalFrame({ icon, title, player, children, onClose }: { icon: string; title: string; player: Player; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-stone-900 border-2 border-stone-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <h2 className="text-xl font-black text-amber-400 font-serif">{title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/50 rounded-lg text-xs font-black text-amber-300">💰 {player.gold}</span>
                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-xs font-black text-emerald-300">⭐ {player.experience}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold uppercase cursor-pointer">Zavřít ✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Trh ve Městě a Vesnici: jen zboží, které tam právě leží, a prodej vlastních věcí za polovinu ceny */
export function MarketModal({ game, player, onBuy, onSell, onClose }: { game: GameState; player: Player; onBuy: (id: string) => void; onSell: (id: string) => void; onClose: () => void }) {
  const tile = BOARD_TILES[player.currentTileId]
  const goods = game.marketGoods[tile.id] || []
  return (
    <ModalFrame icon="🏪" title={`Tržiště · ${tile.name}`} player={player} onClose={onClose}>
      <section>
        <h3 className="text-sm font-bold text-stone-200 mb-2">Zboží na prodej <span className="text-stone-500 font-normal">· nové přiveze karta náhody (Městský kupec / Hokynář)</span></h3>
        {goods.length === 0 && <p className="text-xs text-stone-400">Trh je vykoupený.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {goods.map((id) => {
            const item = getItem(id)
            const price = buyPrice(player, item)
            return (
              <div key={id} className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl flex flex-col gap-1.5">
                <div className="font-bold text-xs text-stone-100">{item.name}</div>
                <div className="text-[11px] text-amber-200/80">{itemStats(item)}</div>
                <div className="text-[11px] text-stone-400">{item.description}</div>
                <button
                  onClick={() => onBuy(id)}
                  disabled={player.gold < price}
                  className="mt-1 self-start px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black text-[11px] uppercase rounded-lg cursor-pointer"
                >
                  Koupit za {price} 💰
                </button>
              </div>
            )
          })}
        </div>
      </section>
      <section className="border-t border-stone-800 pt-3">
        <h3 className="text-sm font-bold text-stone-200 mb-2">Prodat ze své výbavy <span className="text-stone-500 font-normal">· za polovinu ceny</span></h3>
        {player.inventory.length === 0 && <p className="text-xs text-stone-400">Nemáš co prodat.</p>}
        <div className="flex flex-wrap gap-2">
          {player.inventory.map((item) => (
            <button key={item.id} onClick={() => onSell(item.id)} className="px-3 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-[11px] text-stone-200 cursor-pointer">
              {item.name} <b className="text-amber-300">+{sellPrice(item)} 💰</b>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-stone-500 mt-2">Na konci tahu smíš mít nejvýš 7 předmětů, nejlevnější přebytečné se odhodí.</p>
      </section>
    </ModalFrame>
  )
}

/** Cech: učíš se jen to, co v něm právě leží (nejvýš dvě karty). Nečlen platí navíc stejnou částku ve zlatě. */
export function GuildModal({ game, player, onLearn, onClose }: { game: GameState; player: Player; onLearn: (id: string) => void; onClose: () => void }) {
  const tile = BOARD_TILES[player.currentTileId]
  const guild = TILE_GUILD[tile.id]
  const offers = game.guildOffers[tile.id] || []
  const member = player.heroClass.guilds.includes(guild)
  return (
    <ModalFrame icon="🏛️" title={`Cech · ${GUILD_NAME[guild]}`} player={player} onClose={onClose}>
      <p className="text-xs text-stone-300">
        {member ? `Jsi členem cechu, platíš jen zkušenostmi.` : `Nejsi členem tohoto cechu: ke zkušenostem zaplatíš stejnou částku ve zlatě.`}{' '}
        Tvé cechy: {player.heroClass.guilds.map((g) => GUILD_NAME[g]).join(', ')}. Nové karty přináší karta náhody.
      </p>
      {offers.length === 0 && <p className="text-xs text-stone-400">Cech teď nic nenabízí.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {offers.map((id) => {
          const card = getGuildCard(id)
          if (!card) return null
          const cost = guildLearnCost(player, guild, card)
          const blocked = canLearn(player, guild, card)
          const training = 'training' in card && card.training
          return (
            <div key={id} className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl flex flex-col gap-1.5">
              <div className="font-bold text-xs text-stone-100">{isSpell(card) ? '✨ ' : training ? '💪 ' : '★ '}{card.name}</div>
              <div className="text-[11px] text-amber-200/80">{card.effect}{isSpell(card) ? ` · seslání stojí ${card.willCost} 🔮` : ''}</div>
              <div className="text-[11px] text-stone-400">{card.description}</div>
              <button
                onClick={() => onLearn(id)}
                disabled={!!blocked}
                title={blocked ?? ''}
                className="mt-1 self-start px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-black text-[11px] uppercase rounded-lg cursor-pointer"
              >
                Naučit · {cost.exp} ⭐{cost.gold ? ` + ${cost.gold} 💰` : ''}
              </button>
              {blocked && <span className="text-[10px] text-red-400">{blocked}</span>}
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-stone-500">Nejvýš 7 schopností a kouzel; síla nejvýš 8, vůle nejvýš 10.</p>
    </ModalFrame>
  )
}
