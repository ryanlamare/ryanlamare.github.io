/* Backup PDFs of the exec decks (REHEARSAL.md, the night of 30 Sep: "Claude makes a PDF of each deck for the
   laptop, as a quiet backup"). Every slide fully revealed, one 16:9 page per slide, with the poll server blocked:
   the decks are served locally with the Worker swapped for an empty stand-in, so nothing is posted to a real room
   and no Poll Desk reset is needed afterwards. Boards therefore show zeros. Motion is switched off so each stepped
   scene is drawn at its end.

     node teaching/exec/gt/trial/deck-pdfs.mjs "<output folder>" m1 m2 m3 m4 m5 m6 m7 m8

   About three minutes a deck; V=1 prints each slide as it is captured. Written 30 Sep 2026.

   1 Oct 2026, after the first real build: a slide whose later press hides, fades or covers something an earlier
   press showed (the Price Wars matrix under the stop card, the cards the QR replaces, a matrix solved away) gets
   the page just before that press as well, so the PDF runs the way the slide does. The Gazette (m4/news/) follows
   the stop card, and m1's divide-and-conquer line is drawn with its efficient sequence. Pages can therefore
   outnumber slides. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const [OUT, ...MODS] = process.argv.slice(2);
const SPORT = 8511, DPORT = 9512;
const T = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2' };
let shots = [];
const srv = createServer(async (q, s) => { const u = new URL(q.url, 'http://x');
  if (u.pathname.startsWith('/mock/')) { s.writeHead(200, {'content-type':'application/json','Access-Control-Allow-Origin':'*'}); return s.end('{"answers":[],"counts":[],"total":0,"guesses":[]}'); }
  if (u.pathname === '/__book') { s.writeHead(200, {'content-type':'text/html'}); return s.end(book()); }
  if (u.pathname.startsWith('/__shot/')) { const i = +u.pathname.slice(8); s.writeHead(200, {'content-type':'image/jpeg'}); return s.end(shots[i]); }
  let p = normalize(decodeURIComponent(u.pathname)); if (p.endsWith('/')) p += 'index.html';
  try { let b = await readFile(join(ROOT, p)); const e = extname(p); if (e === '.html' || e === '.js') b = Buffer.from(String(b).replaceAll('https://gt-poll.rlamare.workers.dev', 'http://localhost:' + SPORT + '/mock')); s.writeHead(200, {'content-type': T[e] || 'application/octet-stream'}); s.end(b); } catch { s.writeHead(404); s.end(); } }).listen(SPORT);
function book() {
  return '<!doctype html><html><head><style>@page{size:13.333in 7.5in;margin:0}html,body{margin:0;padding:0}img{display:block;width:13.333in;height:7.5in;page-break-after:always;break-after:page}img:last-child{page-break-after:auto;break-after:auto}</style></head><body>'
    + shots.map((_, i) => '<img src="/__shot/' + i + '">').join('') + '</body></html>';
}
const dir = await mkdtemp(join(tmpdir(), 'pdf-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=' + DPORT, '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:' + DPORT + '/json/version')).json(); break; } catch { await sleep(200); } }
const t = await (await fetch('http://localhost:' + DPORT + '/json/new?about:blank', {method: 'PUT'})).json();
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const wait = new Map(), errors = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Page.javascriptDialogOpening') ws.send(JSON.stringify({id: 990000 + (++id), method: 'Page.handleJavaScriptDialog', params: {accept: false}})); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({id: i, method, params})); });
await send('Runtime.enable'); await send('Page.enable');
const ev = async x => (await send('Runtime.evaluate', {expression: x, returnByValue: true, awaitPromise: true})).result.result.value;
const shot = async () => Buffer.from((await send('Page.captureScreenshot', {format: 'jpeg', quality: 90})).result.data, 'base64');
// pages the room sees in the middle of a deck, from another address: after the slide holding `sel`
const AFTER = { m4: [{ sel: '#lvnews', url: '/teaching/exec/gt/m4/news/' }] };
// what a click draws rather than a press: done on the slide holding `sel` before its last page is taken
const CLICK = { m1: [{ sel: '#nlSeq', run: `document.getElementById('nlSeq').click()`, wait: 4200 }] };
// each text on slide i that can be seen: 'shown', or 'covered' when something else sits on top of it. A text is known
// by its place on the slide as well as its words, since a matrix repeats its numbers and labels (m3's two Southern Routes)
const VIS = `(i=>{const sl=document.querySelectorAll('.slide')[i],out={},w=document.createTreeWalker(sl,NodeFilter.SHOW_TEXT);let n;
  const at=el=>{let p='';for(let e=el;e&&e!==sl;e=e.parentElement){let k=0;for(let s=e;(s=s.previousElementSibling);)k++;p='/'+e.tagName+k+p;}return p;};
  while((n=w.nextNode())){const t=n.textContent.replace(/\\s+/g,' ').trim(),el=n.parentElement;if(!t||!el)continue;
    let e=el,op=1,ok=getComputedStyle(el).visibility!=='hidden';
    while(ok&&e&&e!==document.body){const cs=getComputedStyle(e);if(cs.display==='none')ok=false;else op*=parseFloat(cs.opacity);e=e.parentElement;}
    const r=el.getBoundingClientRect();if(!ok||op<0.35||r.width<1||r.height<1)continue;
    const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);out[at(el)+'|'+t]=top&&!el.contains(top)&&!top.contains(el)?'covered':'shown';}
  return out;})`;
async function open(path) {
  await send('Page.navigate', {url: 'http://localhost:' + SPORT + path}); await sleep(3000);
  // no motion in a still: transitions and animations off, so every stepped state is drawn at its end
  await ev(`(()=>{const s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';document.head.appendChild(s);})()`);
  return ev(`document.querySelectorAll('.slide').length`);
}
const holds = (i, sel) => ev(`!!document.querySelectorAll('.slide')[${i}].querySelector(${JSON.stringify(sel)})`);
async function slidePages(m, i) {
  const mx = await ev(`Math.max(0,...[...document.querySelectorAll('.slide')[${i}].querySelectorAll('[data-step]')].map(e=>+e.dataset.step||0))`);
  let before = null;
  if (mx) {   // press by press: the first press that takes away something already shown keeps the page before it
    const shown = new Set(); let prev = null;
    for (let s = 0; s <= mx; s++) {
      await ev(`location.hash='#${i}.${s}'`); await sleep(s ? 450 : 900);
      const vis = await ev(VIS + `(${i})`);
      if ([...shown].some(k => vis[k] !== 'shown')) { before = prev; break; }
      for (const [k, v] of Object.entries(vis)) if (v === 'shown') shown.add(k);
      if (s < mx) prev = await shot();
    }
  }
  await ev(`location.hash='#${i}.${mx}'`); await sleep(900);
  for (const c of CLICK[m] || []) if (await holds(i, c.sel)) { await ev(c.run); await sleep(c.wait); }
  return before ? [before, await shot()] : [await shot()];
}
await mkdir(OUT, {recursive: true});
for (const m of MODS) {
  shots = []; errors.length = 0;
  await send('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 2, mobile: false});
  const deck = '/teaching/exec/gt/' + m + '/';
  const n = await open(deck);
  for (let i = 0; i < n; i++) {
    shots.push(...await slidePages(m, i)); if (process.env.V) console.log('  slide', i+1, '/', n, '->', shots.length, 'pages');
    for (const a of AFTER[m] || []) if (await holds(i, a.sel)) {
      const k = await open(a.url);
      for (let j = 0; j < k; j++) shots.push(...await slidePages(m, j));
      if (process.env.V) console.log('  then', a.url, k, 'pages');
      await open(deck);
    }
  }
  await send('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  if (process.env.V) console.log('  binding'); await send('Page.navigate', {url: 'http://localhost:' + SPORT + '/__book'}); await sleep(2500); if (process.env.V) console.log('  printing');
  const pdf = await send('Page.printToPDF', {paperWidth: 13.333, paperHeight: 7.5, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, printBackground: true, preferCSSPageSize: true, transferMode: 'ReturnAsStream'});
  const parts = []; for (;;) { const c = await send('IO.read', {handle: pdf.result.stream, size: 1 << 20}); parts.push(Buffer.from(c.result.data, c.result.base64Encoded ? 'base64' : 'utf8')); if (c.result.eof) break; }
  await send('IO.close', {handle: pdf.result.stream});
  const file = join(OUT, 'Module ' + m.slice(1) + '.pdf');
  await writeFile(file, Buffer.concat(parts));
  console.log(m, n, 'slides,', shots.length, 'pages ->', file, 'errors', JSON.stringify([...new Set(errors)]).slice(0, 160));
}
chrome.kill(); srv.close(); process.exit(0);
