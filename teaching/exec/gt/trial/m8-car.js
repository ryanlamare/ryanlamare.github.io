#!/usr/bin/env node
/* The car market tester: bot phones in m8's car market, so one person at the
   deck can watch the three round boards fill.

   Bots join the market by name, then play whatever the deck deals them.
   A bot seller reports a sale a few seconds into each round, at a price its
   round and its car make plausible: round 1 (cars shown) lemons near their
   worth and peaches near theirs; round 2 (hidden) prices pooled around
   £2,000 to £2,750, and most peach owners refuse to sell; round 3 (buyers
   may ask) some peaches sell high again. Bot buyers do nothing: buyers
   report nothing. A real phone plays alongside them.

     node trial/m8-car.js join 14              fourteen bots join, then play until round 3 closes
     node trial/m8-car.js join 14 --room m8-car-trial    the same, in a scratch room (deck: ?car=m8-car-trial)
     node trial/m8-car.js state                the room, as the deck reads it

   It plays into the REAL room (m8-car) unless --room says otherwise. Reset
   it in the Poll Desk afterwards. --api overrides the Worker. */
const argv = process.argv.slice(2);
const opt = {}; const args = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { opt[argv[i].slice(2)] = argv[i + 1]; i++; } else args.push(argv[i]); }
const API = opt.api || 'https://gt-poll.rlamare.workers.dev';
const ROOM = opt.room || 'm8-car';
const sleep = ms => new Promise(r => setTimeout(r, ms));
require('../m8/car/car.js');
const CAR = globalThis.CAR;

const NAMES = ['Priya K', 'Tom W', 'Elena R', 'Marcus B', 'Sam O', 'Aisha N', 'Ben T', 'Cara L', 'Dev P', 'Hana S', 'Ivan M', 'Jo F', 'Kemi A', 'Luis G', 'Mei C', 'Noor H', 'Owen D', 'Rosa V', 'Theo J', 'Uma R'];
const vid = i => 'trialbot-m8car-' + String(i).padStart(2, '0');
const rnd = (a, b) => Math.round((a + Math.random() * (b - a)) / 50) * 50;
const lines = () => fetch(API + '/p/' + ROOM + '/answers').then(r => r.json()).then(d => d.answers || []);
const say = (t, v) => fetch(API + '/p/' + ROOM + '/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t, v }) });

/* what a bot seller does with its car in a round: a price, or null for no sale */
function sale(n, car) {
  const P = car === 'P';
  if (n === 1) return Math.random() < 0.85 ? (P ? rnd(3000, 3900) : rnd(1000, 1500)) : null;
  if (n === 2) return P ? (Math.random() < 0.2 ? rnd(2800, 3000) : null) : (Math.random() < 0.85 ? rnd(2000, 2750) : null);
  return P ? (Math.random() < 0.6 ? rnd(3000, 3600) : null) : (Math.random() < 0.8 ? rnd(1200, 2400) : null);
}

const cmd = args[0];
if (cmd === 'state') {
  lines().then(L => { const S = CAR.parse(L); console.log(JSON.stringify({ joins: S.joins.length, dealt: !!S.deal, sellers: S.sellers.length, buyers: S.buyers.length, round: S.round, open: S.isOpen, sales: Object.fromEntries(Object.entries(S.sales).map(([n, s]) => [n, Object.values(s).map(x => x.name + ' ' + x.price)])) }, null, 2)); });
} else if (cmd === 'join') {
  (async () => {
    const n = Math.min(+(args[1] || 12), NAMES.length);
    for (let i = 0; i < n; i++) { await say(NAMES[i] + '|j', vid(i)); await sleep(150); }
    console.log('  ' + n + ' bots joined ' + ROOM);
    const done = {};
    for (;;) {
      const S = CAR.parse(await lines());
      if (S.round && S.isOpen) {
        for (let i = 0; i < n; i++) {
          const k = CAR.norm(NAMES[i]), key = S.round + ':' + k;
          if (done[key] || S.roleOf(k) !== 'seller') continue;
          if (!done[key + ':at']) { done[key + ':at'] = Date.now() + 2000 + Math.random() * 8000; continue; }
          if (Date.now() < done[key + ':at']) continue;
          done[key] = 1;
          const car = S.cars[S.round][k], p = sale(S.round, car);
          if (p) { await say(NAMES[i] + '|s|' + S.round + '|' + p, vid(i)); console.log('    round ' + S.round + ': ' + NAMES[i] + ' (' + (car === 'P' ? 'peach' : 'lemon') + ') sold for £' + p); }
          else console.log('    round ' + S.round + ': ' + NAMES[i] + ' (' + (car === 'P' ? 'peach' : 'lemon') + ') did not sell');
        }
      }
      if (S.close[3] !== undefined) { console.log('  round 3 closed. Stopping.'); break; }
      await sleep(1500);
    }
  })();
} else {
  console.log('usage: node trial/m8-car.js join 14 [--room m8-car-trial] | state');
}
