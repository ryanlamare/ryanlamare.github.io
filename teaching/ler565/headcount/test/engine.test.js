// Headcount engine — headless test suite (HEADCOUNT-RULES.md §12).
//
//   node teaching/ler565/headcount/test/engine.test.js [games-per-player-count]
//
// No dependencies, no framework. The soak plays random-vs-random games — the
// random bot benches constantly, so it exercises the overflow and
// negative-scoring paths a competent player avoids. Default 1000 games per
// player count (3000 total).

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  ENGINE_VERSION,
  FUNCTIONS,
  TOTAL_TILES,
  AGENCY_SIZE,
  TEAM_ROWS,
  BENCH_SIZE,
  FIRST_MOVER,
  agencyCount,
  wallColumn,
  newGame,
  legalMoves,
  apply,
  applyTake,
  scorePlacement,
  completeRows,
  completeColumns,
  completeFunctions,
  bonuses,
  serialize,
  stateHash,
  replay,
} from '../engine.js';

// ---------------------------------------------------------------------------
// Tiny harness.

let passed = 0;
let failed = 0;
const MAX_FAILURE_PRINTS = 40;

function ok(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    if (failed <= MAX_FAILURE_PRINTS) console.error('  FAIL: ' + msg);
  }
}

function eq(got, want, msg) {
  ok(got === want, `${msg} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`);
}

function throws(fn, msg) {
  try {
    fn();
    ok(false, msg + ' (no throw)');
  } catch {
    ok(true, msg);
  }
}

function section(title) {
  console.log('— ' + title);
}

// The tests' own PRNG for bot choices — separate from the game rng.
function botRng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tile census: bag + lid + agencies + centre + teams + walls + benches,
// First Mover token excluded. Must equal 100 after every move.
function countTiles(s) {
  let n = s.bag.length;
  for (let f = 0; f < FUNCTIONS; f++) n += s.lid[f] + s.centre[f];
  for (const a of s.agencies) for (let f = 0; f < FUNCTIONS; f++) n += a[f];
  for (const b of s.boards) {
    for (const t of b.teams) n += t.count;
    for (const row of b.wall) for (const c of row) n += c;
    for (const e of b.bench) if (e !== FIRST_MOVER) n++;
  }
  return n;
}

function boardsSane(s) {
  for (const b of s.boards) {
    if (b.score < 0) return 'negative score';
    if (b.bench.length > BENCH_SIZE) return 'bench over 7';
    for (let r = 0; r < TEAM_ROWS; r++) {
      const t = b.teams[r];
      if (t.count > r + 1) return 'team row over capacity';
      if (t.count > 0 && (t.fn < 0 || t.fn >= FUNCTIONS)) return 'occupied row with no function';
      if (t.count === 0 && t.fn !== -1) return 'empty row with a function';
      if (t.count > 0 && b.wall[r][wallColumn(t.fn, r)]) return 'row aimed at a filled wall cell';
    }
    for (const row of b.wall) for (const c of row) if (c !== 0 && c !== 1) return 'wall cell not 0/1';
  }
  return null;
}

// Build a controlled state for directed tests: a real newGame emptied out.
function bareState(players = 2) {
  const s = newGame('directed-test', players);
  s.bag = [];
  s.lid = [0, 0, 0, 0, 0];
  s.agencies = s.agencies.map(() => [0, 0, 0, 0, 0]);
  s.centre = [0, 0, 0, 0, 0];
  s.firstMoverInCentre = false;
  s.startPlayer = 0;
  s.seatToMove = 0;
  for (const b of s.boards) {
    b.score = 0;
    b.firstMover = 0;
    b.teams = b.teams.map(() => ({ fn: -1, count: 0 }));
    b.wall = b.wall.map(() => [0, 0, 0, 0, 0]);
    b.bench = [];
  }
  return s;
}

function wallFrom(rows) {
  return rows.map((r) => [...r].map(Number));
}

// ---------------------------------------------------------------------------
section('§2 — Latin square');

// Spot-check the worked table in the spec against the formula.
eq(wallColumn(0, 0), 0, 'Eng in r0c0');
eq(wallColumn(4, 1), 0, 'Ana in r1c0');
eq(wallColumn(3, 2), 0, 'Fin in r2c0');
eq(wallColumn(1, 4), 0, 'Sal in r4c0');
{
  // Every function once per row and once per column.
  for (let r = 0; r < 5; r++) {
    const cols = new Set();
    for (let f = 0; f < 5; f++) cols.add(wallColumn(f, r));
    eq(cols.size, 5, `row ${r} holds every function once`);
  }
}

// ---------------------------------------------------------------------------
section('§3 — setup');

{
  const s = newGame('setup-seed', 2);
  eq(s.agencies.length, 5, '2 players → 5 agencies');
  eq(newGame('x', 3).agencies.length, 7, '3 players → 7 agencies');
  eq(newGame('x', 4).agencies.length, 9, '4 players → 9 agencies');
  for (const a of s.agencies) {
    eq(a.reduce((x, y) => x + y, 0), AGENCY_SIZE, 'agency holds exactly 4 tiles');
  }
  eq(s.bag.length, TOTAL_TILES - 5 * AGENCY_SIZE, 'bag holds the rest');
  eq(countTiles(s), TOTAL_TILES, 'setup conserves 100 tiles');
  ok(s.firstMoverInCentre, 'First Mover token starts in the centre');
  ok(s.startPlayer >= 0 && s.startPlayer < 2, 'start player derived from seed');
  eq(s.seatToMove, s.startPlayer, 'start player moves first');
  eq(stateHash(newGame('setup-seed', 2)), stateHash(s), 'same seed → identical setup');
  ok(stateHash(newGame('other-seed', 2)) !== stateHash(s), 'different seed → different setup');
  throws(() => newGame('x', 5), 'player count 5 rejected');
  throws(() => newGame('x', 1), 'player count 1 rejected');
}

// ---------------------------------------------------------------------------
section('§7 — placement scoring, worked cases');

{
  const w = wallFrom(['00000', '00000', '00100', '00000', '00000']);
  eq(scorePlacement(w, 2, 2), 1, 'isolated tile scores 1, not 0');
}
{
  const w = wallFrom(['00000', '00000', '01100', '00000', '00000']);
  eq(scorePlacement(w, 2, 2), 2, 'two in a row, nothing vertical → 2');
}
{
  const w = wallFrom(['00000', '00010', '01110', '00000', '00000']);
  eq(scorePlacement(w, 2, 3), 5, 'three horizontal, two vertical → 5 (both runs count)');
}
{
  const w = wallFrom(['00000', '00000', '11111', '00000', '00000']);
  eq(scorePlacement(w, 2, 3), 5, 'completes a full row, nothing vertical → 5');
}
{
  const w = wallFrom(['00100', '00100', '11111', '00100', '00100']);
  eq(scorePlacement(w, 2, 2), 10, 'full row and full column → 10');
}

// ---------------------------------------------------------------------------
section('§8 — bonuses');

{
  const full = wallFrom(['11111', '11111', '11111', '11111', '11111']);
  eq(completeRows(full), 5, 'full wall: 5 rows');
  eq(completeColumns(full), 5, 'full wall: 5 columns');
  eq(completeFunctions(full), 5, 'full wall: 5 functions');
  eq(bonuses(full), 95, 'full wall bonus 2·5 + 7·5 + 10·5 = 95');
}
{
  // Function 0 lives on the main diagonal: (r, r).
  const w = wallFrom(['10000', '01000', '00100', '00010', '00001']);
  eq(completeFunctions(w), 1, 'diagonal completes function 0');
  eq(bonuses(w), 10, 'one complete function → +10');
}
{
  const w = wallFrom(['10000', '10000', '10000', '10000', '10000']);
  eq(completeColumns(w), 1, 'one complete column');
  eq(bonuses(w), 7, 'one complete column → +7');
}

// ---------------------------------------------------------------------------
section('§4B — rows resolve 1→5, scoring after each placement');

{
  const s = bareState(2);
  // Row 0 complete with Operations (fn 2 → wall[0][2]); row 1 complete with
  // Sales (fn 1 → wall[1][2]) directly below it. Row 0 must land first so
  // row 1's placement scores the vertical pair.
  s.boards[0].teams[0] = { fn: 2, count: 1 };
  s.boards[0].teams[1] = { fn: 1, count: 2 };
  s.boards[1].firstMover = 1;
  s.agencies[0] = [0, 0, 0, 1, 0]; // one Finance tile: the last Phase A move
  s.bag = [0, 0, 0, 0];

  const after = apply(s, { source: { type: 'agency', index: 0 }, fn: 3, dest: { type: 'bench' } });
  eq(after.boards[0].wall[0][2], 1, 'row 0 tile placed at wall[0][2]');
  eq(after.boards[0].wall[1][2], 1, 'row 1 tile placed at wall[1][2]');
  // +1 isolated, then +2 vertical pair, then −1 bench = 2. Batch-scoring
  // would have given 1 + 1 − 1 = 1.
  eq(after.boards[0].score, 2, 'row-1 placement scored the run row-0 created');
  eq(after.boards[0].teams[0].count, 0, 'completed rows emptied');
  ok(!after.over, 'game continues');
  eq(after.round, 2, 'round advanced');
  eq(after.startPlayer, 1, 'First Mover holder starts the next round');
  eq(after.seatToMove, 1, 'holder is on the move');
  ok(after.firstMoverInCentre, 'token returned to the centre');
  // Deal: bag had 4 tiles → agency 0; then the lid (2 tiles) refilled the
  // bag — an alumni wave — and partially filled agency 1; agencies 2–4 stay
  // empty with bag and lid both dry. No throw (§6.1).
  eq(after.agencies[0].reduce((a, b) => a + b, 0), 4, 'agency 0 fully dealt');
  eq(after.agencies[1].reduce((a, b) => a + b, 0), 2, 'agency 1 partially dealt from the refill');
  eq(after.agencies[2].reduce((a, b) => a + b, 0), 0, 'agency 2 empty — play with what is there');
  eq(after.refills, 1, 'lid-to-bag refill counted');
  eq(after.bag.length, 0, 'bag empty after partial deal');
  eq(after.lid.reduce((a, b) => a + b, 0), 0, 'lid empty after refill');
}

// ---------------------------------------------------------------------------
section('§6.3 — First Mover token');

{
  const s = bareState(2);
  s.firstMoverInCentre = true;
  s.centre = [2, 0, 0, 0, 0]; // two Engineering tiles
  s.boards[0].score = 5;
  const after = apply(s, { source: { type: 'centre' }, fn: 0, dest: { type: 'team', row: 1 } });
  // Row 1 completes: wall[1][1], +1. Token on the bench: −1. 5 + 1 − 1 = 5.
  eq(after.boards[0].score, 5, 'token takes a bench penalty like any tile');
  eq(after.startPlayer, 0, 'token taker becomes next start player');
  ok(after.firstMoverInCentre, 'token back in the centre for the new round');
  eq(after.boards[0].bench.length, 0, 'bench cleared; token not discarded to the lid');
  // The row's surplus tile went to the lid, then the Phase C deal refilled
  // the bag from it (alumni wave) and dealt it back out.
  eq(after.refills, 1, 'discard came back via a lid-to-bag refill');
  eq(after.agencies[0][0], 1, 'and was dealt into agency 0');
}
{
  const s = bareState(2);
  s.firstMoverInCentre = true;
  s.centre = [3, 0, 0, 0, 0];
  s.boards[0].bench = [1, 1, 1, 1, 1, 1, 1]; // already full
  s.boards[0].score = 20;
  const after = apply(s, { source: { type: 'centre' }, fn: 0, dest: { type: 'bench' } });
  // Bench stays at 7 (−14 cap); 3 tiles overflow to the lid; token set
  // aside with no penalty; taker still starts next round. The 10 discarded
  // tiles then refill the bag and get redealt in Phase C.
  eq(after.boards[0].score, 6, 'full bench: −14 cap, token adds nothing');
  eq(after.startPlayer, 0, 'set-aside token still confers start player');
  eq(after.refills, 1, 'discards refilled the bag');
  eq(
    after.agencies.reduce((n, a) => n + a.reduce((x, y) => x + y, 0), 0),
    10,
    'all 10 discarded tiles dealt back out'
  );
}
{
  const s = bareState(2);
  s.firstMoverInCentre = true; // centre holds only the token
  s.agencies[0] = [0, 2, 0, 0, 0];
  const moves = legalMoves(s);
  ok(moves.length > 0, 'agency moves exist');
  ok(!moves.some((m) => m.source.type === 'centre'), '§6.4: token-only centre is not a source');
}

// ---------------------------------------------------------------------------
section('§6 — remaining edge cases');

{
  const s = bareState(2);
  s.agencies[0] = [0, 3, 0, 0, 0]; // single-function agency
  s.agencies[1] = [1, 0, 0, 0, 0]; // keeps the round alive
  const after = apply(s, { source: { type: 'agency', index: 0 }, fn: 1, dest: { type: 'team', row: 4 } });
  eq(after.centre.reduce((a, b) => a + b, 0), 0, '§6.5: nothing moves to the centre');
  eq(after.boards[0].teams[4].count, 3, 'all three tiles placed');
}
{
  const s = bareState(2);
  s.agencies[0] = [4, 0, 0, 0, 0];
  s.agencies[1] = [0, 1, 0, 0, 0];
  s.boards[0].teams[2] = { fn: 0, count: 1 }; // capacity 3, space for 2
  const after = apply(s, { source: { type: 'agency', index: 0 }, fn: 0, dest: { type: 'team', row: 2 } });
  eq(after.boards[0].teams[2].count, 3, '§6.6: row filled to capacity');
  eq(after.boards[0].bench.length, 2, '§6.6: remainder benched (4 taken, 2 fit, 2 benched)');
}
{
  const s = bareState(2);
  // Block Engineering from every row via the wall, so the bench is forced.
  for (let r = 0; r < TEAM_ROWS; r++) s.boards[0].wall[r][wallColumn(0, r)] = 1;
  s.agencies[0] = [2, 0, 0, 0, 0];
  const moves = legalMoves(s);
  eq(moves.length, 1, '§5.5: forced bench dump is the only move');
  eq(moves[0].dest.type, 'bench', 'and it is the bench');
}
{
  const s = newGame('voluntary', 2);
  const moves = legalMoves(s);
  ok(moves.some((m) => m.dest.type === 'bench'), '§5.4: voluntary bench dump offered');
  ok(moves.some((m) => m.dest.type === 'team'), 'alongside legal team rows');
}
{
  // Observed before any round resolution: keep another agency occupied.
  const s = bareState(2);
  s.centre = [0, 0, 9, 0, 0];
  s.agencies[1] = [1, 0, 0, 0, 0];
  s.boards[0].bench = [3, 3, 3, 3, 3]; // 5 occupied
  const after = apply(s, { source: { type: 'centre' }, fn: 2, dest: { type: 'bench' } });
  eq(after.boards[0].bench.length, 7, '§6.2: bench fills to 7 and stops');
  eq(after.lid[2], 7, '§6.2: excess goes straight to the lid');
}
{
  // Same take, but the round resolves: 7 occupied → −14, clamped at 0.
  const s = bareState(2);
  s.centre = [0, 0, 9, 0, 0];
  s.boards[0].bench = [3, 3, 3, 3, 3];
  s.boards[0].score = 3;
  const after = apply(s, { source: { type: 'centre' }, fn: 2, dest: { type: 'bench' } });
  eq(after.boards[0].score, 0, '§6.8: score clamps at 0, never negative');
  eq(after.boards[0].bench.length, 0, 'bench cleared after penalties');
}

// ---------------------------------------------------------------------------
section('§8 — game end, simultaneous completion, tiebreak');

{
  // Both players complete wall row 0 in the same Phase B (§6.7). Analytics
  // (fn 4) lands at wall[0][4].
  const setup = () => {
    const s = bareState(2);
    for (const b of s.boards) {
      b.wall[0] = [1, 1, 1, 1, 0];
      b.teams[0] = { fn: 4, count: 1 };
    }
    s.centre = [1, 0, 0, 0, 0];
    s.firstMoverInCentre = true; // the take brings the token: −2 bench total
    return s;
  };
  {
    const s = setup();
    const after = apply(s, { source: { type: 'centre' }, fn: 0, dest: { type: 'bench' } });
    ok(after.over, 'game over after the completing Phase B');
    eq(after.round, 1, 'no further round dealt');
    ok(after.agencies.every((a) => a.every((c) => c === 0)), 'no refill after the trigger');
    // p0: +5 row, +2 bonus, −1 bench (token) −1 bench (tile) → wait: p0 took
    // to bench (1 tile + token = −2). p1: +5, +2. Scores: p0 5, p1 7.
    eq(after.result.scores[0], 5, 'mover: 5 + 2 − 2 = 5');
    eq(after.result.scores[1], 7, 'opponent: 5 + 2 = 7');
    eq(after.result.winner, 1, 'higher score wins');
  }
  {
    // Force equal scores and equal rows → a genuine draw.
    const s = setup();
    s.boards[0].score = 2; // cancels the −2 bench
    const after = apply(s, { source: { type: 'centre' }, fn: 0, dest: { type: 'bench' } });
    eq(after.result.winner, -1, 'equal score, equal rows → draw');
    eq(after.result.leaders.join(','), '0,1', 'both players lead');
  }
  {
    // Equal scores, different complete-row counts → tiebreak decides.
    const s = setup();
    s.boards[1].wall[1] = [1, 1, 1, 1, 1]; // a second complete row, pre-built
    // p1's placement now scores 5+2 (vertical pair), bonuses 2+2 → 11 total.
    // Head-start p0 so raw scores tie: 6 + 5 − 2 bench + 2 bonus = 11.
    s.boards[0].score = 6;
    const after = apply(s, { source: { type: 'centre' }, fn: 0, dest: { type: 'bench' } });
    eq(after.result.scores[0], after.result.scores[1], 'raw scores level');
    eq(after.result.winner, 1, 'most complete rows takes the tiebreak');
  }
}

// ---------------------------------------------------------------------------
section('§10 — illegal moves rejected');

{
  const s = newGame('illegal', 2);
  const board = s.boards[s.seatToMove];
  const someAgency = s.agencies.findIndex((a) => a.some((c) => c > 0));
  const fnPresent = s.agencies[someAgency].findIndex((c) => c > 0);
  const fnAbsent = s.agencies[someAgency].findIndex((c) => c === 0);
  if (fnAbsent >= 0) {
    throws(
      () => apply(s, { source: { type: 'agency', index: someAgency }, fn: fnAbsent, dest: { type: 'bench' } }),
      'taking a function not present at the source'
    );
  }
  throws(
    () => apply(s, { source: { type: 'agency', index: 99 }, fn: 0, dest: { type: 'bench' } }),
    'taking from a nonexistent agency'
  );
  throws(
    () => apply(s, { source: { type: 'centre' }, fn: 0, dest: { type: 'bench' } }),
    'taking from an empty centre'
  );
  board.teams[3] = { fn: (fnPresent + 1) % FUNCTIONS, count: 1 };
  throws(
    () =>
      apply(s, {
        source: { type: 'agency', index: someAgency },
        fn: fnPresent,
        dest: { type: 'team', row: 3 },
      }),
    'placing into a row holding a different function'
  );
  board.teams[3] = { fn: -1, count: 0 };
  board.wall[3][wallColumn(fnPresent, 3)] = 1;
  throws(
    () =>
      apply(s, {
        source: { type: 'agency', index: someAgency },
        fn: fnPresent,
        dest: { type: 'team', row: 3 },
      }),
    'placing toward an already-filled wall cell'
  );
}

// ---------------------------------------------------------------------------
section('applyTake — the UI staging step');

{
  const s = newGame('stage', 2);
  const move = legalMoves(s)[0];
  eq(
    serialize(applyTake(s, move)),
    serialize(apply(s, move)),
    'mid-round: applyTake and apply agree exactly'
  );
}
{
  // Last move of a round: applyTake stops at the end of Phase A; apply
  // resolves. The difference between the two is the Phase B/C theatre.
  const s = bareState(2);
  s.agencies[0] = [1, 0, 0, 0, 0];
  s.bag = [2, 2, 2, 2]; // enough to deal the next round
  const move = { source: { type: 'agency', index: 0 }, fn: 0, dest: { type: 'bench' } };
  const interim = applyTake(s, move);
  const full = apply(s, move);
  eq(interim.round, 1, 'applyTake does not resolve the round');
  eq(interim.boards[0].bench.length, 1, 'interim keeps the benched tile visible');
  eq(full.round, 2, 'apply resolves through to the next round');
  eq(full.boards[0].bench.length, 0, 'apply cleared the bench');
}

{
  const s = newGame('purity', 2);
  const before = serialize(s);
  const move = legalMoves(s)[0];
  const after = apply(s, { ...move, t: 12840 }); // clock field ignored by apply
  eq(serialize(s), before, 'apply never mutates its input');
  const afterNoT = apply(s, move);
  eq(stateHash(after), stateHash(afterNoT), 'move.t does not affect the state');
}

// ---------------------------------------------------------------------------
section('soak — random vs random, invariants every move');

const GAMES_PER_COUNT = Number(process.argv[2]) || 1000;
const records = []; // sampled {seed, players, moves, hash} for replay checks
const stats = {};

for (const players of [2, 3, 4]) {
  const st = {
    games: 0,
    rounds: 0,
    maxRounds: 0,
    moves: 0,
    draws: 0,
    refillGames: 0,
    reachedRefillRound: 0,
    refillWhenReached: 0,
  };
  stats[players] = st;

  for (let g = 0; g < GAMES_PER_COUNT; g++) {
    const seed = `soak-${players}p-${g}`;
    const pick = botRng(0x9e3779b9 ^ (players * 1000003 + g));
    let s = newGame(seed, players);
    const moves = [];
    let guard = 0;
    let broke = false;

    while (!s.over) {
      const legal = legalMoves(s);
      if (legal.length === 0) {
        ok(false, `${seed}: legalMoves empty while tiles remain`);
        broke = true;
        break;
      }
      const move = legal[Math.floor(pick() * legal.length)];
      moves.push(move);
      s = apply(s, move);

      if (countTiles(s) !== TOTAL_TILES) {
        ok(false, `${seed}: tile conservation broken after move ${moves.length}`);
        broke = true;
        break;
      }
      const insane = boardsSane(s);
      if (insane) {
        ok(false, `${seed}: ${insane} after move ${moves.length}`);
        broke = true;
        break;
      }
      if (++guard > 3000) {
        ok(false, `${seed}: game did not terminate`);
        broke = true;
        break;
      }
    }
    if (broke) continue;

    // Final-state shape.
    if (!s.result) ok(false, `${seed}: over without a result`);
    else {
      const scoresMatch = s.result.scores.every((sc, p) => sc === s.boards[p].score);
      if (!scoresMatch) ok(false, `${seed}: result scores disagree with boards`);
      if (s.result.winner === -1) st.draws++;
      else if (s.result.winner < 0 || s.result.winner >= players) {
        ok(false, `${seed}: winner out of range`);
      }
    }
    if (!phaseAOver(s)) ok(false, `${seed}: game ended with tiles on the table`);

    // Refill accounting (§6.1): the round-R deal happens for R = 1…round.
    // 2p: deals ≤5 fit the bag exactly → zero refills; a round-6 deal forces
    // one. 3p: the round-4 deal forces one. 4p: the round-3 deal.
    const refillRound = { 2: 6, 3: 4, 4: 3 }[players];
    if (s.round >= refillRound) {
      st.reachedRefillRound++;
      if (s.refills >= 1) st.refillWhenReached++;
      else ok(false, `${seed}: reached the round-${refillRound} deal with no refill`);
    } else if (s.refills !== 0) {
      ok(false, `${seed}: refilled before the bag could be empty (round ${s.round}, refills ${s.refills})`);
    }
    if (s.refills > 0) st.refillGames++;

    st.games++;
    st.rounds += s.round;
    st.maxRounds = Math.max(st.maxRounds, s.round);
    st.moves += moves.length;

    // Sample games for replay checks.
    if (g % 50 === 0) records.push({ seed, players, moves, hash: stateHash(s) });
  }

  ok(st.games > 0, `${players}p soak ran`);
  ok(
    st.reachedRefillRound === st.refillWhenReached,
    `${players}p: every game reaching the refill round actually refilled`
  );
  if (players >= 3) {
    ok(
      st.reachedRefillRound / Math.max(1, st.games) > 0.9,
      `${players}p: refill is a main path (${st.reachedRefillRound}/${st.games} games reached it)`
    );
  }
}

function phaseAOver(s) {
  return s.centre.every((c) => c === 0) && s.agencies.every((a) => a.every((c) => c === 0));
}

for (const players of [2, 3, 4]) {
  const st = stats[players];
  const avgRounds = (st.rounds / st.games).toFixed(1);
  const avgMoves = (st.moves / st.games).toFixed(1);
  console.log(
    `  ${players}p: ${st.games} games, avg ${avgRounds} rounds (max ${st.maxRounds}), ` +
      `avg ${avgMoves} moves, refill in ${st.refillGames} (${((st.refillGames / st.games) * 100).toFixed(0)}%), ` +
      `${st.draws} draws`
  );
}

// ---------------------------------------------------------------------------
section('§9 — determinism: same-process replay, per-turn hashes');

{
  let checked = 0;
  for (const rec of records.slice(0, 30)) {
    let a = newGame(rec.seed, rec.players);
    let b = newGame(rec.seed, rec.players);
    let diverged = false;
    for (const move of rec.moves) {
      a = apply(a, move);
      b = apply(b, move);
      if (stateHash(a) !== stateHash(b)) {
        ok(false, `${rec.seed}: per-turn hash divergence`);
        diverged = true;
        break;
      }
    }
    if (!diverged) {
      eq(stateHash(a), rec.hash, `${rec.seed}: replay reaches the recorded final state`);
      checked++;
    }
  }
  ok(checked >= 10, `replayed ${checked} recorded games`);
}

// ---------------------------------------------------------------------------
section('§9 — determinism across separate processes');

{
  const childPath = join(dirname(fileURLToPath(import.meta.url)), 'replay-child.js');
  for (const rec of records.slice(0, 4)) {
    const res = spawnSync(process.execPath, [childPath], {
      input: JSON.stringify({ seed: rec.seed, players: rec.players, moves: rec.moves }),
      encoding: 'utf8',
    });
    eq(res.status, 0, `${rec.seed}: child replay exits cleanly`);
    eq(res.stdout, rec.hash, `${rec.seed}: identical final hash in a separate process`);
  }
}

// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed (engine v${ENGINE_VERSION}, soak ${GAMES_PER_COUNT}/count)`);
process.exit(failed === 0 ? 0 : 1);
