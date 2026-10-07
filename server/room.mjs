/**
 * Proroctví — Místnost pro dva hráče přes Upstash Redis (Vercel Serverless Function).
 *
 *   POST /api/proroctvi/room
 *     { action: 'create', name, heroClassId }
 *     { action: 'join',   code, name, heroClassId, token? }
 *     { action: 'sync',   code, token }
 *     { action: 'update', code, token, state }
 */

const ROOM_TTL  = 43200;    // 12 hodin
const ONLINE_MS = 15000;    // 15 s timeout online stavu
const SEATS     = ['p1', 'p2'];

const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const CAS_LUA = `
local cur = redis.call('GET', KEYS[1])
if ARGV[1] == '0' then
  if cur then return 0 end
else
  local pre = ARGV[1] .. '|'
  if (not cur) or string.sub(cur, 1, #pre) ~= pre then return 0 end
end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1`;

async function redis(...cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd.map(String)),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

// Paměť pro lokální vývoj
const mem = globalThis.__proroctviRooms ??= new Map();

export const storage = {
  get memory() { return process.env.DUM_MEMORY === '1'; },
  get ready()  { return this.memory || !!(REDIS_URL && REDIS_TOKEN); },
  async get(key) {
    if (this.memory || !REDIS_URL) return mem.get(key) ?? null;
    return redis('GET', key);
  },
  async cas(key, expectV, value) {
    if (this.memory || !REDIS_URL) {
      const cur = mem.get(key);
      const okV = expectV === 0 ? !cur : !!cur && cur.startsWith(expectV + '|');
      if (okV) mem.set(key, value);
      return okV;
    }
    return (await redis('EVAL', CAS_LUA, 1, key, expectV, value, ROOM_TTL)) === 1;
  },
};

const keyOf  = code => 'proroctvi:room:' + code;
const decode = raw => {
  const i = raw.indexOf('|');
  return { v: +raw.slice(0, i), room: JSON.parse(raw.slice(i + 1)) };
};

const cleanName = (n, fallback) => (String(n ?? '').replace(/\s+/g, ' ').trim().slice(0, 20) || fallback);
const cleanCode = c => /^\d{6}$/.test(String(c ?? '')) ? String(c) : null;
const newToken  = () => [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('');

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

function publicRoom(room, v, me, now) {
  const seats = {};
  for (const id of SEATS) {
    const seat = room.seats[id];
    seats[id] = seat ? { name: seat.name, heroClassId: seat.heroClassId, online: now - seat.seenAt < ONLINE_MS } : null;
  }
  return { ok: true, code: room.code, me, v, serverTime: now, seats, state: room.state };
}

function seatOf(room, token) {
  if (typeof token !== 'string' || token.length < 20) return null;
  return SEATS.find(id => room.seats[id]?.token === token) ?? null;
}

async function withRoom(code, mutate) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const raw = await storage.get(keyOf(code));
    if (!raw) throw new HttpError(404, 'Místnost neexistuje nebo vypršela.');
    const { v, room } = decode(raw);
    const now = Date.now();
    const result = mutate(room, now);
    if (await storage.cas(keyOf(code), v, (v + 1) + '|' + JSON.stringify(room))) {
      return { room, v: v + 1, now, result };
    }
  }
  throw new HttpError(503, 'Místnost je zaneprázdněná, zkus to znovu.');
}

export async function handle(body) {
  const action = body?.action;

  // 1. Vytvoření místnosti
  if (action === 'create') {
    const now = Date.now();
    const token = newToken();
    const name = cleanName(body.name, 'Hrdina 1');
    const heroClassId = body.heroClassId || 'warrior';

    const room = {
      code: '',
      createdAt: now,
      updatedAt: now,
      state: body.initialState || null,
      seats: {
        p1: { token, name, heroClassId, seenAt: now },
        p2: null,
      },
    };

    for (let i = 0; i < 20; i++) {
      room.code = String(100000 + Math.floor(Math.random() * 900000));
      if (await storage.cas(keyOf(room.code), 0, '1|' + JSON.stringify(room))) {
        return { ...publicRoom(room, 1, 'p1', now), token };
      }
    }
    throw new HttpError(503, 'Nepodařilo se vygenerovat volný kód místnosti.');
  }

  const code = cleanCode(body?.code);
  if (!code) throw new HttpError(400, 'Kód místnosti musí mít 6 číslic.');

  // 2. Připojení druhého hráče
  if (action === 'join') {
    let token = null;
    const { room, v, now, result: me } = await withRoom(code, (room, now) => {
      const existing = seatOf(room, body.token);
      if (existing) {
        room.seats[existing].seenAt = now;
        token = body.token;
        return existing;
      }

      if (room.seats.p2) throw new HttpError(409, 'Místnost je již plná (2 hráči).');

      token = newToken();
      const name = cleanName(body.name, 'Hrdina 2');
      const heroClassId = body.heroClassId || 'mage';
      room.seats.p2 = { token, name, heroClassId, seenAt: now };

      // Pokud máme stav hry, synchronizujeme jméno hráče 2
      if (room.state && room.state.players && room.state.players[1]) {
        room.state.players[1].name = name;
        room.state.gameLog = [
          `${name} se připojil do hry jako Hráč 2!`,
          ...(room.state.gameLog || []).slice(0, 15),
        ];
      }

      return 'p2';
    });

    return { ...publicRoom(room, v, me, now), token };
  }

  // 3. Synchronizace stavu
  if (action === 'sync') {
    const { room, v, now, result: me } = await withRoom(code, (room, now) => {
      const me = seatOf(room, body.token);
      if (!me) throw new HttpError(403, 'Neplatný token pro tuto místnost.');
      room.seats[me].seenAt = now;
      return me;
    });
    return publicRoom(room, v, me, now);
  }

  // 4. Aktualizace herního stavu po provedení tahu
  if (action === 'update') {
    if (!body.state) throw new HttpError(400, 'Chybí herní stav (state).');

    const { room, v, now, result: me } = await withRoom(code, (room, now) => {
      const me = seatOf(room, body.token);
      if (!me) throw new HttpError(403, 'Neplatný token pro tuto místnost.');
      room.seats[me].seenAt = now;
      room.state = body.state;
      room.updatedAt = now;
      return me;
    });

    return publicRoom(room, v, me, now);
  }

  throw new HttpError(400, 'Neznámá akce.');
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Použij POST.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    return res.status(200).json(await handle(body));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    return res.status(status).json({ ok: false, error: status === 500 ? 'Chyba serveru.' : e.message });
  }
}
