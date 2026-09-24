/* Headless test of the Price Wars phone and a Poll Desk reset (24 Sep 2026).
   The REAL worker.js runs under `wrangler dev` with a throwaway secret, as in
   go-roster.test.mjs, and the page is served pointed at it.

     node teaching/exec/gt/trial/m4-price-reset.test.mjs

   Start tells the server the phone has a game (a vote in m4-results, never
   an entry, so the results slide is untouched); a reload keeps the game; a
   reset of the room sends the phone back to the station picker; a game
   stored before the change is dropped; a phone that never reached the
   server keeps its game. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const WORKER_DIR = join(ROOT, 'teaching', 'exec', 'gt', 'poll-worker');
const SHOTS = await mkdtemp(join(tmpdir(), 'm4-price-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const WPORT = 8791, PORT = 8151, DEAD = 8152, SECRET = 'price-test-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* the real Worker, local, with its own throwaway storage */
const persist = await mkdtemp(join(tmpdir(), 'm4-price-do-'));
const wr = spawn('npx', ['wrangler', 'dev', '--port', String(WPORT), '--var', 'ADMIN_SECRET:' + SECRET, '--persist-to', persist, '--log-level', 'error'], { cwd: WORKER_DIR, stdio: 'ignore' });
let up = false;
for (let i = 0; i < 150 && !up; i++) { try { up = (await fetch(W + '/p/gt-roster/roster')).ok; } catch (_) { await sleep(200); } }
if (!up) { console.log('FAIL  wrangler dev did not start'); wr.kill(); process.exit(1); }

/* the site, with the Worker's address pointed at the local one (or, on the
   second port, at nothing, for the out-of-reach case) */
const serve = target => async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = normalize(decodeURIComponent(url.pathname)); if (p.endsWith('/')) p += 'index.html';
  try {
    let buf = await readFile(join(ROOT, p)); const ext = extname(p);
    if (ext === '.html' || ext === '.js') buf = Buffer.from(String(buf).replaceAll('https://gt-poll.rlamare.workers.dev', target));
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream' }); res.end(buf);
  } catch (_) { res.writeHead(404); res.end('no'); }
};
const srv = createServer(serve(W)).listen(PORT);
const dead = createServer(serve('http://localhost:8799')).listen(DEAD);

const dir = await mkdtemp(join(tmpdir(), 'm4price-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9351', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let ver; for (let i = 0; i < 50; i++) { try { ver = await (await fetch('http://localhost:9351/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9351/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  await send('Page.navigate', { url }); await sleep(1500);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const shot = async (name, full) => {
    if (full) { const h = await ev('document.documentElement.scrollHeight'); await send('Emulation.setDeviceMetricsOverride', { width: w, height: Math.max(h, 400), deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile }); await sleep(200); }
    const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(SHOTS, name), Buffer.from(r.result.data, 'base64'));
    if (full) await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  };
  const nav = async u => { await send('Page.navigate', { url: u }); await sleep(1500); };
  return { ev, shot, errors, send, nav };
}


let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const call = async (path, init) => { let r; for (let i = 0; i < 4; i++) { r = await fetch(W + path, init); if (r.status < 500) return r; await sleep(400); } return r; };
const tap = t => `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().replace(/\\s+/g,' ').startsWith(${JSON.stringify(t)}));if(!b)return false;b.click();return true})()`;
const screen = `(document.querySelector('.full .lock,.full .fp')||document.querySelector('h1')||{}).textContent`;
const KEY = 'm4-price-v1';
try {
  await call('/p/m4-results/votes');
  const URL0 = 'http://localhost:' + PORT + '/teaching/exec/gt/m4/price/';
  const ph = await page(URL0, 390, 844, true);
  /* a game stored before tonight's change: no start time */
  await ph.ev(`localStorage.setItem('${KEY}',JSON.stringify({phase:'price',station:'a',j:2,week:3,mine:['h','h'],theirs:['h','h']}));1`);
  await ph.nav(URL0);
  check(await ph.ev(screen) === 'Price Wars', 'an old test game from before the change opens on the station picker', await ph.ev(screen));
  /* start a game, play week 1 */
  for (const t of ['Aura Fuels', '1', 'Start']) { await ph.ev(tap(t)); await sleep(150); }
  await sleep(1200);
  check(/Week 1: your price/.test(await ph.ev(screen)), 'Start opens week 1', await ph.ev(screen));
  const me = await ph.ev(`localStorage.getItem('gt-voter')`);
  const v1 = await (await call('/p/m4-results/votes')).json();
  check(v1.votes[me] !== undefined, 'Start tells the server this phone has a game', v1);
  check(await ph.ev(`JSON.parse(localStorage.getItem('${KEY}')).reg`) === true, 'the phone knows it registered');
  for (const t of ['Unleaded£1.50', 'Lock it in', 'Reveal our price', 'Done', 'Their sign£1.40']) { await ph.ev(tap(t)); await sleep(150); }
  check(await ph.ev(screen) === 'Week 1', 'week 1 played to its result', await ph.ev(screen));
  const e1 = await (await call('/p/m4-results/entries')).json();
  check(e1.total === 0, 'the start vote never reaches the results slide (no entries)', e1);
  /* a reload keeps the game */
  await ph.nav(URL0); await sleep(500);
  check(await ph.ev(screen) === 'Week 1', 'a reload without a reset keeps the game', await ph.ev(screen));
  await ph.shot('1-kept.png');
  /* Poll Desk reset of Price Wars */
  const rr = await call('/p/m4-results/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s: SECRET }) });
  check(rr.ok, 'the room is reset');
  await ph.nav(URL0); await sleep(500);
  check(await ph.ev(screen) === 'Price Wars', 'after a reset the QR opens a fresh game on the station picker', await ph.ev(screen));
  check(await ph.ev(`JSON.parse(localStorage.getItem('${KEY}')).theirs.length`) === 0, 'the old weeks are gone from the phone');
  await ph.shot('2-fresh.png');
  /* and a second game registers again and survives a reload */
  for (const t of ['Buco’s Petrol', '4', 'Start']) { await ph.ev(tap(t)); await sleep(150); }
  await sleep(1200); await ph.nav(URL0); await sleep(500);
  check(/Week 1: your price/.test(await ph.ev(screen)) && await ph.ev(`JSON.parse(localStorage.getItem('${KEY}')).station`) === 'b', 'a second game starts, registers and survives a reload', await ph.ev(screen));
  /* a phone that never reached the server keeps its game */
  const URLD = 'http://localhost:' + DEAD + '/teaching/exec/gt/m4/price/';
  const off = await page(URLD, 390, 844, true);
  for (const t of ['Aura Fuels', '2', 'Start']) { await off.ev(tap(t)); await sleep(150); }
  await sleep(1500); await off.nav(URLD); await sleep(4500);
  check(/Week 1: your price/.test(await off.ev(screen)), 'with the server out of reach the game is kept', await off.ev(screen));
  check(ph.errors.length === 0 && off.errors.length === 0, 'no script errors', ph.errors.concat(off.errors));
} catch (e) { console.log('FAIL  ' + e.message); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK', '(shots in ' + SHOTS + ')');
chrome.kill(); wr.kill(); srv.close(); dead.close(); process.exit(fails ? 1 : 0);
