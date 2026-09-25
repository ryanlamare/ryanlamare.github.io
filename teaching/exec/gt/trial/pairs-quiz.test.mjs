/* Headless test of three fixes from the 25 Sep audit, against the real
   worker.js under `wrangler dev` (as in m6-reset.test.mjs):
   - two partners who both tap "I'll pick my partner" and pick each other
     (m6 rock, paper, scissors; m7 split or steal) settle into one pair,
     seat a for the name that sorts first, and play on;
   - two partners who both tap "My partner picks me" are told, after twenty
     seconds, how to get out;
   - module 5 reloaded straight onto a quiz board with every row revealed
     shows the room's answers, never a demo row without its tag.

     node teaching/exec/gt/trial/pairs-quiz.test.mjs */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const WORKER_DIR = join(ROOT, 'teaching', 'exec', 'gt', 'poll-worker');
const SHOTS = await mkdtemp(join(tmpdir(), 'pairs-quiz-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const WPORT = 8796, PORT = 8163, DEAD = 8164, PORT2 = 8165, SECRET = 'pq-test-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* the real Worker, local, with its own throwaway storage */
const persist = await mkdtemp(join(tmpdir(), 'pairs-quiz-do-'));
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

const dir = await mkdtemp(join(tmpdir(), 'pairsquiz-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9365', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let ver; for (let i = 0; i < 50; i++) { try { ver = await (await fetch('http://localhost:9365/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9365/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
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
const post = (room, kind, body) => call('/p/' + room + '/' + kind, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const tap = t => `(()=>{const b=[...document.querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden).find(b=>b.textContent.trim().replace(/\\s+/g,' ').toUpperCase().startsWith(${JSON.stringify(t.toUpperCase())}));if(!b)return false;b.click();return true})()`;
const txt = `document.body.innerText.replace(/\\s+/g,' ')`;
const typeIn = v => `(()=>{const i=document.querySelector('.namerow input');i.value=${JSON.stringify(v)};i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return 1})()`;
const waitFor = async (pg, re, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (re.test(await pg.ev(txt))) return true; await sleep(300); } return false; };
try {
  for (const r of ['m6-rps', 'm7-gb', 'gt-names']) await call('/p/' + r + '/answers');
  /* ---- both partners pick each other ---- */
  for (const [dir, g, pairKey, throwA, throwB, resultRe] of [['m6', 'rps', 'm6-pair-m6-rps', 'ROCK', 'SCISSORS', /beats|draw/i], ['m7', 'gb', 'm7-pair-m7-gb', null, null, null]]) {
    const U = p => 'http://localhost:' + p + '/teaching/exec/gt/' + dir + '/game/?g=' + g;
    const A = await page(U(PORT), 390, 844, true), B = await page(U(PORT2), 390, 844, true);
    await sleep(1500);
    if (dir === 'm6') { await A.ev(typeIn('Alex')); await B.ev(typeIn('Bea')); await sleep(1200); }
    await A.ev(tap('I’ll pick my partner')); await B.ev(tap('I’ll pick my partner')); await sleep(400);
    await A.ev(typeIn('Bea')); await B.ev(typeIn('Alex')); await sleep(6000);
    const sa = JSON.parse(await A.ev(`localStorage.getItem('${pairKey}')`) || 'null'), sb = JSON.parse(await B.ev(`localStorage.getItem('${pairKey}')`) || 'null');
    check(sa && sb && sa.seat === 'a' && sb.seat === 'b' && sa.A === 'Alex' && sb.A === 'Alex' && sb.B === 'Bea', dir + ' ' + g + ': both picked each other, and the pair settled (Alex seat a, Bea seat b)', [sa, sb]);
    check(await waitFor(A, /vs Bea/) && await waitFor(B, /vs Alex/), dir + ' ' + g + ': both phones in the one pair', [(await A.ev(txt)).slice(0, 100), (await B.ev(txt)).slice(0, 100)]);
    if (throwA) {
      await A.ev(tap(throwA)); await sleep(200); await A.ev(tap('LOCK IT IN')); await B.ev(tap(throwB)); await sleep(200); await B.ev(tap('LOCK IT IN'));
      check(await waitFor(A, resultRe, 12000) && await waitFor(B, resultRe, 12000), dir + ' ' + g + ': a throw now plays to its result on both phones', [(await A.ev(txt)).slice(0, 140), (await B.ev(txt)).slice(0, 140)]);
    }
    /* both wait: the hint appears */
    await call('/p/' + (dir === 'm6' ? 'm6-rps' : 'm7-gb') + '/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s: SECRET }) });
    await A.ev(`localStorage.removeItem('${pairKey}');1`); await B.ev(`localStorage.removeItem('${pairKey}');1`);
    await A.nav(U(PORT)); await B.nav(U(PORT2)); await sleep(1500);
    await A.ev(tap('My partner picks me')); await B.ev(tap('My partner picks me')); await sleep(2000);
    check(!/Both waiting/i.test(await A.ev(txt)), dir + ' ' + g + ': no hint while a wait is still young');
    await sleep(20500);
    check(/Both waiting\? One of you/i.test(await A.ev(txt)) && /Both waiting\? One of you/i.test(await B.ev(txt)), dir + ' ' + g + ': after twenty seconds both waiting phones say how out', (await A.ev(txt)).slice(0, 200));
    check(A.errors.length === 0 && B.errors.length === 0, dir + ' ' + g + ': no script errors', A.errors.concat(B.errors));
  }
  /* ---- m5: reload straight onto a quiz board with every row revealed ---- */
  const ids = Array.from({ length: 16 }, (_, i) => 'm5-k' + (i + 1));
  for (const id of ids) { await post(id, 'say', { t: 'Zanzibar', v: 'quiz-0001' }); await post(id, 'vote', { o: 1, v: 'quiz-0001' }); }
  const deck = await page('http://localhost:' + PORT + '/teaching/exec/gt/m5/#6.30', 1280, 720, false);
  await sleep(1200);
  const early = await deck.ev(`[...document.querySelectorAll('.slide.active [data-stepcall="krRow"] .qa')].map(e=>e.textContent)`);
  await sleep(14000);
  const late = await deck.ev(`[...document.querySelectorAll('.slide.active [data-stepcall="krRow"] .qa')].map(e=>e.textContent)`);
  const demoWords = /taylor swift|smith|eiffel|big ben|red\b|heads/i;
  check(!early.some(t => demoWords.test(t)), 'm5 quiz: rows revealed at load never show demo answers while they wait (they show … or the room)', early);
  check(late.length >= 8 && late.every(t => !demoWords.test(t) && t !== '…'), 'm5 quiz: every revealed row settles on the room’s answers', late);
  check(await deck.ev(`getComputedStyle(document.getElementById('krD')).display`) === 'none', 'm5 quiz: no DEMO DATA tag over live rows');
  /* with the server out of reach the demo view is unchanged */
  const dd = await page('http://localhost:' + DEAD + '/teaching/exec/gt/m5/#6.30', 1280, 720, false);
  await sleep(4000);
  const dtxt = await dd.ev(`[...document.querySelectorAll('.slide.active [data-stepcall="krRow"] .qa')].map(e=>e.textContent).join('|')`);
  check(dtxt.length > 20 && await dd.ev(`getComputedStyle(document.getElementById('krD')).display`) !== 'none', 'm5 quiz, server out of reach: demo answers with the DEMO DATA tag, as before', dtxt.slice(0, 120));
  check(deck.errors.length === 0 && dd.errors.length === 0, 'm5 quiz: no script errors', deck.errors.concat(dd.errors));
} catch (e) { console.log('FAIL  ' + e.message); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK', '(shots in ' + SHOTS + ')');
chrome.kill(); wr.kill(); srv.close(); srv2.close(); dead.close(); process.exit(fails ? 1 : 0);
