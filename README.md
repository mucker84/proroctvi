# 🔮 Proroctví (Prophecy Board Game - Digital Edition)

Webová adaptace slavné české deskové fantasy hry **Proroctví** od Vladimíra Chvátila (vydalo Nakladatelství ALTAR / Albi v roce 2002).

[![Live Demo](https://img.shields.io/badge/Live-7ax.fun%2Fproroctvi-amber.svg)](https://7ax.fun/proroctvi/)
[![Build Status](https://img.shields.io/badge/Build-Passing-emerald.svg)](https://7ax.fun/proroctvi/)
[![Multiplayer](https://img.shields.io/badge/Multiplayer-Online%202P%20Redis-blue.svg)](https://7ax.fun/proroctvi/)

---

## 🌟 O hře

V království Proroctví nastal čas zkoušek. Staří králové padli a trůn čeká na hrdinu, který dokáže projít pěti magickými astrálními branami, porazit jejich prastaré strážce a shromáždit **4 z 5 legendárních artefaktů**.

Hra kombinuje průzkum nebezpečných provincií, rozvoj hrdiny, nákupy výbavy ve městech, trénink na cvičištích a chrámech, tahání karet dobrodružství, fyzické i mentální souboje a taktiku pohybu po kruhovém herním plánu.

---

## ⚔️ Klíčové vlastnosti adaptace

* **Kompletní sestava 10 hrdinů:**
  * ⚔️ **Válečník** – Mistr zbraní a fyzického boje (+1 útok proti monstrům)
  * 🔮 **Kouzelník** – Znalec arkánní magie (+1 vůle při odpočinku v chrámu)
  * 🏹 **Hraničář** – Strážce hvozdů (+1 pohyb v lesních provinciích)
  * 🗡️ **Zloděj** – Rychlé prsty a stíny (+2 zlaťáky z truhel a odměn)
  * 🌿 **Druid** – Spojenec přírody (léčení v lese zdarma)
  * 🛡️ **Paladin** – Svatý bojovník (imunita vůči kletbám)
  * 🥋 **Mnich** – Mistr vnitřní síly (+1 útok i beze zbraní)
  * 🧙‍♀️ **Vědma** – Věštkyně bažin (příprava lektvarů z bylin)
  * 🪓 **Žoldnéř** – Zkušený veterán (+1 zlaťák po každém vítězství)
  * 💀 **Nekromant / Černokněžník** – Vládce stínů (obnova vůle po mentálním souboji)
* **Kruhový herní plán (32 polí):**
  * Provinciální terény: Les, Hory, Pláně, Voda.
  * Zvláštní lokace: Staré Město, Přístavní Město, Sluneční Chrám, Rytířské Cvičiště, Tábory, Hrady.
  * 5 Astrálních bran vedoucích do sfér: Ohně, Mrazu, Stínů, Bouří a Astrálu.
* **Intuitivní ovládání tahu:**
  * Výběr směru (po směru / proti směru hodinových ručiček).
  * Hod 2k6 kostkami s animovaným házením a **automatickým posunem** hrdiny.
  * Okamžité otevření akčního centra lokace (karty, obchod, výcvik, sféry, odpočinek).
  * Možnost změny směru na opačné pole jedním kliknutím.
* **Online Multiplayer i Lokální Hotseat:**
  * **Online místnosti pro 2 hráče** s 6místným kódem a odkazem pro kamaráda.
  * Synchronizace stavu přes Upstash Redis a Vercel Serverless Functions.
  * Automatický přechod z čekárny (Lobby) na herní desku po zahájení.
* **Dark Fantasy ilustrace:**
  * Unikátní portréty všech 10 hrdinů, strážců a mapy království ve stylu klasické olejomalby.
* **Responzivní rozhraní:**
  * Plnohodnotný desktop zážitek s centrální mapou a pravým panelem hrdinů.
  * Speciální mobilní rozhraní přizpůsobené pro hraní na telefonu s přepínáním záložek.

---

## 🛠️ Rychlé spuštění (Lokální vývoj)

```bash
# 1. Klonování repozitáře
git clone https://github.com/mucker84/proroctvi.git
cd proroctvi

# 2. Instalace závislostí
npm install

# 3. Spuštění lokálního serveru
npm run dev
```

Hra poběží lokálně na `http://localhost:5173`.

---

## 🚀 Nasazení a produkce

Hra je nasazena v monorepu `7ax-fun` a běží na Vercelu pod adresou:
👉 **[https://7ax.fun/proroctvi/](https://7ax.fun/proroctvi/)**

Sestavení a nasazení probíhá automaticky skriptem:
```powershell
.\deploy.ps1
```
Skript postaví Vite projekt s prefixem `/proroctvi/`, překopíruje build i serverless backend pro místnosti do repozitáře `c:\xampp\htdocs\7ax-fun\` a připraví jej k nasazení na Vercel.

---

## 📚 Dokumentace

* Podrobná technická architektura: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
* Vývojový plán a deník: [`PLAN.md`](./PLAN.md)
