import React from 'react'
import { Compass, Swords, Shield, Sparkles, BookOpen } from 'lucide-react'

interface IntroGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export const IntroGuideModal: React.FC<IntroGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-stone-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col gap-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center border-b border-stone-800 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase tracking-widest mb-2">
            <BookOpen size={13} />
            <span>Rychlý průvodce deskovkou</span>
          </div>
          <h2 className="text-2xl font-black text-stone-100 font-serif tracking-wide">
            Vítej ve světě Proroctví!
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Webová adaptace legendární české fantasy hry Vladimíra Chvátila
          </p>
        </div>

        {/* Content: Dva světy */}
        <div className="flex flex-col gap-3.5">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            Herní plán je rozdělen na dva světy:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Civilizace */}
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-amber-500/30 flex flex-col gap-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-black text-amber-400 text-sm font-serif">
                <span className="text-xl">🏰</span>
                <span>Civilizace</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                <strong>Města, Chrámy, Cvičiště a Tábory</strong> – tam se bezpečně léčíš, trénuješ trvalou Sílu a Vůli za zkušenosti a nakupuješ zbraně, zbroj i lektvary za zlaťáky.
              </p>
            </div>

            {/* Divočina */}
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-emerald-500/30 flex flex-col gap-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-black text-emerald-400 text-sm font-serif">
                <span className="text-xl">🌲</span>
                <span>Divočina</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                <strong>Lesy 🌲, Hory ⛰️, Pláně 🌾 a Řeka 🌊</strong> – tam taháš karty dobrodružství. Bojuješ s netvory a nacházíš poklady, ze kterých získáváš Zlaťáky (🪙) a Zkušenosti (⭐).
              </p>
            </div>
          </div>

          {/* Proč na ně vůbec chodit? */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/40 border border-amber-500/40 flex flex-col gap-2">
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
              <span>❓</span>
              <span>Proč na ně vůbec chodit?</span>
            </div>
            <p className="text-[11px] text-stone-200">
              Karty dobrodružství jsou <strong>jediný zdroj tvého bohatství a síly</strong>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-300">
              <div className="p-2 rounded-xl bg-stone-950/80 border border-red-950/80 flex items-start gap-2">
                <span className="text-lg shrink-0">👹</span>
                <div>
                  <strong className="text-stone-100 block">Netvoři:</strong>
                  Když je porazíš, získáš <span className="text-amber-400 font-bold">Zlaťáky (🪙)</span> a <span className="text-emerald-400 font-bold">Zkušenosti (⭐)</span>.
                </div>
              </div>
              <div className="p-2 rounded-xl bg-stone-950/80 border border-amber-950/80 flex items-start gap-2">
                <span className="text-lg shrink-0">💎</span>
                <div>
                  <strong className="text-stone-100 block">Poklady a nálezy:</strong>
                  Okamžitý zisk zlata nebo zkušeností bez boje.
                </div>
              </div>
            </div>
          </div>

          {/* Jak probíhá tah */}
          <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 flex flex-col gap-2">
            <div className="font-bold text-xs text-stone-200 flex items-center gap-1.5">
              <Compass size={14} className="text-amber-400" />
              <span>Jak probíhá tvůj tah:</span>
            </div>
            <ul className="text-[11px] text-stone-300 space-y-1.5 pl-1">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">1.</span>
                <span><strong>Pohyb:</strong> Zvolíš směr (po směru / proti směru) a posuneš se po cestě království.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">2.</span>
                <span><strong>Právě 1 akce:</strong> V divočině vytáhneš 1 kartu dobrodružství, v táboře odpočineš, nebo ve městě navštívíš tržiště.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">3.</span>
                <span><strong>Předání tahu:</strong> Jakmile akci dokončíš, tah se automaticky předá dalšímu hráči.</span>
              </li>
            </ul>
          </div>

          {/* Cíl hry */}
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-800/60 flex items-center gap-3">
            <span className="text-2xl shrink-0">👑</span>
            <div className="text-[11px] text-purple-200 leading-tight">
              <strong className="text-purple-300 block mb-0.5 font-serif text-xs">Cíl hry: 4 Astrální Artefakty</strong>
              Zesil svého hrdinu, vstup do astrálních sfér přes magické brány a poraz Strážce. Kdo první získá 4 artefakty, vyhrává!
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl cursor-pointer transition-all active:scale-[0.99]"
        >
          ⚔️ Rozumím, jdeme hrát!
        </button>
      </div>
    </div>
  )
}
