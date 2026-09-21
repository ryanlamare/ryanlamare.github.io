/* Headless test of the write-in unlock on /go/ (21 Sep 2026): a Poll Desk
   reset of a room has to let a phone that already answered answer again.
   The choice and rank polls always did this; the three write-in kinds (one
   answer, the pair, the m1 hand) kept their lock in the phone's own storage
   and never asked the room. Real Chrome against a MOCK Worker, the driver
   from m2-boards.test.mjs, so nothing touches the real m5 rooms.

     node teaching/exec/gt/trial/go-reset.test.mjs

   A phone answers m5-k2 (one write-in) and the m5-k8 pair, a reload shows
   both locked, the rooms are reset, and a reload offers the boxes again.
   With only ONE room of the pair reset the pair stays locked. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const SHOTS = await mkdtemp(join(tmpdir(), 'go-reset-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const PORT = 8139;
const rooms = {};
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
const srv = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/mock/')) {
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
    const m = url.pathname.match(/^\/mock\/p\/([a-z0-9-]+)\/?(\w+)?$/);
    const J = o => { res.writeHead(200, { ...CORS, 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (m && m[2] === 'entries') { const L = rooms[m[1]] || []; return J({ entries: L, total: L.length }); }
    if (m && m[2] === 'say' && req.method === 'POST') {
      let b = ''; req.on('data', c => b += c); req.on('end', () => { const j = JSON.parse(b || '{}'); (rooms[m[1]] = rooms[m[1]] || []).push({ v: j.v, t: j.t }); J({ ok: true }); }); return;
    }
    return J({ votes: {}, entries: [], answers: [], counts: [], total: 0 });
  }
  let p = normalize(decodeURIComponent(url.pathname)); if (p.endsWith('/')) p += 'index.html';
  try {
    let buf = await readFile(join(ROOT, p)); const ext = extname(p);
    if (ext === '.html' || ext === '.js') buf = Buffer.from(String(buf).replaceAll('https://gt-poll.rlamare.workers.dev', 'http://localhost:' + PORT + '/mock'));
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream' }); res.end(buf);
  } catch (_) { res.writeHead(404); res.end('no'); }
}).listen(PORT);

const dir = await mkdtemp(join(tmpdir(), 'goreset-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9339', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ver; for (let i = 0; i < 50; i++) { try { ver = await (await fetch('http://localhost:9339/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9339/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' ')); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  await send('Page.navigate', { url }); await sleep(1500);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(SHOTS, name), Buffer.from(r.result.data, 'base64')); };
  const key = async k => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: 39 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: 39 }); };
  const centre = sel => ev(`(()=>{const e=${sel};const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];})()`);
  const pressAt = async (sel, ms) => { await send('Page.bringToFront'); const [x, y] = await centre(sel);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await sleep(ms);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
  return { ev, shot, key, pressAt, errors, send };
}

let fails = 0;
const check = (ok, what) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what); if (!ok) fails++; };
const base = 'http://localhost:' + PORT + '/go/?p=';
const boxes = p => p.ev(`document.querySelectorAll('#opts input').length`);
const status = p => p.ev(`document.getElementById('status').textContent`);
const go = async (p, id) => { await p.send('Page.navigate', { url: base + id }); await sleep(1500); };

try {
  const P = await page(base + 'm5-k2', 390, 800, true);
  check(await boxes(P) === 1, 'a fresh phone gets a box for the positive number');
  await P.ev(`(()=>{document.querySelector('#opts input').value='7';document.querySelector('#opts .sayrow button').click();})()`); await sleep(600);
  check((rooms['m5-k2'] || []).length === 1, 'the answer reaches the room');
  await go(P, 'm5-k2');
  check(await boxes(P) === 0 && (await status(P)).length > 0, 'after a reload the phone is locked, no box');

  rooms['m5-k2'] = [];
  await go(P, 'm5-k2');
  check(await boxes(P) === 1 && (await status(P)) === '', 'after a reset of the room the box is back and the locked line is gone');
  await P.ev(`(()=>{document.querySelector('#opts input').value='1';document.querySelector('#opts .sayrow button').click();})()`); await sleep(600);
  check(rooms['m5-k2'].length === 1 && rooms['m5-k2'][0].t === '1', 'the phone answers again, once');

  /* ---------- the pair: two rooms on one screen ---------- */
  await go(P, 'm5-k8');
  check(await boxes(P) === 2, 'the pair shows two boxes');
  await P.ev(`(()=>{const i=document.querySelectorAll('#opts input');i[0].value='Brady';i[1].value='Adele';[...document.querySelectorAll('#opts button')].find(b=>b.textContent.includes('SEND BOTH')).click();})()`); await sleep(700);
  check((rooms['m5-k8'] || []).length === 1 && (rooms['m5-k9'] || []).length === 1, 'both answers reach their own rooms');
  rooms['m5-k8'] = [];
  await go(P, 'm5-k8');
  check(await boxes(P) === 0, 'with only one of the two rooms reset the pair stays locked');
  rooms['m5-k9'] = [];
  await go(P, 'm5-k8');
  check(await boxes(P) === 2, 'with both rooms reset the pair opens again');
  check(!P.errors.length, 'no script errors on the phone' + (P.errors.length ? ': ' + P.errors.join(' / ') : ''));
} catch (e) { console.log('FAIL  the test threw: ' + (e.stack || e)); fails++; }
chrome.kill(); srv.close(); await rm(dir, { recursive: true, force: true }).catch(() => {});
console.log(fails ? fails + ' FAILED' : 'ALL OK');
process.exit(fails ? 1 : 0);
