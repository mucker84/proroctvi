# PROROCTVI-NET-20261008-room-audit

- Projekt: C:/xampp/htdocs/games/proroctvi
- Autor: Codex; datum 2026-10-08
- Výchozí commit: 5ddcb2e; diagnostický skript a dokumenty přidané v pracovní kopii. Zdrojová herní logika během auditu nezměněna.
- Důkaz: vlastní lokální test handleru místnosti a odděleně čtení kódu.
- Stav: NEPROŠLO, 0/5 očekávaných vlastností.
- Prostředí: Node, dva seat tokeny v paměti jednoho procesu, DUM_MEMORY=1; fetch zakázán. Žádná produkční místnost ani Redis nebyly použity.
- Fixture: minimální stav pro protokol místnosti, nikoli úplná hra. Bez browseru, mobilního zařízení a skutečné sítě.

## Scénáře a výsledky

1. Host vybere ranger; výsledný GameState stále obsahuje mage. Neprošlo.
2. Hostitel startuje se snapshotem před připojením hosta; jméno hosta se vrátí na Waiting. Neprošlo.
3. Host spustí místnost; server ho přijme, přestože měl start povolit jen hostiteli. Neprošlo.
4. Host mimo svůj tah změní zlato; server změnu přijme. Neprošlo.
5. Hostitel odešle dvě změny založené na stejné revizi; druhá zastaralá změna přepíše první. Neprošlo. Pole expectedV zatím server nekontroluje.

Spuštění: `node scripts/audit-room.mjs` z kořene projektu. Nenulový návratový kód označuje neprošlé kontroly. Strukturovaný výstup: docs/reports/2026-10-08-room-audit.json. Výstup neobsahuje tokeny ani kódy místností.

## Závěr přenositelný mezi hrami

Zámek tlačítek v GUI neprokazuje pořadí tahu na serveru. Atomický CAS v úložišti sám nezabrání starému klientskému snapshotu přepsat novější hru. Volba hrdiny v lobby a serverový roster musí používat stejný zdroj pravdy.

Čtení kódu navíc ukázalo lokální kartu/souboj mimo úplně sdílený GameState a chybějící klientský resume průchod. Pro společný deskový zážitek musí oba klienti číst stejný potvrzený děj, nejen výsledné statistiky.

Tyto závěry neopravují protokol a nepředstavují audit pravidel, Redis CAS, síťového výkonu ani test dvou fyzických telefonů. Aktuální stav auditu a návrh práce: docs/SHARED-TABLE.md.

## Předání GUI z Kartiček

Převzaté hlášení z chatu „Uprav mobilní GUI statistik“ dne 2026-10-08: vizuálně ověřená stabilní první pětice při sedmi kartách, šipka k dalším kartám a využití šířky stolu na landscape; detail a cílové značky se dále dolaďují. Šlo o náhledy s pevnými ukázkovými kartami, nikoli nové herní simulace. Návrh Proroctví tyto principy přebírá, zatím je nově neimplementoval.
