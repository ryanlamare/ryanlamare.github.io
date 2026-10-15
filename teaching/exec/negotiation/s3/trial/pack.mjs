/* The negotiation proposal in one PDF (15 Oct 2026; Ryan: "shouldn't we just give them a single pdf"). Three parts:
   the programme page, printed as a plain A4 document; Session 3's sample deck, every slide fully revealed, one
   16:9 page a slide (built the way gt/trial/deck-pdfs.mjs builds the gt backups, including the page before any
   press that hides what an earlier press showed); and a closing page of what participants see on their phones,
   framed as phones. Everything is served locally with the poll server swapped for an empty stand-in, so nothing
   reaches a real room, and the deck and phones run on the sample's demo numbers. Links in the programme point
   at the live site.

     node teaching/exec/negotiation/s3/trial/pack.mjs "<output.pdf>"

   Needs Google Chrome, and Python's pypdf to join the A4 and 16:9 parts. V=1 prints progress. */
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..');
const OUT = process.argv[2];
if (!OUT) { console.log('usage: node pack.mjs "<output.pdf>"'); process.exit(1); }
const SPORT = 8521, DPORT = 9522, LIVE = 'https://ryanlamare.com';
const DECK = '/teaching/exec/negotiation/s3/', PROGRAMME = '/teaching/exec/negotiation/programme/';
const PHONES = ['?demo=1&pair=7&role=a&step=brief', '?demo=1&pair=7&role=a&step=table&tab=31120213', '?demo=1&pair=7&role=a&tab=31120213&done'];
const T = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.enc':'text/plain' };
const log = (...a) => { if (process.env.V) console.log(...a); };
let shots = [], phones = [];

const srv = createServer(async (q, s) => { const u = new URL(q.url, 'http://x');
  if (u.pathname.startsWith('/mock/')) { s.writeHead(200, {'content-type':'application/json','Access-Control-Allow-Origin':'*'}); return s.end('{"answers":[],"counts":[],"total":0,"entries":[]}'); }
  if (u.pathname === '/__book') { s.writeHead(200, {'content-type':'text/html'}); return s.end(book()); }
  if (u.pathname === '/__phones') { s.writeHead(200, {'content-type':'text/html'}); return s.end(phonesPage()); }
  if (u.pathname.startsWith('/__shot/')) { s.writeHead(200, {'content-type':'image/jpeg'}); return s.end(shots[+u.pathname.slice(8)]); }
  if (u.pathname.startsWith('/__phone/')) { s.writeHead(200, {'content-type':'image/png'}); return s.end(phones[+u.pathname.slice(9)]); }
  let p = normalize(decodeURIComponent(u.pathname)); if (p.endsWith('/')) p += 'index.html';
  try { let b = await readFile(join(ROOT, p)); const e = extname(p);
    if (e === '.html' || e === '.js') b = Buffer.from(String(b).replaceAll('https://gt-poll.rlamare.workers.dev', 'http://localhost:' + SPORT + '/mock'));
    s.writeHead(200, {'content-type': T[e] || 'application/octet-stream'}); s.end(b);
  } catch { s.writeHead(404); s.end(); } }).listen(SPORT);

function book() {
  return '<!doctype html><html><head><style>@page{size:13.333in 7.5in;margin:0}html,body{margin:0;padding:0}img{display:block;width:13.333in;height:7.5in;page-break-after:always;break-after:page}img:last-child{page-break-after:auto;break-after:auto}</style></head><body>'
    + shots.map((_, i) => '<img src="/__shot/' + i + '">').join('') + '</body></html>';
}
/* the closing page: the three phone screens in frames, in the deck's own dress */
function phonesPage() {
  const ph = (i, n, cap) => '<div class="ph"><div class="fr"><img src="/__phone/' + i + '"></div><div class="cap"><b>' + n + '</b>' + cap + '</div></div>';
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/brand.css"><style>
html,body{margin:0;width:1280px;height:720px;background:var(--paper);font-family:var(--sans);color:var(--ink);overflow:hidden;position:relative}
.k{position:absolute;top:66px;left:0;right:0;text-align:center;font-weight:500;text-transform:uppercase;letter-spacing:.2em;font-size:15px;color:var(--muted)}
.k i{display:inline-block;width:11px;height:11px;background:var(--red);margin-right:13px;vertical-align:middle}
h2{position:absolute;top:96px;left:0;right:0;margin:0;text-align:center;font-weight:700;font-size:42px;line-height:1.08;color:var(--red);text-transform:uppercase}
.row{position:absolute;top:176px;left:0;right:0;display:flex;justify-content:center;gap:76px}
.ph{display:flex;flex-direction:column;align-items:center;gap:12px;width:250px}
.fr{width:185px;height:400px;border:8px solid var(--ink);border-radius:28px;overflow:hidden;background:var(--paper)}
.fr img{width:185px;height:400px;display:block}
.cap{font-weight:600;font-size:16px;line-height:1.35;text-align:center}
.cap b{font-family:var(--display);font-weight:900;color:var(--red);margin-right:7px}
.url{position:absolute;bottom:30px;left:0;right:0;text-align:center;font-weight:500;font-size:14px;color:var(--muted)}
</style></head><body>
<div class="k"><i></i>Session 3 · On their phones</div>
<h2>What participants see on their phones</h2>
<div class="row">${ph(0, 1, 'Their brief')}${ph(1, 2, 'Their numbers, adding up the deal on the table')}${ph(2, 3, 'Their pair’s result')}</div>
<div class="url">Try it: ryanlamare.com/teaching/exec/negotiation/s3/deal/?demo=1</div>
</body></html>`;
}

const dir = await mkdtemp(join(tmpdir(), 'negpack-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=' + DPORT, '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await (await fetch('http://localhost:' + DPORT + '/json/version')).json(); break; } catch { await sleep(200); } }
const t = await (await fetch('http://localhost:' + DPORT + '/json/new?about:blank', {method: 'PUT'})).json();
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const wait = new Map(), errors = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({id: i, method, params})); });
await send('Runtime.enable'); await send('Page.enable');
const ev = async x => (await send('Runtime.evaluate', {expression: x, returnByValue: true, awaitPromise: true})).result.result.value;
const shot = async (format = 'jpeg') => Buffer.from((await send('Page.captureScreenshot', format === 'png' ? {format} : {format, quality: 88})).result.data, 'base64');
const metrics = (width, height, deviceScaleFactor, mobile = false) => send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor, mobile});
const printPDF = async params => {
  const pdf = await send('Page.printToPDF', {printBackground: true, preferCSSPageSize: true, transferMode: 'ReturnAsStream', ...params});
  const parts = []; for (;;) { const c = await send('IO.read', {handle: pdf.result.stream, size: 1 << 20}); parts.push(Buffer.from(c.result.data, c.result.base64Encoded ? 'base64' : 'utf8')); if (c.result.eof) break; }
  await send('IO.close', {handle: pdf.result.stream}); return Buffer.concat(parts);
};
async function open(path) {
  await send('Page.navigate', {url: 'http://localhost:' + SPORT + path}); await sleep(3000);
  await ev('document.fonts.ready.then(() => true)');
  // no motion in a still: every stepped state is drawn at its end
  await ev(`(()=>{const s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';document.head.appendChild(s);})()`);
}

/* 1. the programme, as a printed A4 document whose links go to the live site */
await metrics(1100, 1400, 1);
await open(PROGRAMME);
await ev(`document.querySelectorAll('a[href^="/"]').forEach(a => a.href = ${JSON.stringify(LIVE)} + a.getAttribute('href'))`);
const programme = await printPDF({});
log('programme printed');

/* 2. the sample deck: each slide fully revealed, and the page before any press that takes something away */
const VIS = `(i=>{const sl=document.querySelectorAll('.slide')[i],out={},w=document.createTreeWalker(sl,NodeFilter.SHOW_TEXT);let n;
  const at=el=>{let p='';for(let e=el;e&&e!==sl;e=e.parentElement){let k=0;for(let s=e;(s=s.previousElementSibling);)k++;p='/'+e.tagName+k+p;}return p;};
  while((n=w.nextNode())){const t=n.textContent.replace(/\\s+/g,' ').trim(),el=n.parentElement;if(!t||!el)continue;
    let e=el,op=1,ok=getComputedStyle(el).visibility!=='hidden';
    while(ok&&e&&e!==document.body){const cs=getComputedStyle(e);if(cs.display==='none')ok=false;else op*=parseFloat(cs.opacity);e=e.parentElement;}
    const r=el.getBoundingClientRect();if(!ok||op<0.35||r.width<1||r.height<1)continue;
    const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);out[at(el)+'|'+t]=top&&!el.contains(top)&&!top.contains(el)?'covered':'shown';}
  return out;})`;
async function slidePages(i) {
  const mx = await ev(`Math.max(0,...[...document.querySelectorAll('.slide')[${i}].querySelectorAll('[data-step]')].map(e=>+e.dataset.step||0))`);
  let before = null;
  if (mx) {
    const shown = new Set(); let prev = null;
    for (let s = 0; s <= mx; s++) {
      await ev(`location.hash='#${i}.${s}'`); await sleep(s ? 450 : 900);
      const vis = await ev(VIS + `(${i})`);
      if ([...shown].some(k => vis[k] !== 'shown')) { before = prev; break; }
      for (const [k, v] of Object.entries(vis)) if (v === 'shown') shown.add(k);
      if (s < mx) prev = await shot();
    }
  }
  await ev(`location.hash='#${i}.${mx}'`); await sleep(1200);
  return before ? [before, await shot()] : [await shot()];
}
await metrics(1280, 720, 1.5);
await open(DECK);
const n = await ev(`document.querySelectorAll('.slide').length`);
for (let i = 0; i < n; i++) { shots.push(...await slidePages(i)); log('  slide', i + 1, '/', n, '->', shots.length, 'pages'); }

/* 3. what participants see on their phones */
await metrics(390, 844, 2, true);
for (const q of PHONES) { await open(DECK + 'deal/' + q); await sleep(1600); phones.push(await shot('png')); }
await metrics(1280, 720, 1.5);
await open('/__phones'); await sleep(1500);
shots.push(await shot());
log('phones page done');

/* 4. bind the deck pages at 16:9, then join the two parts */
await metrics(1280, 720, 1);
await send('Page.navigate', {url: 'http://localhost:' + SPORT + '/__book'}); await sleep(2500);
const deck = await printPDF({paperWidth: 13.333, paperHeight: 7.5, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0});
await writeFile(join(dir, 'a.pdf'), programme); await writeFile(join(dir, 'b.pdf'), deck);
execFileSync('python3', ['-I', '-c', `import sys
from pypdf import PdfWriter
w = PdfWriter()
for f in sys.argv[2:]: w.append(f)
w.add_metadata({'/Title': 'Strategic Negotiation: programme and sample session', '/Author': 'J. Ryan Lamare'})
w.write(sys.argv[1])`, OUT, join(dir, 'a.pdf'), join(dir, 'b.pdf')]);
console.log('wrote', OUT, '|', n, 'slides,', shots.length, 'deck pages | errors', JSON.stringify([...new Set(errors)]).slice(0, 200));
chrome.kill(); srv.close(); process.exit(0);
