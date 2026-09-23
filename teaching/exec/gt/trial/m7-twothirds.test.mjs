/* Headless test of guess two-thirds, a flex block in module 7 since 23 Sep 2026
   (moved from the end of module 8; the room is still m8-twothirds): the deck in real Chrome against a MOCK Worker, through the
   deck's own ?api= switch, so nothing touches the real m8-twothirds room.

     node teaching/exec/gt/trial/m7-twothirds.test.mjs

   The count on the rules slide follows the room; two slides on, the average,
   two-thirds of it and the winning guess come up a press at a time and are
   right; the first figure shown is a snapshot, so a late guess moves nothing;
   stepping back before the average lets the numbers move again. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const PORT = 8143; let answers = ['30', '20', '10', ' 40 ', 'abc', '150'];   /* two of these are not guesses */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
const srv = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/mock/')) { res.writeHead(200, { ...CORS, 'content-type': 'application/json' });
    return res.end(JSON.stringify(url.pathname.includes('m8-twothirds/answers') ? { answers, total: answers.length } : { answers: [], entries: [], votes: {}, counts: [], total: 0 })); }
  let p = normalize(decodeURIComponent(url.pathname)); if (p.endsWith('/')) p += 'index.html';
  try { const buf = await readFile(join(ROOT, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(buf); } catch (_) { res.writeHead(404); res.end('no'); }
}).listen(PORT);
const dir = await mkdtemp(join(tmpdir(), 'tt-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9351', '--user-data-dir=' + dir, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:9351/json/version')).json(); break; } catch (_) { await sleep(200); } }
const t = await (await fetch('http://localhost:9351/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const wait = new Map(), errors = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => (await send('Runtime.evaluate', { expression: x, returnByValue: true })).result.result.value;
const key = async (k, vk) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: vk }); await sleep(350); };
const txt = i => ev(`document.getElementById('${i}').textContent`);
let fails = 0; const check = (ok, what) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what); if (!ok) fails++; };
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  const titles = await (async () => { await send('Page.navigate', { url: `http://localhost:${PORT}/teaching/exec/gt/m7/?api=http://localhost:${PORT}/mock` }); await sleep(3200);
    return ev(`JSON.stringify([...document.querySelectorAll('section.slide')].map(s=>(s.querySelector('h1,h2')||{}).textContent))`); })();
  const T = JSON.parse(titles), rules = T.indexOf('Guess two-thirds of the average');
  check(rules > 0 && T[rules + 1].includes('Finding the Nash equilibrium') && T[rules + 2].includes('Finding the Nash equilibrium') && T[rules - 1] === 'What is a strategic move?' && T[rules + 3] === 'Strategic moves in sequential games', 'three slides in m7, after What is a strategic move? (moved from m8, 23 Sep 2026)');
  await send('Page.navigate', { url: `http://localhost:${PORT}/teaching/exec/gt/m7/?api=http://localhost:${PORT}/mock#${rules}` }); await sleep(3200);
  check(await txt('ttN') === '4', 'the rules slide counts four guesses: "abc" and 150 are not guesses');
  check(await ev(`getComputedStyle(document.getElementById('ttD')).display`) === 'none', 'no DEMO DATA tag while the room answers');
  check(await ev(`document.querySelector('.slide.active .qr img').naturalWidth>0`), 'the QR image loads');
  for (let i = 0; i < 5; i++) await key('ArrowRight', 39);              /* four steps, then the ladder */
  check((await ev(`document.querySelector('.slide.active h2').textContent`)).includes('Finding the Nash'), 'on to the elimination ladder');
  for (let i = 0; i < 5; i++) await key('ArrowRight', 39);              /* its four steps, then the reveal */
  check(await txt('ttcN2') === '4' && await txt('ttAvg') === '–', 'the reveal opens on the count alone');
  await key('ArrowRight', 39); check(await txt('ttAvg') === '25', 'press one: the room’s average, 25');
  answers = answers.concat(['100', '100', '100']); await sleep(3000);
  check(await txt('ttAvg') === '25' && await txt('ttcN2') === '4', 'three late guesses of 100 move nothing: the reveal is a snapshot');
  await key('ArrowRight', 39); check(await txt('ttTarget') === '17', 'press two: two-thirds of that, 17');
  await key('ArrowRight', 39); check((await txt('ttWin')).includes('winning guess is 20'), 'press three: the winning guess is 20, the closest to 16.7');
  await key('ArrowLeft', 37); await key('ArrowLeft', 37); await key('ArrowLeft', 37); await sleep(3000);
  check(await txt('ttcN2') === '7', 'stepping back before the average unfreezes it: seven guesses now');
  await key('ArrowRight', 39); check(await txt('ttAvg') === '57.1', 'and a fresh reveal takes a fresh snapshot, 57.1');
  check(!errors.length, 'no script errors' + (errors.length ? ': ' + errors.join(' / ') : ''));
} catch (e) { console.log('FAIL  the test threw: ' + (e.stack || e)); fails++; }
chrome.kill(); srv.close(); await rm(dir, { recursive: true, force: true }).catch(() => {});
console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
