import { BoardTile } from '../engine/types'

export const BOARD_TILES: BoardTile[] = [
  // =========================================================================
  // SECTOR 1: PEVNOST & KRÁLOVSKÉ PLÁNĚ (SPHÈRE DU FEU / SFÉRA OHNĚ)
  // =========================================================================
  {
    id: 0,
    name: 'Pevnost',
    terrain: 'castle',
    connections: [19, 1],
    description: 'Cech válečníků. Výcvik bojových schopností a cvičiště pro zisk zkušeností.',
    specialActionTitle: 'Výcvik válečníka / Cvičiště',
    isGuild: true,
    nearSphere: 'fire',
    hasAstralGate: 'fire',
    workAction: {
      type: 'fortress_training',
      title: '⚔️ Cvičiště v pevnosti',
      description: 'Ztrácíš 1 život a získáváš 2 body zkušenosti.',
      costHp: 1,
      rewardExp: 2,
    },
  },
  {
    id: 1,
    name: 'Zlaté Pláně',
    terrain: 'plains',
    connections: [0, 2],
    description: 'Úrodná travnatá pláň pod hradbami pevnosti. Brána do Sféry Ohně.',
    nearSphere: 'fire',
  },
  {
    id: 2,
    name: 'Dračí Hory',
    terrain: 'mountain',
    connections: [1, 3],
    description: 'Skalnatý horský průsmyk u zátoky s přístavem pro plavbu lodí.',
    hasPort: true,
  },
  {
    id: 3,
    name: 'Větrné Pláně',
    terrain: 'plains',
    connections: [2, 4],
    description: 'Široké travnaté pláně otevřené prudkým větrům a karavanám.',
  },

  // =========================================================================
  // SECTOR 2: GILDA & STARÉ MĚSTO (SFÉRA STÍNŮ)
  // =========================================================================
  {
    id: 4,
    name: 'Gilda Zlodějů',
    terrain: 'training',
    connections: [3, 5],
    description: 'Cech zlodějů a stínů. Učí zákeřným lstím a nabízí špinavou práci za zlato.',
    specialActionTitle: 'Výcvik zloděje / Špinavá práce',
    isGuild: true,
    nearSphere: 'shadow',
    hasAstralGate: 'shadow',
    workAction: {
      type: 'guild_work',
      title: '🗡️ Špinavá práce v gildě',
      description: 'Ztrácíš 1 Vůli a získáváš 3 zlaťáky.',
      costWill: 1,
      rewardGold: 3,
    },
  },
  {
    id: 5,
    name: 'Staré Město',
    terrain: 'city',
    connections: [4, 6],
    description: 'Hlavní metropole království. Tržiště se zbraněmi i lektvary, přístav a magická brána.',
    specialActionTitle: 'Tržiště / Odborná práce',
    hasPort: true,
    hasMagicGate: true,
    nearSphere: 'shadow',
    workAction: {
      type: 'city_work',
      title: '📜 Odborná práce ve městě',
      description: 'Zaplatíš 1 Vůli (mag) a získáváš 2 zlaťáky.',
      costWill: 1,
      rewardGold: 2,
    },
  },
  {
    id: 6,
    name: 'Hluboký Hvozd',
    terrain: 'forest',
    connections: [5, 7],
    description: 'Hustý a temný les plný divokých vlků a loupežníků.',
  },
  {
    id: 7,
    name: 'Úrodné Pláně',
    terrain: 'plains',
    connections: [6, 8],
    description: 'Sluncem zalité pastviny a naleziště pradávných relikvií.',
  },

  // =========================================================================
  // SECTOR 3: LESNÍ TÁBOR & HVOZDY (SFÉRA MRAZU)
  // =========================================================================
  {
    id: 8,
    name: 'Lesní Tábor',
    terrain: 'camp',
    connections: [7, 9],
    description: 'Cech hraničářů a druidů. Výcvik přežití, léčení raněných (1 zl. za život) a bezpečí.',
    specialActionTitle: 'Výcvik hraničáře / Ošetření ran',
    isGuild: true,
    nearSphere: 'ice',
    hasAstralGate: 'ice',
  },
  {
    id: 9,
    name: 'Prales Stínů',
    terrain: 'forest',
    connections: [8, 10],
    description: 'Starobylý prales chránící přístup k ledovým horským pustinám.',
    nearSphere: 'ice',
  },
  {
    id: 10,
    name: 'Mlžné Hory',
    terrain: 'mountain',
    connections: [9, 11],
    description: 'Vysokohorský hřeben zahalený v mlze s prastarou magickou branou.',
    hasMagicGate: true,
  },
  {
    id: 11,
    name: 'Mystický Les',
    terrain: 'forest',
    connections: [10, 12],
    description: 'Kouzelný les s čarovnými prameny, kde šumění větví skrývá pradávná tajemství.',
  },

  // =========================================================================
  // SECTOR 4: MAGICKÁ VĚŽ & MAGICKÁ PUSTINA (SFÉRA MAGIE)
  // =========================================================================
  {
    id: 12,
    name: 'Magická Věž',
    terrain: 'astral_gate',
    connections: [11, 13],
    description: 'Cech kouzelníků a věrných arkána. Učení kouzel a obnova magenergie (1 zl. za 2 magy).',
    specialActionTitle: 'Učení kouzel / Obnova Vůle',
    isGuild: true,
    nearSphere: 'magic',
    hasAstralGate: 'magic',
  },
  {
    id: 13,
    name: 'Magická Pustina',
    terrain: 'temple',
    connections: [12, 14],
    description: 'Zřídlo v pustině. Poutník si zde může zdarma doplnit 3 Vůli (magy) jednou za tah.',
    specialActionTitle: 'Načerpat magenergii (+3 Vůle zdarma)',
    nearSphere: 'magic',
  },
  {
    id: 14,
    name: 'Skalnaté Pobřeží',
    terrain: 'mountain',
    connections: [13, 15],
    description: 'Útesy tyčící se nad divokým mořem s kotvištěm lodí.',
    hasPort: true,
  },
  {
    id: 15,
    name: 'Širé Pláně',
    terrain: 'plains',
    connections: [14, 16],
    description: 'Otevřená step, kde hlídkují nomádi a létají stepní gryfové.',
  },

  // =========================================================================
  // SECTOR 5: KLÁŠTER & VESNICE (SFÉRA BOUŘÍ)
  // =========================================================================
  {
    id: 16,
    name: 'Posvátný Klášter',
    terrain: 'temple',
    connections: [15, 17],
    description: 'Cech kněží a mnichů. Duchovní výcvik, bezplatné vyléčení 1 života za tah a bezpečí.',
    specialActionTitle: 'Výcvik kněze / Požehnání (+1 život zdarma)',
    isGuild: true,
    nearSphere: 'storm',
    hasAstralGate: 'storm',
  },
  {
    id: 17,
    name: 'Vesnice Podhradí',
    terrain: 'city',
    connections: [16, 18],
    description: 'Klidná vesnice s obchodem a hospodou. Nocleh za 1 zl. doplní 1 život, 1 Vůli a bezpečí.',
    specialActionTitle: 'Nákup zboží / Nocleh v hospodě',
    nearSphere: 'storm',
  },
  {
    id: 18,
    name: 'Zelený Háj',
    terrain: 'forest',
    connections: [17, 19],
    description: 'Lesní palouk s bylinkami, divočáky a lesní zvěří.',
  },
  {
    id: 19,
    name: 'Bouřné Hory',
    terrain: 'mountain',
    connections: [18, 0],
    description: 'Hromové štíty s runovou magickou branou vedoucí do jiných bran v království.',
    hasMagicGate: true,
  },
]
