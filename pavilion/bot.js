// Pavilion — the greedy practice bot (build step 3).
//
// The Training Ground opponent and the emergency stand-in for a no-show.
// It never plays a league game. Per the memo it is a greedy heuristic —
// best immediate placement, avoids idling tiles — deliberately one ply deep:
// good enough to teach the rules, beatable once a student understands them.
//
// It is a MOVE SOURCE, exactly like a network message or a click: it reads
// legalMoves(), weighs each with the engine's own applyTake/scorePlacement,
// and returns one move. No rules knowledge lives here beyond preferences.
// Deterministic: the same position always produces the same move.
//
// (The random bot the memo also calls for lives in the test suite — it is a
// test fixture, not a feature, and students never meet it.)

import {
  legalMoves,
  applyTake,
  wallColumn,
  scorePlacement,
  FLOOR_PENALTIES,
} from './engine.js';

export const BOT_VERSION = 1;

function floorPenalty(n) {
  let p = 0;
  for (let i = 0; i < Math.min(n, FLOOR_PENALTIES.length); i++) p += FLOOR_PENALTIES[i];
  return p;
}

// Weigh one legal move for the player to move. applyTake gives the exact
// post-move board — overflow, token, forced-floor cases all included — so
// the weights never disagree with the rules.
function evaluate(state, move) {
  const seat = state.seatToMove;
  const before = state.boards[seat];
  const after = applyTake(state, move).boards[seat];

  // The idling bill this move actually adds (token space included).
  const floorCost = floorPenalty(after.floor.length) - floorPenalty(before.floor.length);
  let value = -floorCost;

  if (move.dest.type === 'line') {
    const r = move.dest.row;
    const gained = after.lines[r].count - before.lines[r].count;
    if (after.lines[r].count === r + 1) {
      // Completing a line: worth the real placement score next Phase B,
      // plus a little for the wall tile's pull toward end-game bonuses.
      const c = wallColumn(move.kind, r);
      const wall = before.wall.map((row) => row.slice());
      wall[r][c] = 1;
      value += scorePlacement(wall, r, c) + 1.5;
    } else {
      // Partial progress is worth less than points in hand, and a barely
      // started long line is a liability it should feel slightly.
      value += gained * 0.8 - (r + 1 - after.lines[r].count) * 0.1;
    }
  }

  // The first-player token: initiative next round, at the idling cost
  // already counted above.
  if (move.source.type === 'pool' && state.firstTokenInPool) value += 0.25;

  return value;
}

export function greedyMove(state) {
  const moves = legalMoves(state);
  let best = null;
  let bestValue = -Infinity;
  for (const move of moves) {
    const v = evaluate(state, move);
    if (v > bestValue + 1e-9) {
      bestValue = v;
      best = move;
    }
  }
  return best;
}
