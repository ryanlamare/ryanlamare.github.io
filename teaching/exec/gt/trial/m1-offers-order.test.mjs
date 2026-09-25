/* Headless test of the module 1 offers game when the slides are not shown in
   order, or the room still holds an old run (25 Sep 2026). At the venue both
   QRs had been shown before anyone offered, and the first game's offers landed
   on the second board. Same MOCK Worker as m1-offers.test.mjs, so nothing
   touches the real m1-av room.

     node teaching/exec/gt/trial/m1-offers-order.test.mjs

   Showing a game's QR makes that game the open one: after the second QR, the
   first QR opens game 1 again and its offers land on board 1. Going back past
   a QR whose board has been revealed leaves that board alone, also after a
   reload of the deck. A room left over from an old run (undated markers) is
   opened afresh, and its old offers stay off the boards. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const PORT = 8139;
let room = [];
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const srv = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/mock/')) {
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
    const m = url.pathname.match(/^\/mock\/p\/([a-z0-9-]+)\/?(\w+)?$/);
    if (m && m[1] === 'm1-av' && m[2] === 'answers') { res.writeHead(200, { ...CORS, 'content-type': 'application/json' }); return res.end(JSON.stringify({ answers: room.map(a => a.t), total: room.length })); }
    if (m && m[2] === 'say' && req.method === 'POST') {
      let b = ''; req.on('data', c => b += c); req.on('end', () => {
        const j = JSON.parse(b || '{}');
        if (m[1] === 'm1-av') room.push({ v: j.v, t: j.t });
        res.writeHead(200, { ...CORS, 'content-type': 'application/json' }); res.end('{"ok":true}');
      }); return;
    }
    res.writeHead(200, { ...CORS, 'content-type': 'application/json' }); return res.end('{"answers":[],"counts":[],"total":0,"guesses":[]}');
  }
  let p = normalize(decodeURIComponent(url.pathname)); if (p.endsWith('/')) p += 'index.html';
  try {
    let buf = await readFile(join(ROOT, p)); const ext = extname(p);
    if (ext === '.html' || ext === '.js') buf = Buffer.from(String(buf).replaceAll('https://gt-poll.rlamare.workers.dev', 'http://localhost:' + PORT + '/mock'));
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream' }); res.end(buf);
  } catch (_) { res.writeHead(404); res.end('no'); }
}).listen(PORT);

const dir = await mkdtemp(join(tmpdir(), 'avorder-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9339', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:9339/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9339/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  await send('Page.navigate', { url }); await sleep(1500);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const nav = async u => { await send('Page.navigate', { url: u }); await sleep(1500); };
  return { ev, nav, errors };
}

let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const say = (t, v) => room.push({ v: v || 'bot-' + t.split('|')[0], t });
const base = 'http://localhost:' + PORT;
const DECK = base + '/teaching/exec/gt/m1/';
const markers = () => room.map(a => a.t).filter(t => t.startsWith('=game')).map(t => t.split('|').slice(0, 3).join('|'));
const go = async (d, h, ms) => { await d.ev(`location.hash='${h}'`); await sleep(ms || 3200); };
const names = d => d.ev(`[...document.querySelectorAll('.slide.active .avname')].map(e=>e.textContent).sort().join(',')`);
async function phoneAs(name, voter) {
  const ph = await page(base + '/teaching/exec/gt/m1/game/?g=offer', 390, 800, true);
  await ph.ev(`localStorage.setItem('gt-voter',${JSON.stringify(voter)});localStorage.setItem('gt-name',${JSON.stringify(name)});localStorage.setItem('gt-claimed',${JSON.stringify(name)});location.reload()`);
  await sleep(3500);
  return ph;
}
const offer = async (ph, v) => { await ph.ev(`[...document.querySelectorAll('.avgrid button')].find(b=>b.textContent==='£${v}').click();document.querySelector('.avlock').click()`); await sleep(900); };

try {
  /* ---- 1. the venue: both QRs shown before anyone offers, then back to the first ---- */
  const deck = await page(DECK + '#20.6', 1280, 720);
  await sleep(3200);
  check(JSON.stringify(markers()) === JSON.stringify(['=game|p|1']), 'the first QR opens game 1', markers());
  await go(deck, '#21');
  await go(deck, '#22.2');
  check(JSON.stringify(markers()) === JSON.stringify(['=game|p|1', '=game|p|2']), 'the second QR opens game 2', markers());
  await go(deck, '#20.6');
  check(JSON.stringify(markers()) === JSON.stringify(['=game|p|1', '=game|p|2', '=game|p|1']), 'back on the first QR, game 1 is open again', markers());
  const priya = await phoneAs('Priya', 'voter-priya-0001');
  check(await priya.ev(`document.body.classList.contains('av-y') && !document.querySelector('.avgrid button').disabled`), 'a phone scanning the first QR gets a fresh yellow card');
  await offer(priya, 50);
  say('Tom|o|40');
  await sleep(3000);
  check(await deck.ev(`document.querySelector('.slide.active [data-avn]').textContent`) === '2', 'the count beside the first QR reads 2');
  await go(deck, '#21');
  check(await names(deck) === 'Priya,Tom', 'the offers are on the first board', await names(deck));
  check(markers().at(-1) === '=game|r|1', 'the first board closes game 1', markers());
  await go(deck, '#23');
  check(await names(deck) === '', 'and not on the second board', await names(deck));

  /* ---- 2. the second game, then back past the first QR: board 1 is left alone ---- */
  await go(deck, '#22.2');
  check(markers().at(-1) === '=game|p|2', 'the second QR opens game 2', markers());
  say('Sam|o|90');
  await sleep(3000);
  const n2 = markers().length;
  await go(deck, '#20.6');
  check(markers().length === n2, 'going back past the first QR after its board was revealed changes nothing', markers());
  await go(deck, '#21');
  check(await names(deck) === 'Priya,Tom', 'the first board still shows its offers', await names(deck));
  /* the same after a reload of the deck (the reveal is dated, and recent) */
  await deck.nav('about:blank'); await deck.nav(DECK + '#20.6'); await sleep(3200);
  check(markers().length === n2, 'after a reload too', markers());
  await go(deck, '#23');
  check(await names(deck) === 'Sam', 'and the second board has game 2\'s offer', await names(deck));

  /* ---- 3. an old run left in the room (undated markers), opened afresh ---- */
  room = [];
  ['=game|p|1', 'Old|o|50', '=game|r|1', '=game|p|2', 'Old2|o|60', '=game|r|2'].forEach(t => say(t, 'deck-old'));
  const fresh = await page(DECK + '#20.6', 1280, 720);
  await sleep(3500);
  check(markers().at(-1) === '=game|p|1' && markers().length === 5, 'a room left from an old run: the first QR opens game 1 afresh', markers());
  const ben = await phoneAs('Ben', 'voter-ben-00001');
  check(await ben.ev(`document.body.classList.contains('av-y') && !document.querySelector('.avgrid button').disabled`), 'and the phone gets a yellow card, not "closed"');
  await offer(ben, 30);
  await sleep(2600);
  await go(fresh, '#21');
  check(await names(fresh) === 'Ben', 'the first board shows the new offer, not the old run\'s', await names(fresh));
  await go(fresh, '#22.2');
  check(markers().at(-1) === '=game|p|2', 'the second QR opens game 2 afresh too', markers());

  /* ---- 4. an old open game, never revealed, as the latest marker ---- */
  room = [];
  ['=game|p|1', 'Old|o|50'].forEach(t => say(t, 'deck-old'));
  const fresh2 = await page(DECK + '#20.6', 1280, 720);
  await sleep(3500);
  check(markers().length === 2, 'an old, unrevealed game 1 is opened afresh', markers());
  check(await fresh2.ev(`document.querySelector('.slide.active [data-avn]').textContent`) === '0', 'its old offer does not count', await fresh2.ev(`document.querySelector('.slide.active [data-avn]').textContent`));

  const errs = [deck, priya, fresh, ben, fresh2].flatMap(p => p.errors);
  check(errs.length === 0, 'no script errors', errs);
} catch (e) { console.log('TEST CRASHED', e); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK');
chrome.kill(); srv.close(); await sleep(300); await rm(dir, { recursive: true, force: true }).catch(() => {});
process.exit(fails ? 1 : 0);
