// Bot phones for the Session 2 sample (14 Oct 2026): posts the demo room (sixteen pairs' deals, beliefs
// and extra terms) into rehearsal rooms on the gt-poll Worker.
//   node teaching/exec/negotiation/s2/trial/bots.js <room>     -> rooms neg3-deals-<room> (and the deck's ?room=<room>)
// Then open /teaching/exec/negotiation/s2/?room=<room>#7 to watch the record slide fill.
global.window = global; global.location = {search: '?room=' + (process.argv[2] || 'trial')}; global.localStorage = {getItem: () => null};
require(require('path').join(__dirname, '..', 'deals.js'));
const N = window.NEG;
(async () => {
  let ok = 0; const lines = N.demoEntries();
  for (const e of lines) {
    const v = 'neg3-bot-' + e.v.replace(/^demo-/, '') + '-x9';
    const r = await fetch(N.API + '/p/' + N.room + '/say', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({t: e.t, v})});
    if (r.ok) ok++; else console.log('fail', r.status, await r.text());
  }
  console.log('room', N.room, 'posted', ok, 'of', lines.length);
})();
