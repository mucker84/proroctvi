# Srovnání s deskovou hrou (ALTAR, 3. vydání)

Stav k 2026-10-08, produkce https://7ax.fun/proroctvi/. Zdroj pravidel: `docs/pravidla/proroctvi-zaklad-3-vydani.pdf` (9 stran).
PDF **neobsahuje seznam karet** (ALTAR vydává dodatky ke kartám zvlášť), takže konkrétní znění karet z originálu tady není ověřené. Srovnání se týká mechanik.

Značky: ✅ odpovídá · ⚠️ jinak · ❌ chybí

## Opraveno 2026-10-08 (Claude Code)

- ✅ Neporažený netvor zůstává ležet na poli a napadne každého, kdo na pole přijde nebo na něm zůstane.
- ✅ Souboj rozhoduje jeden hod: výhra = kořist, prohra = −1 život, remíza = nic. Po prohře i remíze tah končí. Smrt nastane při ztrátě života se silou 0.
  Dřív se hrálo na víc kol se zraněním podle rozdílu a po prohře hrdina obživl ve městě a přišel o půlku zlata.
- ✅ Smrt postavy: hráč pokračuje novou postavou téhož povolání na startovním cechu (−1 život, −2 magy), zlato, výbava i schopnosti propadnou.
  ⚠️ Artefakty se vracejí do sfér, kdežto na desce zůstanou ležet na poli.
- ✅ Zbroj a štíty přidávají k síle v boji. Zvláštní „obranu“ deska nezná.
- ✅ Loď vede jen do nejbližšího přístavu vlevo nebo vpravo.
- ✅ Gilda (špinavá práce) stojí 1 vůli, ne život.
- ✅ Kdo drží které artefakty, se odvozuje z hráčů, takže to online vidí oba stejně (dřív to měl každý prohlížeč zvlášť).
- Smazány nepoužívané komponenty `Board`, `MultiplayerModal`, `TurnActionPanel`, `DiceRoller`.

## 1. Karty náhody (zelené, „?“): ❌ chybí úplně

Tohle je ten „balík událostí“. V deskovce je to **motor celé hry**: na začátku každého tahu hráč otočí jednu kartu náhody a ta řekne, co se v zemi stalo.

| Karta | Co dělá v originále |
|---|---|
| Hory / Lesy / Pláně | rozloží karty dobrodružství na **všechna** pole toho terénu (max. 2 na pole: 1 odkrytá, 1 zakrytá) |
| Pevnost, Gilda, Lesní tábor, Magická věž, Klášter, Volný výcvik | položí novou kartu schopnosti do cechu (max. 2, starší odchází) |
| Městský kupec, Hokynář | vymění zboží ve Městě / ve Vesnici |
| Klidné časy | hráč má v tomto kole dva tahy |
| Jasnozřivý sen | odkryje kartu strážce nebo artefaktu ve sféře |
| Svěží / Magický / Laskavý vítr, Dobré časy | doplní životy, magy, zlato |
| Charita | zlato a doplnění tomu, kdo má nejméně |
| Krize | všichni přijdou o polovinu zlata |

V aplikaci typ karty `event` existuje, ale nemá žádnou kartu. Kartu dobrodružství si hráč tahá sám jako svou jedinou akci.

## 2. Karty dobrodružství: ⚠️ jiný princip

| Deska | Aplikace |
|---|---|
| Karty **leží na polích** (rozložila je karta náhody), hráč je odkryje, až na pole přijde | karta se vylosuje až na žádost hráče na poli, kde stojí |
| Nestvůra na poli je **povinný** boj | boji se dá vyhnout tím, že kartu netáhneš; navíc existuje „útěk“, který pravidla neznají |
| Balík se protáčí, použité karty jdou na odkládací hromádku, pak se zamíchají | losování s vracením, stejná karta může padnout opakovaně |
| Dva druhy: **nestvůry** a **příležitosti** (pozitivní karty, často placené, se zákazem využívat je donekonečna) | nestvůry (20) a „poklady“ (8) s okamžitým ziskem |
| Odměna za nestvůru: zkušenosti + případně zlato, **běžný nebo vzácný předmět**, zvýšení síly nebo vůle | jen zlato a zkušenosti |
| Zvláštní pravidla `!`/`?`, skupinky se třemi životy (např. harpyje), nestvůry berou magy, zlato nebo předměty místo života | `specialAbility` je **jen text**, žádná logika |
| Jen tři terény: pláně, lesy, hory | navíc balík „Voda“ (6 karet), ale na plánu žádné vodní pole není, takže ty karty jsou nedosažitelné |

## 3. Předměty: ⚠️ zásadně jinak

**Deska:**
- Dva balíky: **běžné předměty** (hnědý rub, sekera) a **vzácné předměty** (zlatý rub, meč).
- Běžné leží na prodej ve Městě a ve Vesnici. Co tam je, určují karty náhody (Městský kupec, Hokynář), takže nabídka je malá a mění se.
- Vzácné předměty se získávají hlavně jako kořist z nestvůr, příležitostí a od nižších strážců.
- Prodej ve Městě a Vesnici za polovinu ceny (zaokrouhleno nahoru). Poškozené předměty se opravují v civilizaci za 1 zl.
- Postava má dvě ruce a jednu hlavu: v ruce nejvýš dva předměty, z toho jen jedna zbraň a jeden štít, obouruční zbraň zabere obě ruce. Jedna čelenka nebo koruna. Bonus dávají jen předměty použité v boji.
- Limit 7 předmětů (konec kola), lektvary a svitky jsou na jedno použití, některé předměty jen 1× za kolo.

**Aplikace:**
- ❌ Vzácné předměty neexistují vůbec.
- ⚠️ Jeden stálý obchod se 17 předměty, všechno pořád k dispozici. Nakupuje se ve Městě, Vesnici **a v Lesním táboře** (to je na desce cech pro léčení).
- ❌ Prodej, poškození ani opravy nejsou.
- ❌ **Bonusy všech zbraní se sčítají.** Dýka + meč + sekera + halapartna = +10 k síle. Ruce ani limit 7 předmětů se nekontrolují.
- ⚠️ Kůň a Okřídlené boty jdou koupit, ale nic nedělají. Luk („první úder“) a Prsten ochrany mají jen pasivní bonus, jejich zvláštní efekt nefunguje.
- ✅ Lektvary jsou jednorázové a fungují.

## 4. Schopnosti, kouzla a cechy: ⚠️ / ❌

**Deska:**
- Pět cechů (Pevnost, Gilda, Lesní tábor, Magická věž, Klášter), každý má vlastní balík 10 karet schopností.
- V cechu leží nanejvýš dvě nabízené karty (přináší je karta náhody).
- Cena = zkušenosti uvedené na kartě. Kdo není členem cechu, zaplatí **navíc stejnou částku ve zlatě**. Každá postava je členem dvou cechů uvedených na její kartě.
- Kouzla jsou druhem schopnosti (stojí magy). Limit 7 schopností.
- Na začátku hry nemá postava žádné zvláštní schopnosti ani kouzla.

**Aplikace:**
- ❌ **Žádná ze 7 dovedností nemá v kódu účinek.** Platí se za ně zkušenosti, ale nic nedělají.
- ⚠️ Dovednosti se učí jen v Gildě zlodějů (jediné pole s terénem `training`). Kouzla v Klášteře a Magické pustině (terén `temple`), **ne v Magické věži**.
- ❌ V Pevnosti a Magické věži se obchod otevře **prázdný**: terény `castle` a `astral_gate` nemají v `ShopModal` žádnou nabídku a Pevnost se navíc hlásí jako „Tábor kočovníků“.
- ⚠️ Trénink +1 maximální síla nebo vůle za 4 zkušenosti je stálá nabídka. Na desce zvýšení síly a vůle přichází z karet a je vzácné.
- ⚠️ Kouzelník, Černokněžník, Vědma a Druid začínají s kouzlem, deska začíná bez.
- ❌ Členství ve dvou cechách a příplatek ve zlatě nejsou.
- ❌ Limity chybí: síla max. 8, vůle max. 10, na konci kola max. 15 zl, 15 zkušeností, 7 předmětů, 7 schopností.

## 5. Pole a jejich možnosti: ⚠️

| Pole | Deska | Aplikace |
|---|---|---|
| Klášter | zdarma 1 život za tah, bezpečí | chrám: plné vyléčení za 2 zl + kouzla + trénink vůle |
| Lesní tábor | léčení za 1 zl za život, bezpečí | obchod s předměty |
| Magická pustina | zdarma +3 magy jednou za tah | otevře „chrám“ (léčení, kouzla) |
| Magická věž | 1 zl za každé načaté 2 magy | prázdný obchod |
| Vesnice | nocleh za 1 zl: +1 život, +1 mag, bezpečí do dalšího tahu | obchod s předměty |
| Civilizace | oprava předmětů za 1 zl | — |
| kdekoli | — | „Odpočinout si“: +1 síla nebo vůle (pravidla nic takového nemají) |

Popisy polí v `board.ts` slibují chování z desky, ale logika ho nemá.

✅ Práce místo pohybu (Město, Gilda, Pevnost) odpovídá.

## 6. Postavy: ⚠️

- Deska: 10 vlastních postav. Z příkladů v pravidlech jsou to mj. Druid, Žoldák, Zaklínačka, Hraničářka, Iluzionistka, Zvěd a Paladin.
  Aplikace má vlastní sadu (Válečník, Kouzelník, Hraničář, Zloděj, Druid, Paladin, Mnich, Vědma, Žoldnéř, Nekromant).
- Deska: všichni začínají se 3 zl a 3 zkušenostmi. Aplikace: 3–12 zl podle povolání a 0 zkušeností.
- Deska: výběr postav draftem (dvě náhodné, jednu si nech, druhou pošli doleva). Aplikace: volný výběr.
- ❌ Pasivní schopnosti povolání jsou jen text. Funguje jedině +1 k síle u Válečníka.
- Hráčů: deska 2–5, aplikace 2.

## 7. Boj: ✅ po dnešní opravě, s výjimkami

- ✅ Jeden hod, nestvůra jen se silou = boj silou, se silou i vůlí = volba (boj vůlí za 2 magy), jen s vůlí = boj vůlí zdarma.
- ⚠️ Útěk před nestvůrou (z karty i ze souboje) pravidla neznají. Ve hře zůstává: netvor po něm leží dál na poli.
- ❌ Skupinky se třemi životy, nestvůry beroucí magy, zlato nebo předměty, efekty typu Modlitba a Soustředění (házej dvakrát, ber lepší).
- ❌ Dvě nestvůry na jednom poli (hráč volí pořadí).

## 8. Sféry, strážci a artefakty: ⚠️

| Deska | Aplikace |
|---|---|
| 5 vyšších + 5 nižších strážců + 5 artefaktů rozdaných **náhodně a skrytě** do sfér, odkrývají se postupně | pevný strážce a artefakt v každé sféře, „2 zásahy“ zastupují nižšího a vyššího strážce |
| za nižšího strážce je poklad, pak musíš pokračovat | odměna až na konci |
| útok na sféru je činnost **místo pohybu** z jednoho ze dvou sousedních polí | ✅ to jde, ale navíc se dá vstoupit i jako akce po pohybu (z cechu) |
| artefakt nejde prodat ani zničit; za každý artefakt soupeře stojí boj vůlí o 1 mag víc; s artefaktem nejsi v bezpečí nikde | ❌ nic z toho |
| artefakty mají zvláštní moc (Královský plášť volí bitevní pole…) | velké číselné bonusy (+4 síla), `specialPower` je jen text |
| po smrti nositele artefakty leží na poli a dají se sebrat | vracejí se do sfér |

## 9. Boje mezi hráči: ❌ chybí

Na desce můžeš jednou za tah napadnout postavu na stejném poli. Poražený volí, jestli ztratí 1 život, nebo dá vítězi předmět, a vítěz si vybere který (i artefakt). Bezpečí je v Klášteře, v Lesním táboře a ve Vesnici po zaplaceném noclehu, ale ne pro nositele artefaktu.

## 10. Konec hry: ❌ hra může uváznout

- Deska: vyhrává, kdo má 4 z 5 artefaktů. Když padne pátý a nikdo 4 nemá, začne **závěrečný boj** favoritů (bitevní pole volí držitel Královského pláště, každý musí v tahu zaútočit, poražený dává artefakt).
- Aplikace: vítězí jen 4 artefakty. **Při rozdělení 3:2 už nikdo vyhrát nemůže** a hra nikdy neskončí.

## 11. Průběh tahu: ⚠️

- Deska: karta náhody → pohyb → povinné boje s nestvůrami → nepovinný boj s postavou → **využití všech možností pole v libovolném pořadí**.
- Aplikace: pohyb → **právě 1 akce** (zavedla to dřívější úprava s odvoláním na pravidla, ta to ale neříkají). Na konci kola se nehlídají limity.

## Doporučené pořadí

1. **Závěrečný boj** (nebo aspoň konec hry při rozdělení 3:2). Bez něj partie uvázne.
2. **Karty náhody + karty dobrodružství ležící na polích.** Bez nich hra není Proroctví. Tohle je největší kus práce.
3. **Předměty:** dvě ruce, jedna zbraň a jeden štít, limit 7; běžné předměty na polích Města a Vesnice; balík vzácných jako kořist; prodej za půlku.
4. **Cechy:** opravit prázdnou Pevnost a Věž, schopnosti dát účinek a cenu podle členství.
5. **Možnosti polí** podle tabulky v bodě 5, zrušit všudypřítomný odpočinek, povolit víc možností pole v jednom tahu.
6. **Boje mezi hráči** a pravidla artefaktů.
