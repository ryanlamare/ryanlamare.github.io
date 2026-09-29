/* Price Wars at full size (29 Sep 2026): four junctions, eight teams, a
   phone a person, against the REAL worker.js under `wrangler dev`, with the
   awkward cases m4-desk.test.mjs does not play: small phones (no sideways
   scroll), a phone reloaded mid-week, a late joiner, the desk losing its
   connection mid-tap (the tap waits on the phone and lands when it is back),
   the desk reloaded mid-game, one team moved on at its table while the rest
   stay, and the results slide for four junctions.

     node teaching/exec/gt/trial/m4-desk-room.test.mjs [folder for screenshots] */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const WORKER_DIR = join(ROOT, 'teaching', 'exec', 'gt', 'poll-worker');
const SHOTS = process.argv[2] || await mkdtemp(join(tmpdir(), 'm4-room-shots-'));
await mkdir(SHOTS, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const WPORT = 8797, PORT = 8157, CDP = 9357, SECRET = 'room-test-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const persist = await mkdtemp(join(tmpdir(), 'm4-room-do-'));
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
const dir = await mkdtemp(join(tmpdir(), 'm4room-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + CDP, '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:' + CDP + '/json/version')).json(); break; } catch (_) { await sleep(200); } }
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
  await send('Page.navigate', { url }); await sleep(1200);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile(join(SHOTS, name), Buffer.from(r.result.data, 'base64')); };
  const nav = async u => { await send('Page.navigate', { url: u }); await sleep(1400); };
  return { ev, shot, errors, nav, w };
}
let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const click = (sel, text) => `(()=>{const b=[...document.querySelectorAll(${JSON.stringify(sel)})].find(b=>b.textContent.replace(/\\s+/g,' ').trim().includes(${JSON.stringify(text || '')}));if(!b||b.disabled)return false;b.click();return true})()`;
const rev = (w, a, b) => w >= 5 ? (a === 'c' && b === 'h' ? 72 : a === 'h' && b === 'c' ? 2 : a === 'h' ? 12 : 9) : (a === b ? (a === 'h' ? 12 : 9) : (a === 'c' ? 18 : 2)) * (w === 3 ? 2 : 1);

const NAMES = ['Alex', 'Bea', 'Cal', 'Dana', 'Eli', 'Fay', 'Gil', 'Hana', 'Ian', 'Jo', 'Kai', 'Lea', 'Max', 'Nia', 'Oli', 'Pia', 'Quin', 'Rae', 'Sol', 'Tia', 'Uma', 'Vic', "Wes O'Neil", 'Xan', 'Yas', 'Zed'];
/* six weeks each: a1/b1 hold throughout, a2/b2 cut throughout, the rest mixed */
const P = { a1: 'hhhhhh', b1: 'hhhhhh', a2: 'cccccc', b2: 'cccccc', a3: 'hchchc', b3: 'hhcchh', a4: 'chhhhc', b4: 'hhhhcc' };
const TEAMS = ['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4'];
const WHO = { a1: 'Alex', a2: 'Bea', a3: 'Cal', a4: 'Dana', b1: 'Eli', b2: 'Fay', b3: 'Gil', b4: "Wes O'Neil" };
const SIZE = { a3: [375, 667], b3: [360, 740] };   /* an iPhone SE and a small Android */

try {
  await fetch(W + '/p/gt-roster/roster', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s: SECRET, names: NAMES }) });
  const B = 'http://localhost:' + PORT + '/teaching/exec/gt/m4/';
  const desk = await page(B + 'desk/', 390, 844, true);
  await desk.ev('window.confirm=()=>true');
  const phone = {};
  const join = async (key, t, who, size) => {
    const [w, h] = size || [390, 844];
    const p = phone[key] = await page(B + 'price/', w, h, true);
    await p.ev(click('button.opt', t[0] === 'a' ? 'Aura' : 'Buco')); await p.ev(click('button.num', t[1])); await p.ev(click('button.go', 'Next'));
    const t0 = Date.now(); for (let i = 0; i < 120 && !(await p.ev(`[...document.querySelectorAll('button.nm')].some(b=>b.textContent===${JSON.stringify(who)})`)); i++) await sleep(250);
    if (Date.now() - t0 > 3000) console.log(`      (${who}'s list took ${((Date.now() - t0) / 1000).toFixed(1)} s to arrive)`);
    check(await p.ev(click('button.nm', who)) && await p.ev(click('button.go', 'Start')), `${t.toUpperCase()}: ${who} joins`);
  };
  for (const t of TEAMS) await join(t, t, WHO[t], SIZE[t]);
  await sleep(1500); await desk.ev('pull()'); await sleep(600);
  check((await desk.ev(`document.querySelector('.panel .pt').textContent`)) === '4 junctions: 8 teams', 'the desk works out 4 junctions', await desk.ev(`document.querySelector('.panel .pt').textContent`));
  check((await desk.ev(`document.body.textContent`)).includes('A4 ✓') && (await desk.ev(`document.body.textContent`)).includes('B4 ✓'), 'with every team\'s phone in');
  await desk.ev(click('button.go', 'Start the game'));

  const settle = async () => { for (let i = 0; i < 60; i++) { if (await desk.ev('D.pending.length') === 0) break; await sleep(150); } await sleep(200); await desk.ev('pull()'); await sleep(400); };
  const pullAll = async () => { for (const k in phone) await phone[k].ev('pull()'); await sleep(700); };
  const tile = t => desk.ev(`view=${JSON.stringify(t)};showAll=false;render()`);
  const price = async (t, w) => { await tile(t); const p = P[t][w - 1]; check(await desk.ev(click('button.price', p === 'h' ? '1.50' : '1.40')), `desk: ${t.toUpperCase()} week ${w} ${p === 'h' ? '£1.50' : '£1.40'}`); await settle(); };
  const told = async (t, w) => { await tile(t); check(await desk.ev(click('button.reveal', 'Told ' + t.toUpperCase() + ' week ' + w)), `desk: Told ${t.toUpperCase()} week ${w}`); await settle(); };
  const board = () => desk.ev(`view='board';render()`);
  const move = async label => { await board(); check(await desk.ev(click('button.go', label)), `desk: ${label}`); await settle(); };
  const h1 = k => phone[k].ev(`(document.querySelector('h1')||{}).textContent||''`);
  const chips = k => phone[k].ev(`[...document.querySelectorAll('.status .chip .cv')].map(c=>c.textContent).join(' ')`);
  const week = async w => {   /* the room first, then the hall with its news, then the room's news */
    for (const t of ['a1', 'a2', 'a3', 'a4']) await price(t, w);
    for (const t of ['b1', 'b2', 'b3', 'b4']) { await price(t, w); await told(t, w); }
    for (const t of ['a1', 'a2', 'a3', 'a4']) await told(t, w);
  };

  /* small phones: nothing runs off the side */
  await pullAll();
  for (const k of ['a3', 'b3']) check(await phone[k].ev('document.documentElement.scrollWidth<=innerWidth'), `${k.toUpperCase()} (${phone[k].w}px wide) has no sideways scroll`, await phone[k].ev('[document.documentElement.scrollWidth,innerWidth]'));
  check(await phone.b3.ev(`(()=>{const r=document.querySelector('.who').getClientRects();return r.length===1})()`), 'the station and junction stay on one line on a small phone');
  await phone.a3.shot('small-a3-375.png'); await phone.b3.shot('small-b3-360.png');
  check(await desk.ev('document.documentElement.scrollWidth<=innerWidth'), 'the desk has no sideways scroll with four junctions');

  /* week 1, with a reload and a late joiner along the way */
  for (const t of ['a1', 'a2', 'a3', 'a4']) await price(t, 1);
  await phone.b2.nav(B + 'price/'); await sleep(800);
  check((await phone.b2.ev(`document.querySelector('.who').textContent`)).includes('Junction 2') && (await h1('b2')).startsWith('Week 1'), 'B2 reloaded mid-week keeps its team and its week');
  await join('a1late', 'a1', 'Zed');
  await settle(); await tile('a1');
  check((await desk.ev(`document.querySelector('.team .who').textContent`)).includes('Alex, Zed'), 'a late joiner is added to A1\'s names', await desk.ev(`document.querySelector('.team .who').textContent`));
  for (const t of ['b1', 'b2', 'b3', 'b4']) { await price(t, 1); await told(t, 1); }
  for (const t of ['a1', 'a2', 'a3', 'a4']) await told(t, 1);
  await pullAll();
  check((await h1('a1late')).startsWith('Week 1') && (await chips('a1late')) === '£1.50 £1.50', 'the late joiner\'s phone shows A1\'s week 1 like the rest', await chips('a1late'));
  /* one team moved on at its table, the rest still in week 1 */
  await tile('a3'); check(await desk.ev(click('button.go', 'Move A3 to week 2')), 'desk: Move A3 to week 2'); await settle(); await pullAll();
  check((await h1('a3')).startsWith('Week 2') && (await h1('b3')).startsWith('Week 1'), 'A3 is in week 2, B3 still in week 1');
  await board(); check((await desk.ev(`document.querySelector('h1').textContent`)).startsWith('Week 1'), 'the board still says week 1');
  check((await desk.ev(`[...document.querySelectorAll('.sheet .tl')].filter(b=>b.querySelector('.dot')).map(b=>b.textContent).join()`)) === 'A3', 'with every team told, only A3 (moved on, owing its week 2 price) carries a red dot', await desk.ev(`[...document.querySelectorAll('.sheet .tl')].filter(b=>b.querySelector('.dot')).map(b=>b.textContent).join()`));
  await desk.shot('room-board-week1.png');
  await move('Move everyone to week 2'); await pullAll();
  check((await Promise.all(TEAMS.map(h1))).every(x => x.startsWith('Week 2')), 'everyone is in week 2');

  /* week 2, with the desk offline for one tap */
  await desk.ev(`window.__off=true;window.__f=window.__f||window.fetch;window.fetch=(u,o)=>window.__off&&o&&o.method==='POST'?Promise.reject(new Error('off')):window.__f(u,o)`);
  await tile('a1'); await desk.ev(click('button.price', '1.50')); await sleep(500);
  check(await desk.ev('D.pending.length') === 1 && (await desk.ev(`document.querySelector('.tag').textContent`)).includes('Saving 1'), 'offline, the tap waits on the desk and it says Saving 1');
  check((await desk.ev(`[...document.querySelectorAll('.sheet .pc')][1].textContent`)) === '1.50', 'and Ryan\'s sheet already shows it');
  await pullAll(); check((await chips('a1')).startsWith('–'), 'A1\'s phone does not have it yet');
  await desk.ev(`window.__off=false;flush()`); await settle(); await pullAll();
  check(await desk.ev('D.pending.length') === 0 && (await chips('a1')).startsWith('£1.50'), 'back online, the tap lands and A1\'s phone shows it');
  for (const t of ['a2', 'a3', 'a4']) await price(t, 2);
  /* the desk reloaded mid-week keeps everything */
  await desk.nav(B + 'desk/'); await desk.ev('window.confirm=()=>true'); await sleep(1500);
  const cells = await desk.ev(`[...document.querySelectorAll('.jcard')].map(c=>[...c.querySelectorAll('.pc')].map(x=>x.textContent||'-').join('')).join('|')`);
  check(cells.split('|').every((c, i) => c.startsWith(`${P['a' + (i + 1)][0] === 'h' ? '1.50' : '1.40'}${P['a' + (i + 1)][1] === 'h' ? '1.50' : '1.40'}`)), 'the desk, reloaded, still has every price', cells);
  for (const t of ['b1', 'b2', 'b3', 'b4']) { await price(t, 2); await told(t, 2); }
  for (const t of ['a1', 'a2', 'a3', 'a4']) await told(t, 2);

  /* the meeting round: junctions 1 and 3 meet, 2 and 4 do not */
  await move('Move everyone to the meeting round'); await pullAll();
  check((await Promise.all(TEAMS.map(h1))).every(x => x === 'Before week 3'), 'every phone: Before week 3');
  const meet = async (t, yn, who) => { await tile(t); if (!(await desk.ev(`!!document.querySelector('button.yn')`))) return; await desk.ev(click('button.yn', yn)); await settle(); if (who) { await desk.ev(click('button.nm', who)); await settle(); } };
  await meet('a1', 'Yes', 'Zed'); await meet('b1', 'Yes', 'Eli'); await meet('a2', 'No'); await meet('b2', 'Yes', 'Fay');
  await meet('a3', 'Yes', 'Cal'); await meet('b3', 'Yes', 'Gil'); await meet('a4', 'Yes', 'Dana'); await meet('b4', 'No');
  await board();
  check((await desk.ev(`document.querySelectorAll('.panel .pt')[1].textContent`)) === 'Junction 1: meeting, Zed (A1) and Eli (B1)Junction 2: no meetingJunction 3: meeting, Cal (A3) and Gil (B3)Junction 4: no meeting', 'the board lists four outcomes', await desk.ev(`document.querySelectorAll('.panel .pt')[1]?.textContent`));
  await move('Send the reps to meet'); await pullAll();
  check((await phone.b3.ev(`document.body.innerText`)).includes('Gil is meeting Cal from Aura'), 'B3\'s phone: Gil is meeting Cal');
  check((await phone.a2.ev(`document.body.innerText`)).includes('No meeting this time.'), 'A2\'s phone: no meeting');
  await move('The reps are back: move everyone to week 3');
  await week(3); await move('Move everyone to week 4');
  await week(4); await move('Stop everyone for the news'); await move('The news is out');
  for (const t of TEAMS) await meet(t, 'No');
  await move('Send the reps to meet'); await move('The reps are back: move everyone to week 5');
  await week(5); await move('Move everyone to week 6');
  await week(6); await move('End the game'); await pullAll();
  for (const t of TEAMS) {
    const r = (t[0] === 'a' ? 'b' : 'a') + t[1]; let e = 0; for (let w = 1; w <= 6; w++) e += rev(w, P[t][w - 1], P[r][w - 1]);
    const got = await phone[t].ev(`document.querySelector('.card .big').textContent`);
    check(got === '£' + e + 'k', `${t.toUpperCase()} ends on £${e}k`, got);
  }
  await sleep(1500);
  const deck = await page(B + '#6', 1280, 720, false);
  await sleep(3500);
  const rows = await deck.ev(`[...document.querySelectorAll('#jres .jrow:not(.head)')].map(r=>r.querySelector('.jn').textContent+' '+[...r.querySelectorAll('.tot')].map(x=>x.textContent).join(' ')+' '+[...r.querySelectorAll('.mt')].map(m=>m.textContent).join('/'))`);
  const want = [1, 2, 3, 4].map(j => { let ta = 0, tb = 0; for (let w = 1; w <= 6; w++) { ta += rev(w, P['a' + j][w - 1], P['b' + j][w - 1]); tb += rev(w, P['b' + j][w - 1], P['a' + j][w - 1]); } return `Junction ${j} £${ta}k £${tb}k`; });
  check(rows.length === 4 && rows.every((r, i) => r.startsWith(want[i])), 'the results slide shows all four junctions with the right totals', rows);
  check(rows[0].endsWith('MetZedEli/Didn’tmeet') && rows[2].endsWith('MetCalGil/Didn’tmeet'), 'and the week 3 reps', rows.map(r => r.split(' ').slice(-1)[0]));
  await deck.shot('room-results.png');
  const errs = [desk, deck, ...Object.values(phone)].flatMap(p => p.errors);
  check(errs.length === 0, 'no script errors anywhere', errs);
} catch (e) { console.log('FAIL  the test threw: ' + (e && e.stack || e)); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK');
console.log('screenshots in ' + SHOTS);
chrome.kill(); srv.close(); wr.kill();
process.exit(fails ? 1 : 0);
