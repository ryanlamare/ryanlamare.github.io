#!/usr/bin/env node
/* The Module 5 tester: the phones' side of m5's game rooms, driven from a
   terminal, so one person at the deck can rehearse a whole room.

   Ryan opens the deck with ?room=trial and presses its keys; whoever runs
   this script plays the phones into the same rooms (m5-invest-trial,
   m5-bos-trial, m5-chicken-trial, m5-games-trial). A real phone joins as
   one more seat among the bots by opening the phone page with the same
   switch: m5/game/?room=trial, m5/tapas/?g=bos&room=trial,
   m5/games/?room=trial. Bots speak exactly the wire the phone pages speak.

   --room live plays into the REAL rooms (so a phone that scanned the QR
   sits among the bots). Reset those rooms in the Poll Desk afterwards.

     node trial/m5.js --room trial invest 20             twenty bots lock the round that is open (round 2 once the deck has opened it)
     node trial/m5.js --room trial invest 20 --rate 0.95 …with 95% investing (default 0.8 in round 1, 0.95 in round 2); --round 2 forces the round
     node trial/m5.js --room trial votes bos 20          twenty votes on Whose system? for the open round, sides alternating
     node trial/m5.js --room trial votes chicken 20 --a 0.3    …30% of each side picking the first option (give ground); default 0.5
     node trial/m5.js --room trial games 22              twenty-two windows onto the aircraft (invented situations)
     node trial/m5.js --room trial state                 what each room holds, as the deck reads it
     node trial/m5.js --room trial deck open             post the round-two marker yourself (solo test without the deck); --game bos|chicken for the vote rooms
     node trial/m5.js --room trial deck reveal 1         post the investment reveal marker, so phones play the outcome

   --gap ms sets the stagger between bot taps (default 350). --api overrides the Worker. */
const argv = process.argv.slice(2);
const opt = {}; const args = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { opt[argv[i].slice(2)] = argv[i + 1]; i++; } else args.push(argv[i]); }
const API = opt.api || 'https://gt-poll.rlamare.workers.dev';
if (!opt.room) { console.error('Say which room: --room trial (a rehearsal room), or --room live (the REAL rooms; reset them in the Poll Desk after).'); process.exit(2); }
const LIVE = opt.room === 'live';
const SUF = LIVE ? '' : '-' + opt.room.replace(/[^a-z0-9-]/g, '');
const ROOM = { invest: 'm5-invest' + SUF, bos: 'm5-bos' + SUF, chicken: 'm5-chicken' + SUF, games: 'm5-games' + SUF };
const GAP = +(opt.gap || 350);
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (LIVE) console.log('  !! playing into the REAL rooms. Reset them in the Poll Desk when you are done.');

/* one invented person per seat, the same every run, so a name means the same phone all session */
const NAMES = ['Priya K', 'Tom W', 'Elena R', 'Marcus B', 'Sam O', 'Aisha N', 'Ben T', 'Cara L', 'Dev P', 'Hana S', 'Ivan M', 'Jo F', 'Kemi A', 'Luis G', 'Mei C', 'Noor H', 'Owen D', 'Rosa V', 'Theo J', 'Uma R', 'Vik S', 'Wen L', 'Xan P', 'Yara M', 'Zed B', 'Abe C', 'Bea D', 'Cal E', 'Dot F', 'Eve G', 'Fay H', 'Gus I', 'Hal J', 'Ida K', 'Jem L', 'Kit M', 'Lou N', 'Max O', 'Nan P', 'Oz Q'];
const voterOf = (lane, i) => 'trial-m5-' + lane + '-' + String(i).padStart(3, '0');

async function say(room, line, voter) {
  const r = await fetch(API + '/p/' + room + '/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: line, v: voter }) });
  if (!r.ok) throw new Error(room + ' said ' + r.status + ' to ' + line + (r.status === 429 ? ' (that bot has sent its 15 lines; reset the room)' : ''));
  console.log('  → ' + room + '  ' + line);
}
const answers = room => fetch(API + '/p/' + room + '/answers').then(r => r.json()).then(d => d.answers || []);
const entries = room => fetch(API + '/p/' + room + '/entries').then(r => r.json()).then(d => d.entries || []);
const count = n => { const v = +n; if (!Number.isInteger(v) || v < 1 || v > NAMES.length) { console.error('How many bots? 1 to ' + NAMES.length + '.'); process.exit(2); } return v; };
/* a fixed share, spread evenly through the seats rather than drawn at random, so a run is repeatable */
const pick = (i, n, share) => Math.floor((i + 1) * share + 1e-9) > Math.floor(i * share + 1e-9);

const openRound = lines => lines.some(t => String(t).trim() === '::open|2') ? 2 : 1;

async function invest(n) {
  const lines = await answers(ROOM.invest);
  const round = opt.round ? +opt.round : openRound(lines);
  const rate = opt.rate !== undefined ? +opt.rate : (round === 1 ? 0.8 : 0.95);
  console.log('Round ' + round + ': ' + n + ' bots, ' + Math.round(rate * 100) + '% investing.');
  let inN = 0;
  for (let i = 0; i < n; i++) { const c = pick(i, n, rate) ? 'i' : 'd'; if (c === 'i') inN++; await say(ROOM.invest, NAMES[i] + '|' + round + '|' + c, voterOf('inv', i)); await sleep(GAP); }
  console.log('Sent: ' + inN + ' of ' + n + ' invested (' + Math.round(100 * inN / n) + '%). The venture pays at 90% of everyone in the room, a real phone included.');
}

async function votes(game, n) {
  if (!ROOM[game] || game === 'invest' || game === 'games') { console.error('Which vote? bos (Whose system?) or chicken (The hub lease).'); process.exit(2); }
  const round = opt.round ? +opt.round : openRound(await answers(ROOM[game]));
  const a = opt.a !== undefined ? +opt.a : 0.5;
  console.log((game === 'bos' ? 'Whose system?' : 'The hub lease') + ', round ' + round + ': ' + n + ' bots, ' + Math.round(a * 100) + '% of each side on the first option.');
  const half = [0, 0];
  for (let i = 0; i < n; i++) {
    const s = i % 2; const side = s ? 't' : 'r'; const k = half[s]++;
    const o = pick(k, Math.ceil(n / 2), a) ? 'a' : 'b';
    const v = voterOf(game === 'bos' ? 'bos' : 'chk', i);
    await say(ROOM[game], 'v|' + v + '|' + side + '|' + round + '|' + o, v); await sleep(GAP);
  }
}

const SITS = [
  ['Me and the hiring committee', 'Recruiting a candidate', 'The strongest record, or the best cultural fit', 's', 'Where the candidate did their PhD'],
  ['Us and the supplier', 'Tooling up for the new engine line', 'Invest now, or wait for the signed contract', 's', 'The letter of intent'],
  ['Our engineers and theirs', 'One CAD standard for the joint programme', 'Our standard, or theirs', 'b', 'Whoever held the design authority'],
  ['Us and the other department', 'Moving onto the new reporting system', 'This quarter, or next year', 's', 'The year end'],
  ['Us and the customer', 'Where the quarterly review is held', 'Our site, or theirs', 'b', 'The last contract said their site'],
  ['Our ops team and the other airline’s', 'One maintenance schedule for the merged fleet', 'Our schedule, or theirs', 'b', 'The bigger fleet'],
  ['Us and the airport', 'The hub lease renewal', 'Cut the fees, or move the hub', 'c', 'The lease expiry date'],
  ['Two project leads', 'Which project gets the test rig first', 'Mine first, or theirs first', 'c', 'Whoever had booked it'],
  ['Me and my manager', 'The date for the design review', 'Before the holidays, or after', 's', 'The quarter close'],
  ['Us and the launch customer', 'The spec for the first production unit', 'Their wish list, or the certified baseline', 'b', 'What was already certified'],
  ['Our finance team and theirs', 'Which currency the long-term deal is priced in', 'Dollars, or pounds', 'b', 'Whatever the last deal used'],
  ['Me and a colleague', 'Who presents to the board', 'Me, or him', 'c', 'Seniority'],
];
async function games(n) {
  for (let i = 0; i < n; i++) {
    const e = SITS[i % SITS.length], v = voterOf('gam', i);
    await say(ROOM.games, 'a‖' + NAMES[i] + '‖' + e[0] + '‖' + e[1], v);
    await say(ROOM.games, 'b‖' + e[2] + '‖' + e[3] + '‖' + e[4], v);
    await sleep(GAP);
  }
}

async function deck(what, r) {
  const game = opt.game || 'invest';
  const room = ROOM[game]; if (!room || game === 'games') { console.error('--game invest, bos or chicken.'); process.exit(2); }
  if (what === 'open') await say(room, '::open|2', 'trial-m5-deck-000');
  else if (what === 'reveal' && game === 'invest' && /^[12]$/.test(String(r))) await say(room, '::reveal|' + r, 'trial-m5-deck-000');
  else { console.error('deck open, or deck reveal 1 / deck reveal 2 (the investment room only).'); process.exit(2); }
}

async function state() {
  const inv = await answers(ROOM.invest);
  console.log(ROOM.invest + ': ' + inv.length + ' lines, round ' + openRound(inv) + ' open, revealed: ' + ([1, 2].filter(r => inv.includes('::reveal|' + r)).join(', ') || 'none'));
  [1, 2].forEach(r => { const latest = new Map(); inv.forEach(t => { const m = String(t).match(/^(.{1,40}?)\s*\|\s*([12])\s*\|\s*([id])$/i); if (m && +m[2] === r) latest.set(m[1].trim().toLowerCase(), m[3].toLowerCase()); });
    if (latest.size) { const inN = [...latest.values()].filter(c => c === 'i').length; console.log('  round ' + r + ': ' + inN + ' of ' + latest.size + ' invested (' + Math.round(100 * inN / latest.size) + '%) → ' + (inN / latest.size >= 0.9 ? 'pays $50' : 'investors lose $100')); } });
  for (const g of ['bos', 'chicken']) {
    const L = await answers(ROOM[g]); console.log(ROOM[g] + ': ' + L.length + ' lines, round ' + openRound(L) + ' open');
    [1, 2].forEach(r => { const v = {}; L.forEach(t => { const p = String(t).split('|').map(s => s.trim()); if (p[0] === 'v' && p.length === 5 && +p[3] === r) v[p[1]] = p[2] + p[4]; });
      const c = { ra: 0, rb: 0, ta: 0, tb: 0 }; Object.values(v).forEach(x => { if (x in c) c[x]++; });
      if (Object.keys(v).length) console.log('  round ' + r + ': side r  a ' + c.ra + ' / b ' + c.rb + '   side t  a ' + c.ta + ' / b ' + c.tb); });
  }
  const G = await entries(ROOM.games); const by = new Map();
  G.forEach(e => { const p = String(e.t).split('‖'); if (!by.has(e.v)) by.set(e.v, {}); if (p[0] === 'a') by.get(e.v).sit = p[3]; if (p[0] === 'b') by.get(e.v).g = p[2]; });
  const done = [...by.values()].filter(x => x.sit && x.g);
  console.log(ROOM.games + ': ' + done.length + ' windows (stag hunt ' + done.filter(x => x.g === 's').length + ', battle ' + done.filter(x => x.g === 'b').length + ', chicken ' + done.filter(x => x.g === 'c').length + ')');
}

const [cmd, a1, a2] = args;
const run = { invest: () => invest(count(a1)), votes: () => votes(a1, count(a2)), games: () => games(count(a1)), deck: () => deck(a1, a2), state };
if (!run[cmd]) { console.error('Commands: invest N · votes bos|chicken N · games N · state · deck open|reveal 1|2. See the top of this file.'); process.exit(2); }
run[cmd]().catch(e => { console.error(String(e.message || e)); process.exit(1); });
