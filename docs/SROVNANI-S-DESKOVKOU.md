# Srovnání s deskovou hrou (ALTAR, 3. vydání)

Stav k 2026-10-08 (večer), produkce https://7ax.fun/proroctvi/. Zdroj pravidel: `docs/pravidla/proroctvi-zaklad-3-vydani.pdf` (9 stran).
PDF **neobsahuje seznam karet** (ALTAR vydává dodatky ke kartám zvlášť), takže počty karet v balíčcích a přesné účinky větrů jsou odhad adaptace, ne originál.

Značky: ✅ odpovídá · ⚠️ jinak · ❌ chybí

Pravidla jsou v `src/engine/rules.ts` jako čisté funkce nad `GameState`; celý stav (balíčky, karty na polích, cechy, trhy) se tak synchronizuje online.
Regresní simulace bot proti botovi: `npx vite build --ssr scripts/sim.ts --outDir node_modules/.sim && node node_modules/.sim/sim.js 400`
(400 partií: všechny skončily vítězem, ~27 % závěrečným bojem, žádná výjimka ani porušený limit).

## 1. Karty náhody: ✅ (balíček je odhad)

Na začátku každého tahu se otočí karta náhody a výsledek vidí oba hráči (zelený panel nad volbou pohybu).

| Karta | Účinek v adaptaci |
|---|---|
| Lesy / Hory / Pláně (po 3) | karta dobrodružství na každé pole terénu po směru hodin od táhnoucího: prázdné pole → odkrytá, s jednou kartou → zakrytá, se dvěma → nic |
| Pevnost, Gilda, Lesní tábor, Magická věž, Klášter | nová schopnost do cechu (nejvýš 2, nejstarší jde dospod balíčku) |
| Volný výcvik | ⚠️ cech volí automaticky: první cech táhnoucího hráče |
| Městský kupec, Hokynář (po 2) | odloží zboží ve Starém Městě / ve Vesnici a přiveze nové (3 / 2 kusy) |
| Klidné časy | dva tahy v kole, druhý bez karty náhody |
| Svěží, Magický, Laskavý vítr, Dobré časy | ⚠️ čísla odhadnutá: všem +1, táhnoucímu +2 (životy / magy / zlato) |
| Charita | nejchudší +3 zl, nejvíc zraněný +1 život |
| Krize | všichni přijdou o polovinu zlata (zaokrouhleno dolů) |
| Jasnozřivý sen | ❌ chybí, strážci nejsou skrytí (bod 8) |

Počáteční situace: 1 schopnost v každém cechu, zboží na obou trzích, odkryté karty na všech polích jednoho náhodného terénu.

## 2. Karty dobrodružství: ✅

- ✅ Leží na polích (nejvýš dvě), zakryté se odkryjí, když na pole někdo přijde nebo na něm zůstane.
- ✅ S nestvůrou na poli je boj povinný; dokud žije, nejde využít nic jiného. Po prohře i remíze zůstává ležet.
- ✅ Příležitosti se využívají dobrovolně a pak se odloží.
- ✅ Balíčky se protáčejí, použité karty jdou na odkládací hromádku a po vyčerpání se zamíchají.
- ✅ Kořist je vidět předem: zlato, zkušenosti a u silnějších nestvůr **konkrétní předmět** (běžný nebo vzácný), vylosovaný už při položení karty.
- ⚠️ Útěk před nestvůrou pravidla neznají; v adaptaci ukončí tah a nestvůra zůstává.
- ⚠️ Balíčky jsou po terénech (karty mají tematická jména); bývalý balíček „Voda“ patří k horám.
- ❌ Zvláštní pravidla `!`/`?`, skupinky se třemi životy, nestvůry beroucí magy nebo zlato. `specialAbility` je jen text.

## 3. Předměty: ✅ / ⚠️

- ✅ Běžné předměty (12 druhů, 29 kusů) leží na trhu ve Starém Městě a ve Vesnici, nabídku mění karty náhody.
- ✅ Vzácné předměty (12 kusů) se nedají koupit; jsou kořistí z nestvůr.
- ✅ Prodej ve Městě a Vesnici za polovinu ceny (zaokrouhleno nahoru); prodané jde na odkládací hromádku.
- ✅ **Dvě ruce a jedna hlava:** v boji se použije buď jedna obouruční zbraň, nebo jednoruční zbraň a štít; k tomu jedna zbroj a jedna věc na hlavu, prsteny působí vždy. Hra vybere nejlepší sestavu zvlášť pro boj silou a zvlášť pro boj vůlí, okno souboje ukazuje, co je použito a co ne a proč.
- ✅ Nejvýš 7 předmětů na konci tahu (nejlevnější přebytek se odhodí).
- ✅ Okřídlené boty jsou pohybový předmět (místo pohybu o 3 pole zdarma). Kůň jako předmět zmizel, protože kůň je v pravidlech pohyb za 1 zl.
- ❌ Poškozené předměty a oprava v civilizaci.
- ⚠️ Poražený v boji mezi postavami volí automaticky (život, dokud mu zbývají aspoň 2; jinak dá výbavu, vítěz bere artefakt, jinak nejdražší předmět).

## 4. Cechy, schopnosti a kouzla: ✅

- ✅ Pět cechů, každý s vlastním balíčkem (15 schopností + 5 kouzel), v cechu leží nejvýš dvě nabídky.
- ✅ Cena v zkušenostech; nečlen platí navíc stejnou částku ve zlatě. Každé povolání je členem dvou cechů.
- ✅ Všechny schopnosti mají účinek v kódu (bonusy v boji, zlato a zkušenosti po vítězství, levnější nákup, meditace, únik do stínů…).
- ✅ Výcvik síly a vůle je karta cechu (Tvrdý výcvik v Pevnosti, Duchovní cvičení v Klášteře), už ne stálá nabídka.
- ✅ Limity: 7 schopností, síla nejvýš 8, vůle nejvýš 10, na konci tahu nejvýš 15 zl a 15 zkušeností.
- ✅ Postava začíná se 3 zkušenostmi a bez schopností a kouzel.
- ⚠️ Začáteční zlato zůstává podle povolání (3–12), deska dává všem 3.

## 5. Možnosti polí: ✅

| Pole | Adaptace |
|---|---|
| Klášter | zdarma 1 život jednou za tah, bezpečí |
| Lesní tábor | 1 život za 1 zl, kolikrát chceš, bezpečí |
| Magická pustina | zdarma 3 magy jednou za tah |
| Magická věž | 2 magy za 1 zl, kolikrát chceš |
| Vesnice | nocleh 1 zl: +1 život, +1 mag, bezpečí do dalšího tahu; trh |
| Staré Město | trh |
| Pevnost, Gilda, Město | práce místo pohybu |

- ✅ Všechny možnosti pole jdou využít v jednom tahu v libovolném pořadí; tah se ukončí tlačítkem.
- ✅ Zrušen všudypřítomný „odpočinek“.

## 6. Postavy: ⚠️

- Vlastní sada povolání místo originálních, volný výběr místo draftu, 2 hráči místo 2–5.
- ❌ Pasivní schopnosti povolání jsou většinou jen text. Fungují: +1 k síle u Válečníka, +1 zl po vítězství u Žoldnéře, +2 zl z příležitosti u Zloděje.

## 7. Boj: ✅

- ✅ Jeden hod; boj silou, nebo boj vůlí za 2 magy u nestvůr se silou i vůlí.
- ✅ Prohra = −1 život, remíza nic, obojí ukončí tah. Smrt při ztrátě života se silou 0: výbava propadne, artefakty zůstanou ležet na poli, schopnosti se vrátí do cechů, hráč pokračuje novou postavou.
- ❌ Efekty typu Modlitba a Soustředění, dvě nestvůry v jednom souboji s volbou pořadí (bojuje se postupně).

## 8. Sféry, strážci a artefakty: ⚠️

- ✅ Útok na sféru je činnost místo pohybu z jednoho ze dvou sousedních polí; dva strážci za sebou (dvě vítězství).
- ✅ Artefakty padlých leží na poli a dají se zvednout (po poražení nestvůr).
- ✅ Za každý artefakt soupeře stojí boj vůlí proti němu o 1 mag víc; nositel artefaktu není nikde v bezpečí.
- ❌ Strážci a artefakty nejsou náhodně a skrytě rozdaní; odměna za nižšího strážce chybí; `specialPower` artefaktů je jen text.

## 9. Boje mezi postavami: ✅

- ✅ Jednou za tah lze napadnout postavu na stejném poli (až po poražení nestvůr). Bezpečí v Klášteře, Lesním táboře a ve Vesnici po noclehu, ne pro nositele artefaktu.
- ✅ Útočník volí sílu, nebo platí za boj vůlí; na boj silou obránce může odpovědět bojem vůlí (rozhodne automaticky podle šancí).
- ✅ Poražený ztratí život, nebo dá předmět; při smrti bere vítěz zlato, předměty i artefakty.

## 10. Konec hry: ✅

- ✅ Vyhrává, kdo má 4 artefakty.
- ✅ Když je všech pět rozebráno a nikdo nemá čtyři, začne **závěrečný boj**: favorité se přesunou na pole, kde padl pátý artefakt, uzdraví se, nepohybují se a v každém tahu musí zaútočit; poražený odevzdá artefakt.
- ⚠️ Bitevní pole nevolí držitel Královského pláště (artefakt v adaptaci není).

## Co zbývá

1. Zvláštní pravidla karet nestvůr a artefaktů (dnes jen text).
2. Skrytí a náhodní strážci + Jasnozřivý sen.
3. Poškozené předměty a oprava.
4. Pasivní schopnosti povolání.
5. Ruční volba poraženého v boji mezi postavami (online potřebuje otázku druhému hráči).
