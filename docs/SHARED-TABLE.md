# Proroctví: dva telefony, jeden herní stůl

Datum: 2026-10-08. Výchozí revize pro audit: 5ddcb2e. Stav: návrh dalšího vývoje; níže popsané chybějící vlastnosti nejsou implementované.

Průběžná změna 2026-10-08: porovnávací mobilní HUD, místní výbava během soupeřova tahu a umístění akcí před mapou jsou implementované. Lokální vizuální a hotseat ověření popisuje [report mobilního HUD](reports/2026-10-08-mobile-hud.md). Ostatní mezery auditu, zejména serverová autorita a sdílené karty/souboje, zůstávají otevřené.

## Cíl hráče

Dva vzdálení hráči mají pocit, že sedí nad stejnou deskou. Oba vidí, kam hrdina jde, co vytáhl, jak dopadly kostky a proč získal odměnu. I během cizího tahu mají co sledovat a mohou si prohlížet herní situaci. Přepnutí aplikace nebo ztráta připojení nesmí zničit společnou partii.

Příklad cílového průchodu: Anna hodí → oba telefony ukážou stejné kostky → figurka přejde na pole → Anna otočí kartu a oba ji vidí → druhý hráč sleduje souboj → oba vidí výsledek → tah se předá. Prohlížení vlastní výbavy na druhém telefonu nepředstavuje herní akci a nebrání Anně pokračovat.

## Co bylo skutečně zjištěno

| Zjištění | Důkaz | Dopad |
|---|---|---|
| Karta a souboj jsou lokální stav App a CombatModal; GameState.currentCard a combat nejsou tímto průchodem plně využity. | src/App.tsx, handleDrawCard/handleEngageCombat; src/components/CombatModal.tsx, useState(combat) a lokální hody. Čtení kódu. | Druhý hráč nevidí hlavní napínavou část tahu jako společnou událost. |
| Herní tah má více lokálních příznaků mimo sdílený stav. | hasRolledForMove, hasCompletedTileAction, lastDiceRoll, claimedSpheres v App.tsx. Čtení kódu. | Obnova a divácké zobrazení tahu nemají jeden úplný zdroj pravdy. |
| Volba hrdiny hosta se nepromítne do jeho herní postavy; start může přepsat připojeného hosta starým snapshotem. | scripts/audit-room.mjs, guest-hero-selection a host-start-preserves-guest: neprošlo. | Hráč může vstoupit do jiné postavy, než si vybral. |
| Server dovolí start hostovi i změnu stavu mimo vlastní tah. | only-host-starts a inactive-seat-update: neprošlo. | Klientské skrytí tlačítek není autorita pravidel. |
| Opožděný zápis přepíše novější stav. | stale-state-update: neprošlo; poslané expectedV se nekontroluje. | Dva telefony si mohou přepisovat výsledky. CAS chrání zápis do úložiště, ne stáří klientského snapshotu. |
| Místnost a token jsou jen v paměti Reactu; není klientský resume průchod. | App.tsx a engine/multiplayer.ts; žádné ukládání připojené relace. Čtení kódu. | Reload telefonu ztrácí přístup k rozehrané partii z tohoto klienta. |
| Hlavní plán je posuvný seznam polí; ukončení 31 a začátek 0 netvoří viditelný okruh. | MobileGameView.tsx. Čtení kódu. | Slabší prostorová orientace a pocit společné desky. |
| Příznak dokončené akce schová změnu směru, ale nabídka karty a odpočinku zůstává dostupná. | MobileGameView.tsx; handleDrawCard a handleRest ověřují hlavně isMyTurn. Čtení kódu. | Před uzamčením tahu je potřeba určit a vynutit legální sled akcí. |

Protokol: docs/reports/2026-10-08-room-audit.json. Sonda používá minimální fixture, dva tokeny a lokální paměť s vypnutou sítí. Nenahrazuje test UI, úplných pravidel, Redis CAS ani test na dvou fyzických telefonech. Pět kontrol neprošlo; zatím nebyly opraveny.

## Co přebíráme z Kartiček

- Stabilní HUD: důležité zdroje mají trvalé pozice, velikost ovládání neskáče podle počtu objektů.
- Oddělený detail: malá karta nebo figurka se dá prohlédnout bez provedení herní akce.
- Pro landscape samostatné uspořádání využívající šířku, nikoli pouhé zmenšení portrétu.
- Sledovat náklady spojení a práci na pozadí. Long polling Kartiček je kandidát, který vyžaduje ověření pro náš serverless backend.
- Testovací protokoly uvádějí, zda šlo o statickou ukázku, živou partii, emulaci nebo fyzický telefon.

Zdroj: C:/xampp/htdocs/cml/handoff/games/; chat Kartičky „Uprav mobilní GUI statistik“ dne 2026-10-08 uvádí vizuální ověření stabilní první pětice při sedmi kartách a širšího stolu. Jeho práce stále běží; toto je převzaté hlášení, ne nový test v Proroctví.

## Cílové rozhraní

### Hlavní plocha: společná deska

Na výšku: kompaktní řádek obou hráčů a spojení, velká interaktivní deska, u spodní hrany aktuální rozhodnutí a vlastní zdroje. Aktuální velká ilustrace lokace se může stát pozadím detailu pole, aby neodsouvala desku a akce pod dlouhý scroll.

Na šířku: většinu plochy má deska; úzký panel vpravo obsahuje akci a výběr detailu. Význam a pořadí statistik zůstávají stejné. Velikost mapy není odvozená od plné výšky seznamu karet nebo inventáře.

Dva režimy mapy: přehled okruhu s oběma figurkami a pěti sférami, a přiblížené okolí aktuálního pole. Přehled nemusí obsahovat všechny textové názvy. Každý může mapu prohlížet samostatně; nové události signalizuje tlačítko „Zpět k dění“, kamera hráče nepřetahuje během čtení.

### Společné události

Hod, odhalení, souboj a odměna mají ID a pořadí potvrzené serverem. Oba telefony zobrazí tentýž výsledek; animace ho pouze znázorní. Pozdě připojený klient přejde k aktuálnímu stavu, nepřehrává všechny staré animace a zvuky. Dvojí doručení nesmí zopakovat odměnu.

Odhalená veřejná karta má místo na společném stole. Aktivní hráč volí akci; druhý vidí průběh a má vlastní tlačítko detailu. Na každou událost není potřeba dvojí potvrzení obou hráčů. Historie poslední události umožní zpětné přečtení i po pokračování tahu.

### Přítomnost spoluhráče

Zobraz stavy „hraje“, „prohlíží si“, „znovu se připojuje“ podle skutečných signálů; při pouhém výpadku spojení nevyvozuj úmyslný odchod. Pozdější fáze může přidat ukázání na pole a několik krátkých reakcí. Hlasový chat je samostatná volitelná etapa po spolehlivé partii.

## Pořadí práce

### M1 — Společný a obnovitelný tah

1. Srovnat model místnosti, hráčů a pravidel: validovaná volba hrdiny, pouze hostitel spouští připravenou místnost, start použije serverový roster.
2. Zavést serverem ověřené příkazy s expectedRevision a actionId. Výsledek náhody a legálnost tahu rozhoduje autorita partie. Opakovaný příkaz se vyhodnotí jednou.
3. Přesunout pohyb, kartu, úplný souboj, odměnu a dokončení tahu do obnovitelného GameState. Lokální zůstává pouze kamera, otevřený soukromý detail a animace.
4. Uchovat bezpečně lokální relaci místnosti a nabídnout pokračování. Obnova ověří token se serverem; informuje o vypršení místnosti a nespouští omylem novou partii.
5. Přidat divácké zobrazení stejných potvrzených událostí a stav odesílání/chyby v GUI.

Hotovo znamená: host a hostův spoluhráč odehrají oba jeden tah včetně karty a souboje, oba vidí shodné výsledky; jeden během souboje obnoví stránku a pokračuje ze stejného místa. Duplicitní a opožděný požadavek nemění výsledek. Projde pět kontrol auditu i doplněné end-to-end scénáře.

### M2 — Deska na mobilním stole

Implementovat vybraný návrh mapy, stabilní HUD, akční panel a společnou kartu. Zachovat dvě volné kamery, návrat k dění a přístup k aktuálnímu výsledku. Ověřit 360 × 640, 390 × 844, 844 × 390 a dva skutečné mobily. Prohlížení nesmí aktivovat herní akci.

### M3 — Atmosféra a obsah

Krátké vypínatelné zvuky, jemné pohyby figurek, srozumitelné odhalení karty, ping na pole a reakce. Přidávat ilustrace podle jejich přínosu: deska a rub karet, klíčová střetnutí, poté jednotlivé lokace. Samostatně ověřit shodu zamýšlených pravidel s deskovkou; komentář v kódu „official“ není důkaz shody. Změny pravidel oddělit od změn GUI.

## Rozdělení spolupráce

Codex: autorita stavu, obnovení partie, synchronizované události, měřitelné testy a integrace zvoleného rozhraní.

Gemini / Antigravity: vizuální návrh společného stolu a průchodu pro oba hráče, prototyp pohledů, seznam grafiky a specifikace výřezů. Zadání je v GEMINI-BRIEF.md. Výstupy ukládat do docs/gemini/, aby nekolize s implementací App a serveru nevznikaly souběžně.

Kartičky: sdílet stabilitu HUD, čitelnost objektů, orientaci, dotykové detaily a výsledky síťových testů přes CML; specifické herní pravidlo vždy zůstává v příslušné hře.
