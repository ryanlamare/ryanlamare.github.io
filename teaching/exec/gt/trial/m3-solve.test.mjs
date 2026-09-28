/* Headless test of module 3's phone matrix, m3/solve/ (21 Sep 2026): the real
   page in real Chrome, as a phone, driven by touches. The page sends nothing,
   so there is no Worker to mock. The Chrome driver is the one in
   m1-offers.test.mjs.

     node teaching/exec/gt/trial/m3-solve.test.mjs [folder for screenshots]

   A tap on a name crosses its line out and a second tap brings it back; the
   last line on a side stays. A tap on a number flashes its two names. Since
   28 Sep there is no press-and-hold circle: a hold is just a tap. Charm out on
   both sides, then Price and Terms, lands the red box on 50 · 50, the way the
   debrief slide solves it. Start again clears everything. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const SHOTS = process.argv[2] || await mkdtemp(join(tmpdir(), 'm3-solve-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const PORT = 8139;
const srv = createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)); if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(join(ROOT, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(b); }
  catch (_) { res.writeHead(404); res.end(); }
}).listen(PORT);

const dir = await mkdtemp(join(tmpdir(), 'm3solve-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9339', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:9339/json/version')).json(); break; } catch (_) { await sleep(200); } }

const t = await (await fetch('http://localhost:9339/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const wait = new Map(); const errors = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Page.navigate', { url: `http://localhost:${PORT}/teaching/exec/gt/m3/solve/` }); await sleep(1500);
const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); if (r.result.exceptionDetails) throw new Error('eval failed: ' + expr); return r.result.result.value; };
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(SHOTS, name), Buffer.from(r.result.data, 'base64')); };

/* side is 'rl' (your pitches, down the side) or 'cl' (your rival's, across the top) */
const touch = async (side, i, ms) => {
  const [x, y] = await ev(`(()=>{const r=document.querySelectorAll('.mx button.${side}')[${i}].getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];})()`);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await sleep(ms);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(120);
};
const tap = (side, i) => touch(side, i, 40), hold = (side, i) => touch(side, i, 750);
const state = side => ev(`[...document.querySelectorAll('.mx button.${side}')].map(b=>b.classList.contains('out')?'x':'.').join('')`);
const tapCell = async (r, c) => { const [x, y] = await ev(`(()=>{const d=document.querySelectorAll('.cell')[${r}*4+${c}].getBoundingClientRect();return [d.left+d.width/2,d.top+d.height/2];})()`);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await sleep(40); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(120); };
const eq = () => ev(`[...document.querySelectorAll('.cell.eq')].map(c=>c.textContent).join('|')`);

let fails = 0;
const is = async (what, got, want) => { const ok = got === want; if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : `: got ${got}, wanted ${want}`)); };
const PRICE = 0, TERMS = 1, SOLVE = 2, CHARM = 3;

await is('nothing crossed out to start', await state('rl') + await state('cl'), '........');
await tap('rl', CHARM); await is('a tap crosses Charm out', await state('rl'), '...x');
await tap('rl', CHARM); await is('a second tap brings it back', await state('rl'), '....');
await tapCell(SOLVE, PRICE);
await is('a tap on a number flashes its row name and its column name', await ev(`[...document.querySelectorAll('.mx button.hint')].map(b=>b.className.split(' ')[0]+':'+b.textContent).join(',')`), 'cl:Price,rl:Solve');
await is('and crosses nothing out', await state('rl') + await state('cl'), '........');
await hold('rl', SOLVE); await is('a hold is only a tap: it crosses Solve out, no circle', await state('rl') + await ev(`document.querySelectorAll('.mx button.dom').length`), '..x.0');
await tap('rl', SOLVE);
await tap('rl', CHARM); await tap('cl', CHARM);
await is('Charm out on both sides', await state('rl') + await state('cl'), '...x...x');
await tap('rl', PRICE); await tap('rl', TERMS);
await is('Solve alone on your side', await state('rl'), 'xx.x');
await tap('rl', SOLVE); await is('the last line on a side stays', await state('rl'), 'xx.x');
await is('no red box while the rival still has three', await eq(), '');
await tap('cl', PRICE); await tap('cl', TERMS);
await is('the red box is on 50 · 50', await eq(), '50·50');
await shot('solve-solved.png');
await ev(`document.getElementById('again').click()`);
await is('Start again clears everything', await state('rl') + await state('cl') + await eq(), '........');
await is('no page errors', errors.join(' / '), '');

console.log('screenshots: ' + SHOTS);
ws.close(); chrome.kill(); srv.close(); await sleep(300); await rm(dir, { recursive: true, force: true }).catch(() => {});
process.exit(fails ? 1 : 0);
