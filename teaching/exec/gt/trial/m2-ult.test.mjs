/* Headless test of the module 2 ultimatum game (the board of 20 Sep 2026): two
   phones and the deck in real Chrome, against a MOCK Worker (a static server
   serves the repo with the Worker's host rewritten to the mock), so nothing
   touches the real m2-ultimatum room. The Chrome driver is the one in
   m1-offers.test.mjs.

     node teaching/exec/gt/trial/m2-ult.test.mjs [folder for screenshots]

   A proposer's phone picks one of eleven splits and locks it in, the
   responder's phone sees it and rejects, both phones go red; a second game is
   accepted and both go green. On the deck the count rises with the board
   empty, a keypress shows names under their splits with no outcomes, a name
   click, a column click and REVEAL ALL show green and red, a late pair does
   not move the board, and the Your play line shows everything. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const SHOTS = process.argv[2] || await mkdtemp(join(tmpdir(), 'm2-ult-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const PORT = 8137;
const rooms = {};
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const srv = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/mock/')) {
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
    const m = url.pathname.match(/^\/mock\/p\/([a-z0-9-]+)\/?(\w+)?$/);
    if (m && m[2] === 'answers') { const L = rooms[m[1]] || []; res.writeHead(200, { ...CORS, 'content-type': 'application/json' }); return res.end(JSON.stringify({ answers: L.map(a => a.t), total: L.length })); }
    if (m && m[2] === 'say' && req.method === 'POST') {
      let b = ''; req.on('data', c => b += c); req.on('end', () => {
        const j = JSON.parse(b || '{}'); (rooms[m[1]] = rooms[m[1]] || []).push({ v: j.v, t: j.t });
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

const dir = await mkdtemp(join(tmpdir(), 'ulttest-'));
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
const ult = () => (rooms['m2-ultimatum'] || []).map(a => a.t);
const base = 'http://localhost:' + PORT;
const click = (p, expr) => p.ev(`(${expr}).click()`);
const btn = (sel, text) => `[...document.querySelectorAll('${sel}')].find(b=>b.textContent.includes(${JSON.stringify(text)}))`;

try {
  /* ---------- two phones, one rejected game ---------- */
  const mk = async who => { const p = await page(base + '/teaching/exec/gt/m2/game/?g=ult', 390, 800, true);
    await p.ev(`localStorage.setItem('gt-name',${JSON.stringify(who)});localStorage.setItem('gt-claimed',${JSON.stringify(who)});location.reload()`); await sleep(2500); return p; };
  const A = await mk('Aisha'), T = await mk('Tom');
  check(await A.ev(`document.getElementById('q').textContent`) === 'The ultimatum game', 'the QR lands on the ultimatum game, not on Pick your game');
  await click(T, btn('button.opt', 'waiting')); await sleep(400);
  await click(A, btn('button.opt', 'proposer')); await sleep(400);
  await A.ev(`(()=>{const i=document.querySelector('.namerow input');i.value='Tom';document.querySelector('.namerow button').click();})()`); await sleep(500);
  check(await A.ev(`document.querySelectorAll('.bands button').length`) === 11, 'the proposer sees eleven splits');
  check(await A.ev(`document.querySelector('.send').disabled`), 'LOCK IT IN is off until a split is picked');
  check(await A.ev(`!document.querySelector('input[type=range]')`), 'no slider on the phone');
  await A.shot('phone-1-splits.png');
  await click(A, btn('.bands button', '£800')); await sleep(200);
  await A.shot('phone-2-picked.png');
  await click(A, `document.querySelector('.send')`); await sleep(1200);
  check((rooms['m2-ult-live'] || []).some(a => a.t === 'Aisha|Tom|200'), 'the phone sends Aisha|Tom|200');
  await sleep(3200);
  check(await T.ev(`document.querySelector('.offercard .amt')?.textContent`) === '£200', 'the responder sees £200 land');
  await T.shot('phone-3-offer.png');
  await click(T, btn('button.opt', 'Reject')); await click(T, `document.querySelector('.send')`); await sleep(1000);
  check(ult().includes('Aisha|Tom|200|r'), 'the responder posts Aisha|Tom|200|r');
  check(await T.ev(`document.body.classList.contains('ult-r')`), 'the responder goes red');
  await sleep(3200);
  check(await A.ev(`document.body.classList.contains('ult-r')`), 'the proposer goes red');
  await A.shot('phone-4-red.png');
  /* ---------- play again, accepted ---------- */
  await click(A, btn('.send', 'PLAY AGAIN')); await click(T, btn('.send', 'PLAY AGAIN')); await sleep(500);
  check(await A.ev(`!document.body.classList.contains('ult-r')`), 'PLAY AGAIN takes the colour off');
  await click(T, btn('button.opt', 'waiting')); await click(A, btn('button.opt', 'proposer')); await sleep(400);
  await A.ev(`(()=>{const i=document.querySelector('.namerow input');i.value='Tom';document.querySelector('.namerow button').click();})()`); await sleep(500);
  await click(A, btn('.bands button', '£500')); await click(A, `document.querySelector('.send')`); await sleep(4200);
  await click(T, btn('button.opt', 'Accept')); await click(T, `document.querySelector('.send')`); await sleep(4000);
  check(ult().includes('Aisha|Tom|500|a'), 'the second game posts Aisha|Tom|500|a');
  check(await T.ev(`document.body.classList.contains('ult-a')`) && await A.ev(`document.body.classList.contains('ult-a')`), 'both phones go green');
  await T.shot('phone-5-green.png');

  /* ---------- the deck ---------- */
  const OTHERS = [['Ben', 'Priya', 400, 'a'], ['Cara', 'Marcus', 500, 'a'], ['Dev', 'Sam', 200, 'r'], ['Elena', 'Hana', 500, 'a'], ['Ivan', 'Jo', 10, 'r'], ['Kemi', 'Luis', 100, 'r'], ['Mei', 'Noor', 400, 'r'], ['Owen', 'Rosa', 500, 'a'], ['Theo', 'Uma', 300, 'a'], ['Vik', 'Wen', 600, 'a'], ['Bartholomew', 'Zoe', 500, 'a'], ['Yara', 'Al', 450, 'a']];
  OTHERS.forEach(o => rooms['m2-ultimatum'].push({ v: 'bot-' + o[0], t: o.join('|') }));
  const deck = await page(base + '/teaching/exec/gt/m2/#14', 1280, 720);
  await sleep(3200);
  check(await deck.ev(`document.querySelector('.slide.active h2').textContent.includes('ultimatum')`), 'the deck is on the ultimatum results slide');
  check(await deck.ev(`document.getElementById('ultN').textContent`) === '13', 'the count reads 13 pairs (a replayed pair counts once)');
  check(await deck.ev(`document.querySelectorAll('.ubhead').length===11 && !document.querySelector('.ubname')`), 'eleven columns and no names before the keypress');
  check(await deck.ev(`!document.querySelector('.slide.active .qr')`), 'no QR on the results slide');
  await deck.shot('deck-1-before.png');
  await deck.key('ArrowRight'); await sleep(600);
  check(await deck.ev(`document.querySelectorAll('.ubname').length`) === 13, 'the keypress shows 13 names');
  check(await deck.ev(`!document.querySelector('.ubname.a,.ubname.r')`), 'no outcome shows at the reveal');
  check(await deck.ev(`[...document.querySelectorAll('.ubcol')].find(c=>c.querySelector('.ubhead').textContent==='50/50').querySelectorAll('.ubname').length`) === 5, 'Aisha sits under 50/50 (her latest game) with four others');
  await deck.shot('deck-2-names.png');
  const nm = n => `[...document.querySelectorAll('.ubname')].find(e=>e.textContent===${JSON.stringify(n)})`;
  await deck.pressAt(nm('Dev'), 60); await sleep(300);
  check(await deck.ev(`${nm('Dev')}.classList.contains('r')`) && await deck.ev(`document.querySelectorAll('.ubname.a,.ubname.r').length`) === 1, 'a click on Dev shows red, and nothing else');
  check(await deck.ev(`document.querySelectorAll('.ubname').length`) === 13 && await deck.ev(`document.querySelector('.slide.active h2').textContent.includes('ultimatum')`), 'the click does not move the deck');
  await deck.pressAt(`[...document.querySelectorAll('.ubhead')].find(e=>e.textContent==='60/40')`, 60); await sleep(300);
  check(await deck.ev(`${nm('Ben')}.classList.contains('a') && ${nm('Mei')}.classList.contains('r')`), 'a click on 60/40 shows its column: Ben green, Mei red');
  await deck.shot('deck-3-some.png');
  rooms['m2-ultimatum'].push({ v: 'bot-late', t: 'Late|Comer|300|a' }); await sleep(3000);
  check(await deck.ev(`document.querySelectorAll('.ubname').length`) === 13 && await deck.ev(`document.getElementById('ultN').textContent`) === '13', 'a late pair does not move the board or the count');
  await deck.pressAt(`document.getElementById('ultAll')`, 60); await sleep(300);
  check(await deck.ev(`document.querySelectorAll('.ubname.a').length`) === 9 && await deck.ev(`document.querySelectorAll('.ubname.r').length`) === 4, 'REVEAL ALL: nine green, four red');
  await deck.shot('deck-4-all.png');
  await deck.pressAt(`document.getElementById('ultAll')`, 60); await sleep(300);
  check(await deck.ev(`!document.querySelector('.ubname.a,.ubname.r')`), 'REVEAL ALL again hides them');
  await deck.key('ArrowRight'); await sleep(300); await deck.key('ArrowRight'); await sleep(500);
  check((await deck.ev(`document.querySelector('[data-stepcall="ultVerdict"]').textContent`)).includes('4 of 13'), 'Your play reads 4 of 13 rejected');
  check(await deck.ev(`document.querySelectorAll('.ubname.a,.ubname.r').length`) === 13, 'and every outcome shows with it');
  await deck.key('ArrowRight'); await sleep(400);
  await deck.shot('deck-5-notes.png');
  for (const [n, p] of [['deck', deck], ['proposer', A], ['responder', T]]) check(!p.errors.length, 'no script errors on the ' + n + (p.errors.length ? ': ' + p.errors.join(' / ') : ''));
} catch (e) { console.log('FAIL  the test threw: ' + (e.stack || e)); fails++; }
chrome.kill(); srv.close(); await rm(dir, { recursive: true, force: true }).catch(() => {});
console.log((fails ? fails + ' FAILED' : 'ALL OK') + '. Screenshots: ' + SHOTS);
process.exit(fails ? 1 : 0);
