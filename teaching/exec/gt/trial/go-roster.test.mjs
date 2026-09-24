/* Headless test of the attendee list (24 Sep 2026): the roster lane on the
   poll Worker, the Poll Desk's paste-tidy-save panel, and the "who are
   you?" picker on /go. The REAL worker.js runs under `wrangler dev` with a
   throwaway secret and its own storage, and the pages are served with the
   Worker's address pointed at it, so nothing touches the live server or
   the real list. Invented names only.

     node teaching/exec/gt/trial/go-roster.test.mjs

   Checks: the lane (read, secret, only gt-roster rooms, cleaning, and that
   /reset leaves the list alone); the tidy rules on spreadsheet, email and
   Spanish-headed pastes; the desk (tidy, fix a name, drop one, save, add a
   late joiner, the clash refusal, remove and undo); and /go on a phone,
   following each change without a reload, forgetting its name after a
   reset of the name room, then falling back to typing a name when the list
   is empty or the server is out of reach. */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const WORKER_DIR = join(ROOT, 'teaching', 'exec', 'gt', 'poll-worker');
const SHOTS = await mkdtemp(join(tmpdir(), 'go-roster-shots-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const WPORT = 8788, PORT = 8141, DEAD = 8142, SECRET = 'roster-test-secret';
const W = 'http://localhost:' + WPORT;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* the real Worker, local, with its own throwaway storage */
const persist = await mkdtemp(join(tmpdir(), 'go-roster-do-'));
const wr = spawn('npx', ['wrangler', 'dev', '--port', String(WPORT), '--var', 'ADMIN_SECRET:' + SECRET, '--persist-to', persist, '--log-level', 'error'], { cwd: WORKER_DIR, stdio: 'ignore' });
let up = false;
for (let i = 0; i < 150 && !up; i++) { try { up = (await fetch(W + '/p/gt-roster/roster')).ok; } catch (_) { await sleep(200); } }
if (!up) { console.log('FAIL  wrangler dev did not start'); wr.kill(); process.exit(1); }

/* the site, with the Worker's address pointed at the local one (or, on the
   second port, at nothing, for the out-of-reach case) */
const serve = target => async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = normalize(decodeURIComponent(url.pathname)); if (p.endsWith('/')) p += 'index.html';
  try {
    let buf = await readFile(join(ROOT, p)); const ext = extname(p);
    if (ext === '.html' || ext === '.js') buf = Buffer.from(String(buf).replaceAll('https://gt-poll.rlamare.workers.dev', target));
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream' }); res.end(buf);
  } catch (_) { res.writeHead(404); res.end('no'); }
};
const srv = createServer(serve(W)).listen(PORT);
const dead = createServer(serve('http://localhost:8799')).listen(DEAD);

const dir = await mkdtemp(join(tmpdir(), 'goroster-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9341', '--user-data-dir=' + dir, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let ver; for (let i = 0; i < 50; i++) { try { ver = await (await fetch('http://localhost:9341/json/version')).json(); break; } catch (_) { await sleep(200); } }

async function page(url, w, h, mobile) {
  const t = await (await fetch('http://localhost:9341/json/new?' + encodeURIComponent('about:blank'), { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(); const errors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  await send('Page.navigate', { url }); await sleep(1500);
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed: ' + expr); return r.result.result.value; };
  const shot = async (name, full) => {
    if (full) { const h = await ev('document.documentElement.scrollHeight'); await send('Emulation.setDeviceMetricsOverride', { width: w, height: Math.max(h, 400), deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile }); await sleep(200); }
    const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(SHOTS, name), Buffer.from(r.result.data, 'base64'));
    if (full) await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile });
  };
  const nav = async u => { await send('Page.navigate', { url: u }); await sleep(1500); };
  return { ev, shot, errors, send, nav };
}

let fails = 0;
const check = (ok, what, got) => { console.log((ok ? 'ok    ' : 'FAIL  ') + what + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); if (!ok) fails++; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/* local wrangler now and then drops the first request to a new room with a
   500 ("Network connection lost"), so a server error is tried again */
const call = async (path, init) => { let r; for (let i = 0; i < 4; i++) { r = await fetch(W + path, init); if (r.status < 500) return r; await sleep(400); } return r; };
const get = room => call('/p/' + room + '/roster').then(r => r.json());
const post = (room, body) => call('/p/' + room + '/roster', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

try {
  /* ---- the lane ---- */
  check(same((await get('gt-roster')).names, []), 'a new roster is empty');
  check((await post('gt-roster', { s: 'wrong', names: ['Zed'] })).status === 403, 'a wrong secret is refused');
  check((await post('m1-av', { s: SECRET, names: ['Zed'] })).status === 404, 'only gt-roster rooms carry a list');
  const cleaned = await (await post('gt-roster-t1', { s: SECRET, names: ['  Ann  ', 'Bo|b', 'ann', '', 'Cy\u0007'] })).json();
  check(same(cleaned.names, ['Ann', 'Bo b', 'Cy']), 'names are cleaned: spaces, bars, control characters, repeats, blanks', cleaned.names);
  await call('/p/gt-roster-t1/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: 'x', v: 'voter-0001' }) });
  await call('/p/gt-roster-t1/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s: SECRET }) });
  check(same((await get('gt-roster-t1')).names, ['Ann', 'Bo b', 'Cy']), 'a room reset leaves the list alone');
  check((await post('gt-roster', { s: SECRET, names: Array(81).fill('x') })).status === 400, 'more than 80 names is refused');

  /* ---- the tidy rules ---- */
  const desk = await page('http://localhost:' + PORT + '/teaching/exec/gt/poll-desk/', 900, 1000, false);
  const tidy = async text => desk.ev('window.GT_ROSTER.tidy(' + JSON.stringify(text) + ')');
  let r = await tidy('First name\tLast name\tEmail\tCompany\nSarah\tJones\tsj@a.com\tAirbus\nSarah\tKent\tsk@a.com\tIberia\nDavid\tSmith\tds@a.com\tRRPF\nDavid\tStone\tdst@a.com\tRRPF\nMIGUEL\tÁLVAREZ\tma@a.com\tRRPF\n\nlucía\tfernández\tlf@a.com\tRRPF\nSarah\tJones\tsj@a.com\tAirbus\n');
  check(same(r.names, ['David Smith', 'David Stone', 'Lucía', 'Miguel', 'Sarah J.', 'Sarah K.']), 'spreadsheet with headings: initials, whole surnames when initials match, capitals, repeats, A to Z', r.names);
  check(r.notes.length === 2, 'it says the headings and the repeat were left out', r.notes);
  r = await tidy('Jones, Tom\nDon Walker\nDr. Robert (Bob) Smith\n1. María José García López\n- ana belén ruiz\nPeter Baker – Airbus\nhelen.walsh@rrpf.com\n0207 946 0000');
  check(same(r.names, ['Ana', 'Bob', 'Don', 'Helen', 'María', 'Peter', 'Tom']), 'one per line: Last, First; titles; nickname; numbering; bullets; a dash; an email', r.names);
  check(r.notes.some(n => /no name/.test(n)), 'a line with no name is reported', r.notes);
  r = await tidy('Nombre\tApellidos\tCorreo\nJavier\tde la Fuente\tj@x.es\nJavier\tMoreno\tjm@x.es\nPablo\tRuiz\tpr@x.es');
  check(same(r.names, ['Javier F.', 'Javier M.', 'Pablo']), 'Spanish headings; the initial skips "de la"', r.names);
  r = await tidy('Name\tEmail\nKaren Lee\tk@x.com\nOmar Haddad\to@x.com');
  check(same(r.names, ['Karen', 'Omar']), 'a single Name column', r.names);
  r = await tidy('Anna\tBerg\tanna@x.com\nTariq\tNoor\tt@x.com');
  check(same(r.names, ['Anna', 'Tariq']), 'columns with no headings', r.names);

  /* ---- the desk: paste, tidy, fix, drop, save ---- */
  await desk.ev(`localStorage.setItem('gt-admin',${JSON.stringify(SECRET)})`);
  await desk.nav('http://localhost:' + PORT + '/teaching/exec/gt/poll-desk/');
  await sleep(800);
  check(await desk.ev(`document.getElementById('paste').open`), 'with no list yet, the paste box starts open');
  check(/No list yet/.test(await desk.ev(`document.getElementById('rcount').textContent`)), 'and the count says there is no list');
  await desk.ev(`document.getElementById('pasteIn').value=${JSON.stringify('First name\tSurname\tEmail\nSarah\tJones\ts@x\nSarah\tKent\tk@x\nJOHN\tPARK\tj@x\nMei\tChen\tm@x\nTomas\tNovak\tt@x\nOla\tNordmann\to@x')};document.getElementById('tidyBtn').click()`);
  check(same(await desk.ev(`[...document.querySelectorAll('#pvList input')].map(i=>i.value)`), ['John', 'Mei', 'Ola', 'Sarah J.', 'Sarah K.', 'Tomas']), 'TIDY IT shows the six names to check');
  await desk.shot('desk-preview.png');
  await desk.ev(`(()=>{const i=[...document.querySelectorAll('#pvList input')].find(i=>i.value==='Tomas');i.value='Tomás';})()`);
  await desk.ev(`[...document.querySelectorAll('#pvList .rrow')].find(r=>r.querySelector('input').value==='Ola').querySelector('.x').click()`);
  await desk.ev(`(()=>{const i=[...document.querySelectorAll('#pvList input')].find(i=>i.value==='Mei');i.value='Sarah J.';})()`);
  await desk.ev(`document.getElementById('saveList').click()`); await sleep(300);
  check(/both show as Sarah J\./.test(await desk.ev(`document.getElementById('rmsg').textContent`)), 'two identical names are refused, and underlined');
  await desk.ev(`(()=>{const i=[...document.querySelectorAll('#pvList input')].find(i=>i.classList.contains('clash')&&i.value==='Sarah J.'&&i!==[...document.querySelectorAll('#pvList input')].find(x=>x.value==='Sarah J.'));i.value='Mei';})()`);
  await desk.ev(`document.getElementById('saveList').click()`); await sleep(800);
  check(same((await get('gt-roster')).names, ['John', 'Mei', 'Sarah J.', 'Sarah K.', 'Tomás']), 'SAVE stores the corrected list on the server', (await get('gt-roster')).names);
  check(/Saved: 5 names/.test(await desk.ev(`document.getElementById('rmsg').textContent`)), 'and says so');
  check(!(await desk.ev(`document.getElementById('paste').open`)) && (await desk.ev(`document.getElementById('pasteIn').value`)) === '', 'the paste box closes and forgets the pasted text');

  /* ---- a phone on /go, following the desk ---- */
  const phone = await page('http://localhost:' + PORT + '/go/?p=m1-familiarity', 390, 844, true);
  await sleep(500);
  check(await phone.ev(`document.getElementById('q').textContent`) === 'First, who are you?', 'the named poll asks who you are first');
  check(same(await phone.ev(`[...document.querySelectorAll('#opts button.pick')].map(b=>b.textContent)`), ['John', 'Mei', 'Sarah J.', 'Sarah K.', 'Tomás']), 'the phone lists the saved names');
  check(await phone.ev(`document.querySelector('#opts input').placeholder`) === 'Not on the list?', 'with a write-in underneath');
  await phone.shot('phone-list.png');

  await desk.ev(`document.getElementById('addName').value='Sarah';document.getElementById('addBtn').click()`); await sleep(600);
  check(/already Sarah J\. on the list/.test(await desk.ev(`document.getElementById('rmsg').textContent`)), 'a late "Sarah" is refused: a last initial is asked for');
  await desk.ev(`document.getElementById('addName').value='priya';document.getElementById('addBtn').click()`); await sleep(600);
  check(same((await get('gt-roster')).names, ['John', 'Mei', 'Priya', 'Sarah J.', 'Sarah K.', 'Tomás']), 'ADD puts a late joiner in, capitalised, in order');
  await sleep(5500);
  check((await phone.ev(`[...document.querySelectorAll('#opts button.pick')].map(b=>b.textContent)`)).includes('Priya'), 'the phone shows the late joiner without a reload');

  await desk.ev(`[...document.querySelectorAll('#rlist .rrow')].find(r=>r.querySelector('.nm').textContent==='John').querySelector('.x').click()`); await sleep(600);
  check(!(await get('gt-roster')).names.includes('John'), '× takes a no-show off');
  check(/John is off the list/.test(await desk.ev(`document.getElementById('rmsg').textContent`)), 'with an UNDO beside the message');
  await sleep(5500);
  check(!(await phone.ev(`[...document.querySelectorAll('#opts button.pick')].map(b=>b.textContent)`)).includes('John'), 'the phone drops the name without a reload');
  await desk.ev(`document.querySelector('#rmsg button').click()`); await sleep(600);
  check((await get('gt-roster')).names.includes('John'), 'UNDO puts the name back');
  await desk.shot('desk-list.png');
  const deskPhone = await page('http://localhost:' + PORT + '/teaching/exec/gt/poll-desk/', 390, 844, true); /* a no-show taken off from his phone */
  await deskPhone.shot('desk-phone.png');

  /* another device changed the list: a remove here must not undo that */
  await post('gt-roster', { s: SECRET, names: ['John', 'Mei', 'Priya', 'Sarah J.', 'Sarah K.', 'Tomás', 'Zara'] });
  await desk.ev(`[...document.querySelectorAll('#rlist .rrow')].find(r=>r.querySelector('.nm').textContent==='Mei').querySelector('.x').click()`); await sleep(600);
  check(same((await get('gt-roster')).names, ['John', 'Priya', 'Sarah J.', 'Sarah K.', 'Tomás', 'Zara']), 'a remove reads the list first, so a name added elsewhere survives');

  await phone.ev(`[...document.querySelectorAll('#opts button.pick')].find(b=>b.textContent==='Priya').click()`); await sleep(3200);
  check(await phone.ev(`localStorage.getItem('gt-name')`) === 'Priya', 'tapping a name claims it');
  check(/familiar/.test(await phone.ev(`document.getElementById('q').textContent`)), 'and the poll itself follows');

  /* a Poll Desk reset of the name room makes the phone ask again (Ryan, 24 Sep:
     his phone stayed registered through every reset) */
  const goUrl = 'http://localhost:' + PORT + '/go/?p=m1-familiarity';
  check(await phone.ev(`localStorage.getItem('gt-claimed')`) === 'Priya', 'the claim reached the server');
  await phone.nav(goUrl); await sleep(500);
  check(/familiar/.test(await phone.ev(`document.getElementById('q').textContent`)), 'a reload keeps the name while the name room stands');
  await call('/p/gt-names/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s: SECRET }) });
  await phone.nav(goUrl); await sleep(500);
  check(await phone.ev(`document.getElementById('q').textContent`) === 'First, who are you?', 'after a reset of the name room the phone asks who you are again');
  check(await phone.ev(`localStorage.getItem('gt-name')`) === null, 'and has forgotten the old name');
  check((await phone.ev(`document.querySelectorAll('#opts button.pick').length`)) > 0, 'with the list to pick from');
  /* a phone past the name room's 15 claims still has an older claim on record:
     after a reset it must be forgotten too (Ryan's own phone) */
  await phone.ev(`localStorage.setItem('gt-name','Zoe');localStorage.setItem('gt-claimed','Old name')`);
  await phone.nav(goUrl); await sleep(500);
  check(await phone.ev(`document.getElementById('q').textContent`) === 'First, who are you?', 'a phone whose last claim was an older name is forgotten after a reset too');
  await phone.ev(`localStorage.setItem('gt-name','Zoe');localStorage.removeItem('gt-claimed')`);
  await phone.nav(goUrl); await sleep(500);
  check(/familiar/.test(await phone.ev(`document.getElementById('q').textContent`)), 'a name whose claim never reached the server is kept');

  /* ---- the fallbacks ---- */
  const clear = await (await post('gt-roster', { s: SECRET, names: [] })).json();
  check(clear.ok && same(clear.names, []), 'the list can be cleared');
  const p2 = await page('http://localhost:' + PORT + '/go/?p=m1-familiarity', 390, 844, true);
  await p2.ev('localStorage.clear()'); await p2.nav('http://localhost:' + PORT + '/go/?p=m1-familiarity'); /* same origin as the phone that claimed Priya */
  check((await p2.ev(`document.querySelectorAll('#opts button.pick').length`)) === 0 && (await p2.ev(`document.querySelector('#opts input').placeholder`)) === 'Type your first name', 'an empty list asks people to type their name');
  const p3 = await page('http://localhost:' + DEAD + '/go/?p=m1-familiarity', 390, 844, true);
  await sleep(1500);
  check((await p3.ev(`document.querySelector('#opts input')?.placeholder`)) === 'Type your first name', 'a server out of reach falls back to typing a name');
  await p3.ev(`localStorage.setItem('gt-name','Priya');localStorage.setItem('gt-claimed','Priya')`);
  await p3.nav('http://localhost:' + DEAD + '/go/?p=m1-familiarity'); await sleep(1000);
  check(/familiar/.test(await p3.ev(`document.getElementById('q').textContent`)), 'a server out of reach never makes a phone forget its name');

  /* ---- the rooms by module (24 Sep 2026) ---- */
  const J = { method: 'POST', headers: { 'content-type': 'application/json' } };
  const seed = (room, kind, body) => call('/p/' + room + '/' + kind, { ...J, body: JSON.stringify({ v: 'seed-voter-0001', ...body }) });
  await seed('m1-familiarity', 'vote', { o: 0 }); await seed('m3-lot', 'say', { t: 'a deal' }); await seed('m2-decade', 'say', { t: 'old' });
  await seed('m2-ult-live', 'say', { t: 'offer' }); await seed('m2-ultimatum', 'say', { t: 'deal' });
  await seed('m4-axelrod', 'say', { t: 'rank|0,1,2,3,4,5' }); await seed('m5-k1', 'vote', { o: 1 }); await seed('m5-k2', 'say', { t: '7' });
  await desk.ev(`localStorage.setItem('gt-admin',${JSON.stringify(SECRET)})`); /* the second phone's clear() took it: same origin */
  await desk.nav('http://localhost:' + PORT + '/teaching/exec/gt/poll-desk/'); await sleep(2500);
  const heads = await desk.ev(`[...document.querySelectorAll('#rooms h3.mod')].map(h=>h.textContent)`);
  check(same(heads, ['Module 1', 'Module 2', 'Module 3', 'Module 4', 'Module 5', 'Module 6', 'Module 7', 'Module 8', 'Across the programme']), 'a section per module in order, and nothing left unsorted', heads);
  const polls = Object.keys(JSON.parse(await readFile(join(ROOT, 'go', 'polls.json'), 'utf8')).polls);
  const deskSrc = await readFile(join(ROOT, 'teaching', 'exec', 'gt', 'poll-desk', 'index.html'), 'utf8');
  const extra = [...deskSrc.matchAll(/\{id:'([^']+)',q:/g)].map(m => m[1]);
  const shown = (await desk.ev(`[...document.querySelectorAll('#rooms > .room, details.fold .room')].map(r=>r.dataset.ids)`)).flatMap(x => x.split(' '));
  check(shown.length === new Set(shown).size && same([...shown].sort(), [...polls, ...extra].sort()), 'every room is on the desk exactly once (' + (polls.length + extra.length) + ')', { shown: shown.length, all: polls.length + extra.length });
  check(await desk.ev(`!document.querySelector('details.fold').open && document.querySelectorAll('details.fold .room').length===34`), 'the 34 retired rooms are folded away, closed');
  check(await desk.ev(`[...document.querySelectorAll('#rooms > h3, #rooms > .room')].reduce((m,e)=>e.tagName==='H3'?(m.h=e.textContent,m):(e.dataset.ids==='m8-twothirds'&&(m.at=m.h),m),{}).at`) === 'Module 7', 'the two-thirds guess sits in module 7, where its deck is');
  const ct = ids => desk.ev(`document.querySelector('.room[data-ids="${ids}"] .ct').textContent`);
  check(await ct('m4-axelrod') === '1', 'the ranking poll counts its answers (it read 0 before)');
  check(await ct(Array.from({ length: 16 }, (_, i) => 'm5-k' + (i + 1)).join(' ')) === '2', 'the quiz row adds up its sixteen questions');
  await desk.ev(`document.querySelector('details.each').open=true`); await sleep(800);
  check(await desk.ev(`document.querySelectorAll('details.each')[0].querySelectorAll('.room').length`) === 16, 'and folds out each question with its own reset');
  await desk.ev(`window.confirm=()=>true;document.querySelector('.room[data-ids="m2-ult-live m2-ultimatum"] button').click()`); await sleep(1500);
  const n = async room => (await (await call('/p/' + room + '/answers')).json()).total;
  check((await n('m2-ult-live')) === 0 && (await n('m2-ultimatum')) === 0, 'a game row resets both its rooms');
  check(await desk.ev(`document.querySelector('.room[data-ids="m2-ult-live m2-ultimatum"] .rs').textContent`) === 'CLEARED', 'and says so in its own row');
  await post('gt-roster', { s: SECRET, names: ['Ana', 'Ben'] });
  await desk.ev(`window.prompt=()=>'RESET';document.getElementById('resetAll').click()`);
  for (let i = 0; i < 60 && !/rooms cleared/.test(await desk.ev(`document.getElementById('msg').textContent`)); i++) await sleep(500);
  const votes = (await (await call('/p/m1-familiarity')).json()).total;
  check(votes === 0 && (await n('m3-lot')) === 0 && (await n('m2-decade')) === 0, 'RESET EVERY ROOM still clears every room, retired ones too', { votes, lot: await n('m3-lot'), decade: await n('m2-decade') });
  check(same((await get('gt-roster')).names, ['Ana', 'Ben']), 'and leaves the attendee list alone');
  check(/80 rooms cleared/.test(await desk.ev(`document.getElementById('msg').textContent`)), 'its message sits under the button', await desk.ev(`document.getElementById('msg').textContent`));
  await desk.shot('desk-rooms.png');
  await desk.ev(`window.scrollTo(0, document.querySelector('#rooms h3.mod').getBoundingClientRect().top + scrollY - 20)`); await sleep(300);
  await desk.shot('desk-modules.png');
  await desk.ev(`window.scrollTo(0, [...document.querySelectorAll('#rooms h3.mod')].find(h=>h.textContent==='Module 5').getBoundingClientRect().top + scrollY - 20)`); await sleep(300);
  await desk.shot('desk-module5.png');
  await desk.ev(`window.scrollTo(0, document.body.scrollHeight)`); await sleep(300);
  await desk.shot('desk-bottom.png');

  for (const [n, p] of [['desk', desk], ['desk on a phone', deskPhone], ['phone', phone], ['empty', p2], ['dead', p3]]) check(!p.errors.length, n + ' page: no script errors', p.errors);
} catch (e) { console.log('FAIL  ' + e.message); fails++; }

console.log(fails ? '\n' + fails + ' FAILED' : '\nALL OK', ' (screenshots in ' + SHOTS + ')');
chrome.kill(); wr.kill(); srv.close(); dead.close();
await rm(dir, { recursive: true, force: true }).catch(() => {});
await rm(persist, { recursive: true, force: true }).catch(() => {});
process.exit(fails ? 1 : 0);
