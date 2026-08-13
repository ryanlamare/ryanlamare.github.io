// Pavilion — deriving a result from a finished room, and the record it becomes.
//
// Build step 5. This is the file that makes an archived result unforgeable:
// a game is `seed + move list` (PAVILION-RULES.md §9), so the server does not
// have to trust what a client says the score was — it replays the moves through
// the *same* `engine.js` module the clients ran and reads the answer off the
// final state. `over` on the wire becomes advisory (PROTOCOL.md).
//
// Pure and host-free: no storage, no sockets, no Cloudflare. `worker.js` and
// `dev-relay.js` both call it, and `test/archive.test.js` calls it directly.
//
// Theme-neutral like everything below the copy layer (rules spec §10). Nothing
// here knows what a discipline is called.

import { ENGINE_VERSION, replay, completeRows, stateHash } from '../engine.js';

// League scoring is **inclusive totals, not bonuses** (§8): win 3, draw 2,
// loss 1 — the point for playing *is* the loser's point. A three-player game
// uses the same table rather than a weighted one; odd attendance rotates over a
// term and it washes out (PAVILION.md, League).
export const LEAGUE_POINTS = { win: 3, draw: 2, loss: 1 };

// Derive the result of a finished room by replaying it.
//
// `claim` is what the clients agreed on — used only for `ending`, never for
// scores. A claim that the replay contradicts downgrades the game to `void`
// with a reason rather than being recorded as a win nobody can reproduce.
export function deriveResult(room, claim = room.ended) {
  const ending = claim?.ending || 'void';
  if (ending === 'void') {
    return voided(room, claim?.reason || 'abandoned');
  }

  let final;
  try {
    final = replay(room.seed, room.players, (room.moves || []).map((m) => m.move));
  } catch (err) {
    // A move list that no longer replays is a bug or a forgery; either way it
    // is not a result. Say which, and keep the moves — that is the bug report.
    return voided(room, `replay failed: ${err.message}`);
  }

  if (ending === 'natural' && !final.over) {
    return voided(room, 'claimed a natural end the move list does not reach');
  }
  if (ending === 'timeout' && final.over) {
    return voided(room, 'claimed a timeout after the game had already finished');
  }

  // A natural end has run finishGame, so the scores already carry §8's
  // bonuses. A timeout stops mid-game and the running board scores stand —
  // which is exactly why §11 excludes timeouts from score-based awards.
  const scores = final.result ? final.result.scores : final.boards.map((b) => b.score);
  const rows = final.boards.map((b) => completeRows(b.wall));
  const flagged = ending === 'timeout' ? Number(claim.flagged) : null;

  const ranks = rankSeats(scores, rows, flagged);
  const leaders = ranks.map((r, seat) => (r === 1 ? seat : -1)).filter((s) => s >= 0);

  return {
    ending,
    flagged: Number.isInteger(flagged) ? flagged : null,
    scores,
    rows,
    ranks,
    leaders,
    winner: leaders.length === 1 ? leaders[0] : -1, // -1 = draw among leaders
    points: leaguePointsFor(ranks),
    plies: (room.moves || []).length,
    // The replay's own fingerprint. Two servers, or a server and a client,
    // that disagree about a stored game disagree here first (§9).
    hash: stateHash(final),
  };
}

export function voided(room, reason) {
  return {
    ending: 'void',
    reason,
    flagged: null,
    scores: null,
    rows: null,
    ranks: null,
    leaders: [],
    winner: -1,
    points: null, // a void game scores nothing, not even the point for playing
    plies: (room.moves || []).length,
    hash: null,
  };
}

// §8's table, applied to a finished ranking: a lone first place is a win; a
// shared first place is a draw for everyone in it; every other rank is the
// loser's point. In a three-player game that gives 3/1/1, and 2/2/1 for a
// two-way tie at the top — which is the spec's own worked example.
export function leaguePointsFor(ranks) {
  const firsts = ranks.filter((r) => r === 1).length;
  return ranks.map((r) => (r > 1 ? LEAGUE_POINTS.loss : firsts > 1 ? LEAGUE_POINTS.draw : LEAGUE_POINTS.win));
}

// 1-based competition ranking. Timeout loses like chess, so the flagged seat is
// placed last whatever the board says; everyone else is ordered by score, then
// by §8's tiebreak (most complete rows), then shares the rank.
//
// ⚖️ The flagged-seat-last rule is ours. §11 says a timeout loses and the
// rulebook has nothing to say about three players, one of whom ran out of
// time; ranking them last and letting the rest place on score is the reading
// that matches chess and keeps the league points table unchanged.
export function rankSeats(scores, rows, flagged = null) {
  const seats = scores.map((_, i) => i);
  const better = (a, b) => {
    const aOut = a === flagged;
    const bOut = b === flagged;
    if (aOut !== bOut) return aOut ? 1 : -1;
    if (scores[a] !== scores[b]) return scores[b] - scores[a];
    return rows[b] - rows[a];
  };
  const level = (a, b) => (a === flagged) === (b === flagged) && scores[a] === scores[b] && rows[a] === rows[b];

  const order = seats.slice().sort(better);
  const ranks = new Array(scores.length);
  let r = 1;
  for (let i = 0; i < order.length; i++) {
    if (i > 0 && !level(order[i], order[i - 1])) r = i + 1;
    ranks[order[i]] = r;
  }
  return ranks;
}

// A term key is `<league>-<season>`, and **the league is the first segment**:
// `ler565-2027-summer` is LER 565's 2027 summer cohort; `kitchen` is a league
// with no season at all. That split is the whole league mechanism — there is no
// league object, deliberately (PAVILION.md, *Leagues and the records site*).
//
// ⚠️ **A season is optional.** A class has cohorts; a kitchen-table rivalry and
// a challenge ladder are one continuous record. Nothing downstream may assume a
// year is attached.
export function splitTerm(term) {
  const t = String(term || '');
  if (!t) return { league: null, season: null };
  const cut = t.indexOf('-');
  return cut < 0 ? { league: t, season: null } : { league: t.slice(0, cut), season: t.slice(cut + 1) };
}

// The game record (rules spec §10, "The game record"). One object per game,
// kilobytes, and the archive stores whole games rather than results — so an
// award invented in week 5 can be applied retroactively to week 1.
//
// `seats` is the spec's array of player ids in join order. `names` is ours:
// ids are slugs and a record has to stay readable on its own.
export function buildRecord(room, { term, mode, id, at, result }) {
  const seats = room.seats || [];
  // ⚖️ **The league is stamped here, at write time**, rather than parsed out of
  // the term on every page load (2026-08-13). Same information either way; the
  // difference is that a typo'd term key becomes a visible field on the record
  // instead of a season silently missing from an all-time table with nothing to
  // point at. The cheapest insurance available on the one thing that would be
  // miserable to debug in 2031.
  const { league, season } = splitTerm(term);
  return {
    v: ENGINE_VERSION,
    id,
    term,
    league,
    season, // null is a real answer, not a missing one — see splitTerm
    mode, // 'league' | 'cup' | 'exhibition' | 'practice' | 'casual'
    room: room.code,
    seed: room.seed,
    players: room.players,
    seats: seats.map((s) => s.pid || null),
    names: seats.map((s) => s.name),
    device: seats.map((s) => s.device || 'unknown'),
    config: { clockMs: room.clockMs, splashHistory: !!room.splashHistory },
    startedAt: room.startedAt || null,
    endedAt: at,
    moves: (room.moves || []).map((m) => ({ seat: m.seat, move: m.move, at: m.at })),
    result: result || deriveResult(room),
  };
}

// A summary is what the league table and the stats screens read: everything
// except the move list, which is the only part that isn't tiny. Listing a
// term's summaries stays cheap however many games the archive holds.
export function summarize(rec) {
  const { moves, ...rest } = rec;
  return { ...rest, plies: moves ? moves.length : (rec.result?.plies ?? 0) };
}
