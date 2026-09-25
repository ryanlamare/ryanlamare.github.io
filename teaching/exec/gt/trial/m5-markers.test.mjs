/* Headless test of module 5's round markers after a click-through (25 Sep
   2026). At the venue the deck was pressed through with no phones in the
   rooms, which left "::reveal|1", "::open|2" and "::reveal|2" in m5-invest and
   "::open|2" in m5-bos and m5-chicken: every phone would have started in round
   2. A marker now counts only once someone has played before it. The REAL
   worker.js runs under `wrangler dev`, as in m5-reset.test.mjs.

     node teaching/exec/gt/trial/m5-markers.test.mjs

   With the venue's leftovers in the rooms: phones start in round 1 and show no
   result; the boards say ROUND 1 OPEN; the deck's reveal and its forward press
   on the board then play round 1 and open round 2 as on a clean day. */
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
const WPORT = 8797, PORT = 8201, SECRET = 'm5-markers-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const persist = await mkdtemp(join(tmpdir(), 'm5-markers-do-'));
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

const dir = await mkdtemp(join(tmpdir(), 'm5markers-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9397', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:9397/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9397/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  await send('Page.navigate', { url }); await sleep(1800);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const key = async k => { await send('Page.bringToFront'); for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: 39 }); await sleep(150); };
  return { ev, key, errors };
}

let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const call = async (path, init) => { let r; for (let i = 0; i < 4; i++) { r = await fetch(W + path, init); if (r.status < 500) return r; await sleep(400); } return r; };
const say = (room, t) => call('/p/' + room + '/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t, v: 'bot-' + Math.random().toString(36).slice(2, 12) }) });
const lines = async room => (await (await call('/p/' + room + '/answers')).json()).answers || [];
const count = async (room, t) => (await lines(room)).filter(x => x === t).length;
const tap = t => `(()=>{const b=[...document.querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden).find(b=>b.textContent.trim().replace(/\\s+/g,' ').startsWith(${JSON.stringify(t)}));if(!b)return false;b.click();return true})()`;
const txt = `document.body.innerText.replace(/\\s+/g,' ')`;
const B = 'http://localhost:' + PORT + '/teaching/exec/gt/';
try {
  /* the rooms as the venue's click-through left them */
  for (const t of ['::reveal|1', '::open|2', '::reveal|2']) await say('m5-invest', t);
  await say('m5-bos', '::open|2'); await say('m5-chicken', '::open|2');

  /* ---- the investment game ---- */
  const inv = await page(B + 'm5/game/', 390, 844, true);
  await inv.ev(`(()=>{const i=document.querySelector('.namerow input');i.value='Tester';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return 1})()`);
  await sleep(3500);
  let t = await inv.ev(txt);
  check(/Round 1: what do you choose\?/.test(t) && !/of the room invested/i.test(t), 'investment phone: round 1, and no result from the old markers', t.slice(0, 160));
  const deck = await page(B + 'm5/#13', 1280, 720);
  await sleep(3500);
  check(await deck.ev(`document.getElementById('invState').textContent`) === 'ROUND 1 OPEN', 'investment board: ROUND 1 OPEN', await deck.ev(`document.getElementById('invState').textContent`));
  await inv.ev(tap('Invest')); await sleep(100); await inv.ev(tap('LOCK IT IN')); await sleep(1200);
  await say('m5-invest', 'Ana|1|i'); await say('m5-invest', 'Ben|1|d');
  await sleep(3000);
  check(/Response locked in/.test(await inv.ev(txt)), 'round 1 locked on the phone');
  await deck.key('ArrowRight'); await sleep(3500);
  check(await count('m5-invest', '::reveal|1') === 2, 'the reveal posts a new round 1 marker');
  await sleep(3500);
  check(/of the room invested/i.test(await inv.ev(txt)), 'the phone plays round 1\'s result', (await inv.ev(txt)).slice(0, 160));
  await inv.ev(tap('OK')); await sleep(300);
  await deck.key('ArrowRight'); await sleep(3500);
  check(await count('m5-invest', '::open|2') === 2, 'the forward press on the board opens round 2 afresh');
  check(await deck.ev(`document.getElementById('invState').textContent`) === 'ROUND 2 OPEN', 'investment board: ROUND 2 OPEN');
  await sleep(2500);
  check(/Round 2/i.test(await inv.ev(txt)), 'the phone moves to round 2', (await inv.ev(txt)).slice(0, 160));

  /* ---- the two vote games ---- */
  for (const [g, slide, gid] of [['bos', 18, 'bos'], ['chicken', 22, 'chk']]) {
    const room = 'm5-' + g;
    const tp = await page(B + 'm5/tapas/?g=' + g, 390, 844, true);
    await sleep(2500);
    t = await tp.ev(txt);
    check(/Round 1/i.test(t) && !/Round 2/i.test(t), g + ' phone: round 1 despite the old marker', t.slice(0, 160));
    await deck.ev(`location.hash='#${slide}'`); await sleep(3000);
    check(await deck.ev(`document.getElementById('${gid}State').textContent`) === 'ROUND 1 OPEN', g + ' board: ROUND 1 OPEN', await deck.ev(`document.getElementById('${gid}State').textContent`));
    await tp.ev(`document.querySelector('.choices .opt').click()`); await sleep(100); await tp.ev(tap('LOCK IT IN')); await sleep(1500);
    await deck.key('ArrowRight'); await sleep(600); await deck.key('ArrowRight'); await sleep(3500);
    check(await count(room, '::open|2') === 2, g + ': the forward press opens round 2 afresh');
    await sleep(2500);
    check(/Round 2/i.test(await tp.ev(txt)), g + ' phone moves to round 2', (await tp.ev(txt)).slice(0, 160));
    check(tp.errors.length === 0, g + ': no phone errors', tp.errors);
  }
  check(inv.errors.length + deck.errors.length === 0, 'no script errors', inv.errors.concat(deck.errors));
} catch (e) { console.log('FAIL  ' + e.message); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK');
chrome.kill(); try { process.kill(-wr.pid); } catch (_) {} srv.close(); process.exit(fails ? 1 : 0);
