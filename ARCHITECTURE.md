# Technická architektura: Proroctví (Prophecy Board Game Digital)

> Audit 2026-10-08: aktuální implementace ještě nezajišťuje úplný společný průběh karet a soubojů ani serverovou autoritu tahu. Ověřené mezery a další postup jsou v [docs/SHARED-TABLE.md](docs/SHARED-TABLE.md); protokol místnosti zatím neprošel pěti kontrolami v `scripts/audit-room.mjs`.

Webová adaptace legendární české deskové hry **Proroctví** (Vladimír Chvátil, Nakladatelství ALTAR / Albi, 2002).

- **Živá produkce:** [https://7ax.fun/proroctvi/](https://7ax.fun/proroctvi/)
- **Zdrojový kód hry:** [GitHub mucker84/proroctvi](https://github.com/mucker84/proroctvi)
- **Produkční repozitář (monorepo 7ax-fun):** [GitHub mucker84/7ax-fun](https://github.com/mucker84/7ax-fun)

---

## 1. Technologický stack

| Vrstva | Technologie | Účel |
|---|---|---|
| **Frontend Framework** | React 19, TypeScript | Komponentová architektura, typová bezpečnost |
| **Build Tool** | Vite 8 | Bleskový vývoj, optimalizovaný production bundle s `--base=/proroctvi/` |
| **Styling & Design** | Tailwind CSS v4, Lucide Icons | Dark fantasy UI, responzivní design (desktop i mobil) |
| **Animace & Efekty** | CSS 3D Transforms, Canvas Confetti | Fyzické házení kostkami, 3D otáčení karet, oslava vítězství |
| **Herní engine** | Čistý funkcionální TypeScript | Deterministický state machine nezávislý na UI |
| **Multiplayer Backend** | Vercel Serverless Function (`room.mjs`) + Upstash Redis | Synchronizace tahů v reálném čase, místnosti pro 2 hráče |
| **Hosting & CDN** | Vercel | Globální edge CDN na doméně `https://7ax.fun` |
| **Art & Ilustrace** | Generativní dark fantasy olejomalba | 10 unikátních hrdinů, pergamenná mapa království, strážci |

---

## 2. Architektura modulů

```
src/
├── components/           # Vizuální a interaktivní vrstva
│   ├── Board.tsx         # Kruhový herní plán (32 polí, mapové pozadí, 5 sfér, figurky)
│   ├── TurnActionPanel.tsx # Intuitivní centrum tahu (kroky 1-3, auto-pohyb, nabídka akcí)
│   ├── MobileGameView.tsx# Speciální optimalizované mobilní rozhraní
│   ├── LobbyScreen.tsx   # Čekárna, výběr postav, pozvánky a kód místnosti
│   ├── DiceRoller.tsx    # Animované k6 kostky s fyzikou hodu
│   ├── CardModal.tsx     # 3D otáčení karet dobrodružství (monstrum/poklad/událost)
│   ├── CombatModal.tsx   # Fázovaný souboj (fyzický/mentální, kouzla, portréty)
│   ├── ShopModal.tsx     # Městské tržiště, chrámové léčení a cvičiště atributů
│   └── PlayerSheet.tsx   # Karta hrdiny (Síla, Vůle, Zlato, Exp, Inventář, Schopnosti)
├── data/                 # Herní obsah a konfigurace
│   ├── board.ts          # 32 polí království (provincie, města, cvičiště, chrámy, brány)
│   ├── characters.ts     # 10 hrdinů (Válečník, Kouzelník, Hraničář, Paladin...)
│   ├── cards.ts          # Balíčky dobrodružství pro Les, Hory, Pláně a Vodu
│   └── spheres.ts        # 5 Astrálních sfér (Oheň, Mráz, Stíny, Bouře, Astrál)
├── engine/               # Čistá herní logika (Headless Core)
│   ├── types.ts          # Datové typy (GameState, Player, Item, Monster, Spell...)
│   ├── gameEngine.ts     # Deterministický herní stroj, souboje, tahy, nákupy
│   └── multiplayer.ts    # Klient pro synchronizaci po síti přes Vercel API
├── public/art/           # Dark fantasy grafické podklady
└── App.tsx               # Hlavní orchestrace aplikace, routing a herní smyčka
```

---

## 3. Herní logika a mechaniky

### A. Herní smyčka tahu (The Turn Loop)
Tah probíhá ve třech jasných krocích:
1. **Krok 1: Hod kostkou & Pohyb**
   - Hráč zvolí směr: *↻ Po směru hodinových ručiček* (výchozí) nebo *↺ Proti směru*.
   - Hodí 2k6 kostkami (animovaný `DiceRoller`).
   - Hra hráče **automaticky přesune** na cílové pole:
     `targetTileId = (currentTileId ± totalSteps + 32) % 32`.
   - Záznam se propíše do logu a stav přejde do fáze `TILE_ACTION`.
2. **Krok 2: Akce na poli (`TurnActionPanel`)**
   - Okamžitě se zobrazí akční nabídka přizpůsobená danému poli:
     - **Divoké provincie:** Prozkoumat provincii (tahat kartu) nebo Odpočinek (+1 Síla/Vůle).
     - **Města / Chrámy / Cvičiště:** Navštívit tržnici, léčit se, trénovat statistiky, učit se dovednosti.
     - **Astrální brána:** Vstoupit do Astrální sféry (boj se Strážcem o artefakt).
     - Možnost otočení směru (`↩ Jít na opačné pole`).
3. **Krok 3: Dokončení tahu**
   - Po vyhodnocení akce se rozsvítí tlačítko **„Ukončit tah“**, které předá hru dalšímu hráči.

### B. Soubojový systém (`combat.ts` / `CombatModal.tsx`)
- **Fyzický souboj:** Porovnání Fyzického útoku hráče (Síla + bonusy zbraní/zbrojí + pasivní bonusy + hod kostkou) proti Fyzickému útoku monstra.
- **Mentální souboj:** Založen na Vůli, kouzlech a magických předmětech.
- **Astrální strážci:** Elitní bossové sfér vyžadující specifickou taktiku a vysokou přípravu.

### C. Podmínka vítězství
- Hráč, který získá **4 z 5 magických astrálních artefaktů**, naplní Proroctví a okamžitě vyhrává hru.

---

## 4. Online Multiplayer Architektura

1. **Vercel Serverless API (`/api/proroctvi/room.mjs`):**
   - Bezstavová funkce napojená na **Upstash Redis** přes REST API.
   - Endpointy:
     - `action=create`: Založí 6místný kód místnosti, vytvoří token Hostitele (Hráč 1) a uloží výchozí stav.
     - `action=join`: Připojí Hráče 2 s unikátním tokenem a aktualizuje stav v Redisu.
     - `action=sync`: Pravidelný polling (interval 1,5 s) vracející aktuální verzi stavu `v` a data.
     - `action=update`: Atomický zápis celého klientského stavu s inkrementací verze; aktuálně neověřuje aktivního hráče ani výchozí klientskou revizi.
2. **Synchronizace stavu:**
   - Klient sleduje `stateVersionRef`. Pokud dorazí novější stav, plynule aktualizuje UI.
   - Klient omezuje ovládání podle aktivního hráče. Server zatím ověřuje token místnosti, ale nevynucuje pořadí tahu; oprava je součástí milníku M1 v `docs/SHARED-TABLE.md`.

---

## 5. Build & Nasazení (Deployment Pipeline)

Deployment je plně automatizovaný skriptem `deploy.ps1`:
```powershell
.\deploy.ps1
```

**Kroky skriptu:**
1. Zkompiluje projekt přes Vite s base URL `--base=/proroctvi/` do dočasné složky.
2. Vyčistí a překopíruje build do subadresáře monorepa `c:\xampp\htdocs\7ax-fun\proroctvi\`.
3. Zkopíruje serverless funkci `server/room.mjs` do `c:\xampp\htdocs\7ax-fun\api\proroctvi\room.mjs`.
4. Git commit a push v monorepu `mucker84/7ax-fun` automaticky spustí produkční Vercel build.
5. Hra je okamžitě živá na adrese `https://7ax.fun/proroctvi/`.
