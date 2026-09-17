#!/usr/bin/env node
/* The Module 6 tester: the phones' side of m6's closing exercise, driven
   from a terminal, so one person at the deck can watch the goal fill.

   Ryan opens the deck with ?room=trial; whoever runs this script plays the
   phones into the same room (m6-world-trial). A real phone joins as one
   more ball among the bots by opening m6/world/?room=trial. Bots speak
   exactly the wire the phone page speaks. The penalty games, the inspection
   game and rock paper scissors are pair games on their real rooms and are
   not played from here.

   --room live plays into the REAL room (so a phone that scanned the QR sits
   among the bots). Reset it in the Poll Desk afterwards.

     node trial/m6.js --room trial world 18      eighteen balls into the goal (invented situations)
     node trial/m6.js --room trial world 6 --from 12   …starting from the thirteenth bot, to add late arrivals
     node trial/m6.js --room trial state         what the room holds, as the deck reads it

   --gap ms sets the stagger between bot sends (default 350). --api overrides the Worker. */
const argv = process.argv.slice(2);
const opt = {}; const args = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { opt[argv[i].slice(2)] = argv[i + 1]; i++; } else args.push(argv[i]); }
const API = opt.api || 'https://gt-poll.rlamare.workers.dev';
if (!opt.room) { console.error('Say which room: --room trial (a rehearsal room), or --room live (the REAL room; reset it in the Poll Desk after).'); process.exit(2); }
const LIVE = opt.room === 'live';
const SUF = LIVE ? '' : '-' + opt.room.replace(/[^a-z0-9-]/g, '');
const ROOM = 'm6-world' + SUF;
const GAP = +(opt.gap || 350);
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (LIVE) console.log('  !! playing into the REAL room. Reset it in the Poll Desk when you are done.');

/* one invented person per seat, the same every run */
const NAMES = ['Priya K', 'Tom W', 'Elena R', 'Marcus B', 'Sam O', 'Aisha N', 'Ben T', 'Cara L', 'Dev P', 'Hana S', 'Ivan M', 'Jo F', 'Kemi A', 'Luis G', 'Mei C', 'Noor H', 'Owen D', 'Rosa V', 'Theo J', 'Uma R', 'Vik S', 'Wen L', 'Yara M', 'Zoe P'];
/* who is trying to predict you, what, what happens if they can, pays (p) or costs (c) */
const WORLD = [
  ['The maintenance shops we audit', 'Which sites we visit this quarter', 'The paperwork is perfect the week we arrive', 'p'],
  ['The airline across the table', 'How far we will move on price', 'They wait for our quarter end and get the discount', 'p'],
  ['My team', 'What I will approve', 'They get on with the work without asking me first', 'c'],
  ['A rival lessor', 'Which tenders we bid for', 'They only sharpen their price when we are in', 'p'],
  ['Our suppliers', 'When we re-tender the contract', 'Prices creep up until the month before', 'p'],
  ['Our customers', 'Whether we deliver on the date', 'They build their schedule around us, and they come back', 'c'],
  ['Our own sales team', 'Which expense claims get checked', 'The kind we never check keeps growing', 'p'],
  ['Customers', 'When the promotion starts', 'They hold their orders until it does', 'p'],
  ['The other side’s lawyers', 'Which clauses we will fight for', 'They trade away the ones we always give up', 'p'],
  ['Investors', 'What we will pay out', 'A steady share price', 'c'],
  ['Lessees', 'Which returned engines we inspect closely', 'The records are tidy only for the engines we always check', 'p'],
  ['Competitors', 'When we release the next version', 'They launch the week before', 'p'],
  ['A joint-venture partner', 'How we will vote on the board', 'They back us before the meeting', 'c'],
  ['Fraudsters', 'Which transactions we review', 'They stay just under the threshold', 'p'],
  ['A counterparty', 'When we walk away from a deal', 'They push until just before that point', 'p'],
  ['The regulator', 'How we report a finding', 'They trust our reports and visit less', 'c'],
  ['Bidders', 'How low we will go', 'Every offer lands just above it', 'p'],
  ['Our lenders', 'Whether we pay on time', 'Cheaper money', 'c'],
  ['The union', 'When we will settle', 'They hold out until the week we always fold', 'p'],
  ['A key account', 'Who we send to the renewal', 'They prepare for that person, not for us', 'p'],
  ['New hires', 'What the probation review checks', 'They do those things well and nothing else', 'p'],
  ['Our partner airline', 'When our engines come off wing', 'They plan their own shop visits around ours', 'c'],
  ['The press', 'When we announce results', 'Nothing, they just turn up', 'c'],
  ['The other bidder', 'Our opening offer', 'They open a fraction better every time', 'p'],
];
const voterOf = i => 'trial-m6-world-' + String(i).padStart(3, '0');

async function say(line, voter) {
  const r = await fetch(API + '/p/' + ROOM + '/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: line, v: voter }) });
  if (!r.ok) throw new Error(ROOM + ' said ' + r.status + ' to ' + line + (r.status === 429 ? ' (that bot has sent its 15 lines; reset the room)' : ''));
  console.log('  → ' + ROOM + '  ' + line);
}
const entries = () => fetch(API + '/p/' + ROOM + '/entries').then(r => r.json()).then(d => d.entries || []);

async function world(n, from) {
  if (!Number.isInteger(n) || n < 1 || from + n > WORLD.length) { console.error('How many bots? 1 to ' + (WORLD.length - from) + ' from seat ' + (from + 1) + '.'); process.exit(2); }
  for (let i = from; i < from + n; i++) {
    const w = WORLD[i];
    await say('a‖' + NAMES[i] + '‖' + w[0] + '‖' + w[1], voterOf(i));
    await say('b‖' + w[3] + '‖' + w[2], voterOf(i));
    await sleep(GAP);
  }
  console.log(n + ' balls sent to ' + ROOM + '.');
}
async function state() {
  const by = new Map();
  (await entries()).forEach(e => { const p = String(e.t || '').split('‖'); if (p[0] !== 'a' && p[0] !== 'b') return; if (!by.has(e.v)) by.set(e.v, {}); const r = by.get(e.v); if (p[0] === 'a') { r.name = p[1]; r.who = p[2]; r.what = p[3]; } else { r.k = p[1]; r.then = p[2]; } });
  const L = [...by.values()].filter(r => r.what && r.k);
  console.log(ROOM + ': ' + L.length + ' balls, ' + L.filter(r => r.k === 'p').length + ' pays, ' + L.filter(r => r.k === 'c').length + ' costs.');
  L.forEach((r, i) => console.log('  ' + (i + 1) + '. ' + (r.k === 'p' ? 'PAYS ' : 'COSTS') + '  ' + r.name + ': ' + r.who + ' / ' + r.what + ' / ' + r.then));
}

(async () => {
  const cmd = args[0];
  if (cmd === 'world') await world(+args[1] || 18, +(opt.from || 0));
  else if (cmd === 'state') await state();
  else { console.error('Commands: world N [--from K], state.'); process.exit(2); }
})().catch(e => { console.error(String(e.message || e)); process.exit(1); });
