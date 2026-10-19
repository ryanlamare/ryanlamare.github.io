// Bot phones for any session (kit/, 17 Oct 2026): posts a session's demo room into rehearsal rooms on the
// gt-poll Worker, so a deck opened with ?room=<x> fills as if the room had used its phones.
//   node teaching/exec/negotiation/kit/trial/bots.js s1 <x>        -> rooms neg1-<step>-<x>
//   node teaching/exec/negotiation/kit/trial/bots.js s2-draft <x> chiptech   -> a session whose kit phone page is not deal/
// Then open /teaching/exec/negotiation/s1/?room=<x> and step through. Only ever use a rehearsal name for <x>.
const path = require('path');
const [dir, room, phoneDir] = process.argv.slice(2);
if (!dir || !room) { console.log('usage: node bots.js <session folder, e.g. s1> <rehearsal room>'); process.exit(1); }
global.window = global; global.location = {search: '?room=' + room, hash: ''}; global.localStorage = {getItem: () => null, setItem() {}};
require(path.join(__dirname, '..', 'neg.js'));
/* the session's scripts, as its phone page loads them (harborco.js before session.js, say), minus the kit's own */
const fs = require('fs'), deal = path.join(__dirname, '..', '..', dir, phoneDir || 'deal');
const srcs = [...fs.readFileSync(path.join(deal, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(u => !u.includes('/kit/'));
srcs.forEach(u => require(u.startsWith('/') ? path.join(__dirname, '..', '..', '..', '..', '..', u) : path.join(deal, u)));
const N = window.NK;
(async () => {
  for (const s of N.S.steps.filter(s => s.phone !== false)) {   /* never another session's room */
    let ok = 0, n = 0;
    if (s.type === 'poll') {
      const counts = s.demo || [];
      for (let o = 0; o < counts.length; o++) for (let k = 0; k < counts[o]; k++) {
        n++; const r = await fetch(N.API + '/p/' + s.room + '/vote', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({o, v: 'negk-bot-' + o + '-' + k + '-x9'})});
        if (r.ok) ok++;
      }
    } else {
      for (const e of N.demoEntries(s)) {
        n++; const r = await fetch(N.API + '/p/' + s.room + '/say', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({t: e.t, v: 'negk-bot-' + e.v.replace(/^demo-/, '') + '-x9'})});
        if (r.ok) ok++; else console.log('fail', r.status, await r.text());
      }
    }
    console.log(s.room, ok + '/' + n);
  }
})();
