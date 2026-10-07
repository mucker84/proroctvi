# Proroctví (Prophecy Board Game - Digital Adaptation)

Webová adaptace deskové hry **Proroctví** (Vladimír Chvátil, Nakladatelství ALTAR / Albi, 2002).
Určeno pro nasazení na Vercel (7ax.fun).

---

## Architektura projektu

* **Technologie:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
* **Čistý engine (`src/engine/`):**
  * `types.ts` – Datové typy desky, postav, předmětů, karet dobrodružství, sfér a soubojů.
  * `state.ts` – State management a inicializace hry.
  * `combat.ts` – Fyzický a mentální soubojový systém podle oficiálních pravidel.
  * `movement.ts` – Pravidla pohybu (pěšky, kůň, loď, teleport, magické brány).
* **Herní data (`src/data/`):**
  * `board.ts` – 32 polí základního herního plánu (provincií, měst, hradů, cvičišť, chrámů, táborů a astrálních bran) + 5 astrálních sfér.
  * `characters.ts` – Hrdinové (Válečník, Hraničář, Kouzelník, Zloděj, Druid, Kněz...) s unikátními atributy a schopnostmi.
  * `cards.ts` – Balíčky dobrodružství (les, hory, pláně, voda) a předmětů (běžné, vzácné, artefakty).
  * `spheres.ts` – 5 Astrálních sfér, jejich strážci a artefakty.
* **Komponenty (`src/components/`):**
  * `Board.tsx` – Kruhový/oválný herní plán s poli, figurkami, astrálními branami a sférami.
  * `DiceRoller.tsx` – Interaktivní 3D/2D házení kostkami (k6) s fyzikou a animací.
  * `CardDrawer.tsx` – Vizuální animované tažení a odkrývání karet s 3D flip efektem.
  * `PlayerSheet.tsx` – Deník hrdiny (Síla, Vůle, Zlato, Zkušenosti, Inventář, Dovednosti).
  * `CombatModal.tsx` – Fázovaný soubojový dialog (výběr zbraní/kouzel, hody, vyhodnocení zranění).
  * `ShopModal.tsx` – Nákup a trénink v městech, chrámech a na cvičištích.

---

## Fáze implementace

1. [x] Inicializace projektu (Vite + React + TS + Tailwind v4 + Lucide)
2. [x] Založení architektury a PLAN.md
3. [x] Datový model a definice herního plánu, postav a karet
4. [x] Herní deska s interaktivním zobrazením, figurkami a pohybem
5. [x] Kostky (Dice Roller) a losování karet (Card Drawer s 3D flipem)
6. [x] Herní logika tahů, nákupů a soubojů
7. [x] Vstup do sfér a souboje se strážci o 5 artefaktů
8. [x] Vercel deployment na 7ax.fun & živé spuštění

---

## Denik
2026-10-07 · Antigravity · Inicializace projektu, Vite + TS + Tailwind, zprovoznění struktury a plánu hry · rozpracovano
2026-10-07 · Antigravity · Implementace hracího plánu (32 polí), 5 astrálních sfér, animovaných kostek, 3D karet, soubojového systému a nákupů · hotovo
2026-10-07 · Antigravity · Založení GitHub repozitáře mucker84/proroctvi a push zdrojových kódů · hotovo
2026-10-07 · Antigravity · Příprava deploy.ps1 a nasazení buildu do c:\xampp\htdocs\7ax-fun\proroctvi (7ax.fun) · hotovo
2026-10-07 · Antigravity · Nasazení a ověření funkčnosti na https://7ax.fun/proroctvi/ · hotovo
2026-10-07 · Antigravity · Implementace online multiplayeru pro 2 hráče (kódy místností, Upstash Redis API, synchronizace tahů) · hotovo
2026-10-07 · Antigravity · Vytvoření samostatné Lobby obrazovky (online čekárna, pozvánky) a rozšíření na 10 hrdinů a plné balíčky karet · hotovo
2026-10-07 · Antigravity · Generování dark fantasy ilustrací všech 10 hrdinů, strážců a mapy království, integrace portrétů do UI, desky a soubojů · hotovo
2026-10-07 · Antigravity · Intuitivní ovládání: automatický posun po hodu kostkami, TurnActionPanel s okamžitou nabídkou akcí na poli, volba směru, odpočinek a plynulý průběh tahu · hotovo

