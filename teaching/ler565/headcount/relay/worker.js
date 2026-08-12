// Headcount relay — the Cloudflare one, for the class.
//
// One Durable Object per room, holding the WebSockets and the move log; the
// Worker in front only picks the room. Both run the same `room.js` as the
// laptop relay, so this file is transport and storage, never protocol.
//
// Why this and not a free Node host (HEADCOUNT.md, Open questions): the server
// must eventually run the *same engine module* the clients do, and it must not
// cold-start at class time. A Durable Object is warm, is addressed by name —
// which a room code already is — and is a WebSocket endpoint on the free plan.
//
//   npx wrangler dev      # local, at ws://localhost:8787 — same as dev-relay
//   npx wrangler deploy   # then put the wss:// URL in ../net.js
//
// Build step 4 does not import the engine here. Step 5 does: the DO replays
// the move log to derive the winner itself, at which point a client's claimed
// result stops being taken on trust.

import { Room, roomCode } from './room.js';

// A room nobody has touched in this long is fair game for a new game to reuse
// the code. A class runs for two hours; a term does not.
const STALE_MS = 8 * 3600 * 1000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response(
        JSON.stringify({ relay: 'headcount', protocol: 1, ok: true }, null, 1),
        { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
      );
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

export class HeadcountRoom {
  constructor(state) {
    this.state = state;
    this.room = null;
    // A deploy or an eviction must not lose a game in progress: the room comes
    // back from storage before any request is served.
    state.blockConcurrencyWhile(async () => {
      const saved = await state.storage.get('room');
      if (saved) this.room = Room.from(saved);
    });
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
      this.room = new Room(code);
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
