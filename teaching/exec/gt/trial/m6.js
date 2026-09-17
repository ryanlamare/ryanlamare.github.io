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
/* where it benefits to be inconsistent, the other player, what happens if they can always predict you, how mixing might backfire */
const WORLD = [
  ['Which maintenance shops we audit each quarter','The shops','The paperwork is perfect the week we arrive','We skip a shop two years running and miss a real problem'],
  ['How far we move on price at the end of a quarter','The airline across the table','They wait for our quarter end and get the discount','We hold firm at the wrong moment and lose the deal'],
  ['Which tenders we bid for','A rival lessor','They only sharpen their price when we are in','We sit out one we should have won'],
  ['When we re-tender a supply contract','Our suppliers','Prices creep up until the month before','A good supplier stops investing in us'],
  ['Which expense claims get checked','Our own sales team','The kind we never check keeps growing','An honest person feels accused'],
  ['When the promotion starts','Our customers','They hold their orders until it does','Loyal customers pay full price the week before and find out'],
  ['Which clauses we fight for','The other side’s lawyers','They trade away the ones we always give up','We look erratic and the talks slow down'],
  ['Which returned engines we inspect closely','Lessees','The records are tidy only for the engines we always check','The one we wave through is the bad one'],
  ['When we release the next version','Competitors','They launch the week before','Our own sales team cannot plan either'],
  ['Which transactions we review','Fraudsters','They stay just under the threshold','We miss an obvious one and it looks like negligence'],
  ['When we walk away from a deal','A counterparty','They push until just before that point','We walk from one we needed'],
  ['Who we send to the renewal','A key account','They prepare for that person, not for us','The customer wanted the person they know'],
  ['Our opening offer','The other bidder','They open a fraction better every time','We open too high and drop out of the running'],
  ['When we will settle','The union','They hold out until the week we always fold','A strike we could have avoided'],
  ['What the probation review checks','New hires','They do those things well and nothing else','People feel the goalposts move'],
  ['Which sites get a safety walk-round','Site managers','Everything is tidy on the first Monday of the month','A manager takes it as distrust'],
  ['How we respond to a late payment','Customers who pay late','They pay us last, because we always wait','We chase a good customer hard in a bad month'],
  ['Which supplier invoices we query','Suppliers','Small overcharges on the lines we never read','Time spent on invoices that were fine'],
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
    await say('b‖' + w[2] + '‖' + w[3], voterOf(i));
    await sleep(GAP);
  }
  console.log(n + ' balls sent to ' + ROOM + '.');
}
async function state() {
  const by = new Map();
  (await entries()).forEach(e => { const p = String(e.t || '').split('‖'); if (p[0] !== 'a' && p[0] !== 'b') return; if (!by.has(e.v)) by.set(e.v, {}); const r = by.get(e.v); if (p[0] === 'a') { r.name = p[1]; r.where = p[2]; r.who = p[3]; } else { r.then = p[1]; r.back = p[2]; } });
  const L = [...by.values()].filter(r => r.where && r.then !== undefined);
  console.log(ROOM + ': ' + L.length + ' balls.');
  L.forEach((r, i) => console.log('  ' + (i + 1) + '. ' + r.name + ': ' + r.where + ' / ' + r.who + ' / ' + r.then + ' / ' + r.back));
}

(async () => {
  const cmd = args[0];
  if (cmd === 'world') await world(+args[1] || 18, +(opt.from || 0));
  else if (cmd === 'state') await state();
  else { console.error('Commands: world N [--from K], state.'); process.exit(2); }
})().catch(e => { console.error(String(e.message || e)); process.exit(1); });
