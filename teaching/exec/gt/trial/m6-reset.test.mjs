/* Headless test of Module 6's phone games and a Poll Desk reset (24-25 Sep
   2026), before Ryan's m6 pass: beat the keeper (m6/game/?g=solo) two kicks
   in, and rock, paper, scissors (?g=rps) on two phones, paired and one
   throw in. A reload keeps each; a reset of its room sends the phones back
   to their first screen (the first-kick card; pairing up), with the old
   pairing and its shown results gone from the phone. The two RPS phones are
   two origins, so each keeps its own storage. The real worker.js under
   `wrangler dev`, as in m4-price-reset.test.mjs.

     node teaching/exec/gt/trial/m6-reset.test.mjs */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const WORKER_DIR = join(ROOT, 'teaching', 'exec', 'gt', 'poll-worker');
const SHOTS = await mkdtemp(join(tmpdir(), 'm6-reset-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const WPORT = 8793, PORT = 8155, DEAD = 8156, PORT2 = 8157, SECRET = 'm6-test-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* the real Worker, local, with its own throwaway storage */
const persist = await mkdtemp(join(tmpdir(), 'm6-reset-do-'));
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

const dir = await mkdtemp(join(tmpdir(), 'm6reset-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9355', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let ver; for (let i = 0; i < 50; i++) { try { ver = await (await fetch('http://localhost:9355/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9355/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
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
const tap = t => `(()=>{const b=[...document.querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden).find(b=>b.textContent.trim().replace(/\\s+/g,' ').startsWith(${JSON.stringify(t)}));if(!b)return false;b.click();return true})()`;
const txt = `document.body.innerText.replace(/\\s+/g,' ')`;
const typeIn = v => `(()=>{const i=document.querySelector('.namerow input');i.value=${JSON.stringify(v)};i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return 1})()`;
const waitFor = async (pg, re, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (re.test(await pg.ev(txt))) return true; await sleep(300); } return false; };
try {
  for (const r of ['m6-solo', 'm6-rps', 'gt-names']) await call('/p/' + r + '/answers');
  /* ---- beat the keeper ---- */
  const U = p => 'http://localhost:' + p + '/teaching/exec/gt/m6/game/?g=';
  const s1 = await page(U(PORT) + 'solo', 390, 844, true); await sleep(1500);
  await s1.ev(typeIn('Tester')); await sleep(1200);
  check(await s1.ev(tap('Take the first kick')), 'solo: name taken, the first-kick card shows');
  await sleep(500);
  for (let k = 0; k < 2; k++) {
    await s1.ev(tap('LEFT')) || await s1.ev(`document.querySelector('.bigrow .opt').click()`);
    await waitFor(s1, /On to kick/i); await s1.ev(tap('On to kick')); await sleep(400);
  }
  check(await waitFor(s1, /Kick 3 of 15/i), 'solo: two kicks taken, kick 3 up', (await s1.ev(txt)).slice(0, 160));
  await s1.nav(U(PORT) + 'solo'); await sleep(2500);
  check(/Kick 3 of 15/i.test(await s1.ev(txt)), 'solo: a reload keeps the game', (await s1.ev(txt)).slice(0, 160));
  await reset('m6-solo');
  await s1.nav(U(PORT) + 'solo'); await sleep(3000);
  let t = await s1.ev(txt);
  check(/Fifteen kicks against the keeper/.test(t) && /Take the first kick/i.test(t) && /Playing as|Tester/.test(t), 'solo: after a reset, the first-kick card again (name kept)', t.slice(0, 200));
  /* ---- rock, paper, scissors, two phones ---- */
  const A = await page(U(PORT) + 'rps', 390, 844, true), Bp = await page(U(PORT2) + 'rps', 390, 844, true);
  await sleep(1500);
  await Bp.ev(typeIn('Bo')); await sleep(1200); await Bp.ev(tap('My partner picks me')); await sleep(500);
  await A.ev(tap('I’ll pick my partner')); await sleep(400); await A.ev(typeIn('Bo')); await sleep(1500);
  check(await waitFor(A, /vs Bo/) && await waitFor(Bp, /vs Tester/), 'rps: Tester picks Bo, both phones in the pair', [(await A.ev(txt)).slice(0, 120), (await Bp.ev(txt)).slice(0, 120)]);
  await A.ev(tap('ROCK')); await sleep(300); await A.ev(tap('LOCK IT IN')); await Bp.ev(tap('SCISSORS')); await sleep(300); await Bp.ev(tap('LOCK IT IN'));
  await sleep(3500);
  const afterThrow = await A.ev(txt);
  await A.nav(U(PORT) + 'rps'); await sleep(3000);
  check(/vs Bo/.test(await A.ev(txt)), 'rps: a reload keeps the pair', (await A.ev(txt)).slice(0, 160));
  await reset('m6-rps');
  await A.nav(U(PORT) + 'rps'); await Bp.nav(U(PORT2) + 'rps'); await sleep(3500);
  t = await A.ev(txt); const tb = await Bp.ev(txt);
  check(/Pair up with the person next to you/i.test(t) && !/vs Bo/.test(t), 'rps: after a reset, the picker phone is back at pairing up', t.slice(0, 200));
  check(/Pair up with the person next to you/i.test(tb) && !/vs Tester/.test(tb), 'rps: after a reset, the partner phone is back at pairing up', tb.slice(0, 200));
  check(await A.ev(`Object.keys(localStorage).filter(k=>/^m6-(pair|ack)-/.test(k)).length`) === 0, 'rps: the old pairing and its shown results are gone from the phone');
  check(/Rock beats scissors/i.test(afterThrow), 'rps: the first throw was played to its result', afterThrow.slice(0, 140));
  /* a phone that cannot reach the server keeps its solo game */
  const off = await page(U(DEAD) + 'solo', 390, 844, true); await sleep(1500);
  await off.ev(typeIn('Offline')); await sleep(1200); await off.ev(tap('Take the first kick')); await sleep(500);
  await off.ev(`document.querySelector('.bigrow .opt').click()`); await waitFor(off, /On to kick/i); await off.ev(tap('On to kick')); await sleep(400);
  await off.nav(U(DEAD) + 'solo'); await sleep(5500);
  check(/Kick 2 of 15/i.test(await off.ev(txt)), 'solo: with the server out of reach the game is kept', (await off.ev(txt)).slice(0, 160));
  check([s1, A, Bp, off].every(p => p.errors.length === 0), 'no script errors', [s1, A, Bp, off].map(p => p.errors));
} catch (e) { console.log('FAIL  ' + e.message); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK', '(shots in ' + SHOTS + ')');
chrome.kill(); wr.kill(); srv.close(); srv2.close(); dead.close(); process.exit(fails ? 1 : 0);
