/* Headless test of Module 5's phone games and a Poll Desk reset (24 Sep
   2026), run before Ryan's m5 pass: the investment game (m5/game/) played
   to its total, and the two Tapas votes (m5/tapas/?g=bos, ?g=chicken)
   locked in both rounds. A reload keeps each; a reset of its room sends
   the phone back to round 1 with nothing locked. The real worker.js under
   `wrangler dev`, as in m4-price-reset.test.mjs. The quiz lives on /go and
   is go-reset.test.mjs.

     node teaching/exec/gt/trial/m5-reset.test.mjs */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const WORKER_DIR = join(ROOT, 'teaching', 'exec', 'gt', 'poll-worker');
const SHOTS = await mkdtemp(join(tmpdir(), 'm5-reset-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const WPORT = 8792, PORT = 8153, DEAD = 8154, SECRET = 'm5-test-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* the real Worker, local, with its own throwaway storage */
const persist = await mkdtemp(join(tmpdir(), 'm5-reset-do-'));
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

const dir = await mkdtemp(join(tmpdir(), 'm5reset-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9353', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let ver; for (let i = 0; i < 50; i++) { try { ver = await (await fetch('http://localhost:9353/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9353/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
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
const say = (room, t) => call('/p/' + room + '/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t, v: 'deck-' + Math.random().toString(36).slice(2, 10) }) });
const reset = room => call('/p/' + room + '/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s: SECRET }) });
const tap = t => `(()=>{const b=[...document.querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden).find(b=>b.textContent.trim().replace(/\\s+/g,' ').startsWith(${JSON.stringify(t)}));if(!b)return false;b.click();return true})()`;
const txt = `document.body.innerText.replace(/\\s+/g,' ')`;
const B = 'http://localhost:' + PORT + '/teaching/exec/gt/';
try {
  for (const r of ['m5-invest', 'm5-bos', 'm5-chicken', 'gt-names']) await call('/p/' + r + '/answers');
  /* ---- the investment game, played to the end ---- */
  const inv = await page(B + 'm5/game/', 390, 844, true);
  await sleep(1500);
  await inv.ev(`(()=>{const i=document.querySelector('.namerow input');i.value='Tester';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return 1})()`);
  await sleep(1500);
  check(/Round 1: what do you choose\?/.test(await inv.ev(txt)), 'investment game: name taken, round 1 open', (await inv.ev(txt)).slice(0, 120));
  await inv.ev(tap('Invest')); await sleep(100); await inv.ev(tap('LOCK IT IN')); await sleep(1500);
  check(/Response locked in/.test(await inv.ev(txt)), 'round 1 locked');
  await say('m5-invest', '::reveal|1'); await sleep(3500); await sleep(3200);
  check(/of the room invested/i.test(await inv.ev(txt)), 'round 1 reveal plays', (await inv.ev(txt)).slice(0, 160));
  await inv.ev(tap('OK')); await say('m5-invest', '::open|2'); await sleep(3500);
  await inv.ev(tap('Don’t invest')); await sleep(100); await inv.ev(tap('LOCK IT IN')); await sleep(1500);
  await say('m5-invest', '::reveal|2'); await sleep(3500); await sleep(3200);
  await inv.ev(tap('See my total')); await sleep(500);
  check(/Your total/.test(await inv.ev(txt)), 'game over: the total shows', (await inv.ev(txt)).slice(0, 160));
  await inv.nav(B + 'm5/game/'); await sleep(3500);
  check(/Your total/.test(await inv.ev(txt)), 'a reload without a reset keeps the finished game', (await inv.ev(txt)).slice(0, 160));
  await reset('m5-invest');
  await inv.nav(B + 'm5/game/'); await sleep(4000);
  let t = await inv.ev(txt);
  check(/Round 1: what do you choose\?/.test(t) && !/locked in/.test(t) && await inv.ev(`[...document.querySelectorAll('.choices .opt')].length`) === 2 && await inv.ev(`!document.querySelector('.choices.locked')`), 'after a reset of the investment game: round 1, nothing locked', t.slice(0, 200));
  check(/Playing as Tester/.test(t), 'the name is kept (only a reset of the names row asks again)', t.slice(0, 120));
  await inv.shot('invest-fresh.png');
  /* ---- the two Tapas votes ---- */
  for (const g of ['bos', 'chicken']) {
    const room = 'm5-' + g, U = B + 'm5/tapas/?g=' + g;
    const tp = await page(U, 390, 844, true); await sleep(2000);
    await tp.ev(`document.querySelector('.choices .opt').click()`); await sleep(100); await tp.ev(tap('LOCK IT IN')); await sleep(1500);
    await say(room, '::open|2'); await sleep(3000);
    await tp.ev(`document.querySelector('.choices .opt').click()`); await sleep(100); await tp.ev(tap('LOCK IT IN')); await sleep(1500);
    check(/Round 2/i.test(await tp.ev(txt)) && /locked in/.test(await tp.ev(txt)), g + ': both rounds locked', (await tp.ev(txt)).slice(0, 160));
    await tp.nav(U); await sleep(3000);
    check(/locked in/.test(await tp.ev(txt)), g + ': a reload keeps the lock');
    await reset(room);
    await tp.nav(U); await sleep(3500);
    t = await tp.ev(txt);
    check(/Round 1/i.test(t) && !/locked in/.test(t) && await tp.ev(`!document.querySelector('.choices.locked')`), g + ': after a reset, round 1 and nothing locked', t.slice(0, 200));
    check(tp.errors.length === 0, g + ': no script errors', tp.errors);
  }
  check(inv.errors.length === 0, 'investment game: no script errors', inv.errors);
} catch (e) { console.log('FAIL  ' + e.message); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK', '(shots in ' + SHOTS + ')');
chrome.kill(); wr.kill(); srv.close(); dead.close(); process.exit(fails ? 1 : 0);
