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
import { LESSON, lessonHolds } from './lesson.js';
import { freshSeed } from './words.js';
import { Relay, defaultRelayUrl, deviceKind, fetchSession, fetchLeagueGames } from './net.js';
// The stats screens read the archive through the same pure queries the records
// site and the tests run — no second implementation, and no arithmetic here.
import { headToHead, movement, standings, playerCard } from './relay/stats.js';
import { splitTerm } from './relay/result.js';

// Every nation sent a commissioner to Chicago to see its pavilion built.
// Yours is across the way, hiring from the same crowd, and they have done
// this before.
const BOT_NAME = 'The Commissioner';
const BOT_SEAT = 1; // practice games are always you (seat 0) vs the bot

// Engine kind 0-4 → the five disciplines. The engine knows neither the names
// nor the order matters to anything but this line and style.css's .k0-.k4.
const DISC = ['Art', 'Science', 'Machinery', 'Electricity', 'Agriculture'];
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
// The Fair's dress for the game (3 Oct 2026, with the front door): flights on
// real arcs, a hire that reads in order, the Commissioner showing its pick
// before it moves. ?plain plays the way the game did before.
const FAIR = !new URLSearchParams(location.search).has('plain');
// Opening night (built 3 Oct 2026 for Ryan's look, on ?opening until he says it replaces the old end):
// the game ends at the Fair it began at, lit for the night, the players' own pavilions on its promenade
// and the judges' medal over the winner's (scene.js draws all of it; startFinale below sends it the
// players). The same link carries the month's sky, the hire preview and the crews carrying their
// displays up.
const OPENING = FAIR && new URLSearchParams(location.search).has('opening');
const beat = (ms) => (instant() ? Promise.resolve() : sleep(T(ms)));
const snap = (s) => JSON.parse(JSON.stringify(s));

let G = null; // the running game
let sel = null; // {source, kind} — first tap of the two-tap
let animating = false;
// The Learn-to-play coach (see "Learn to play" below), or null. Every hook into
// the game goes through coachOn, which is a no-op outside the tutorial.
let coach = null;
const coachOn = (ev, data) => (coach ? coach.on(ev, data || {}) : Promise.resolve());

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

// Someone who leaves the name box empty plays as "You", and "You is hiring"
// reads as a typo: the sentences built from a name agree with it.
function verb(name, one, you) {
  return name === 'You' ? you : one;
}

function sameSource(a, b) {
  return a.type === b.type && (a.type !== 'source' || a.index === b.index);
}

// ---------------------------------------------------------------------------
// Rendering. Everything rebuilds from a state snapshot; during theatre the
// snapshot lags G.cur deliberately.

function renderAll(st = G.view) {
  $('#week-badge').textContent = 'Month ' + st.round;
  $('#pool-count').textContent = st.bag.length;
  const turn = $('#turn-label');
  if (st.over) {
    turn.textContent = '';
    setPhase("The World's Fair is open");
  } else {
    const who = G.names[st.seatToMove];
    turn.innerHTML = `<b>${esc(who)}</b> ${verb(who, 'is', 'are')} hiring craftspeople`;
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
  // An empty gate is simply empty (Ryan, playtest 2026-08-13): no label and
  // no placeholder — the box's reserved height is what keeps the layout still.
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
        ${b.firstToken ?'<svg class="board-fm" role="img" aria-label="Has First Call next month" title="First Call next month"><use href="#ic-first"/></svg>' : ''}
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
  $$('.bill').forEach((b) => b.remove());
  clearPreview();
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
    const el = m.dest.type === 'line' ? $(`.crew[data-row="${m.dest.row}"]`, boardEl) : $('.idle', boardEl);
    el.classList.add('can-drop');
    if (m.dest.type === 'line') el.setAttribute('aria-label', el.getAttribute('aria-label') + ' — legal destination');
    // ?opening: the bill for whoever would not fit, on the crew before it is chosen
    if (OPENING) {
      const { bill, idled } = idleBill(G.cur.seatToMove, m);
      if (bill > 0) {
        el.insertAdjacentHTML('beforeend', `<span class="bill" aria-hidden="true">−${bill}</span>`);
        el.setAttribute('aria-label', el.getAttribute('aria-label') + ` — ${idled} would stand idle, −${bill}`);
      }
    }
  }
}

// ?opening, the hire preview: what a hire would cost, shown before it is made.
// A crew the pick could go to carries a small red figure, the idle bill for
// the craftspeople who would not fit (exactly what the idle row charges at the
// month's end, read off the engine's own applyTake), and the idle row carries
// the bill for sending them all there. Pointing at a crew, or tabbing to it,
// shows where everyone would stand: faint tiles in the crew and on the idle row,
// and the bay the crew would build lit, if it would be complete.
function idleBill(seat, move) {
  const before = G.cur.boards[seat];
  const after = E.applyTake(G.cur, { source: move.source, kind: move.kind, dest: move.dest }).boards[seat];
  // the First Call token lands first and costs the same wherever the hire goes, so it is not on the bill
  const token = after.floor.includes(E.FIRST_TOKEN) && !before.floor.includes(E.FIRST_TOKEN) ? 1 : 0;
  let bill = 0;
  for (let i = before.floor.length + token; i < after.floor.length; i++) bill += E.FLOOR_PENALTIES[i];
  return { bill, idled: after.floor.length - before.floor.length - token, before, after };
}
function clearPreview() {
  $$('.ghost-tile').forEach((e) => e.remove());
  $$('.wcell.ghost-cell').forEach((e) => e.classList.remove('ghost-cell'));
}
function showPreview(target) {
  clearPreview();
  if (!OPENING || !sel || !G || G.cur.over || animating) return;
  const seat = G.cur.seatToMove;
  const boardEl = target.closest('.board');
  if (!boardEl || Number(boardEl.dataset.seat) !== seat) return;
  const dest = target.classList.contains('idle') ? { type: 'floor' } : { type: 'line', row: Number(target.dataset.row) };
  let res;
  try {
    res = idleBill(seat, { source: sel.source, kind: sel.kind, dest });
  } catch {
    return;
  }
  const { before, after } = res;
  if (dest.type === 'line') {
    const r = dest.row;
    const cells = $$('.ccell', target);
    for (let i = r + 1 - after.lines[r].count; i < r + 1 - before.lines[r].count; i++) {
      cells[i]?.insertAdjacentHTML('beforeend', tileHTML(sel.kind, 'ghost-tile'));
    }
    if (after.lines[r].count === r + 1) {
      $(`.wcell[data-rc="${r}-${E.wallColumn(sel.kind, r)}"]`, boardEl)?.classList.add('ghost-cell');
    }
  }
  const slots = $$('.icell .islot', boardEl);
  for (let i = before.floor.length; i < after.floor.length; i++) {
    const t = after.floor[i];
    slots[i]?.insertAdjacentHTML(
      'beforeend',
      t === E.FIRST_TOKEN ? tokenHTML().replace('class="token"', 'class="token ghost-tile"') : tileHTML(t, 'ghost-tile')
    );
  }
}
if (OPENING) {
  const over = (e) => {
    const t = e.target.closest?.('.crew.can-drop, .idle.can-drop');
    if (t) showPreview(t);
  };
  const out = (e) => {
    const t = e.target.closest?.('.crew.can-drop, .idle.can-drop');
    if (t && !t.contains(e.relatedTarget)) clearPreview();
  };
  if (matchMedia('(hover: hover)').matches) {
    $('#boards').addEventListener('pointerover', over);
    $('#boards').addEventListener('pointerout', out);
  }
  $('#boards').addEventListener('focusin', over);
  $('#boards').addEventListener('focusout', out);
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

function fly(fromRect, toRect, html, opts = {}) {
  if (FAIR) return flyArc(fromRect, toRect, html, opts);
  const { dur = 420, delay = 0, lift = 26 } = opts;
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

// In the Fair's dress a flight is a throw (Ryan, 3 Oct: "the animations are kinda
// choppy"). The old flight went up one straight line and down another, with a
// corner at the top, and scaled about the wrong point, so it landed a few
// pixels off its cell and the tile jumped into place: that was the chop. This
// one rides a curve, eases out of its place and into the next, lifts and tilts
// a little with the throw, and lands exactly on the cell, which shows its tile
// at that moment and settles under it (`land`).
function flyArc(fromRect, toRect, html, { dur = 420, delay = 0, lift = 26, arc = 0.3, tilt = 6, land = null } = {}) {
  const reveal = () => {
    if (!land) return;
    land.classList.remove('pre');
    if (!instant()) {
      land.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(.94)', offset: 0.45 }, { transform: 'none' }], {
        duration: T(150),
        easing: 'ease-out',
      });
    }
  };
  if (instant() || fromRect.width < 2 || toRect.width < 2) {
    reveal();
    return Promise.resolve();
  }
  const w = fromRect.width;
  const h = fromRect.height;
  const el = document.createElement('div');
  el.className = 'fx-tile thrown';
  el.style.width = w + 'px';
  el.style.height = h + 'px';
  el.innerHTML = html;
  $('#fx').appendChild(el);
  const ax = fromRect.left + w / 2;
  const ay = fromRect.top + h / 2;
  const bx = toRect.left + toRect.width / 2;
  const by = toRect.top + toRect.height / 2;
  const dist = Math.hypot(bx - ax, by - ay);
  const cx = (ax + bx) / 2;
  const cy = Math.min(ay, by) - Math.max(lift, Math.min(170, dist * arc));
  const s1 = toRect.width / w;
  const dir = bx >= ax ? 1 : -1;
  const frames = [];
  for (let i = 0, N = 22; i <= N; i++) {
    const t = i / N;
    const u = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // ease in and out along the curve
    const x = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * cx + u * u * bx;
    const y = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * cy + u * u * by;
    const k = Math.sin(Math.PI * u);
    const sc = (1 + (s1 - 1) * u) * (1 + 0.12 * k);
    frames.push({
      offset: t,
      transform: `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) rotate(${(dir * tilt * k).toFixed(2)}deg) scale(${sc.toFixed(3)})`,
    });
  }
  // a longer throw takes a little longer, as it would
  const anim = el.animate(frames, {
    duration: T(dur * (0.85 + Math.min(0.45, dist / 1400))),
    delay: T(delay),
    easing: 'linear',
    fill: 'both',
  });
  return anim.finished
    .then(() => {
      el.remove();
      reveal();
    })
    .catch(() => el.remove());
}

// ?opening, the crews carry their displays up (Ryan's idea, 3 Oct, on the one
// condition that it never slows the game): at the month's close a finished
// crew's lead hand walks the display along the gallery into its bay, holding it
// over their head the way the front door's craftspeople hold up their tiles. It
// takes exactly the time the throw it replaces took, so the month closes no
// later, and the hand steps away once the display is in.
const COATS = ['#3F342A', '#2F3441', '#4B4F53', '#2A3A57', '#5B4A39', '#4A3B44'];
function workerSVG() {
  const coat = COATS[(Math.random() * COATS.length) | 0];
  return `<svg class="worker" viewBox="0 0 20 26" aria-hidden="true">
    <path class="leg l" d="M8.7 15.6 L7.9 25" /><path class="leg r" d="M11.3 15.6 L12.1 25" />
    <path d="M6.3 8.5 Q10 7.5 13.7 8.5 L13.1 16.2 H6.9 Z" fill="${coat}" />
    <path d="M8.4 8.1 L10 11.8 L11.6 8.1 Z" fill="#F3EADA" />
    <path class="arm" d="M6.7 9.1 L4.9 1.6 M13.3 9.1 L15.1 1.6" />
    <circle cx="4.9" cy="1.4" r="1" fill="#E3B590" /><circle cx="15.1" cy="1.4" r="1" fill="#E3B590" />
    <circle cx="10" cy="5.5" r="2.4" fill="#E3B590" />
    <path d="M7.4 4.8 Q10 2.3 12.6 4.8 L13.5 5.1 H7.4 Z" fill="#4B4F53" />
  </svg>`;
}
function carry(fromRect, toRect, html) {
  if (instant() || fromRect.width < 2 || toRect.width < 2) return Promise.resolve();
  const w = toRect.width;
  const h = toRect.height;
  const el = document.createElement('div');
  el.className = 'fx-carry';
  el.style.width = w + 'px';
  el.innerHTML = `<div class="carry-tile" style="height:${h}px">${html}</div>${workerSVG()}`;
  $('#fx').appendChild(el);
  const ax = fromRect.left + fromRect.width / 2 - w / 2;
  const ay = fromRect.top + fromRect.height / 2 - h / 2;
  const dist = Math.hypot(toRect.left - ax, toRect.top - ay);
  const dur = T(460 * (0.85 + Math.min(0.45, dist / 1400))); // the throw's own timing
  const steps = Math.max(3, Math.round(dist / (w * 0.5)));
  el.style.setProperty('--stride', (dur / steps / 1000).toFixed(3) + 's');
  const frames = [];
  for (let i = 0, N = steps * 6; i <= N; i++) {
    const t = i / N;
    const x = ax + (toRect.left - ax) * t;
    const y = ay + (toRect.top - ay) * t - Math.abs(Math.sin(t * steps * Math.PI)) * h * 0.07;
    frames.push({ offset: t, transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` });
  }
  const anim = el.animate(frames, { duration: dur, easing: 'ease-in-out', fill: 'both' });
  return anim.finished
    .then(() => {
      el.querySelector('.carry-tile')?.remove();
      el.classList.add('done'); // the hand steps away, and nobody waits for it
      setTimeout(() => el.remove(), T(260));
    })
    .catch(() => el.remove());
}

// A square the size of `like`, centred on `rect`: where a flight from a chip or
// a corner starts, so the tile is a tile from the first frame.
function squareAt(rect, like) {
  const s = like.width * 0.6;
  return { left: rect.left + rect.width / 2 - s / 2, top: rect.top + rect.height / 2 - s / 2, width: s, height: s };
}

// Craftspeople leaving the board, in the Fair's dress: they walk off and fade where they
// stood, rather than flying to a hidden corner.
function walkOff(rect, html, { delay = 0, dx = 30, dy = -6, rot = 0 } = {}) {
  if (instant() || rect.width < 2) return Promise.resolve();
  const el = document.createElement('div');
  el.className = 'fx-tile';
  el.style.width = rect.width + 'px';
  el.style.height = rect.height + 'px';
  el.innerHTML = html;
  $('#fx').appendChild(el);
  const at = `translate(${rect.left}px, ${rect.top}px)`;
  const anim = el.animate(
    [
      { transform: at, opacity: 1 },
      { transform: `${at} translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(.9)`, opacity: 0 },
    ],
    { duration: T(300), delay: T(delay), easing: 'ease-in', fill: 'both' }
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
function banner(html, cls = '') {
  announce($('#live').textContent + ' ' + html.replace(/<[^>]+>/g, ''));
  if (instant()) return Promise.resolve();
  const el = $('#banner');
  clearTimeout(bannerTimer);
  // Assigning className rather than toggling clears `show` and whatever the
  // last banner's classes were in one go, so a splash can't leak its
  // background onto the next plain banner.
  el.className = cls;
  void el.offsetWidth;
  el.innerHTML = html;
  el.classList.add('show');
  if (FAIR) {
    // In the Fair's dress the board waits for the placard to go: a month's opening or
    // the displays going up should read as a beat, not happen under the words.
    bannerTimer = setTimeout(() => el.classList.remove('show'), T(1150));
    return sleep(T(1180));
  }
  bannerTimer = setTimeout(() => el.classList.remove('show'), T(1600));
  return sleep(T(650));
}

// The big beats — the month opening, the displays going up, the Fair opening
// — mirror the logo (Ryan, playtest 2026-08-13): large type on the card
// cream, words cycling the tile palette. The order puts the two weakest on
// cream (ochre, then black) last, so a three-word beat gets the three
// strongest.
const PV_CYCLE = ['pv0', 'pv1', 'pv4', 'pv3', 'pv2'];
function splashHTML(text) {
  return text
    .split(' ')
    .map((w, i) => `<span class="${PV_CYCLE[i % PV_CYCLE.length]}">${esc(w)}</span>`)
    .join(' ');
}

// The month splash puts the number on its own line, large (Ryan, playtest
// 2026-08-13 — it wrapped that way by accident at some widths and he liked
// it better). An explicit block beats letting the banner's width decide.
function monthSplashHTML(n) {
  return (
    `<span class="pv0">Construction</span> <span class="pv1">Month</span>` +
    `<span class="splash-num pv2">${n}</span>`
  );
}

// Agencies are rendered filled, so before the start-of-month banner their
// tiles must be hidden or the player sees next month's spread and *then*
// watches it deal itself in (Ryan, playtest 2026-08-13). dealAnimation
// unhides them as each one lands.
function hideDealTiles() {
  if (instant()) return;
  $$('#sources .tile').forEach((t) => t.classList.add('pre'));
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
  const stag = () => ({ delay: flightNo++ * (FAIR ? 70 : 45) });

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
      fly(from, a.el.getBoundingClientRect(), a.html, {
        dur: a.thud ? 480 : 420,
        ...stag(),
        land: inner.classList ? inner : null,
      })
    );
  }
  // In the Fair's dress the ones passed over stay standing at the agency until the
  // hire has gone, then make for the gate.
  let spill = 0;
  const spillAt = () => ({ delay: 300 + spill++ * 55, arc: 0.16, tilt: 3 });

  // Whoever wasn't hired spills and scatters out to the gate, where a rival
  // can take them.
  for (const [kind, rects] of Object.entries(leftoverRects)) {
    const targets = $$(`#pool .tile[data-kind="${kind}"]`);
    const delta = interim.pool[kind] - before.pool[kind];
    const newOnes = targets.slice(targets.length - delta);
    newOnes.forEach((t, k) => {
      t.classList.add('pre');
      flights.push(
        fly(rects[k] || rects[0], t.getBoundingClientRect(), tileHTML(Number(kind)), FAIR ? { ...spillAt(), land: t } : stag())
      );
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
  await coachOn('resolve', { interim });
  setPhase('The displays go up');
  setSky('dusk');
  await banner(splashHTML('Craftspeople build the displays'), 'splash');

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

      if (OPENING && !instant()) {
        const from = lead.getBoundingClientRect();
        if (lead.firstElementChild) lead.firstElementChild.style.visibility = 'hidden'; // picked up
        await carry(from, target.getBoundingClientRect(), tileHTML(t.kind));
      } else {
        await fly(lead.getBoundingClientRect(), target.getBoundingClientRect(), tileHTML(t.kind), {
          dur: 460,
          arc: 0.45,
          tilt: 0,
        });
      }
      target.innerHTML = tileHTML(t.kind);
      target.classList.add('filled', 'landed');

      wallCopy[r][c] = 1;
      const d = E.scorePlacement(wallCopy, r, c);
      score += d;
      popup('+' + d, target.getBoundingClientRect(), 'pos');
      setScore(seat, score);
      await coachOn('display', { seat, r, c, d });

      // The display stands; the rest of the crew moves on to another
      // pavilion (engine: to the lid).
      if (r > 0 && !instant()) {
        const drainRect = $('#drain').getBoundingClientRect();
        cells.slice(0, -1).forEach((cell, k) => {
          if (cell.classList.contains('occ')) {
            if (FAIR) walkOff(cell.getBoundingClientRect(), tileHTML(t.kind), { delay: 80 + k * 45, dx: -26 });
            else
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
        if (FAIR) {
          idleEl.animate(
            [{ transform: 'none' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }],
            { duration: T(260), easing: 'ease-in-out' }
          );
        }
        const drainRect = $('#drain').getBoundingClientRect();
        $$('.icell .islot', idleEl).forEach((slot, i) => {
          const inner = slot.firstElementChild;
          if (!inner) return;
          if (!inner.classList.contains('token')) {
            if (FAIR) walkOff(slot.getBoundingClientRect(), tileHTML(b.floor[i]), { delay: 120 + i * 45, dx: 0, dy: 18, rot: i % 2 ? 9 : -9 });
            else
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
    // The one splash on black: the Fair opening is the end of the game, and
    // the ground going dark says so before the words are read. On ?opening the
    // Fair itself comes up behind the words at dusk, and its lights come on.
    startFinale(final.result);
    await banner(splashHTML("The World's Fair is Open!"), 'splash finale');
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
    for (let i = 0; i < 7 && !FAIR; i++) {
      waves.push(fly(drainRect, poolRect, tileHTML(i % 5), { dur: 420, delay: i * 55, lift: 30 }));
    }
    await Promise.all(waves);
    setTimeout(() => $('#pool-chip').classList.remove('wave'), T(1600));
  }

  // Next month's agencies fill. Who holds First Call is announced to screen
  // readers by the month-begins announce in playMove; the splash itself is
  // just the month (Ryan, playtest 2026-08-13).
  G.view = snap(final);
  renderAll();
  setPhase('');
  setSky('');
  hideDealTiles();
  await banner(monthSplashHTML(final.round), 'splash');
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
  if (FAIR) {
    // A month's crowd arrives an agency at a time, four to a dais.
    let slot = 0;
    let last = null;
    await Promise.all(
      tiles.map((t) => {
        const agency = Number(t.closest('.source').dataset.source);
        slot = agency === last ? slot + 1 : 0;
        last = agency;
        const to = t.getBoundingClientRect();
        return fly(squareAt(poolRect, to), to, tileHTML(Number(t.dataset.kind)), {
          dur: 400,
          delay: agency * 170 + slot * 60,
          arc: 0.18,
          land: t,
        });
      })
    );
    return;
  }
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
  coachOn('move', { seat, move });

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
    // The coach can hold the next turn for a word (the tutorial's Next).
    const game = G;
    await coachOn('settled', { before, interim, final, move, resolved });
    if (G !== game || game.dead) return;
    startClock(final.seatToMove);
    if (resolved) {
      announce(
        `Month ${final.round} begins. ` +
          G.names.map((n, i) => `${n} ${final.boards[i].score}`).join(', ') +
          `. ${G.names[final.startPlayer]} ${verb(G.names[final.startPlayer], 'starts', 'start')}.`
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
    await beat(FAIR ? 380 : 750); // in the Fair's dress the pick is shown as well, below
    if (G !== game || G.dead || G.cur.over || G.cur.seatToMove !== BOT_SEAT || animating) return;
    const m = greedyMove(G.cur);
    sel = { source: m.source, kind: m.kind };
    if (FAIR && !instant()) {
      // In the Fair's dress you see the Commissioner's hand the way you see your own:
      // its pick lifts and its legal crews light, then only the crew it chose.
      applySelection();
      await beat(560);
      if (G !== game || G.dead || G.cur.over || G.cur.seatToMove !== BOT_SEAT || animating) return;
      $$('.can-drop').forEach((e) => e.classList.remove('can-drop'));
      const boardEl = $(`.board[data-seat="${BOT_SEAT}"]`);
      (m.dest.type === 'line' ? $(`.crew[data-row="${m.dest.row}"]`, boardEl) : $('.idle', boardEl))?.classList.add('aim');
      await beat(300);
      if (G !== game || G.dead || G.cur.over || G.cur.seatToMove !== BOT_SEAT || animating) return;
    }
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
  let msg = `${name} ${verb(name, 'engages', 'engage')} ${n} ${DISC[move.kind]} from ${src}`;
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
  if (!cfg.lesson) endCoach();
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
  setSky('');
  renderAll();
  // renderAll only writes the phase label when the game is over, so without
  // this a rematch opened under the last game's "The World's Fair is open"
  // (Ryan, playtest 2026-08-13). The first move clears it.
  setPhase('Construction begins');
  announce(
    `New game, seed ${seed}. ${G.names[s.startPlayer]} ${verb(G.names[s.startPlayer], 'hires', 'hire')} first in month 1.`
  );
  // Resuming a game already in progress: the caller is about to replay the
  // move list onto this state, so there is no opening to play.
  if (cfg.resume) return;
  (async () => {
    animating = true;
    hideDealTiles();
    await coachOn('intro');
    await banner(monthSplashHTML(1), 'splash');
    await dealAnimation();
    animating = false;
    const game = G;
    await coachOn('settled', { final: s });
    if (G !== game || game.dead) return;
    startClock(s.seatToMove);
    scheduleBot(); // the seed may hand the bot the opening move
  })();
}

function endGame(ending, flaggedSeat = null) {
  if (!G || G.ended) return; // both clients may reach the same ending
  G.ended = ending;
  endCoach();
  if (G.clockTimer) {
    clearInterval(G.clockTimer);
    G.clockTimer = null;
  }
  G.clockSeat = null;
  setPhase("The World's Fair is open");

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
  // The winner's line is a sentence with the name picked out in the house
  // red (Ryan, playtest 2026-08-13); announce() needs the same line without
  // the markup, so the two are built together.
  const winName = draw ? null : G.names[result.winner];
  const titleText = draw
    ? 'Shared victory'
    : ending === 'timeout'
      ? `${winName} ${verb(winName, 'wins', 'win')} on time`
      : `${winName} ${verb(winName, 'has', 'have')} built the most prestigious pavilion in the world!`;
  const titleHTML = draw
    ? 'Shared victory'
    : ending === 'timeout'
      ? `${esc(winName)} ${verb(winName, 'wins', 'win')} on time`
      : `<span class="champ-name">${esc(winName)}</span> ${verb(winName, 'has', 'have')} built the most prestigious pavilion in the world!`;
  // A natural win needs no explanation under the headline (Ryan, playtest
  // 2026-08-13); the two endings that *are* surprising still get a line.
  const sub =
    ending === 'timeout'
      ? `${esc(G.names[flaggedSeat])}'s clock ran out. Scores are recorded but sit out the score-based awards.`
      : draw
        ? 'Level on points and on completed rows — the rulebook calls it a shared win.'
        : '';

  // The scoring breakdown deliberately says rows / columns / colors rather
  // than galleries / aisles / disciplines (Ryan, playtest 2026-08-13): at the
  // moment of scoring, plain board words beat the theme's.
  const rows = G.names
    .map((name, seat) => {
      const b = G.cur.boards[seat];
      const bonus = ending === 'natural' ? E.bonuses(b.wall) : 0;
      const detail =
        ending === 'natural'
          ? `${count(E.completeRows(b.wall), 'row', 'rows')} · ` +
            `${count(E.completeColumns(b.wall), 'column', 'columns')} · ` +
            `${count(E.completeKinds(b.wall), 'color', 'colors')}`
          : seat === flaggedSeat
            ? 'lost on time'
            : '—';
      const win = draw ? result.leaders.includes(seat) : seat === result.winner;
      return `<tr class="${win ? 'win' : ''}">
        <td>${esc(name)}<span class="detail-under">${detail}</span></td>
        <td class="detail">${detail}</td>
        <td class="num">${result.scores[seat] - bonus}</td>
        <td class="num">${bonus ? '+' + bonus : ''}</td>
        <td class="num total">${result.scores[seat]}</td>
      </tr>`;
    })
    .join('');

  startFinale(result);
  $('#end-modal').classList.toggle('finale', OPENING);
  body.innerHTML = `
    <p class="whistle">${ending === 'timeout' ? 'Out of time' : 'Judging the Pavilions'}</p>
    <p class="champion spot${draw || ending === 'timeout' ? '' : ' story'}">${titleHTML}</p>
    <p class="end-sub">${sub}</p>
    <table class="final-table${OPENING ? ' compact' : ''}">
      <tr><th>Player</th><th class="detail">Bonuses</th><th class="num">Score</th><th class="num">Bonus</th><th class="num">Total</th></tr>
      ${rows}
    </table>`;
  announce(`${titleText}. ` + G.names.map((n, i) => `${n} ${result.scores[i]}`).join(', ') + '.');

  // Online, only the host can call a rematch, and "Home" means leaving the
  // room rather than clearing a table.
  const host = !G.online || !!net?.host;
  $('#btn-rematch').classList.toggle('hidden', !host);
  $('#btn-setup').textContent = G.online ? 'Leave the room' : 'Home';
  $('#end-net').textContent =
    G.online && !host ? `Waiting for ${G.names[0]} to start a rematch — same room, a new crowd.` : '';
  renderRecordLine();
  // Empty until the receipt lands a beat later — which is the pacing a
  // broadcast would choose anyway, the table moving after the final whistle.
  renderAftermath();

  $('#end-modal').showModal?.();
}

// ?opening, the month's sky: the board stands in daylight while the crews are
// hired, and the sun goes down behind the skyline while the displays go up;
// the next month starts in daylight again, and the last month's dusk runs on
// into opening night.
function setSky(v) {
  if (OPENING) document.body.dataset.sky = v;
}
if (OPENING) $('#game').insertAdjacentHTML('afterbegin', '<div id="sky" aria-hidden="true"><div class="sky-glow"></div><div class="sky-line"></div></div>');

// Opening night: hand the Fair (scene.js) each player's name, wall, score and
// whether they won, once per game. The board steps aside while it plays
// (style.css, data-front="finale"); closing the result card ends it.
function startFinale(result) {
  if (!OPENING || !G || G.finale) return;
  G.finale = true;
  const draw = result.winner === -1;
  const players = G.names.map((name, seat) => ({
    name,
    wall: G.cur.boards[seat].wall.map((row) => row.slice()),
    score: result.scores[seat],
    win: draw ? result.leaders.includes(seat) : seat === result.winner,
  }));
  // kept where scene.js looks on load too, in case the game ended before the Fair's script ran
  window.__pavilionFinale = { players };
  document.dispatchEvent(new CustomEvent('pavilion:finale', { detail: { players } }));
}
$('#end-modal').addEventListener('close', () => {
  if (!OPENING) return;
  window.__pavilionFinale = null;
  setSky('');
  document.dispatchEvent(new CustomEvent('pavilion:finale-end'));
});

// --- the archive's receipt --------------------------------------------------
//
// "Results record themselves. No submit button" (PAVILION.md). The server has
// already replayed the move list and derived the winner itself by the time this
// arrives — nobody, including the winner, reports anything. All the modal does
// is say whether it landed, because a game that quietly didn't count is the
// worst version of automatic results.

function onRecorded(msg) {
  if (!G || !G.online) return;
  G.recorded = msg;
  renderRecordLine();
  renderAftermath();
}

function renderRecordLine() {
  const el = $('#end-record');
  if (!el) return;
  const rec = G?.recorded;
  // No term, no roster, nothing to say: the game is a public page and most of
  // the people who ever open it are not in a class.
  if (!rec || (!rec.recorded && !session)) {
    el.textContent = '';
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  if (!rec.recorded) {
    el.textContent = `Not recorded — ${rec.why}.`;
    return;
  }
  if (rec.result?.ending === 'void') {
    el.textContent = 'Recorded, but not counted — this game could not be verified.';
    return;
  }
  if (rec.mode === 'boss') {
    el.textContent = 'Recorded as a Boss Battle — it goes on the records, and it doesn’t touch the league.';
    return;
  }
  if (rec.mode === 'exhibition') {
    el.textContent = 'Recorded as an exhibition — exhibitions stay out of the league.';
    return;
  }
  const pts = (rec.result?.points || []).map(
    (p, i) => `${rec.names?.[i] || G.names[i]} ${p} ${p === 1 ? 'point' : 'points'}`
  );
  const where = rec.mode === 'cup' ? 'the Cup' : 'the league';
  el.textContent = `Recorded to ${where}${pts.length ? ` — ${pts.join(', ')}` : ''}.`;
}

// ---------------------------------------------------------------------------
// The stats screens (build step 6, PAVILION.md — *The stats screens*).
//
// Two of them: the **pre-game splash**, which is the head-to-head card in the
// lobby, and the **post-game screen**, which is what the finished game did to
// the season. Both are pure queries over `relay/stats.js` — this file supplies
// the words and the theatre, exactly as it does for the board.
//
// ⚖️ **The splash lives in the lobby**, rather than being its own screen
// between the start and the board (2026-08-14). The memo asks for a card that
// is brief, mutually visible, click-to-start and must not eat the clock, and
// the lobby is already all four: both players are looking at it, the host's
// "Start the game" *is* the click, and no clock has started because no game
// has. A screen after the start would have to be dismissed by each device
// separately, and a player still reading it while the other has moved is
// exactly the clock-eating the memo warns about.
//
// ⚠️ **No league position on the splash** (memo, and the reason is narrow):
// the splash is shown involuntarily with an opponent reading the same screen,
// which is the wrong place to surface someone's standing. `playerCard` hands us
// a rank and we deliberately do not print it — a student's own position is on
// the records page, where it is theirs to look at.

// The season's games, fetched once and reused by both screens. A minute is
// long enough to cover opening a room and playing a rematch, and short enough
// that a lobby opened after somebody else's game shows it.
// Named for the screen it feeds, and deliberately not `history` — that is a
// browser global, and a module-scoped shadow of one is a trap for a reader.
const SEASON_TTL = 60000;
let seasonSoFar = null; // {league, season, games, at}
let seasonLoad = null;

async function loadHistory(force = false) {
  if (!session?.term || !RELAY_URL) return null;
  if (!force && seasonSoFar && Date.now() - seasonSoFar.at < SEASON_TTL) return seasonSoFar;
  if (seasonLoad) return seasonLoad;
  const { league, season } = splitTerm(session.term);
  seasonLoad = fetchLeagueGames(RELAY_URL, { league, season })
    .then((games) => {
      // A failed fetch keeps what we had: a splash showing last week's numbers
      // beats one that vanishes because the wifi blinked.
      if (games) seasonSoFar = { league, season, games, at: Date.now() };
      return seasonSoFar;
    })
    .finally(() => {
      seasonLoad = null;
    });
  return seasonLoad;
}

function when(at) {
  return at ? new Date(at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
}

function ordinal(n) {
  if (!Number.isFinite(n)) return '';
  const v = n % 100;
  const s = ['th', 'st', 'nd', 'rd'];
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Form, newest first, as the records site draws it — same letters, same
// classes, so the two pages read as one thing.
function formHTML(form) {
  if (!form || !form.length) return '<span class="form empty">No games yet</span>';
  const said = form.map((f) => ({ W: 'won', D: 'drew', L: 'lost' })[f]).join(', ');
  return `<span class="form" aria-label="Form, newest first: ${said}">${form
    .map((f) => `<b class="${f}" aria-hidden="true">${f}</b>`)
    .join('')}</span>`;
}

// Every seat, in seat order, with the roster id it plays under. `null` in here
// means somebody typed their name — that game records nothing (archive.js,
// classify), so neither screen has anything true to say about it.
function seatedPlayers() {
  const seats = [...(netRoom?.seats || [])].sort((a, b) => a.seat - b.seat);
  return { names: seats.map((s) => s.name), ids: seats.map((s) => s.pid) };
}

// --- the pre-game splash ----------------------------------------------------

let tapeKey = null; // what the card was built for, so it animates once

function renderTape() {
  const el = $('#tape');
  if (!el) return;
  const { names, ids } = seatedPlayers();
  const known = ids.length >= 2 && ids.every(Boolean);
  if (!known || !seasonSoFar) {
    el.classList.add('hidden');
    el.innerHTML = '';
    tapeKey = null;
    return;
  }
  // renderLobby runs on every presence flicker; the card is rebuilt only when
  // the players or the archive behind it actually change, or the numbers would
  // re-animate every time somebody's phone slept.
  const key = ids.join('|') + '@' + seasonSoFar.at;
  if (key === tapeKey) return;
  tapeKey = key;

  const h2h = headToHead(seasonSoFar.games, ids);
  const wins = ids.map((id) => h2h.wins[id] || 0);
  const shared = h2h.drawn ? `<span class="tape-drawn">${count(h2h.drawn, 'game', 'games')} shared</span>` : '';

  // One "side" per player, name and number together, and the separator between
  // them is a CSS pseudo-element rather than markup. That is what lets a phone
  // stack the same line into a scoreboard — at 390px the mirrored marquee form
  // (name score – score name) wraps and orphans the second name, and a
  // three-player room needs the stacked shape at any width anyway.
  const cls = h2h.first ? 'first' : ids.length === 2 ? '' : 'many';
  const score =
    `<p class="tape-score ${cls}">` +
    names
      .map(
        (n, i) =>
          `<span class="side"><span class="tn">${esc(n)}</span>${h2h.first ? '' : `<b>${wins[i]}</b>`}</span>`
      )
      .join('') +
    '</p>';

  const cols = ids
    .map((id, i) => {
      // playerCard is null for a player with no league games yet, which in
      // week 1 is everybody — the card says so rather than showing zeros.
      const c = playerCard(seasonSoFar.games, id);
      return `<div class="tape-col">
        <p class="tape-name">${esc(names[i])}</p>
        ${formHTML(c?.form)}
        <dl class="tape-stats">
          <div><dt>Best</dt><dd>${c?.played ? c.best : '—'}</dd></div>
          <div><dt>Average</dt><dd>${c?.played ? (Math.round(c.avg * 10) / 10).toFixed(1) : '—'}</dd></div>
          <div><dt>Played</dt><dd>${c?.played ?? 0}</dd></div>
        </dl>
      </div>`;
    })
    .join('');

  const last = h2h.last
    ? `<p class="tape-last">Last met ${when(h2h.last.at)} — ${h2h.last.names
        .map((n, i) => `${esc(n)} ${h2h.last.scores[i]}`)
        .join(', ')}</p>`
    : '';

  el.innerHTML =
    `<p class="tape-kicker">${
      h2h.first ? 'First meeting' : count(h2h.played, 'previous meeting', 'previous meetings')
    }${shared}</p>` +
    score +
    `<div class="tape-grid">${cols}</div>` +
    last;
  el.classList.remove('hidden');
}

// --- the post-game screen ---------------------------------------------------

// The receipt is the trigger, not the local result: the head-to-head and the
// table have to move by the *server's* numbers, and a game that recorded
// nothing moved nothing (PAVILION.md — nobody reports a result).
function renderAftermath() {
  const el = $('#end-after');
  if (!el) return;
  el.classList.add('hidden');
  el.innerHTML = '';

  const rec = G?.recorded;
  if (!rec?.recorded || !rec.result || rec.result.ending === 'void') return;
  // Exhibitions and practice games are archived and compete in nothing, so
  // there is no series and no movement to show (stats.js, LEAGUE_MODES).
  if (rec.mode !== 'league' && rec.mode !== 'cup') return;
  const { names, ids } = seatedPlayers();
  if (ids.length < 2 || !ids.every(Boolean)) return;
  if (!seasonSoFar) {
    // ⚠️ Without the archive there is no "before", and this game on its own
    // would read as a first meeting on an empty table — a confident lie rather
    // than a gap. So it shows nothing and tries the fetch once; the receipt
    // line above still says the game recorded, which is the part that matters.
    loadHistory().then((h) => h && renderAftermath());
    return;
  }

  const games = seasonSoFar.games;
  // Idempotent by construction: this game is taken *out* of the before-table by
  // id and put back for the after-table, so it makes no difference whether the
  // archive we are holding was fetched before this game or after it.
  const before = games.filter((g) => g.id !== rec.id);
  const after = [...before, localSummary(rec, ids, names)];
  if (games.length === before.length) {
    // A rematch never passes the lobby again, so the cache has to learn about
    // the game that just finished or the next screen shows a stale series.
    seasonSoFar.games = after;
    seasonSoFar.at = Date.now();
  }

  const h2h = headToHead(after, ids);
  const series = seriesLine(h2h, ids, names);
  // The Cup is a knockout and moves nothing in the league table; the series
  // still counts it, because two people meeting in the final have met.
  const moved = rec.mode === 'league' ? movement(standings(before), standings(after), ids) : [];
  const lines = moved.filter((m) => Number.isFinite(m.to)).map(movementLine);

  el.innerHTML =
    `<p class="after-kicker">The season so far</p>` +
    `<p class="series">${esc(series)}</p>` +
    (lines.length
      ? `<ul class="moves">${lines
          .map((l) => `<li class="${l.cls}"><b class="delta">${l.chip}</b><span>${esc(l.text)}</span></li>`)
          .join('')}</ul>`
      : '');
  el.classList.remove('hidden');
  announce(series + ' ' + lines.map((l) => l.text).join('. '));
}

// What the server just archived, as `stats.js` reads a game. Built from the
// receipt rather than from our own board: the result that counts is the one
// derived by replay (relay/result.js).
// `ids` and `names` both come from the room's seats rather than one from there
// and one off the receipt — two orderings that agree today is not a reason to
// hand a stats query a chance of pairing the wrong name to the wrong id.
function localSummary(rec, ids, names) {
  const { league, season } = splitTerm(rec.term);
  return {
    id: rec.id,
    term: rec.term,
    league,
    season,
    mode: rec.mode,
    seats: ids,
    names,
    endedAt: Date.now(),
    plies: G.moves.length,
    result: rec.result,
  };
}

function seriesLine(h2h, ids, names) {
  const w = ids.map((id) => h2h.wins[id] || 0);
  // Week 1 is every pair's first meeting, and saying so plainly beats a 1–0
  // series that reads as though there were a history behind it.
  if (h2h.played <= 1) return 'Their first meeting.';
  const shared = h2h.drawn ? `, with ${count(h2h.drawn, 'game', 'games')} shared` : '';
  if (ids.length !== 2) {
    return `${h2h.played} meetings — ` + names.map((n, i) => `${n} ${w[i]}`).join(', ') + shared + '.';
  }
  if (w[0] === w[1]) return `The series is level at ${w[0]}–${w[1]}${shared}.`;
  const lead = w[0] > w[1] ? 0 : 1;
  return `${names[lead]} leads the series ${w[lead]}–${w[1 - lead]}${shared}.`;
}

// "Sam ↑2 to 4th" (PAVILION.md). A player with no `from` has just entered the
// table, which reads as arriving rather than as a rise of null.
function movementLine(m) {
  const where = ordinal(m.to);
  if (!Number.isFinite(m.from)) return { cls: 'new', chip: '•', text: `${m.name} is on the board in ${where}` };
  if (m.moved > 0) return { cls: 'up', chip: `↑${m.moved}`, text: `${m.name} to ${where}` };
  if (m.moved < 0) return { cls: 'down', chip: `↓${-m.moved}`, text: `${m.name} to ${where}` };
  return { cls: 'hold', chip: '–', text: `${m.name} holds ${where}` };
}

// The game record (§10) — for the Download-record button behind `?dev=1`, and
// nothing else. ⚠️ **This is not what the archive stores.** A live game's real
// record is written by the server, which replays this same move list and
// derives the winner itself (relay/result.js); a client's copy is a bug report,
// which is why `term` says so rather than naming a term it cannot know.
//
// Rehearsals against the bot never reach a relay, so they are never archived —
// consistent with counting for nothing (PAVILION.md, The Training Ground).
function gameRecord() {
  return {
    v: E.ENGINE_VERSION,
    term: 'client-export',
    mode: G.cfg.bot ? 'practice' : G.online ? 'league' : 'exhibition',
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
// A link for one group of people (3 Oct 2026, for Ryan's family): ?names=Mary,Jim,…
// puts those names on the setup screen as the choices instead of the relay's
// class list, and &clock=0 starts a live game without a clock. Neither touches
// the relay: a name picked here carries no roster id, so these games never
// record. ?join=CODE is what the lobby's invite link sends: the join screen
// opens with the room's code already in.
const FAMILY = (params.get('names') || '')
  .split(',')
  .map((n) => n.trim().slice(0, 20))
  .filter(Boolean)
  .slice(0, 12);
const START_CLOCK = params.get('clock');
const JOIN = (params.get('join') || '').trim().toUpperCase().slice(0, 24);
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

function connectRoom({ code, name, pid = null, players, clockMs, id }) {
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
  // The archive's receipt, which arrives after the result because storage is
  // slower than a broadcast and the players are not waiting on it.
  net.on('recorded', onRecorded);
  net.on('status', renderNetChip);
  net.on('error', onNetError);

  net.connect({ code, hello: { name, pid: pid || undefined, device: deviceKind(), players, clockMs } });
  showLobby();
}

function onWelcome(w) {
  netRoom = w.room;
  saveSession({ code: w.code, id: w.you.id, name: lastTypedName, pid: me?.id || null });
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
    // A game that finished while we were away may already be in the archive;
    // the receipt rides along in `welcome` so the modal is not blank.
    G.recorded = w.room.recorded || null;
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
    announce(`Back in the game. Month ${s.round}, ${G.names[s.seatToMove]} to hire.`);
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
  // The splash's data, fetched while the room fills up — so the card is ready
  // by the time the second player arrives, and nothing waits on it if it isn't.
  loadHistory().then(() => renderLobby());
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
      ? FAIR
        ? 'Send the invite link, or read out the code, then start when everyone is in.'
        : 'Read the code out in your breakout room, then start when everyone is in.'
      : 'Everyone is in — start when you are ready.'
    : `Waiting for ${seats[0]?.name || 'the host'} to start the game.`;
  renderTape();
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
      coachOn('select');
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
    coachOn('select');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sel) {
    sel = null;
    applySelection();
    announce('Selection cleared.');
    coachOn('select');
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

// ---------------------------------------------------------------------------
// Identity (build step 5, PAVILION.md — Identity, results, data).
//
// **The roster name-picker, not personal links.** If the relay has a term and a
// class list, the join screen lists the class and you click your name; this
// device then remembers you, so from week two it is *"Welcome back, Sam — not
// Sam?"*. There is no password and no account, ever: the security model is
// **that you can see them**. They are in your Zoom room, you assigned the
// pairings, and two people cannot claim one name in a session without it
// showing. That is adequate for fourteen students playing for a leaderboard.
//
// Rejected on the way here: personal join links (students lose them) and a
// link repository on Canvas (every student can see everyone's link, so anyone
// can play as anyone).
//
// With no roster — the game is a public page and carries no course branding —
// this whole layer stays out of the way and you type your name, as before.

const PLAYER_KEY = 'pavilion.player';

let session = null; // {term, boardSize, roster:[{id,name,instructor}]} or null
let me = null; // the roster entry this device belongs to

function loadPlayer() {
  try {
    return JSON.parse(localStorage.getItem(PLAYER_KEY) || 'null');
  } catch {
    return null;
  }
}

function savePlayer(entry) {
  try {
    if (entry) localStorage.setItem(PLAYER_KEY, JSON.stringify({ id: entry.id, name: entry.name }));
    else localStorage.removeItem(PLAYER_KEY);
  } catch {
    /* private browsing: you pick your name again each week, and that is all */
  }
}

// The link's own names (?names=), when it has them: tap yours, and this device
// remembers it, the way the class list does.
const FAMILY_KEY = 'pavilion.family';
let familyPick = null;
try {
  const saved = localStorage.getItem(FAMILY_KEY);
  if (saved && FAMILY.includes(saved)) familyPick = saved;
} catch {
  /* private browsing: pick again next time */
}
function pickFamily(name) {
  familyPick = name;
  try {
    if (name) localStorage.setItem(FAMILY_KEY, name);
    else localStorage.removeItem(FAMILY_KEY);
  } catch {
    /* as above */
  }
  $('#name-field').classList.remove('needed');
  renderNameInputs();
}
function renderFamilyNames(wrap) {
  wrap.innerHTML = '';
  if (familyPick) {
    const p = document.createElement('p');
    p.className = 'whoami';
    p.innerHTML = `Playing as <b>${esc(familyPick)}</b>. `;
    const not = document.createElement('button');
    not.type = 'button';
    not.className = 'link-btn';
    not.textContent = `Not ${familyPick}?`;
    not.addEventListener('click', () => pickFamily(null));
    p.appendChild(not);
    wrap.appendChild(p);
    return;
  }
  const list = document.createElement('div');
  list.className = 'roster family';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', 'Who are you?');
  for (const name of FAMILY) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'roster-btn';
    btn.textContent = name;
    btn.addEventListener('click', () => pickFamily(name));
    list.appendChild(btn);
  }
  wrap.appendChild(list);
}

// You only ever name yourself: the other pavilions name themselves, on their
// own devices, or are the bot.
function renderNameInputs() {
  const wrap = $('#name-inputs');
  if (FAMILY.length) return renderFamilyNames(wrap);
  if (!session) {
    const existing = $$('input', wrap)[0]?.value;
    wrap.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = 'Your name';
    input.value = existing || lastTypedName;
    input.setAttribute('aria-label', 'Your name');
    wrap.appendChild(input);
    return;
  }

  wrap.innerHTML = '';
  if (me) {
    // The week-two case, and the reason the device remembers at all: a student
    // in a breakout room should be two clicks from playing, not scrolling a
    // class list every time.
    const p = document.createElement('p');
    p.className = 'whoami';
    p.innerHTML = `Welcome back, <b>${esc(me.name)}</b>. `;
    const not = document.createElement('button');
    not.type = 'button';
    not.className = 'link-btn';
    not.textContent = `Not ${me.name}?`;
    not.addEventListener('click', () => {
      me = null;
      savePlayer(null);
      renderNameInputs();
    });
    p.appendChild(not);
    wrap.appendChild(p);
    return;
  }

  const list = document.createElement('div');
  list.className = 'roster';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', 'Who are you?');
  for (const entry of session.roster) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'roster-btn';
    btn.textContent = entry.name;
    btn.addEventListener('click', () => {
      me = entry;
      savePlayer(entry);
      $('#name-field').classList.remove('needed');
      renderNameInputs();
    });
    list.appendChild(btn);
  }
  wrap.appendChild(list);
}

// The name and roster id this device plays under. `pid` is null when nobody
// picked from a roster, which is what keeps a stranger's game out of the
// archive (relay/archive.js, classify).
function whoAmI() {
  if (FAMILY.length && familyPick) return { name: familyPick, pid: null };
  if (session && me) return { name: me.name, pid: me.id };
  return { name: $('#name-inputs input')?.value.trim() || lastTypedName || 'You', pid: null };
}

// The roster arrives after the screen does, so the picker replaces the text box
// rather than delaying the page. A relay with no term configured — a laptop
// playtest, or anyone who found the URL — never gets one.
async function loadRoster() {
  if (FAMILY.length) return; // the link brought its own names
  const s = await fetchSession(RELAY_URL);
  if (!s) return;
  session = s;
  const saved = loadPlayer();
  me = saved ? s.roster.find((r) => r.id === saved.id) || null : null;
  $('#name-field').classList.add('rostered');
  renderNameInputs();
  // Warm the archive while the player is still choosing a name, so the splash
  // is already there when the room fills. Nothing waits on it.
  loadHistory();
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
  // A live game needs no explanation (Ryan, playtest 2026-08-13); the
  // rehearsal hint is Ryan's copy verbatim. The opponent is still the
  // Commissioner — the bot introduces itself on the board.
  $('#mode-hint').textContent = online
    ? ''
    : 'A rehearsal match where you can practice your skills hiring the right ' +
      'craftspeople to build the best mock pavilion before the Fair begins.';
  $('#setup-submit').textContent = online
    ? joining
      ? 'Join the room'
      : 'Start the competition'
    : 'Start the rehearsal';
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
  // A roster with nobody picked is the one thing that stops here: a game that
  // played anonymously would silently not record, which is the worst version
  // of "results record themselves".
  if ((session && !me) || (FAMILY.length && !familyPick)) {
    $('#name-field').classList.add('needed');
    $('#name-field .roster-btn')?.focus();
    return;
  }
  const who = whoAmI();
  lastTypedName = who.name;

  if (setupMode === 'online') {
    const code = setupJoin ? $('#code-input').value.trim().toUpperCase() : null;
    if (setupJoin && !code) return $('#code-input').focus();
    $('#lobby-error').classList.add('hidden');
    connectRoom({
      code,
      name: who.name,
      pid: who.pid,
      players: setupPlayers,
      clockMs: Number($('#clock-select').value),
    });
    return;
  }

  startGame({
    players: 2,
    names: [who.name, BOT_NAME],
    bot: true,
    clockMs: Number($('#clock-select').value),
  });
});

// Leaving a game means leaving the room it was played in — otherwise the seat
// sits there "reconnecting…" on the other player's screen forever.
function toSetup() {
  endCoach();
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
// ?dev=1 puts the record buttons back: a JSON move log is a bug report, not
// something to hand a student (Ryan, 2026-08-13). The archive itself is
// unaffected — build step 5's server writes it from the same move list.
if (params.get('dev')) {
  $('#btn-export').classList.remove('hidden');
  $('#btn-record').classList.remove('hidden');
}
$('#btn-export').addEventListener('click', downloadRecord);
$('#btn-record').addEventListener('click', downloadRecord);
$('#btn-rematch').addEventListener('click', () => {
  // Online, a rematch is the same room and the same seats with a fresh bag,
  // so nobody has to read a code out twice. The new game arrives as another
  // `started` — for everyone, including whoever clicked.
  if (G.online) return void net?.rematch();
  $('#end-modal').close();
  startGame({ ...G.cfg, seed: '', lesson: false }); // a new crowd, the same room
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
      connectRoom({ code: saved.code, name: saved.name, pid: saved.pid, id: saved.id });
    });
  }
}

// ---------------------------------------------------------------------------
// Learn to play (3 Oct 2026; the button is the Fair's, so not on ?plain).
//
// Ryan: rather than a page of rules, "a scripted tutorial like they do in video
// games, with highlights for 'grab these tiles' and 'put them here'". So the
// first game is coached on the real board: a spotlight, a pointing hand and one
// short line at a time, and every move is a real move through submitMove and
// playMove like any other. The deal is a fixed seed with the lesson in month 1:
// two Science at the middle agency fill the gallery 2 crew exactly, the
// Commissioner (deterministic) answers from another agency, and the one
// Machinery left at the gate fills gallery 1, so at the month's end the two
// displays go up one above the other and score 1, then 2. After the first month
// the coach steps back and the game plays on as a rehearsal. Practice games
// never record, and neither does this one.
//
// Everything the coach says is in LESSON_LINES: Claude's draft, Ryan's to change.
// The deal itself (the seed and the two moves) is lesson.js: LESSON.first is
// the two Science at the middle agency, to gallery 2; LESSON.second the lone
// Machinery at the gate, to gallery 1.
const LESSON_LINES = {
  // The opening, before the first month (Ryan, 3 Oct: say what the game is
  // about and what is at stake, the way Azul's rulebook opens, then "let's
  // play a round together").
  kicker: 'Learn to play',
  intro: [
    ["Welcome to the World's Fair", 'Chicago, 1893. Nations from across the globe are racing to finish their pavilions before the Fair opens. You are building yours, and the Commissioner across the way is building theirs.'],
    ['This is your pavilion', 'Its 25 spaces wait for displays of art, science, machinery, electricity and agriculture. Every display you put up scores points, and displays that join up score more.'],
    ['Craftspeople come to the agencies', 'Each month they arrive looking for work. You and the Commissioner take turns hiring them, and every crew you fill puts up one display.'],
    ['Five months at least', 'A row of your pavilion takes at least five months to fill. The month someone completes one, construction stops, the Fair opens and the judges score every pavilion. The most points wins.'],
  ],
  disciplines: ['Art', 'Science', 'Machinery', 'Electricity', 'Agriculture'],
  letsPlay: "Let's play the first month together",
  hire: ['Hire these two', 'You always hire every one of a color at an agency.'],
  place: ['Put them on this crew', 'It has room for exactly two.'],
  gate: ['The rest wait at the gate', 'Anyone can hire them from here later.'],
  rival: ["The Commissioner's turn", 'Your rival builds a pavilion too, from the same crowd.'],
  hire2: ['Hire this one from the gate', 'The first to the gate each month takes the First Call token too.'],
  place2: ['Put it on this crew', 'This one has room for one.'],
  token: ['You hold First Call', 'You start next month. But the token stands idle, and idle costs points.'],
  free: ['Your turn: hire any group', 'Then put them on a crew that lights up.'],
  freePlace: ['Now pick a lit crew', "Anyone who doesn't fit stands idle."],
  idle: ['Extras stand idle', 'Each one costs points when the month ends.'],
  build: ['The month is over', 'Every full crew now puts up one display in your pavilion.'],
  first: ['Your first display: +1', 'A display on its own scores 1.'],
  joined: (d) => [`Joined up: +${d}`, 'A display that joins others scores for the whole unbroken line.'],
  goal: ['Fill a row to open the Fair', 'The month someone fills a row, the game ends. Most points wins.'],
  bye: ['Over to you', 'The rest of the game is yours. Beat the Commissioner!'],
  next: 'Next',
  go: 'Play on',
  skip: 'Skip the tutorial',
};

// A Victorian printer's pointing hand, the manicule: the bill-poster's own way
// of saying "here". Drawn pointing right; the fingertip is at (91, 19.5).
const HAND_SVG = `<svg viewBox="0 0 96 52" aria-hidden="true"><g fill="#FFFCF4" stroke="#2B2620" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  <path d="M3,8 L16,8 L16,46 L3,46 Z"/><path d="M7,8 V46 M11.5,8 V46" fill="none" stroke-width="1.2"/>
  <path d="M38,27 H55 C60,27 60,35 55,35 H38 Z"/><path d="M37,34 H53 C58,34 58,41.5 53,41.5 H37 Z"/><path d="M35,40.5 H49 C53.5,40.5 53.5,47 49,47 H35 Z"/>
  <path d="M16,10 C24,8 32,10 40,14 L40,44 C32,48 24,48 16,46 Z"/>
  <path d="M36,14 H86 C93,14 93,25 86,25 H40 Z"/><path d="M82,16.5 C85.5,17.5 85.5,21.5 82,22.5" fill="none" stroke-width="1.2"/>
  <path d="M26,24 C34,22 44,22 52,24.5 C56,25.6 55.5,30 51.5,30 C44,30 36,29.5 30,30"/>
</g></svg>`;

function startLesson() {
  endCoach();
  coach = makeCoach();
  startGame({
    players: 2,
    names: [whoAmI().name, BOT_NAME],
    bot: true,
    clockMs: 0,
    seed: LESSON.seed,
    lesson: true,
  });
}

function endCoach() {
  if (!coach) return;
  const c = coach;
  coach = null;
  c.end();
}

// The coach: a script of beats keyed to the game's own events (coachOn). A beat
// is a line, an optional spotlight, and one of three holds: a tap (only the
// spotlit thing answers, and the hand points at it), a Next (the game waits),
// or nothing (the board is yours).
function makeCoach() {
  const L = LESSON_LINES;
  const root = document.createElement('div');
  root.id = 'coach';
  root.innerHTML = `
    <svg class="coach-dim" aria-hidden="true">
      <defs><mask id="coach-mask"><rect width="100%" height="100%" fill="#fff"/><g class="coach-holes"></g></mask></defs>
      <rect class="coach-shade" width="100%" height="100%" mask="url(#coach-mask)"/>
      <g class="coach-rings"></g>
    </svg>
    <div class="coach-hand"><div class="coach-poke">${HAND_SVG}</div></div>
    <div class="coach-card" role="status" aria-live="polite">
      <p class="coach-kicker">${esc(L.kicker)}</p>
      <div class="coach-art"></div>
      <p class="coach-line"></p>
      <p class="coach-sub"></p>
      <p class="coach-dots"></p>
      <div class="coach-actions">
        <button type="button" class="coach-next"></button>
        <button type="button" class="coach-skip">${esc(L.skip)}</button>
      </div>
    </div>`;
  document.body.appendChild(root);
  const holes = $('.coach-holes', root);
  const rings = $('.coach-rings', root);
  const hand = $('.coach-hand', root);
  const card = $('.coach-card', root);
  const nextBtn = $('.coach-next', root);

  const mine = (q) => $(`.board[data-seat="0"] ${q}`);
  // On a phone your board folds away while the Commissioner plays; a beat
  // about it opens it first. Never mid-theatre (a redraw then would undo the
  // displays the sweep has already put up), except on the month's last move,
  // just before the sweep begins, when the board on screen is still G.view.
  function openMine(beforeSweep = false) {
    if ((animating && !beforeSweep) || !$('.board[data-seat="0"]')?.classList.contains('collapsed')) return;
    G.expand[0] = true;
    renderBoards(G.view);
    applySelection();
  }
  // If the engine or the bot ever stops dealing this lesson, the coach gives
  // plain hints rather than point at tiles that aren't there.
  let stage = lessonHolds() ? 'hire1' : 'free'; // the script's place
  const seen = new Set();
  let step = null; // the beat showing: {key, spot, aim, tap, hold}
  let release = null; // resumes the game a Next beat is holding
  let raf = 0;
  let scrolled = false;
  const last = new Map();

  function say(lines) {
    $('.coach-line', card).textContent = lines[0];
    $('.coach-sub', card).textContent = lines[1] || '';
  }

  // spot: what to light; aim: what the hand points at and a tap may land on
  // (the spot, unless said otherwise).
  // dim: darken the board even with nothing lit; page: [i, n] for the opening's
  // cards, which are larger, centred when nothing is lit, and may carry art.
  function show(key, { spot = null, aim = null, tap = false, next = false, lines = L[key], dim = false, page = null, art = '' } = {}) {
    if (release) release();
    release = null;
    step = { key, spot, aim: aim || spot, tap, dim, page, hold: tap ? 'tap' : next ? 'next' : 'free' };
    say(lines);
    card.classList.toggle('intro', !!page);
    $('.coach-art', card).innerHTML = art;
    $('.coach-dots', card).innerHTML = page ? [...Array(page[1])].map((_, i) => `<i class="${i === page[0] ? 'on' : ''}"></i>`).join('') : '';
    nextBtn.hidden = !next;
    if (next) nextBtn.textContent = next === true ? L.next : next;
    skipBtn.hidden = key === 'bye';
    root.dataset.hold = step.hold;
    root.classList.add('on');
    card.classList.remove('pop');
    void card.offsetWidth;
    card.classList.add('pop');
    scrolled = false;
    if (!raf) raf = requestAnimationFrame(track);
    if (!next) return Promise.resolve();
    nextBtn.focus({ preventScroll: true });
    return new Promise((r) => (release = r));
  }

  function hide() {
    step = null;
    root.classList.remove('on');
  }

  nextBtn.addEventListener('click', () => {
    const r = release;
    release = null;
    hide();
    r?.();
  });
  const skipBtn = $('.coach-skip', root);
  skipBtn.addEventListener('click', endCoach);

  // Follow the spotlit things every frame: the board re-renders under the coach
  // (and scrolls on a phone), so a beat holds a query, never an element. Each
  // thing gets its own hole in the dim, so "these two" lights two tiles and
  // not the agency around them.
  function px(el, prop, v) {
    const k = prop + (el === hand ? 'a' : 'c');
    if (last.get(k) === v) return;
    last.set(k, v);
    el.style.setProperty(prop, v);
  }
  const overlaps = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  function track() {
    raf = 0;
    if (!step) return;
    const pad = 6;
    const els = (step.spot ? step.spot() : []).filter(Boolean);
    const rs = [];
    for (const e of els) {
      const b = e.getBoundingClientRect();
      if (b.width && b.height) rs.push({ l: b.left - pad, t: b.top - pad, r: b.right + pad, b: b.bottom + pad, e });
    }
    const vw = document.documentElement.clientWidth;
    const vh = innerHeight;
    const top = ($('#topbar')?.getBoundingClientRect().bottom || 0) + 8;
    const u = rs.length
      ? { l: Math.min(...rs.map((r) => r.l)), t: Math.min(...rs.map((r) => r.t)), r: Math.max(...rs.map((r) => r.r)), b: Math.max(...rs.map((r) => r.b)) }
      : null;
    if (u && !scrolled && (u.t < top || u.b > vh)) {
      scrolled = true;
      rs[0].e.scrollIntoView({ block: 'center', behavior: instant() ? 'auto' : 'smooth' });
    }
    root.classList.toggle('lit', !!u || step.dim);
    const key = rs.map((r) => [r.l, r.t, r.r, r.b].map(Math.round).join(',')).join(';');
    if (last.get('holes') !== key) {
      last.set('holes', key);
      const box = (r, k = 0) =>
        `x="${(r.l - k).toFixed(1)}" y="${(r.t - k).toFixed(1)}" width="${(r.r - r.l + 2 * k).toFixed(1)}" height="${(r.b - r.t + 2 * k).toFixed(1)}" rx="${10 + k}"`;
      holes.innerHTML = rs.map((r) => `<rect ${box(r)} fill="#000"/>`).join('');
      rings.innerHTML = rs.map((r) => `<rect class="glow" ${box(r, 1.5)}/><rect class="ring" ${box(r, 1.5)}/>`).join('');
    }
    // The hand points up from below at the lowest of the things to tap (so it
    // covers as little as it can), and turns to point the other way near the
    // right edge.
    const targets = step.aim === step.spot ? rs : step.aim().filter(Boolean).map((e) => {
      const b = e.getBoundingClientRect();
      return { l: b.left - pad, t: b.top - pad, r: b.right + pad, b: b.bottom + pad, e };
    }).filter((r) => r.r - r.l > 2 * pad);
    const handOn = !!(u && step.tap && targets.length);
    root.classList.toggle('handed', handOn);
    const hs = vw < 600 ? 0.62 : 0.8;
    let hb = null;
    if (handOn) {
      const aim = targets.reduce((a, r) => (r.b > a.b + 1 || (Math.abs(r.b - a.b) <= 1 && r.l < a.l) ? r : a));
      const tx = (aim.l + aim.r) / 2;
      const ty = (aim.t + aim.b) / 2 + (aim.b - aim.t) * 0.16;
      const flip = tx > vw - 110 * hs;
      px(hand, '--hs', String(hs));
      px(hand, 'transform', `translate(${(tx - 91 * hs).toFixed(1)}px, ${(ty - 19.5 * hs).toFixed(1)}px) ${flip ? 'rotate(-45deg)' : 'scaleX(-1) rotate(-45deg)'}`);
      const h = hand.getBoundingClientRect();
      hb = { l: h.left, t: h.top, r: h.right, b: h.bottom };
    }
    // The card waits at the foot of the screen, the way a game puts its
    // subtitles, unless that would cover what it is talking about: then just
    // below that, or just above it, or at the top.
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const m = 12;
    const cx = Math.min(Math.max(u ? (u.l + u.r) / 2 - cw / 2 : (vw - cw) / 2, m), vw - cw - m);
    const tries = [
      ...(step.page && !u ? [[(vw - cw) / 2, Math.max(top, (vh - ch) / 2)]] : []),
      [(vw - cw) / 2, vh - ch - 16],
      [cx, u ? (hb ? Math.max(u.b, hb.b) : u.b) + 12 : 0],
      [cx, u ? (hb ? Math.min(u.t, hb.t) : u.t) - 12 - ch : 0],
      [(vw - cw) / 2, top],
    ];
    let at = tries[0];
    for (const [x, y] of tries) {
      if (y < top - 8 || y + ch > vh - 4) continue;
      const c = { l: x, t: y, r: x + cw, b: y + ch };
      if (rs.some((r) => overlaps(c, r)) || (hb && overlaps(c, hb))) continue;
      at = [x, y];
      break;
    }
    px(card, 'transform', `translate(${Math.round(Math.min(Math.max(at[0], m), vw - cw - m))}px, ${Math.round(at[1])}px)`);
    raf = requestAnimationFrame(track);
  }

  // A tap anywhere but the spotlit thing, while the coach is holding for it,
  // does nothing but remind you where to look. The coach's own buttons, the
  // top bar (End) and the end-of-game dialog always answer.
  function guard(e) {
    if (!step || step.hold === 'free') return;
    if (e.target.closest('#coach .coach-card, #topbar, dialog')) return;
    if (step.hold === 'tap' && (step.aim ? step.aim() : []).some((el) => el && el.contains(e.target))) return;
    e.stopPropagation();
    e.preventDefault();
    card.classList.remove('nudge');
    void card.offsetWidth;
    card.classList.add('nudge');
  }
  window.addEventListener('click', guard, true);

  const lessonTiles = (src, kind) => () =>
    $$(`.tile[data-kind="${kind}"]`, src === 'pool' ? $('#pool') : $(`.source[data-source="${src}"]`));
  const crew = (row) => () => [mine(`.crew[data-row="${row}"]`)];
  const picked = (src, kind) =>
    !!sel &&
    sel.kind === kind &&
    (src === 'pool' ? sel.source.type === 'pool' : sel.source.type === 'source' && sel.source.index === src);

  function turn() {
    if (stage === 'hire1') return show('hire', { spot: lessonTiles(LESSON.first.source, LESSON.first.kind), tap: true });
    if (stage === 'hire2') {
      const tile = lessonTiles('pool', LESSON.second.kind);
      return show('hire2', { spot: () => [...tile(), $('#fm-token')], aim: tile, tap: true });
    }
    if (stage === 'free') {
      stage = 'freeSel';
      return show('free');
    }
    hide();
  }

  async function settled({ before, interim, final, move, resolved }) {
    const st = final || G.cur;
    const moved = move ? before.seatToMove : null;
    if (moved === 0 && stage === 'moved1') {
      await show('gate', { spot: () => [$('#pool-wrap')], next: true });
      if (!coach) return;
      stage = 'rival';
    } else if (moved === 0 && stage === 'moved2') {
      openMine();
      await show('token', { spot: () => [mine('.idle')], next: true });
      if (!coach) return;
      stage = 'free';
    } else if (moved === 0 && !resolved && !seen.has('idle')) {
      const hands = (b) => b.floor.filter((x) => x !== E.FIRST_TOKEN).length;
      if (hands(interim.boards[0]) > hands(before.boards[0])) {
        seen.add('idle');
        openMine();
        await show('idle', { spot: () => [mine('.idle')], next: true });
        if (!coach) return;
      }
    }
    if (resolved) {
      // A new month: the goal, then the game is theirs.
      const wall = st.boards[0].wall;
      let row = 0;
      for (let r = 1; r < 5; r++) if (wall[r].reduce((a, b) => a + b, 0) > wall[row].reduce((a, b) => a + b, 0)) row = r;
      openMine();
      await show('goal', { spot: () => [$$('.board[data-seat="0"] .wrow')[row]], next: true });
      if (!coach) return;
      await show('bye', { next: L.go });
      endCoach();
      return;
    }
    if (st.seatToMove !== 0) {
      if (stage === 'rival') {
        stage = 'hire2';
        return show('rival', { spot: () => [$('.board[data-seat="1"]')] });
      }
      return hide();
    }
    return turn();
  }

  function select() {
    if (stage === 'hire1' || stage === 'place1') {
      const ok = picked(LESSON.first.source, LESSON.first.kind);
      stage = ok ? 'place1' : 'hire1';
      return ok ? show('place', { spot: crew(LESSON.first.row), tap: true }) : turn();
    }
    if (stage === 'hire2' || stage === 'place2') {
      const ok = picked('pool', LESSON.second.kind);
      stage = ok ? 'place2' : 'hire2';
      return ok ? show('place2', { spot: crew(LESSON.second.row), tap: true }) : turn();
    }
    if (stage === 'freeSel') return sel ? show('freePlace', { spot: () => $$('.board[data-seat="0"] .can-drop') }) : show('free');
  }

  function moved({ seat }) {
    if (seat !== 0) {
      if (step?.key !== 'rival') hide();
      return;
    }
    if (stage === 'place1') stage = 'moved1';
    else if (stage === 'place2') stage = 'moved2';
    else if (stage === 'freeSel') stage = 'month';
    hide();
  }

  // The opening: the story and the stakes, a card at a time, with the board
  // behind them lighting what each one is about; the agencies are still empty,
  // and fill in front of the player straight after.
  async function intro() {
    const tiles = L.disciplines.map((d, k) => `<span class="coach-disc">${tileHTML(k)}<b>${esc(d)}</b></span>`).join('');
    const spots = [null, () => [mine('.wall')], () => [$('#sources')], () => [$$('.board[data-seat="0"] .wrow')[0]]];
    const n = L.intro.length;
    for (let i = 0; i < n; i++) {
      await show('intro', {
        lines: L.intro[i],
        spot: spots[i] || null,
        dim: true,
        page: [i, n],
        art: i === 0 ? tiles : '',
        next: i === n - 1 ? L.letsPlay : true,
      });
      if (!coach) return;
    }
  }

  async function resolving() {
    if (seen.has('build')) return;
    seen.add('build');
    const full = () =>
      $$('.board[data-seat="0"] .crew').filter((el) => {
        const r = Number(el.dataset.row);
        return G.view.boards[0].lines[r].count === r + 1;
      });
    openMine(true);
    if (!full().length) return;
    await show('build', { spot: full, next: true });
  }

  async function display({ seat, r, c, d }) {
    if (seat !== 0) return;
    const cell = () => [mine(`.wcell[data-rc="${r}-${c}"]`)];
    if (!seen.has('first')) {
      seen.add('first');
      await show('first', { spot: cell, next: true });
    } else if (d >= 2 && !seen.has('joined')) {
      seen.add('joined');
      await show('joined', { spot: cell, next: true, lines: L.joined(d) });
    }
  }

  return {
    on(ev, d) {
      if (ev === 'intro') return intro();
      if (ev === 'settled') return settled(d);
      if (ev === 'select') return Promise.resolve(select());
      if (ev === 'move') return Promise.resolve(moved(d));
      if (ev === 'resolve') return resolving();
      if (ev === 'display') return display(d);
      return Promise.resolve();
    },
    end() {
      cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener('click', guard, true);
      root.remove();
      const r = release;
      release = null;
      step = null;
      r?.();
    },
  };
}

$('#btn-learn')?.addEventListener('click', startLesson);

applySetupMode();
loadRoster();
if (START_CLOCK !== null && $(`#clock-select option[value="${CSS.escape(START_CLOCK)}"]`)) {
  $('#clock-select').value = START_CLOCK;
}
if (JOIN && RELAY_URL) {
  setupMode = 'online';
  setupJoin = true;
  $$('#mode-seg .seg-btn').forEach((b) => b.classList.toggle('on', b.dataset.mode === 'online'));
  $$('#online-seg .seg-btn').forEach((b) => b.classList.toggle('on', b.dataset.online === 'join'));
  applySetupMode();
  $('#code-input').value = JOIN;
}

// The invite (3 Oct 2026; the button is the Fair's): one link that opens the
// join screen with this room's code in, keeping the link's own names and clock,
// so nobody has to type a code. On a phone it goes to the share sheet.
const INVITE_TEXT = 'Join my game of Pavilion';
function inviteLink() {
  const p = new URLSearchParams();
  for (const k of ['plain', 'names', 'clock']) if (params.has(k)) p.set(k, params.get(k));
  p.set('join', net?.code || '');
  // A bare `fair`, and commas left as commas, so the link reads cleanly in a message.
  return location.origin + location.pathname + '?' + p.toString().replace(/=(?=&|$)/g, '').replace(/%2C/gi, ',');
}
$('#btn-invite')?.addEventListener('click', async () => {
  const url = inviteLink();
  const note = $('#invite-note');
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: 'Pavilion', text: INVITE_TEXT, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    note.textContent = 'Link copied. Paste it into a message to whoever is playing.';
  } catch (err) {
    if (err && err.name === 'AbortError') return; // the share sheet, closed
    note.textContent = url; // no clipboard here: the link, to copy by hand
  }
});

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
      expect($('#setup-submit').textContent.includes('competition'), 'the host button starts the competition');
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
      expect($('#clock-select').value === '0', 'practice drops the clock');
      expect($('#mode-hint').textContent.includes('rehearsal'), 'hint pitches the rehearsal');
      $('#name-inputs input').value = 'Ryan';
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

      // Identity (build step 5). test/online.test.js sets a term and a roster
      // on the relay first, so this exercises the picker rather than the text
      // box — the class's path, not the passer-by's.
      await until(() => session, 'the roster to arrive');
      expect($$('#name-inputs input').length === 0, 'a roster replaces the name box');
      const mine = $$('#name-inputs .roster-btn').find((b) => b.textContent === 'Sam');
      expect(!!mine, 'the class is listed by name');
      $('#setup-form').requestSubmit();
      expect(!net, 'submitting without picking a name starts nothing');
      expect($('#name-field').classList.contains('needed'), 'and says which field is wanted');
      mine.click();
      expect(!!me && me.id === 'sam', 'clicking your name is the whole of signing in');
      expect($('.whoami') !== null, 'and the device says welcome back from then on');
      $('#clock-select').value = '0';
      $('#setup-form').requestSubmit();

      await until(() => net && net.code, 'the room code');
      expect(!$('#lobby').classList.contains('hidden'), 'the lobby shows');
      expect($('#lobby-code').textContent === net.code, 'the lobby shows the room code');
      expect(net.host === true, 'the opener is the host');

      // --- the opponent joins ---------------------------------------------
      opp.connect({ code: net.code, hello: { name: 'Alex', pid: 'alex', device: 'phone' } });
      await until(() => netRoom?.seats?.length === 2, 'the second seat');
      expect($$('#lobby-seats li').length === 2, 'both seats are listed');
      expect($('#lobby-seats .you') !== null, 'your own seat is marked');

      // --- the pre-game splash (build step 6) ------------------------------
      // Two rostered players in a room is the whole trigger; with an empty
      // archive behind it the card says "first meeting", which is a real
      // answer and not an empty state (PAVILION.md, The stats screens).
      await until(() => !$('#tape').classList.contains('hidden'), 'the pre-game splash');
      expect($('#tape .tape-kicker').textContent.includes('First meeting'), 'week 1 reads as a first meeting');
      expect($$('#tape .tape-col').length === 2, 'both players are on the card');
      expect($('#tape').textContent.includes('Sam') && $('#tape').textContent.includes('Alex'), 'by name');
      expect(!/\b1st\b|\b2nd\b/.test($('#tape').textContent), 'and no league position on the splash');

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

      // --- and the result recorded itself ----------------------------------
      // No submit button anywhere: the server replayed the move list, derived
      // the winner, and said so (PAVILION.md, Identity, results, data).
      await until(() => G.recorded, 'the archive receipt');
      expect(G.recorded.recorded === true, 'the game recorded itself');
      expect(G.recorded.mode === 'league', 'as a league game');
      expect(
        JSON.stringify(G.recorded.result.scores) === JSON.stringify(G.cur.result.scores),
        'and the server derived the same scores by replaying'
      );
      expect($('#end-record').textContent.includes('league'), 'the modal says so');

      // --- the post-game screen (build step 6) -----------------------------
      // The receipt is the trigger, so by here it has already landed. The
      // first game of a season moves both players onto an empty table.
      expect(!$('#end-after').classList.contains('hidden'), 'the post-game screen filled in');
      expect($('#end-after .series').textContent === 'Their first meeting.', 'the series starts here');
      expect($$('#end-after .moves li').length === 2, 'both players moved');
      expect(
        $('#end-after .moves').textContent.includes('on the board in 1st'),
        'and the winner is on the board in 1st'
      );

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

      // --- and the second game knows about the first ------------------------
      // A rematch never passes the lobby again, so this is the check that the
      // screens carry their own history forward rather than showing a stale
      // series after every game but the first.
      await until(() => G.recorded, 'the second receipt');
      await until(() => !$('#end-after').classList.contains('hidden'), 'the second post-game screen');
      const series = $('#end-after .series').textContent;
      expect(series !== 'Their first meeting.', 'the second meeting is not the first');
      expect(series.includes('series'), `the series line reads a series (${series})`);
      expect($$('#end-after .moves li').length === 2, 'both players moved again');
      expect(
        !$('#end-after .moves').textContent.includes('on the board'),
        'and nobody arrives on the table twice'
      );

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

// ?opening&finale is the look link for the end of the game: two greedy hands
// play a whole game in an instant (seed 'opening-night', which the first seat
// wins 46–43; &seed= for another), and the last move plays out at full speed,
// so the month's close, the judges' round and opening night can be seen without
// playing a game first. ?names= names the seats, &players=3 or 4 seats more.
if (OPENING && smokeParams.has('finale') && !smokeParams.has('smoke')) {
  (async () => {
    if (document.readyState !== 'complete') await new Promise((r) => addEventListener('load', r, { once: true }));
    window.__instant = true;
    const players = Math.min(4, Math.max(2, Number(smokeParams.get('players')) || 2));
    startGame({
      players,
      names: FAMILY.length >= players ? FAMILY.slice(0, players) : players === 2 ? ['You', BOT_NAME] : ['You', 'Alex', 'Sam', 'Jordan'].slice(0, players),
      bot: false,
      clockMs: 0,
      seed: smokeParams.get('seed') || 'opening-night',
    });
    while (G && !G.cur.over) {
      const m = greedyMove(G.cur);
      if (E.apply(G.cur, m).over) window.__instant = false;
      sel = { source: m.source, kind: m.kind };
      await submitMove(m.dest);
    }
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
