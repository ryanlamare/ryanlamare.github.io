/* Headless test of "On the screen now" on a typed ryanlamare.com/go, and of
   module 7's two-thirds guess (25 Sep 2026). The REAL worker.js runs under
   `wrangler dev` with a throwaway secret, as in go-roster.test.mjs, and the
   site is served pointed at it.

     node teaching/exec/gt/trial/go-now.test.mjs

   A deck arriving at a QR slide tells room gt-now which QR it shows; a typed
   /go then offers that QR's page first; a line from another day, or a QR the
   page does not know, leaves the ordinary list. The two-thirds phone opens
   the number pad and refuses what is not a number from 0 to 100; the deck
   reads "7.5" as 8 and names every guess that is equally close. */
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
const WPORT = 8793, PORT = 8171, SECRET = 'now-test-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const persist = await mkdtemp(join(tmpdir(), 'go-now-do-'));
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

const dir = await mkdtemp(join(tmpdir(), 'gonow-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9371', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:9371/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9371/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  const nav = async u => { await send('Page.navigate', { url: u }); await sleep(1800); };
  await nav(url);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const key = async k => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: k === 'ArrowRight' ? 39 : 37 }); };
  return { ev, nav, key, errors };
}

let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const last = async () => { const r = await (await fetch(W + '/p/gt-now/answers')).json(); return (r.answers || []).slice(-1)[0] || ''; };
const d = new Date(), TODAY = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const say = (room, t) => fetch(W + '/p/' + room + '/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t, v: 'test-' + Math.random().toString(36).slice(2, 12) }) });
const NOWBTN = `(()=>{const b=document.querySelector('a.pick.now');return b?[b.querySelector('.pq').textContent,new URL(b.href).pathname+new URL(b.href).search]:null})()`;
const SITE = 'http://localhost:' + PORT;
try {
  /* the deck: Price Wars' QR slide, then a slide without a QR, then the ranking's QR */
  const deck = await page(SITE + '/teaching/exec/gt/m4/#4', 1280, 720);
  await sleep(800);
  check(await last() === TODAY + '|/teaching/exec/gt/m4/qr-price.svg', 'arriving at Price Wars\' QR slide tells the server', await last());
  const n1 = (await (await fetch(W + '/p/gt-now/answers')).json()).total;
  await deck.key('ArrowRight'); await deck.key('ArrowRight'); await deck.key('ArrowRight'); await sleep(600);
  check((await (await fetch(W + '/p/gt-now/answers')).json()).total === n1, 'steps and slides without a QR send nothing');

  /* a typed /go on a phone */
  const ph = await page(SITE + '/go/', 390, 844, true);
  check(JSON.stringify(await ph.ev(NOWBTN)) === JSON.stringify(['Price Wars', '/teaching/exec/gt/m4/price/']), 'a typed /go offers Price Wars first, in red', await ph.ev(NOWBTN));
  check(await ph.ev(`document.querySelector('#opts').firstElementChild.classList.contains('now')`), 'it sits above every question');

  await deck.nav(SITE + '/teaching/exec/gt/m4/#17'); await sleep(600);
  await ph.nav(SITE + '/go/');
  check(JSON.stringify(await ph.ev(NOWBTN)) === JSON.stringify(['Rank the strategies', '/go/?p=m4-axelrod']), 'moving on to the ranking\'s QR moves the offer with it', await ph.ev(NOWBTN));
  await ph.ev(`document.querySelector('a.pick.now').click()`); await sleep(1500);
  check(/Rank the strategies/.test(await ph.ev(`document.getElementById('q').textContent`)), 'one tap opens the ranking');

  /* a line from another day, and a path the page does not know */
  await say('gt-now', '2026-01-01|/teaching/exec/gt/m4/qr-price.svg');
  await ph.nav(SITE + '/go/');
  check(await ph.ev(NOWBTN) === null && await ph.ev(`document.querySelectorAll('button.pick').length`) > 10, 'a line from another day leaves the ordinary list');
  await say('gt-now', TODAY + '|/somewhere/else.svg');
  await ph.nav(SITE + '/go/');
  check(await ph.ev(NOWBTN) === null, 'an unknown QR is ignored');

  /* the two-thirds phone */
  check(await ph.ev(`[...document.querySelectorAll('button.pick')].some(b=>b.querySelector('.pm').textContent==='Module 7'&&/two-thirds/.test(b.textContent))`), 'the chooser lists the two-thirds guess under Module 7');
  await ph.nav(SITE + '/go/?p=m8-twothirds');
  check(await ph.ev(`document.querySelector('.sayrow input').inputMode`) === 'numeric', 'the two-thirds phone opens the number pad');
  const sendT = t => ph.ev(`(()=>{const i=document.querySelector('.sayrow input');i.value=${JSON.stringify(t)};document.querySelector('.sayrow button').click();return document.getElementById('status').textContent})()`);
  check(/from 0 to 100/.test(await sendT('seven')), 'a word is refused with a line saying what to send');
  check(/from 0 to 100/.test(await sendT('150')), '150 is refused');
  await sleep(300);
  check((await (await fetch(W + '/p/m8-twothirds/answers')).json()).total === 0, 'nothing refused reached the server');
  await sendT('7.5'); await sleep(1200);
  check(JSON.stringify((await (await fetch(W + '/p/m8-twothirds/answers')).json()).answers) === '["7.5"]', '7.5 is sent', (await (await fetch(W + '/p/m8-twothirds/answers')).json()).answers);

  /* the deck reads it: 7.5 is 8, and equally close guesses share the win */
  await say('m8-twothirds', '15'); await say('m8-twothirds', '17');
  const m7 = await page(SITE + '/teaching/exec/gt/m7/#5', 1280, 720);
  await sleep(3200);
  const res = await m7.ev(`(()=>{const e=document.createElement('div');ttAvgFill(e,true);const a=document.getElementById('ttAvg').textContent;ttWinner(e,true);const w=e.textContent;ttAvgFill(e,false);return [a,w]})()`);
  check(res[0] === '13.3', 'the average counts 7.5 as 8: (8 + 15 + 17) / 3', res[0]);
  check(/^The winning guess is 8 /.test(res[1]), 'the closest guess wins', res[1]);
  await say('m8-twothirds', '40'); /* 8, 15, 17, 40 and 40 average 24, so the target is exactly 16 */
  await say('m8-twothirds', '40');
  await sleep(3000);
  const tie = await m7.ev(`(()=>{const e=document.createElement('div');ttAvgFill(e,true);ttWinner(e,true);const w=e.textContent;ttAvgFill(e,false);return w})()`);
  check(/^The winning guesses are 15 and 17 /.test(tie), 'a tie names both guesses', tie);

  check(deck.errors.length + ph.errors.length + m7.errors.length === 0, 'no script errors', deck.errors.concat(ph.errors, m7.errors));
} catch (e) { console.log('FAIL  ' + e.message); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK');
chrome.kill(); wr.kill(); srv.close(); process.exit(fails ? 1 : 0);
