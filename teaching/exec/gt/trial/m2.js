#!/usr/bin/env node
/* The Module 2 tester: the phones' side of m2's three pair games, driven from
   a terminal, so one person at the deck can watch the results slides fill.

   m2 has no rehearsal room: the deck reads the real finals rooms, so the bots
   play into them. Reset m2-ultimatum, m2-centipede and m2-lastcard in the
   Poll Desk before any real session. Bots post exactly the finals line a
   pair's phone posts when its game ends.

     node trial/m2.js ultimatum 12     twelve pairs' offers, accepted or rejected
     node trial/m2.js centipede 12     the turn somebody took the pot
     node trial/m2.js cards 12         finished games of take the last card
     node trial/m2.js state            what the rooms hold, as the deck reads them

   --from K starts at pair K+1 (late arrivals). --gap ms sets the stagger
   between bot sends (default 350). --api overrides the Worker. */
const argv = process.argv.slice(2);
const opt = {}; const args = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { opt[argv[i].slice(2)] = argv[i + 1]; i++; } else args.push(argv[i]); }
const API = opt.api || 'https://gt-poll.rlamare.workers.dev';
const GAP = +(opt.gap || 350);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* fifteen pairs, the proposer / starter first */
const PAIRS = [['Aisha N', 'Tom W'], ['Ben T', 'Priya K'], ['Cara L', 'Marcus B'], ['Dev P', 'Sam O'], ['Elena R', 'Hana S'], ['Ivan M', 'Jo F'], ['Kemi A', 'Luis G'], ['Mei C', 'Noor H'], ['Owen D', 'Rosa V'], ['Theo J', 'Uma R'], ['Vik S', 'Wen L'], ['Yara M', 'Zoe P'], ['Anna B', 'Carl E'], ['Dina F', 'Greg H'], ['Ines K', 'Jack M']];
/* offer to the responder of the £1,000 (one of the phone's eleven: 10, 100 to 900, 990), and whether it was accepted */
const ULT = [[500, 'a'], [400, 'a'], [500, 'a'], [200, 'r'], [500, 'a'], [300, 'a'], [100, 'r'], [400, 'r'], [500, 'a'], [200, 'a'], [400, 'a'], [600, 'a'], [300, 'r'], [500, 'a'], [10, 'r']];
/* the turn the pot was taken; 10 = it ran to £1,000 */
const CENT = [6, 4, 8, 10, 5, 7, 3, 10, 6, 9, 1, 7, 2, 8, 5];
/* the piles the winner left, last few */
const CARDS = ['12-8-4-0', '9-6-2-0', '16-12-8-4', '11-7-4-0', '8-4-0', '10-5-1-0', '13-8-4-0', '12-8-4-0', '7-3-0', '16-12-8-4', '9-5-2-0', '8-4-0', '14-10-6-3', '12-8-4-0', '6-2-0'];
const GAMES = {
  ultimatum: { room: 'm2-ultimatum', line: i => PAIRS[i][0] + '|' + PAIRS[i][1] + '|' + ULT[i][0] + '|' + ULT[i][1] },
  centipede: { room: 'm2-centipede', line: i => PAIRS[i][i % 2] + '|' + PAIRS[i][1 - i % 2] + '|' + CENT[i] },
  cards: { room: 'm2-lastcard', line: i => PAIRS[i][i % 2] + '|' + PAIRS[i][1 - i % 2] + '|' + CARDS[i] },
};
const voterOf = (g, i) => 'trial-m2-' + g + '-' + String(i).padStart(3, '0');

async function say(room, line, voter) {
  const r = await fetch(API + '/p/' + room + '/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: line, v: voter }) });
  if (!r.ok) throw new Error(room + ' said ' + r.status + ' to ' + line + (r.status === 429 ? ' (that bot has sent its 15 lines; reset the room)' : ''));
  console.log('  → ' + room + '  ' + line);
}
const answers = room => fetch(API + '/p/' + room + '/answers').then(r => r.json()).then(d => d.answers || []);

async function play(g, n, from) {
  if (!Number.isInteger(n) || n < 1 || from + n > PAIRS.length) { console.error('How many pairs? 1 to ' + (PAIRS.length - from) + ' from pair ' + (from + 1) + '.'); process.exit(2); }
  console.log('  !! playing into the REAL room. Reset it in the Poll Desk when you are done.');
  for (let i = from; i < from + n; i++) { await say(GAMES[g].room, GAMES[g].line(i), voterOf(g, i)); await sleep(GAP); }
  console.log(n + ' pairs sent to ' + GAMES[g].room + '.');
}
async function state() {
  for (const g of Object.keys(GAMES)) {
    const L = await answers(GAMES[g].room);
    console.log(GAMES[g].room + ': ' + L.length + ' lines.');
    L.forEach(t => console.log('  ' + t));
  }
}

(async () => {
  const cmd = args[0];
  if (GAMES[cmd]) await play(cmd, +args[1] || 12, +(opt.from || 0));
  else if (cmd === 'state') await state();
  else { console.error('Commands: ultimatum N, centipede N, cards N [--from K], state.'); process.exit(2); }
})().catch(e => { console.error(String(e.message || e)); process.exit(1); });
