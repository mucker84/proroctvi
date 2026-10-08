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

## Mobilní UX a grafika

- Na telefonu je herní tah hlavní obrazovkou: stav obou hráčů, aktuální lokace, volba směru a hod, následně akce na poli. Mapa je vodorovná prohlížecí cesta; výběr polí nemění pohyb.
- Spodní navigace zpřístupňuje plán, deníky hrdinů a záznam hry. Online soupeř vidí průběh tahu, ale nemá aktivní akce. Lokální hra střídá hráče na stejném zařízení.
- Nové ilustrace lokací se přidávají přes `BoardTile.image`; bez obrázku se použije mapa království. Doporučený výřez lokace je na šířku alespoň 3:2 se čitelným středem a volným spodním okrajem pro text. Portréty hrdinů mají fungovat i ve čtvercovém výřezu; názvy a stav jsou vždy text, nikoli součást obrázku.
- Karty, souboje a obchod se otevírají nad herní obrazovkou a na menší výšce se posouvají uvnitř dialogu.

---

## Sdílené poznatky napříč hrami

Pro návrhy mobilního GUI, multiplayeru a testování čti [společný herní index CML](C:/xampp/htdocs/cml/handoff/games/README.md). Po relevantní práci předej obecně použitelné závěry se zdrojem, verzí, důkazem a omezením. Původní kód a výsledky zůstávají v projektu; převzatý zápis jiného agenta není nový test této hry. Související projekt Kartičky má aktuální zdroje v `C:/xampp/htdocs/games/karty/`, i když je chat vedený pod `games/karticky`.

## Další cíl: dva telefony, jeden herní stůl

Podrobný audit a kritéria jsou v [docs/SHARED-TABLE.md](docs/SHARED-TABLE.md). Z dosavadních zaškrtnutých funkcí nevyplývá dokončený online herní průchod; lokální sonda protokolu z 2026-10-08 odhalila pět neprošlých kontrol.

1. [ ] M1: správný roster hráčů, serverové ověření příkazů a revizí, společné karty/souboje/odměny, obnova partie a test dvou klientů.
2. [ ] M2: prostorová deska, stabilní HUD a akce v dosahu palce, samostatný landscape; oba hráči vidí stejnou událost a mohou se nezávisle rozhlížet.
3. [ ] M3: krátké zvuky/animace, ukázání na pole, reakce a další ilustrace podle přínosu.

Zadání vizuálního návrhu pro Gemini/Antigravity: [GEMINI-BRIEF.md](GEMINI-BRIEF.md), výstupy vyhrazené do `docs/gemini/`. Prompt je připravený k předání; přímé spuštění Gemini z tohoto chatu není dostupné.

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
2026-10-07 · Codex · Mobilní herní rozhraní pro dva hráče, vodorovný plán, tahové akce, deníky, záznam, úprava lobby a dialogů, podpora dalších ilustrací lokací · hotovo
2026-10-07 · Antigravity · Uložení kompletní projektové dokumentace (README.md, ARCHITECTURE.md, plán nasazení, registrace v CML) · hotovo
2026-10-07 · Antigravity · Sjednocení PC a mobilní verze do moderního plynulého zážitku (desktop widescreen layout, plynulá cesta, dock a akční centrum) · hotovo
2026-10-07 · Antigravity · Autentická pravidla deskovky pro souboje (1 zásah zabíjí netvora, úprk během boje, bleskový souboj, mentální vs fyzické zranění, obrození a odměny) · hotovo

2026-10-08 · Codex · Založeny společné poznatky o mobilním GUI, multiplayeru a testování v CML/handoff/games; přidané tematické čtení do sdíleného AGENTS.md a návaznost na Kartičky · hotovo
2026-10-08 · Codex · Audit společného deskového zážitku (lokální protokol 0/5 kontrol), předání GUI poznatků Kartiček, plán M1–M3 a připravené zadání Gemini; opravy multiplayeru a nový stůl čekají na implementaci · rozpracovano
2026-10-08 · Antigravity · Implementace Hero HUD a okamžitého inventáře na hlavní herní ploše, zobrazení zlaťáků/exp/výbavy ve scoreboardu, klikací deník hrdinů a oprava lektvarů · hotovo
