#!/usr/bin/env node
/* The Module 7 tester: the phones' side of m7's closing exercise, driven
   from a terminal, so one person at the deck can watch the fleet sail in.

   Ryan opens the deck with ?room=trial; whoever runs this script plays the
   phones into the same room (m7-world-trial). A real phone joins as one
   more ship among the bots by opening m7/world/?room=trial. Bots speak
   exactly the wire the phone page speaks (m7/world/ships.js). Chicken,
   split or steal and the auction are on their own rooms and are not played
   from here.

   --room live plays into the REAL room (so a phone that scanned the QR sits
   among the bots). Reset it in the Poll Desk afterwards.

     node trial/m7.js --room trial world 18            eighteen ships (invented moves)
     node trial/m7.js --room trial world 6 --from 18   …six late arrivals
     node trial/m7.js --room trial state               what the room holds, as the deck reads it

   --gap ms sets the stagger between bot sends (default 350). --api overrides the Worker. */
const argv = process.argv.slice(2);
const opt = {}; const args = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { opt[argv[i].slice(2)] = argv[i + 1]; i++; } else args.push(argv[i]); }
const API = opt.api || 'https://gt-poll.rlamare.workers.dev';
if (!opt.room) { console.error('Say which room: --room trial (a rehearsal room), or --room live (the REAL room; reset it in the Poll Desk after).'); process.exit(2); }
const LIVE = opt.room === 'live';
const SUF = LIVE ? '' : '-' + opt.room.replace(/[^a-z0-9-]/g, '');
const ROOM = 'm7-world' + SUF;
const GAP = +(opt.gap || 350);
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (LIVE) console.log('  !! playing into the REAL room. Reset it in the Poll Desk when you are done.');
require('../m7/world/ships.js');
const S = globalThis.M7_SHIPS;

const NAMES = ['Priya K', 'Tom W', 'Elena R', 'Marcus B', 'Sam O', 'Aisha N', 'Ben T', 'Cara L', 'Dev P', 'Hana S', 'Ivan M', 'Jo F', 'Kemi A', 'Luis G', 'Mei C', 'Noor H', 'Owen D', 'Rosa V', 'Theo J', 'Uma R', 'Vik S', 'Wen L', 'Yara M', 'Zoe P'];
/* module the game came from (0 new), kind (c t p), the game, the move, what makes it credible, the downside */
const WORLD = [
  [2,'t','I need a price cut from our parts supplier','Unless the price comes down, we move the contract to their rival when it renews','We have already qualified the rival’s parts, and they know it','The rival learns we need them, and their price goes up too'],
  [4,'p','We and the other lessor: hold our rates, or undercut','If they hold their rates this quarter, we hold ours','We publish our rate card, so any cut would be seen at once','It looks like collusion to a regulator'],
  [5,'c','Two teams and one launch date: neither wants to move first','We announce our date to customers before the planning meeting','Customers have it in writing','If we slip, we slip in public'],
  [3,'c','Dividing the maintenance budget with the other division','We tell finance our number before the meeting, and we do not move from it','Our director signed it off in front of theirs','If the pot shrinks, our number looks greedy and we cannot trim it'],
  [2,'p','I need two extra engineers from my director','If I get them, I deliver a month early','The date goes into my objectives','A month early on this means a month late on something else'],
  [4,'t','Us and the other bidder: hold the terms, or sweeten them','If they add free maintenance again, we match it on every one of their accounts','We did it once, last year','It costs us more than it costs them'],
  [5,'c','The two offices: which system we standardise on','We migrate our office first, before the decision','The old system is switched off','If head office picks the other one, we pay twice'],
  [0,'p','A key engineer is deciding whether to stay','If she stays through the project, the lead role is hers','It is announced to the team now','Two others wanted that role'],
  [2,'c','I need the airline to stop asking for a lower rate at every renewal','We tell them the rate is the rate, and show them the list','Every customer sees the same list','We lose the one customer who really would have walked'],
  [4,'p','Two departments: release a post, or protect headcount','If they release one post, we release one','Both posts go to the same committee on the same day','The committee takes both and gives neither back'],
  [3,'t','Dividing the disputed invoices with a slow-paying customer','The next disputed invoice goes straight to arbitration','It is in the new contract','Arbitration is slow, and it sours the account'],
  [5,'c','Us and the other operator: who takes the early slot at the shared hangar','We book our slot for the whole year in advance','The deposit is not refundable','A quiet month, and we have paid for an empty hangar'],
  [2,'t','I need sign-off from legal','If it is not signed by Friday, the deal team goes to outside counsel','The budget for outside counsel is already approved','Legal stops doing us favours'],
  [4,'c','Us and the other repair shop: hold the price, or cut it','We sign a most-favoured-customer clause with our biggest account','It is in the contract, and the rival has heard about it','Every discount we ever give now costs us twice'],
  [0,'c','My own habit of reopening decisions the night before','I send the decision to the client before I go home','It is in their inbox','Sometimes the second thought was the right one'],
  [5,'p','Two suppliers who both need to invest for the new part to work','If they tool up, we guarantee the first two years of orders','The guarantee is signed by our finance director','If the part is delayed, we are buying things we cannot use'],
  [3,'c','Dividing the engine shop’s hours with the other fleet','We move our engines in on the first of the month, every month','Our aircraft are already scheduled around it','We cannot take a better slot when one comes up'],
  [2,'p','I need a yes from the union on the new roster','If they accept the roster, no compulsory weekends this year','It goes into the agreement','A busy summer with nobody we can call in'],
  [4,'t','Us and the other airline: leave each other’s crew alone, or poach','For every pilot they take, we make offers to two of theirs','We have done it before','Wages go up for everyone, us included'],
  [5,'c','Me and my opposite number: who travels for the quarterly review','I book the room here for the year','The invitations are already accepted','They stop coming in person'],
  [0,'t','A tenant who is always a month late','One more late payment and the lease is not renewed','It was said in front of their board','An empty unit is worse than a late payer'],
  [2,'c','I need a decision from the steering group','We tell the client the go-live date today','The client has planned around it','The steering group feels bounced, and remembers'],
  [3,'p','Dividing the bonus pool with the other team','If they take the smaller share this year, they choose first next year','It is minuted','Next year’s pool might be half the size'],
  [5,'c','Both of us waiting for the other to set the agenda','I circulate mine a week early','Everyone has read it','I have shown my hand'],
];
const voterOf = i => 'trial-m7-world-' + String(i).padStart(3, '0');

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
    await say('g‖' + NAMES[i] + '‖' + w[0] + '‖' + w[2], voterOf(i));
    await say('m‖' + w[1] + '‖' + w[3], voterOf(i));
    const ck = ['ct', 'rp', 'mo', 'oe'][i % 4];
    await say('c‖' + ck + '‖' + (ck === 'oe' ? w[4] : ''), voterOf(i));
    await say('d‖' + w[5], voterOf(i));
    await sleep(GAP);
  }
  console.log(n + ' ships sent to ' + ROOM + '.');
}
async function state() {
  const L = S.fleet(await entries());
  console.log(ROOM + ': ' + L.length + ' ships.');
  L.forEach((r, i) => console.log('  ' + (i + 1) + '. ' + r.name + ' [M' + r.module + ', ' + S.KIND[r.kind] + '] ' + r.game + ' / ' + r.move + ' / ' + r.cred + ' / ' + r.down));
}

(async () => {
  const cmd = args[0];
  if (cmd === 'world') await world(+args[1] || 18, +(opt.from || 0));
  else if (cmd === 'state') await state();
  else { console.error('Commands: world N [--from K], state.'); process.exit(2); }
})().catch(e => { console.error(String(e.message || e)); process.exit(1); });
