// Pavilion relay — headless test suite (relay/PROTOCOL.md).
//
//   node pavilion/test/relay.test.js
//
// No dependencies, no browser. It starts the real dev relay on an ephemeral
// port and drives real `net.js` Relay clients against it over real WebSockets,
// because net.js is deliberately DOM-free. Two clients play a complete game
// move for move, cross-checking state hashes at every ply — which is the
// property the whole design rests on (§9) and the one that cannot be tested
// hot-seat.
//
// Node's global WebSocket (v22+) is the client here; the server framing is the
// hand-rolled RFC 6455 in dev-relay.js, so both halves are under test.

import { start, server, rooms } from '../relay/dev-relay.js';
import { Room } from '../relay/room.js';
import { Relay } from '../net.js';
import { newGame, legalMoves, apply, stateHash, TOTAL_TILES, KINDS, FIRST_TOKEN } from '../engine.js';

// ---------------------------------------------------------------------------
// Tiny harness — the same one engine.test.js uses.

let passed = 0;
let failed = 0;

function ok(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error('  FAIL: ' + msg);
  }
}

function eq(got, want, msg) {
  ok(got === want, `${msg} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`);
}

function section(title) {
  console.log('— ' + title);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wait for an event, with a deadline — a hung protocol should fail the suite,
// not hang CI forever.
function waitFor(relay, type, predicate = () => true, ms = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for "${type}" after ${ms}ms`)),
      ms
    );
    const CB = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      relay.listeners.get(type).delete(CB);
      resolve(payload);
    };
    relay.on(type, CB);
  });
}

// ---------------------------------------------------------------------------
// A headless player: transport + engine, no UI. This is the whole client
// minus the theatre, and it is exactly what the browser does underneath.

class Player {
  constructor(url, name, device = 'laptop') {
    this.relay = new Relay(url);
    this.name = name;
    this.device = device;
    this.state = null;
    this.moves = [];
    this.seat = null;
    this.hashes = new Map(); // ply -> our hash
    this.mismatches = [];
    this.outOfTurn = 0;
    this.ended = null;
    this.applied = 0;

    this.relay.on('move', (m) => this.onMove(m));
    this.relay.on('hash', (m) => this.onHash(m));
    this.relay.on('started', (m) => this.onStarted(m));
    this.relay.on('ended', (m) => (this.ended = m));
    this.relay.on('error', (m) => (this.lastError = m));
  }

  async join(code) {
    const welcome = waitFor(this.relay, 'welcome');
    this.relay.connect({
      code,
      hello: { name: this.name, device: this.device, players: 2, clockMs: 300000 },
    });
    const w = await welcome;
    this.seat = w.you.seat;
    this.code = w.code;
    this.room = w.room;
    return w;
  }

  onStarted(m) {
    // Every client builds the same game from the same seed. Nothing about the
    // position is ever transmitted — only moves.
    this.state = newGame(m.seed, m.players);
    this.seats = m.seats;
  }

  onMove({ ply, seat, move }) {
    if (!this.state || ply < this.applied) return;
    // The check that makes a server-stamped seat worth stamping: apply() moves
    // for whoever is to move, so an out-of-turn broadcast must be refused
    // rather than quietly applied (PROTOCOL.md).
    if (seat !== this.state.seatToMove) {
      this.outOfTurn++;
      return;
    }
    this.state = apply(this.state, move);
    this.moves.push({ seat, move });
    this.applied = ply + 1;
    const h = stateHash(this.state);
    this.hashes.set(ply, h);
    this.relay.hash(ply, h);
    this.check(ply);
  }

  onHash({ ply, seat, h }) {
    if (seat === this.seat) return;
    this.theirs = this.theirs || new Map();
    this.theirs.set(ply, h);
    this.check(ply);
  }

  check(ply) {
    const mine = this.hashes.get(ply);
    const theirs = this.theirs?.get(ply);
    if (mine && theirs && mine !== theirs) this.mismatches.push(ply);
  }

  // Deterministic move choice, so a failure is reproducible from the seed.
  pick() {
    const moves = legalMoves(this.state);
    return moves[(this.moves.length * 7 + this.seat) % moves.length];
  }

  myTurn() {
    return this.state && !this.state.over && this.state.seatToMove === this.seat;
  }
}

// Tile census (§12) — the invariant is not the relay's business, which is
// exactly why it is worth asserting on a state that arrived over the wire.
function countTiles(s) {
  let n = s.bag.length;
  for (let f = 0; f < KINDS; f++) n += s.lid[f] + s.pool[f];
  for (const a of s.sources) for (let f = 0; f < KINDS; f++) n += a[f];
  for (const b of s.boards) {
    for (const t of b.lines) n += t.count;
    for (const row of b.wall) for (const c of row) n += c;
    for (const e of b.floor) if (e !== FIRST_TOKEN) n++;
  }
  return n;
}

// ---------------------------------------------------------------------------

await start(0, true); // ephemeral port, quiet
const PORT = server.address().port;
const URL = `ws://127.0.0.1:${PORT}`;

// ---------------------------------------------------------------------------
section('Room creation and the lobby');

const a = new Player(URL, 'Sam');
const wa = await a.join(null);
ok(/^[A-Z]+-[A-Z]+$/.test(wa.code), `server names the room in two words (${wa.code})`);
ok(/^[A-Z]+-[A-Z]+-\d+$/.test(wa.room.seed), `server fixes a seed at room creation (${wa.room.seed})`);
eq(wa.you.seat, 0, 'the creator is seat 0');
eq(wa.you.host, true, 'the creator is the host');
eq(wa.room.started, false, 'the room has not started');
eq(wa.room.moves.length, 0, 'no moves yet');

const b = new Player(URL, 'Alex', 'phone');
const rosterTwo = waitFor(a.relay, 'roster', (m) => m.seats.length === 2);
const wb = await b.join(wa.code);
eq(wb.you.seat, 1, 'the joiner is seat 1');
eq(wb.you.host, false, 'the joiner is not the host');
eq(wb.room.seed, wa.room.seed, 'both clients get the same seed');
const roster = await rosterTwo;
eq(roster.seats[1].name, 'Alex', 'the roster reaches the host');
eq(roster.seats[1].device, 'phone', 'the device is recorded per seat');

{
  // Lowercase is what a student types; the code is said aloud, not copied.
  const c = new Player(URL, 'Jordan');
  const err = waitFor(c.relay, 'error');
  c.relay.connect({ code: wa.code.toLowerCase(), hello: { name: 'Jordan', device: 'laptop' } });
  eq((await err).code, 'room-full', 'a third player into a two-seat room is refused');
  c.relay.leave();
}

{
  const c = new Player(URL, 'Nobody');
  const err = waitFor(c.relay, 'error');
  c.relay.connect({ code: 'FERRIS-NOWHERE', hello: { name: 'Nobody', device: 'laptop' } });
  eq((await err).code, 'no-room', 'an unknown room code is refused');
  c.relay.leave();
}

{
  const err = waitFor(b.relay, 'error');
  b.relay.start(); // the joiner is not the host
  eq((await err).code, 'not-host', 'only the host can start the game');
}

// ---------------------------------------------------------------------------
section('A full game, move for move, hash for hash');

const startedA = waitFor(a.relay, 'started');
const startedB = waitFor(b.relay, 'started');
a.relay.start();
const sa = await startedA;
await startedB;
eq(sa.seats.length, 2, 'seats are frozen at start');
eq(sa.clockMs, 300000, 'the room carries the clock the host chose');

{
  // The mover sends; both apply from the broadcast. Nobody sends a position.
  let guard = 0;
  while (!a.state.over && guard++ < 400) {
    const mover = a.myTurn() ? a : b.myTurn() ? b : null;
    if (!mover) {
      await sleep(2);
      continue;
    }
    const m = mover.pick();
    const ply = mover.applied;
    mover.relay.move(ply, { ...m, t: 1000 + ply * 137 });
    await waitFor(mover.relay, 'move', (x) => x.ply === ply);
    // Let the other client's socket catch up before asking whose turn it is.
    while (b.applied !== a.applied) await sleep(1);
  }

  ok(a.state.over, `the game finished naturally in ${a.moves.length} moves`);
  eq(a.applied, b.applied, 'both clients applied the same number of plies');
  eq(stateHash(a.state), stateHash(b.state), 'both clients end byte-identical');
  eq(a.mismatches.length, 0, 'no hash mismatch at any ply');
  eq(b.mismatches.length, 0, 'no hash mismatch at any ply, the other way');
  eq(a.outOfTurn, 0, 'no move ever arrived out of turn');
  eq(countTiles(a.state), TOTAL_TILES, 'tiles are conserved across the wire');
  ok(a.state.round >= 5, `the game ran a full ${a.state.round} weeks`);
}

// ---------------------------------------------------------------------------
section('The move log is the archive');

{
  const room = rooms.get(wa.code);
  eq(room.moves.length, a.moves.length, 'the relay recorded every move, once');
  ok(
    room.moves.every((m, i) => m.seat === a.moves[i].seat),
    'the relay stamped the same seats the clients saw'
  );
  ok(
    room.moves.every((m) => typeof m.at === 'number' && m.at > 0),
    'every recorded move carries a server timestamp'
  );

  // The whole point of §9: seed + move list replays to the same game.
  let s = newGame(room.seed, room.players);
  for (const rec of room.moves) s = apply(s, rec.move);
  eq(stateHash(s), stateHash(a.state), 'replaying the relay log reaches the same final state');
}

{
  const endedA = waitFor(a.relay, 'ended');
  const endedB = waitFor(b.relay, 'ended');
  a.relay.over(a.state.result);
  eq((await endedA).ending, 'natural', 'a natural ending is broadcast');
  eq((await endedB).ending, 'natural', 'and reaches the other client');
  b.relay.over(b.state.result); // a second claim changes nothing
  await sleep(30);
  eq(rooms.get(wa.code).ended.ending, 'natural', 'the first ending stands');
}

a.relay.leave();
b.relay.leave();

// ---------------------------------------------------------------------------
section('Ply guard — a stale client cannot corrupt the log');

{
  const h = new Player(URL, 'Host');
  const w = await h.join(null);
  const g = new Player(URL, 'Guest');
  await g.join(w.code);
  const started = waitFor(g.relay, 'started');
  h.relay.start();
  await started;

  const mover = h.myTurn() ? h : g;
  const m = mover.pick();
  const err = waitFor(mover.relay, 'error');
  mover.relay.move(7, { ...m, t: 0 }); // wrong ply — we are at 0
  const e = await err;
  eq(e.code, 'bad-ply', 'a move at the wrong ply is refused');
  eq(rooms.get(w.code).moves.length, 0, 'and nothing entered the log');

  // Recoverable: the same move at the right ply goes through.
  mover.relay.move(0, { ...m, t: 0 });
  await waitFor(mover.relay, 'move', (x) => x.ply === 0);
  eq(rooms.get(w.code).moves.length, 1, 'the retried move is accepted');

  h.relay.leave();
  g.relay.leave();
}

// ---------------------------------------------------------------------------
section('Reconnect first, void last (§11)');

{
  const h = new Player(URL, 'Host');
  const w = await h.join(null);
  const g = new Player(URL, 'Guest');
  const wg = await g.join(w.code);
  const started = waitFor(g.relay, 'started');
  h.relay.start();
  await started;

  // Play a few plies so there is a position worth resuming into.
  for (let i = 0; i < 6; i++) {
    const mover = h.myTurn() ? h : g;
    const ply = mover.applied;
    mover.relay.move(ply, { ...mover.pick(), t: 500 * (ply + 1) });
    await waitFor(mover.relay, 'move', (x) => x.ply === ply);
    while (h.applied !== g.applied) await sleep(1);
  }
  const before = stateHash(g.state);

  const gone = waitFor(h.relay, 'presence', (m) => m.seat === 1 && m.connected === false);
  g.relay.leave();
  eq((await gone).seat, 1, 'the other player is told the seat went away');
  eq(rooms.get(w.code).seats.length, 2, 'a started game keeps the seat');

  // Back on a different device, holding the resume token.
  const back = new Player(URL, 'Guest', 'phone');
  back.relay.id = wg.you.id;
  const welcome = waitFor(back.relay, 'welcome');
  const returned = waitFor(h.relay, 'presence', (m) => m.seat === 1 && m.connected === true);
  back.relay.connect({ code: w.code, hello: { name: 'Guest', device: 'phone' } });
  const wback = await welcome;
  await returned;
  eq(wback.you.seat, 1, 'the resume token returns you to your own seat');
  eq(wback.resumed, true, 'the client knows it resumed rather than joined');
  eq(wback.room.moves.length, 6, 'the whole game so far arrives in one message');
  ok(wback.serverNow >= wback.room.moves[5].at, 'the server stamps now, for the running clock');

  // Rebuild from seed + move list, exactly as the UI does.
  let s = newGame(wback.room.seed, wback.room.players);
  for (const rec of wback.room.moves) s = apply(s, rec.move);
  eq(stateHash(s), before, 'the resumed client rebuilds the identical position');

  // And play continues, with the returning client fully in the game.
  back.state = s;
  back.applied = 6;
  back.seat = 1;
  const mover = h.state.seatToMove === 0 ? h : back;
  const ply = 6;
  // Both waiters go up before the send: a broadcast reaches every socket at
  // once, so registering the second one afterwards would miss it.
  const atBack = waitFor(back.relay, 'move', (x) => x.ply === ply);
  const atHost = waitFor(h.relay, 'move', (x) => x.ply === ply);
  mover.relay.move(ply, { ...mover.pick(), t: 4000 });
  await atBack;
  await atHost;
  eq(stateHash(h.state), stateHash(back.state), 'play resumes in step');

  h.relay.leave();
  back.relay.leave();
}

// ---------------------------------------------------------------------------
section('Timeout — whoever notices first flags, once');

{
  const h = new Player(URL, 'Host');
  const w = await h.join(null);
  const g = new Player(URL, 'Guest');
  await g.join(w.code);
  const started = waitFor(g.relay, 'started');
  h.relay.start();
  await started;

  const endedH = waitFor(h.relay, 'ended');
  const endedG = waitFor(g.relay, 'ended');
  h.relay.flag(1);
  const e = await endedH;
  await endedG;
  eq(e.ending, 'timeout', 'a flag ends the game on time');
  eq(e.flagged, 1, 'and names the seat that ran out');

  g.relay.flag(0); // the other client noticed a frame later; ignored
  await sleep(30);
  eq(rooms.get(w.code).ended.flagged, 1, 'the first flag stands');

  const err = waitFor(h.relay, 'error', () => true, 300).catch(() => null);
  h.relay.move(0, { source: { type: 'pool' }, kind: 0, dest: { type: 'floor' }, t: 0 });
  await sleep(30);
  eq(rooms.get(w.code).moves.length, 0, 'no move is accepted after the game ended');
  await err;

  h.relay.leave();
  g.relay.leave();
}

// ---------------------------------------------------------------------------
section('Malformed input is refused, not relayed');

{
  const h = new Player(URL, 'Host');
  const w = await h.join(null);
  const g = new Player(URL, 'Guest');
  await g.join(w.code);
  const started = waitFor(g.relay, 'started');
  h.relay.start();
  await started;

  const mover = h.myTurn() ? h : g;
  for (const bad of [
    { source: { type: 'source', index: 99 }, kind: 0, dest: { type: 'floor' } },
    { source: { type: 'nowhere' }, kind: 0, dest: { type: 'floor' } },
    { source: { type: 'pool' }, kind: 12, dest: { type: 'floor' } },
    { source: { type: 'pool' }, kind: 0, dest: { type: 'line', row: 9 } },
    { source: { type: 'pool' }, kind: 0 },
    null,
  ]) {
    const err = waitFor(mover.relay, 'error');
    mover.relay.move(0, bad);
    eq((await err).code, 'bad-ply', `malformed move refused: ${JSON.stringify(bad)}`);
  }
  eq(rooms.get(w.code).moves.length, 0, 'the log stayed empty throughout');

  h.relay.leave();
  g.relay.leave();
}

// ---------------------------------------------------------------------------
section('Rematch — same room, same seats, fresh bag');

{
  const h = new Player(URL, 'Host');
  const w = await h.join(null);
  const g = new Player(URL, 'Guest');
  await g.join(w.code);
  const started = waitFor(g.relay, 'started');
  h.relay.start();
  const first = await started;

  const mover = h.myTurn() ? h : g;
  mover.relay.move(0, { ...mover.pick(), t: 100 });
  await waitFor(mover.relay, 'move', (x) => x.ply === 0);

  {
    const err = waitFor(g.relay, 'error');
    g.relay.rematch();
    eq((await err).code, 'not-host', 'only the host can call a rematch');
  }

  const againH = waitFor(h.relay, 'started');
  const againG = waitFor(g.relay, 'started');
  h.relay.rematch();
  const second = await againH;
  await againG;
  ok(second.seed !== first.seed, 'the rematch deals a fresh bag');
  eq(second.seats.length, 2, 'the seats are the same seats');
  eq(second.seats[0].name, 'Host', 'in the same order');
  eq(rooms.get(w.code).moves.length, 0, 'the move log starts empty');
  eq(rooms.get(w.code).ended, null, 'and the previous ending is cleared');

  // --- and the room survives being written down and rebuilt ---------------
  const live = rooms.get(w.code);
  live.moves.push({ seat: 0, move: { source: { type: 'pool' }, kind: 0, dest: { type: 'floor' } }, at: 1 });
  const rebuilt = Room.from(JSON.parse(JSON.stringify(live.snapshot())));
  eq(rebuilt.code, live.code, 'a restored room keeps its code');
  eq(rebuilt.seed, live.seed, 'and its seed');
  eq(rebuilt.moves.length, 1, 'and the game so far');
  eq(rebuilt.hostId, live.hostId, 'and who the host is');
  eq(rebuilt.started, true, 'and that it had started');
  ok(
    rebuilt.seats.every((s) => s.connected === false),
    'but nobody is connected to a room rebuilt from storage'
  );

  h.relay.leave();
  g.relay.leave();
}

// ---------------------------------------------------------------------------
await sleep(50);
server.close();
console.log(`\n${passed} passed, ${failed} failed (relay protocol v1)`);
process.exit(failed === 0 ? 0 : 1);
