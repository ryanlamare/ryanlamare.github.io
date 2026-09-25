/* Headless test of the m3 brief pages (25 Sep 2026): two names decide the
   side, the same way on both phones; a pair who both land on one studio
   (a nickname, or a partner copying the boxes in the same order) switch one
   phone to the other brief; a phone keeps the brief it holds.

     node teaching/exec/gt/trial/m3-lot.test.mjs

   Nothing here talks to the poll server, so the Worker address points at
   nothing. Each origin (port) is a separate phone with its own storage. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const SHOTS = await mkdtemp(join(tmpdir(), 'm3-lot-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const PORTS = [8161, 8162, 8163];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const serve = async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = normalize(decodeURIComponent(url.pathname)); if (p.endsWith('/')) p += 'index.html';
  try {
    let buf = await readFile(join(ROOT, p)); const ext = extname(p);
    if (ext === '.html' || ext === '.js') buf = Buffer.from(String(buf).replaceAll('https://gt-poll.rlamare.workers.dev', 'http://localhost:8799'));
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream' }); res.end(buf);
  } catch (_) { res.writeHead(404); res.end('no'); }
};
const srvs = PORTS.map(p => createServer(serve).listen(p));

const dir = await mkdtemp(join(tmpdir(), 'm3lot-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9361', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:9361/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url) {
  const t = await (await fetch('http://localhost:9361/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const nav = async u => { await send('Page.navigate', { url: u }); await sleep(1300); };
  await nav(url);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const shot = async name => { const h = await ev('document.documentElement.scrollHeight');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: Math.max(h, 400), deviceScaleFactor: 2, mobile: true }); await sleep(200);
    const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(SHOTS, name), Buffer.from(r.result.data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); };
  return { ev, nav, shot, errors };
}

let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const LAND = p => 'http://localhost:' + p + '/teaching/exec/gt/m3/lot/';
const open = (a, b) => `(()=>{document.getElementById('me').value=${JSON.stringify(a)};document.getElementById('them').value=${JSON.stringify(b)};document.querySelector('#names button').click();return true})()`;
const studio = `(()=>{const b=document.getElementById('brief');return b&&!b.hidden?document.querySelector('.side .n').textContent:(document.getElementById('lock')&&!document.getElementById('lock').hidden?'LOCKED':'?')})()`;
const who = `(document.getElementById('who')||{}).textContent`;
const swapShown = `(()=>{const s=document.getElementById('swapbox');return !!s&&!s.hidden})()`;
try {
  const A = await page(LAND(PORTS[0]));
  check(/their own name first, then yours/.test(await A.ev(`document.querySelector('.hint').textContent`)), 'the landing hint says whose name goes first');
  await A.ev(open('Alice', 'Bob')); await sleep(1300);
  check(await A.ev(studio) === 'Harrow Pictures', 'Alice (first in the alphabet) gets Harrow', await A.ev(studio));
  check(await A.ev(who) === 'Your partner: Bob' && await A.ev(swapShown), 'her brief names her partner and offers the switch');
  await A.shot('1-harrow.png');

  const B = await page(LAND(PORTS[1]));
  await B.ev(open('Bob', 'Alice')); await sleep(1300);
  check(await B.ev(studio) === 'Larkfield Pictures', 'Bob, typing his own name first, gets Larkfield', await B.ev(studio));

  /* the trap: a partner who copies the first phone's boxes in the same order */
  const C = await page(LAND(PORTS[2]));
  await C.ev(open('Alice', 'Bob')); await sleep(1300);
  check(await C.ev(studio) === 'Harrow Pictures', 'a copied order lands on the same studio (the trap the switch is for)', await C.ev(studio));
  await C.ev(`document.getElementById('swap').click()`); await sleep(1300);
  check(await C.ev(studio) === 'Larkfield Pictures', 'one tap on the switch opens the other brief', await C.ev(studio));
  check(await C.ev(`localStorage.getItem('gt-m3-lot')`) === 'n4w', 'the phone now holds the other brief');
  await C.shot('2-switched.png');
  await C.nav(LAND(PORTS[2])); await sleep(300);
  check(await C.ev(studio) === 'Larkfield Pictures', 'the QR afterwards goes back to the switched brief', await C.ev(studio));
  await C.nav(LAND(PORTS[2]) + 'h7q/');
  check(await C.ev(studio) === 'LOCKED' && !(await C.ev(swapShown)), 'the other brief\'s address shows the note, with no switch on it', await C.ev(studio));
  await C.nav(LAND(PORTS[2]) + 'n4w/');
  await C.ev(`document.getElementById('swap').click()`); await sleep(1300);
  check(await C.ev(studio) === 'Harrow Pictures', 'a switch made by mistake switches back', await C.ev(studio));

  check(A.errors.length + B.errors.length + C.errors.length === 0, 'no script errors', A.errors.concat(B.errors, C.errors));
} catch (e) { console.log('FAIL  ' + e.message); fails++; }
console.log(fails ? fails + ' FAILED' : 'ALL OK', '(shots in ' + SHOTS + ')');
chrome.kill(); srvs.forEach(s => s.close()); process.exit(fails ? 1 : 0);
