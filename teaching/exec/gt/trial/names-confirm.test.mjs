/* Headless test of the name lists (27 Sep 2026), on every page the
   programme uses that shows one: /go's named polls, the game pages of
   modules 1, 2, 5, 6 and 7, and the m8 car market. Real Chrome against a
   MOCK Worker, each port a separate phone.

     node teaching/exec/gt/trial/names-confirm.test.mjs

   Why: in Ryan's rehearsal Kimberly, scrolling down to type her own name
   under the list, brushed Laura on the way and played as Laura until she
   noticed. Now a name tapped on a list asks once ("Laura: is that you?")
   and "no" puts the list back. And a name a phone typed for itself joins
   the list for everyone after, so a partner taps "Kimberly" instead of
   typing it; your own name is not on your partner list. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const MOCK = 8250, PORTS = [8251, 8252, 8253, 8254, 8255, 8256, 8257, 8258, 8259];
const ROSTER = ['Ana', 'Ben', 'Cara', 'Dev', 'Eve', 'Laura', 'Mike', 'Zoe'];   /* each phone below takes its own: the guard stops a second phone claiming a name */
const rooms = { 'gt-names': [{ v: 'guest-phone-1', t: 'Kimberly' }] };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const J = (res, o) => { res.writeHead(200, { ...CORS, 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
const mock = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const m = url.pathname.match(/^\/mock\/p\/([a-z0-9-]+)\/?(\w+)?$/);
  if (m && m[1] === 'gt-roster' && m[2] === 'roster') return J(res, { names: ROSTER });
  const L = m ? (rooms[m[1]] || []) : [];
  if (m && m[2] === 'entries') return J(res, { entries: L, total: L.length });
  if (m && m[2] === 'answers') return J(res, { answers: L.map(a => a.t), total: L.length });
  if (m && m[2] === 'say' && req.method === 'POST') {
    let b = ''; req.on('data', c => b += c); req.on('end', () => { const j = JSON.parse(b || '{}'); (rooms[m[1]] = rooms[m[1]] || []).push({ v: j.v, t: j.t }); J(res, { ok: true }); }); return;
  }
  return J(res, { answers: [], counts: [], total: 0, entries: [], guesses: [], draws: [] });
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

const dir = await mkdtemp(join(tmpdir(), 'namestest-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9391', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:9391/json/version')).json(); break; } catch (_) { await sleep(200); } }
async function page(url) {
  const t = await (await fetch('http://localhost:9391/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url }); await sleep(3200);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  return { ev, errors };
}
let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const listed = p => p.ev(`[...document.querySelectorAll('button.pick, a.pick')].map(b=>b.textContent.trim())`);
const tap = (p, n) => p.ev(`(()=>{const b=[...document.querySelectorAll('button.pick')].find(b=>b.textContent.trim()===${JSON.stringify(n)});b.click();return 1})()`);
const confirmShown = p => p.ev(`(()=>{const c=document.querySelector('.gt-confirm');return c?[...c.children].map(e=>e.textContent.trim()).join(' | '):''})()`);
const press = (p, label) => p.ev(`(()=>{[...document.querySelectorAll('.gt-confirm button')].find(b=>b.textContent===${JSON.stringify(label)}).click();return 1})()`);
const saved = p => p.ev(`localStorage.getItem('gt-name')`);
const U = (port, path) => 'http://localhost:' + port + path;
const all = [];
try {
  /* ---- /go, a named poll ---- */
  const g = await page(U(8251, '/go/?p=m1-familiarity')); all.push(g);
  check(JSON.stringify(await listed(g)) === JSON.stringify(['Ana', 'Ben', 'Cara', 'Dev', 'Eve', 'Kimberly', 'Laura', 'Mike', 'Zoe']), '/go lists the attendees and Kimberly, whom a phone typed, in one alphabetical list', await listed(g));
  await tap(g, 'Laura'); await sleep(300);
  check((await confirmShown(g)) === 'Laura | Is that you? | YES | NO, GO BACK', 'a tapped name asks first: Laura, Is that you?', await confirmShown(g));
  check(await saved(g) === null && !(rooms['gt-names'] || []).some(a => a.t === 'Laura'), 'and nothing is claimed yet');
  await press(g, 'NO, GO BACK'); await sleep(3200);
  check((await listed(g)).includes('Laura') && !(await confirmShown(g)), 'NO puts the list back');
  await tap(g, 'Zoe'); await sleep(300); await press(g, 'YES'); await sleep(3500);
  check(await saved(g) === 'Zoe', 'YES makes the phone Zoe', await saved(g));
  check(await g.ev(`!document.querySelector('.gt-confirm') && document.getElementById('q').textContent.includes('familiar')`), 'and the poll comes up');

  /* ---- m2: who you are, then your partner ---- */
  const a = await page(U(8252, '/teaching/exec/gt/m2/game/?g=ult')); all.push(a);
  check((await listed(a)).includes('Kimberly'), 'm2 lists Kimberly too');
  await tap(a, 'Mike'); await sleep(300);
  check((await confirmShown(a)).startsWith('Mike | Is that you?'), 'm2 asks: Mike, Is that you?');
  await press(a, 'YES'); await sleep(3500);
  check(await saved(a) === 'Mike', 'm2: the phone is Mike');
  await a.ev(`[...document.querySelectorAll('button.opt')].find(b=>b.textContent.includes('proposer')).click()`); await sleep(600);
  const partners = await listed(a);
  check(!partners.includes('Mike') && partners.includes('Kimberly'), 'the partner list leaves out Mike himself and has Kimberly', partners);
  await tap(a, 'Kimberly'); await sleep(300);
  check((await confirmShown(a)).startsWith('Kimberly | Is that your partner?'), 'a partner asks first too: Kimberly, Is that your partner?', await confirmShown(a));
  await press(a, 'YES'); await sleep(600);
  check(await a.ev(`document.getElementById('q').textContent`) === 'Your offer to Kimberly', 'YES opens the offer to Kimberly');
  check(await a.ev(`document.querySelectorAll('.bands button').length`) === 11, 'with all eleven splits');

  /* ---- the other pages: tap, NO, tap, YES ---- */
  for (const [port, path, who] of [[8253, '/teaching/exec/gt/m1/game/', 'Ana'], [8254, '/teaching/exec/gt/m5/game/', 'Laura'], [8255, '/teaching/exec/gt/m6/game/?g=solo', 'Ben'], [8256, '/teaching/exec/gt/m7/game/?g=chicken', 'Cara'], [8257, '/teaching/exec/gt/m8/car/', 'Dev']]) {
    const p = await page(U(port, path)); all.push(p);
    const tag = path.split('/').filter(Boolean).slice(-2).join('/');
    check((await listed(p)).includes('Kimberly'), tag + ': Kimberly is on the list');
    await tap(p, who); await sleep(300);
    check((await confirmShown(p)).startsWith(who + ' | Is that you?'), tag + ': a tap on ' + who + ' asks first', await confirmShown(p));
    check(await saved(p) === null, tag + ': nothing saved yet');
    await press(p, 'NO, GO BACK'); await sleep(900);
    check((await listed(p)).includes(who), tag + ': NO puts the list back');
    await tap(p, who); await sleep(300); await press(p, 'YES'); await sleep(3500);
    check(await saved(p) === who, tag + ': YES makes the phone ' + who, await saved(p));
  }
  /* m6 and m7: your own name is not on your partner list */
  const r = await page(U(8258, '/teaching/exec/gt/m6/game/?g=rps')); all.push(r);
  await tap(r, 'Eve'); await sleep(300); await press(r, 'YES'); await sleep(3500);
  await r.ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('pick my partner')).click()`); await sleep(700);
  const p6 = await listed(r);
  check(p6.length > 0 && !p6.includes('Eve') && p6.includes('Kimberly'), 'm6 rock paper scissors: the partner list has Kimberly and not Eve herself', p6);
  /* and the guard still stops a second phone taking a claimed name */
  const x = await page(U(8259, '/teaching/exec/gt/m7/game/?g=gb')); all.push(x);
  await tap(x, 'Mike'); await sleep(300); await press(x, 'YES'); await sleep(3500);
  check(await saved(x) === null && await x.ev(`!!document.querySelector('.gt-taken')`), 'a second phone that picks Mike gets the already-joined choice, not the name');

  const errs = all.flatMap(p => p.errors);
  check(!errs.length, 'no script errors', errs);
} catch (e) { console.log('FAIL  the test threw: ' + (e.stack || e)); fails++; }
chrome.kill(); mock.close(); srvs.forEach(s => s.close()); await rm(dir, { recursive: true, force: true }).catch(() => {});
console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
