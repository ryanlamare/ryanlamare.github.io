// Pavilion relay — the Cloudflare one, for the class.
//
// Two Durable Objects. One per **room**, holding the WebSockets and the move
// log; and one **archive**, a singleton holding the term, the roster and every
// game ever played. The Worker in front picks between them. Both rooms run the
// same `room.js` as the laptop relay, so that half is transport and storage,
// never protocol.
//
// Why this and not a free Node host (PAVILION.md, Open questions): the server
// must run the *same engine module* the clients do, and it must not cold-start
// at class time. A Durable Object is warm, is addressed by name — which a room
// code already is — and is a WebSocket endpoint on the free plan.
//
//   npx wrangler dev      # local, at ws://localhost:8787 — same as dev-relay
//   npx wrangler deploy   # then put the wss:// URL in ../net.js
//   npx wrangler secret put ADMIN_SECRET    # once, before the admin page works
//
// Build step 5 is where the engine arrives (`result.js`, via the archive): a
// finished game is replayed from `seed + move list` and the winner derived
// here, so a client's claimed result stops being taken on trust.

import { Room, roomCode } from './room.js';
import { Archive, apiRoute, isPublicRoute } from './archive.js';

// A room nobody has touched in this long is fair game for a new game to reuse
// the code. A class runs for two hours; a term does not.
const STALE_MS = 8 * 3600 * 1000;

// One archive, addressed by a fixed name. Everything in it is a term away from
// everything else, so there is never a reason for a second.
const ARCHIVE_NAME = 'archive';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    // The API is read from a page on another origin (ryanlamare.com) and the
    // Worker is on workers.dev, so every answer needs CORS. Reads are public
    // by design — a login on the roster would defeat the whole point
    // (PAVILION.md, Identity) — and writes carry the instructor's secret.
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));

    if (path.startsWith('/api/')) {
      // ⚠️ An allow-list, not a prefix strip. The archive DO also answers
      // `/record` — the route that writes a game — and that route must be
      // reachable **only** from a room DO's stub fetch. Forwarding whatever
      // arrives under /api/ would publish it and make the archive forgeable,
      // which is the one property this whole design exists to have.
      const route = path.slice('/api'.length);
      const admin = route.startsWith('/admin/');
      if (!isPublicRoute(route) && !admin) return cors(json({ error: 'not found' }, 404));
      if (admin && !authorized(request, env)) return cors(json({ error: 'unauthorized' }, 401));

      const stub = env.ARCHIVE.get(env.ARCHIVE.idFromName(ARCHIVE_NAME));
      return cors(await stub.fetch(new Request(`https://archive${route}${url.search}`, request)));
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return cors(json({ relay: 'pavilion', protocol: 1, archive: true, ok: true }));
    }

    let code;
    if (path === '/new') {
      // The Worker owns collision avoidance because only it can look at more
      // than one room. Six tries against 144 pairs is plenty for a class.
      for (let i = 0; i < 6 && !code; i++) {
        const candidate = roomCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(candidate));
        const res = await stub.fetch('https://room/claim');
        if (res.status === 200) code = candidate;
      }
      if (!code) return new Response('no free room code', { status: 503 });
    } else if (path.startsWith('/room/')) {
      code = decodeURIComponent(path.slice('/room/'.length)).toUpperCase();
      if (!/^[A-Z]+-[A-Z]+$/.test(code)) return new Response('bad room code', { status: 400 });
    } else {
      return new Response('not found', { status: 404 });
    }

    const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
    const fresh = path === '/new' ? '1' : '0';
    return stub.fetch(
      new Request(`https://room/connect?code=${encodeURIComponent(code)}&fresh=${fresh}`, request)
    );
  },
};

// One shared secret, set with `wrangler secret put ADMIN_SECRET`. That is the
// whole of instructor auth, and deliberately so: there is exactly one
// instructor, and anything more is an account system for a class that was
// promised it would never need one.
function authorized(request, env) {
  const secret = env.ADMIN_SECRET;
  if (!secret) return false; // unset means the admin page is simply closed
  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= given.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 1), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function cors(res) {
  const out = new Response(res.body, res);
  out.headers.set('access-control-allow-origin', '*');
  out.headers.set('access-control-allow-methods', 'GET, POST, OPTIONS');
  out.headers.set('access-control-allow-headers', 'authorization, content-type');
  out.headers.set('access-control-max-age', '86400');
  return out;
}

// ---------------------------------------------------------------------------
// The archive.

// The class name is free to be a good one — unlike HeadcountRoom below, this
// object has never been deployed, so there is nothing behind it to migrate.
// Neutral rather than themed, for the reason rules spec §10 gives: the archive
// outlives the theme, and the theme has already moved three times.
export class GameArchive {
  constructor(state) {
    this.state = state;
    this.archive = new Archive(state.storage);
  }

  // Transport only. Every route lives in `archive.js`'s one table, which
  // dev-relay.js dispatches to as well — the same arrangement `room.js` has,
  // and for the same reason. Who is *allowed* to reach a route was decided by
  // the Worker above, before this object was ever addressed.
  async fetch(request) {
    const url = new URL(request.url);
    const res = await apiRoute(this.archive, {
      route: url.pathname.replace(/\/+$/, '') || '/',
      method: request.method,
      query: Object.fromEntries(url.searchParams),
      body: request.method === 'POST' ? await request.json().catch(() => ({})) : {},
    });
    return json(res.body, res.status);
  }
}

// ---------------------------------------------------------------------------
// The rooms.

// ⚠️ The class name and the Worker's name in wrangler.toml are **deployment
// identifiers**, not the game's name. They stay `Headcount*` deliberately: the
// relay is live at wss://headcount-relay.rlamare.workers.dev with games running
// through it, and renaming a Durable Object class needs a `renamed_classes`
// migration while renaming the Worker mints a second one at a second URL. The
// theme lives in the copy layer; this is plumbing (PAVILION.md, Theme).
export class HeadcountRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.room = null;
    // A deploy or an eviction must not lose a game in progress: the room comes
    // back from storage before any request is served.
    state.blockConcurrencyWhile(async () => {
      const saved = await state.storage.get('room');
      if (saved) this.room = Room.from(saved, { hooks: this.hooks() });
    });
  }

  // The room stays engine-free and storage-free; this is the one thread back
  // out to the archive (room.js, `finish`).
  hooks() {
    return { onEnded: (room) => this.state.waitUntil(this.archive(room)) };
  }

  async archive(room) {
    try {
      const stub = this.env.ARCHIVE.get(this.env.ARCHIVE.idFromName(ARCHIVE_NAME));
      const res = await stub.fetch('https://archive/record', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(room.snapshot()),
      });
      room.setRecorded(await res.json());
    } catch (err) {
      console.error('[room] archive', err);
      // The move list is still in the room and still in both clients. Say the
      // truth rather than claim a record that isn't there.
      room.setRecorded({ recorded: false, why: 'the archive could not be reached' });
    }
    this.persist();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/claim') {
      const live =
        this.room && (this.room.conns.size > 0 || Date.now() - this.room.lastTouched < STALE_MS);
      return new Response(live ? 'in use' : 'free', { status: live ? 409 : 200 });
    }

    const code = url.searchParams.get('code');
    const fresh = url.searchParams.get('fresh') === '1';

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    if (fresh || !this.room || Date.now() - this.room.lastTouched > STALE_MS) {
      if (!fresh) {
        // Joining a room that isn't there. Say so over the socket rather than
        // failing the upgrade, so the client gets a message it can show.
        server.send(JSON.stringify({ t: 'error', code: 'no-room', msg: `No room called ${code}.` }));
        server.close(1000, 'no room');
        return new Response(null, { status: 101, webSocket: client });
      }
      this.room = new Room(code, { hooks: this.hooks() });
    }

    let helloed = false;
    server.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (!helloed) {
        if (msg.t !== 'hello') return;
        helloed = true;
        if (fresh) this.room.configure(msg);
        if (!this.room.open(server, msg)) server.close(1000, 'refused');
      } else {
        this.room.message(server, msg);
      }
      this.persist();
    });

    const bye = () => {
      this.room.close(server);
      this.persist();
    };
    server.addEventListener('close', bye);
    server.addEventListener('error', bye);

    return new Response(null, { status: 101, webSocket: client });
  }

  // Kilobytes, after every message. Not awaited: Durable Object writes are
  // ordered and coalesced, and nothing here reads back what it just wrote.
  persist() {
    this.state.storage.put('room', this.room.snapshot()).catch((err) => console.error(err));
  }
}
