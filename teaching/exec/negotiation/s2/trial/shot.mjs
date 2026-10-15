// Exact screenshots through Chrome's DevTools protocol (headless Chrome will not go below 500px wide, so
// phone shots need this): PROFILE=/tmp/x node shot.mjs out.png <url> <width> <height> [scale]
//   deck slide at full HD: node shot.mjs s.png "http://127.0.0.1:8765/teaching/exec/negotiation/s2/#8.3" 1280 720 1.5
//   phone:                 node shot.mjs p.png "http://127.0.0.1:8765/teaching/exec/negotiation/s2/deal/?demo=1&pair=7&role=a&pick=41303210&done" 390 844
// WAIT=<ms> (default 3500) lets reveals and the phone's result finish first.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const [out, url, w, h, sc] = process.argv.slice(2); const W = +w, H = +h, SCALE = +(sc || 2), PORT = 9335;
const profile = process.env.PROFILE || mkdtempSync(join(tmpdir(), 'shot-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, '--user-data-dir=' + profile, 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  let t; for (let k = 0; k < 50; k++) { try { t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {method: 'PUT'})).json(); break; } catch { await sleep(200); } }
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({id: i, method, params})); });
  await send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: SCALE, mobile: W < 600});
  await send('Page.enable'); await send('Page.navigate', {url}); await sleep(+(process.env.WAIT || 3500));
  const r = await send('Page.captureScreenshot', {format: 'png', clip: {x: 0, y: 0, width: W, height: H, scale: 1}});
  writeFileSync(out, Buffer.from(r.data, 'base64')); console.log('saved', out);
} catch (e) { console.log('ERR', e.message); } finally { chrome.kill('SIGKILL'); }
