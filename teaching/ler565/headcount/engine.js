// Headcount — rules engine.
//
// Implements ../HEADCOUNT-RULES.md, the complete spec. Section references (§)
// below point there. Mechanically this is base Azul, unchanged — theme the
// names and the art, never the rules.
//
// Pure and dependency-free: runs unchanged in the browser, in Node (the
// headless test suite), and in a Cloudflare Worker (server-side replay).
// `apply(state, move)` never mutates its input. Every random draw comes from
// the seeded PRNG carried in `state.rng` — never Math.random() — so a whole
// game is `seed + move list` (§9).

export const ENGINE_VERSION = 1;
export const FUNCTIONS = 5; // Engineering 0, Sales 1, Operations 2, Finance 3, Analytics 4
export const FUNCTION_NAMES = ['Engineering', 'Sales', 'Operations', 'Finance', 'Analytics'];
export const TILES_PER_FUNCTION = 20;
export const TOTAL_TILES = 100;
export const AGENCY_SIZE = 4;
export const TEAM_ROWS = 5;
export const BENCH_SIZE = 7;
export const BENCH_PENALTIES = [1, 1, 2, 2, 2, 3, 3]; // stored positive, subtracted (§7.3)
export const FIRST_MOVER = 5; // bench entry marking the First Mover token (§6.3)

export function agencyCount(players) {
  return 2 * players + 1; // §1: 5 at 2 players, 7 at 3, 9 at 4
}

// §2 — the org chart is a cyclic Latin square. Derived, never hardcoded.
export function wallColumn(fn, row) {
  return (fn + row) % FUNCTIONS;
}

// ---------------------------------------------------------------------------
// Seeded RNG (§9). xmur3 hashes the seed string; mulberry32 steps the state.
// Integer ops only (Math.imul, shifts), so every JS engine produces the
// identical sequence. The PRNG state lives in state.rng as a 32-bit int.

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) | 0;
}

function nextU32(s) {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = Math.imul(s.rng ^ (s.rng >>> 15), 1 | s.rng);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
}

// Unbiased integer in [0, n) via rejection sampling.
function randBelow(s, n) {
  const limit = Math.floor(0x100000000 / n) * n;
  let v;
  do {
    v = nextU32(s);
  } while (v >= limit);
  return v % n;
}

function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randBelow(s, i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

// ---------------------------------------------------------------------------
// State construction (§3).
//
// Shapes, all integers:
//   bag       — array of function indices; the END of the array is the top of
//               the bag (draw = pop). Order is the seeded shuffle.
//   lid       — counts per function (unordered by rule; order is imposed
//               canonically when the lid refills the bag).
//   agencies  — one counts-per-function array each.
//   centre    — counts per function. The First Mover token is tracked
//               separately in firstMoverInCentre.
//   boards[p] — score; firstMover flag; teams (fn, count) ×5 where row r has
//               capacity r+1 and fn is -1 when empty; wall 5×5 of 0/1; bench
//               as an ordered array of entries (0–4 tile, 5 = token).

function zeros() {
  return [0, 0, 0, 0, 0];
}

function newBoard() {
  return {
    score: 0,
    firstMover: 0,
    teams: Array.from({ length: TEAM_ROWS }, () => ({ fn: -1, count: 0 })),
    wall: Array.from({ length: TEAM_ROWS }, () => [0, 0, 0, 0, 0]),
    bench: [],
  };
}

export function newGame(seed, players) {
  if (!Number.isInteger(players) || players < 2 || players > 4) {
    throw new Error('players must be 2, 3 or 4');
  }
  const s = {
    players,
    round: 1, // reads as Q1, Q2… in the UI
    seatToMove: 0,
    startPlayer: 0,
    firstMoverInCentre: true,
    over: false,
    rng: xmur3(String(seed)),
    refills: 0, // lid-to-bag refills so far — the alumni wave (§6.1)
    bag: [],
    lid: zeros(),
    agencies: Array.from({ length: agencyCount(players) }, () => zeros()),
    centre: zeros(),
    boards: Array.from({ length: players }, () => newBoard()),
    result: null,
  };
  for (let f = 0; f < FUNCTIONS; f++) {
    for (let i = 0; i < TILES_PER_FUNCTION; i++) s.bag.push(f);
  }
  // Canonical rng consumption order: (1) bag shuffle, (2) round-1 start player.
  shuffle(s, s.bag);
  dealAgencies(s); // consumes no rng here: a full bag covers the setup deal
  s.startPlayer = randBelow(s, players); // §3.4 — derived from the seed
  s.seatToMove = s.startPlayer;
  return s;
}

// §6.1 — draw one tile at a time, agency 0 upward, each agency's four slots in
// index order. When the bag empties mid-deal, refill it from the lid and
// continue; when bag and lid are both empty, play with what's there.
function dealAgencies(s) {
  for (let a = 0; a < s.agencies.length; a++) {
    for (let slot = 0; slot < AGENCY_SIZE; slot++) {
      if (s.bag.length === 0) refillBagFromLid(s);
      if (s.bag.length === 0) return; // partial deal is legal, never a throw
      s.agencies[a][s.bag.pop()]++;
    }
  }
}

function refillBagFromLid(s) {
  let total = 0;
  for (let f = 0; f < FUNCTIONS; f++) total += s.lid[f];
  if (total === 0) return;
  for (let f = 0; f < FUNCTIONS; f++) {
    for (let i = 0; i < s.lid[f]; i++) s.bag.push(f);
    s.lid[f] = 0;
  }
  shuffle(s, s.bag); // seeded, so the refill is reproducible (§6.1)
  s.refills++;
}

// ---------------------------------------------------------------------------
// Legality (§5). One source of truth: the UI highlights from legalMoves, the
// bots draw from it, the server validates against it.

function teamRowLegal(board, row, fn) {
  const team = board.teams[row];
  if (team.count >= row + 1) return false; // §5.1 row full
  if (team.count > 0 && team.fn !== fn) return false; // §5.2 different function
  if (board.wall[row][wallColumn(fn, row)]) return false; // §5.3 cell taken
  return true;
}

export function legalMoves(state) {
  if (state.over) return [];
  const board = state.boards[state.seatToMove];
  const moves = [];
  const sources = [];
  for (let i = 0; i < state.agencies.length; i++) {
    if (state.agencies[i].some((c) => c > 0)) {
      sources.push([{ type: 'agency', index: i }, state.agencies[i]]);
    }
  }
  // §6.4 — a centre holding only the First Mover token is not a legal source,
  // which falls out of requiring an actual tile of some function.
  if (state.centre.some((c) => c > 0)) {
    sources.push([{ type: 'centre' }, state.centre]);
  }
  for (const [source, counts] of sources) {
    for (let fn = 0; fn < FUNCTIONS; fn++) {
      if (counts[fn] === 0) continue;
      for (let r = 0; r < TEAM_ROWS; r++) {
        if (teamRowLegal(board, r, fn)) {
          moves.push({ source, fn, dest: { type: 'team', row: r } });
        }
      }
      moves.push({ source, fn, dest: { type: 'bench' } }); // §5.4 always legal
    }
  }
  return moves;
}

// ---------------------------------------------------------------------------
// apply (§4, §10). One move is one complete turn — take and place together.
// The optional clock field move.t is recorded by the archive layer and
// deliberately ignored here: determinism comes from seed + source/fn/dest.

function cloneState(s) {
  return {
    players: s.players,
    round: s.round,
    seatToMove: s.seatToMove,
    startPlayer: s.startPlayer,
    firstMoverInCentre: s.firstMoverInCentre,
    over: s.over,
    rng: s.rng,
    refills: s.refills,
    bag: s.bag.slice(),
    lid: s.lid.slice(),
    agencies: s.agencies.map((a) => a.slice()),
    centre: s.centre.slice(),
    boards: s.boards.map((b) => ({
      score: b.score,
      firstMover: b.firstMover,
      teams: b.teams.map((t) => ({ fn: t.fn, count: t.count })),
      wall: b.wall.map((r) => r.slice()),
      bench: b.bench.slice(),
    })),
    result: s.result
      ? { scores: s.result.scores.slice(), winner: s.result.winner, leaders: s.result.leaders.slice() }
      : null,
  };
}

function moveError(msg, move) {
  return new Error(
    'illegal move: ' +
      msg +
      ' — ' +
      JSON.stringify({ source: move.source, fn: move.fn, dest: move.dest })
  );
}

export function apply(state, move) {
  if (state.over) throw new Error('illegal move: game is over');
  const mover = state.boards[state.seatToMove];

  // Validate against the same predicates legalMoves enumerates from.
  let srcCounts;
  if (move.source && move.source.type === 'agency') {
    const i = move.source.index;
    if (!Number.isInteger(i) || i < 0 || i >= state.agencies.length) {
      throw moveError('no such agency', move);
    }
    srcCounts = state.agencies[i];
  } else if (move.source && move.source.type === 'centre') {
    srcCounts = state.centre;
  } else {
    throw moveError('bad source', move);
  }
  if (!Number.isInteger(move.fn) || move.fn < 0 || move.fn >= FUNCTIONS || srcCounts[move.fn] === 0) {
    throw moveError('function not present at source', move);
  }
  if (move.dest && move.dest.type === 'team') {
    const r = move.dest.row;
    if (!Number.isInteger(r) || r < 0 || r >= TEAM_ROWS) throw moveError('no such team row', move);
    if (!teamRowLegal(mover, r, move.fn)) throw moveError('team row not a legal destination (§5)', move);
  } else if (!(move.dest && move.dest.type === 'bench')) {
    throw moveError('bad destination', move);
  }

  const s = cloneState(state);
  const board = s.boards[s.seatToMove];

  // Take (§4A).
  let taken;
  if (move.source.type === 'agency') {
    const agency = s.agencies[move.source.index];
    taken = agency[move.fn];
    agency[move.fn] = 0;
    for (let f = 0; f < FUNCTIONS; f++) {
      s.centre[f] += agency[f]; // the rest spill into the open market
      agency[f] = 0;
    }
  } else {
    taken = s.centre[move.fn];
    s.centre[move.fn] = 0;
    if (s.firstMoverInCentre) {
      s.firstMoverInCentre = false;
      board.firstMover = 1; // next round's start player either way (§6.3)
      if (board.bench.length < BENCH_SIZE) board.bench.push(FIRST_MOVER);
      // bench already full: token set aside, no penalty (§6.3)
    }
  }

  // Place (§4A), overflow to the bench, bench overflow to the lid (§6.2).
  let overflow = taken;
  if (move.dest.type === 'team') {
    const team = board.teams[move.dest.row];
    const put = Math.min(taken, move.dest.row + 1 - team.count);
    team.fn = move.fn;
    team.count += put;
    overflow -= put;
  }
  for (let i = 0; i < overflow; i++) {
    if (board.bench.length < BENCH_SIZE) board.bench.push(move.fn);
    else s.lid[move.fn]++;
  }

  s.seatToMove = (s.seatToMove + 1) % s.players;

  // Phases B and C contain no decisions, so they are not moves (§4B):
  // resolve automatically once the agencies and the centre are empty.
  if (phaseAOver(s)) {
    let guard = 0;
    do {
      resolveRound(s);
      // The loop re-fires only in the theoretical state where bag, lid,
      // agencies and centre are all empty (§6.1's rare case taken to its
      // limit). Provably unreachable at 2–3 players; guarded, not silent.
      if (++guard > 30) throw new Error('engine stalled: empty supply and no rows completing');
    } while (!s.over && phaseAOver(s));
  }
  return s;
}

function phaseAOver(s) {
  if (s.centre.some((c) => c > 0)) return false;
  return s.agencies.every((a) => a.every((c) => c === 0));
}

// Phase B + end check + Phase C (§4B, §4C, §8).
function resolveRound(s) {
  for (const board of s.boards) {
    // Rows resolve 1→5, scoring after each placement — a row-1 tile can
    // extend a run a row-2 tile then scores. Never batch (§7.2).
    for (let r = 0; r < TEAM_ROWS; r++) {
      const team = board.teams[r];
      if (team.count === r + 1) {
        const c = wallColumn(team.fn, r);
        board.wall[r][c] = 1;
        board.score += scorePlacement(board.wall, r, c);
        s.lid[team.fn] += r; // capacity r+1: one to the wall, r to the lid
        team.fn = -1;
        team.count = 0;
      }
    }
    // Bench penalties (§7.3), clamped at zero (§6.8).
    let penalty = 0;
    for (let i = 0; i < board.bench.length; i++) penalty += BENCH_PENALTIES[i];
    board.score = Math.max(0, board.score - penalty);
    for (const entry of board.bench) {
      if (entry !== FIRST_MOVER) s.lid[entry]++; // token never goes to the lid
    }
    board.bench = [];
  }

  // §8 — game ends immediately after the Phase B that completes a wall row.
  if (s.boards.some((b) => completeRows(b.wall) > 0)) {
    finishGame(s);
    return; // no refill after the trigger
  }

  // Phase C.
  const holder = s.boards.findIndex((b) => b.firstMover === 1);
  if (holder >= 0) s.startPlayer = holder; // untaken token: start player unchanged
  for (const b of s.boards) b.firstMover = 0;
  s.firstMoverInCentre = true;
  s.seatToMove = s.startPlayer;
  s.round++;
  dealAgencies(s);
}

function finishGame(s) {
  s.over = true;
  for (const b of s.boards) b.score += bonuses(b.wall);
  const scores = s.boards.map((b) => b.score);
  const top = Math.max(...scores);
  let leaders = [];
  for (let p = 0; p < s.players; p++) if (scores[p] === top) leaders.push(p);
  if (leaders.length > 1) {
    // §8 tiebreak: most complete horizontal rows; beyond that the engine
    // returns a draw and the tournament layer resolves it.
    const rows = leaders.map((p) => completeRows(s.boards[p].wall));
    const most = Math.max(...rows);
    leaders = leaders.filter((p, i) => rows[i] === most);
  }
  s.result = {
    scores,
    winner: leaders.length === 1 ? leaders[0] : -1, // -1 = draw among leaders
    leaders,
  };
}

// ---------------------------------------------------------------------------
// Scoring (§7).

export function scorePlacement(wall, row, col) {
  let h = 1;
  for (let c = col - 1; c >= 0 && wall[row][c]; c--) h++;
  for (let c = col + 1; c < FUNCTIONS && wall[row][c]; c++) h++;
  let v = 1;
  for (let r = row - 1; r >= 0 && wall[r][col]; r--) v++;
  for (let r = row + 1; r < TEAM_ROWS && wall[r][col]; r++) v++;
  if (h === 1 && v === 1) return 1; // isolated tile scores 1, not 0
  return (h > 1 ? h : 0) + (v > 1 ? v : 0); // part of both runs scores both
}

export function completeRows(wall) {
  let n = 0;
  for (let r = 0; r < TEAM_ROWS; r++) {
    if (wall[r].every((c) => c === 1)) n++;
  }
  return n;
}

export function completeColumns(wall) {
  let n = 0;
  for (let c = 0; c < FUNCTIONS; c++) {
    let full = true;
    for (let r = 0; r < TEAM_ROWS; r++) if (!wall[r][c]) full = false;
    if (full) n++;
  }
  return n;
}

export function completeFunctions(wall) {
  let n = 0;
  for (let f = 0; f < FUNCTIONS; f++) {
    let full = true;
    for (let r = 0; r < TEAM_ROWS; r++) if (!wall[r][wallColumn(f, r)]) full = false;
    if (full) n++;
  }
  return n;
}

// §8 final bonuses: +2 per row, +7 per column, +10 per function placed 5 times.
export function bonuses(wall) {
  return 2 * completeRows(wall) + 7 * completeColumns(wall) + 10 * completeFunctions(wall);
}

// ---------------------------------------------------------------------------
// Canonical serialization and per-turn hash (§9). One byte layout, fixed field
// order, integers only. Clients and server hash the same bytes or the
// determinism guarantee is theatre. state.result is derivable, so excluded.

export function serialize(s) {
  const parts = [
    ENGINE_VERSION,
    s.players,
    s.round,
    s.seatToMove,
    s.startPlayer,
    s.firstMoverInCentre ? 1 : 0,
    s.over ? 1 : 0,
    s.rng >>> 0,
    s.refills,
    -1,
    ...s.bag,
    -1,
    ...s.lid,
    -1,
  ];
  for (const agency of s.agencies) parts.push(...agency);
  parts.push(-1, ...s.centre, -1);
  for (const b of s.boards) {
    parts.push(b.score, b.firstMover);
    for (const t of b.teams) parts.push(t.fn, t.count);
    for (const row of b.wall) parts.push(...row);
    parts.push(b.bench.length, ...b.bench, -2);
  }
  return parts.join(',');
}

export function stateHash(s) {
  const str = serialize(s);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// Replay — the whole game from seed + move list (§9). This is what the server
// runs to derive the winner, and what a reconnecting client fetches.

export function replay(seed, players, moves) {
  let s = newGame(seed, players);
  for (const move of moves) s = apply(s, move);
  return s;
}
