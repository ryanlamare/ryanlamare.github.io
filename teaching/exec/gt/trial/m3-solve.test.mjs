/* Headless test of module 3's phone matrix, m3/solve/ (21 Sep 2026): the real
   page in real Chrome, as a phone, driven by touches. The page sends nothing,
   so there is no Worker to mock. The Chrome driver is the one in
   m1-offers.test.mjs.

     node teaching/exec/gt/trial/m3-solve.test.mjs [folder for screenshots]

   A tap crosses a pitch out and a second tap brings it back. A press and hold
   circles a pitch and crosses out the rest of its side; holding it again puts
   the side back as it was, cross-outs included. A tap on any pitch takes the
   circle off. Charm crossed out on both sides and Solve circled on both
   sides lands the red box on 50 · 50. Start again clears the circles. */
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
const state = side => ev(`[...document.querySelectorAll('.mx button.${side}')].map(b=>b.classList.contains('dom')?'O':b.classList.contains('out')?'x':'.').join('')`);
const eq = () => ev(`[...document.querySelectorAll('.cell.eq')].map(c=>c.textContent).join('|')`);

let fails = 0;
const is = async (what, got, want) => { const ok = got === want; if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : `: got ${got}, wanted ${want}`)); };
const PRICE = 0, TERMS = 1, SOLVE = 2, CHARM = 3;

await is('nothing crossed out to start', await state('rl') + await state('cl'), '........');
await tap('rl', CHARM); await is('a tap crosses Charm out', await state('rl'), '...x');
await tap('rl', CHARM); await is('a second tap brings it back', await state('rl'), '....');
await tap('rl', CHARM);
await hold('rl', SOLVE); await is('a hold circles Solve and crosses out the rest', await state('rl'), 'xxOx');
await hold('rl', SOLVE); await is('holding it again puts the side back, Charm still out', await state('rl'), '...x');
await hold('rl', SOLVE);
await tap('rl', PRICE); await is('a tap on another pitch takes the circle off', await state('rl'), '.x.x');
await hold('rl', PRICE); await hold('rl', SOLVE); await hold('rl', SOLVE);
await is('moving the circle keeps the side as it was before the first circle', await state('rl'), '.x.x');
await hold('rl', SOLVE);
await is('no red box while the rival still has four', await eq(), '');
await tap('cl', CHARM); await hold('cl', SOLVE);
await is('the rival: Charm out, Solve circled', await state('cl'), 'xxOx');
await is('the red box is on 50 · 50', await eq(), '50·50');
await shot('solve-circled.png');
await ev(`document.getElementById('again').click()`);
await is('Start again clears the circles', await state('rl') + await state('cl') + await eq(), '........');
await is('no page errors', errors.join(' / '), '');

console.log('screenshots: ' + SHOTS);
ws.close(); chrome.kill(); srv.close(); await sleep(300); await rm(dir, { recursive: true, force: true }).catch(() => {});
process.exit(fails ? 1 : 0);
