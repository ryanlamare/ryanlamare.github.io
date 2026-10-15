/* The negotiation proposal in one PDF, laid out as a pitch book (15 Oct 2026; Ryan: "shouldn't we just give them a
   single pdf", then "just like reels of what the presentation slides would be"). All A4 portrait: the programme
   page printed as a plain document, then the sample session's deck (Session 2) as a reel (every slide fully revealed, eight to a
   page in two columns), then a page of what participants see on their phones, framed as phones. Everything is
   served locally with the poll server swapped for an empty stand-in, so nothing reaches a real room, and the deck
   and phones run on the sample's demo numbers. Links point at the live site.

     node teaching/exec/negotiation/s2/trial/pack.mjs "<output.pdf>"

   Needs Google Chrome, and Python's pypdf to join the two printed parts. V=1 prints progress. */
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
const DECK = '/teaching/exec/negotiation/s2/', PROGRAMME = '/teaching/exec/negotiation/programme/';
const PHONES = ['?demo=1&pair=7&role=a&step=brief', '?demo=1&pair=7&role=a&step=table&tab=31120213', '?demo=1&pair=7&role=a&tab=31120213&done'];
const PER_PAGE = 8;
const T = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.enc':'text/plain' };
const log = (...a) => { if (process.env.V) console.log(...a); };
let shots = [], phones = [];

const srv = createServer(async (q, s) => { const u = new URL(q.url, 'http://x');
  if (u.pathname.startsWith('/mock/')) { s.writeHead(200, {'content-type':'application/json','Access-Control-Allow-Origin':'*'}); return s.end('{"answers":[],"counts":[],"total":0,"entries":[]}'); }
  if (u.pathname === '/__reel') { s.writeHead(200, {'content-type':'text/html'}); return s.end(reel()); }
  if (u.pathname.startsWith('/__shot/')) { s.writeHead(200, {'content-type':'image/jpeg'}); return s.end(shots[+u.pathname.slice(8)]); }
  if (u.pathname.startsWith('/__phone/')) { s.writeHead(200, {'content-type':'image/png'}); return s.end(phones[+u.pathname.slice(9)]); }
  let p = normalize(decodeURIComponent(u.pathname)); if (p.endsWith('/')) p += 'index.html';
  try { let b = await readFile(join(ROOT, p)); const e = extname(p);
    if (e === '.html' || e === '.js') b = Buffer.from(String(b).replaceAll('https://gt-poll.rlamare.workers.dev', 'http://localhost:' + SPORT + '/mock'));
    s.writeHead(200, {'content-type': T[e] || 'application/octet-stream'}); s.end(b);
  } catch { s.writeHead(404); s.end(); } }).listen(SPORT);

/* the reel and the phones, in the programme's own print dress: same page, margins, fonts and section heads */
function reel() {
  const pages = [];
  for (let i = 0; i < shots.length; i += PER_PAGE) pages.push(shots.slice(i, i + PER_PAGE).map((_, k) => i + k));
  const head = (t) => '<div class="shead"><span class="sq"></span><h2>' + t + '</h2></div><hr class="srule">';
  const thumbs = idx => '<div class="grid">' + idx.map(i => '<figure><img src="/__shot/' + i + '"><figcaption>' + (i + 1) + '</figcaption></figure>').join('') + '</div>';
  const ph = (i, n, cap) => '<figure class="ph"><div class="fr"><img src="/__phone/' + i + '"></div><figcaption><b>' + n + '</b>' + cap + '</figcaption></figure>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/brand.css"><style>
@page{size:A4;margin:16mm 17mm 18mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;background:#fff;color:var(--ink);font-family:var(--sans)}
.page{break-after:page} .page:last-child{break-after:auto}
.shead{display:flex;align-items:center;gap:14px}
.shead .sq{width:16px;height:16px;background:var(--red);flex:none}
.shead h2{font-family:var(--display);font-weight:900;font-size:30px;line-height:1.1;color:var(--red);margin:0}
.srule{border:0;border-top:1.5px solid var(--ink);margin:12px 0 14px}
.lead{font-size:15.5px;line-height:1.5;margin:0 0 18px}
.lead a{color:var(--red)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 18px}
figure{margin:0;break-inside:avoid}
.grid img{display:block;width:100%;aspect-ratio:16/9;border:1px solid var(--rule)}
.grid figcaption{font-weight:700;font-size:10.5px;letter-spacing:.08em;color:var(--muted);margin-top:4px}
.phones{display:flex;justify-content:center;gap:32px;margin-top:26px}
.ph{display:flex;flex-direction:column;align-items:center;gap:12px;width:200px}
.fr{box-sizing:content-box;width:180px;height:390px;border:8px solid var(--ink);border-radius:28px;overflow:hidden;background:var(--paper)}
.fr img{width:180px;height:390px;display:block}   /* the phone's whole screen: 390 x 844, scaled */
.ph figcaption{font-weight:600;font-size:14.5px;line-height:1.35;text-align:center}
.ph figcaption b{font-family:var(--display);font-weight:900;color:var(--red);margin-right:6px}
.try{text-align:center;font-size:14px;color:var(--muted);margin-top:30px}
.try a{color:var(--red);font-weight:600}
</style></head><body>
${pages.map((idx, p) => '<section class="page">' + (p === 0 ? head('Sample session') +
  '<p class="lead">Session 2, Creating and Claiming Value: every slide of the deck, shown with demonstration data. The live version is at <a href="' + LIVE + DECK + '">ryanlamare.com/teaching/exec/negotiation/s2</a>.</p>' : '') + thumbs(idx) + '</section>').join('')}
<section class="page">${head('What participants see on their phones')}
<div class="phones">${ph(0, 1, 'Their brief')}${ph(1, 2, 'Their numbers, adding up the deal on the table')}${ph(2, 3, 'Their pair’s result')}</div>
<p class="try">Try it: <a href="${LIVE + DECK}deal/?demo=1">ryanlamare.com/teaching/exec/negotiation/s2/deal/?demo=1</a></p>
</section>
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
const printPDF = async () => {
  const pdf = await send('Page.printToPDF', {printBackground: true, preferCSSPageSize: true, transferMode: 'ReturnAsStream'});
  const parts = []; for (;;) { const c = await send('IO.read', {handle: pdf.result.stream, size: 1 << 20}); parts.push(Buffer.from(c.result.data, c.result.base64Encoded ? 'base64' : 'utf8')); if (c.result.eof) break; }
  await send('IO.close', {handle: pdf.result.stream}); return Buffer.concat(parts);
};
async function open(path) {
  await send('Page.navigate', {url: 'http://localhost:' + SPORT + path}); await sleep(3000);
  await ev('document.fonts.ready.then(() => true)');
  // no motion in a still: every stepped state is drawn at its end
  await ev(`(()=>{const s=document.createElement('style');s.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';document.head.appendChild(s);})()`);
}

/* 1. the programme, printed, with its links pointing at the live site */
await metrics(1100, 1400, 1);
await open(PROGRAMME);
await ev(`document.querySelectorAll('a[href^="/"]').forEach(a => a.href = ${JSON.stringify(LIVE)} + a.getAttribute('href'))`);
const programme = await printPDF();
log('programme printed');

/* 2. the sample deck: each slide as it ends, every press shown */
await metrics(1280, 720, 1.5);
await open(DECK);
const n = await ev(`document.querySelectorAll('.slide').length`);
for (let i = 0; i < n; i++) {
  const mx = await ev(`Math.max(0,...[...document.querySelectorAll('.slide')[${i}].querySelectorAll('[data-step]')].map(e=>+e.dataset.step||0))`);
  await ev(`location.hash='#${i}.${mx}'`); await sleep(1300);
  shots.push(await shot()); log('  slide', i + 1, '/', n);
}

/* 3. what participants see on their phones */
await metrics(390, 844, 2, true);
for (const q of PHONES) { await open(DECK + 'deal/' + q); await sleep(1600); phones.push(await shot('png')); }
log('phones captured');

/* 4. the reel and the phones on A4, then join the two printed parts */
await metrics(1100, 1400, 1);
await open('/__reel'); await sleep(1500);
const book = await printPDF();
await writeFile(join(dir, 'a.pdf'), programme); await writeFile(join(dir, 'b.pdf'), book);
execFileSync('python3', ['-I', '-c', `import sys
from pypdf import PdfWriter
w = PdfWriter()
for f in sys.argv[2:]: w.append(f)
w.add_metadata({'/Title': 'Strategic Negotiation: programme and sample session', '/Author': 'J. Ryan Lamare'})
w.write(sys.argv[1])`, OUT, join(dir, 'a.pdf'), join(dir, 'b.pdf')]);
console.log('wrote', OUT, '|', n, 'slides | errors', JSON.stringify([...new Set(errors)]).slice(0, 200));
chrome.kill(); srv.close(); process.exit(0);
