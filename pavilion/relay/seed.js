// Pavilion — fill an archive with games, so the records site has something to
// show (build step 6).
//
//   node pavilion/relay/seed.js                 local: a seeded dev relay on :8787
//   node pavilion/relay/seed.js --live          play real games into the deployed relay
//   node pavilion/relay/seed.js --live --games 8 --relay wss://…
//
// A dev tool, not part of the game. It exists because every screen in step 6 is
// a query over stored games, and an empty archive shows you nothing — you
// cannot tell a good-looking table from a broken one with no rows in it.
//
// The two modes are genuinely different things:
//
//   local  writes straight into a MemoryStore through `Archive.record`, then
//          serves it. Nothing leaves the machine and nothing persists past
//          Ctrl-C. Use this to look at the site.
//
//   live   opens rooms on a real relay and plays them out as two rostered
//          clients, exactly as two students would. There is no shortcut here
//          and there deliberately isn't one: `/record` is not reachable from
//          outside (archive.js, PUBLIC_ROUTES), so the only way to put a game
//          in the archive is to play it. That is the property that makes an
//          archived result worth anything.
//
// ⚠️ Live mode refuses to run against a term that doesn't look like a trial —
// see GUARD below. A seeded league table is a fiction, and a fiction in a real
// cohort's record is the one thing this whole archive exists not to be.

import { Relay } from '../net.js';
import { newGame, legalMoves, apply } from '../engine.js';
import { greedyMove } from '../bot.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

// A term has to say it is a trial. Anything else needs --force and a reason to
// be typing it.
const GUARD = /(demo|test|trial|sandbox)/i;

const CLASS = [
  'Sam Okafor', 'Alex Reed', 'Priya Raman', 'Jordan Vale',
  'Riley Chen', 'Mei Sato', 'Tom Whelan', 'Ada Nkemelu',
];

// Two greedy players would draw the same game every time from the same seed, so
// each seat gets a temperament: how often it takes the greedy move rather than
// the next-best one. It makes a table with a shape — someone at the top,
// someone improving — instead of a row of identical records.
// ⚠️ `ply` is passed in rather than read off the state, and the fields used
// here are `round` and `seatToMove` — the ones the engine actually has. An
// earlier version reached for `state.turn`, got `undefined`, and every roll
// came out NaN: both seats then played *never* the greedy move, no row on the
// wall ever completed, and the games ran to the ply guard and voided. A seeder
// whose games never finish looks exactly like a records site that is broken.
function chooseMove(state, temper, ply) {
  const options = legalMoves(state);
  if (!options.length) return null;
  const greedy = greedyMove(state);
  if (!greedy) return options[0];
  // Deterministic "randomness": the position's own numbers, so a seeded run is
  // reproducible and nobody has to store a PRNG.
  const roll = (ply * 37 + state.round * 13 + state.seatToMove * 7) % 100;
  if (roll < temper) return greedy;
  const i = options.findIndex((m) => JSON.stringify(m) === JSON.stringify(greedy));
  return options[(i + 1) % options.length];
}

const TEMPERS = [92, 88, 84, 80, 76, 72, 68, 64];

// ---------------------------------------------------------------------------
// Local: play in-process and write through the real Archive.

async function local() {
  const { archive, start } = await import('./dev-relay.js');
  const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let at = Date.UTC(2027, 5, 1, 14);

  // `absent` are on the class list and never play — which is the case the
  // register exists to show, so the sample data has to contain one.
  async function season(term, weeks, roster, absent = []) {
    await archive.setConfig({ term });
    await archive.setRoster([...roster, ...absent, { name: 'J. Ryan Lamare', instructor: true }]);
    const people = roster.map((n) => ({ id: slug(n), name: n }));
    let played = 0;
    for (let w = 0; w < weeks; w++) {
      for (let i = 0; i < people.length; i += 2) {
        // Rotate the opponent each week, except in a two-person league (the
        // kitchen table), where the rotation would pair somebody with themselves
        // every other week and halve the fixtures.
        const j = people.length === 2 ? 1 - i : (i + 1 + w) % people.length;
        const pair = [people[i], people[j]];
        if (pair[0].id === pair[1].id) continue;
        at += 20 * 60 * 1000;
        const room = playOut(`${term}-w${w}-${i}`, pair, at, [
          TEMPERS[i % TEMPERS.length],
          TEMPERS[(i + 1 + w) % TEMPERS.length],
        ]);
        if (room && (await archive.record(room, at + 18 * 60 * 1000)).recorded) played++;
      }
      at += 6 * 24 * 3600 * 1000; // a week between sessions
    }
    return played;
  }

  const a = await season('ler565-2027-summer', 5, CLASS.slice(0, 6), ['Nadia Haddad']);
  // One cup final, retagged the way the instructor would in the admin page.
  const first = await archive.games('ler565-2027-summer');
  await archive.setMode(first[0].id, 'cup');
  const b = await season('ler565-2028-summer', 3, CLASS.slice(2));
  const c = await season('kitchen', 4, ['J. Ryan Lamare'].concat(CLASS[0]));

  await start(8787);
  console.log(`\nSeeded: ler565 2027 (${a} games, one retagged as the Cup), 2028 (${b}), kitchen (${c}).`);
  console.log('Run ./serve.sh in another terminal, then open:');
  console.log('  http://localhost:8000/pavilion/records/');
  console.log('  http://localhost:8000/pavilion/records/ler565/');
  console.log('  http://localhost:8000/pavilion/admin/   (secret: dev)');
  console.log('\nNothing here is stored — Ctrl-C and it is gone.');
}

// A full game, played out by the engine, in the shape `Archive.record` wants.
function playOut(seed, pair, startedAt, tempers) {
  let s = newGame(seed, pair.length);
  const moves = [];
  while (!s.over && moves.length < 800) {
    const move = chooseMove(s, tempers[s.seatToMove], moves.length);
    if (!move) break;
    const stamped = { ...move, t: moves.length * 950 };
    moves.push({ seat: s.seatToMove, move: stamped, at: startedAt + moves.length * 950 });
    s = apply(s, stamped);
  }
  // A game that didn't finish is not a game. Returning it anyway would archive
  // a void, which is worse than seeding nothing — it puts a fake abandonment in
  // a table meant to show what the real thing looks like.
  if (!s.over) return null;
  return {
    code: 'FERRIS-NORWAY',
    seed,
    players: pair.length,
    clockMs: 300000,
    mode: 'league',
    splashHistory: true,
    startedAt,
    seats: pair.map((p, i) => ({ seat: i, name: p.name, pid: p.id, device: i ? 'phone' : 'laptop' })),
    moves,
    ended: { ending: 'natural' },
  };
}

// ---------------------------------------------------------------------------
// Live: two clients, a real room, a real game. Nobody reports a result.

async function live() {
  const { PRODUCTION_RELAY, apiBase } = await import('../net.js');
  const ws = value('relay', PRODUCTION_RELAY);
  const api = apiBase(ws);
  const wanted = Number(value('games', 6));

  const session = await (await fetch(`${api}/session`, { cache: 'no-store' })).json();
  if (!session.term) fail('No term is set on that relay. Set one in the admin page first.');
  if (!session.roster?.length) fail('That term has no roster. Paste a class list in the admin page first.');
  if (!GUARD.test(session.term) && !flag('force')) {
    fail(
      `The term is "${session.term}", which does not look like a trial.\n` +
        `Seeding invents games, and invented games in a real cohort's record are exactly what\n` +
        `this archive exists not to hold. Rename the term (e.g. "ler565-2026-demo"), or pass\n` +
        `--force if you genuinely mean it.`
    );
  }
  if (session.roster.length < 2) fail('Two players is the minimum.');

  console.log(`Playing ${wanted} game(s) into "${session.term}" on ${ws}`);
  const people = session.roster.filter((r) => !r.instructor);
  let done = 0;
  for (let g = 0; g < wanted; g++) {
    const pair = [people[(g * 2) % people.length], people[(g * 2 + 1 + Math.floor(g / people.length)) % people.length]];
    if (pair[0].id === pair[1].id) continue;
    const receipt = await playOnline(ws, pair, [TEMPERS[g % TEMPERS.length], TEMPERS[(g + 3) % TEMPERS.length]]);
    done++;
    console.log(
      `  ${pair[0].name} v ${pair[1].name} → ${receipt.result.scores.join('–')}` +
        `  ${receipt.recorded ? `recorded as ${receipt.mode}` : `NOT recorded: ${receipt.why}`}`
    );
  }
  console.log(`\n${done} game(s) played. They are real games: seed + move list, replayed by the server.`);
  console.log('Delete them any time from the admin page — "Delete a term" takes the lot.');
}

function playOnline(url, pair, tempers) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out playing a game')), 60000);
    const players = pair.map((p, i) => ({
      relay: new Relay(url),
      pid: p.id,
      name: p.name,
      seat: null,
      state: null,
      applied: 0,
      temper: tempers[i],
    }));

    const nudge = () => {
      const mover = players.find((p) => p.state && p.state.seatToMove === p.seat);
      if (!mover || mover.state.over) return;
      const move = chooseMove(mover.state, mover.temper, mover.applied);
      mover.relay.move(mover.applied, { ...move, t: mover.applied * 950 });
    };

    for (const p of players) {
      p.relay.on('started', (m) => {
        p.state = newGame(m.seed, m.players);
        p.seat = p.relay.seat;
        if (p === players[0]) setTimeout(nudge, 40);
      });
      p.relay.on('move', ({ ply, move }) => {
        if (!p.state || ply < p.applied) return;
        p.state = apply(p.state, move);
        p.applied = ply + 1;
        if (p === players[0]) {
          if (p.state.over) {
            // The client says the game ended; the server replays it and decides
            // what actually happened. `over` is advisory (PROTOCOL.md).
            p.relay.over(p.state.result);
          } else {
            setTimeout(nudge, 12);
          }
        }
      });
      p.relay.on('recorded', (receipt) => {
        if (p !== players[0]) return;
        clearTimeout(timer);
        players.forEach((q) => q.relay.close?.());
        resolve({ ...receipt, result: receipt.result || { scores: p.state.result.scores } });
      });
    }

    players[0].relay.on('welcome', (w) => {
      players[1].relay.connect({ code: w.code, hello: { name: players[1].name, pid: players[1].pid, device: 'phone' } });
    });
    players[1].relay.on('welcome', () => setTimeout(() => players[0].relay.start(), 60));

    players[0].relay.connect({
      code: null,
      hello: { name: players[0].name, pid: players[0].pid, device: 'laptop', players: 2, clockMs: 300000 },
    });
  });
}

function fail(msg) {
  console.error(`\n${msg}\n`);
  process.exit(1);
}

if (flag('live')) await live();
else await local();
