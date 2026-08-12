// Headcount — two-device play, end to end in a real browser.
//
//   node rivet/test/online.test.js
//
// relay.test.js proves the protocol with headless clients. This proves the
// *UI*: it starts the dev relay and a static server, opens the real game page
// in headless Chrome with ?uitest=online, and that page hosts a room, plays a
// full game against a bare net.js opponent, drops its socket halfway, and
// calls a rematch (see the ?uitest=online block in ui.js). The page reports
// back by fetching /__done, because headless Chrome has no other way to say
// "I've finished" once the load event is long past.
//
// Skips with a clear message rather than failing if Chrome isn't installed —
// the engine and relay suites are the ones that must run everywhere.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { start, server as relayServer } from '../relay/dev-relay.js';

const GAME_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const CHROMES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
};

const chrome = CHROMES.find((p) => existsSync(p));
if (!chrome) {
  console.log('SKIP: no Chrome or Chromium found — install one to run the browser suite.');
  process.exit(0);
}

// --- the two servers --------------------------------------------------------

let report = null;
let resolveReport;
const reported = new Promise((r) => (resolveReport = r));

const files = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/__done') {
    report = url.searchParams.get('r') || '(empty)';
    res.writeHead(204).end();
    resolveReport();
    return;
  }
  // Confined to the game directory — this is a test fixture, not a server.
  const rel = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  const path = join(GAME_DIR, rel === '/' ? 'index.html' : rel);
  try {
    const body = await readFile(path);
    res.writeHead(200, {
      'content-type': TYPES[extname(path)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

await start(0, true);
await new Promise((r) => files.listen(0, '127.0.0.1', r));
const relayPort = relayServer.address().port;
const filePort = files.address().port;

// --- drive the browser ------------------------------------------------------

const profile = await mkdtemp(join(tmpdir(), 'headcount-'));
const pageUrl =
  `http://127.0.0.1:${filePort}/?uitest=online` +
  `&relay=${encodeURIComponent(`ws://127.0.0.1:${relayPort}`)}`;

const proc = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--user-data-dir=${profile}`,
    pageUrl,
  ],
  { stdio: 'ignore' }
);

const timeout = setTimeout(() => {
  report = 'NETSMOKE FAIL: the page never reported back (90s)';
  resolveReport();
}, 90000);

await reported;
clearTimeout(timeout);
proc.kill();
files.close();
relayServer.close();
await rm(profile, { recursive: true, force: true });

// --- verdict ----------------------------------------------------------------

const ok = report.startsWith('NETSMOKE OK');
console.log('— Two-device play through the real UI');
console.log('  ' + report);
console.log(`\n${ok ? '1 passed, 0 failed' : '0 passed, 1 failed'} (browser, relay protocol v1)`);
process.exit(ok ? 0 : 1);
