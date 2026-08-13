// Pavilion — every table, record and honour, as pure queries over stored games.
//
// Build step 6. Nothing here fetches, stores or renders: it takes an array of
// summaries (a record minus its move list — see `summarize` in result.js) and
// returns plain objects. That is what lets the same module run in the Worker,
// in the dev relay, in a headless test and in the records pages the browser
// loads, with no second implementation to drift.
//
// ⚠️ **The screens apply the uplifting rule; this file does not.** `standings`
// returns the whole ordered table, and what a public page may do with it is a
// display decision made in the page (2026-08-13, revised — see PAVILION.md,
// *Public board vs the class register*): the top five are **ranked and
// numbered** through `topN`, and everyone else appears through `byName`, which
// shows the same columns in alphabetical order with no position printed. The
// bottom of an ordered list is the thing the rule exists to prevent; a class
// register is not that, and hiding half the class was never the point.
//
// ⚠️ **No theme words.** Records come back keyed (`bestGame`, `widestWin`) and
// the page turns them into Best in Show and the rest, exactly as `ui.js` owns
// the board's vocabulary (rules spec §10). A fourth theme must not have to
// touch this file.

// ⚠️ **This file imports nothing**, and that is deliberate. It reads the
// `league` and `season` *stamped on each record* rather than re-splitting the
// term key, which is exactly what stamping bought — and it means a records page
// loads 15 KB of queries instead of dragging `result.js` and the whole 17 KB
// engine into a page that never replays a game.

// Which modes feed which screen. The league table is weeks 1–5 only; the cup is
// its own knockout and the Record Book takes both, because a 94 in the final is
// still the best game anyone has played. Exhibitions (any game with the
// instructor in it), practice and casual games count for nothing anywhere —
// they are archived, not competed in.
export const LEAGUE_MODES = ['league'];
export const RECORD_MODES = ['league', 'cup'];

// A game counts if it was played in a counting mode and actually finished. A
// void game did not happen: no points, not even the point for playing.
export function counted(games, modes = LEAGUE_MODES) {
  return (games || []).filter(
    (g) => modes.includes(g.mode) && g.result && g.result.ending !== 'void' && Array.isArray(g.result.scores)
  );
}

// Newest first, which is the order every screen here wants: form is the last
// five, the last meeting is the first match, the Bulletin reads downwards.
export function byRecency(games) {
  return [...games].sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
}

export function seasonsOf(games) {
  const seen = new Map();
  for (const g of games || []) {
    const key = g.season ?? null;
    if (!seen.has(key)) seen.set(key, { season: key, term: g.term, games: 0 });
    seen.get(key).games++;
  }
  // Newest season first, and a seasonless league (`kitchen`) sorts on its own —
  // never assume a year is attached (PAVILION.md, Seasons are optional).
  return [...seen.values()].sort((a, b) => String(b.season ?? '').localeCompare(String(a.season ?? '')));
}

export function leagueOf(game) {
  return game.league ?? null;
}

// ---------------------------------------------------------------------------
// The league table.
//
// Win 3, draw 2, loss 1 — inclusive totals, already stamped on every record by
// result.js, so this adds up what the server derived rather than re-deciding
// it. A three-player game uses the same table (§8).

export function standings(games, { modes = LEAGUE_MODES, formLength = 5, roster = null } = {}) {
  const played = byRecency(counted(games, modes));
  const rows = new Map();

  // ⚖️ Seeded from the roster when one is given (2026-08-13), so a student who
  // has not played is **on the page with nothing beside their name** rather
  // than absent from it. Ryan's reason, and it is the better one: a class list
  // where a single game is worth a visible point quietly rewards turning up,
  // and an empty row says so without anybody having to.
  //
  // The instructor is skipped — their games are exhibitions and count for
  // nothing, so a row of zeros against their name would be a lie.
  for (const r of roster || []) {
    if (r.instructor) continue;
    rows.set(r.id, blankRow(r.id, r.name));
  }

  for (const g of played) {
    const r = g.result;
    (g.seats || []).forEach((id, seat) => {
      if (!id) return; // an unrostered seat never records, but never trust it
      const row = rows.get(id) || blankRow(id, g.names?.[seat] || id);
      // The roster's spelling wins where there is one; otherwise the most
      // recent game names the player, so a correction shows through without
      // touching the id their history hangs off.
      if (!row.name) row.name = g.names?.[seat] || id;
      const rank = r.ranks?.[seat] ?? null;
      const shared = (r.ranks || []).filter((x) => x === 1).length > 1;
      row.played++;
      if (rank === 1 && !shared) row.won++;
      else if (rank === 1) row.drawn++;
      else row.lost++;
      row.points += r.points?.[seat] ?? 0;
      row.for += r.scores?.[seat] ?? 0;
      row.against += (r.scores || []).reduce((a, s, i) => a + (i === seat ? 0 : s), 0);
      row.rows += r.rows?.[seat] ?? 0;
      // ⚠️ Score-based bests skip timeouts: a timeout stops mid-game and the
      // running board score stands, which §11 excludes from score awards.
      if (r.ending !== 'timeout') row.best = Math.max(row.best, r.scores?.[seat] ?? 0);
      if (row.form.length < formLength) row.form.push(rank === 1 ? (shared ? 'D' : 'W') : 'L');
      rows.set(id, row);
    });
  }

  const table = [...rows.values()].map((row) => ({
    ...row,
    avg: row.played ? row.for / row.played : 0,
    diff: row.for - row.against,
  }));

  // ⚖️ The tiebreak is points, then wins, then total score — football's shape
  // (points, then something you did on the pitch) rather than head-to-head,
  // which in a six-week league is often a single game and reads as arbitrary
  // to the person it demotes.
  table.sort((a, b) => b.points - a.points || b.won - a.won || b.for - a.for || a.name.localeCompare(b.name));
  return rank(table);
}

function blankRow(id, name) {
  return { id, name, played: 0, won: 0, drawn: 0, lost: 0, points: 0, for: 0, against: 0, rows: 0, best: 0, form: [] };
}

// 1-based competition ranking, and the number that turns a position into a
// target: how many points to the rung above. "4 points off 5th" is a chase;
// "9th" on its own is a verdict (PAVILION.md, Public board vs private rank).
function rank(table) {
  let place = 0;
  const placed = table.map((row, i) => {
    if (i === 0 || row.points !== table[i - 1].points) place = i + 1;
    return { ...row, rank: place };
  });
  // Two passes on purpose: the rung above has to be a *ranked* row, or the
  // player told "4 points off" is never told off what.
  return placed.map((row, i) => {
    const above = placed
      .slice(0, i)
      .reverse()
      .find((r) => r.points > row.points);
    return { ...row, nextRank: above ? above.rank : null, gap: above ? above.points - row.points : 0 };
  });
}

// The public board. Ties at the cut are kept rather than sliced through — being
// told you are sixth by an array index is precisely the moment the rule exists
// to prevent.
export function topN(table, n = 5) {
  if (table.length <= n) return table;
  const cut = table[n - 1].points;
  return table.filter((row, i) => i < n || row.points === cut);
}

// The class register: everyone, same columns, **no position**. Sorting by name
// is the whole mechanism — the numbers are all visible and the ordering carries
// no verdict, so a full class fits on one screen without anybody being last.
export function byName(table) {
  return [...table].sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Head to head — what the pre-game splash is made of.
//
// The splash shows this and deliberately not league position: it is mutually
// visible and shown involuntarily, with an opponent reading the same screen.
// Repeated play against a known opponent is the course's own material, so the
// history stays and the standing moves to the private page.

export function headToHead(games, ids, { modes = RECORD_MODES } = {}) {
  const want = [...ids].sort().join('|');
  const met = byRecency(counted(games, modes)).filter((g) => [...(g.seats || [])].sort().join('|') === want);

  const wins = Object.fromEntries(ids.map((id) => [id, 0]));
  let drawn = 0;
  for (const g of met) {
    const leaders = (g.result.leaders || []).map((seat) => g.seats[seat]);
    if (leaders.length === 1) wins[leaders[0]]++;
    else drawn++;
  }

  return {
    played: met.length,
    wins,
    drawn,
    // Week 1 has none of this and that is a fine thing to show — "first
    // meeting" is a real answer, not an empty state to apologise for.
    first: met.length === 0,
    last: met[0]
      ? {
          at: met[0].endedAt,
          scores: met[0].result.scores,
          seats: met[0].seats,
          names: met[0].names,
          winner: met[0].result.winner >= 0 ? met[0].seats[met[0].result.winner] : null,
        }
      : null,
    games: met,
  };
}

// One player's line, for the private stats page and the post-game screen.
// Position is always included: withholding it from the person it is about is
// not kindness, it is leaving them unable to see themselves climbing.
export function playerCard(games, id, { modes = LEAGUE_MODES, formLength = 5, roster = null } = {}) {
  const table = standings(games, { modes, formLength, roster });
  const row = table.find((r) => r.id === id);
  if (!row) return null;
  return { ...row, of: table.length };
}

// What the post-game screen animates: where the table moved. Both arguments are
// tables from `standings` — before the game and after it.
export function movement(before, after, ids) {
  return ids.map((id) => {
    const was = before.find((r) => r.id === id);
    const now = after.find((r) => r.id === id);
    return {
      id,
      name: now?.name || was?.name || id,
      from: was?.rank ?? null,
      to: now?.rank ?? null,
      // Positive is a climb. A player's first game has no `from`, which the
      // screen should read as "on the board" rather than a rise of null.
      moved: was && now ? was.rank - now.rank : null,
      points: now?.points ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// The Record Book — the part that outlives the term.
//
// Every entry is keyed, not named: the page supplies Best in Show and the rest.
// Ties share the record, because two people hitting 94 both hit 94.

export function records(games, { modes = RECORD_MODES, minGames = 3 } = {}) {
  const played = byRecency(counted(games, modes));
  const perGame = [];
  const perPlayer = new Map();

  for (const g of played) {
    const r = g.result;
    const scored = r.ending !== 'timeout'; // §11 — timeouts are not score records
    (g.seats || []).forEach((id, seat) => {
      if (!id) return;
      const p = perPlayer.get(id) || { id, name: g.names?.[seat] || id, played: 0, for: 0, wins: 0, streak: 0, best: 0 };
      p.played++;
      p.for += r.scores?.[seat] ?? 0;
      if (r.winner === seat) p.wins++;
      if (scored) p.best = Math.max(p.best, r.scores[seat] ?? 0);
      perPlayer.set(id, p);
      if (!scored) return;
      const others = (r.scores || []).filter((_, i) => i !== seat);
      perGame.push({
        id,
        name: g.names?.[seat] || id,
        gameId: g.id,
        at: g.endedAt,
        term: g.term,
        season: g.season ?? null,
        score: r.scores[seat] ?? 0,
        margin: (r.scores[seat] ?? 0) - Math.max(...others, 0),
        rows: r.rows?.[seat] ?? 0,
        plies: r.plies ?? 0,
      });
    });
  }

  for (const p of perPlayer.values()) p.avg = p.played ? p.for / p.played : 0;

  return [
    best('bestGame', perGame, (e) => e.score),
    best('widestWin', perGame.filter((e) => e.margin > 0), (e) => e.margin),
    best('mostRows', perGame, (e) => e.rows),
    best('longestGame', perGame, (e) => e.plies),
    best('mostPlayed', [...perPlayer.values()], (p) => p.played),
    // A best average with no floor rewards playing once and stopping, which is
    // the opposite of what the league is for.
    best('bestAverage', [...perPlayer.values()].filter((p) => p.played >= minGames), (p) => p.avg),
    best('longestStreak', streaks(played), (s) => s.length),
  ].filter(Boolean);
}

function best(key, entries, value) {
  if (!entries.length) return null;
  const top = Math.max(...entries.map(value));
  if (!Number.isFinite(top) || top <= 0) return null;
  return { key, value: top, holders: entries.filter((e) => value(e) === top) };
}

// Longest run of wins, oldest game first. Streaks are a Record Book entry and
// never a table column: "longest losing run" is the wooden spoon wearing a hat.
function streaks(played) {
  const out = new Map();
  const running = new Map();
  for (const g of [...played].reverse()) {
    (g.seats || []).forEach((id, seat) => {
      if (!id) return;
      const won = g.result.winner === seat;
      const now = won ? (running.get(id) || 0) + 1 : 0;
      running.set(id, now);
      const held = out.get(id);
      if (!held || now > held.length) out.set(id, { id, name: g.names?.[seat] || id, length: now, at: g.endedAt });
    });
  }
  return [...out.values()].filter((s) => s.length > 1);
}

// Most improved, first half of a player's games to the second. It earns its
// place next to a public top five: the board shows the people at the top, and
// this is the thing the rest of the room can be winning at. Improvement is a
// slope, so it has no bottom — the player who improved least is simply not on
// it, which is the difference between a chase and a wooden spoon.
export function mostImproved(games, { modes = LEAGUE_MODES, minGames = 4 } = {}) {
  const played = counted(games, modes).filter((g) => g.result.ending !== 'timeout');
  const byPlayer = new Map();
  for (const g of [...played].sort((a, b) => (a.endedAt || 0) - (b.endedAt || 0))) {
    (g.seats || []).forEach((id, seat) => {
      if (!id) return;
      const list = byPlayer.get(id) || { id, name: g.names?.[seat] || id, scores: [] };
      list.name = g.names?.[seat] || list.name;
      list.scores.push(g.result.scores?.[seat] ?? 0);
      byPlayer.set(id, list);
    });
  }

  const out = [];
  for (const p of byPlayer.values()) {
    if (p.scores.length < minGames) continue;
    const half = Math.floor(p.scores.length / 2);
    const first = mean(p.scores.slice(0, half));
    const second = mean(p.scores.slice(p.scores.length - half));
    if (second <= first) continue;
    out.push({ id: p.id, name: p.name, from: first, to: second, delta: second - first, played: p.scores.length });
  }
  return out.sort((a, b) => b.delta - a.delta);
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// ---------------------------------------------------------------------------
// Honours — one line per season, which is what makes a records site feel like a
// sport rather than a dashboard. Winners only, by the same rule as everything
// else here.

export function honours(games) {
  const bySeason = new Map();
  for (const g of games || []) {
    const key = g.term;
    if (!bySeason.has(key)) bySeason.set(key, []);
    bySeason.get(key).push(g);
  }

  return [...bySeason.entries()]
    .map(([term, list]) => {
      const table = standings(list);
      const champion = table.length && table[0].played ? table[0] : null;
      // The Cup is a knockout, so its winner is whoever won the last cup game
      // played — the final. Retagging a game to `cup` in the admin page is what
      // creates it; there is no bracket state on the server.
      const final = byRecency(counted(list, ['cup']))[0];
      const cup = final && final.result.winner >= 0
        ? { id: final.seats[final.result.winner], name: final.names[final.result.winner] }
        : null;
      return {
        term,
        league: leagueOf(list[0]),
        season: list[0].season ?? null,
        champion: champion ? { id: champion.id, name: champion.name, points: champion.points } : null,
        cup,
        // One person taking both is the Double, and it is a good way to end a
        // course — so it is a fact this returns, not something a page guesses.
        double: !!(champion && cup && champion.id === cup.id),
        games: list.length,
      };
    })
    .sort((a, b) => String(b.season ?? '').localeCompare(String(a.season ?? '')));
}
