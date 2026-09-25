/* Headless test of module 8's car market boards on the deck (25 Sep 2026).
   The REAL worker.js runs under `wrangler dev` with a throwaway secret, and
   the site is served pointed at it; bot phones join and sell by posting the
   wire lines of m8/car/car.js.

     node teaching/exec/gt/trial/m8-car-board.test.mjs

   An empty market is an empty board, not invented names; a stray double
   press that lands on a board mid-round and comes straight back leaves the
   round open; a board that stays up closes its round; a server that drops
   out mid-debrief leaves the room's board on the screen; and the demo, shown
   only when the server was never reached, tells slide 12's story in round
   two (no peach sells). */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const WORKER_DIR = join(ROOT, 'teaching', 'exec', 'gt', 'poll-worker');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const WPORT = 8795, PORT = 8181, DEAD = 8182, SECRET = 'car-test-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const persist = await mkdtemp(join(tmpdir(), 'm8car-do-'));
const wr = spawn('npx', ['wrangler', 'dev', '--port', String(WPORT), '--var', 'ADMIN_SECRET:' + SECRET, '--persist-to', persist, '--log-level', 'error'], { cwd: WORKER_DIR, stdio: 'ignore', detached: true });
let up = false;
for (let i = 0; i < 150 && !up; i++) { try { up = (await fetch(W + '/p/gt-roster/roster')).ok; } catch (_) { await sleep(200); } }
if (!up) { console.log('FAIL  wrangler dev did not start'); process.kill(-wr.pid); process.exit(1); }

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

const dir = await mkdtemp(join(tmpdir(), 'm8car-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9381', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:9381/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url) {
  const t = await (await fetch('http://localhost:9381/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  const nav = async u => { await send('Page.navigate', { url: u }); await sleep(1800); };
  await nav(url);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const key = async k => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: k === 'ArrowRight' ? 39 : 37 }); await sleep(120); };
  return { ev, nav, key, errors };
}

let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const say = (t, v) => fetch(W + '/p/m8-car/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t, v: v || 'bot-' + Math.random().toString(36).slice(2, 12) }) });
const lines = async () => (await (await fetch(W + '/p/m8-car/answers')).json()).answers || [];
const board = `(()=>{const s=document.querySelector('.slide.active');return {demo:getComputedStyle(s.querySelector('[data-cardemo]')).display!=='none',sold:+s.querySelector('[data-carsold]').textContent,chips:[...s.querySelectorAll('.carchips .cchip')].map(c=>c.textContent+':'+(c.classList.contains('P')?'P':c.classList.contains('L')?'L':'?'))}})()`;
const SITE = 'http://localhost:' + PORT + '/teaching/exec/gt/m8/';
const BOTS = ['Ana', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay'];
try {
  /* an empty market: the room is reachable and nobody has joined */
  const deck = await page(SITE + '#6');
  await sleep(1500);
  const b0 = await deck.ev(board);
  check(!b0.demo && b0.sold === 0 && b0.chips.length === 0, 'an empty market is an empty board, with no demo names', b0);

  /* six phones join, the deck deals and opens round 1 */
  for (const n of BOTS) await say(n + '|j', 'bot-' + n.toLowerCase() + '-0000');
  await deck.nav(SITE + '#5'); await sleep(2800);
  for (let i = 0; i < 6; i++) await deck.key('ArrowRight');
  await sleep(2500);
  let L = await lines();
  check(L.some(l => /^=deal\|/.test(l)) && L.includes('=open|1'), 'the last step of the rules slide deals and opens round 1', L.filter(l => l[0] === '='));
  const CAR = await deck.ev(`(()=>{const r=CAR.parse(${JSON.stringify(L)});return {sellers:r.sellers,cars:r.cars[1]}})()`);
  for (const k of CAR.sellers) await say(k[0].toUpperCase() + k.slice(1) + '|s|1|' + (CAR.cars[k] === 'P' ? 3400 : 1200));

  /* a stray double press: onto the board and straight back */
  await deck.key('ArrowRight'); await sleep(900); await deck.key('ArrowLeft');
  await sleep(4800);
  L = await lines();
  check(!L.includes('=close|1'), 'a board left again within four seconds leaves the round open', L.filter(l => l[0] === '='));

  /* the board stays up: the round closes */
  await deck.key('ArrowRight'); await sleep(6000);
  L = await lines();
  check(L.includes('=close|1'), 'a board that stays up closes its round', L.filter(l => l[0] === '='));
  const b1 = await deck.ev(board);
  check(!b1.demo && b1.sold === CAR.sellers.length && b1.chips.length === CAR.sellers.length, 'the board shows the room\'s sales', b1);

  /* the server drops out mid-debrief */
  process.kill(-wr.pid); await sleep(6000);
  const b2 = await deck.ev(board);
  check(!b2.demo && JSON.stringify(b2.chips) === JSON.stringify(b1.chips), 'a server that drops out leaves the room\'s board, not the demo', b2);

  /* the demo, when the server was never reached: round two pools, no peach sells */
  const off = await page('http://localhost:' + DEAD + '/teaching/exec/gt/m8/#8');
  await sleep(4500);
  const b3 = await off.ev(board);
  check(b3.demo && b3.chips.length > 0 && b3.chips.every(c => c.endsWith(':L')), 'with no server, round two\'s demo sells lemons only', b3);
  const prices = await off.ev(`[...document.querySelectorAll('.slide.active .carchips .cchip')].map(c=>parseFloat(c.style.left))`);
  check(prices.length > 0, 'the demo draws its sales');

  check(deck.errors.length + off.errors.length === 0, 'no script errors', deck.errors.concat(off.errors));
} catch (e) { console.log('FAIL  ' + e.message); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK');
chrome.kill(); try { process.kill(-wr.pid); } catch (_) {} srv.close(); dead.close(); process.exit(fails ? 1 : 0);
