# Zadání pro Gemini / Antigravity: Proroctví jako společná deskovka na dvou mobilech

Pracuješ v C:/xampp/htdocs/games/proroctvi. Uživatel chce: „herní sdílenej zážitek, ale přes mobil, jako bychom hráli deskovku“. Jsou dva vzdálení hráči, každý na svém telefonu. Hra už má React, místnosti, hrdiny, mapu, karty a souboje. Teď potřebujeme promyslet společný stůl a čitelné ovládání.

## Nejdřív načti

- C:/xampp/htdocs/AGENTS.md a poslední Denik v PLAN.md.
- docs/SHARED-TABLE.md: aktuální audit, uživatelský cíl a priority.
- C:/xampp/htdocs/cml/handoff/games/README.md, gui-mobile.md a multiplayer.md.
- src/components/MobileGameView.tsx, src/mobile.css, src/components/CardModal.tsx, CombatModal.tsx, PlayerSheet.tsx, data/board.ts a public/art/.
- Pro srovnání Kartiček aktuální C:/xampp/htdocs/games/karty/PLAN.md a relevantní HUD/render. Zaznamenej datum a verzi; rozpracované změny neoznačuj jako hotové.

## Tvůj úkol

Navrhni konkrétní mobilní herní stůl, na kterém hráč chápe vlastní možnosti a zároveň sleduje spoluhráčův tah. Vypracuj jeden doporučený návrh a stručně vysvětli hlavní kompromisy. Využij stávající ilustrace a počítej s tím, že nové budou přibývat postupně.

Zobraz vedle sebe, co vidí aktivní hráč a pozorující spoluhráč v těchto situacích:

1. Začátek tahu a volba cesty; čitelné pozice obou figurek a společný cíl.
2. Hod a pohyb figurky; oba vidí stejný potvrzený výsledek.
3. Odhalení veřejné karty; jeden ji otočí, oba mohou přečíst detail.
4. Souboj; aktivní hráč rozhoduje, druhý vidí soupeře, kostky, průběh a odměnu.
5. Výsledek a předání tahu; jasné „co se stalo“ bez zahlcení toastem za každé číslo.
6. Druhý hráč si prohlíží jinou část mapy nebo inventář; nové dění dostane indikátor „Zpět k dění“ a nezničí jeho rozpracované čtení.
7. Uspání telefonu, návrat a obnovování spojení; zřetelné čekání na potvrzení bez předstírání úspěchu.

## Požadavky na zobrazení

- Konkrétní rozměry 360 × 640, 390 × 844 a 844 × 390. Landscape využívá šířku vlastním rozložením.
- Stabilní pozice životů/síly, vůle, zlata, zkušeností a artefaktů. Čísla zůstávají čitelná při delších českých názvech.
- Navrhni přehled celé desky a detail aktuálního okolí; objasni, jak se pozná kruhové spojení pole 31 a 0, poloha spoluhráče a pět sfér.
- Hlavní herní akce a důležité statistiky mají být dostupné bez dlouhého scrollu stránky. Detaily a inventář mohou rolovat uvnitř panelu.
- Základní ovládání má fungovat klepnutím. U gest ukaž i viditelnou alternativu; vyhni se závislosti na hoveru.
- Použij vlastní HUD místního hráče i během cizího tahu. Aktivní postava je zřetelně označená, ale nepromění potichu význam vlastních statistik.
- Animace jsou krátké, vypínatelné a neblokují povinným dvojím potvrzením oba hráče. Výsledky kostek přicházejí od společné autority, nevymýšlí je každý klient.
- Ukaž možnosti ukázání na pole a několika krátkých reakcí jako pozdější vrstvu. Hlasový chat není podmínkou prvního prototypu.

## Výstupy

1. docs/gemini/TABLETOP-DESIGN.md: doporučená kompozice, role obou hráčů, průchody, stavy chyb, kompromisy a návaznost na M1/M2/M3.
2. docs/gemini/tabletop-prototype.html: lokální interaktivní HTML/CSS prototyp s přepínačem role, situace a velikosti. Použij pevná ukázková data a jasně označ, že nejde o připojenou partii. Musí jít otevřít bez API klíče a síťových služeb.
3. docs/gemini/ART-BACKLOG.md: grafické podklady seřazené podle přínosu. U každého účel, počet variant, poměr stran, minimální velikost, průhlednost, bezpečná oblast pro překryv textu a náhradní vzhled. Nejprve zhodnoť existující mapu a portréty; text a statistiky zůstávají v GUI.
4. Krátký testovací záznam s přesnými rozměry, screenshoty a nalezenými omezeními; sdílené závěry předej do CML/handoff/games/reports/ podle šablony. Statický či interaktivní prototyp není test multiplayeru.

## Koordinace

V tomto zadání vytvářej výstupy v docs/gemini/ a zapisuj svou práci do PLAN.md. Codex vlastní souběžnou implementaci App.tsx, herního stavu a serveru; kód hry měň až v navazujícím koordinovaném zadání. Existující necommitnutou práci zachovej. V prvním výstupu pojmenuj, co se dá zavést hned a co vyžaduje sdílené události v backendu.

Pokud potřebuješ tvrdit, že nějaká mechanika odpovídá původní deskovce, ověř ji v pravidlech a uveď zdroj. V tomto úkolu pravidla ani vyvážení hry neměň.

Stav předání: prompt je připravený v projektu; z tohoto chatu nebyl spuštěn Gemini klient.
