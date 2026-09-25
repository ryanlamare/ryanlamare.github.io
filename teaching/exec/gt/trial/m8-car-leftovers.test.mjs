/* Headless test of module 8's car market after a click-through (25 Sep
   2026). At the venue the deck was pressed through with no phones in the
   market, which left a deal for nobody and all three rounds opened and
   closed: on the day, slide 6 would not have dealt again, every phone would
   have been a buyer, and every round closed. A deal now counts only if
   someone had joined before it, a round's markers only after that deal, and
   the deck deals nothing to an empty market. The REAL worker.js runs under
   `wrangler dev`.

     node teaching/exec/gt/trial/m8-car-leftovers.test.mjs */
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
const WPORT = 8798, PORT = 8211, SECRET = 'car-leftovers-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const persist = await mkdtemp(join(tmpdir(), 'm8left-do-'));
const wr = spawn('npx', ['wrangler', 'dev', '--port', String(WPORT), '--var', 'ADMIN_SECRET:' + SECRET, '--persist-to', persist, '--log-level', 'error'], { cwd: WORKER_DIR, stdio: 'ignore', detached: true });
let up = false;
for (let i = 0; i < 150 && !up; i++) { try { up = (await fetch(W + '/p/gt-roster/roster')).ok; } catch (_) { await sleep(200); } }
if (!up) { console.log('FAIL  wrangler dev did not start'); process.kill(-wr.pid); process.exit(1); }

const srv = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = normalize(decodeURIComponent(url.pathname)); if (p.endsWith('/')) p += 'index.html';
  try {
    let buf = await readFile(join(ROOT, p)); const ext = extname(p);
    if (ext === '.html' || ext === '.js') buf = Buffer.from(String(buf).replaceAll('https://gt-poll.rlamare.workers.dev', W));
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream' }); res.end(buf);
  } catch (_) { res.writeHead(404); res.end('no'); }
}).listen(PORT);

const dir = await mkdtemp(join(tmpdir(), 'm8left-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9398', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:9398/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9398/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  await send('Page.navigate', { url }); await sleep(1800);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const key = async k => { await send('Page.bringToFront'); for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: k === 'ArrowRight' ? 39 : 37 }); await sleep(150); };
  return { ev, key, errors };
}

let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const call = async (path, init) => { let r; for (let i = 0; i < 4; i++) { r = await fetch(W + path, init); if (r.status < 500) return r; await sleep(400); } return r; };
const say = t => call('/p/m8-car/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t, v: 'bot-' + Math.random().toString(36).slice(2, 12) }) });
const lines = async () => (await (await call('/p/m8-car/answers')).json()).answers || [];
const txt = `document.body.innerText.replace(/\\s+/g,' ')`;
const B = 'http://localhost:' + PORT + '/teaching/exec/gt/m8/';
try {
  /* the room as the venue's click-through left it */
  for (const t of ['=deal|782090228', '=open|1', '=close|1', '=open|2', '=close|2', '=open|3', '=close|3']) await say(t);

  /* a click-through again, still nobody in the market: the last step of slide 6 posts nothing */
  const deck = await page(B + '#5', 1280, 720);
  await sleep(3000);
  for (let i = 0; i < 6; i++) await deck.key('ArrowRight');
  await sleep(3500);
  check((await lines()).length === 7, 'with nobody in the market, the last step of slide 6 deals and opens nothing', await lines());
  const P = await deck.ev(`(()=>{const r=CAR.parse(${JSON.stringify(await lines())});return {deal:r.deal,open:r.open,round:r.round}})()`);
  check(P.deal === null && Object.keys(P.open).length === 0 && P.round === 0, 'the old deal for nobody, and its rounds, count for nothing', P);

  /* the day: a phone and five others join */
  const ana = await page(B + 'car/?n=Ana', 390, 844, true);
  for (const n of ['Ben', 'Cal', 'Dee', 'Eli', 'Fay']) await say(n + '|j');
  await sleep(4000);
  let t = await ana.ev(txt);
  check(/You’re in · 6 in the market/i.test(t) && /Your role arrives when the game starts/.test(t), 'the phone is in the market and waits for its role, not "That’s the game"', t.slice(0, 200));
  check(/6/.test(await deck.ev(`document.querySelector('.slide.active [data-carjoined]').textContent`)), 'the deck counts 6 in the market', await deck.ev(`document.querySelector('.slide.active [data-carjoined]').textContent`));

  /* he presses the last step again once the room is in */
  await deck.key('ArrowLeft'); await sleep(400); await deck.key('ArrowRight'); await sleep(4000);
  const L = await lines();
  check(L.filter(x => x.startsWith('=deal|')).length === 2 && L.filter(x => x === '=open|1').length === 2, 'the deck deals the six and opens round 1 afresh', L);
  const Q = await deck.ev(`(()=>{const r=CAR.parse(${JSON.stringify(L)});return {sellers:r.sellers.length,buyers:r.buyers.length,round:r.round,isOpen:r.isOpen}})()`);
  check(Q.sellers === 3 && Q.buyers === 3 && Q.round === 1 && Q.isOpen, 'three sellers, three buyers, round 1 open', Q);
  await sleep(3000);
  t = await ana.ev(txt);
  check(/You are a car (seller|buyer)/.test(t) && !/closed|That’s the game/.test(t), 'the phone gets its role, in an open round 1', t.slice(0, 200));

  check(deck.errors.length + ana.errors.length === 0, 'no script errors', deck.errors.concat(ana.errors));
} catch (e) { console.log('FAIL  ' + e.message); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK');
chrome.kill(); try { process.kill(-wr.pid); } catch (_) {} srv.close(); process.exit(fails ? 1 : 0);
