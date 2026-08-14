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

import { buildRecord, deriveResult, splitTerm, summarize } from './result.js';
import { honours } from './stats.js';

// Keys. `sum:` holds everything except the move list, so listing a term for a
// league table stays cheap however many games have accumulated.
const K_CONFIG = 'config';
const gameKey = (id) => `game:${id}`;
const sumKey = (term, id) => `sum:${term}|${id}`;
// ⚖️ **The roster is per term**, so a cohort's class list survives the next
// cohort arriving. A single global list would have been simpler and was what
// step 5 shipped for a day; it made "who was in the 2026 class" unanswerable
// the moment 2027 pasted over it, which is the opposite of an archive that is
// supposed to outlive the term. Free to change while the archive is empty,
// a migration afterwards — the same reasoning as rules spec §10.
const rosterKey = (term) => `roster:${term}`;
// The champion's own emblem and quote, one card per term (build step 6).
const championKey = (term) => `champion:${term}`;
// What a global roster was stored under before that. Read-only, so nothing
// pasted in on day one is lost; the first save per term writes the new shape.
const K_LEGACY_ROSTER = 'roster';

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
    const term = c.term || null; // e.g. 'ler565-2027-summer'; null = nothing records
    return {
      term,
      // Derived, not stored: the term is the source and this is one hyphen's
      // worth of reading it. Records stamp their own copy (result.js) because
      // they outlive every config that wrote them; here it is so the admin page
      // can *show* the instructor what a term key just became, and catch a typo
      // while it is still free to fix.
      ...splitTerm(term),
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
    // Read it back rather than reshaping `next` by hand, so a save and a load
    // can never hand the admin page two different shapes.
    return this.config();
  }

  // The class list for a term — the current one unless you ask for another.
  async roster(term) {
    const t = term === undefined ? (await this.config()).term : cleanTerm(term);
    if (!t) return [];
    return (await this.store.get(rosterKey(t))) || (await this.store.get(K_LEGACY_ROSTER)) || [];
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
  //
  // ⚖️ Ids are **not** scoped to the term, deliberately, even though the roster
  // is. Across cohorts the same name means the same person, which is what makes
  // an all-time Record Book and a Hall of Champions possible at all — a student
  // who takes the course twice keeps one history. The cost is that two
  // different people with the same name in different years would merge in
  // all-time records. In a class of 14 to 36 that is a small risk against a
  // large gain, and it never touches a term's own table: those read one term's
  // summaries, where the roster made every id unique.
  async setRoster(list, term) {
    const t = term === undefined ? (await this.config()).term : cleanTerm(term);
    if (!t) return []; // no term, nowhere to put a class list
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
    await this.store.put(rosterKey(t), roster);
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
    // The instructor is a playable name like any other, but their games never
    // count in the league, the records or the awards (rules spec §10). The
    // instructor plus exactly one student is a **Boss Battle** — the voluntary
    // outside-class challenge, with its own board; any other shape with the
    // instructor in it is an exhibition. ⚠️ Week 1's demo match is
    // instructor-versus-one-student too, so it auto-tags as `boss` and is one
    // click to retag in the admin page — the same machinery as the Cup final,
    // and the right default: the common case costs nothing.
    const bosses = people.filter((p) => p.instructor).length;
    const mode = bosses
      ? bosses === 1 && people.length === 2
        ? 'boss'
        : 'exhibition'
      : cleanMode(room.mode);
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

  // Every cohort the archive knows about — the ones with games, and the ones
  // set up but not yet played. This is what makes the archive outlive a term:
  // an all-time query is these, merged.
  async terms() {
    const games = await this.store.list({ prefix: 'sum:' });
    const rosters = await this.store.list({ prefix: 'roster:' });
    return [
      ...new Set([
        ...[...games.keys()].map((k) => k.slice(4, k.indexOf('|'))),
        ...[...rosters.keys()].map((k) => k.slice('roster:'.length)),
      ]),
    ].sort();
  }

  // --- leagues --------------------------------------------------------------
  //
  // A league is the front of the term key and nothing else — there is no league
  // object, deliberately (PAVILION.md, *Leagues and the records site*). So the
  // list of leagues is the list of terms, grouped. Cheap, and it means creating
  // a league is exactly the act of typing a new term key in the admin page.

  async leagues() {
    const terms = await this.terms();
    const counts = await this.store.list({ prefix: 'sum:' });
    const played = new Map();
    for (const key of counts.keys()) {
      const t = key.slice(4, key.indexOf('|'));
      played.set(t, (played.get(t) || 0) + 1);
    }

    const out = new Map();
    for (const term of terms) {
      const { league, season } = splitTerm(term);
      if (!out.has(league)) out.set(league, { league, games: 0, seasons: [] });
      const entry = out.get(league);
      const games = played.get(term) || 0;
      entry.games += games;
      entry.seasons.push({ season, term, games });
    }
    for (const entry of out.values()) {
      entry.seasons.sort((a, b) => String(b.season ?? '').localeCompare(String(a.season ?? '')));
    }
    return [...out.values()].sort((a, b) => a.league.localeCompare(b.league));
  }

  // Every summary in a league, optionally one season of it. This is the whole
  // records site's data: the table, the Record Book and the honours are all
  // `relay/stats.js` queries over this array, computed in the page.
  //
  // ⚠️ Summaries only — a records page must never pull move lists. A term of
  // games is kilobytes this way and megabytes the other.
  async leagueGames(league, { season = null, limit = 2000 } = {}) {
    const wanted = cleanTerm(league);
    if (!wanted) return [];
    const terms = (await this.terms()).filter((t) => {
      const split = splitTerm(t);
      return split.league === wanted && (season === null || split.season === season);
    });

    const out = [];
    for (const term of terms) {
      if (out.length >= limit) break;
      const games = await this.games(term, { limit: limit - out.length });
      // Filter on the *stamped* field, not the key we searched by: the record
      // is what an all-time table is built from, so the record decides.
      out.push(...games.filter((g) => (g.league ?? splitTerm(g.term).league) === wanted));
    }
    return out.sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
  }

  // The class list per season, which the records site needs for a reason the
  // league table alone doesn't reveal: a student who has not played yet has to
  // appear on the page *with nothing beside their name*. Derived from the
  // roster rather than from the games, so it is right in week 0 — a term with a
  // roster and no games is exactly the state the first class starts in.
  async leagueRosters(league, { season = null } = {}) {
    const wanted = cleanTerm(league);
    if (!wanted) return [];
    const terms = (await this.terms()).filter((t) => {
      const split = splitTerm(t);
      return split.league === wanted && (season === null || split.season === season);
    });
    const out = [];
    for (const term of terms) {
      out.push({ term, season: splitTerm(term).season, players: await this.roster(term) });
    }
    return out.sort((a, b) => String(b.season ?? '').localeCompare(String(a.season ?? '')));
  }

  // --- the Hall of Champions ------------------------------------------------
  //
  // The winner is *derived* — it is whoever won the last cup game of the term,
  // replayed from the moves like everything else, and nobody reports it. What
  // is stored here is only the decoration the champion chooses: an emblem and a
  // line to be remembered by. Editorial content, not a result.
  //
  // ⚠️ The card carries the **player id it was written for**. If a game is
  // later voided and the title moves, somebody else's emblem and quote must not
  // silently transfer onto the new champion's trophy — the cabinet falls back
  // to a plain trophy instead, and the admin page can write a new card.

  async champion(term) {
    const t = cleanTerm(term);
    if (!t) return null;
    const [roll] = honours(await this.games(t));
    const won = roll?.cup || null;
    const card = (await this.store.get(championKey(t))) || null;
    if (!won) return null;
    return {
      term: t,
      season: splitTerm(t).season,
      ...won,
      emblem: card && card.pid === won.id ? card.emblem : null,
      quote: card && card.pid === won.id ? card.quote : '',
      stale: !!card && card.pid !== won.id,
    };
  }

  async setChampion(term, { emblem = null, quote = '' } = {}, now = Date.now()) {
    const t = cleanTerm(term);
    if (!t) return null;
    const [roll] = honours(await this.games(t));
    if (!roll?.cup) return null; // no champion yet, nothing to decorate
    await this.store.put(championKey(t), {
      pid: roll.cup.id,
      emblem: emblem ? slug(emblem) : null,
      // A cabinet card is a line, not an essay. The cap is the design.
      quote: cleanQuote(quote),
      updatedAt: now,
    });
    return this.champion(t);
  }

  // Every champion the league has ever had, newest first — the cabinet.
  async champions(league, { season = null } = {}) {
    const wanted = cleanTerm(league);
    if (!wanted) return [];
    const terms = (await this.terms()).filter((t) => {
      const split = splitTerm(t);
      return split.league === wanted && (season === null || split.season === season);
    });
    const out = [];
    for (const term of terms) {
      const champ = await this.champion(term);
      if (champ) out.push(champ);
    }
    return out.sort((a, b) => String(b.season ?? '').localeCompare(String(a.season ?? '')));
  }

  // --- deleting -------------------------------------------------------------
  //
  // ⚠️ Real deletion, not a flag. Voiding is the instructor's tool for a game
  // that happened and should not count (§11); this is for games that should
  // never have been in the archive at all — a demo run, a test, a room two
  // people opened by accident. The distinction matters because the archive is
  // meant to be the course's record, and a record full of test data is one
  // nobody trusts.

  async deleteGame(id) {
    const rec = await this.game(id);
    if (!rec) return false;
    await this.store.delete(gameKey(id));
    await this.store.delete(sumKey(rec.term, id));
    return true;
  }

  // A whole cohort: every game and the class list with it. Irreversible, and
  // the API makes the caller name the term twice to prove it meant it.
  async deleteTerm(term) {
    const t = cleanTerm(term);
    if (!t) return 0;
    const map = await this.store.list({ prefix: `sum:${t}|` });
    let n = 0;
    for (const key of map.keys()) {
      await this.store.delete(gameKey(key.slice(key.indexOf('|') + 1)));
      await this.store.delete(key);
      n++;
    }
    await this.store.delete(rosterKey(t));
    return n;
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

// ⚠️ **The one list of routes reachable from outside.** Both hosts allow-list
// against this rather than keeping their own copy, for the same reason
// `room.js` is one state machine: a route that becomes public in one host and
// not the other is a bug nobody notices until the wrong one is deployed.
//
// `/record` is absent, and that absence is the security model. It writes a game
// and is reachable only from a finished room's own stub fetch; publishing it
// would make every result in the archive forgeable by anyone with curl.
export const PUBLIC_ROUTES = ['/session', '/records/leagues', '/records/games'];

export function isPublicRoute(route) {
  return PUBLIC_ROUTES.includes(route);
}

export async function apiRoute(archive, { route, method = 'GET', query = {}, body = {} }) {
  switch (route) {
    // What the setup screen asks for on the way in: is there a term, and who
    // is in the class? Public, because the class is not a secret to itself.
    case '/session':
      return ok(await archive.session());

    // The records site, and the only other public reads. Both hosts allow-list
    // these by name (worker.js, dev-relay.js) — see PUBLIC_ROUTES below.
    //
    // ⚠️ Public means public: these carry names and scores, which the roster
    // already does by design. A league that should not be stumbled on is given
    // an unguessable term key, not a permission system — the flag that keeps a
    // league off the hub is the hub not linking to it (PAVILION.md).
    case '/records/leagues':
      return ok({ leagues: await archive.leagues() });

    case '/records/games': {
      const league = query.league || '';
      if (!league) return fail(400, 'name a league');
      const season = query.season === undefined || query.season === '' ? null : query.season;
      return ok({
        league,
        season,
        games: await archive.leagueGames(league, { season }),
        // The class lists, one per season. Public like the rest of the roster,
        // and for the same reason: the class is not a secret to the class.
        rosters: await archive.leagueRosters(league, { season }),
        // The trophy cabinet: every champion the league has had, with whatever
        // emblem and line they chose. Deliberately not filtered by the season
        // picker — a cabinet showing one year is a shelf.
        champions: await archive.champions(league),
      });
    }

    case '/admin/state': {
      const config = await archive.config();
      const term = query.term || config.term;
      return ok({
        config,
        // The roster shown is the one being *edited* — the current term's.
        // The `term` query only browses another cohort's games.
        roster: await archive.roster(),
        terms: await archive.terms(),
        games: term ? await archive.games(term, { limit: 200 }) : [],
        // Who won the shown term's Cup, and the card they have (if any), so the
        // admin page can write one without deriving the winner itself.
        champion: term ? await archive.champion(term) : null,
      });
    }

    case '/admin/config':
      return ok(await archive.setConfig(body));

    case '/admin/roster':
      return ok({ roster: await archive.setRoster(body.roster, body.term) });

    // The champion's emblem and quote. The *winner* is never set here — it is
    // derived from the cup game like every other result, and this route refuses
    // when there isn't one yet.
    case '/admin/champion': {
      const term = body.term || (await archive.config()).term;
      const champ = await archive.setChampion(term, body);
      return champ ? ok(champ) : fail(400, 'no champion in that term yet');
    }

    case '/admin/game': {
      if (method === 'GET') {
        const rec = await archive.game(query.id);
        return rec ? ok(rec) : fail(404, 'no such game');
      }
      if (body.delete) {
        return (await archive.deleteGame(body.id)) ? ok({ deleted: body.id }) : fail(404, 'no such game');
      }
      let sum = null;
      if (body.mode) sum = await archive.setMode(body.id, body.mode);
      if (body.ending) sum = await archive.setEnding(body.id, body.ending, body.reason);
      return sum ? ok(sum) : fail(404, 'no such game');
    }

    // Wiping a cohort. ⚠️ The caller has to name the term twice — the admin
    // page makes you type it, and this refuses even a well-formed request that
    // doesn't. A misclick should not be able to delete a term's worth of games.
    case '/admin/term': {
      if (!body.term || body.confirm !== body.term) return fail(400, 'name the term twice to delete it');
      const config = await archive.config();
      const deleted = await archive.deleteTerm(body.term);
      // Deleting the term you are standing in leaves nothing recording, which
      // is the honest state — better than silently pointing at a term whose
      // roster has just gone.
      if (cleanTerm(body.term) === config.term) await archive.setConfig({ term: null });
      return ok({ deleted, term: body.term });
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

const MODES = ['league', 'cup', 'exhibition', 'practice', 'casual', 'boss'];

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

// A line under a trophy, not a paragraph beside it.
function cleanQuote(s) {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, 140) : '';
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
