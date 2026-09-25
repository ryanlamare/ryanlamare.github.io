/* Headless test of the car market's held peek on a phone-sized touch screen
   (25 Sep 2026; the audit's one check that had only been run with a mouse).
   The REAL worker.js runs under `wrangler dev`; bot phones join, the deck
   deals and opens rounds 1 and 2, and a seller's phone is opened with an
   iPhone's screen, user agent and touch input.

     node teaching/exec/gt/trial/m8-car-peek.test.mjs

   Round 2 hides the car: a held finger shows it, a finger that drifts or
   slides right off the card keeps showing it, and a lift or a cancelled
   touch hides it every time. The screen never takes the car's colour
   during a peek, so nobody across the room can read it. */
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
const WPORT = 8796, PORT = 8183, CDP = 9383, SECRET = 'peek-test-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const persist = await mkdtemp(join(tmpdir(), 'm8peek-do-'));
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

const dir = await mkdtemp(join(tmpdir(), 'm8peek-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + CDP, '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await (await fetch(`http://localhost:${CDP}/json/version`)).json(); break; } catch (_) { await sleep(200); } }

async function page(url, phone) {
  const t = await (await fetch(`http://localhost:${CDP}/json/new?` + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  if (phone) {
    await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  } else await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  const nav = async u => { await send('Page.navigate', { url: u }); await sleep(1800); };
  await nav(url);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const key = async k => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: k === 'ArrowRight' ? 39 : 37 }); await sleep(150); };
  const touch = (type, pts) => send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, radiusX: 8, radiusY: 8, force: 1, id: 1 })) });
  return { ev, nav, key, touch, errors };
}

let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const say = (t, v) => fetch(W + '/p/m8-car/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t, v }) });
const lines = async () => (await (await fetch(W + '/p/m8-car/answers')).json()).answers || [];
const SITE = 'http://localhost:' + PORT + '/teaching/exec/gt/m8/';
const BOTS = ['Ana', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay'];
const card = `(()=>{const c=document.querySelector('.card');if(!c)return null;const r=c.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,h:r.height,text:c.textContent.trim(),wash:document.body.className}})()`;
try {
  /* six phones join; the deck deals and opens round 1 */
  for (const n of BOTS) await say(n + '|j', 'bot-' + n.toLowerCase() + '-0000');
  const deck = await page(SITE + '#5');
  await sleep(1500);
  for (let i = 0; i < 6; i++) await deck.key('ArrowRight');
  await sleep(2500);
  let L = await lines();
  check(L.includes('=open|1'), 'round 1 opens', L.filter(l => l[0] === '='));
  const CAR = await deck.ev(`(()=>{const r=CAR.parse(${JSON.stringify(L)});return {sellers:r.sellers}})()`);
  const seller = CAR.sellers[0], Name = seller[0].toUpperCase() + seller.slice(1);

  /* round 1's board stays up and closes the round; then round 2's rules, a step at a time until it opens */
  await deck.key('ArrowRight'); await sleep(6000);
  await deck.key('ArrowRight'); await sleep(600);
  for (let i = 0; i < 8 && !(await lines()).includes('=open|2'); i++) { await deck.key('ArrowRight'); await sleep(900); }
  L = await lines();
  check(L.includes('=open|2') && (await deck.ev(`document.querySelector('.slide.active').dataset.i`)) === '7', 'round 2 opens on its rules slide', L.filter(l => l[0] === '='));

  /* the seller's phone, iPhone-sized, touch only */
  const ph = await page('http://localhost:' + PORT + '/teaching/exec/gt/m8/car/?n=' + Name + '&v=bot-' + seller + '-0000', true);
  await sleep(3500);
  let c = await ph.ev(card);
  check(c && /HOLD TO SEE YOUR CAR/.test(c.text) && c.wash === '', 'round 2: the card is hidden and the screen plain', c);
  /* -webkit-touch-callout is Safari's alone, so Chrome cannot compute it: the page's own source must declare it */
  const cssOk = await ph.ev(`fetch(location.href).then(r=>r.text()).then(t=>{const b=getComputedStyle(document.body),k=getComputedStyle(document.querySelector('.card'));return [b.webkitUserSelect||b.userSelect,/-webkit-touch-callout:none/.test(t)?'none':'missing',k.touchAction].join(' ')})`);
  check(cssOk === 'none none none', 'no text selection, no long-press menu (declared for Safari), no scrolling on the card', cssOk);

  /* hold, drift, slide off the card, lift */
  await ph.touch('touchStart', [[c.x, c.y]]); await sleep(400);
  let h = await ph.ev(card);
  check(h && !/HOLD TO SEE/.test(h.text) && /(lemon|peach)/i.test(h.text), 'a held finger shows the car', h && h.text);
  check(h && h.wash === '', 'the screen does not take the car\'s colour during a peek', h && h.wash);
  for (let k = 1; k <= 6; k++) { await ph.touch('touchMove', [[c.x + k * 3, c.y + k * 4]]); await sleep(60); }
  h = await ph.ev(card);
  check(h && !/HOLD TO SEE/.test(h.text), 'a drifting finger keeps it showing', h && h.text);
  for (let k = 1; k <= 6; k++) { await ph.touch('touchMove', [[c.x + 20, c.y + 24 + k * 30]]); await sleep(60); }
  h = await ph.ev(card);
  check(h && !/HOLD TO SEE/.test(h.text), 'a finger slid right off the card still shows it (the card holds the touch)', h && h.text);
  await ph.touch('touchEnd', []); await sleep(300);
  h = await ph.ev(card);
  check(h && /HOLD TO SEE YOUR CAR/.test(h.text), 'lifting the finger hides the car', h && h.text);

  /* again, five times, then a cancelled touch */
  let hidden = 0;
  for (let r = 0; r < 5; r++) {
    await ph.touch('touchStart', [[c.x - 30 + r * 12, c.y - 20 + r * 8]]); await sleep(250);
    await ph.touch('touchMove', [[c.x - 25 + r * 12, c.y - 12 + r * 8]]); await sleep(80);
    await ph.touch('touchEnd', []); await sleep(250);
    if (/HOLD TO SEE YOUR CAR/.test((await ph.ev(card)).text)) hidden++;
  }
  check(hidden === 5, 'every lift hides the car (5 of 5)', hidden);
  await ph.touch('touchStart', [[c.x, c.y]]); await sleep(250);
  await ph.touch('touchCancel', []); await sleep(300);
  check(/HOLD TO SEE YOUR CAR/.test((await ph.ev(card)).text), 'a cancelled touch hides the car');

  check(deck.errors.length + ph.errors.length === 0, 'no script errors', deck.errors.concat(ph.errors));
} catch (e) { console.log('FAIL  ' + e.message); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK');
chrome.kill(); try { process.kill(-wr.pid); } catch (_) {} srv.close(); process.exit(fails ? 1 : 0);
