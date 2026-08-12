// Greedy-bot test suite.
//
//   node rivet/test/bot.test.js [games]
//
// The bar for the Training Ground opponent: always legal, deterministic,
// clearly better than random (a bot that loses to noise teaches nothing),
// and it finishes games in sensible time at sensible scores.

import {
  newGame,
  legalMoves,
  apply,
  stateHash,
  TOTAL_TILES,
} from '../engine.js';
import { greedyMove } from '../bot.js';

let passed = 0;
let failed = 0;
function ok(cond, msg) {
  if (cond) passed++;
  else {
    failed++;
    console.error('  FAIL: ' + msg);
  }
}

function botRng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GAMES = Number(process.argv[2]) || 150;

// ---------------------------------------------------------------------------
console.log('— determinism and legality');

{
  let s = newGame('bot-determinism', 2);
  for (let i = 0; i < 20 && !s.over; i++) {
    const a = greedyMove(s);
    const b = greedyMove(s);
    ok(JSON.stringify(a) === JSON.stringify(b), `move ${i}: same position, same move`);
    // Legality is proven by apply not throwing — apply validates fully.
    s = apply(s, a);
  }
}

// ---------------------------------------------------------------------------
console.log('— greedy vs random: the bot must beat noise');

{
  let greedyWins = 0;
  let randomWins = 0;
  let draws = 0;
  for (let g = 0; g < GAMES; g++) {
    const greedySeat = g % 2; // alternate seats so seed-derived start order washes out
    const pick = botRng(0xbadc0de ^ g);
    let s = newGame(`gvr-${g}`, 2);
    let guard = 0;
    while (!s.over && guard++ < 500) {
      const move =
        s.seatToMove === greedySeat
          ? greedyMove(s)
          : (() => {
              const m = legalMoves(s);
              return m[Math.floor(pick() * m.length)];
            })();
      s = apply(s, move);
    }
    ok(s.over, `gvr-${g} terminates`);
    if (!s.over) continue;
    if (s.result.winner === -1) draws++;
    else if (s.result.winner === greedySeat) greedyWins++;
    else randomWins++;
  }
  const rate = greedyWins / GAMES;
  console.log(
    `  greedy ${greedyWins}, random ${randomWins}, drawn ${draws} — greedy win rate ${(rate * 100).toFixed(0)}%`
  );
  ok(rate >= 0.8, `greedy beats random at least 80% of the time (got ${(rate * 100).toFixed(0)}%)`);
}

// ---------------------------------------------------------------------------
console.log('— greedy vs greedy: sane, finite, replayable games');

{
  let totalWinner = 0;
  let maxRounds = 0;
  const n = Math.min(GAMES, 80);
  for (let g = 0; g < n; g++) {
    let s = newGame(`gvg-${g}`, 2);
    const moves = [];
    let guard = 0;
    while (!s.over && guard++ < 500) {
      const m = greedyMove(s);
      moves.push(m);
      s = apply(s, m);
    }
    ok(s.over, `gvg-${g} terminates`);
    if (!s.over) continue;
    maxRounds = Math.max(maxRounds, s.round);
    totalWinner += Math.max(...s.result.scores);

    // A bot game replays like any other game: same seed, same moves,
    // same final state.
    let r = newGame(`gvg-${g}`, 2);
    for (const m of moves) r = apply(r, m);
    ok(stateHash(r) === stateHash(s), `gvg-${g} replays to the identical state`);
  }
  const avgWinner = totalWinner / n;
  console.log(`  ${n} games, avg winning score ${avgWinner.toFixed(1)}, max ${maxRounds} rounds`);
  ok(avgWinner >= 25, `winning scores look like real play, not noise (avg ${avgWinner.toFixed(1)})`);
  ok(maxRounds <= 12, `games end in sensible time (max ${maxRounds} rounds)`);
}

// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed (${GAMES} greedy-vs-random games)`);
process.exit(failed === 0 ? 0 : 1);
