// Pavilion — the Learn-to-play deal (ui.js, "Learn to play").
//
// A seed whose first round holds the tutorial's lesson, and the two moves the
// coach asks for. Theme-neutral like the engine: the coach's words, and what
// these kinds and rows are called, live in ui.js.
//
// The lesson needs, in order: seat 0 to start; source 2 to hold exactly two of
// kind 1, which fill line 1 exactly; the greedy bot to answer from a source,
// not the pool (so the first-player token is still there); and the pool then
// to hold exactly one of kind 2, which fills line 0, one wall column over from
// kind 1 on line 1, so the two tiles go up one above the other and score 1, then 2.
// An engine or bot change can break that; test/bot.test.js checks it, and the
// coach checks it at runtime and falls back to plain hints rather than strand
// a player.

import { newGame, apply, wallColumn } from './engine.js';
import { greedyMove } from './bot.js';

export const LESSON = {
  seed: 'lesson-7',
  first: { source: 2, kind: 1, row: 1 },
  second: { kind: 2, row: 0 },
};

export function lessonHolds() {
  try {
    const { first, second } = LESSON;
    let s = newGame(LESSON.seed, 2);
    if (s.startPlayer !== 0 || s.sources[first.source][first.kind] !== 2) return false;
    s = apply(s, { source: { type: 'source', index: first.source }, kind: first.kind, dest: { type: 'line', row: first.row } });
    const reply = greedyMove(s);
    if (reply.source.type !== 'source') return false;
    s = apply(s, reply);
    return (
      s.seatToMove === 0 &&
      s.firstTokenInPool &&
      s.pool[second.kind] === 1 &&
      wallColumn(second.kind, second.row) === wallColumn(first.kind, first.row)
    );
  } catch {
    return false;
  }
}
