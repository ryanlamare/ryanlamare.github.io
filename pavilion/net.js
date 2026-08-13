// Pavilion — the transport layer (build step 4, PROTOCOL.md).
//
// The memo's architecture has three layers: engine / UI / transport, and "the
// bot and the network connection are both just move sources". So this file
// carries messages and nothing else. It does not import the engine, does not
// know what a legal move is, and never touches the DOM — which is also what
// lets test/relay.test.js drive two of these against a real relay in Node,
// with no browser involved.
//
// What it does own: the socket, the reconnect loop, the room's bookkeeping
// (code, seats, seed, resume token) and the keepalive. What it emits: the
// protocol's messages, plus a `status` event for the connection itself.

const PING_MS = 25000;
// Class wifi drops. Retry forever, backing off to 8s — a game is
// `seed + move list`, so coming back is always cheap (§11: reconnect first).
const BACKOFF = [400, 800, 1600, 3200, 8000];

export class Relay {
  constructor(url) {
    this.url = url.replace(/\/+$/, '');
    this.ws = null;
    this.code = null; // set from welcome
    this.id = null; // resume token
    this.seat = null;
    this.host = false;
    this.room = null; // last welcome.room
    this.hello = null;
    this.status = 'idle'; // idle | connecting | open | retrying | closed | failed
    this.attempt = 0;
    this.wantOpen = false;
    this.pinger = null;
    this.retryTimer = null;
    this.listeners = new Map();
  }

  // --- events -------------------------------------------------------------

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return this;
  }

  emit(type, payload) {
    for (const fn of this.listeners.get(type) || []) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[relay] listener for ${type}`, err);
      }
    }
  }

  // --- connection ---------------------------------------------------------

  // code === null opens a new room and lets the server name it.
  connect({ code = null, hello = {} }) {
    this.code = code ? String(code).toUpperCase() : null;
    this.hello = hello;
    this.wantOpen = true;
    this.attempt = 0;
    this.#open();
  }

  #open() {
    this.#setStatus(this.attempt ? 'retrying' : 'connecting');
    const path = this.code ? `/room/${encodeURIComponent(this.code)}` : '/new';
    let ws;
    try {
      ws = new WebSocket(this.url + path);
    } catch (err) {
      this.#dropped(String(err));
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.#setStatus('open');
      // The resume token turns a reconnect into the same seat rather than a
      // new one; the server treats a matching id as always welcome.
      ws.send(JSON.stringify({ t: 'hello', ...this.hello, id: this.id || undefined }));
      clearInterval(this.pinger);
      this.pinger = setInterval(() => this.send({ t: 'ping' }), PING_MS);
    };

    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      this.#handle(msg);
    };

    ws.onerror = () => {
      /* onclose always follows; handle it once, there */
    };

    ws.onclose = () => {
      clearInterval(this.pinger);
      if (ws !== this.ws) return; // a stale socket finishing after we moved on
      this.#dropped('closed');
    };
  }

  #handle(msg) {
    switch (msg.t) {
      case 'welcome': {
        const resumed = this.id != null;
        this.code = msg.code;
        this.id = msg.you.id;
        this.seat = msg.you.seat;
        this.host = !!msg.you.host;
        this.room = msg.room;
        // Once we know the code, a reconnect must rejoin *that* room rather
        // than opening another one — /new is a one-time door.
        this.emit('welcome', { ...msg, resumed });
        return;
      }
      case 'error':
        // no-room / room-full / started are dead ends; bad-ply and not-host
        // are recoverable and the UI just reports them.
        if (['no-room', 'room-full', 'started'].includes(msg.code)) {
          this.wantOpen = false;
          this.#setStatus('failed');
        }
        this.emit('error', msg);
        return;
      case 'pong':
        return;
      default:
        this.emit(msg.t, msg);
    }
  }

  #dropped(why) {
    this.ws = null;
    if (!this.wantOpen) {
      this.#setStatus('closed');
      return;
    }
    const wait = BACKOFF[Math.min(this.attempt, BACKOFF.length - 1)];
    this.attempt++;
    this.#setStatus('retrying', { why, wait });
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.wantOpen && this.#open(), wait);
  }

  #setStatus(status, extra = {}) {
    this.status = status;
    this.emit('status', { status, ...extra });
  }

  get connected() {
    return this.status === 'open' && this.ws && this.ws.readyState === 1;
  }

  // --- sending ------------------------------------------------------------

  send(obj) {
    if (!this.ws || this.ws.readyState !== 1) return false;
    this.ws.send(JSON.stringify(obj));
    return true;
  }

  start() {
    return this.send({ t: 'start' });
  }

  // Same seats, fresh bag — arrives back as another `started`.
  rematch() {
    return this.send({ t: 'rematch' });
  }

  // The sender does not wait for the echo (PROTOCOL.md): the UI has already
  // applied and animated. This is the copy that reaches everyone else.
  move(ply, move) {
    return this.send({ t: 'move', ply, move });
  }

  hash(ply, h) {
    return this.send({ t: 'hash', ply, h });
  }

  flag(seat) {
    return this.send({ t: 'flag', seat });
  }

  over(result) {
    return this.send({ t: 'over', result });
  }

  leave() {
    this.wantOpen = false;
    clearInterval(this.pinger);
    clearTimeout(this.retryTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* already gone */
      }
    }
    this.ws = null;
    this.#setStatus('closed');
  }
}

// ---------------------------------------------------------------------------
// Where the relay lives.

// Production is a Cloudflare Worker (PAVILION.md, Open questions), deployed
// 2026-08-12 from relay/. wss://, not https:// — this is a WebSocket endpoint.
// Redeploy with `npx wrangler deploy` from relay/; this URL doesn't change.
// ⚠️ The host name is the *deployment's*, not the game's: the Worker went up
// under the first theme's name and there are live rooms behind it. Renaming it
// would mint a second Worker at a second URL for no gain — the theme lives in
// the copy layer (PAVILION.md, Theme), and this is plumbing.
export const PRODUCTION_RELAY = 'wss://headcount-relay.rlamare.workers.dev';

// Served from a laptop (serve.sh on :8000, relay on :8787) the relay is the
// same host on the relay's port, which is what makes phone-vs-laptop work with
// no configuration: the phone loads the page from the LAN address and reaches
// the relay at that same address.
export function defaultRelayUrl(loc, override = null) {
  if (override) return override;
  const local = /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
    loc.hostname
  );
  if (local) return `ws://${loc.hostname}:8787`;
  return PRODUCTION_RELAY;
}

// The archive's HTTP API sits on the same host as the relay, one scheme over
// (relay/worker.js). `wss://…` is `https://…/api/…`; a laptop's `ws://` is
// `http://`, which is what lets a LAN playtest use the same code path.
export function apiBase(wsUrl) {
  return String(wsUrl).replace(/^ws/, 'http').replace(/\/+$/, '') + '/api';
}

// Who is in the class, and is a term running? Public on purpose — a login here
// would defeat the whole point (PAVILION.md, Identity: no accounts, ever).
//
// It fails soft. The game is also a public page with no course behind it, and a
// relay that has never had a roster set is the normal case there: no session
// means you type your name, exactly as before this existed.
export async function fetchSession(wsUrl, { timeoutMs = 4000 } = {}) {
  if (!wsUrl) return null;
  try {
    const stop = AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
    const res = await fetch(`${apiBase(wsUrl)}/session`, { signal: stop, cache: 'no-store' });
    if (!res.ok) return null;
    const s = await res.json();
    return s && s.term && Array.isArray(s.roster) && s.roster.length ? s : null;
  } catch {
    return null; // offline, no relay, an old relay without the API — all fine
  }
}

// Self-reported, for the clock-fairness question the memo wants answered from
// data rather than guessed (PAVILION.md, Mobile and devices).
export function deviceKind() {
  if (typeof window === 'undefined') return 'laptop';
  const w = Math.min(window.screen?.width || 1280, window.screen?.height || 800);
  const touch = navigator.maxTouchPoints > 1;
  if (!touch) return 'laptop';
  return w < 500 ? 'phone' : 'tablet';
}
