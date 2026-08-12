// Pavilion — the board UI (build step 2), and the game's copy layer.
//
// This file is the ONLY place the theme lives. The engine, the wire protocol
// and the archived game record are deliberately theme-neutral (kind / source /
// pool / line / floor, PAVILION-RULES.md §10) because the theme has moved
// three times and a stored game is meant to outlive the term. So the mapping
// from those words to Pavilion's — a kind is a discipline, a source is an
// agency, the pool is the gate, a line is a crew, the floor is idle — is made
// here, once, and a fourth theme change is an edit to this file.
//
// Three rules from the memo govern the rest of it:
//   - The engine is the only rules authority. The UI highlights from
//     legalMoves(), submits moves through apply(), and never re-implements
//     legality or scoring. Per-step score deltas for the theatre are computed
//     with the engine's own exported scorePlacement/wallColumn.
//   - Animations are driven by engine state-diffs: applyTake() gives the end
//     of Phase A, apply() the resolved round; the difference between the two
//     is exactly the closing-the-books theatre. No animation logic in the
//     engine, no game logic in the animations.
//   - Two-tap interaction: tap tiles at a source, legal destinations light
//     up, tap one. Same model on mouse, trackpad and touch.
//
// prefers-reduced-motion: every flight and beat routes through instant(),
// which skips them wholesale — one code path, instant moves, same game.

import * as E from './engine.js';
import { greedyMove } from './bot.js';
import { freshSeed } from './words.js';
import { Relay, defaultRelayUrl, deviceKind } from './net.js';

// Every nation sent a commissioner to Chicago to see its pavilion built.
// Yours is across the way, hiring from the same crowd, and they have done
// this before.
const BOT_NAME = 'The Commissioner';
const BOT_SEAT = 1; // practice games are always you (seat 0) vs the bot

// Engine kind 0-4 → the five disciplines. The engine knows neither the names
// nor the order matters to anything but this line and style.css's .k0-.k4.
const DISC = ['Art', 'Science', 'Machinery', 'Electricity', 'Nature'];
const ICONS = ['ic-art', 'ic-sci', 'ic-mac', 'ic-ele', 'ic-nat'];
// Agencies carry no visible name (Ryan, 2026-08-06) — these survive only in
// screen-reader labels and move announcements, where telling one agency from
// another still matters. Chicago streets, so nothing collides with a room
// code (icon + national pavilion) or a discipline.
const AGENCY_NAMES = [
  'Clark Street', 'Halsted Street', 'Canal Street', 'State Street', 'Wabash Avenue',
  'Archer Avenue', 'Milwaukee Avenue', 'Blue Island', 'Ashland Avenue',
];
const $ =(sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
const instant = () => REDUCED.matches || window.__instant === true;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The one pacing knob (punch list #1): --tempo in style.css scales every
// theatre duration, CSS keyframes and the JS timings below alike.
const TEMPO =
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tempo')) || 1;
const T = (ms) => Math.round(ms * TEMPO);
const beat = (ms) => (instant() ? Promise.resolve() : sleep(T(ms)));
const snap = (s) => JSON.parse(JSON.stringify(s));

let G = null; // the running game
let sel = null; // {source, kind} — first tap of the two-tap
let animating = false;

// ---------------------------------------------------------------------------
// Markup helpers.

function tileHTML(kind, cls = '') {
  return `<div class="tile k${kind}${cls ? ' ' + cls : ''}"><svg class="ic" aria-hidden="true"><use href="#${ICONS[kind]}"/></svg></div>`;
}
function tokenHTML() {
  return `<div class="token" title="First Call token"><svg class="ic" aria-hidden="true"><use href="#ic-first"/></svg></div>`;
}

// "3 galleries", "1 aisle" — the end screen counts things and a bare plural
// reads as a typo when the count is one.
function count(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

function sameSource(a, b) {
  return a.type === b.type && (a.type !== 'source' || a.index === b.index);
}

// ---------------------------------------------------------------------------
// Rendering. Everything rebuilds from a state snapshot; during theatre the
// snapshot lags G.cur deliberately.

function renderAll(st = G.view) {
  $('#week-badge').textContent = 'W' + st.round;
  $('#pool-count').textContent = st.bag.length;
  const turn = $('#turn-label');
  if (st.over) {
    turn.textContent = '';
    setPhase('Opening day');
  } else {
    turn.innerHTML = `<b>${esc(G.names[st.seatToMove])}</b> is hiring`;
  }
  renderSources(st);
  renderPool(st);
  renderBoards(st);
  applySelection(st);
}

function renderSources(st) {
  const wrap = $('#sources');
  wrap.innerHTML = '';
  st.sources.forEach((counts, i) => {
    const total = counts.reduce((a, b) => a + b, 0);
    const a = document.createElement('div');
    a.className = 'source' + (total === 0 ? ' empty' : '');
    a.dataset.source = i;
    const slots = [];
    for (let kind = 0; kind < 5; kind++) {
      for (let n = 0; n < counts[kind]; n++) {
        slots.push(
          `<button class="tile k${kind}" data-kind="${kind}"
             aria-label="Engage ${counts[kind]} ${DISC[kind]} from the ${AGENCY_NAMES[i]} agency; the rest go to the gate">
             <svg class="ic" aria-hidden="true"><use href="#${ICONS[kind]}"/></svg>
           </button>`
        );
      }
    }
    a.innerHTML = `<div class="slots">${slots.join('')}</div>`;
    wrap.appendChild(a);
  });
}

function renderPool(st) {
  const c = $('#pool');
  c.innerHTML = '';
  if (st.firstTokenInPool) {
    const t = document.createElement('div');
    t.innerHTML = tokenHTML();
    t.firstChild.id = 'fm-token';
    c.appendChild(t.firstChild);
  }
  let any = false;
  for (let kind = 0; kind < 5; kind++) {
    for (let n = 0; n < st.pool[kind]; n++) {
      any = true;
      const b = document.createElement('button');
      b.className = `tile k${kind}`;
      b.dataset.kind = kind;
      b.setAttribute(
        'aria-label',
        `Engage ${st.pool[kind]} ${DISC[kind]} from the gate` +
          (st.firstTokenInPool ? ' (comes with the First Call token)' : '')
      );
      b.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#${ICONS[kind]}"/></svg>`;
      c.appendChild(b);
    }
  }
  if (!any && !st.firstTokenInPool) {
    c.innerHTML = '<span class="none">empty — whoever a rival passes over waits here</span>';
  }
}

function renderBoards(st) {
  const wrap = $('#boards');
  wrap.innerHTML = '';
  const narrow = matchMedia('(max-width: 940px)').matches;
  st.boards.forEach((b, seat) => {
    const active = !st.over && seat === st.seatToMove;
    const el = document.createElement('div');
    el.className = 'board' + (active ? ' active' : '');
    el.dataset.seat = seat;
    if (narrow && !active) {
      el.classList.add('collapsible');
      if (!G.expand[seat]) el.classList.add('collapsed');
    }
    // Phones (punch #6): the board you're playing sits right under the
    // market. In a practice game that's always the human seat — the bot's
    // board shouldn't leapfrog yours while it thinks — and online it's your
    // own seat, which doesn't move while your opponent thinks either.
    const mine = G.cfg.bot ? seat === 0 : G.online ? seat === G.mySeat : active;
    if (narrow) el.style.order = mine ? -1 : 0;

    // One crew per gallery, gathered right to left: the rightmost space sits
    // against the pavilion, which is the display it will become.
    const crews = [];
    for (let r = 0; r < 5; r++) {
      const cap = r + 1;
      const t = b.lines[r];
      const cells = [];
      for (let i = 0; i < cap; i++) {
        const occ = i >= cap - t.count;
        cells.push(`<span class="ccell${occ ? ' occ' : ''}">${occ ? tileHTML(t.kind) : ''}</span>`);
      }
      const label = t.count
        ? `Gallery ${cap} crew: ${t.count} of ${cap} ${DISC[t.kind]}`
        : `Gallery ${cap} crew: empty, room for ${cap}`;
      crews.push(
        `<button class="crew" data-row="${r}" aria-label="${label}">${cells.join('')}</button>`
      );
    }

    const wall = [];
    for (let r = 0; r < 5; r++) {
      const cells = [];
      for (let c = 0; c < 5; c++) {
        const kind = (c - r + 5) % 5; // inverse of wallColumn
        const filled = b.wall[r][c] === 1;
        // An unbuilt cell is the real tile, faded by the .open class — colour
        // is how you read raised vs still-open (punch #3).
        cells.push(
          `<span class="wcell${filled ? ' filled' : ''}" data-rc="${r}-${c}">` +
            tileHTML(kind, filled ? '' : 'open') +
            `</span>`
        );
      }
      wall.push(`<div class="wrow">${cells.join('')}</div>`);
    }

    const icells = [];
    for (let i = 0; i < E.FLOOR_SIZE; i++) {
      const entry = b.floor[i];
      const inner =
        entry === undefined ? '' : entry === E.FIRST_TOKEN ? tokenHTML() : tileHTML(entry);
      icells.push(
        `<span class="icell"><span class="islot">${inner}</span><span class="pen">−${E.FLOOR_PENALTIES[i]}</span></span>`
      );
    }

    el.innerHTML = `
      <div class="board-head">
        <span class="board-name">${esc(G.names[seat])}</span>
        ${G.online && seat === G.mySeat ? '<span class="you">you</span>' : ''}
        ${G.online && G.presence[seat] === false ? '<span class="away" role="status">reconnecting…</span>' : ''}
        ${b.firstToken ?'<svg class="board-fm" role="img" aria-label="Has First Call next week" title="First Call next week"><use href="#ic-first"/></svg>' : ''}
        <span class="expand-hint">tap to expand</span>
        <span class="board-spacer"></span>
        <span class="clock" data-seat="${seat}"></span>
        <span class="score" data-seat="${seat}">${b.score}</span>
      </div>
      <div class="play-area">
        <div class="crews">${crews.join('')}</div>
        <div class="wall">${wall.join('')}</div>
        <div class="idle-wrap">
          <button class="idle" aria-label="Idle: ${b.floor.length} of 7 spaces taken">${icells.join('')}</button>
        </div>
      </div>`;
    wrap.appendChild(el);
  });
  renderClocks();
}

function applySelection() {
  $$('.tile.sel, .tile.dim').forEach((t) => t.classList.remove('sel', 'dim'));
  $$('.crew.can-drop, .idle.can-drop').forEach((t) => t.classList.remove('can-drop'));
  if (!sel || !G || G.cur.over) return;

  const srcEl =
    sel.source.type === 'source'
      ? $(`.source[data-source="${sel.source.index}"]`)
      : $('#pool');
  if (srcEl) {
    $$('.tile', srcEl).forEach((t) => {
      t.classList.add(Number(t.dataset.kind) === sel.kind ? 'sel' : 'dim');
    });
  }

  const dests = E.legalMoves(G.cur).filter(
    (m) => sameSource(m.source, sel.source) && m.kind === sel.kind
  );
  const boardEl = $(`.board[data-seat="${G.cur.seatToMove}"]`);
  if (!boardEl) return;
  for (const m of dests) {
    if (m.dest.type === 'line') {
      const row = $(`.crew[data-row="${m.dest.row}"]`, boardEl);
      row.classList.add('can-drop');
      row.setAttribute('aria-label', row.getAttribute('aria-label') + ' — legal destination');
    } else {
      const idle = $('.idle', boardEl);
      idle.classList.add('can-drop');
    }
  }
}

function renderClocks() {
  if (!G) return;
  G.names.forEach((_, seat) => {
    const el = $(`.clock[data-seat="${seat}"]`);
    if (!el) return;
    if (!G.clockMs) {
      el.textContent = '';
      return;
    }
    let ms = G.remaining[seat];
    if (G.clockSeat === seat) ms -= performance.now() - G.clockTs;
    ms = Math.max(0, ms);
    const s = Math.ceil(ms / 1000);
    el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    el.classList.toggle('running', G.clockSeat === seat);
    el.classList.toggle('low', G.clockSeat === seat && ms < 30000);
  });
}

function setPhase(label) {
  $('#phase-label').textContent = label;
}

function setScore(seat, value) {
  const el = $(`.score[data-seat="${seat}"]`);
  if (!el) return;
  el.textContent = value;
  el.classList.remove('bump');
  void el.offsetWidth; // restart the animation
  el.classList.add('bump');
}

function announce(msg) {
  $('#live').textContent = msg;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// ---------------------------------------------------------------------------
// Flights and theatre.

function fly(fromRect, toRect, html, { dur = 420, delay = 0, lift = 26 } = {}) {
  // A collapsed board's cells measure 0×0; flying "to" them smears a tile
  // across the screen. Skip the flight, keep the state change.
  if (instant() || fromRect.width < 2 || toRect.width < 2) return Promise.resolve();
  const el = document.createElement('div');
  el.className = 'fx-tile';
  el.style.width = fromRect.width + 'px';
  el.style.height = fromRect.height + 'px';
  el.innerHTML = html;
  $('#fx').appendChild(el);
  const scale = toRect.width / fromRect.width;
  const midX = (fromRect.left + toRect.left) / 2;
  const midY = Math.min(fromRect.top, toRect.top) - lift;
  const anim = el.animate(
    [
      { transform: `translate(${fromRect.left}px, ${fromRect.top}px) scale(1)` },
      {
        transform: `translate(${midX}px, ${midY}px) scale(${(1 + scale) / 2})`,
        offset: 0.5,
      },
      { transform: `translate(${toRect.left}px, ${toRect.top}px) scale(${scale})` },
    ],
    { duration: T(dur), delay: T(delay), easing: 'cubic-bezier(.25,.8,.25,1)', fill: 'both' }
  );
  return anim.finished.then(() => el.remove()).catch(() => el.remove());
}

function popup(text, rect, cls = '') {
  if (instant() || rect.width < 2) return;
  const el = document.createElement('div');
  el.className = 'popup ' + cls;
  el.textContent = text;
  el.style.left = rect.left + rect.width / 2 - 12 + 'px';
  el.style.top = rect.top - 8 + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), T(950));
}

let bannerTimer = null;
function banner(html) {
  announce($('#live').textContent + ' ' + html.replace(/<[^>]+>/g, ''));
  if (instant()) return Promise.resolve();
  const el = $('#banner');
  clearTimeout(bannerTimer);
  el.classList.remove('show');
  void el.offsetWidth;
  el.innerHTML = html;
  el.classList.add('show');
  bannerTimer = setTimeout(() => el.classList.remove('show'), T(1600));
  return sleep(T(650));
}

// The Phase A beat: the craftspeople you engage fly to their crew, the ones
// you passed over spill to the gate, the token flips onto your idle row.
async function animatePhaseA(before, interim, move) {
  const mover = before.seatToMove;
  const takenKind = move.kind;

  // Capture source rects before re-rendering.
  const srcEl =
    move.source.type === 'source'
      ? $(`.source[data-source="${move.source.index}"]`)
      : $('#pool');
  const takenRects = $$(`.tile[data-kind="${takenKind}"]`, srcEl).map((t) =>
    t.getBoundingClientRect()
  );
  const leftoverRects = {};
  if (move.source.type === 'source') {
    for (let kind = 0; kind < 5; kind++) {
      if (kind === takenKind) continue;
      const els = $$(`.tile[data-kind="${kind}"]`, srcEl);
      if (els.length) leftoverRects[kind] = els.map((t) => t.getBoundingClientRect());
    }
  }
  const tokenEl = move.source.type === 'pool' ? $('#fm-token') : null;
  const tokenRect = tokenEl ? tokenEl.getBoundingClientRect() : null;

  // Show the interim state with arrivals hidden, then fly into them.
  G.view = snap(interim);
  renderAll();
  setPhase('');

  const boardEl = $(`.board[data-seat="${mover}"]`);
  const iBoard = interim.boards[mover];
  const bBoard = before.boards[mover];
  const flights = [];
  let flightNo = 0;
  const stag = () => ({ delay: flightNo++ * 45 });

  // Crew arrivals: crews gather right to left, so the new hands are the
  // leftmost of the occupied block.
  const arrivals = [];
  if (move.dest.type === 'line') {
    const r = move.dest.row;
    const cap = r + 1;
    const cells = $$(`.crew[data-row="${r}"] .ccell`, boardEl);
    for (let i = cap - iBoard.lines[r].count; i < cap - bBoard.lines[r].count; i++) {
      arrivals.push({ el: cells[i], html: tileHTML(takenKind) });
    }
  }
  // Idle arrivals (overflow, deliberate hoarding, and the token). They land
  // with a heavier thud than a hire: the penalty should feel like payroll.
  const icells = $$('.icell .islot', boardEl);
  for (let i = bBoard.floor.length; i < iBoard.floor.length; i++) {
    const entry = iBoard.floor[i];
    arrivals.push({
      el: icells[i],
      html: entry === E.FIRST_TOKEN ? tokenHTML() : tileHTML(takenKind),
      thud: true,
      token: entry === E.FIRST_TOKEN,
    });
  }
  // Token set aside on a full idle row: it still flips to the mover.
  if (tokenRect && !arrivals.some((a) => a.token) && iBoard.firstToken) {
    const fmEl = $('.board-fm', boardEl) || $('.board-name', boardEl);
    arrivals.push({ el: fmEl, html: tokenHTML(), token: true });
  }

  let takenIdx = 0;
  for (const a of arrivals) {
    const inner = a.el.firstElementChild || a.el;
    if (inner.classList) inner.classList.add('pre');
    const from = a.token ? tokenRect : takenRects[takenIdx++] || takenRects[0];
    flights.push(
      fly(from, a.el.getBoundingClientRect(), a.html, { dur: a.thud ? 480 : 420, ...stag() })
    );
  }

  // Whoever wasn't hired spills and scatters out to the gate, where a rival
  // can take them.
  for (const [kind, rects] of Object.entries(leftoverRects)) {
    const targets = $$(`#pool .tile[data-kind="${kind}"]`);
    const delta = interim.pool[kind] - before.pool[kind];
    const newOnes = targets.slice(targets.length - delta);
    newOnes.forEach((t, k) => {
      t.classList.add('pre');
      flights.push(fly(rects[k] || rects[0], t.getBoundingClientRect(), tileHTML(Number(kind)), stag()));
    });
  }

  await Promise.all(flights);
  $$('.pre').forEach((el) => el.classList.remove('pre'));
  for (const a of arrivals) {
    if (a.thud) {
      const inner = a.el.firstElementChild;
      if (inner) inner.classList.add('thud');
    }
  }
  await beat(120);
}

// The installation sweep: each completed crew's lead hand glides into the
// pavilion, one gallery at a time, while the score ticks with every
// placement and the rest of the crew moves on to another pavilion. Then the
// idle row's bill, and either opening day or next week's arrivals.
async function animateResolution(interim, final) {
  setPhase('The displays go up');
  await banner(`W${interim.round} · <span class="r">the displays go up</span>`);

  for (let seat = 0; seat < interim.players; seat++) {
    const boardEl = $(`.board[data-seat="${seat}"]`);
    const b = interim.boards[seat];
    const wallCopy = b.wall.map((r) => r.slice());
    let score = b.score;

    // A beat before each board with anything to settle, so the eye can
    // travel there before its tiles start moving.
    if (b.floor.length > 0 || b.lines.some((t, r) => t.count === r + 1)) await beat(180);

    for (let r = 0; r < 5; r++) {
      const t = b.lines[r];
      if (t.count !== r + 1) continue;
      const c = E.wallColumn(t.kind, r);
      const rowEl = $(`.crew[data-row="${r}"]`, boardEl);
      const cells = $$('.ccell', rowEl);
      const lead = cells[cells.length - 1];
      const target = $(`.wcell[data-rc="${r}-${c}"]`, boardEl);

      await fly(lead.getBoundingClientRect(), target.getBoundingClientRect(), tileHTML(t.kind), {
        dur: 460,
      });
      target.innerHTML = tileHTML(t.kind);
      target.classList.add('filled', 'landed');

      wallCopy[r][c] = 1;
      const d = E.scorePlacement(wallCopy, r, c);
      score += d;
      popup('+' + d, target.getBoundingClientRect(), 'pos');
      setScore(seat, score);

      // The display stands; the rest of the crew moves on to another
      // pavilion (engine: to the lid).
      if (r > 0 && !instant()) {
        const drainRect = $('#drain').getBoundingClientRect();
        cells.slice(0, -1).forEach((cell, k) => {
          if (cell.classList.contains('occ')) {
            fly(cell.getBoundingClientRect(), drainRect, tileHTML(t.kind), {
              dur: 380,
              delay: k * 40,
              lift: 10,
            });
          }
        });
      }
      cells.forEach((cell) => {
        cell.classList.remove('occ');
        cell.innerHTML = '';
      });
      await beat(300);
    }

    // The idle row's bill — everyone you engaged and had nowhere to put.
    if (b.floor.length > 0) {
      const idleEl = $('.idle', boardEl);
      let pen = 0;
      for (let i = 0; i < b.floor.length; i++) pen += E.FLOOR_PENALTIES[i];
      popup('−' + pen, idleEl.getBoundingClientRect(), 'neg');
      score = Math.max(0, score - pen);
      setScore(seat, score);
      if (!instant()) {
        const drainRect = $('#drain').getBoundingClientRect();
        $$('.icell .islot', idleEl).forEach((slot, i) => {
          const inner = slot.firstElementChild;
          if (!inner) return;
          if (!inner.classList.contains('token')) {
            fly(slot.getBoundingClientRect(), drainRect, tileHTML(b.floor[i]), {
              dur: 380,
              delay: i * 40,
              lift: 8,
            });
          }
          slot.innerHTML = '';
        });
      }
      await beat(400);
    }
  }

  if (final.over) {
    // The judges make their round: every complete gallery (+2), aisle (+7)
    // and discipline shown all five times (+10) lights up cell by cell while
    // its bonus lands and the score ticks. The engine already booked these
    // (§8) — final scores include them — so start from score-minus-bonuses
    // and replay the arithmetic on screen.
    for (let seat = 0; seat < final.players; seat++) {
      const boardEl = $(`.board[data-seat="${seat}"]`);
      const wall = final.boards[seat].wall;
      const cells = $$('.wcell', boardEl);
      let score = final.boards[seat].score - E.bonuses(wall);

      const groups = [];
      for (let r = 0; r < 5; r++)
        if (wall[r].every((x) => x === 1))
          groups.push({ idx: wall[r].map((_, c) => r * 5 + c), pts: 2 });
      for (let c = 0; c < 5; c++)
        if (wall.every((row) => row[c] === 1))
          groups.push({ idx: wall.map((_, r) => r * 5 + c), pts: 7 });
      for (let kind = 0; kind < 5; kind++) {
        const idx = wall.map((_, r) => r * 5 + E.wallColumn(kind, r));
        if (idx.every((i) => wall[(i / 5) | 0][i % 5] === 1)) groups.push({ idx, pts: 10 });
      }

      for (const g of groups) {
        if (!instant()) {
          g.idx.forEach((i, k) =>
            setTimeout(() => {
              cells[i].classList.remove('sweep');
              void cells[i].offsetWidth; // restart when a cell repeats across groups
              cells[i].classList.add('sweep');
            }, T(k * 90))
          );
        }
        await beat(5 * 90 + 60);
        score += g.pts;
        popup('+' + g.pts, cells[g.idx[4]].getBoundingClientRect(), 'pos');
        setScore(seat, score);
        await beat(280);
      }
    }
    await banner('<span class="r">Opening day</span> — the Fair is open');
    await beat(700);
    return;
  }

  // New arrivals — crews who moved on, and more hands still reaching the
  // city, visibly restock the crowd (§6.1: the lid refills the bag).
  if (final.refills > interim.refills && !instant()) {
    const drainRect = $('#drain').getBoundingClientRect();
    const poolRect = $('#pool-chip').getBoundingClientRect();
    $('#pool-chip').classList.add('wave');
    banner('<span class="r">New arrivals</span> — more hands reach the city');
    const waves = [];
    for (let i = 0; i < 7; i++) {
      waves.push(fly(drainRect, poolRect, tileHTML(i % 5), { dur: 420, delay: i * 55, lift: 30 }));
    }
    await Promise.all(waves);
    setTimeout(() => $('#pool-chip').classList.remove('wave'), T(1600));
  }

  // Next week's agencies fill.
  G.view = snap(final);
  renderAll();
  setPhase('');
  await banner(
    `W${final.round} · <span class="r">First&nbsp;Call</span>: <b>${esc(G.names[final.startPlayer])}</b>`
  );
  await dealAnimation();
}

// The agencies send their people over one by one — unhurried (Ryan,
// 2026-08-06): the week opens with this and it deserves to read as an event,
// not a shuffle.
async function dealAnimation() {
  if (instant()) return;
  const poolRect = $('#pool-chip').getBoundingClientRect();
  const tiles = $$('#sources .tile');
  tiles.forEach((t) => t.classList.add('pre'));
  await Promise.all(
    tiles.map((t, i) =>
      fly(poolRect, t.getBoundingClientRect(), tileHTML(Number(t.dataset.kind)), {
        dur: 420,
        delay: i * 55,
        lift: 22,
      })
    )
  );
  tiles.forEach((t) => t.classList.remove('pre'));
}

// ---------------------------------------------------------------------------
// Moves.

// A tap on a legal destination. Everything after the clock arithmetic is
// shared with a move that arrived over the wire — see playMove.
async function submitMove(dest) {
  if (!G || animating || G.cur.over || !sel) return;
  if (G.online && G.cur.seatToMove !== G.mySeat) return; // not your turn
  stopClock();
  const move = { source: sel.source, kind: sel.kind, dest, t: Math.round(G.spent[G.cur.seatToMove]) };
  sel = null;
  await playMove(move, true);
}

// One move, from whichever source: a tap, the bot, or the relay. The memo's
// third layer rule — "the bot and the network connection are both just move
// sources" — is this function having exactly one body.
async function playMove(move, local) {
  const before = G.cur;
  const seat = before.seatToMove;
  let interim, final;
  try {
    interim = E.applyTake(before, move);
    final = E.apply(before, move);
  } catch (err) {
    console.error(err);
    if (local) {
      announce('That move is not legal.');
      startClock(seat); // the turn continues — don't leave the clock stopped
      return;
    }
    // A move the opponent's engine allowed and ours refused is divergence, and
    // §9 says divergence fails loudly rather than drifting.
    netFail('Your opponent played a move this board says is illegal. The game has stopped.');
    return;
  }

  if (!local) {
    // The mover's own clock at submit is authoritative (§10's `t`); the local
    // estimate that has been ticking since we saw their turn start is only a
    // display, and latency is charged to nobody.
    stopClock();
    if (G.clockMs && Number.isFinite(move.t)) {
      G.spent[seat] = move.t;
      G.remaining[seat] = Math.max(0, G.clockMs - move.t);
    }
  }

  const ply = G.moves.length;
  G.moves.push(move);
  G.cur = final;
  sel = null;
  animating = true;

  if (local && G.net && !G.net.move(ply, move)) {
    // The board moved but the relay didn't hear it. Resync on reconnect is
    // authoritative and will take the move back, so say so now rather than
    // let it disappear silently a few seconds later.
    banner('<span class="r">Not sent</span> — the connection dropped. This move will come back when it returns.');
  }
  if (G.net) {
    const h = E.stateHash(final);
    G.hashes.set(ply, h);
    G.net.hash(ply, h);
    checkHash(ply);
  }

  announce(describeMove(before, interim, move));
  await animatePhaseA(before, interim, move);
  const resolved = final.over || final.round > interim.round;
  if (resolved) await animateResolution(interim, final);

  G.view = snap(final);
  renderAll();
  animating = false;

  if (final.over) {
    if (G.net) G.net.over(final.result);
    endGame('natural');
  } else {
    startClock(final.seatToMove);
    if (resolved) {
      announce(
        `Week ${final.round} begins. ` +
          G.names.map((n, i) => `${n} ${final.boards[i].score}`).join(', ') +
          `. ${G.names[final.startPlayer]} starts.`
      );
    }
    scheduleBot();
    drainRemote();
  }
}

// In a practice game the bot takes its turns through the exact same
// submitMove path as a click — same animations, same clock, same record.
function scheduleBot() {
  if (!G || G.dead || !G.cfg.bot || G.cur.over || G.cur.seatToMove !== BOT_SEAT) return;
  const game = G; // if the game is abandoned mid-think, stay quiet
  (async () => {
    $('#turn-label').innerHTML = `<b>${esc(BOT_NAME)}</b> is weighing options…`;
    await beat(750);
    if (G !== game || G.dead || G.cur.over || G.cur.seatToMove !== BOT_SEAT || animating) return;
    const m = greedyMove(G.cur);
    sel = { source: m.source, kind: m.kind };
    await submitMove(m.dest);
  })();
}

function describeMove(before, interim, move) {
  const name = G.names[before.seatToMove];
  const n =
    move.source.type === 'source'
      ? before.sources[move.source.index][move.kind]
      : before.pool[move.kind];
  const src =
    move.source.type === 'source' ? `the ${AGENCY_NAMES[move.source.index]} agency` : 'the gate';
  let msg = `${name} engages ${n} ${DISC[move.kind]} from ${src}`;
  if (move.source.type === 'pool' && before.firstTokenInPool) {
    msg += ' and takes the First Call token';
  }
  if (move.source.type === 'source') {
    const spilled = before.sources[move.source.index].reduce((a, b) => a + b, 0) - n;
    if (spilled > 0) msg += `; ${spilled} go and wait at the gate`;
  }
  msg +=
    move.dest.type === 'line'
      ? `. Put on the gallery ${move.dest.row + 1} crew.`
      : '. Left idle.';
  const idled =
    interim.boards[before.seatToMove].floor.length - before.boards[before.seatToMove].floor.length;
  if (move.dest.type === 'line' && idled > 0) msg += ` ${idled} idle.`;
  return msg;
}

// ---------------------------------------------------------------------------
// Clocks (§11) — chess clock, paused through Phases B and C.

function startClock(seat) {
  if (!G.clockMs || G.cur.over) return;
  G.clockSeat = seat;
  G.clockTs = performance.now();
  if (!G.clockTimer) G.clockTimer = setInterval(clockTick, 250);
  renderClocks();
}

function stopClock() {
  if (G.clockSeat === null) return;
  const dt = performance.now() - G.clockTs;
  G.spent[G.clockSeat] += dt;
  G.remaining[G.clockSeat] = Math.max(0, G.remaining[G.clockSeat] - dt);
  G.clockSeat = null;
  renderClocks();
}

function clockTick() {
  if (!G || G.clockSeat === null) return;
  renderClocks();
  const ms = G.remaining[G.clockSeat] - (performance.now() - G.clockTs);
  if (ms <= 0) {
    const flagged = G.clockSeat;
    stopClock();
    // Online, the flag goes through the relay so both boards end on the same
    // ruling — whoever notices first wins the race, and it doesn't matter
    // which (PROTOCOL.md). If the relay is unreachable, rule locally rather
    // than let a dead connection keep a finished game open.
    if (G.online && G.net && G.net.flag(flagged)) return;
    endGame('timeout', flagged);
  }
}

// ---------------------------------------------------------------------------
// Game lifecycle.

function startGame(cfg) {
  const seed = cfg.seed && cfg.seed.trim() ? cfg.seed.trim() : freshSeed();
  const s = E.newGame(seed, cfg.players);
  G = {
    cfg,
    seed,
    players: cfg.players,
    names: cfg.names,
    clockMs: cfg.clockMs,
    cur: s,
    view: snap(s),
    moves: [],
    spent: cfg.names.map(() => 0),
    remaining: cfg.names.map(() => cfg.clockMs),
    clockSeat: null,
    clockTs: 0,
    clockTimer: null,
    expand: {},
    // Online play (build step 4). Offline games leave all of this inert.
    online: !!cfg.online,
    net: cfg.net || null,
    mySeat: cfg.mySeat ?? null,
    hashes: new Map(), // ply -> our state hash
    theirHashes: new Map(), // ply -> what the other client got
    remote: new Map(), // ply -> a broadcast move not yet applied
    presence: {},
    ended: null,
  };
  sel = null;
  animating = false;
  $('#setup').classList.add('hidden');
  $('#lobby').classList.add('hidden');
  $('#game').classList.remove('hidden');
  $('#end-modal').close?.();
  renderAll();
  announce(
    `New game, seed ${seed}. ${G.names[s.startPlayer]} hires first in week 1.`
  );
  // Resuming a game already in progress: the caller is about to replay the
  // move list onto this state, so there is no opening to play.
  if (cfg.resume) return;
  (async () => {
    animating = true;
    await banner(
      `W1 · <span class="r">First&nbsp;Call</span>: <b>${esc(G.names[s.startPlayer])}</b>`
    );
    await dealAnimation();
    animating = false;
    startClock(s.seatToMove);
    scheduleBot(); // the seed may hand the bot the opening move
  })();
}

function endGame(ending, flaggedSeat = null) {
  if (!G || G.ended) return; // both clients may reach the same ending
  G.ended = ending;
  if (G.clockTimer) {
    clearInterval(G.clockTimer);
    G.clockTimer = null;
  }
  G.clockSeat = null;
  setPhase('Opening day');

  let result;
  if (ending === 'natural') {
    result = { ...G.cur.result, ending: 'natural' };
  } else {
    // Timeout loses, as in chess (§11). Recorded as won-on-time; scores kept
    // for the record but excluded from score-based awards upstream.
    const scores = G.cur.boards.map((b) => b.score);
    let winner;
    if (G.players === 2) {
      winner = 1 - flaggedSeat;
    } else {
      winner = scores
        .map((sc, i) => [sc, i])
        .filter(([, i]) => i !== flaggedSeat)
        .sort((a, b) => b[0] - a[0])[0][1];
    }
    result = { scores, winner, leaders: [winner], ending: 'timeout', flagged: flaggedSeat };
  }
  G.result = result;

  const body = $('#end-body');
  const draw = result.winner === -1;
  const title = draw
    ? 'Shared victory'
    : esc(G.names[result.winner]) + (ending === 'timeout' ? ' wins on time' : ' wins');
  const sub =
    ending === 'timeout'
      ? `${esc(G.names[flaggedSeat])}'s clock ran out. Scores are recorded but sit out the score-based awards.`
      : draw
        ? 'Level on points and on completed galleries — the rulebook calls it a shared win.'
        : `A pavilion opened its doors in week ${G.cur.round}, so the Fair opened with it.`;

  const rows = G.names
    .map((name, seat) => {
      const b = G.cur.boards[seat];
      const bonus = ending === 'natural' ? E.bonuses(b.wall) : 0;
      const detail =
        ending === 'natural'
          ? `${count(E.completeRows(b.wall), 'gallery', 'galleries')} · ` +
            `${count(E.completeColumns(b.wall), 'aisle', 'aisles')} · ` +
            `${count(E.completeKinds(b.wall), 'discipline', 'disciplines')}`
          : seat === flaggedSeat
            ? 'lost on time'
            : '—';
      const win = draw ? result.leaders.includes(seat) : seat === result.winner;
      return `<tr class="${win ? 'win' : ''}">
        <td>${esc(name)}</td>
        <td>${detail}</td>
        <td class="num">${result.scores[seat] - bonus}</td>
        <td class="num">${bonus ? '+' + bonus : ''}</td>
        <td class="num total">${result.scores[seat]}</td>
      </tr>`;
    })
    .join('');

  body.innerHTML = `
    <p class="whistle">${ending === 'timeout' ? 'Out of time' : 'Opening day'}</p>
    <p class="champion spot">${title}</p>
    <p class="end-sub">${sub}</p>
    <table class="final-table">
      <tr><th>Pavilion</th><th>Complete</th><th class="num">Play</th><th class="num">Bonus</th><th class="num">Total</th></tr>
      ${rows}
    </table>`;
  announce(`${title}. ` + G.names.map((n, i) => `${n} ${result.scores[i]}`).join(', ') + '.');

  // Online, only the host can call a rematch, and "New setup" means leaving
  // the room rather than clearing a table.
  const host = !G.online || !!net?.host;
  $('#btn-rematch').classList.toggle('hidden', !host);
  $('#btn-setup').textContent = G.online ? 'Leave the room' : 'New setup';
  $('#end-net').textContent =
    G.online && !host ? `Waiting for ${G.names[0]} to start a rematch — same room, a new crowd.` : '';

  $('#end-modal').showModal?.();
}

// The game record (§10). Hot-seat games are exhibitions, bot games are
// practice: archived either way, never counted toward a league. Online games
// are exhibitions too until there is a roster and a term to count them
// against — that is build step 5, and it is the server that will write the
// record then, by replaying this same move list.
function gameRecord() {
  return {
    v: E.ENGINE_VERSION,
    term: 'dev',
    mode: G.cfg.bot ? 'practice' : 'exhibition',
    seed: G.seed,
    room: G.code || null,
    seats: G.names,
    config: { clockMs: G.clockMs, splashHistory: false },
    // Per seat, for the phone-fairness question — self-reported by each
    // client and carried on the roster.
    device: G.names.map((_, i) =>
      G.cfg.bot && i === BOT_SEAT ? 'bot' : G.devices?.[i] || (G.online ? 'unknown' : 'hotseat')
    ),
    moves: G.moves,
    result: G.result || null,
  };
}

function downloadRecord() {
  const blob = new Blob([JSON.stringify(gameRecord(), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pavilion-${G.seed}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------------------------------------------------------------------------
// Two-device play (build step 4, relay/PROTOCOL.md).
//
// The relay outlives any one game: it carries the lobby, the game, and a
// rematch in the same room. So it hangs here rather than on G.

const params = new URLSearchParams(location.search);
const RELAY_URL = defaultRelayUrl(location, params.get('relay'));
const SESSION_KEY = 'pavilion.session';

let net = null;
let netRoom = null; // last known room state from welcome/roster/started

// A phone that locks mid-game kills the tab. The resume token is what turns
// that from a lost game into a five-second interruption (§11).
function saveSession(patch) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ at: Date.now(), ...patch }));
  } catch {
    /* private browsing: reconnecting after a full reload just won't work */
  }
}

function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!s || Date.now() - s.at > 3 * 3600 * 1000) return null; // a stale term
    return s;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing to clear */
  }
}

// --- connecting -------------------------------------------------------------

function connectRoom({ code, name, players, clockMs, id }) {
  if (net) net.leave();
  net = new Relay(RELAY_URL);
  net.id = id || null;
  netRoom = null;

  net.on('welcome', onWelcome);
  net.on('roster', (m) => {
    if (netRoom) netRoom.seats = m.seats;
    if (G && G.online) {
      m.seats.forEach((s) => (G.presence[s.seat] = s.connected));
      if (!animating) renderBoards(G.view);
    }
    renderLobby();
  });
  net.on('started', (m) => beginOnlineGame(m));
  net.on('move', onRemoteMove);
  net.on('hash', onRemoteHash);
  net.on('presence', (m) => {
    if (netRoom) {
      const seat = netRoom.seats?.find((s) => s.seat === m.seat);
      if (seat) seat.connected = m.connected;
    }
    if (G && G.online) {
      G.presence[m.seat] = m.connected;
      if (!animating) renderBoards(G.view);
      announce(`${G.names[m.seat]} ${m.connected ? 'is back' : 'has dropped out — their clock keeps running'}.`);
    }
    renderLobby();
  });
  net.on('ended', onRemoteEnded);
  net.on('status', renderNetChip);
  net.on('error', onNetError);

  net.connect({ code, hello: { name, device: deviceKind(), players, clockMs } });
  showLobby();
}

function onWelcome(w) {
  netRoom = w.room;
  saveSession({ code: w.code, id: w.you.id, name: lastTypedName });
  if (w.room.started) {
    // Rebuild rather than resume a half-remembered position: the game is
    // seed + move list, so replaying is both simpler and exactly right.
    beginOnlineGame(
      {
        seats: w.room.seats,
        seed: w.room.seed,
        players: w.room.players,
        clockMs: w.room.clockMs,
      },
      true
    );
    resync(w.room, w.serverNow);
  } else {
    showLobby();
  }
  renderNetChip();
}

function beginOnlineGame(info, resume = false) {
  netRoom = { ...(netRoom || {}), ...info };
  startGame({
    online: true,
    net,
    mySeat: net.seat,
    players: info.players,
    names: info.seats.map((s) => s.name),
    clockMs: info.clockMs,
    seed: info.seed,
    bot: false,
    resume,
  });
  G.code = net.code;
  G.devices = info.seats.map((s) => s.device);
  info.seats.forEach((s) => (G.presence[s.seat] = s.connected));
  renderNetChip();
  renderBoards(G.view);
}

// Replay the room's move list onto a fresh game, then put the clocks back
// where the record says they were (PROTOCOL.md, "Clocks over the wire").
function resync(room, serverNow) {
  let s = E.newGame(room.seed, room.players);
  const moves = [];
  for (const rec of room.moves) {
    s = E.apply(s, rec.move);
    moves.push(rec.move);
  }
  G.cur = s;
  G.view = snap(s);
  G.moves = moves;
  G.remote.clear();
  G.hashes.clear();
  G.theirHashes.clear();
  sel = null;
  animating = false;

  G.spent = G.names.map(() => 0);
  for (const rec of room.moves) {
    if (Number.isFinite(rec.move.t)) G.spent[rec.seat] = rec.move.t;
  }
  G.remaining = G.spent.map((sp) => Math.max(0, G.clockMs - sp));
  const last = room.moves[room.moves.length - 1];
  if (last && G.clockMs && !s.over) {
    // The one place a returning client pays for transit: it cannot know when
    // it *would* have received the last move, so it uses the server's stamp.
    const away = Math.max(0, serverNow - last.at);
    G.spent[s.seatToMove] += away;
    G.remaining[s.seatToMove] = Math.max(0, G.remaining[s.seatToMove] - away);
  }

  renderAll();
  if (room.ended) {
    endGame(room.ended.ending, room.ended.flagged ?? null);
  } else if (!s.over) {
    startClock(s.seatToMove);
    announce(`Back in the game. Week ${s.round}, ${G.names[s.seatToMove]} to hire.`);
  }
}

// --- moves off the wire -----------------------------------------------------

function onRemoteMove(msg) {
  if (!G || !G.online || G.halted) return;
  if (msg.ply < G.moves.length) return; // our own echo, or a duplicate on resume
  G.remote.set(msg.ply, msg);
  drainRemote();
}

let draining = false;
async function drainRemote() {
  if (draining || !G || !G.online) return;
  draining = true;
  try {
    while (G && !G.halted && !animating && !G.cur.over) {
      const next = G.remote.get(G.moves.length);
      if (!next) break;
      G.remote.delete(next.ply);
      // The server stamps the seat, so this is the check that a client cannot
      // play someone else's turn — apply() would happily let it.
      if (next.seat !== G.cur.seatToMove) {
        netFail(`A move arrived for ${G.names[next.seat]} out of turn. The game has stopped.`);
        break;
      }
      await playMove(next.move, false);
    }
  } finally {
    draining = false;
  }
}

function onRemoteHash(msg) {
  if (!G || !G.online || msg.seat === G.mySeat) return;
  G.theirHashes.set(msg.ply, msg.h);
  checkHash(msg.ply);
}

// §9: two clients running the same seed and the same moves are bit-identical
// forever. If they aren't, stop — a drift discovered at the final scores is
// the failure this check exists to make impossible.
function checkHash(ply) {
  const mine = G.hashes.get(ply);
  const theirs = G.theirHashes.get(ply);
  if (!mine || !theirs || mine === theirs) return;
  console.error(`[pavilion] hash divergence at ply ${ply}: ${mine} vs ${theirs}`);
  netFail('This board and your opponent’s have diverged. Stopping rather than playing on.');
}

function onRemoteEnded(msg) {
  if (!G || !G.online) return;
  if (msg.ending === 'timeout') endGame('timeout', msg.flagged);
  else if (msg.ending === 'natural' && !G.ended && G.cur.over) endGame('natural');
}

function onNetError(msg) {
  if (msg.code === 'bad-ply') {
    // We were behind; the broadcast we are about to receive is the truth.
    announce('That move crossed with your opponent’s. Try again.');
    return;
  }
  if (['no-room', 'room-full', 'started'].includes(msg.code)) {
    clearSession();
    $('#lobby-error').textContent = msg.msg;
    $('#lobby-error').classList.remove('hidden');
    return;
  }
  announce(msg.msg || 'The relay refused that.');
}

// A protocol-level failure is not a game result: it is a bug, and it says so
// rather than inventing a winner.
function netFail(text) {
  if (!G) return;
  G.halted = true;
  stopClock();
  if (G.clockTimer) {
    clearInterval(G.clockTimer);
    G.clockTimer = null;
  }
  banner(`<span class="r">Stopped</span> — ${esc(text)}`);
  announce(text);
  renderNetChip();
}

// --- chrome -----------------------------------------------------------------

function renderNetChip() {
  const chip = $('#net-chip');
  if (!chip) return;
  if (!net || !(G?.online || !$('#lobby').classList.contains('hidden'))) {
    chip.classList.add('hidden');
    return;
  }
  chip.classList.remove('hidden');
  const state = G?.halted ? 'halted' : net.status;
  chip.dataset.state = state;
  chip.textContent =
    state === 'halted'
      ? 'Stopped'
      : state === 'open'
        ? net.code || 'connected'
        : state === 'retrying' || state === 'connecting'
          ? 'Reconnecting…'
          : 'Offline';
  const status = $('#lobby-status');
  if (status) status.textContent = net.status === 'open' ? '' : 'Reconnecting to the relay…';
}

function showLobby() {
  $('#setup').classList.add('hidden');
  $('#game').classList.add('hidden');
  $('#lobby').classList.remove('hidden');
  renderLobby();
  renderNetChip();
}

function renderLobby() {
  if ($('#lobby').classList.contains('hidden')) return;
  $('#lobby-code').textContent = net?.code || '…';
  const seats = netRoom?.seats || [];
  $('#lobby-seats').innerHTML =
    seats
      .map(
        (s) => `<li class="${s.connected ? '' : 'away'}">
        <span class="dot" aria-hidden="true"></span>
        <span class="lname">${esc(s.name)}</span>
        ${s.seat === net?.seat ? '<span class="you">you</span>' : ''}
        <span class="dev">${esc(s.device)}</span>
      </li>`
      )
      .join('') || '<li class="waiting">Opening the room…</li>';

  const host = !!net?.host;
  const btn = $('#btn-lobby-start');
  btn.classList.toggle('hidden', !host);
  btn.disabled = seats.length < 2;
  $('#lobby-wait').textContent = host
    ? seats.length < 2
      ? 'Read the code out in your breakout room, then start when everyone is in.'
      : 'Everyone is in — start when you are ready.'
    : `Waiting for ${seats[0]?.name || 'the host'} to start the game.`;
}

// ---------------------------------------------------------------------------
// Input — two-tap, keyboard-friendly (everything is a real button).

document.addEventListener('click', (e) => {
  if (!G || animating || G.cur.over || G.halted) return;
  // The bot's turn is the bot's: taps select nothing while it thinks.
  if (G.cfg.bot && G.cur.seatToMove === BOT_SEAT && !e.target.closest('.board-head')) return;
  // Online, so is your opponent's — you can still expand their board.
  if (G.online && G.cur.seatToMove !== G.mySeat && !e.target.closest('.board-head')) return;

  const tile = e.target.closest('button.tile');
  if (tile) {
    const sourceEl = tile.closest('.source');
    const atGate = !!tile.closest('#pool');
    if (sourceEl || atGate) {
      const source = sourceEl
        ? { type: 'source', index: Number(sourceEl.dataset.source) }
        : { type: 'pool' };
      const kind = Number(tile.dataset.kind);
      if (sel && sameSource(sel.source, source) && sel.kind === kind) {
        sel = null; // second tap on the same pick cancels
      } else {
        sel = { source, kind };
        const n =
          source.type === 'source' ? G.cur.sources[source.index][kind] : G.cur.pool[kind];
        announce(
          `Engaging ${n} ${DISC[kind]} from ${
            source.type === 'source' ? `the ${AGENCY_NAMES[source.index]} agency` : 'the gate'
          }. Choose a highlighted crew, or leave them idle.`
        );
      }
      applySelection();
      return;
    }
  }

  const row = e.target.closest('.crew.can-drop');
  if (row) {
    submitMove({ type: 'line', row: Number(row.dataset.row) });
    return;
  }
  const idle = e.target.closest('.idle.can-drop');
  if (idle) {
    submitMove({ type: 'floor' });
    return;
  }

  // Tapping a collapsed board expands it.
  const head = e.target.closest('.board.collapsible .board-head');
  if (head) {
    const seat = Number(head.closest('.board').dataset.seat);
    G.expand[seat] = !G.expand[seat];
    renderBoards(G.view);
    applySelection();
    return;
  }

  if (sel && e.target.closest('#table')) {
    sel = null;
    applySelection();
    announce('Selection cleared.');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sel) {
    sel = null;
    applySelection();
    announce('Selection cleared.');
  }
});

// ---------------------------------------------------------------------------
// Setup screen.

let setupPlayers = 2;
// LER 565 is an online class — students are never in the same room, so there
// is no pass-and-play mode to offer (Ryan, 2026-08-12). The local multi-player
// path still exists in startGame because the smoke tests drive it; it just has
// no way in from the interface, and would need one again for an in-person class.
let setupMode = 'online'; // 'online' | 'practice'
let setupJoin = false; // online: joining someone else's room rather than opening one
let lastTypedName = '';

// You only ever name yourself: the other pavilions name themselves, on their
// own devices, or are the bot.
function renderNameInputs() {
  const wrap = $('#name-inputs');
  const existing = $$('input', wrap)[0]?.value;
  wrap.innerHTML = '';
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 20;
  input.placeholder = 'Your name';
  input.value = existing || lastTypedName;
  input.setAttribute('aria-label', 'Your name');
  wrap.appendChild(input);
}

$$('#players-seg .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('#players-seg .seg-btn').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    setupPlayers = Number(btn.dataset.players);
    renderNameInputs();
  });
});

function applySetupMode() {
  const online = setupMode === 'online';
  const joining = online && setupJoin;
  $('#online-field').classList.toggle('hidden', !online);
  $('#code-input').classList.toggle('hidden', !joining);
  // Joining? The host already chose the table size, the clock and the seed.
  $('#players-field').classList.toggle('hidden', !online || joining);
  $('#clock-field').classList.toggle('hidden', joining);
  $('#seed-field').classList.toggle('hidden', online); // the room's seed is the server's
  $('#mode-hint').textContent = online
    ? 'Each player on their own device, anywhere. One of you opens a room and reads the code out; the others join it.'
    : `A practice match against ${BOT_NAME}, who has done this before. ` +
      'Practice games count for nothing; play until the rules feel obvious.';
  $('#setup-submit').textContent = online
    ? joining
      ? 'Join the room'
      : 'Open a room'
    : 'Start practising';
  // Novices should learn the rules before they learn the clock.
  if (!online) $('#clock-select').value = '0';
  renderNameInputs();
}

$$('#mode-seg .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    $$('#mode-seg .seg-btn').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    setupMode = btn.dataset.mode;
    applySetupMode();
  });
});

$$('#online-seg .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('#online-seg .seg-btn').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    setupJoin = btn.dataset.online === 'join';
    applySetupMode();
    if (setupJoin) $('#code-input').focus();
  });
});

$('#setup-form').addEventListener('submit', (e) => {
  e.preventDefault();
  lastTypedName = $('#name-inputs input').value.trim() || 'You';

  if (setupMode === 'online') {
    const code = setupJoin ? $('#code-input').value.trim().toUpperCase() : null;
    if (setupJoin && !code) return $('#code-input').focus();
    $('#lobby-error').classList.add('hidden');
    connectRoom({
      code,
      name: lastTypedName,
      players: setupPlayers,
      clockMs: Number($('#clock-select').value),
    });
    return;
  }

  startGame({
    players: 2,
    names: [lastTypedName, BOT_NAME],
    bot: true,
    clockMs: Number($('#clock-select').value),
    seed: $('#seed-input').value,
  });
});

// Leaving a game means leaving the room it was played in — otherwise the seat
// sits there "reconnecting…" on the other player's screen forever.
function toSetup() {
  if (G) {
    G.dead = true;
    if (G.clockTimer) clearInterval(G.clockTimer);
  }
  if (net) {
    net.leave();
    net = null;
    netRoom = null;
    clearSession();
  }
  $('#end-modal').close?.();
  $('#game').classList.add('hidden');
  $('#lobby').classList.add('hidden');
  $('#setup').classList.remove('hidden');
  renderNetChip();
}

$('#btn-new').addEventListener('click', () => {
  if (G && !G.cur.over && G.moves.length > 0 && !confirm('Abandon this game?')) return;
  toSetup();
});
$('#btn-export').addEventListener('click', downloadRecord);
$('#btn-record').addEventListener('click', downloadRecord);
$('#btn-rematch').addEventListener('click', () => {
  // Online, a rematch is the same room and the same seats with a fresh bag,
  // so nobody has to read a code out twice. The new game arrives as another
  // `started` — for everyone, including whoever clicked.
  if (G.online) return void net?.rematch();
  $('#end-modal').close();
  startGame({ ...G.cfg, seed: '' }); // a new crowd, the same room
});
$('#btn-setup').addEventListener('click', toSetup);

$('#btn-lobby-start').addEventListener('click', () => net?.start());
$('#btn-lobby-leave').addEventListener('click', toSetup);

// Two devices need a relay. On a laptop running serve.sh that's dev-relay.js
// on the next port over; in production it's the Worker, which is build step 5
// — until then, say so rather than offering a button that cannot work.
if (!RELAY_URL) {
  const btn = $('#mode-seg [data-mode="online"]');
  btn.disabled = true;
  btn.title = 'Two-device play needs the relay, which is not live yet.';
}

// A phone that locked, a tab that was closed, a browser that crashed: the seat
// is still there and the game is still going (§11).
{
  const saved = loadSession();
  if (saved && RELAY_URL) {
    const el = $('#rejoin');
    el.classList.remove('hidden');
    $('#rejoin-code').textContent = saved.code;
    $('#btn-rejoin').addEventListener('click', () => {
      lastTypedName = saved.name || '';
      connectRoom({ code: saved.code, name: saved.name, id: saved.id });
    });
  }
}

applySetupMode();

// ---------------------------------------------------------------------------
// Headless smoke test: ?smoke=1 plays a full deterministic game through the
// real UI pipeline with animations skipped, then stamps the outcome into the
// DOM for a headless browser to read. Not a player feature.

// ?uitest=setup drives the setup form the way a human would — real clicks
// on the real buttons — and stamps the outcome into the DOM.
const smokeParams = new URLSearchParams(location.search);
if (smokeParams.get('uitest') === 'setup') {
  window.__instant = true;
  (() => {
    const out = document.createElement('div');
    out.id = 'smoke';
    const fails = [];
    const expect = (cond, what) => cond || fails.push(what);
    try {
      // A live game is the default, and hosting one is the default within it.
      expect($('#mode-seg [data-mode="online"]').classList.contains('on'), 'live game is preselected');
      expect(!$('#online-field').classList.contains('hidden'), 'the room fieldset shows');
      expect(!$('#players-field').classList.contains('hidden'), 'the host picks the table size');
      expect($('#seed-field').classList.contains('hidden'), 'the seed field hides — the room owns it');
      expect($$('#name-inputs input').length === 1, 'you name only yourself');

      $('#online-seg [data-online="join"]').click();
      expect(!$('#code-input').classList.contains('hidden'), 'joining asks for a code');
      expect($('#players-field').classList.contains('hidden'), 'a joiner inherits the table size');
      expect($('#clock-field').classList.contains('hidden'), 'and the clock');
      expect($('#setup-submit').textContent.includes('Join'), 'the button says join');
      $('#setup-form').requestSubmit();
      expect(!G, 'joining with no code starts nothing');

      $('#mode-seg [data-mode="practice"]').click();
      expect($('#online-field').classList.contains('hidden'), 'the room fieldset hides');
      expect(!$('#seed-field').classList.contains('hidden'), 'a practice game can be seeded');
      expect($('#clock-select').value === '0', 'practice drops the clock');
      expect($('#mode-hint').textContent.includes(BOT_NAME), 'hint names the bot');
      $('#name-inputs input').value = 'Ryan';
      $('#seed-input').value = 'uitest-seed';
      $('#setup-form').requestSubmit();
      expect(!!G && G.cfg.bot === true, 'game starts in practice mode');
      expect(G && G.names[0] === 'Ryan' && G.names[1] === BOT_NAME, 'seats are you vs the bot');

      // And back again.
      $('#btn-new').click();
      $('#mode-seg [data-mode="online"]').click();
      expect(!$('#online-field').classList.contains('hidden'), 'the room fieldset returns');
      expect($('#name-inputs input').value === 'Ryan', 'your name is remembered');
      out.textContent = fails.length ? 'UITEST FAIL: ' + fails.join('; ') : 'UITEST OK';
    } catch (err) {
      out.textContent = 'UITEST FAIL: ' + (err && err.stack ? err.stack : err);
    }
    document.body.appendChild(out);
  })();
}

// ?uitest=online&relay=ws://… plays a whole two-device game through the real
// UI against a real relay: this page is seat 0 and drives itself through the
// setup form, the lobby and submitMove; the opponent is a bare net.js client
// with an engine and no interface. It drops the socket mid-game to prove the
// reconnect path, and finishes with a rematch. test/online.test.js drives it.
if (smokeParams.get('uitest') === 'online') {
  window.__instant = true;
  (async () => {
    const out = document.createElement('div');
    out.id = 'smoke';
    const fails = [];
    const expect = (cond, what) => cond || fails.push(what);
    const until = async (pred, what, ms = 8000) => {
      const t0 = performance.now();
      while (!pred()) {
        if (performance.now() - t0 > ms) throw new Error('timed out waiting for ' + what);
        await sleep(4);
      }
    };

    // The other player: transport plus engine, nothing else.
    const opp = new Relay(RELAY_URL);
    opp.hashes = new Map();
    opp.mismatch = 0;
    opp.applied = 0;
    opp.on('welcome', (w) => (opp.mySeat = w.you.seat));
    opp.on('started', (m) => {
      opp.state = E.newGame(m.seed, m.players);
      opp.applied = 0;
      opp.hashes.clear();
    });
    opp.on('move', (m) => {
      if (!opp.state || m.ply < opp.applied) return;
      opp.state = E.apply(opp.state, m.move);
      opp.applied = m.ply + 1;
      const h = E.stateHash(opp.state);
      opp.hashes.set(m.ply, h);
      opp.hash(m.ply, h);
    });
    opp.on('hash', (m) => {
      if (m.seat !== opp.mySeat && opp.hashes.has(m.ply) && opp.hashes.get(m.ply) !== m.h) {
        opp.mismatch++;
      }
    });

    // Play until someone's engine says the game is over.
    const playOut = async (label) => {
      let guard = 0;
      while (G && !G.cur.over && guard < 400) {
        if (G.halted) throw new Error(`${label}: the board halted mid-game`);
        if (animating || G.moves.length !== opp.applied) {
          await sleep(3);
          continue;
        }
        guard++;
        if (G.cur.seatToMove === G.mySeat) {
          const moves = E.legalMoves(G.cur);
          const m = moves[(guard * 7) % moves.length];
          sel = { source: m.source, kind: m.kind };
          await submitMove(m.dest);
        } else {
          const moves = E.legalMoves(opp.state);
          const m = moves[(guard * 7) % moves.length];
          opp.move(opp.applied, { ...m, t: 800 + opp.applied * 90 });
          await sleep(6);
        }
      }
      // The loop exits the moment *our* engine says the game is over, which
      // on our own final move is before the broadcast has reached the other
      // client. Let them catch up, or the comparison races.
      await until(() => opp.applied === G.moves.length, 'the opponent to catch up');
      return guard;
    };

    try {
      // --- host a room, through the real form -----------------------------
      $('#mode-seg [data-mode="online"]').click();
      expect(!$('#online-field').classList.contains('hidden'), 'the room fieldset appears');
      expect($('#seed-field').classList.contains('hidden'), 'the seed field hides — the room owns it');
      expect($$('#name-inputs input').length === 1, 'you name only yourself');
      $('#name-inputs input').value = 'Sam';
      $('#clock-select').value = '0';
      $('#setup-form').requestSubmit();

      await until(() => net && net.code, 'the room code');
      expect(!$('#lobby').classList.contains('hidden'), 'the lobby shows');
      expect($('#lobby-code').textContent === net.code, 'the lobby shows the room code');
      expect(net.host === true, 'the opener is the host');

      // --- the opponent joins ---------------------------------------------
      opp.connect({ code: net.code, hello: { name: 'Alex', device: 'phone' } });
      await until(() => netRoom?.seats?.length === 2, 'the second seat');
      expect($$('#lobby-seats li').length === 2, 'both seats are listed');
      expect($('#lobby-seats .you') !== null, 'your own seat is marked');

      // --- start ------------------------------------------------------------
      $('#btn-lobby-start').click();
      await until(() => G && G.online && opp.state, 'the game to start');
      expect(!$('#game').classList.contains('hidden'), 'the board shows');
      expect(G.mySeat === 0 && opp.mySeat === 1, 'seats are join order');
      expect(G.seed === netRoom.seed, 'the board uses the room seed');

      // --- taps off-turn do nothing ---------------------------------------
      await until(() => !animating, 'the deal');
      if (G.cur.seatToMove !== G.mySeat) {
        $('#sources button.tile')?.click();
        expect(sel === null, 'a tap on the opponent’s turn selects nothing');
      }

      // --- play, drop the connection halfway ------------------------------
      let dropped = false;
      const halfway = setInterval(() => {
        if (!dropped && G && G.moves.length >= 6 && !animating) {
          dropped = true;
          net.ws.close(); // as a phone locking does
        }
      }, 20);
      const moved = await playOut('first game');
      clearInterval(halfway);
      expect(dropped, 'the socket was dropped mid-game');
      expect(net.status === 'open', 'the client reconnected by itself');
      expect(G.cur.over, `the game finished (${moved} turns)`);
      expect(!G.halted, 'no divergence, no out-of-turn move');
      expect(opp.mismatch === 0, 'every state hash agreed');
      expect(
        E.stateHash(G.cur) === E.stateHash(opp.state),
        'both clients ended byte-identical'
      );
      expect(G.ended === 'natural', 'the ending is recorded');
      expect($('#end-modal').open === true, 'the result modal opened');

      // --- rematch: same room, same seats, fresh bag -----------------------
      const firstSeed = G.seed;
      $('#btn-rematch').click();
      await until(() => G && G.seed !== firstSeed && !G.cur.over, 'the rematch');
      expect(G.mySeat === 0, 'seats survive the rematch');
      expect(G.moves.length === 0, 'the rematch starts from an empty log');
      expect($('#end-modal').open === false, 'the modal closed');
      await until(() => !animating && opp.applied === 0, 'the new deal');
      await playOut('rematch');
      expect(G.cur.over, 'the rematch finished too');
      expect(opp.mismatch === 0, 'and agreed hash for hash');

      out.textContent = fails.length ? 'NETSMOKE FAIL: ' + fails.join('; ') : 'NETSMOKE OK';
    } catch (err) {
      out.textContent =
        'NETSMOKE FAIL: ' + (err && err.stack ? err.stack : err) + (fails.length ? ' | ' + fails.join('; ') : '');
    }
    document.body.appendChild(out);
    // The Node side is waiting on this, not on the DOM: headless Chrome has
    // no way to tell it the page is finished otherwise.
    fetch('/__done?r=' + encodeURIComponent(out.textContent)).catch(() => {});
  })();
}

// ?smoke=1 plays to the end; ?smoke=N&stop=1 stops after N moves (for
// layout screenshots).
if (smokeParams.has('smoke')) {
  window.__instant = true;
  (async () => {
    const out = document.createElement('div');
    out.id = 'smoke';
    const limit = smokeParams.get('stop') ? Number(smokeParams.get('smoke')) : 500;
    try {
      const asBot = smokeParams.has('bot');
      startGame({
        players: asBot ? 2 : Number(smokeParams.get('players')) || 2,
        names: asBot
          ? ['Sam', BOT_NAME]
          : ['Sam', 'Alex', 'Jordan', 'Riley'].slice(0, Number(smokeParams.get('players')) || 2),
        bot: asBot,
        clockMs: smokeParams.get('stop') ? 300000 : 0,
        seed: 'smoke-seed',
      });
      // ?layout=1 watches the two things that made the board feel unsteady in
      // the first live playtest (Ryan, 2026-08-12): the market resizing as
      // tiles were drawn, which shunted every board down the page, and the
      // page being draggable sideways on a phone. Both are silent regressions
      // if nobody measures them, so this measures them every move.
      const watch = smokeParams.has('layout');
      const marketH = new Set();
      const boardsTop = new Set();
      let sideways = 0;
      const sample = () => {
        if (!watch) return;
        marketH.add(Math.round($('#market').getBoundingClientRect().height));
        boardsTop.add(Math.round($('#boards').getBoundingClientRect().top));
        if (document.documentElement.scrollWidth > window.innerWidth + 1) sideways++;
      };
      sample();

      let guard = 0;
      let waits = 0;
      while (!G.cur.over && guard < limit && waits < 20000) {
        if (G.cfg.bot && G.cur.seatToMove === BOT_SEAT) {
          waits++;
          await sleep(5); // the bot plays itself via scheduleBot
          continue;
        }
        guard++;
        const moves = E.legalMoves(G.cur);
        const m = moves[(guard * 7) % moves.length];
        sel = { source: m.source, kind: m.kind };
        await submitMove(m.dest);
        sample();
      }
      if (watch) {
        out.textContent =
          `LAYOUT ${marketH.size === 1 && boardsTop.size === 1 && sideways === 0 ? 'OK' : 'FAIL'} ` +
          `market-heights=${[...marketH].join('/')} boards-top=${[...boardsTop].join('/')} ` +
          `sideways=${sideways} width=${window.innerWidth}`;
        document.body.appendChild(out);
        return;
      }
      out.textContent = G.cur.over
        ? `SMOKE OK moves=${G.moves.length} w=${G.cur.round} scores=${G.cur.result.scores.join('/')} winner=${G.cur.result.winner}`
        : `SMOKE PARTIAL moves=${G.moves.length} w=${G.cur.round}`;
      if (smokeParams.has('probe')) {
        const odd = [];
        $$('.tile').forEach((t) => {
          const r = t.getBoundingClientRect();
          if (r.height > 64 || r.width > 64) {
            odd.push(`${t.className}@${t.parentElement.className}:${Math.round(r.width)}x${Math.round(r.height)}`);
          }
        });
        out.textContent += ' odd=[' + odd.slice(0, 8).join(' | ') + ']';
      }
    } catch (err) {
      out.textContent = 'SMOKE FAIL: ' + (err && err.stack ? err.stack : err);
    }
    document.body.appendChild(out);
  })();
}
