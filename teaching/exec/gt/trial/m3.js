#!/usr/bin/env node
/* The Module 3 tester: the phones' side of m3's closing exercise (solo since
   18 Sep 2026), driven from a terminal, so one person at the deck can watch
   the airfield fill: one aircraft per phone, lined up beside the runway.

   Ryan opens the deck with ?room=trial; whoever runs this script plays the
   phones into the same room (m3-engines-trial). A real phone joins as one
   more engine by opening m3/engines/?room=trial. Bots speak exactly the
   wire the phone page speaks.

   --room live plays into the REAL room (reset it in the Poll Desk after).

     node trial/m3.js --room trial engines 20          twenty engines (invented situations)
     node trial/m3.js --room trial engines 4 --from 20 …four late arrivals
     node trial/m3.js --room trial state               what the room holds, as the deck reads it

   --gap ms sets the stagger between bot sends (default 350). --api overrides the Worker. */
const argv = process.argv.slice(2);
const opt = {}; const args = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { opt[argv[i].slice(2)] = argv[i + 1]; i++; } else args.push(argv[i]); }
const API = opt.api || 'https://gt-poll.rlamare.workers.dev';
if (!opt.room) { console.error('Say which room: --room trial (a rehearsal room), or --room live (the REAL room; reset it in the Poll Desk after).'); process.exit(2); }
const LIVE = opt.room === 'live';
const SUF = LIVE ? '' : '-' + opt.room.replace(/[^a-z0-9-]/g, '');
const ROOM = 'm3-engines' + SUF;
const GAP = +(opt.gap || 350);
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (LIVE) console.log('  !! playing into the REAL room. Reset it in the Poll Desk when you are done.');

const NAMES = ['Priya K', 'Tom W', 'Elena R', 'Marcus B', 'Sam O', 'Aisha N', 'Ben T', 'Cara L', 'Dev P', 'Hana S', 'Ivan M', 'Jo F', 'Kemi A', 'Luis G', 'Mei C', 'Noor H', 'Owen D', 'Rosa V', 'Theo J', 'Uma R', 'Vik S', 'Wen L', 'Yara M', 'Zoe P'];
/* the pie, the other party, d/i/n and the strategy, the percentage to them */
const ENGINES = [
  ['The overhaul contract at renewal', 'The incumbent shop', 'd', 'Undercut on labour rate', 60],
  ['One spare engine, and two aircraft that both needed it', 'Our own operations team', 'i', 'Ground the older aircraft', 50],
  ['The last slot at the paint shop', 'A rival lessor', 'n', '', 100],
  ['This year’s training budget', 'The other division', 'n', '', 40],
  ['The corner office', 'A colleague', 'n', '', 0],
  ['A customer’s five-year fleet order', 'The other manufacturer', 'd', 'Bundle the maintenance', 70],
  ['The early hangar slot', 'The night shift', 'n', '', 50],
  ['Bonus pool between two teams', 'The other team', 'i', 'Argue from last year’s numbers', 45],
  ['A single spare part in stock', 'Another customer of the same supplier', 'd', 'Pay the expedite fee', 100],
  ['Who presents to the board', 'My co-lead', 'n', '', 50],
  ['The redelivery date', 'The lessee', 'd', 'Hold the deposit', 65],
  ['Gate slots at a congested airport', 'The other airline', 'n', '', 30],
  ['A fixed pot of capex', 'Three other projects', 'i', 'Overstate the return', 25],
  ['The one senior engineer', 'Another programme', 'n', '', 0],
  ['The exclusive on a new route', 'A competitor', 'd', 'File first', 100],
  ['The rebate at year end', 'The supplier', 'n', '', 55],
  ['Which office keeps the team', 'Head office', 'i', 'Threaten to leave', 20],
  ['Seats on the shuttle', 'Everyone else', 'n', '', 50],
  ['The renewal price', 'Our biggest customer', 'd', 'Show the rate card', 60],
  ['A scarce test cell', 'The engine shop next door', 'n', '', 35],
  ['The keynote slot', 'A rival speaker', 'n', '', 100],
  ['Insurance recovery after a claim', 'The insurer', 'd', 'Document everything', 80],
  ['The apprentice we both trained', 'The other site', 'n', '', 0],
  ['Water rights for the plant', 'The town', 'i', 'Lawyer up', 40],
];
const voterOf = i => 'trial-m3-engines-' + String(i).padStart(3, '0');

async function say(line, voter) {
  const r = await fetch(API + '/p/' + ROOM + '/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: line, v: voter }) });
  if (!r.ok) throw new Error(ROOM + ' said ' + r.status + ' to ' + line + (r.status === 429 ? ' (that bot has sent its 15 lines; reset the room)' : ''));
  console.log('  → ' + ROOM + '  ' + line);
}
const entries = () => fetch(API + '/p/' + ROOM + '/entries').then(r => r.json()).then(d => d.entries || []);

async function engines(n, from) {
  if (!Number.isInteger(n) || n < 1 || from + n > ENGINES.length) { console.error('How many bots? 1 to ' + (ENGINES.length - from) + ' from seat ' + (from + 1) + '.'); process.exit(2); }
  for (let i = from; i < from + n; i++) {
    const e = ENGINES[i], v = voterOf(i);
    await say('1‖' + e[0] + '‖' + NAMES[i] + '‖' + NAMES[(i + 12) % NAMES.length], v);
    await say('2‖' + e[1], v);
    await say('3‖' + e[2] + '‖' + e[3], v);
    await say('4‖' + e[4], v);
    await sleep(GAP);
  }
  console.log(n + ' engines sent to ' + ROOM + '.');
}
async function state() {
  const by = new Map();
  (await entries()).forEach(e => { const m = /^([1-4])‖([\s\S]*)$/.exec(String(e.t || '')); if (!m) return; if (!by.has(e.v)) by.set(e.v, {}); const g = by.get(e.v); const t = m[2];
    if (m[1] === '1') { const q = t.split('‖'); g.pie = q[0]; g.name = q[1] || ''; } else if (m[1] === '2') g.party = t; else if (m[1] === '3') g.strat = t; else g.pct = t; });
  const L = [...by.values()].filter(g => g.pie && g.pct !== undefined);
  console.log(ROOM + ': ' + L.length + ' engines.');
  L.forEach((g, i) => console.log('  ' + (i + 1) + '. ' + (g.name || '(no name)') + ': ' + g.pie + ' / ' + g.party + ' / ' + g.strat + ' / ' + g.pct));
}

(async () => {
  const cmd = args[0];
  if (cmd === 'engines') await engines(+args[1] || 20, +(opt.from || 0));
  else if (cmd === 'state') await state();
  else { console.error('Commands: engines N [--from K], state.'); process.exit(2); }
})().catch(e => { console.error(String(e.message || e)); process.exit(1); });
