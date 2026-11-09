// Bot boards for the Oil Pricing Exercise (9 Nov 2026): plays oil.js's invented room into a REHEARSAL room on the
// gt-poll Worker, as far as the stage you name, so the deck, the desk and a phone opened with ?room=<x> have
// something to show.
//   node teaching/exec/negotiation/s7/trial/bots.js <x>          -> the whole game, in room neg7-oil-neg-<x>
//   node teaching/exec/negotiation/s7/trial/bots.js <x> q4       -> up to and including the first memo's answers
//   node teaching/exec/negotiation/s7/trial/bots.js <x> m5 open  -> stops with month 5 open and no price in yet
// Then open /teaching/exec/negotiation/s7/?room=<x>, s7/desk/?room=<x> and s7/oil/?room=<x>&board=a1.
// Only ever use a rehearsal name for <x>: this script refuses to run without one.
const O = require('../oil.js');
const [room, upto, open] = process.argv.slice(2);
if (!room || !/^[a-z0-9-]{3,20}$/.test(room)) { console.log('usage: node bots.js <rehearsal room> [stage] [open]'); process.exit(1); }
const ROOM = 'neg7-oil-neg-' + room;
(async () => {
  let n = 0, ok = 0;
  const stop = upto ? O.idx(upto) : O.STAGES.length - 1;
  if (stop < 0) { console.log('no such stage:', upto); process.exit(1); }
  let stage = 'm1';
  for (const line of O.demoLines()) {
    const f = line.split('|');
    if (f[1] === 'st') { if (O.idx(f[2]) > stop) break; stage = f[2]; }
    if (open && stage === upto && (f[1] === 'p' || f[1] === 'q')) continue;
    n++;
    const r = await fetch(O.API + '/p/' + ROOM + '/say', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({t:line, v:'oilbot-' + room + '-' + n})});
    if (r.ok) ok++; else console.log('fail', r.status, line);
  }
  console.log(ROOM, ok + '/' + n, 'lines, stage', stage);
})();
