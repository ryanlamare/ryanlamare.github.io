/* Headless test of Your notes (/go/notes/, 27 Sep 2026), on a phone-sized
   and a laptop-sized screen.

     node teaching/exec/gt/trial/notes.test.mjs [folder for screenshots]

   The page holds each module's your-world questions exactly as the slides
   have them (checked against the decks here, so a changed question is
   caught); typing saves on the device and a reload keeps it; a module with
   notes opens with a tally; SAVE AS A WORD FILE and COPY ALL carry what was
   written and nothing empty; the page sends nothing anywhere; and /go lists
   it. Every your-world closer's band names the page. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const SHOTS = process.argv[2] || await mkdtemp(join(tmpdir(), 'notes-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const PORT = 8261;
const srv = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = normalize(decodeURIComponent(url.pathname)); if (p.endsWith('/')) p += 'index.html';
  try { const buf = await readFile(join(ROOT, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(buf); }
  catch (_) { res.writeHead(404); res.end('no'); }
}).listen(PORT);
const dir = await mkdtemp(join(tmpdir(), 'notestest-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9395', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:9395/json/version')).json(); break; } catch (_) { await sleep(200); } }
async function page(url, w, h) {
  const t = await (await fetch('http://localhost:9395/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [], requests = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Network.requestWillBeSent') requests.push({ url: m.params.request.url, method: m.params.request.method, body: m.params.request.postData || '' }); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: w < 600 ? 2 : 1, mobile: w < 600 });
  const nav = async u => { await send('Page.navigate', { url: u }); await sleep(1200); };
  await nav(url);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const shot = async name => { const hh = await ev('document.documentElement.scrollHeight');
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: Math.max(hh, h), deviceScaleFactor: w < 600 ? 2 : 1, mobile: w < 600 }); await sleep(250);
    const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(SHOTS, name), Buffer.from(r.result.data, 'base64'));
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: w < 600 ? 2 : 1, mobile: w < 600 }); };
  return { ev, nav, shot, errors, requests };
}
let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const clean = x => x.replace(/<[^>]+>/g, '').replace(/&rsquo;/g, '’').replace(/&ndash;/g, '–').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/* the questions as the decks have them: each YOUR WORLD slide's lead line and rail items */
async function deckQuestions(m) {
  const s = String(await readFile(join(ROOT, 'teaching/exec/gt/m' + m + '/index.html')));
  const secs = s.split('<section class="slide').slice(1).filter(x => x.includes('YOUR WORLD') && x.includes('class="talk"'));
  return secs.map(x => ({
    lead: (x.match(/class="leadline"[^>]*>([\s\S]*?)<\/div>/) || [, ''])[1],
    items: [...x.matchAll(/<div class="rt">([\s\S]*?)<\/div>\s*<\/div>/g)].map(r => r[1]),
    notes: /class="tnote"/.test(x) && /ryanlamare\.com\/go\/notes/.test(x),
  }));
}
try {
  const L = await page('http://localhost:' + PORT + '/go/notes/', 1280, 800);
  const data = JSON.parse(await L.ev(`JSON.stringify([...document.querySelectorAll('details.mod')].map(d=>({t:d.querySelector('.mt').textContent,lead:(d.querySelector('.lead')||{}).textContent||'',q:[...d.querySelectorAll('label.q span')].map(s=>s.textContent)})))`));
  check(data.length === 8, 'eight sections, one a module');
  for (let m = 1; m <= 8; m++) {
    const D = await deckQuestions(m), N = data[m - 1];
    check(D.length >= 1 && D.every(d => d.notes), `m${m}: every your-world band names ryanlamare.com/go/notes`);
    const first = D[0];
    if (first.lead) check(clean(first.lead) === N.lead, `m${m}: the lead line matches the slide`, [clean(first.lead), N.lead]);
    first.items.forEach((it, i) => {
      const want = clean(it.split(/<(?:div|span|small|em)\b/)[0]);   /* the question, without the example or chips under it */
      const got = N.q[i];
      const ok = m === 7 && i === 1 ? got.startsWith(want) : got === want;
      check(ok, `m${m}: question ${i + 1} matches the slide`, [want, got]);
    });
  }
  check(data[2].q[4] === 'Was the game from your world really zero-sum?', 'm3 adds the question Is it really a zero-sum game? ends on');
  check(data[3].q[3].startsWith('How would you get out of yours?'), 'm4 adds How would you get out of yours?');

  /* typing saves on the device, and a reload keeps it */
  await L.ev(`(()=>{const d=document.querySelector('details.mod[data-m="2"]');d.open=true;const t=d.querySelector('textarea');t.value='A lease extension with a regional airline';t.dispatchEvent(new Event('input'));return 1})()`);
  await sleep(600);
  check(await L.ev(`document.getElementById('st').textContent`) === 'Saved on this device', 'typing says Saved on this device');
  check(JSON.parse(await L.ev(`localStorage.getItem('gt-notes')`))['m2-1'] === 'A lease extension with a regional airline', 'and the note is in this browser’s storage');
  await L.nav('http://localhost:' + PORT + '/go/notes/');
  check(await L.ev(`document.querySelector('details.mod[data-m="2"]').open && document.querySelector('details.mod[data-m="2"] textarea').value`) === 'A lease extension with a regional airline', 'a reload keeps it, and opens module 2');
  check(await L.ev(`document.querySelector('details.mod[data-m="2"] .mc').textContent`) === '1 of 4' && await L.ev(`!document.querySelector('details.mod[data-m="1"]').open`), 'module 2 shows 1 of 4; empty modules stay closed');

  /* the Word file and the copy carry what was written */
  await L.ev(`(()=>{window.__blob=null;const o=URL.createObjectURL;URL.createObjectURL=b=>{window.__blob=b;return o.call(URL,b)};HTMLAnchorElement.prototype.click=function(){window.__name=this.download};return 1})()`);
  await L.ev(`document.getElementById('doc').click()`); await sleep(300);
  const doc = await L.ev(`window.__blob.text()`);
  check(await L.ev(`window.__name`) === 'Applied game theory notes.doc' && /Module 2: Sequential strategies/.test(doc) && /A lease extension with a regional airline/.test(doc) && !/Module 1:/.test(doc), 'SAVE AS A WORD FILE: a .doc with module 2 and its answer, and no empty module');
  await L.ev(`(()=>{window.__copied=null;Object.defineProperty(navigator,'clipboard',{value:{writeText:t=>{window.__copied=t;return Promise.resolve()}},configurable:true});return 1})()`);
  await L.ev(`document.getElementById('copy').click()`); await sleep(300);
  const copied = await L.ev(`window.__copied`);
  check(/^Applied Game Theory: my notes/.test(copied) && /What outcome would you like to achieve\?\nA lease extension/.test(copied), 'COPY ALL: the question and the answer, as text');
  await L.shot('notes-laptop.png');

  /* the page sends nothing anywhere */
  const off = L.requests.filter(r => !/^(http:\/\/localhost:\d+|https:\/\/fonts\.(googleapis|gstatic)\.com|blob:|data:)/.test(r.url) || r.method !== 'GET' || /lease extension/i.test(r.url + r.body));
  check(!off.length, 'nothing leaves the device: only the page, its stylesheet and its fonts are fetched, and no request carries a note', off);

  /* a phone */
  const P = await page('http://localhost:' + PORT + '/go/notes/', 390, 844);
  await P.ev(`(()=>{const d=document.querySelector('details.mod[data-m="5"]');d.open=true;return 1})()`); await sleep(200);
  check(await P.ev(`document.documentElement.scrollWidth<=390`), 'fits a phone with no sideways scroll');
  await P.shot('notes-phone.png');

  /* /go lists it */
  const G = await page('http://localhost:' + PORT + '/go/', 390, 844);
  await sleep(1500);
  check(await G.ev(`[...document.querySelectorAll('a.pick')].some(a=>a.getAttribute('href')==='/go/notes/')`), '/go lists Your notes');

  const errs = [L, P, G].flatMap(p => p.errors);
  check(!errs.length, 'no script errors', errs);
} catch (e) { console.log('FAIL  the test threw: ' + (e.stack || e)); fails++; }
chrome.kill(); srv.close(); await rm(dir, { recursive: true, force: true }).catch(() => {});
console.log('screenshots: ' + SHOTS);
console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
