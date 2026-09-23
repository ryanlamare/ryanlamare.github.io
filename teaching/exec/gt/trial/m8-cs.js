#!/usr/bin/env node
/* The Hidden Agenda tester: bot seats at m8's table, so one person with a
   phone and the moderator page can play a full game.

   Bots take seats in the lobby, then play whatever the deal gives them:
   a Manipulator copies a human Manipulator's pick (or, with no human
   Manipulator left, the bots agree on one name), the Auditor checks someone
   new each night, General Counsel shields someone other than last night's,
   everyone else sends a night note, every seated bot votes on an accusation,
   and at the end every bot recommends a bidder. Each bot waits a few seconds
   before acting, as a person would.

     node trial/m8-cs.js seat 9          nine bots take seats, then play until the game is over
     node trial/m8-cs.js play            play the bots already seated (after a restart)
     node trial/m8-cs.js leave           bots give up their seats (lobby only)
     node trial/m8-cs.js state           the table, as the deck reads it

   It plays into the REAL room (m8-cs-tapas). Reset it in the Poll Desk
   afterwards. --room overrides the room, --api the Worker. */
const argv = process.argv.slice(2);
const opt = {}; const args = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { opt[argv[i].slice(2)] = argv[i + 1]; i++; } else args.push(argv[i]); }
const API = opt.api || 'https://gt-poll.rlamare.workers.dev';
const ROOM = opt.room || 'm8-cs-tapas';
const BASE = API + '/p/' + ROOM + '/cs/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const NAMES = ['Priya K', 'Tom W', 'Elena R', 'Marcus B', 'Sam O', 'Aisha N', 'Ben T', 'Cara L', 'Dev P', 'Hana S', 'Ivan M', 'Jo F', 'Kemi A', 'Luis G', 'Mei C'];
const vid = i => 'trialbot-m8cs-' + String(i).padStart(2, '0');
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };

async function get(sub, q) { const r = await fetch(BASE + sub + (q ? '?' + new URLSearchParams(q) : '')); return r.json(); }
async function post(sub, body) { const r = await fetch(BASE + sub, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return r.json().catch(() => ({ error: r.status })); }

const cmd = args[0];
if (cmd === 'state') {
  get('board').then(b => { console.log(JSON.stringify(b, null, 2)); });
} else if (cmd === 'leave') {
  (async () => { for (let i = 0; i < NAMES.length; i++) { const r = await post('unseat', { v: vid(i) }); if (r.ok) process.stdout.write('.'); } console.log(' done'); })();
} else if (cmd === 'seat' || cmd === 'play') {
  (async () => {
    const n = Math.min(+(args[1] || 9), NAMES.length);
    const bots = [];
    if (cmd === 'seat') {
      const board = await get('board');
      const taken = new Set((board.seats || []).map(s => s.n.toLowerCase()));
      for (let i = 0; i < NAMES.length && bots.length < n; i++) {
        if (taken.has(NAMES[i].toLowerCase())) continue;
        const r = await post('seat', { v: vid(i), n: NAMES[i] });
        if (r.ok) { bots.push(vid(i)); console.log('  seated', NAMES[i]); }
        else console.log('  could not seat', NAMES[i], r.error);
        await sleep(300);
      }
    } else {
      for (let i = 0; i < NAMES.length; i++) { const me = await get('me', { v: vid(i) }); if (me.me) bots.push(vid(i)); }
      console.log('  playing', bots.length, 'seated bots');
    }
    const due = {};      /* bot + phase key -> when it may act */
    const done = {};     /* bot + phase key -> acted */
    const checked = {};  /* the Auditor's past checks, so it looks at someone new */
    let lastPhase = '';
    for (;;) {
      let over = false;
      for (const v of bots) {
        let me; try { me = await get('me', { v }); } catch (e) { continue; }
        if (!me.me) continue;
        const key = v + '|' + me.phase + '|' + me.round + '|' + (me.day && me.day.accused || '');
        if (me.phase + me.round !== lastPhase) { lastPhase = me.phase + me.round; console.log('  --', me.phase, 'round', me.round); }
        if (me.phase === 'over') {
          if (!me.reco && !done[key]) { done[key] = 1; await post('act', { v, kind: 'reco', b: pickOne(['A', 'B', 'B', 'C', 'D']) }); }
          over = true; continue;
        }
        if (!me.me.alive || !me.me.role) continue;
        if (!due[key]) due[key] = Date.now() + 3000 + Math.random() * 9000;
        const ready = Date.now() >= due[key];
        const alive = me.seats.filter(s => s.alive);
        const byName = Object.fromEntries(me.seats.map(s => [s.n, s.v]));
        const others = alive.filter(s => s.v !== v);
        const role = me.me.role;
        if (me.phase === 'night' && me.night) {
          if (role === 'b') {
            /* follow a human Manipulator; with none alive, follow the first bot that picked; else pick */
            const mates = me.mates || [];
            const humans = mates.filter(m => m.alive && !bots.includes(byName[m.n]));
            const lead = humans.find(m => m.pick) || (humans.length ? null : mates.find(m => m.alive && m.pick));
            let want = lead ? lead.pick : null;
            if (!want && !humans.length && ready) {
              const mateNames = new Set(mates.map(m => m.n));
              want = pickOne(others.filter(s => !mateNames.has(s.n))).n;
            }
            if (want && me.night.myPick !== want && byName[want]) {
              const r = await post('act', { v, kind: 'pick', target: byName[want] });
              if (r.ok) console.log('   ', me.me.n, '(Manipulator) picks', want);
            }
          } else if (ready && !done[key]) {
            done[key] = 1;
            if (role === 'a' && !me.night.myCheck) {
              const seen = checked[v] || (checked[v] = new Set());
              const t = pickOne(others.filter(s => !seen.has(s.v)).length ? others.filter(s => !seen.has(s.v)) : others);
              seen.add(t.v);
              const r = await post('act', { v, kind: 'check', target: t.v });
              console.log('   ', me.me.n, '(Auditor) checks', t.n, '->', r.role === 'b' ? 'MANIPULATOR' : 'clean');
            }
            if (role === 'c' && !me.night.myClear) {
              const pool = others.filter(s => s.v !== me.lastClear);
              const t = pickOne(pool.length ? pool : others);
              await post('act', { v, kind: 'clear', target: t.v });
              console.log('   ', me.me.n, '(General Counsel) shields', t.n);
            }
            if (!me.night.myNotes) {
              const s = shuffle(others).slice(0, 1 + Math.floor(Math.random() * 3)).map(x => x.v);
              await post('act', { v, kind: 'notes', s, a: pickOne(others).v, c: pickOne(others).v });
            }
          }
        } else if (me.phase === 'vote' && me.day && me.day.open) {
          if (ready && !me.day.myVote && me.day.accusedV !== v && !done[key]) {
            done[key] = 1;
            /* a Manipulator saves a mate and helps remove anyone else; the rest lean towards removing */
            const mateNames = new Set((me.mates || []).map(m => m.n));
            const y = role === 'b' ? (mateNames.has(me.day.accused) ? 'n' : 'y') : (Math.random() < 0.6 ? 'y' : 'n');
            await post('act', { v, kind: 'vote', y });
            console.log('   ', me.me.n, 'votes', y === 'y' ? 'remove' : 'keep', me.day.accused);
          }
        }
      }
      if (over) { console.log('  game over; bots recommended. Stopping.'); break; }
      await sleep(1500);
    }
  })();
} else {
  console.log('usage: node trial/m8-cs.js seat 9 | play | leave | state');
}
