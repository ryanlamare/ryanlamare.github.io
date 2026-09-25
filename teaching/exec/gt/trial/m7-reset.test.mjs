/* Headless test of Module 7's pair games and a Poll Desk reset (25 Sep
   2026), before Ryan's m7 pass: chicken (m7/game/?g=chicken) and split or
   steal (?g=gb), each on two phones (two origins, so each keeps its own
   storage). A reload keeps the pair; a reset of the room sends both phones
   back to pairing up, with the pairing, chicken's round clocks and the
   rounds shown gone from the phone. The real worker.js under
   `wrangler dev`, as in m6-reset.test.mjs. The two-thirds guess and the
   votes live on /go: go-reset.test.mjs and m7-twothirds.test.mjs.

     node teaching/exec/gt/trial/m7-reset.test.mjs */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const WORKER_DIR = join(ROOT, 'teaching', 'exec', 'gt', 'poll-worker');
const SHOTS = await mkdtemp(join(tmpdir(), 'm7-reset-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const WPORT = 8794, PORT = 8158, DEAD = 8159, PORT2 = 8160, SECRET = 'm7-test-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* the real Worker, local, with its own throwaway storage */
const persist = await mkdtemp(join(tmpdir(), 'm7-reset-do-'));
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
const srv2 = createServer(serve(W)).listen(PORT2);

const dir = await mkdtemp(join(tmpdir(), 'm7reset-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9358', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let ver; for (let i = 0; i < 50; i++) { try { ver = await (await fetch('http://localhost:9358/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9358/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
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
const reset = room => call('/p/' + room + '/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s: SECRET }) });
const tap = t => `(()=>{const b=[...document.querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden).find(b=>b.textContent.trim().replace(/\\s+/g,' ').toUpperCase().startsWith(${JSON.stringify(t.toUpperCase())}));if(!b)return false;b.click();return true})()`;
const txt = `document.body.innerText.replace(/\\s+/g,' ')`;
const typeIn = v => `(()=>{const i=document.querySelector('.namerow input');i.value=${JSON.stringify(v)};i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return 1})()`;
const waitFor = async (pg, re, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (re.test(await pg.ev(txt))) return true; await sleep(300); } return false; };
const stored = pg => pg.ev(`Object.keys(localStorage).filter(k=>/^m7-(pair|clk|wclk|ack)-/.test(k)).length`);
try {
  for (const r of ['m7-chicken', 'm7-gb', 'gt-names']) await call('/p/' + r + '/answers');
  const U = (p, g) => 'http://localhost:' + p + '/teaching/exec/gt/m7/game/?g=' + g;
  let first = true;
  for (const g of ['chicken', 'gb']) {
    const A = await page(U(PORT, g), 390, 844, true), Bp = await page(U(PORT2, g), 390, 844, true);
    await sleep(1500);
    if (first) { await Bp.ev(typeIn('Bo')); await sleep(1200); await A.ev(typeIn('Tester')); await sleep(1200); first = false; }
    await Bp.ev(tap('My partner picks me')); await sleep(500);
    await A.ev(tap('I’ll pick my partner')); await sleep(400); await A.ev(typeIn('Bo')); await sleep(1500);
    check(await waitFor(A, /vs Bo/) && await waitFor(Bp, /vs Tester/), g + ': Tester picks Bo, both phones in the pair', [(await A.ev(txt)).slice(0, 140), (await Bp.ev(txt)).slice(0, 140)]);
    await sleep(2500);
    const firstScreen = await A.ev(txt);
    if (g === 'chicken') { await A.ev(tap('Start round 1')); await Bp.ev(tap('Start round 1')); await sleep(2500); }
    await A.nav(U(PORT, g)); await sleep(3000);
    check(/vs Bo/.test(await A.ev(txt)), g + ': a reload keeps the pair', (await A.ev(txt)).slice(0, 160));
    if (g === 'chicken') check(await A.ev(`Object.keys(localStorage).some(k=>/^m7-clk-/.test(k))`), 'chicken: the round clock is kept on the phone (what a reset must clear)');
    await reset('m7-' + g);
    await A.nav(U(PORT, g)); await Bp.nav(U(PORT2, g)); await sleep(3500);
    const ta = await A.ev(txt), tb = await Bp.ev(txt);
    check(/Pair up with the person next to you/i.test(ta) && !/vs Bo/.test(ta), g + ': after a reset, the picker phone is back at pairing up', ta.slice(0, 200));
    check(/Pair up with the person next to you/i.test(tb) && !/vs Tester/.test(tb), g + ': after a reset, the partner phone is back at pairing up', tb.slice(0, 200));
    check(await stored(A) === 0 && await stored(Bp) === 0, g + ': pairing, clocks and shown rounds are gone from both phones');
    check(A.errors.length === 0 && Bp.errors.length === 0, g + ': no script errors', A.errors.concat(Bp.errors));
    console.log('      (' + g + ' first screen: ' + firstScreen.slice(0, 120) + ')');
  }
} catch (e) { console.log('FAIL  ' + e.message); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK', '(shots in ' + SHOTS + ')');
chrome.kill(); wr.kill(); srv.close(); srv2.close(); dead.close(); process.exit(fails ? 1 : 0);
