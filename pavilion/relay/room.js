// Pavilion relay — the room state machine (PROTOCOL.md).
//
// One file, two hosts: `dev-relay.js` runs it on a laptop for LAN playtests,
// `worker.js` runs it inside a Cloudflare Durable Object for the class. Both
// implementations of the protocol are therefore the *same* implementation —
// the only thing that differs is how a WebSocket gets here.
//
// It never imports the engine. The relay does not know what a legal move is,
// only who sent it and in what order (PROTOCOL.md, "The one idea"). Every rule
// question is answered identically by every client, from the seed.
//
// A connection is anything with .send(string) and .close(code, reason) — a
// Cloudflare WebSocket and dev-relay.js's socket wrapper both qualify.

import { roomCode, freshSeed } from '../words.js';

export const PROTOCOL_VERSION = 1;
export { roomCode };

const MAX_PLAYERS = 4;

export class Room {
  constructor(code, opts = {}) {
    this.code = code || roomCode();
    this.seed = opts.seed || freshSeed();
    this.players = clampPlayers(opts.players);
    this.clockMs = clampClock(opts.clockMs);
    this.seats = []; // {seat, name, device, connected, id}
    this.started = false;
    this.startedAt = null;
    this.moves = []; // {seat, move, at} — index is the ply
    this.ended = null; // {ending, flagged?, result?}
    this.hostId = null;
    this.conns = new Map(); // conn -> seat id (string) or null for a spectator
    this.lastTouched = Date.now();
  }

  // --- lifecycle ----------------------------------------------------------

  // The creator's hello configures the room; later arrivals' config is ignored
  // (PROTOCOL.md). Only takes effect while the room is empty and unstarted.
  configure(opts) {
    if (this.started || this.seats.length) return;
    if (opts.players != null) this.players = clampPlayers(opts.players);
    if (opts.clockMs != null) this.clockMs = clampClock(opts.clockMs);
    if (opts.seed) this.seed = String(opts.seed).slice(0, 40);
  }

  open(conn, hello = {}) {
    this.lastTouched = Date.now();
    const name = cleanName(hello.name);
    const device = cleanDevice(hello.device);

    // A resume token always wins: reconnecting is allowed into a full room and
    // into a started game, which is the whole point of §11's "reconnect first".
    const known = hello.id ? this.seats.find((s) => s.id === hello.id) : null;
    if (known) {
      known.connected = true;
      if (name) known.name = name;
      known.device = device;
      this.conns.set(conn, known.id);
      this.sendWelcome(conn, known);
      this.broadcast({ t: 'presence', seat: known.seat, connected: true });
      this.broadcast({ t: 'roster', seats: this.roster() });
      return known;
    }

    if (this.started) {
      this.fail(conn, 'started', 'That game has already started.');
      return null;
    }
    if (this.seats.length >= this.players) {
      this.fail(conn, 'room-full', 'That room is full.');
      return null;
    }

    const seat = {
      seat: this.seats.length,
      name: name || `Player ${this.seats.length + 1}`,
      device,
      connected: true,
      id: crypto.randomUUID(),
    };
    this.seats.push(seat);
    if (!this.hostId) this.hostId = seat.id;
    this.conns.set(conn, seat.id);
    this.sendWelcome(conn, seat);
    this.broadcast({ t: 'roster', seats: this.roster() });
    return seat;
  }

  close(conn) {
    const id = this.conns.get(conn);
    this.conns.delete(conn);
    this.lastTouched = Date.now();
    const seat = this.seats.find((s) => s.id === id);
    if (!seat) return;
    // Another socket may already hold this seat — a phone that reconnected
    // before the laptop's dead socket was reaped. Don't mark it away.
    if ([...this.conns.values()].includes(id)) return;
    seat.connected = false;

    if (this.started) {
      // Seat kept: the game is `seed + move list` and they can walk straight
      // back into it. Their clock keeps running meanwhile (§11).
      this.broadcast({ t: 'presence', seat: seat.seat, connected: false });
      this.broadcast({ t: 'roster', seats: this.roster() });
      return;
    }
    // In the lobby nobody is committed to anything, so the seat goes away and
    // the list stays honest.
    this.seats = this.seats.filter((s) => s !== seat);
    this.seats.forEach((s, i) => (s.seat = i));
    if (this.hostId === seat.id) this.hostId = this.seats[0]?.id || null;
    this.broadcast({ t: 'roster', seats: this.roster() });
  }

  // --- messages -----------------------------------------------------------

  message(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    this.lastTouched = Date.now();
    const id = this.conns.get(conn);
    const seat = this.seats.find((s) => s.id === id) || null;

    switch (msg.t) {
      case 'ping':
        conn.send(JSON.stringify({ t: 'pong' }));
        return;

      case 'start': {
        if (!seat || seat.id !== this.hostId) {
          return this.fail(conn, 'not-host', 'Only the player who opened the room can start it.');
        }
        if (this.started) return;
        if (this.seats.length < 2) {
          return this.fail(conn, 'not-host', 'Nobody has joined yet.');
        }
        // Seat order is join order, frozen here and recorded — never
        // re-derived (PAVILION-RULES.md §9).
        this.started = true;
        this.startedAt = Date.now();
        this.players = this.seats.length;
        this.broadcast({
          t: 'started',
          seats: this.roster(),
          seed: this.seed,
          players: this.players,
          clockMs: this.clockMs,
          at: this.startedAt,
        });
        return;
      }

      // Same seats, same room, fresh bag. A pair in a breakout room plays
      // several games in a session; making them re-read the code aloud each
      // time is friction for nothing.
      case 'rematch': {
        if (!seat || seat.id !== this.hostId) {
          return this.fail(conn, 'not-host', 'Only the host can start a rematch.');
        }
        if (!this.started) return;
        this.seed = freshSeed();
        this.moves = [];
        this.ended = null;
        this.startedAt = Date.now();
        this.broadcast({
          t: 'started',
          seats: this.roster(),
          seed: this.seed,
          players: this.players,
          clockMs: this.clockMs,
          at: this.startedAt,
        });
        return;
      }

      case 'move': {
        if (!seat) return this.fail(conn, 'not-seated', 'You are watching, not playing.');
        if (!this.started || this.ended) return;
        // The ply guard is the whole concurrency story: it makes a double-send
        // or a stale client's move a no-op rather than a corrupted log.
        if (msg.ply !== this.moves.length) {
          return this.fail(conn, 'bad-ply', `Expected ply ${this.moves.length}.`);
        }
        if (!plausibleMove(msg.move)) {
          return this.fail(conn, 'bad-ply', 'Malformed move.');
        }
        const at = Date.now();
        // The seat is stamped from the connection, never read from the
        // message — the one thing the relay is authoritative about.
        this.moves.push({ seat: seat.seat, move: msg.move, at });
        this.broadcast({ t: 'move', ply: this.moves.length - 1, seat: seat.seat, move: msg.move, at });
        return;
      }

      case 'hash': {
        if (!seat || !this.started) return;
        this.broadcast({ t: 'hash', ply: msg.ply, seat: seat.seat, h: String(msg.h).slice(0, 64) });
        return;
      }

      case 'flag': {
        if (!seat || !this.started || this.ended) return;
        const flagged = Number(msg.seat);
        if (!(flagged >= 0 && flagged < this.seats.length)) return;
        this.ended = { ending: 'timeout', flagged };
        this.broadcast({ t: 'ended', ...this.ended });
        return;
      }

      case 'over': {
        if (!seat || !this.started || this.ended) return;
        this.ended = { ending: 'natural', result: msg.result || null };
        this.broadcast({ t: 'ended', ...this.ended });
        return;
      }

      default:
        return;
    }
  }

  // --- helpers ------------------------------------------------------------

  sendWelcome(conn, seat) {
    conn.send(
      JSON.stringify({
        t: 'welcome',
        v: PROTOCOL_VERSION,
        code: this.code,
        you: { id: seat.id, seat: seat.seat, host: seat.id === this.hostId },
        room: {
          seed: this.seed,
          players: this.players,
          clockMs: this.clockMs,
          seats: this.roster(),
          started: this.started,
          startedAt: this.startedAt,
          moves: this.moves,
          ended: this.ended,
        },
        serverNow: Date.now(),
      })
    );
  }

  roster() {
    return this.seats.map(({ seat, name, device, connected }) => ({ seat, name, device, connected }));
  }

  broadcast(obj) {
    const line = JSON.stringify(obj);
    for (const conn of this.conns.keys()) {
      try {
        conn.send(line);
      } catch {
        // A socket that died between the check and the write is not our
        // problem — the close handler will reap it.
      }
    }
  }

  fail(conn, code, msg) {
    try {
      conn.send(JSON.stringify({ t: 'error', code, msg }));
    } catch {
      /* see broadcast */
    }
  }

  get empty() {
    return this.conns.size === 0;
  }

  // --- persistence --------------------------------------------------------
  //
  // Everything except the live sockets. A room is a kilobyte or two, so the
  // Durable Object writes the whole thing after every message rather than
  // keeping a delta log; the dev relay ignores this entirely.

  snapshot() {
    return {
      code: this.code,
      seed: this.seed,
      players: this.players,
      clockMs: this.clockMs,
      seats: this.seats,
      started: this.started,
      startedAt: this.startedAt,
      moves: this.moves,
      ended: this.ended,
      hostId: this.hostId,
      lastTouched: this.lastTouched,
    };
  }

  static from(obj) {
    const r = new Room(obj.code, obj);
    Object.assign(r, obj);
    r.conns = new Map();
    // Nobody is connected to a room that has just been rebuilt from storage —
    // whatever the snapshot said, those sockets are gone.
    r.seats.forEach((s) => (s.connected = false));
    return r;
  }
}

// --- validation -------------------------------------------------------------

function clampPlayers(n) {
  const v = Number(n);
  return v >= 2 && v <= MAX_PLAYERS ? Math.floor(v) : 2;
}

function clampClock(ms) {
  const v = Number(ms);
  return Number.isFinite(v) && v >= 0 && v <= 3600000 ? Math.floor(v) : 300000;
}

function cleanName(s) {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, 20) : '';
}

function cleanDevice(s) {
  return ['laptop', 'phone', 'tablet'].includes(s) ? s : 'laptop';
}

// Shape only — not legality. The relay has no engine and this check exists so
// that a garbled message can't get into the move log and break every client's
// replay; whether the move is *allowed* is the clients' business.
function plausibleMove(m) {
  if (!m || typeof m !== 'object') return false;
  const src = m.source;
  if (!src || typeof src !== 'object') return false;
  if (src.type === 'source') {
    if (!Number.isInteger(src.index) || src.index < 0 || src.index > 8) return false;
  } else if (src.type !== 'pool') {
    return false;
  }
  if (!Number.isInteger(m.kind) || m.kind < 0 || m.kind > 4) return false;
  const d = m.dest;
  if (!d || typeof d !== 'object') return false;
  if (d.type === 'line') {
    if (!Number.isInteger(d.row) || d.row < 0 || d.row > 4) return false;
  } else if (d.type !== 'floor') {
    return false;
  }
  if (m.t != null && !(Number.isFinite(m.t) && m.t >= 0)) return false;
  return true;
}
