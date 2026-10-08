# Proroctví: mobilní přehled zdrojů, 2026-10-08

- ID: P-UX-002-20261008-mobile-hud
- Zdroj: `src/components/MobileGameView.tsx`, `src/mobile.css`
- Verze: základ `4f2a6a9`, necommitnutá úprava Codex z 2026-10-08
- Důkaz: vlastní lokální interaktivní test v Codex in-app browseru a čtení kódu
- Prostředí: Vite localhost, Chromium; viewporty 360 × 640, 390 × 844, 844 × 390; jeden klient hotseat

## Změna a výsledek

Horní přehled má pro oba hráče stálé stejné sloupce: Síla, Vůle, Zlato, Zkušenosti, Artefakty, Věci. Jména a portréty jsou vedlejší. Klepnutí na řadu otevře aktuální deník. Velká duplicitní lišta zdrojů zmizela. V online režimu spodní výbava čte místního hráče místo hráče na tahu.

Ovládání tahu a akce jsou na začátku herní plochy; pod nimi jsou sféry, lokace a plán. Na 360 × 640 byl hod na první obrazovce a po hodu byly akce vidět pod horním přehledem. Původní `scrollIntoView` posouval i celou stránku k mapě a skrýval akce; po opravě se při hodu změnil jen vodorovný posun mapy. V jednom průchodu zůstalo `window.scrollY` 40,8 px před i po hodu, zatímco pás polí se posunul na `scrollLeft` 687,2 px. Na 844 × 390 neměla stránka vodorovný přetok, horní přehled měl výšku 87 px a první akce byla ve viditelné části (y 237–299 px). Přepnutí tahu změnilo označení aktivního hráče a kliknutí na řadu otevřelo jeho deník.

`npm run build` prošel mimo sandbox (sandbox blokoval nativní Vite závislost). `npm run lint` skončil 0 s již existujícími upozorněními v jiných souborech. `git diff --check` prošel.

## Omezení a přenos

Nešlo o fyzický telefon, online partii dvou klientů, test velkého písma ani úplný průchod kartou a soubojem. Online výběr vlastního HUD je ověřen čtením kódu, ne druhým telefonem. Pro další hry je přenosný princip stabilních srovnávacích sloupců a umístění aktuální akce před doplňkový obsah. Při automatickém centrování vodorovné mapy je třeba testovat, zda se zároveň nepohne svislá stránka.
