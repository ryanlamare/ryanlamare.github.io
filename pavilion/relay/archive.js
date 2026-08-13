// Pavilion — the archive: term, roster, and every game ever played.
//
// Build step 5. "Archive whole games, not results" (PAVILION.md): a stored game
// is `seed + move list`, so an award invented in week 5 applies retroactively
// to week 1 and nothing has to be instrumented in advance. Every record carries
// a `term` from day one, so the Record Book accrues across *years* rather than
// weeks.
//
// Storage-shaped but host-free. It talks to a tiny key/value interface —
// `get` / `put` / `delete` / `list({prefix})` — which is exactly Cloudflare's
// Durable Object storage API, so `worker.js` hands it `state.storage` directly.
// `dev-relay.js` and `test/archive.test.js` hand it the MemoryStore below, and
// so exercise the same code the class will run.
//
// Theme-neutral (rules spec §10). Nothing stored here knows what a discipline
// is called, which is what lets the theme move a fourth time without a
// migration of the archive.

import { buildRecord, deriveResult, summarize } from './result.js';

// Keys. `sum:` holds everything except the move list, so listing a term for a
// league table stays cheap however many games have accumulated.
const K_CONFIG = 'config';
const K_ROSTER = 'roster';
const gameKey = (id) => `game:${id}`;
const sumKey = (term, id) => `sum:${term}|${id}`;

// Public board length is "sized to the class" and deliberately a setting, not a
// constant: five of fourteen is a third of the room, five of thirty is a sixth
// and thin enough that most people have nothing to chase (PAVILION.md).
const DEFAULT_BOARD_SIZE = 5;

export class Archive {
  constructor(store) {
    this.store = store;
  }

  // --- term and roster ------------------------------------------------------

  async config() {
    const c = (await this.store.get(K_CONFIG)) || {};
    return {
      term: c.term || null, // e.g. '2026-fall'; null = no term, nothing records
      boardSize: c.boardSize || DEFAULT_BOARD_SIZE,
      updatedAt: c.updatedAt || null,
    };
  }

  async setConfig(patch, now = Date.now()) {
    const cur = await this.config();
    const next = {
      term: patch.term === undefined ? cur.term : cleanTerm(patch.term),
      boardSize: patch.boardSize === undefined ? cur.boardSize : clampBoardSize(patch.boardSize),
      updatedAt: now,
    };
    await this.store.put(K_CONFIG, next);
    return next;
  }

  async roster() {
    return (await this.store.get(K_ROSTER)) || [];
  }

  // The roster is the identity system (PAVILION.md, Identity): the join screen
  // lists the class and you click your name. There is no password, and that is
  // the design — *the security is that you can see them*. They are in your Zoom
  // room, you assigned the pairings, and two people cannot claim one name in a
  // session without it showing.
  //
  // Ids are slugs of the name, so re-pasting the same roster keeps every id and
  // the history attached to it. ⚠️ Renaming a student therefore mints a new id
  // and orphans their games; the admin page says so.
  async setRoster(list) {
    const seen = new Map();
    const roster = [];
    for (const entry of list || []) {
      const name = cleanName(typeof entry === 'string' ? entry : entry.name);
      if (!name) continue;
      const instructor = typeof entry === 'object' && !!entry.instructor;
      const base = slug(name) || 'player';
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      roster.push({ id: n === 1 ? base : `${base}-${n}`, name, instructor });
    }
    await this.store.put(K_ROSTER, roster);
    return roster;
  }

  // What the setup screen asks for on the way in. Public on purpose: the names
  // of the class are not a secret to the class, and a login here would defeat
  // the entire point (PAVILION.md, Identity — no accounts, ever).
  async session() {
    const [config, roster] = await Promise.all([this.config(), this.roster()]);
    return { term: config.term, boardSize: config.boardSize, roster };
  }

  // --- games ----------------------------------------------------------------

  // Whether a finished room should record at all, and as what.
  //
  // Games only record when there is a term *and* every seat is a roster member
  // — so the archive is exactly the course's record and nothing else. A game
  // played by someone who typed their name (the game is public and carries no
  // course branding) plays normally and simply does not record.
  async classify(room) {
    const { term } = await this.config();
    if (!term) return { record: false, why: 'no term configured' };
    const roster = await this.roster();
    const by = new Map(roster.map((r) => [r.id, r]));
    const people = (room.seats || []).map((s) => by.get(s.pid));
    if (!people.length || people.some((p) => !p)) {
      return { record: false, why: 'not everyone is on the roster' };
    }
    // The instructor is a playable name like any other, and week 1 opens with a
    // live demo match — but those games are exhibitions: archived, and excluded
    // from the league, records and awards by default (rules spec §10).
    const mode = people.some((p) => p.instructor) ? 'exhibition' : cleanMode(room.mode);
    return { record: true, term, mode };
  }

  // The whole of "results record themselves" (PAVILION.md): a finished room
  // arrives, and this classifies it, replays it, derives the winner and stores
  // it. There is no submit button and nobody reports anything — faking a
  // result would mean fabricating a legal move sequence that your opponent's
  // client independently corroborated.
  //
  // Called by the Cloudflare archive DO and by dev-relay.js, so a laptop
  // playtest records exactly the way the class will.
  async record(room, now = Date.now()) {
    const verdict = await this.classify(room);
    if (!verdict.record) return { recorded: false, why: verdict.why };

    const id = gameId(room, now);
    const result = deriveResult(room);
    const rec = buildRecord(room, { term: verdict.term, mode: verdict.mode, id, at: now, result });
    const sum = await this.put(rec);
    return { recorded: true, id, term: sum.term, mode: sum.mode, names: sum.names, result: sum.result };
  }

  // Write a finished game — the full record under `game:`, and the same thing
  // without its move list under `sum:`. Returns the summary.
  async put(rec) {
    await this.store.put(gameKey(rec.id), rec);
    const sum = summarize(rec);
    await this.store.put(sumKey(rec.term, rec.id), sum);
    return sum;
  }

  async game(id) {
    return (await this.store.get(gameKey(id))) || null;
  }

  // Summaries for a term, newest first. The whole league table, the Record Book
  // and the stats screens are queries over this list (build step 6).
  async games(term, { limit = 500 } = {}) {
    const map = await this.store.list({ prefix: `sum:${term}|`, limit });
    return [...map.values()].sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
  }

  async terms() {
    const map = await this.store.list({ prefix: 'sum:' });
    return [...new Set([...map.keys()].map((k) => k.slice(4, k.indexOf('|'))))].sort();
  }

  // --- instructor overrides -------------------------------------------------
  //
  // Two things only a human can decide. Both rewrite the record in place; the
  // move list is never touched, so the game stays replayable and any derived
  // stat can be recomputed from scratch.

  // "Only real endings count. A dropped connection voids, with an instructor
  // override" — otherwise bad wifi becomes a permanent mark on the league
  // table (PAVILION.md). Void is the last resort, never the default (§11).
  async setEnding(id, ending, reason = '') {
    return this.#amend(id, (rec) => {
      if (ending === 'void') {
        rec.result = {
          ...rec.result,
          ending: 'void',
          points: null,
          reason: reason || 'voided by the instructor',
          // ⚠️ Keep how the game *actually* ended. Without this, restoring a
          // voided timeout would re-derive it as a natural end, the replay
          // would find a game the moves never finish, and it would void
          // itself straight back again.
          wasEnding: rec.result?.ending === 'void' ? rec.result.wasEnding : rec.result?.ending,
          wasFlagged: rec.result?.ending === 'void' ? rec.result.wasFlagged : rec.result?.flagged,
        };
        return;
      }
      // Un-voiding **re-derives from the move list** rather than restoring
      // whatever numbers were there before. Nobody reports a result here
      // either — including the instructor.
      rec.result = deriveResult(
        { seed: rec.seed, players: rec.players, moves: rec.moves, code: rec.room, seats: rec.seats },
        {
          ending: rec.result?.wasEnding || ending,
          flagged: rec.result?.wasFlagged ?? rec.result?.flagged ?? null,
        }
      );
    });
  }

  // Retagging is how a cup game becomes a cup game: the week 6 knockout runs in
  // the same rooms as the league, and asking the instructor to configure a mode
  // before every match is exactly the weekly work this project exists to avoid.
  async setMode(id, mode) {
    return this.#amend(id, (rec) => {
      rec.mode = cleanMode(mode, rec.mode);
    });
  }

  async #amend(id, fn) {
    const rec = await this.game(id);
    if (!rec) return null;
    fn(rec);
    return this.put(rec);
  }
}

// ---------------------------------------------------------------------------
// The API, as one route table.
//
// `room.js` is one state machine that both relays run; this is the same idea
// for the archive. The Cloudflare `GameArchive` object and `dev-relay.js` both
// dispatch here, so a laptop playtest and the class answer identically and the
// admin page has one server to talk to rather than two dialects.
//
// ⚠️ Authentication is **not** here. The caller decides who may reach which
// route — the Worker checks the instructor's secret and refuses to forward
// anything but `/session` and `/admin/*`, which is what keeps `/record`
// reachable only from a room (relay/worker.js).

export async function apiRoute(archive, { route, method = 'GET', query = {}, body = {} }) {
  switch (route) {
    // What the setup screen asks for on the way in: is there a term, and who
    // is in the class? Public, because the class is not a secret to itself.
    case '/session':
      return ok(await archive.session());

    case '/admin/state': {
      const config = await archive.config();
      const term = query.term || config.term;
      return ok({
        config,
        roster: await archive.roster(),
        terms: await archive.terms(),
        games: term ? await archive.games(term, { limit: 200 }) : [],
      });
    }

    case '/admin/config':
      return ok(await archive.setConfig(body));

    case '/admin/roster':
      return ok({ roster: await archive.setRoster(body.roster) });

    case '/admin/game': {
      if (method === 'GET') {
        const rec = await archive.game(query.id);
        return rec ? ok(rec) : fail(404, 'no such game');
      }
      let sum = null;
      if (body.mode) sum = await archive.setMode(body.id, body.mode);
      if (body.ending) sum = await archive.setEnding(body.id, body.ending, body.reason);
      return sum ? ok(sum) : fail(404, 'no such game');
    }

    // A finished room, arriving from a room. Never routed from outside.
    case '/record':
      return ok(await archive.record(body));

    default:
      return fail(404, 'no such route');
  }
}

const ok = (body) => ({ status: 200, body });
const fail = (status, error) => ({ status, body: { error } });

// ---------------------------------------------------------------------------
// Validation. Everything reaching the archive from a form or a socket goes
// through here first — a stored record outlives every screen that wrote it.

const MODES = ['league', 'cup', 'exhibition', 'practice', 'casual'];

// ⚖️ `casual` is ours, added in step 5: rules spec §10 lists four modes for
// games with a course behind them, and the game is now public and unbranded.
// It is never written by `classify` (an unrostered game does not record at
// all) and exists so a record can be retagged out of the league by hand.
function cleanMode(m, fallback = 'league') {
  return MODES.includes(m) ? m : fallback;
}

function cleanTerm(t) {
  const s = slug(String(t || ''));
  return s ? s.slice(0, 32) : null;
}

function clampBoardSize(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v >= 3 && v <= 20 ? v : DEFAULT_BOARD_SIZE;
}

function cleanName(s) {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
}

// Ids have to survive being a storage key and a URL segment, so: lower case,
// unaccented, and nothing but a-z, 0-9 and a hyphen.
function slug(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// A game id has to be unique, stable across a re-derive, and safe as a key.
// Room code plus start time is both: a room hosts one game at a time, and a
// rematch restamps `startedAt`.
export function gameId(room, at) {
  return [slug(room.code || 'room'), room.startedAt || at, slug(room.seed).slice(0, 12)]
    .filter(Boolean)
    .join('-');
}

// ---------------------------------------------------------------------------
// A Durable-Object-shaped store backed by a Map. The dev relay uses it so a
// laptop playtest archives exactly as the class will, and the test suite uses
// it to drive the Archive above with no server at all.

export class MemoryStore {
  constructor(seed = null) {
    this.map = new Map(seed ? Object.entries(seed) : []);
  }

  async get(key) {
    const v = this.map.get(key);
    return v === undefined ? undefined : clone(v);
  }

  async put(key, value) {
    this.map.set(key, clone(value));
  }

  async delete(key) {
    return this.map.delete(key);
  }

  async list({ prefix = '', limit = Infinity } = {}) {
    const out = new Map();
    for (const key of [...this.map.keys()].sort()) {
      if (!key.startsWith(prefix)) continue;
      if (out.size >= limit) break;
      out.set(key, clone(this.map.get(key)));
    }
    return out;
  }
}

// Durable Object storage serializes on write, so a caller can never mutate
// what it stored by holding onto the object. Match that, or a bug shows up
// only in production.
function clone(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}
