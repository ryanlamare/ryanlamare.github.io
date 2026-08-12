// Headcount relay — the local one, for playtesting on your own wifi.
//
//   node pavilion/relay/dev-relay.js [port]     (default 8787)
//
// Run it beside ./serve.sh and two devices on the same network can play a real
// game: laptop on http://<lan-ip>:8000/pavilion/, phone on the
// same URL, both pointed at ws://<lan-ip>:8787 (which net.js works out for
// itself when the page is served from a LAN address).
//
// It speaks exactly the protocol in PROTOCOL.md, via the same room.js the
// Cloudflare Worker runs, so a game that works here works there.
//
// No dependencies — the WebSocket framing below is ~120 lines of RFC 6455,
// which is cheaper than a node_modules directory in a repo that has none and
// wants none. It handles what a browser actually sends: masked text frames,
// continuation frames, ping/pong and close. Not a general-purpose server.

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { pathToFileURL } from 'node:url';
import { Room, roomCode } from './room.js';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_FRAME = 1 << 20; // 1 MB — a Headcount message is a few hundred bytes

const rooms = new Map();
const PORT = Number(process.argv[2]) || 8787;

// ---------------------------------------------------------------------------
// WebSocket framing.

class Conn {
  constructor(socket) {
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.frag = [];
    this.fragOp = 0;
    this.open = true;
  }

  send(str) {
    if (this.open) this.socket.write(frame(0x1, Buffer.from(str, 'utf8')));
  }

  close(code = 1000, reason = '') {
    if (!this.open) return;
    this.open = false;
    const body = Buffer.alloc(2 + Buffer.byteLength(reason));
    body.writeUInt16BE(code, 0);
    body.write(reason, 2);
    try {
      this.socket.write(frame(0x8, body));
    } catch {
      /* the socket is already gone; nothing to say */
    }
    this.socket.end();
  }
}

function frame(opcode, payload) {
  const len = payload.length;
  let head;
  if (len < 126) {
    head = Buffer.alloc(2);
    head[1] = len;
  } else if (len < 65536) {
    head = Buffer.alloc(4);
    head[1] = 126;
    head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.alloc(10);
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(len), 2);
  }
  head[0] = 0x80 | opcode; // server frames are never masked, never fragmented
  return Buffer.concat([head, payload]);
}

// Pull whole frames out of the accumulated buffer. Returns when what's left is
// a partial frame — TCP splits and coalesces wherever it likes, so both the
// "half a header" and the "three messages in one chunk" cases are normal.
function drain(conn, onText) {
  for (;;) {
    const b = conn.buf;
    if (b.length < 2) return;
    const fin = (b[0] & 0x80) !== 0;
    const opcode = b[0] & 0x0f;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f;
    let off = 2;
    if (len === 126) {
      if (b.length < 4) return;
      len = b.readUInt16BE(2);
      off = 4;
    } else if (len === 127) {
      if (b.length < 10) return;
      const big = b.readBigUInt64BE(2);
      if (big > BigInt(MAX_FRAME)) return conn.close(1009, 'too big');
      len = Number(big);
      off = 10;
    }
    if (len > MAX_FRAME) return conn.close(1009, 'too big');
    let mask = null;
    if (masked) {
      if (b.length < off + 4) return;
      mask = b.subarray(off, off + 4);
      off += 4;
    }
    if (b.length < off + len) return;

    const payload = Buffer.from(b.subarray(off, off + len));
    if (mask) for (let i = 0; i < len; i++) payload[i] ^= mask[i & 3];
    conn.buf = b.subarray(off + len);

    if (opcode === 0x8) return conn.close(1000);
    if (opcode === 0x9) {
      conn.socket.write(frame(0xa, payload)); // pong, echoing the body
      continue;
    }
    if (opcode === 0xa) continue;

    if (opcode === 0x0) {
      conn.frag.push(payload);
    } else {
      conn.frag = [payload];
      conn.fragOp = opcode;
    }
    if (!fin) continue;

    const whole = Buffer.concat(conn.frag);
    conn.frag = [];
    if (conn.fragOp === 0x1) onText(whole.toString('utf8'));
    // binary frames: nothing here speaks binary, so drop them silently
  }
}

// ---------------------------------------------------------------------------
// HTTP: a status page, and the upgrade.

const server = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    const body = JSON.stringify(
      {
        relay: 'headcount dev-relay',
        rooms: [...rooms.values()].map((r) => ({
          code: r.code,
          started: r.started,
          seats: r.seats.length,
          connected: r.conns.size,
          moves: r.moves.length,
          ended: r.ended?.ending || null,
        })),
      },
      null,
      1
    );
    res.writeHead(200, {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      // The game page is served from :8000 and this is :8787, so a fetch to
      // the health endpoint is cross-origin. WebSockets aren't, but the
      // status page is handy from the browser console.
      'access-control-allow-origin': '*',
    });
    res.end(body);
    return;
  }
  res.writeHead(404).end('not found');
});

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    return;
  }
  const accept = createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  socket.setNoDelay(true);

  const url = new URL(req.url, 'http://localhost');
  const conn = new Conn(socket);
  let room = null;
  let helloed = false;

  const path = url.pathname.replace(/\/+$/, '');
  if (path === '/new') {
    let code = roomCode();
    while (rooms.has(code)) code = roomCode();
    room = new Room(code, { seed: url.searchParams.get('seed') || null });
    rooms.set(code, room);
    log(`room ${code} opened`);
  } else if (path.startsWith('/room/')) {
    const code = decodeURIComponent(path.slice('/room/'.length)).toUpperCase();
    room = rooms.get(code) || null;
    if (!room) {
      conn.send(JSON.stringify({ t: 'error', code: 'no-room', msg: `No room called ${code}.` }));
      conn.close(1000, 'no room');
      return;
    }
  } else {
    conn.close(1008, 'bad path');
    return;
  }

  socket.on('data', (chunk) => {
    conn.buf = Buffer.concat([conn.buf, chunk]);
    drain(conn, (text) => {
      let msg;
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }
      if (!helloed) {
        if (msg.t !== 'hello') return;
        helloed = true;
        if (path === '/new') room.configure(msg);
        const seat = room.open(conn, msg);
        if (seat) log(`${room.code}: ${seat.name} sits at seat ${seat.seat}`);
        else conn.close(1000, 'refused');
        return;
      }
      room.message(conn, msg);
    });
  });

  const bye = () => {
    conn.open = false;
    if (!room) return;
    room.close(conn);
    // An unstarted room with nobody in it never mattered. A started one is
    // kept so a dropped player can walk back into it (§11) — this is a dev
    // tool, so "kept" means until you Ctrl-C.
    if (room.empty && !room.started) {
      rooms.delete(room.code);
      log(`room ${room.code} closed`);
    }
  };
  socket.on('close', bye);
  socket.on('end', bye);
  socket.on('error', bye);
});

function log(msg) {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  console.log(`  ${hh}:${mm}:${ss}  ${msg}`);
}

function lanAddress() {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

// Listening is a separate step from defining the server so the test suite can
// import this file and start a relay on a free port without racing a real one.
export function start(port = PORT, quiet = false) {
  return new Promise((resolve) => {
    server.listen(port, '0.0.0.0', () => {
      if (!quiet) {
        const ip = lanAddress();
        const p = server.address().port;
        console.log(`\n  Headcount relay listening on ws://localhost:${p}`);
        if (ip) console.log(`  this LAN  → ws://${ip}:${p}   (phone / second laptop)`);
        console.log(`  status    → http://localhost:${p}/health`);
        console.log(
          `  Run ./serve.sh too, then open the game${ip ? ` at http://${ip}:8000/pavilion/` : ''}`
        );
        console.log('  Ctrl-C to stop\n');
      }
      resolve(server);
    });
  });
}

export { server, rooms };

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) start(PORT);
