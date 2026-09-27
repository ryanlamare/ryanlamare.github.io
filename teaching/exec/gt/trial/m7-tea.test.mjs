/* Headless test of Module 7's negotiation game, Who blinks first? (27 Sep
   2026): phones and the deck in real Chrome against a MOCK Worker (a static
   server serves the repo with the Worker's host rewritten to the mock), so
   nothing touches the real m7-tea room. Each port is a separate phone with
   its own storage. The Chrome driver is the one in m2-boards.test.mjs.

     node teaching/exec/gt/trial/m7-tea.test.mjs [folder for screenshots]

   Two names decide the side the same way on both phones; a phone keeps its
   brief; neither brief's page holds the other's private lines, and no phone
   page knows where the answer lives. Hartwell's reports the deal (the rise
   as a number from 0 to 10, or no deal) and both sides answer one question;
   everything locks once sent and a Poll Desk reset unlocks it. On the deck,
   the board counts pairs, one keypress shows a row a pair with the rise as a
   bar, a click opens a row, the second keypress shows each side's count, G
   on the next slide opens the answer page, and its arrows lead back into
   the deck on either side. ?demo=1 shows invented pairs marked DEMO DATA. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const SHOTS = process.argv[2] || await mkdtemp(join(tmpdir(), 'm7-tea-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const MOCK = 8170, PORTS = [8171, 8172, 8173, 8174, 8175, 8176];   /* 8173 is the deck; the rest are phones */
const rooms = {};
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const J = (res, o) => { res.writeHead(200, { ...CORS, 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
const mock = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const m = url.pathname.match(/^\/mock\/p\/([a-z0-9-]+)\/?(\w+)?$/);
  if (m && m[2] === 'entries') { const L = rooms[m[1]] || []; return J(res, { entries: L, total: L.length }); }
  if (m && m[2] === 'answers') { const L = rooms[m[1]] || []; return J(res, { answers: L.map(a => a.t), total: L.length }); }
  if (m && m[2] === 'say' && req.method === 'POST') {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      const j = JSON.parse(b || '{}'); (rooms[m[1]] = rooms[m[1]] || []).push({ v: j.v, t: j.t }); J(res, { ok: true });
    }); return;
  }
  return J(res, { answers: [], counts: [], total: 0, entries: [] });
}).listen(MOCK);
const serve = async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = normalize(decodeURIComponent(url.pathname)); if (p.endsWith('/')) p += 'index.html';
  try {
    let buf = await readFile(join(ROOT, p)); const ext = extname(p);
    if (ext === '.html' || ext === '.js') buf = Buffer.from(String(buf).replaceAll('https://gt-poll.rlamare.workers.dev', 'http://localhost:' + MOCK + '/mock'));
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream' }); res.end(buf);
  } catch (_) { res.writeHead(404); res.end('no'); }
};
const srvs = PORTS.map(p => createServer(serve).listen(p));

const dir = await mkdtemp(join(tmpdir(), 'teatest-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9377', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:9377/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9377/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  const nav = async u => { await send('Page.navigate', { url: u }); await sleep(1500); };
  await nav(url);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const shot = async name => {
    if (mobile) { const hh = await ev('document.documentElement.scrollHeight'); await send('Emulation.setDeviceMetricsOverride', { width: w, height: Math.max(hh, 400), deviceScaleFactor: 2, mobile: true }); await sleep(200); }
    const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(SHOTS, name), Buffer.from(r.result.data, 'base64'));
    if (mobile) await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true }); };
  const key = async (k, vk) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k.length === 1 ? 'Key' + k.toUpperCase() : k, windowsVirtualKeyCode: vk }); await sleep(300); };
  return { ev, nav, shot, key, errors, send };
}

let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const U = (p, path) => 'http://localhost:' + p + '/teaching/exec/gt/' + path;
const lines = () => (rooms['m7-tea'] || []).map(a => a.t);
const names = (ph, me, them) => ph.ev(`(()=>{document.getElementById('me').value=${JSON.stringify(me)};document.getElementById('them').value=${JSON.stringify(them)};document.querySelector('#names button').click();return 1})()`);
const all = [];
try {
  /* ---- the brief pages hold only their own side, and nothing points at the answer ---- */
  const src = async path => (await readFile(join(ROOT, 'teaching/exec/gt/' + path))).toString();
  const H = await src('m7/tea/h2x/index.html'), S = await src('m7/tea/s9k/index.html'), L = await src('m7/tea/index.html'), D = await src('m7/index.html');
  check(!H.includes('one in ten') && !H.includes('six months away'), "Hartwell's page holds none of Selwood's private lines");
  check(!S.includes('a quarter of it') && !S.includes('flat out'), "Selwood's page holds none of Hartwell's private lines");
  check(![H, S, L].some(x => /q4d|bluff|neither side/i.test(x)), 'no phone page names the answer page or the answer');
  check(!/bluff|neither side would/i.test(D), 'nor does the deck, in its words or its comments');

  /* ---- two names decide the side, the same way on both phones ---- */
  const a = await page(U(8171, 'm7/tea/'), 390, 844, true); all.push(a);
  const b = await page(U(8172, 'm7/tea/'), 390, 844, true); all.push(b);
  await a.shot('tea-landing.png');
  await names(a, 'Ana', 'Ben'); await names(b, 'Ben', 'Ana'); await sleep(1500);
  check(await a.ev('location.pathname').then(p => p.endsWith('/m7/tea/h2x/')), 'Ana, first in the alphabet, plays Hartwell’s');
  check(await b.ev('location.pathname').then(p => p.endsWith('/m7/tea/s9k/')), 'Ben plays Selwood’s');
  check(await a.ev(`document.getElementById('who').textContent`) === 'Your partner: Ben', 'the brief names the partner');
  check(await a.ev(`document.getElementById('a0').value`) === 'Ana & Ben', 'the pair is filled in');
  await a.shot('tea-hartwells.png'); await b.shot('tea-selwoods.png');
  await a.nav(U(8171, 'm7/tea/s9k/'));
  check(await a.ev(`!document.getElementById('lock').hidden&&document.getElementById('brief').hidden`), 'a phone that holds one brief is shown a note at the other address');
  await a.nav(U(8171, 'm7/tea/'));
  check(await a.ev('location.pathname').then(p => p.endsWith('/m7/tea/h2x/')), 'the landing sends it back to its own brief');

  /* ---- Hartwell's reports the deal; nothing sends until it is whole ---- */
  const submit = ph => ph.ev(`(()=>{document.querySelector('#agree button[type=submit]').click();return document.getElementById('amsg').textContent})()`);
  const rise = (ph, v) => ph.ev(`(()=>{document.getElementById('a1').value=${JSON.stringify(v)};return 1})()`);
  const yn = (ph, v) => ph.ev(`(()=>{document.querySelector('.yn button[data-b="${v}"]').click();return 1})()`);
  await rise(a, '4,5');
  check(/yes or no/.test(await submit(a)), 'no answer to the question: nothing sends');
  await yn(a, 'No');
  await rise(a, 'abc'); check(/from 0 to 10/.test(await submit(a)), '"abc" is refused');
  await rise(a, '11'); check(/from 0 to 10/.test(await submit(a)), '11 is refused');
  check(lines().length === 0, 'nothing refused reached the server');
  await rise(a, '4,5'); await a.ev(`(()=>{document.getElementById('a2').value='The rise starts in March';return 1})()`);
  await submit(a); await sleep(1200);
  check(JSON.stringify(lines()) === JSON.stringify(['0‖Ana & Ben', '1‖4.5', '2‖The rise starts in March', 'b‖h‖No']), 'Hartwell’s sends the pair, 4.5, the extra and its answer', lines());
  check(await a.ev(`document.getElementById('agree').hidden&&!document.getElementById('adone').hidden`), 'and is locked in');
  await a.nav(U(8171, 'm7/tea/h2x/')); await sleep(800);
  check(await a.ev(`document.getElementById('agree').hidden`), 'a reload stays locked');

  /* ---- Selwood's answers its one question ---- */
  await b.ev(`(()=>{document.querySelector('#agree button[type=submit]').click();return 1})()`);
  check(lines().length === 4, 'Selwood’s sends nothing without an answer');
  await yn(b, 'Yes'); await submit(b); await sleep(1200);
  check(lines()[4] === 'b‖s‖Yes' && lines().length === 5, 'Selwood’s sends its answer, and only that', lines());

  /* ---- a second pair with no deal ---- */
  const c = await page(U(8174, 'm7/tea/'), 390, 844, true); all.push(c);
  await names(c, 'Cara', 'Dev'); await sleep(1500);
  await c.ev(`(()=>{const x=document.getElementById('anone');x.checked=true;x.dispatchEvent(new Event('change'));return 1})()`);
  check(await c.ev(`document.getElementById('a1').closest('label').hidden`), 'ticking no deal hides the rise');
  await yn(c, 'Yes'); await submit(c); await sleep(1200);
  check(JSON.stringify(lines().slice(5)) === JSON.stringify(['0‖Cara & Dev', '1‖No deal was reached', '2‖–', 'b‖h‖Yes']), 'no deal is sent as such', lines().slice(5));

  /* ---- same side on both phones: one of them switches ---- */
  const e = await page(U(8175, 'm7/tea/'), 390, 844, true); all.push(e);
  await names(e, 'Dev', 'Cara'); await sleep(1500);
  const f = await page(U(8176, 'm7/tea/'), 390, 844, true); all.push(f);
  await names(f, 'Cara', 'Dev'); await sleep(1500);
  check(await f.ev('location.pathname').then(p => p.endsWith('/h2x/')), 'a partner who copies the names lands on the same side');
  await f.ev(`(()=>{document.getElementById('swap').click();return 1})()`); await sleep(1500);
  check(await f.ev('location.pathname').then(p => p.endsWith('/s9k/')), 'and one tap switches that phone to the other brief');

  /* ---- the deck: the board ---- */
  const d = await page(U(8173, 'm7/#5'), 1280, 720); all.push(d);
  await sleep(2500);
  check(await d.ev(`document.querySelector('.slide.active h2').textContent`) === 'What did your pair agree?', 'slide 6 is the board');
  check(await d.ev(`document.getElementById('twN').textContent`) === '2' && await d.ev(`getComputedStyle(document.getElementById('twDemo')).display`) === 'none', 'it counts two pairs, and no DEMO DATA tag');
  check(await d.ev(`document.getElementById('twBody').hidden`), 'the table waits for the keypress');
  await d.key('ArrowRight', 39); await sleep(400);
  check(await d.ev(`document.querySelectorAll('#twBody .twrow').length`) === 2, 'one keypress: a row a pair');
  check(await d.ev(`document.querySelector('#twBody .twbar i').style.width`) === '45%' && await d.ev(`document.querySelector('#twBody .twr b').textContent`) === '4.5%', 'the rise is a bar out of 10%: 4.5% fills 45%');
  check(await d.ev(`document.querySelectorAll('#twBody .twnd').length`) === 1, 'the no-deal pair says so');
  check(await d.ev(`getComputedStyle(document.querySelector('.twbelief')).opacity`) === '0', 'the two counts are still hidden');
  await d.shot('tea-board.png');
  await d.ev(`(()=>{document.querySelector('#twBody .twrow').click();return 1})()`);
  check(await d.ev(`!document.getElementById('twOpen').hidden&&document.getElementById('twOpen').textContent.includes('The rise starts in March')`), 'a click opens the row large');
  await d.ev(`(()=>{document.getElementById('twOpen').click();return 1})()`);
  await d.key('ArrowRight', 39); await sleep(700);
  check(await d.ev(`document.getElementById('twBh').textContent`) === '1 of 2' && await d.ev(`document.getElementById('twBs').textContent`) === '1 of 1', 'the second keypress: 1 of 2 on Hartwell’s side, 1 of 1 on Selwood’s');
  await d.shot('tea-board-belief.png');

  /* ---- G on the next slide, and back ---- */
  await d.key('g', 71);
  check(await d.ev(`document.querySelector('.slide.active h2').textContent`) === 'What did your pair agree?', 'G does nothing on the board');
  await d.key('ArrowRight', 39); await sleep(500);
  check(await d.ev(`document.querySelector('.slide.active h2').textContent`) === 'Who really meant it?', 'on to Who really meant it?');
  await d.shot('tea-ask.png');
  await d.key('g', 71); await sleep(1800);
  check(await d.ev('location.pathname').then(p => p.endsWith('/m7/tea/q4d/')), 'G opens the answer page');
  for (let i = 1; i <= 5; i++) await d.key('ArrowRight', 39);
  await d.shot('tea-answer.png');
  await d.key('ArrowRight', 39); await sleep(2200);
  check(await d.ev(`location.pathname.endsWith('/m7/')&&location.hash==='#7'`) && await d.ev(`document.querySelector('.slide.active h2').textContent`) === 'Guess two-thirds of the average', 'after its last step the right arrow goes on to the two-thirds game');
  await d.nav(U(8173, 'm7/tea/q4d/')); await d.key('ArrowLeft', 37); await sleep(2200);
  check(await d.ev(`location.hash==='#6'&&document.querySelector('.slide.active h2').textContent==='Who really meant it?'`), 'before its first step the left arrow goes back');

  /* ---- the slides around it ---- */
  await d.nav(U(8173, 'm7/#3')); await sleep(800);
  for (let i = 0; i < 2; i++) await d.key('ArrowRight', 39);
  await d.shot('tea-standoff.png');
  await d.key('ArrowRight', 39); await sleep(600);
  for (let i = 0; i < 2; i++) await d.key('ArrowRight', 39);
  check(await d.ev(`document.querySelector('.slide.active .qr img').naturalWidth>0`), 'the rules slide’s QR loads');
  await d.shot('tea-rules.png');

  /* ---- a reset unlocks the phones ---- */
  rooms['m7-tea'] = [];
  await a.nav(U(8171, 'm7/tea/h2x/')); await sleep(1500);
  check(await a.ev(`!document.getElementById('agree').hidden`), 'after a reset of the room the form is open again');

  /* ---- demo ---- */
  await d.nav(U(8173, 'm7/?demo=1#5')); await sleep(1500);
  check(await d.ev(`getComputedStyle(document.getElementById('twDemo')).display`) !== 'none' && await d.ev(`document.getElementById('twN').textContent`) === '6', '?demo=1 shows six invented pairs, marked DEMO DATA');
  await d.key('ArrowRight', 39); await d.key('ArrowRight', 39); await sleep(500);
  check(await d.ev(`document.getElementById('twBh').textContent`) === '4 of 6', 'and invented counts');
  await d.shot('tea-board-demo.png');

  const errs = all.flatMap(p => p.errors);
  check(!errs.length, 'no script errors', errs);
} catch (e) { console.log('FAIL  the test threw: ' + (e.stack || e)); fails++; }
console.log('screenshots: ' + SHOTS);
chrome.kill(); mock.close(); srvs.forEach(s => s.close()); await rm(dir, { recursive: true, force: true }).catch(() => {});
console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
