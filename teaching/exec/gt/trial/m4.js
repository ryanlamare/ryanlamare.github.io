#!/usr/bin/env node
/* The Module 4 tester: the phones' side of every m4 room, driven from a
   terminal, so one person at the deck can rehearse a whole room.

   Ryan opens the deck with ?room=trial (and the desk, m4/game/desk/?room=trial)
   and presses its buttons; whoever runs this script plays the phones into
   the same rooms (m4-teams-trial, m4-huddle-trial, m4-prices-trial,
   m4-meet-trial, m4-pds-trial). A real phone on ?room=trial joins as one
   more seat among the bots. Bots speak exactly the wire the phone page
   speaks (see m4/game/index.html and m4/pds/index.html), and nothing here
   can touch a real room unless --room is left off (then it refuses).

     node trial/m4.js --room trial teams 3 3            three Aura and three Buco's teams of three, invented names
     node trial/m4.js --room trial state               everything the rooms hold, as the deck reads it
     node trial/m4.js --room trial week all 1.50       every team's sign goes up at £1.50 for the open week
     node trial/m4.js --room trial week a1=1.40 a2=1.50 b3=1.40 …   per team (unnamed teams hold); --skip a1 leaves a team for a real phone
     node trial/m4.js --room trial commit a2 1.40      one team's sign
     node trial/m4.js --room trial ask a1 y            the team asks (or n: does not ask) for the meeting the deck has offered
     node trial/m4.js --room trial agree a1 1.50                the rep's one tap: 1.50, 1.40 or none (--who 2 names another seat)
     node trial/m4.js --room trial pds 15              fifteen pairs' dilemmas into m4-pds-trial (in pairs since 18 Sep, two names a line; --from 15 adds late ones; 30 invented)
     node trial/m4.js --room trial routes              every phone answers the way out (once the deck has opened it; --only n makes them all stuck)
     node trial/m4.js --room trial rank 5                    Axelrod votes; NOTE this poll has no room suffix, so it is the REAL m4-axelrod (reset it from Poll Desk after)
     node trial/m4.js --room trial shot a1             screenshot the real phone page as seat 1 of a1 sees it (needs Chrome, writes trial/shots/)
     node trial/m4.js --room trial shot deck 5         screenshot the deck's slide 5 on this room
     node trial/m4.js --room trial deck open 1         post a deck marker yourself (for a solo test without the deck: pair, paper w, meet w, reps w, open w, reveal w, shock)

   --gap ms sets the stagger between bot taps (default 900). --api overrides the Worker. */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const opt = {}; const args = [];
for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { opt[argv[i].slice(2)] = argv[i + 1]; i++; } else args.push(argv[i]); }
const API = opt.api || 'https://gt-poll.rlamare.workers.dev';
const SITE = opt.site || 'http://localhost:8000';
if (!opt.room) { console.error('Say which room: --room trial (a rehearsal room), or --room live for pds/routes only (the REAL dilemma room; reset it in the Poll Desk after).'); process.exit(2); }
const LIVE = opt.room === 'live';
const SUF = LIVE ? '' : '-' + opt.room.replace(/[^a-z0-9-]/g, '');
if (LIVE) console.log('  !! playing into the REAL dilemma room. Reset it in the Poll Desk when you are done.');
const ROOM = { teams: 'm4-teams' + SUF, prices: 'm4-prices' + SUF, huddle: 'm4-huddle' + SUF, meet: 'm4-meet' + SUF, pds: 'm4-pds' + SUF };
const GAP = +(opt.gap || 900);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* one invented person per seat, the same every run, so a name means the same phone all session */
const NAMES = ['Priya K', 'Tom W', 'Elena R', 'Marcus B', 'Sam O', 'Aisha N', 'Ben T', 'Cara L', 'Dev P', 'Hana S', 'Ivan M', 'Jo F', 'Kemi A', 'Luis G', 'Mei C', 'Noor H', 'Owen D', 'Rosa V', 'Theo J', 'Uma R', 'Vik S', 'Wren P', 'Yusuf E', 'Zoe M', 'Alex Q', 'Bea W', 'Cal N', 'Dara K', 'Eli B', 'Fay T'];
const seatIndex = (team, n) => ((team[0] === 'a' ? 0 : 15) + (+team[1] - 1) * 3 + (n - 1));
const seatName = (team, n) => NAMES[seatIndex(team, n)];
const seatVoter = (team, n) => 'trial-' + team + '-' + n + '-' + SUF.replace(/[^a-z0-9]/g, '') + '00';

async function say(room, line, voter) {
  const r = await fetch(API + '/p/' + room + '/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: line, v: voter }) });
  if (!r.ok) throw new Error(room + ' said ' + r.status + ' to ' + line);
  console.log('  → ' + room + '  ' + line);
}
const answers = room => fetch(API + '/p/' + room + '/answers').then(r => r.json()).then(d => d.answers || []);
const entries = room => fetch(API + '/p/' + room + '/entries').then(r => r.json()).then(d => d.entries || []);
const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/* the rooms as the deck reads them (a port of pwParse in m4/index.html) */
async function read() {
  const [teams, prices, huddle, meet] = await Promise.all([answers(ROOM.teams), answers(ROOM.prices), answers(ROOM.huddle), answers(ROOM.meet)]);
  const G = { pair: {}, opened: 0, revealed: 0, stage: 0, shock: false, meetOpen: 0, repsSent: 0, paper: 0, sign: {}, lock: {}, members: {}, ask: {}, agreed: {}, routes: false };
  const claim = {}, drop = {};
  teams.forEach(t => { const m = String(t).match(/^([ab][1-5])\s*\|\s*(.{1,40}?)$/i); if (m) claim[norm(m[2])] = { name: m[2].trim(), st: m[1].toLowerCase() }; });
  prices.forEach(t => {
    const p = String(t).trim().toLowerCase().split('|').map(s => s.trim());
    if (p[0] === '::pair' && p[1]) p[1].split(',').forEach(x => { const m = x.match(/^(a[1-5])=(b[1-5])$/); if (m) { G.pair[m[1]] = m[2]; G.pair[m[2]] = m[1]; } });
    else if (p[0] === '::open' && /^[1-6]$/.test(p[1])) G.opened = Math.max(G.opened, +p[1]);
    else if (p[0] === '::reveal' && /^[1-6]$/.test(p[1])) G.revealed = Math.max(G.revealed, +p[1]);
    else if (p[0] === '::shock') G.shock = p[1] === 'on';
    else if (p[0] === '::meet' && /^[1-6]$/.test(p[1])) G.meetOpen = Math.max(G.meetOpen, +p[1]);
    else if (p[0] === '::reps' && /^[1-6]$/.test(p[1])) G.repsSent = Math.max(G.repsSent, +p[1]);
    else if (p[0] === '::paper' && /^[1-6]$/.test(p[1])) G.paper = Math.max(G.paper, +p[1]);
    else if (p[0] === '::stage' && /^[1-6]$/.test(p[1])) G.stage = Math.max(G.stage, +p[1]);
    else if (/^[ab][1-5]$/.test(p[0]) && /^[1-6]$/.test(p[1]) && /^1\.[45]0$/.test(p[2])) G.sign[p[0] + '|' + p[1]] = p[2];
  });
  huddle.forEach(t => {
    const p = String(t).split('|').map(s => s.trim()); const s = p[0].toLowerCase();
    if (!/^[ab][1-5]$/.test(s) || !/^[0-6]$/.test(p[1])) return; const k = s + '|' + p[1];
    if (p[2] === 'drop' && p[3]) drop[s + '|' + norm(p[3])] = true;
    else if (p[2] === 'lock' && p[3] && /^1\.[45]0$/.test(p[4])) { G.lock[k] = G.lock[k] || {}; G.lock[k][norm(p[3])] = { name: p[3], price: p[4] }; }
    else if (p[2] === 'undo' && p[3] && G.lock[k]) delete G.lock[k][norm(p[3])];
  });
  Object.entries(claim).forEach(([n, c]) => { if (drop[c.st + '|' + n]) return; (G.members[c.st] = G.members[c.st] || []).push(c.name); });
  meet.forEach(t => {
    const p = String(t).split('|').map(s => s.trim()); const s = p[0].toLowerCase();
    if (!/^[ab][1-5]$/.test(s) || !/^[1-6]$/.test(p[1])) return;
    if (p[2] === 'ask') G.ask[s + '|' + p[1]] = p[3] === 'y';
    else if (p[2] === 'agreed' && p[3]) G.agreed[s + '|' + p[1]] = { name: p[3], text: p.slice(4).join(' | ') };
  });
  return G;
}
const agreedPrice = (G, team, w) => {
  const locks = G.lock[team + '|' + w] || {}, mem = G.members[team] || [];
  if (!mem.length) return ''; let p = '';
  for (const n of mem) { const l = locks[norm(n)]; if (!l) return ''; if (p && l.price !== p) return ''; p = l.price; }
  return p;
};
const seats = (G, team) => (G.members[team] || []).map((name, i) => ({ name, n: i + 1 }));
function needOpen(G) { if (!G.opened) { console.error('No week is open yet (the deck posts ::open). Press Open week on the deck, or: deck open 1'); process.exit(1); } if (G.revealed >= G.opened) { console.error('Week ' + G.opened + ' is already revealed. Open the next week first.'); process.exit(1); } return G.opened; }

/* ---- commands ---- */
const cmd = {};
cmd.teams = async (na, nb) => {
  na = +na || 3; nb = +nb || na;
  for (const [side, n] of [['a', na], ['b', nb]]) for (let t = 1; t <= n; t++) for (let s = 1; s <= 3; s++) {
    const team = side + t; await say(ROOM.teams, team + '|' + seatName(team, s), seatVoter(team, s)); await sleep(GAP / 3);
  }
  console.log('Teams in. Now press Start on the deck.');
};
cmd.state = async () => {
  const G = await read();
  const pdsE = await entries(ROOM.pds);
  const teams = Object.keys(G.members).sort();
  console.log('ROOM ' + SUF.slice(1) + '\n  teams: ' + (teams.map(t => t + ' [' + G.members[t].join(', ') + ']').join('  ') || 'none'));
  console.log('  paired: ' + (Object.keys(G.pair).filter(k => k[0] === 'a').sort().map(a => a + '=' + G.pair[a]).join(', ') || 'not started'));
  console.log('  paper ' + G.paper + ' · meet offered before ' + G.meetOpen + ' · reps sent ' + G.repsSent + ' · open ' + G.opened + ' · stage ' + G.stage + ' · revealed ' + G.revealed + (G.shock ? ' · GAZETTE RULES ON' : ''));
  for (let w = 1; w <= 6; w++) {
    const line = teams.map(t => {
      const s = G.sign[t + '|' + w]; if (s) return t + ' £' + s + ' UP';
      const locks = G.lock[t + '|' + w] || {}; const ls = (G.members[t] || []).map(n => locks[norm(n)] ? locks[norm(n)].price.slice(2) : '·');
      return ls.some(x => x !== '·') ? t + ' [' + ls.join(' ') + ']' : null;
    }).filter(Boolean);
    if (line.length) console.log('  week ' + w + ': ' + line.join('  '));
  }
  const asks = Object.entries(G.ask).map(([k, v]) => k + (v ? ' asked' : ' declined')); if (asks.length) console.log('  meetings: ' + asks.join(', '));
  const notes = Object.entries(G.agreed).map(([k, v]) => k + ' ' + v.name + ': "' + v.text + '"'); if (notes.length) console.log('  notes: ' + notes.join(' · '));
  const groups = new Set(pdsE.filter(e => /^[1-5]‖/.test(e.t)).map(e => e.v));
  console.log('  dilemmas: ' + groups.size + ' groups in' + (pdsE.some(e => e.t === '::routes') ? ' · way-out question OPEN · ' + pdsE.filter(e => /^5‖/.test(e.t)).length + ' answered' : ''));
};
/* one hold posts the team's sign (the stripped phone); the fuller page's lock lines are no longer sent */
cmd.commit = async (team, price) => {
  const G = await read(); const w = needOpen(G);
  if (!/^1\.[45]0$/.test(price)) throw new Error('price is 1.50 or 1.40');
  if (G.sign[team + '|' + w]) { console.log('  ' + team + ': sign already up'); return; }
  await say(ROOM.prices, team + '|' + w + '|' + price, seatVoter(team, +(opt.who || 1)));
};
cmd.undo = async () => { console.error('There is no undo on the stripped phone: a hold is the sign.'); process.exit(1); };
cmd.week = async (...spec) => {
  const G = await read(); const w = needOpen(G);
  const teams = Object.keys(G.members).sort();
  let plan = {};
  if (spec[0] === 'all') teams.forEach(t => plan[t] = spec[1] || '1.50');
  else if (spec[0] === 'random') teams.forEach(t => plan[t] = Math.random() < .5 ? '1.50' : '1.40');
  else { teams.forEach(t => plan[t] = '1.50'); spec.forEach(x => { const m = x.match(/^([ab][1-5])=(1\.[45]0)$/); if (m) plan[m[1]] = m[2]; }); }
  if (opt.skip) opt.skip.split(',').forEach(t => delete plan[t]);   /* --skip a1 leaves a team for a real phone */
  for (const t of teams) {
    if (G.sign[t + '|' + w] || !plan[t]) continue;
    await say(ROOM.prices, t + '|' + w + '|' + plan[t], seatVoter(t, 1)); await sleep(GAP);
  }
  console.log('Signs posted for week ' + w + (opt.skip ? ' (except ' + opt.skip + ')' : '') + '. Press Prices set on the deck when every sign is up.');
};
cmd.split = async () => { console.error('No team agreement on the stripped phone; nothing to split.'); process.exit(1); };
cmd.ask = async (team, yn) => {
  const G = await read(); if (!G.meetOpen) { console.error('The deck has not offered a meeting (::meet). Press Offer meetings first.'); process.exit(1); }
  /* yes carries the rep's name (seat 1 unless --who n) */
  const who = +(opt.who || 1);
  await say(ROOM.meet, team + '|' + G.meetOpen + '|ask|' + (yn === 'n' ? 'n' : 'y|' + seatName(team, who)), seatVoter(team, 1));
};
cmd.agree = async (team, what) => {
  const G = await read(); const w = G.meetOpen || 3;
  const v = /^1\.[45]0$/.test(what) ? what : 'none';
  await say(ROOM.meet, team + '|' + w + '|agreed|' + seatName(team, +(opt.who || 1)) + '|' + v, seatVoter(team, 1));
};
cmd.note = cmd.agree;
/* the room's dilemmas, one a person (solo since 18 Sep): your side, the other side, the collective action, the individual action; the name is NAMES[i] */
const DILEMMAS = [
  ['Our sales team', 'The rival bidder', 'Quote a sensible margin', 'Undercut to win the tender at any price'],
  ['Our department', 'The other department', 'Share the engineers as the plan says', 'Book them for our project first'],
  ['Us', 'Our biggest customer', 'Flag problems early', 'Keep quiet until the invoice is paid'],
  ['Our airline', 'The airline across the terminal', 'Hold the fare', 'Cut the fare for the weekend'],
  ['Me', 'The colleague I share a bonus pool with', 'Credit the team in the review', 'Take the credit'],
  ['Our shop', 'The shop next door', 'Close at six, like always', 'Stay open till nine'],
  ['Our lessor', 'The airline', 'Return the engine on time', 'Squeeze one more month out of it'],
  ['Our region', 'The other region', 'Stick to the shared price list', 'Discount to hit the quarter'],
  ['The two of us', 'Our co-founder', 'Draw the salary we agreed', 'Take the bonus early'],
  ['Our maintenance shop', 'The regulator', 'Report every defect', 'Log the easy ones'],
  ['Our plant', 'The sister plant', 'Report the real downtime', 'Massage the numbers before the review'],
  ['Our union branch', 'The other branch', 'Hold out for the same deal', 'Settle early for a little more'],
  ['Us', 'The supplier', 'Pay on thirty days', 'Stretch it to ninety'],
  ['Our team', 'The night shift', 'Leave the bay clean', 'Leave it for the next shift'],
  ['Our country office', 'The regional office', 'Share the pipeline', 'Keep the best leads back'],
  ['Me', 'The other candidate', 'Present my own work', 'Take a swipe at theirs'],
  ['Our fleet', 'The other operator on the route', 'Fly the timetable', 'Add a flight ten minutes before theirs'],
  ['Our lab', 'The rival lab', 'Publish when the results are ready', 'Announce the result first and check later'],
  ['Us', 'The lessee', 'Send the records on time', 'Hold the records until the dispute settles'],
  ['Our office', 'Head office', 'Tell them the real forecast', 'Pad it so the cut lands elsewhere'],
  ['Our school', 'The school down the road', 'Keep the admissions date', 'Open the offers a week early'],
  ['Me', 'My manager', 'Say what the project really needs', 'Promise what the board wants to hear'],
  ['Our clinic', 'The clinic across town', 'Keep to the agreed hours', 'Open on Sundays'],
  ['Our farm', 'The farm next door', 'Draw the water we agreed', 'Pump a little more in a dry week'],
  ['The two of us', 'My co-author', 'Do the share we agreed', 'Leave the boring chapter to them'],
  ['Our club', 'The rival club', 'Stay inside the wage cap', 'Pay the one player over it'],
  ['Us', 'The other bidder in the auction', 'Bid what it is worth', 'Bid to keep them from having it'],
  ['Our port', 'The port up the coast', 'Charge the published tariff', 'Cut the fee to take their ships'],
  ['Our company', 'Our biggest competitor', 'Advertise on product', 'Advertise against them'],
  ['Me', 'My flatmate', 'Wash up the same night', 'Leave it for the morning'],
];
cmd.pds = async (n) => {
  const from = +(opt.from || 0); n = Math.min(+n || 15, DILEMMAS.length - from);
  for (let i = from; i < from + n; i++) {
    const [a, b, h, d] = DILEMMAS[i], v = 'trial-pds-' + (i + 1) + '-' + SUF.replace(/[^a-z0-9]/g, '') + '00';
    await say(ROOM.pds, '1‖' + a + '‖' + b + '‖' + NAMES[(2 * i) % NAMES.length] + '‖' + NAMES[(2 * i + 1) % NAMES.length], v); await say(ROOM.pds, '2‖' + h, v); await say(ROOM.pds, '3‖' + d, v);
    await sleep(GAP);
  }
  console.log(n + ' dilemmas in ' + ROOM.pds + '.');
};
/* every phone that has a dilemma answers the way out: r repeat, e enforcer, p payoffs, n no way out, round and round; --only r,e,p,n picks one */
cmd.routes = async () => {
  const E = await entries(ROOM.pds);
  if (!E.some(e => e.t === '::routes')) { console.error('The deck has not opened the way-out question yet (press Open the question on the phones).'); process.exit(1); }
  const groups = [...new Set(E.filter(e => /^1‖/.test(e.t)).map(e => e.v))];
  const R = opt.only ? opt.only.split(',') : ['r', 'e', 'p', 'r', 'n', 'e', 'p', 'r', 'e', 'r', 'n', 'p'];
  for (let i = 0; i < groups.length; i++) { await say(ROOM.pds, '5‖' + R[i % R.length], groups[i]); await sleep(GAP); }
};
cmd.rank = async (n) => {
  console.log('NOTE: m4-axelrod has no room suffix; these rankings go into the real poll. Reset it from Poll Desk afterwards.');
  /* option indexes: Always Cooperate 0, Always Defect 1, Grudger 2, Random 3, Tit for Tat 4, Tit for Two Tats 5; Tester is given */
  const R = [[4, 2, 5, 3, 0, 1], [4, 1, 2, 5, 0, 3], [1, 4, 2, 5, 0, 3], [2, 4, 5, 0, 3, 1], [4, 5, 2, 0, 3, 1], [3, 4, 2, 5, 0, 1], [4, 2, 1, 5, 3, 0], [0, 4, 5, 2, 3, 1]];
  n = Math.min(+n || 5, R.length);
  for (let i = 0; i < n; i++) {
    const v = 'trial-rank-' + (i + 1) + '-' + SUF.replace(/[^a-z0-9]/g, '') + '00';
    const r = await fetch(API + '/p/m4-axelrod/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: 'rank|' + R[i].join(','), v }) });
    if (!r.ok) throw new Error('rank ' + r.status); await sleep(GAP / 4);
  }
  console.log(n + ' rankings in.');
};
cmd.deck = async (what, w, extra) => {
  const v = 'trial-deck-' + SUF.replace(/[^a-z0-9]/g, '') + '0000';
  if (what === 'pair') {
    const G = await read(); const A = Object.keys(G.members).filter(t => t[0] === 'a').sort(), B = Object.keys(G.members).filter(t => t[0] === 'b').sort();
    let bs; do { bs = B.slice().sort(() => Math.random() - .5); } while (A.some((a, i) => bs[i] && a[1] === bs[i][1]) && A.length > 1);
    await say(ROOM.prices, '::pair|' + A.map((a, i) => a + '=' + (bs[i] || '')).filter(x => !x.endsWith('=')).join(','), v); return;
  }
  if (what === 'shock') { await say(ROOM.prices, '::shock|on', v); return; }
  if (what === 'shown') { await say(ROOM.prices, '::shown|' + w + '|' + extra, v); return; }
  if (['paper', 'meet', 'reps', 'open', 'stage', 'reveal'].includes(what) && /^[1-6]$/.test(w)) { await say(ROOM.prices, '::' + what + '|' + w, v); return; }
  if (what === 'routes') { await say(ROOM.pds, '::routes', v); return; }
  throw new Error('deck: pair | paper w | meet w | reps w | open w | stage w | shown w aX | reveal w | shock | routes');
};
/* a look through a bot's eyes: the real phone page in headless Chrome, as one seat sees it now */
cmd.shot = async (seat, extra) => {
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const out = join(dirname(fileURLToPath(import.meta.url)), 'shots'); mkdirSync(out, { recursive: true });
  const profile = mkdtempSync(join(tmpdir(), 'gt-trial-')); const port = 9340 + Math.floor(Math.random() * 50);
  const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  let ws, id = 0; const pending = new Map();
  for (let i = 0; i < 40 && !ws; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = l.find(t => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); } } catch (_) { } if (!ws) await sleep(250); }
  await new Promise(r => ws.onopen = r);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  let url, name;
  if (seat === 'deck') { await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false }); url = SITE + '/teaching/exec/gt/m4/?room=' + SUF.slice(1) + '#' + (extra || 5); name = 'deck-' + (extra || 5); }
  else if (seat === 'desk') { await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }); url = SITE + '/teaching/exec/gt/m4/game/desk/?room=' + SUF.slice(1); name = 'desk'; }
  else if (seat === 'pds') { await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1000, deviceScaleFactor: 1, mobile: true }); url = SITE + '/teaching/exec/gt/m4/pds/?room=' + SUF.slice(1); name = 'pds';
    await send('Page.navigate', { url }); await sleep(1200);
    await send('Runtime.evaluate', { expression: `localStorage.setItem('gt-voter','trial-pds-shot');localStorage.setItem('gt-name','Testy');localStorage.setItem('gt-claimed','Testy')` }); }
  else {
    const n = +(extra || 1);
    await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1000, deviceScaleFactor: 1, mobile: true });
    url = SITE + '/teaching/exec/gt/m4/game/?room=' + SUF.slice(1); name = seat + '-' + n;
    await send('Page.navigate', { url }); await sleep(1200);
    await send('Runtime.evaluate', { expression: `localStorage.setItem('gt-voter',${JSON.stringify(seatVoter(seat, n))});localStorage.setItem('gt-name',${JSON.stringify(seatName(seat, n))});localStorage.setItem('gt-claimed',${JSON.stringify(seatName(seat, n))});localStorage.setItem('pw${SUF}-station',${JSON.stringify(seat)});localStorage.setItem('pw${SUF}-tut','1')` });
  }
  await send('Page.navigate', { url }); await sleep(+(opt.wait || 4000));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = join(out, name + '-' + Date.now() + '.png'); writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log('shot ' + file);
  ws.close(); proc.kill(); await sleep(600); try { rmSync(profile, { recursive: true, force: true }); } catch (_) { }
};

const [c, ...rest] = args;
if (!c || !cmd[c]) { console.error('commands: ' + Object.keys(cmd).join(', ')); process.exit(2); }
if (LIVE && !['pds', 'routes', 'state'].includes(c) && !(c === 'deck' && rest[0] === 'routes')) { console.error('--room live is for pds, routes and deck routes only; Price Wars stays in a rehearsal room.'); process.exit(2); }
try { await cmd[c](...rest); } catch (e) { console.error(e.message); process.exit(1); }
