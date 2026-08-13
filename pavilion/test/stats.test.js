// Pavilion — the tables, records and honours, headless (build step 6).
//
//   node pavilion/test/stats.test.js
//
// `relay/stats.js` is pure: summaries in, plain objects out. So this suite needs
// no server, no browser and no move lists — it builds summaries directly and
// checks the arithmetic every screen in step 6 will show.
//
// The results themselves are *not* invented here: ranks and league points come
// from `result.js`, the same functions the server runs when a game records. A
// test that hand-wrote them would pass while the real thing was wrong.

import { rankSeats, leaguePointsFor, splitTerm } from '../relay/result.js';
import {
  standings,
  topN,
  byName,
  headToHead,
  playerCard,
  movement,
  records,
  honours,
  seasonsOf,
  mostImproved,
  counted,
} from '../relay/stats.js';

let passed = 0;
let failed = 0;

function ok(cond, msg) {
  if (cond) passed++;
  else {
    failed++;
    console.error('  FAIL: ' + msg);
  }
}

function eq(got, want, msg) {
  ok(got === want, `${msg} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`);
}

function same(got, want, msg) {
  eq(JSON.stringify(got), JSON.stringify(want), msg);
}

function close(got, want, msg) {
  ok(Math.abs(got - want) < 1e-9, `${msg} (got ${got}, want ${want})`);
}

function section(title) {
  console.log('— ' + title);
}

// A summary, built the way the archive builds one. `players` is a list of
// [id, score] pairs (or [id, score, rows]); everything derived comes from the
// real ranking code.
let clock = 1_700_000_000_000;
function game(players, { term = 'ler565-2027-summer', mode = 'league', ending = 'natural', flagged = null, at = null, plies = 40 } = {}) {
  const seats = players.map((p) => p[0]);
  const scores = players.map((p) => p[1]);
  const rows = players.map((p) => p[2] ?? 0);
  const ranks = rankSeats(scores, rows, flagged);
  const leaders = ranks.map((r, i) => (r === 1 ? i : -1)).filter((i) => i >= 0);
  const { league, season } = splitTerm(term);
  clock += 60_000;
  return {
    id: `g${clock}`,
    term,
    league,
    season,
    mode,
    seats,
    names: seats.map((id) => id[0].toUpperCase() + id.slice(1)),
    endedAt: at ?? clock,
    plies,
    result: {
      ending,
      flagged,
      scores,
      rows,
      ranks,
      leaders,
      winner: leaders.length === 1 ? leaders[0] : -1,
      points: ending === 'void' ? null : leaguePointsFor(ranks),
      plies,
    },
  };
}

function voidGame(players, opts = {}) {
  const g = game(players, { ...opts, ending: 'void' });
  g.result.scores = null;
  g.result.reason = 'abandoned';
  return g;
}

// ---------------------------------------------------------------------------
section('What counts, and what is merely archived');

{
  const list = [
    game([['sam', 40], ['alex', 30]]),
    game([['sam', 40], ['ryan', 30]], { mode: 'exhibition' }),
    game([['sam', 40], ['bot', 10]], { mode: 'practice' }),
    game([['sam', 40], ['alex', 30]], { mode: 'cup' }),
    voidGame([['sam', 0], ['alex', 0]]),
  ];
  eq(counted(list).length, 1, 'the league table sees league games only');
  eq(counted(list, ['league', 'cup']).length, 2, 'the Record Book takes the cup as well');
  eq(counted(list, ['league', 'cup', 'exhibition']).length, 3, 'and an exhibition only when asked for explicitly');
  ok(!counted(list, ['league']).some((g) => g.result.ending === 'void'), 'a void game never counts — it did not happen');
}

// ---------------------------------------------------------------------------
section('The league table (§8 points, applied)');

{
  // sam beats alex, alex beats priya, sam and priya draw.
  const list = [
    game([['sam', 50], ['alex', 40]]),
    game([['alex', 45], ['priya', 30]]),
    game([['sam', 35], ['priya', 35]]),
  ];
  const table = standings(list);
  same(table.map((r) => r.id), ['sam', 'alex', 'priya'], 'sorted by points, then wins, then score');

  const sam = table[0];
  eq(sam.played, 2, 'played counts every counting game');
  eq(sam.won, 1, 'a lone first place is a win');
  eq(sam.drawn, 1, 'a shared first place is a draw');
  eq(sam.points, 5, 'win 3 plus draw 2 — inclusive totals, not bonuses');
  eq(sam.for, 85, 'points for is the sum of the scores');
  eq(sam.best, 50, 'and the best single game is kept for the splash');
  same(sam.form, ['D', 'W'], 'form is newest first');

  const priya = table[2];
  eq(priya.points, 3, 'a loss still scores the point for playing — nobody is mathematically out');
  eq(priya.lost, 1, 'and the loss is counted as one');

  eq(table[0].rank, 1, 'the table is ranked');
  eq(table[2].gap, 1, 'with the distance to the rung above — a target, not a verdict');
  eq(table[2].nextRank, 2, 'and which rung that is, so "1 point off 2nd" can be said at all');
}

{
  // Level on points share a rank, and neither is told they are below the other.
  const table = standings([
    game([['sam', 50], ['alex', 40]]),
    game([['priya', 50], ['jo', 40]]),
  ]);
  eq(table[0].points, 3, 'two winners, both on 3');
  eq(table[1].rank, 1, 'level on points is a shared rank');
  eq(table[0].gap, 0, 'the leader has nothing to chase');
  eq(table[2].rank, 3, 'and the rank after a two-way tie is third, not second');
}

{
  // A timeout is a real result and scores like one — but the running board
  // score it stops on is not a personal best (§11).
  const table = standings([game([['sam', 88], ['alex', 20]], { ending: 'timeout', flagged: 1 })]);
  eq(table[0].id, 'sam', 'the player who did not flag wins');
  eq(table[0].points, 3, 'a timeout is a win, like chess');
  eq(table[0].best, 0, 'but its score is not a best — the game stopped mid-flow');
}

{
  // Three players, same table rather than a weighted one.
  const table = standings([game([['sam', 60], ['alex', 50], ['priya', 40]])]);
  same(table.map((r) => r.points), [3, 1, 1], 'a three-player game is 3/1/1 on the same table');
}

// ---------------------------------------------------------------------------
section('The public board is a top N, never a full ranking');

{
  const list = [];
  for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) list.push(game([[name, 50], ['tail', 10]]));
  const table = standings(list);
  eq(table.length, 8, 'the table itself holds everyone — the private page needs it');
  // The player who lost all seven leads on 7 points, which is the participation
  // point doing exactly its job: turning up beats a perfect record of one game.
  eq(table[0].id, 'tail', 'somebody 0–7 is not mathematically out — that is the whole argument for it');
  eq(topN(table, 5).length, 8, 'and a public board keeps everyone level with the cut rather than slicing a tie');

  const spread = standings([
    game([['sam', 50], ['alex', 40]]),
    game([['sam', 50], ['priya', 40]]),
    game([['alex', 50], ['jo', 40]]),
  ]);
  eq(topN(spread, 2).length, 2, 'a clean cut stays a clean cut');
  ok(!topN(spread, 2).some((r) => r.id === 'jo'), 'and the bottom of the table is simply not published');
}

// ---------------------------------------------------------------------------
section('The class register — everyone, including whoever has not played');

{
  const roster = [
    { id: 'sam', name: 'Sam', instructor: false },
    { id: 'alex', name: 'Alex', instructor: false },
    { id: 'quiet', name: 'Quiet', instructor: false },
    { id: 'ryan', name: 'Ryan', instructor: true },
  ];
  const table = standings([game([['sam', 50], ['alex', 40]])], { roster });

  eq(table.length, 3, 'the table is the class, not just the people who turned up');
  const quiet = table.find((r) => r.id === 'quiet');
  eq(quiet.played, 0, 'somebody who has not played is on the page with nothing beside their name');
  eq(quiet.points, 0, 'and no points — which is what makes one game visibly worth something');
  ok(!table.some((r) => r.id === 'ryan'), 'the instructor is not on it: their games are exhibitions');

  same(byName(table).map((r) => r.name), ['Alex', 'Quiet', 'Sam'], 'the register is alphabetical…');
  same(Object.keys(byName(table)[0]).sort(), Object.keys(table[0]).sort(),
    '…carrying every column the board carries, so the same row renderer draws both');
  eq(byName(table)[1].name, 'Quiet', 'so the player with no games sits between two others, not at a bottom');
  eq(byName(table).map((r) => r.name).join() === table.map((r) => r.name).join(), false,
    'and the register is genuinely a different order from the ranking');

  // The board is still the board: ranked, short, and only people who played.
  const board = topN(table.filter((r) => r.played), 5);
  eq(board.length, 2, 'the board holds the players, not the register');
  eq(board[0].rank, 1, 'and still numbers them');

  // A student who has not played still gets their own line if they look.
  const card = playerCard([game([['sam', 50], ['alex', 40]])], 'quiet', { roster });
  eq(card.played, 0, 'their private card exists before their first game');
  eq(card.gap > 0, true, 'and tells them what a single game would be worth');

  eq(standings([game([['sam', 50], ['alex', 40]])]).length, 2,
    'with no roster the table is only the people who played — which is what all-time wants');
}

// ---------------------------------------------------------------------------
section('Head to head — what the splash is made of');

{
  const list = [
    game([['sam', 50], ['alex', 40]]),
    game([['alex', 60], ['sam', 30]]),
    game([['sam', 45], ['alex', 45]]),
    game([['sam', 70], ['priya', 20]]),
  ];
  const h2h = headToHead(list, ['sam', 'alex']);
  eq(h2h.played, 3, 'only the meetings between those two');
  eq(h2h.wins.sam, 1, 'one each');
  eq(h2h.wins.alex, 1, 'and the other way');
  eq(h2h.drawn, 1, 'with the draw counted separately');
  eq(h2h.last.winner, null, 'the last meeting was drawn, so it has no winner');
  same(h2h.last.scores, [45, 45], 'and the splash can show its score');

  const flipped = headToHead(list, ['alex', 'sam']);
  eq(flipped.played, 3, 'the pair is a set — seat order does not change the history');

  const fresh = headToHead(list, ['sam', 'jo']);
  eq(fresh.played, 0, 'week 1 has no history');
  eq(fresh.first, true, 'and "first meeting" is a real thing to show, not an empty state');
  eq(fresh.last, null, 'with nothing to render underneath it');
}

// ---------------------------------------------------------------------------
section('A player’s own line, and where the table moved');

{
  const before = standings([game([['sam', 50], ['alex', 40]]), game([['priya', 50], ['jo', 40]])]);
  const card = playerCard([game([['sam', 50], ['alex', 40]])], 'sam');
  eq(card.rank, 1, 'a player is always told their own position');
  eq(card.of, 2, 'out of how many');
  eq(playerCard([], 'nobody'), null, 'somebody who has not played yet has no card');

  const after = standings([
    game([['sam', 50], ['alex', 40]]),
    game([['priya', 50], ['jo', 40]]),
    game([['alex', 60], ['jo', 20]]),
  ]);
  const moved = movement(before, after, ['alex']);
  eq(moved[0].moved > 0, true, 'a climb is positive, which is what the post-game screen animates');

  const debut = movement(standings([]), after, ['sam']);
  eq(debut[0].moved, null, 'a first game is an arrival on the board, not a rise from nowhere');
}

// ---------------------------------------------------------------------------
section('The Record Book');

{
  const list = [
    game([['sam', 94, 3], ['alex', 40]], { plies: 60 }),
    game([['sam', 30], ['alex', 88]], { mode: 'cup' }),
    game([['sam', 50], ['priya', 20]]),
    game([['sam', 99], ['priya', 10]], { ending: 'timeout', flagged: 1 }),
  ];
  const book = Object.fromEntries(records(list).map((r) => [r.key, r]));

  eq(book.bestGame.value, 94, 'the best game is the highest score anyone has played');
  eq(book.bestGame.holders[0].id, 'sam', 'held by the player who scored it');
  ok(!records(list).some((r) => r.key === 'bestGame' && r.value === 99),
    'and a timeout’s running score is not it (§11)');
  eq(book.widestWin.value, 58, 'the widest win is a margin, not a score');
  eq(book.widestWin.holders[0].id, 'alex', 'and the cup counts towards it — a final is not a friendly');
  eq(book.mostRows.value, 3, 'completed rows are their own record');
  eq(book.longestGame.value, 60, 'and so is the longest game');
  eq(book.mostPlayed.value, 4, 'most games played is an achievement anyone can chase');

  const shared = records([
    game([['sam', 70], ['alex', 40]]),
    game([['priya', 70], ['jo', 40]]),
  ]);
  const bestShared = shared.find((r) => r.key === 'bestGame');
  eq(bestShared.holders.length, 2, 'two people hitting the same number both hold the record');
}

{
  // The average floor, and streaks.
  const list = [
    game([['sam', 90], ['alex', 10]]),
    game([['sam', 90], ['alex', 10]]),
    game([['sam', 90], ['alex', 10]]),
    game([['flash', 95], ['alex', 10]]),
  ];
  const book = Object.fromEntries(records(list).map((r) => [r.key, r]));
  eq(book.bestAverage.holders[0].id, 'sam', 'a best average needs a few games behind it…');
  ok(!book.bestAverage.holders.some((h) => h.id === 'flash'), '…so one big game and a walk-off does not take it');
  eq(book.longestStreak.value, 3, 'a run of wins is a record');
  eq(book.longestStreak.holders[0].id, 'sam', 'held by the player who ran it');
  eq(records([game([['sam', 50], ['alex', 40]])]).some((r) => r.key === 'longestStreak'), false,
    'one win is not a run — two in a row is the shortest thing worth saying');
  ok(!records(list).some((r) => /los|worst|bottom/i.test(r.key)), 'there is no record for losing — halls and highs, never lows');
}

// ---------------------------------------------------------------------------
section('Most improved — what the rest of the room is chasing');

{
  const list = [
    game([['climber', 20], ['steady', 50]]),
    game([['climber', 25], ['steady', 50]]),
    game([['climber', 60], ['steady', 50]]),
    game([['climber', 70], ['steady', 50]]),
  ];
  const up = mostImproved(list);
  eq(up[0].id, 'climber', 'a player whose second half beats their first is improving');
  close(up[0].delta, 42.5, 'by the difference between the two halves');
  ok(!up.some((p) => p.id === 'steady'), 'flat is not improvement, so nobody flat is listed');
  ok(!up.some((p) => p.delta < 0), '⚠️ and there is no bottom to this list at all — that is the point of it');
  eq(mostImproved([game([['a', 10], ['b', 20]])]).length, 0, 'two games is not a trend');
}

// ---------------------------------------------------------------------------
section('Honours, seasons, and a league with no seasons at all');

{
  const list = [
    game([['sam', 50], ['alex', 40]], { term: 'ler565-2027-summer' }),
    game([['sam', 50], ['priya', 40]], { term: 'ler565-2027-summer' }),
    game([['sam', 60], ['alex', 30]], { term: 'ler565-2027-summer', mode: 'cup' }),
    game([['alex', 50], ['sam', 40]], { term: 'ler565-2028-summer' }),
  ];
  const rolls = honours(list);
  eq(rolls.length, 2, 'one line per season');
  eq(rolls[0].season, '2028-summer', 'newest first');
  eq(rolls[1].champion.id, 'sam', 'the champion is the top of that season’s table');
  eq(rolls[1].cup.id, 'sam', 'the cup goes to the winner of the last cup game — the final');
  eq(rolls[1].double, true, 'and taking both is the Double, stated as a fact rather than guessed at');
  eq(rolls[0].cup, null, 'a season with no knockout yet has no cup winner');
  eq(rolls[0].double, false, 'and therefore no Double');

  same(seasonsOf(list).map((s) => s.season), ['2028-summer', '2027-summer'], 'the season picker lists newest first');
  eq(seasonsOf(list)[1].games, 3, 'with how many games are in each');
}

{
  // A kitchen-table league is one continuous record. Nothing here may assume a
  // year is attached (PAVILION.md, Seasons are optional).
  const list = [game([['ryan', 50], ['sam', 40]], { term: 'kitchen' })];
  same(seasonsOf(list).map((s) => s.season), [null], 'a seasonless league has one null season, not a missing one');
  eq(honours(list)[0].season, null, 'and its honours line carries that through');
  eq(honours(list)[0].champion.id, 'ryan', 'while still knowing who is winning');
  eq(standings(list)[0].id, 'ryan', 'the table works exactly the same way');
}

// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed (stats, build step 6)`);
process.exit(failed ? 1 : 0);
