/* Headless test of the module 1 offers game: the deck's two QR steps and two
   boards, and the phone page, in real Chrome, against a MOCK Worker (a static
   server serves the repo with the Worker's host rewritten to the mock), so
   nothing touches the real m1-av room. No dependencies: a raw CDP driver.

     node teaching/exec/gt/trial/m1-offers.test.mjs [folder for screenshots]

   It plays both games with 22 names and one phone: the QR comes up without
   moving the text, offers stay hidden, the board slide reveals and closes,
   short press accepts, long press rejects (never green on the wire first),
   columns, REJECT THE REST, a changed decision, the phone through yellow,
   green, yellow, red, a late phone, and a reload. Takes about a minute. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const SHOTS = process.argv[2] || await mkdtemp(join(tmpdir(), 'm1-offers-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const PORT = 8137;
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
        if (m[1] === 'm1-av') { if (room.filter(a => a.v === j.v).length >= 15) { res.writeHead(429, CORS); return res.end('{}'); } room.push({ v: j.v, t: j.t }); }
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

const dir = await mkdtemp(join(tmpdir(), 'avtest-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9337', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ver; for (let i = 0; i < 50; i++) { try { ver = await (await fetch('http://localhost:9337/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9337/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' ')); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  await send('Page.navigate', { url }); await sleep(1500);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(SHOTS, name), Buffer.from(r.result.data, 'base64')); };
  const key = async k => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: 39 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: 39 }); };
  const centre = sel => ev(`(()=>{const e=${sel};const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];})()`);
  const pressAt = async (sel, ms) => { await send('Page.bringToFront'); const [x, y] = await centre(sel);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await sleep(ms);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
  return { ev, shot, key, pressAt, errors, send };
}

let fails = 0;
const check = (ok, what) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what); if (!ok) fails++; };
const say = (t, v) => room.push({ v: v || 'bot-' + t.split('|')[0], t });
const base = 'http://localhost:' + PORT;

try {
  /* ---------- the deck, game 1 ---------- */
  const deck = await page(base + '/teaching/exec/gt/m1/#20', 1280, 720);
  await sleep(2800);
  check(!room.length, 'nothing is posted before the QR is up');
  for (let i = 0; i < 5; i++) { await deck.key('ArrowRight'); await sleep(150); }
  await sleep(700);
  const before = await deck.ev(`JSON.stringify([...document.querySelectorAll('.slide.active ul.bullets li')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height];}))`);
  await deck.shot('deck-0-before-qr.png');
  await deck.key('ArrowRight'); await sleep(1200);
  check(before === await deck.ev(`JSON.stringify([...document.querySelectorAll('.slide.active ul.bullets li')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height];}))`), 'the text does not move when the QR comes up');
  check(await deck.ev(`getComputedStyle(document.querySelector('.slide.active .avqr')).display`) === 'flex' && await deck.ev(`getComputedStyle(document.querySelector('.slide.active .sidefig')).visibility`) === 'hidden', 'the QR takes the place of the cards on the sixth press');
  check(room.some(a => a.t === '=game|p|1'), 'deck posts the game 1 marker when the QR comes up');
  const phone = await page(base + '/teaching/exec/gt/m1/game/?g=offer', 390, 800, true);
  await phone.ev(`localStorage.setItem('gt-name','Priya');localStorage.setItem('gt-claimed','Priya');location.reload()`); await sleep(3500);
  check(await phone.ev(`document.body.classList.contains('av-y')`), 'phone is yellow');
  check(await phone.ev(`document.querySelectorAll('.avgrid button').length===9 && !document.querySelector('.avgrid button').disabled`), 'phone shows nine open numbers');
  await phone.shot('phone-1-pick.png');
  await phone.ev(`[...document.querySelectorAll('.avgrid button')].find(b=>b.textContent==='£50').click()`);
  await phone.shot('phone-2-picked.png');
  await phone.ev(`document.querySelector('.avlock').click()`); await sleep(800);
  check(room.some(a => a.t === 'Priya|o|50'), 'phone sends Priya|o|50');
  check(await phone.ev(`document.querySelector('.avbig')?.textContent==='£50' && document.body.classList.contains('av-y')`), 'phone shows its number on yellow while it waits');
  await phone.shot('phone-3-waiting.png');
  const G1 = { Tom: 50, Sam: 40, Elena: 60, Marcus: 50, Nadia: 30, Chris: 50, Dana: 20, Omar: 70, Lucy: 40, Raj: 50, Ines: 60, Pete: 10, Mei: 50, Bartholomew: 50, Ana: 80, Ben: 50, Cara: 50, Dev: 50, Eli: 40, Fern: 50, Gus: 50 };
  Object.entries(G1).forEach(([n, a]) => say(n + '|o|' + a));
  await sleep(3000);
  check(await deck.ev(`document.querySelector('.slide.active [data-avn]').textContent`) === '22', 'count beside the QR reads 22');
  await deck.shot('deck-1-hidden.png');
  await deck.key('ArrowRight'); await sleep(1200);
  check(await deck.ev(`document.querySelectorAll('.slide.active .avname').length`) === 22, 'moving on to the board slide reveals the 22 names');
  check(room.some(a => a.t === '=game|r|1'), 'reveal posts the closing marker');
  check(await deck.ev(`document.querySelector('.slide.active').dataset.i`) === '21', 'still on the board slide after the reveal');
  await deck.shot('deck-2-revealed.png');
  /* a late offer must not appear */
  say('Latecomer|o|50'); await sleep(3000);
  check(!(await deck.ev(`[...document.querySelectorAll('.slide.active .avname')].some(e=>e.textContent==='Latecomer')`)), 'an offer after the reveal is not shown');
  /* short press on Priya: accept */
  const priya = `[...document.querySelectorAll('.slide.active .avname')].find(e=>e.textContent==='Priya')`;
  await deck.pressAt(priya, 80); await sleep(900);
  check(await deck.ev(`${priya}.classList.contains('a')`), 'short press turns Priya green');
  check(room.some(a => a.t === 'Priya|d|50|a|1'), 'decision line Priya|d|50|a|1 posted');
  await sleep(2800);
  check(await phone.ev(`document.body.classList.contains('av-a') && document.querySelector('.avword')?.textContent==='ACCEPTED'`), 'Priya\'s phone turns green, ACCEPTED');
  await phone.shot('phone-4-accepted.png');
  /* long press on Pete: reject, with no green on the way */
  const pete = `[...document.querySelectorAll('.slide.active .avname')].find(e=>e.textContent==='Pete')`;
  await deck.pressAt(pete, 750); await sleep(600);
  check(await deck.ev(`${pete}.classList.contains('r')`), 'long press turns Pete red');
  check(!room.some(a => a.t === 'Pete|d|10|a|1') && room.some(a => a.t === 'Pete|d|10|r|1'), 'Pete was never accepted on the wire');
  /* long press then short press on Pete: a decision can be changed */
  /* column £50: short press accepts everyone still open there */
  const head = v => `[...document.querySelectorAll('.slide.active .avhead')].find(e=>e.textContent==='£${v}')`;
  await deck.pressAt(head(50), 80); await sleep(400);
  check(await deck.ev(`[...document.querySelectorAll('.slide.active .avcol')].find(c=>c.querySelector('.avhead').textContent==='£50').querySelectorAll('.avname.a').length`) === 12, 'short press on £50 turns the whole column green');
  await deck.pressAt(head(80), 750); await sleep(400);
  check(await deck.ev(`[...document.querySelectorAll('.slide.active .avname')].find(e=>e.textContent==='Ana').classList.contains('r')`), 'long press on £80 turns that column red');
  await deck.shot('deck-3-some-decided.png');
  await deck.ev(`document.querySelector('.slide.active [data-avrest="r"]').click()`); await sleep(400);
  check(await deck.ev(`document.querySelectorAll('.slide.active .avname:not(.a):not(.r)').length`) === 0, 'REJECT THE REST leaves nobody undecided');
  check(await deck.ev(`${priya}.classList.contains('a')`), 'and leaves Priya accepted');
  await deck.shot('deck-4-all-decided.png');
  await sleep(4000);
  const decided = new Set(room.filter(a => /\|d\|/.test(a.t)).map(a => a.t.split('|')[0]));
  check(decided.size === 22, 'all 22 decisions reached the room (' + decided.size + ')');
  /* a slip on a column, put right by pressing it again */
  await deck.pressAt(head(40), 750); await sleep(300);
  check(await deck.ev(`[...document.querySelectorAll('.slide.active .avname')].filter(e=>['Sam','Lucy','Eli'].includes(e.textContent)).every(e=>e.classList.contains('r'))`), 'a fully decided column can be pressed again the other way');
  /* ---------- game 2 ---------- */
  await deck.key('ArrowRight'); await sleep(300);
  check(await deck.ev(`document.querySelector('.slide.active').dataset.i`) === '22', 'on What happens if I lose three cards');
  await deck.shot('deck-4b-lose-three.png');
  await deck.key('ArrowRight'); await sleep(900);
  const b2 = await deck.ev(`JSON.stringify([...document.querySelectorAll('.slide.active ul.bullets li')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height];}))`);
  await deck.key('ArrowRight'); await sleep(1500);
  check(b2 === await deck.ev(`JSON.stringify([...document.querySelectorAll('.slide.active ul.bullets li')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height];}))`), 'nor on the lose-three slide');
  await deck.shot('deck-4c-lose-three-qr.png');
  check(room.some(a => a.t === '=game|p|2'), 'deck posts the game 2 marker when the second QR comes up');
  check(await deck.ev(`document.querySelector('.slide.active [data-avn]').textContent`) === '0', 'the second count starts at nought');
  await sleep(2600);
  check(await phone.ev(`document.body.classList.contains('av-y') && !document.querySelector('.avgrid button').disabled && !document.querySelector('.avgrid button.on')`), 'Priya\'s phone is a fresh yellow card for game 2');
  await phone.ev(`[...document.querySelectorAll('.avgrid button')].find(b=>b.textContent==='£50').click();document.querySelector('.avlock').click()`);
  Object.keys(G1).forEach((n, i) => say(n + '|o|' + [90, 50, 80, 90, 70, 50, 60][i % 7], 'bot2-' + n));
  await sleep(3000);
  await deck.key('ArrowRight'); await sleep(1200);
  check(await deck.ev(`document.querySelector('.slide.active').dataset.i`) === '23' && await deck.ev(`document.querySelectorAll('.slide.active .avname').length`) === 22, 'second board shows 22 names');
  await deck.pressAt(head(90), 80); await sleep(300);
  await deck.ev(`document.querySelector('.slide.active [data-avrest="r"]').click()`); await sleep(3500);
  await deck.shot('deck-5-game2.png');
  check(await phone.ev(`document.body.classList.contains('av-r') && document.querySelector('.avword')?.textContent==='REJECTED'`), 'Priya\'s £50 is red on her phone in game 2');
  await phone.shot('phone-5-rejected.png');
  /* a phone that arrives after the reveal */
  const late = await page(base + '/teaching/exec/gt/m1/game/?g=offer', 390, 800, true);
  await late.ev(`localStorage.setItem('gt-voter','late-voter-1');localStorage.setItem('gt-name','Zed');localStorage.setItem('gt-claimed','Zed');location.reload()`); await sleep(3500);
  check(await late.ev(`document.getElementById('status').textContent`) === 'The offers are closed.', 'a late phone is told the offers are closed');
  await late.shot('phone-6-closed.png');
  /* reload of the deck keeps the board and the colours */
  await deck.ev(`location.reload()`); await sleep(4000);
  await deck.ev(`location.hash='#23'`); await sleep(3000);
  check(await deck.ev(`document.querySelectorAll('.slide.active .avname.a').length`) === 6, 'reload keeps game 2: accepted ' + await deck.ev(`document.querySelectorAll('.slide.active .avname.a').length`) + ', rejected ' + await deck.ev(`document.querySelectorAll('.slide.active .avname.r').length`));
  console.log('deck errors:', deck.errors); console.log('phone errors:', phone.errors);
} catch (e) { console.log('TEST CRASHED', e); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK');
chrome.kill(); srv.close(); await sleep(300); await rm(dir, { recursive: true, force: true }).catch(() => {});
process.exit(fails ? 1 : 0);
