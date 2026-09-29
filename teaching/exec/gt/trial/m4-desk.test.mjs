/* Headless test of Price Wars run from Ryan's desk (29 Sep 2026): the desk
   (m4/desk/), four team phones (m4/price/, two junctions), the results slide
   (m4/#6) and a Poll Desk reset, against the REAL worker.js under
   `wrangler dev`, as in m4-price-reset.test.mjs.

     node teaching/exec/gt/trial/m4-desk.test.mjs [folder for screenshots]

   It plays all six weeks in his classroom order (the room first in odd
   weeks, the hall first in even ones), both meeting rounds, the news and a
   changed price, and checks at every step the rule that matters: a team's
   phone shows its own price as soon as Ryan taps it, and its rival's only
   once he has tapped Reveal in front of that team. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const WORKER_DIR = join(ROOT, 'teaching', 'exec', 'gt', 'poll-worker');
const SHOTS = process.argv[2] || await mkdtemp(join(tmpdir(), 'm4-desk-shots-'));
await mkdir(SHOTS, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const WPORT = 8796, PORT = 8156, CDP = 9356, SECRET = 'desk-test-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const persist = await mkdtemp(join(tmpdir(), 'm4-desk-do-'));
const wr = spawn('npx', ['wrangler', 'dev', '--port', String(WPORT), '--var', 'ADMIN_SECRET:' + SECRET, '--persist-to', persist, '--log-level', 'error'], { cwd: WORKER_DIR, stdio: 'ignore' });
let up = false;
for (let i = 0; i < 150 && !up; i++) { try { up = (await fetch(W + '/p/gt-roster/roster')).ok; } catch (_) { await sleep(200); } }
if (!up) { console.log('FAIL  wrangler dev did not start'); wr.kill(); process.exit(1); }

const srv = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = normalize(decodeURIComponent(url.pathname)); if (p.endsWith('/')) p += 'index.html';
  try {
    let buf = await readFile(join(ROOT, p)); const ext = extname(p);
    if (ext === '.html' || ext === '.js') buf = Buffer.from(String(buf).replaceAll('https://gt-poll.rlamare.workers.dev', W));
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream' }); res.end(buf);
  } catch (_) { res.writeHead(404); res.end('no'); }
}).listen(PORT);

const dir = await mkdtemp(join(tmpdir(), 'm4desk-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + CDP, '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:' + CDP + '/json/version')).json(); break; } catch (_) { await sleep(200); } }

/* each phone gets its own browser context, so its localStorage (and its voter id) is its own */
const bws = new WebSocket((await (await fetch('http://localhost:' + CDP + '/json/version')).json()).webSocketDebuggerUrl);
await new Promise(r => bws.onopen = r);
let bid = 0; const bwait = new Map();
bws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && bwait.has(m.id)) { bwait.get(m.id)(m); bwait.delete(m.id); } };
const bsend = (method, params = {}) => new Promise(r => { const i = ++bid; bwait.set(i, r); bws.send(JSON.stringify({ id: i, method, params })); });

async function page(url, w, h, mobile) {
  const ctx = (await bsend('Target.createBrowserContext')).result.browserContextId;
  const tid = (await bsend('Target.createTarget', { url: 'about:blank', browserContextId: ctx })).result.targetId;
  const ws = new WebSocket('ws://localhost:' + CDP + '/devtools/page/' + tid); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await send('Page.navigate', { url }); await sleep(1400);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(join(SHOTS, name), Buffer.from(r.result.data, 'base64')); };
  const nav = async u => { await send('Page.navigate', { url: u }); await sleep(1400); };
  return { ev, shot, errors, nav };
}

let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const click = (sel, text) => `(()=>{const b=[...document.querySelectorAll(${JSON.stringify(sel)})].find(b=>b.textContent.replace(/\\s+/g,' ').trim().includes(${JSON.stringify(text || '')}));if(!b)return false;b.click();return true})()`;

try {
  const B = 'http://localhost:' + PORT + '/teaching/exec/gt/m4/';
  await fetch(W + '/p/gt-roster/roster', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s: SECRET, names: ['Ana', 'Ben', 'Cara', 'Dev', 'Eve', 'Finn', 'Gus', 'Hal'] }) });
  const desk = await page(B + 'desk/', 390, 844, true);
  await desk.ev('window.confirm=()=>true;window.prompt=()=>"Zoe"');
  const phone = {};
  /* one phone a person: A1 has two people (Ana and Dev), each on their own phone */
  const WHO = { a1: 'Ana', a1b: 'Dev', b1: 'Ben', a2: 'Cara', b2: 'Gus' };
  for (const k of ['a1', 'a1b', 'b1', 'a2', 'b2']) {
    const t = k.slice(0, 2);
    phone[k] = await page(B + 'price/', 390, 844, true);
    await phone[k].ev(click('button.opt', t[0] === 'a' ? 'Aura' : 'Buco'));
    await phone[k].ev(click('button.num', t[1]));
    await phone[k].ev(click('button.go', 'Next'));
    for (let i = 0; i < 40 && !(await phone[k].ev(`[...document.querySelectorAll('button.nm')].some(b=>b.textContent===${JSON.stringify(WHO[k])})`)); i++) await sleep(250);   /* the attendee list loads */
    if (k === 'a1') { check((await phone.a1.ev(`document.body.innerText`)).includes('Who are you?'), 'after the junction, the phone asks who are you'); await phone.a1.shot('phone-0-who.png'); }
    check(await phone[k].ev(click('button.nm', WHO[k])), `${t.toUpperCase()}'s phone: ${WHO[k]} taps their own name`);
    if (k === 'a1') { await phone.a1.ev(click('button.nm', 'Ben')); check(await phone.a1.ev(`[...document.querySelectorAll('button.nm.sel')].map(b=>b.textContent).join()`) === 'Ben', 'only one name can be picked'); await phone.a1.ev(click('button.nm', 'Ana')); }
    await phone[k].ev(click('button.go', 'Start'));
  }
  await sleep(800);
  await phone.a1.shot('phone-picker-done.png');

  /* the desk, and a settled view everywhere after each tap */
  const settle = async () => {
    for (let i = 0; i < 40; i++) { if (await desk.ev('D.pending.length') === 0) break; await sleep(150); }
    await sleep(250);
    for (const t in phone) await phone[t].ev('pull()');
    await desk.ev('pull()'); await sleep(700);
  };
  const tile = async t => { await desk.ev(`view=${JSON.stringify(t)};justRevealed=null;render()`); };
  const price = async (t, p) => { await tile(t); check(await desk.ev(click('button.price', p === 'h' ? '1.50' : '1.40')), `desk: ${t.toUpperCase()}'s price ${p === 'h' ? '£1.50' : '£1.40'} tapped`); await settle(); };
  const reveal = async (t, w) => { await tile(t); const txt = await desk.ev(`(document.querySelector('button.reveal')||{}).textContent||''`);
    check(txt.replace(/\s+/g, ' ').includes('Told ' + t.toUpperCase() + ' week ' + w), `desk: Told ${t.toUpperCase()} week ${w} is the next thing`, txt);
    await desk.ev(`document.querySelector('button.reveal').click()`); await settle(); };
  const ownChip = t => phone[t].ev(`(document.querySelector('.status .chip .cv')||{}).textContent||''`);
  const rivalRow = t => phone[t].ev(`[...document.querySelectorAll('.rec .wk')].map(w=>(w.querySelectorAll('.sq')[1].className.split(' ')[1]||'-')).join('')`);
  const h1 = t => phone[t].ev(`(document.querySelector('h1')||{}).textContent||''`);

  check(await desk.ev(`document.querySelector('h1').textContent.includes('Price Wars')`), 'the desk opens on its setup');
  check((await desk.ev(`document.querySelector('.panel .pt').textContent`)) === '2 junctions: 4 teams', 'it works out 2 junctions from the phones that joined', await desk.ev(`document.querySelector('.panel .pt').textContent`));
  check((await desk.ev(`document.body.textContent`)).includes('A1 ✓'), 'it shows which phones are in');
  await desk.shot('desk-0-setup.png');
  await desk.ev(click('button.go', 'Start the game')); await settle();
  await desk.shot('desk-1-board.png');
  check((await h1('a1')).startsWith('Week 1'), 'phones show week 1', await h1('a1'));
  check(await phone.b1.ev(`document.querySelectorAll('table.pm td.c').length`) === 4, 'every phone shows the payoff matrix');
  check((await phone.b1.ev(`document.body.innerText`)).includes('Decide your price and tell Ryan when he comes to your table.'), 'and says what to do: decide your price and tell Ryan');
  check(await phone.b1.ev(`(()=>{const c=document.querySelector('table.pm td.c');return getComputedStyle(c.querySelector('.a')).fontSize===getComputedStyle(c.querySelector('.b')).fontSize})()`), 'both stations\' numbers are the same size');
  await phone.b1.shot('phone-1-week1-hall.png');

  const board = async () => { await desk.ev(`view='board';render()`); };
  const move = async (label) => { await board(); const ok = await desk.ev(`(()=>{const b=[...document.querySelectorAll('button.go')].find(b=>b.textContent.includes(${JSON.stringify(label)}));if(!b||b.disabled)return false;b.click();return true})()`); check(ok, `desk: ${label}`); await settle(); };
  const moveDisabled = async (label) => { await board(); return desk.ev(`(()=>{const b=[...document.querySelectorAll('button.go')].find(b=>b.textContent.includes(${JSON.stringify(label)}));return !!b&&b.disabled})()`); };
  const theirChip = t => phone[t].ev(`(document.querySelectorAll('.status .chip .cv')[1]||{}).textContent||''`);
  const told = reveal;

  /* week 1: the room's prices, then the hall's with their news, then back to tell the room */
  await price('a1', 'h');
  check(await ownChip('a1') === '£1.50', 'A1\'s phone shows its own price as soon as Ryan taps it', await ownChip('a1'));
  check(!(await phone.a1.ev(`document.body.innerText`)).includes('Decide your price'), 'and the decide-your-price line goes once it has');
  check(await ownChip('b1') === '–', 'B1\'s phone shows nothing of A1\'s price', await ownChip('b1'));
  await desk.shot('desk-2-a1-price-set.png');
  await price('a2', 'c');
  check(await moveDisabled('Move everyone to week 2'), 'Move everyone to week 2 waits until every price is in');
  await tile('b1'); await desk.shot('desk-3-b1-visit.png');
  await price('b1', 'c');
  const sheetB1 = await desk.ev(`[...document.querySelectorAll('.sheet .pc')].slice(0,6).map(c=>c.textContent).join(',')+' | '+[...document.querySelectorAll('.sheet .pc')].slice(6,12).map(c=>c.textContent).join(',')`);
  check(sheetB1.startsWith('1.50,') && sheetB1.includes('| 1.40,'), 'at B1 Ryan\'s sheet already shows week 1: A1 1.50, B1 1.40', sheetB1);
  check((await desk.ev(`document.querySelector('button.reveal').textContent`)).includes('A1 posted £1.50'), 'and the Told button names what A1 posted');
  check(await theirChip('b1') === '–', 'before the tap, B1\'s phone does not show A1\'s price', await theirChip('b1'));
  await desk.shot('desk-4-b1-reveal-button.png');
  await told('b1', 1);
  check((await h1('b1')).startsWith('Week 1'), 'after Told B1, B1\'s phone STAYS on week 1', await h1('b1'));
  check(await theirChip('b1') === '£1.50', 'and shows Theirs £1.50 for week 1', await theirChip('b1'));
  check((await phone.b1.ev(`document.body.innerText`)).includes('You earned £18k this week.'), 'and what B1 earned this week');
  check(await theirChip('a1') === '–', 'A1\'s phone still shows nothing of B1\'s price (Ryan has not told A1)', await theirChip('a1'));
  await phone.b1.shot('phone-2-b1-told-week1.png');
  await price('b2', 'h'); await told('b2', 1);
  await told('a1', 1); await told('a2', 1);
  check((await h1('a1')).startsWith('Week 1') && await theirChip('a1') === '£1.40', 'A1 now sees B1\'s £1.40, still in week 1 (going A1, B1, A1 moves nobody on)');
  /* one team at a time: at A1, once it has its results */
  await tile('a1');
  check(await desk.ev(click('button.go', 'Move A1 to week 2')), 'at A1 the desk offers Move A1 to week 2'); await settle();
  check((await h1('a1')).startsWith('Week 2') && (await h1('b1')).startsWith('Week 1'), 'A1 moves to week 2 on its own; B1 stays in week 1', [await h1('a1'), await h1('b1')]);
  check(await ownChip('a1') === '–' && await theirChip('a1') === '–', 'A1\'s week 2 starts fresh');
  await board();
  check((await desk.ev(`document.querySelector('h1').textContent`)).startsWith('Week 1'), 'the board still says week 1 (it follows the team furthest behind)');
  await board();
  check((await desk.ev(`document.querySelector('.panel .pt').textContent`)) === '4 of 4 prices in · 4 of 4 told', 'the board counts prices in and teams told', await desk.ev(`document.querySelector('.panel .pt').textContent`));
  await desk.shot('desk-5-week1-done.png');
  await move('Move everyone to week 2');
  check((await h1('a1')).startsWith('Week 2') && (await h1('b2')).startsWith('Week 2'), 'only Ryan\'s button moves everyone to week 2');
  check(await ownChip('b1') === '–' && await theirChip('b1') === '–', 'week 2 starts fresh on the phone', [await ownChip('b1'), await theirChip('b1')]);
  check((await rivalRow('b1'))[0] === 'h', 'with week 1 in the squares at the bottom', await rivalRow('b1'));
  await phone.b1.shot('phone-3-week2-fresh.png');

  /* week 2: the hall first this time */
  await price('b1', 'h'); await price('b2', 'h'); await price('a1', 'h'); await price('a2', 'h');
  await told('a1', 2); await told('a2', 2); await told('b1', 2); await told('b2', 2);
  await move('Move everyone to the meeting round');

  /* the meeting round before week 3 */
  await board();
  check((await desk.ev(`document.querySelector('h1').textContent`)).includes('Before week 3'), 'the desk heads the board Before week 3');
  check((await h1('a1')) === 'Before week 3', 'A1\'s phone says Before week 3, and asks nothing', await h1('a1'));
  check(await phone.a1.ev(`document.querySelectorAll('button').length`) === 0, 'there is nothing to tap on it');
  check((await phone.a1.ev(`document.querySelector('.mtag').textContent`)) === 'Week 3 pays double', 'the phone heads its matrix: week 3 pays double');
  check(await phone.a1.ev(`Math.round(document.querySelector('table.pm td.c').getBoundingClientRect().height)`) >= 80, 'and the matrix is big');
  await phone.a1.shot('phone-4-round.png');
  await desk.shot('desk-7-meeting-round.png');
  const meet = async (t, yn, who) => { await tile(t); check(await desk.ev(click('button.yn', yn)), `desk: ${t.toUpperCase()} ${yn === 'Yes' ? 'wants' : 'does not want'} to meet`); await settle();
    if (who === 'Zoe') { await desk.ev(click('button.nm', 'Someone else')); check(await desk.ev(`[...document.querySelectorAll('button.nm')].length`) === 9, 'Someone else opens the whole attendee list'); check(await desk.ev(click('button.nm', 'Type a name')), `desk: ${t.toUpperCase()}'s rep is typed in`); await settle(); }
    else if (who) { check(await desk.ev(click('button.nm', who)), `desk: ${t.toUpperCase()}'s rep is ${who}`); await settle(); } };
  await tile('a1');
  check((await desk.ev(`document.querySelector('.team .who').textContent`)).includes('Ana, Dev'), 'the desk names who is on A1', await desk.ev(`document.querySelector('.team .who').textContent`));
  await desk.ev(click('button.yn', 'Yes')); await settle();
  check(await desk.ev(`[...document.querySelectorAll('button.nm')].map(b=>b.textContent).join(',')`) === 'Ana,Dev,Someone else', 'Who would go for A1? offers only A1\'s own names', await desk.ev(`[...document.querySelectorAll('button.nm')].map(b=>b.textContent).join(',')`));
  await meet('a1', 'Yes', 'Ana');
  await desk.shot('desk-7b-a1-rep.png');
  check(await desk.ev(`[...document.querySelectorAll('button.go')].some(b=>b.textContent.includes('Move A1 to week 3'))`), 'once A1 has answered, the desk offers Move A1 to week 3');
  await meet('b1', 'Yes', 'Ben'); await meet('a2', 'Yes', 'Zoe'); await meet('b2', 'No');
  await tile('a1');
  check((await desk.ev(`document.querySelector('.set').textContent`)) === 'Tell A1: you’re meeting Ben from B1.', 'at A1 the desk says what to tell them', await desk.ev(`document.querySelector('.set').textContent`));
  await tile('a2');
  check((await desk.ev(`document.querySelector('.set').textContent`)) === 'Tell A2: B2 said no, so no meeting.', 'and at A2: B2 said no, so no meeting', await desk.ev(`document.querySelector('.set').textContent`));
  await board();
  const outcome = await desk.ev(`document.querySelectorAll('.panel .pt')[1].textContent`);
  check(outcome === 'Junction 1: meeting, Ana (A1) and Ben (B1)Junction 2: no meeting', 'the board lists each junction\'s outcome, with the reps', outcome);
  await desk.shot('desk-8-meetings.png');
  await tile('a1');
  check(await desk.ev(`!document.querySelector('button.price')`), 'no week 3 prices before Ryan opens the week');
  await move('Move everyone to week 3');
  check((await h1('a1')).includes('Week 3') && (await h1('a1')).includes('Pays double'), 'week 3 opens, and the phones say it pays double', await h1('a1'));
  check(await phone.a1.ev(`[...document.querySelectorAll('table.pm td.c')].map(c=>c.textContent).join(' ')`) === '24,24 4,36 36,4 18,18', 'the week 3 matrix is doubled');

  /* week 3, with a changed price */
  await price('a1', 'h');
  await desk.ev(click('button.link', 'Change to £1.40')); await settle();
  check(await ownChip('a1') === '£1.40', 'a changed price shows on A1\'s phone', await ownChip('a1'));
  await price('a2', 'c'); await price('b1', 'h'); await told('b1', 3); await price('b2', 'c'); await told('b2', 3);
  await tile('a1');
  check(!(await desk.ev(`!!document.querySelector('button.link')`)), 'once B1 has heard it, A1\'s week 3 price can no longer change');
  await told('a1', 3); await told('a2', 3);
  await move('Move everyone to week 4');
  /* week 4 */
  await price('b1', 'c'); await price('b2', 'c'); await price('a1', 'c'); await price('a2', 'h');
  await told('a1', 4); await told('a2', 4); await told('b1', 4); await told('b2', 4);
  await move('Stop everyone for the news');
  check((await h1('a1')).startsWith('Stop here'), 'the phones stop for the news, saying nothing about week 5', await h1('a1'));
  check(!(await phone.a1.ev(`document.body.innerText`)).includes('FuelWatch'), 'nothing on the phone mentions FuelWatch before the news');
  await phone.a1.shot('phone-5-stop-for-news.png');
  await desk.shot('desk-9-news.png');
  await move('The news is out');
  check((await h1('b1')) === 'Before week 5', 'after the news, the phones say Before week 5');
  check(await phone.b1.ev(`[...document.querySelectorAll('table.pm td.c')].map(c=>c.textContent).join(' ')`) === '12,12 2,72 72,2 9,9', 'and show the FuelWatch matrix');
  check((await phone.b2.ev(`document.querySelector('.mtag').textContent`)) === 'Weeks 5 and 6: FuelWatch rules', 'headed with the FuelWatch rules');
  /* one no settles junction 2; junction 1 meets again, with a new rep for Aura */
  await meet('a2', 'No');
  await tile('b2');
  check(!(await desk.ev(`!!document.querySelector('button.yn')`)) && (await desk.ev(`document.querySelector('.set').textContent`)) === 'A2 said no. Tell B2: sorry, no meeting.', 'once A2 says no, B2 is not asked: sorry, no meeting', await desk.ev(`(document.querySelector('.set')||{}).textContent`));
  await meet('a1', 'Yes', 'Dev'); await meet('b1', 'Yes', 'Ben');
  await board();
  check((await desk.ev(`document.querySelectorAll('.panel .pt')[1].textContent`)) === 'Junction 1: meeting, Dev (A1) and Ben (B1)Junction 2: no meeting', 'the round is settled without asking B2', await desk.ev(`document.querySelectorAll('.panel .pt')[1]?.textContent`));
  await move('Move everyone to week 5');
  check((await h1('a1')).includes('Week 5') && (await h1('a1')).includes('FuelWatch'), 'week 5 opens under the FuelWatch rules', await h1('a1'));
  await phone.b2.shot('phone-6-week5.png');
  /* weeks 5 and 6: taking turns at junction 1, both cutting at junction 2 */
  await price('a1', 'c'); await price('a2', 'c'); await price('b1', 'h'); await told('b1', 5); await price('b2', 'c'); await told('b2', 5); await told('a1', 5); await told('a2', 5);
  await move('Move everyone to week 6');
  await price('b1', 'c'); await price('b2', 'c'); await price('a1', 'h'); await told('a1', 6); await price('a2', 'c'); await told('a2', 6); await told('b1', 6); await told('b2', 6);
  check((await h1('a1')).includes('Week 6'), 'with every team told, the phones stay on week 6 until Ryan ends the game');
  await move('End the game');
  await board();
  check((await desk.ev(`document.querySelector('h1').textContent`)).includes('Six weeks done'), 'the desk: six weeks done');
  /* the ledgers: A1 h,h,c,c,c,h against B1 c,h,h,c,h,c */
  const exp = (m, t) => { const rev = (w, a, b) => w >= 5 ? (a === 'c' && b === 'h' ? 72 : a === 'h' && b === 'c' ? 2 : a === 'h' ? 12 : 9) : (a === b ? (a === 'h' ? 12 : 9) : (a === 'c' ? 18 : 2)) * (w === 3 ? 2 : 1); let s = 0; for (let w = 0; w < 6; w++) s += rev(w + 1, m[w], t[w]); return s; };
  const A1 = 'hhcccc'.split(''), B1 = 'chhchc'.split(''); A1[5] = 'h';
  const A2 = 'chchcc'.split(''), B2 = 'hhcccc'.split('');
  for (const [t, m, o] of [['a1', A1, B1], ['b1', B1, A1], ['a2', A2, B2], ['b2', B2, A2]]) {
    const got = await phone[t].ev(`document.querySelector('.card .big').textContent`);
    check(got === '£' + exp(m, o) + 'k', `${t.toUpperCase()}'s phone ends on £${exp(m, o)}k`, got);
  }
  await phone.a1.shot('phone-7-done.png');
  await sleep(1500);
  /* the results slide reads the desk's lines */
  const deck = await page(B + '#6', 1280, 720, false);
  await sleep(3500);
  const rows = await deck.ev(`[...document.querySelectorAll('#jres .jrow:not(.head)')].map(r=>r.querySelector('.jn').textContent+' '+[...r.querySelectorAll('.tot')].map(x=>x.textContent).join(' '))`);
  check(rows.length === 2 && rows[0] === `Junction 1 £${exp(A1, B1)}k £${exp(B1, A1)}k` && rows[1] === `Junction 2 £${exp(A2, B2)}k £${exp(B2, A2)}k`, 'What happened at each junction shows both junctions and their totals', rows);
  const mts = await deck.ev(`[...document.querySelectorAll('#jres .jrow:not(.head)')].map(r=>[...r.querySelectorAll('.mt')].map(m=>m.textContent).join('/')).join(' | ')`);
  check(mts === 'MetAnaBen/MetDevBen | Didn’tmeet/Didn’tmeet', 'the results slide names each meeting\'s reps (Ana and Ben, then Dev and Ben)', mts);
  await deck.shot('deck-6-results.png');

  /* a Poll Desk reset: phones back to the picker, the desk back to its setup */
  await fetch(W + '/p/m4-results/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s: SECRET }) });
  await sleep(300);
  for (const t in phone) await phone[t].ev('pull()');
  await desk.ev('pull()'); await sleep(900);
  check((await h1('a1')) === 'Price Wars' && (await phone.a1.ev(`document.body.textContent`)).includes('Which station'), 'after a reset, the phones open on the station picker', await h1('a1'));
  check((await desk.ev(`document.querySelector('.panel .pt').textContent`)) === '4 junctions: 8 teams', 'and the desk on its setup, at four junctions when no phone has joined', await desk.ev(`document.querySelector('.panel .pt').textContent`));

  const errs = [desk, deck, ...Object.values(phone)].flatMap(p => p.errors);
  check(errs.length === 0, 'no script errors on the desk, the phones or the deck', errs);
} catch (e) { console.log('FAIL  the test threw: ' + (e && e.stack || e)); fails++; }

console.log(fails ? fails + ' FAILED' : 'ALL OK');
console.log('screenshots in ' + SHOTS);
chrome.kill(); srv.close(); wr.kill();
process.exit(fails ? 1 : 0);
