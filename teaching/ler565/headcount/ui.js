// Headcount — board UI and hot-seat play (build step 2).
//
// Three rules from the memo govern this file:
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

const BOT_NAME = 'The Consultant';
const BOT_SEAT = 1; // practice games are always you (seat 0) vs the bot

const FN = E.FUNCTION_NAMES;
const ICONS = ['ic-eng', 'ic-sal', 'ic-ops', 'ic-fin', 'ic-ana'];
const AGENCY_NAMES = [
  'Halcyon', 'Meridian', 'Vantage', 'Beacon', 'Summit',
  'Crestline', 'Northstar', 'Pinnacle', 'Cornerstone',
];
const SEED_A = [
  'SYNERGY', 'PIVOT', 'LEVERAGE', 'CASCADE', 'QUANTUM', 'VERTICAL',
  'AGILE', 'HOLISTIC', 'DYNAMIC', 'STRATEGIC', 'ROBUST', 'SCALABLE',
];
const SEED_B = [
  'BISON', 'MERLOT', 'FALCON', 'WALNUT', 'GLACIER', 'MARMOT',
  'JUNIPER', 'BOBCAT', 'SEQUOIA', 'PELICAN', 'GRANITE', 'OTTER',
];

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
const instant = () => REDUCED.matches || window.__instant === true;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const beat = (ms) => (instant() ? Promise.resolve() : sleep(ms));
const snap = (s) => JSON.parse(JSON.stringify(s));

let G = null; // the running game
let sel = null; // {source, fn} — first tap of the two-tap
let animating = false;

// ---------------------------------------------------------------------------
// Markup helpers.

function tileHTML(fn) {
  return `<div class="tile f${fn}"><svg class="ic" aria-hidden="true"><use href="#${ICONS[fn]}"/></svg></div>`;
}
function tokenHTML() {
  return `<div class="token" title="First Mover token"><svg class="ic" aria-hidden="true"><use href="#ic-first"/></svg></div>`;
}

function sameSource(a, b) {
  return a.type === b.type && (a.type !== 'agency' || a.index === b.index);
}

// ---------------------------------------------------------------------------
// Rendering. Everything rebuilds from a state snapshot; during theatre the
// snapshot lags G.cur deliberately.

function renderAll(st = G.view) {
  $('#q-badge').textContent = 'Q' + st.round;
  $('#bag-count').textContent = st.bag.length;
  $('#lid-count').textContent = st.lid.reduce((a, b) => a + b, 0);
  const turn = $('#turn-label');
  if (st.over) {
    turn.textContent = 'Full time';
    setPhase('Full time');
  } else {
    turn.innerHTML = `<b>${esc(G.names[st.seatToMove])}</b> is hiring`;
  }
  renderAgencies(st);
  renderCentre(st);
  renderBoards(st);
  applySelection(st);
}

function renderAgencies(st) {
  const wrap = $('#agencies');
  wrap.innerHTML = '';
  st.agencies.forEach((counts, i) => {
    const total = counts.reduce((a, b) => a + b, 0);
    const a = document.createElement('div');
    a.className = 'agency' + (total === 0 ? ' empty' : '');
    a.dataset.agency = i;
    const slots = [];
    for (let fn = 0; fn < 5; fn++) {
      for (let k = 0; k < counts[fn]; k++) {
        slots.push(
          `<button class="tile f${fn}" data-fn="${fn}"
             aria-label="Take ${counts[fn]} ${FN[fn]} from ${AGENCY_NAMES[i]}">
             <svg class="ic" aria-hidden="true"><use href="#${ICONS[fn]}"/></svg>
           </button>`
        );
      }
    }
    a.innerHTML = `<div class="agency-name">${AGENCY_NAMES[i]}</div>
                   <div class="slots">${slots.join('')}</div>`;
    wrap.appendChild(a);
  });
}

function renderCentre(st) {
  const c = $('#centre');
  c.innerHTML = '';
  if (st.firstMoverInCentre) {
    const t = document.createElement('div');
    t.innerHTML = tokenHTML();
    t.firstChild.id = 'fm-token';
    c.appendChild(t.firstChild);
  }
  let any = false;
  for (let fn = 0; fn < 5; fn++) {
    for (let k = 0; k < st.centre[fn]; k++) {
      any = true;
      const b = document.createElement('button');
      b.className = `tile f${fn}`;
      b.dataset.fn = fn;
      b.setAttribute(
        'aria-label',
        `Take ${st.centre[fn]} ${FN[fn]} from the open market` +
          (st.firstMoverInCentre ? ' (comes with the First Mover token)' : '')
      );
      b.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#${ICONS[fn]}"/></svg>`;
      c.appendChild(b);
    }
  }
  if (!any && !st.firstMoverInCentre) {
    c.innerHTML = '<span class="none">empty — leftovers land here</span>';
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

    const teams = [];
    for (let r = 0; r < 5; r++) {
      const cap = r + 1;
      const t = b.teams[r];
      const cells = [];
      for (let i = 0; i < cap; i++) {
        const occ = i >= cap - t.count;
        cells.push(`<span class="tcell${occ ? ' occ' : ''}">${occ ? tileHTML(t.fn) : ''}</span>`);
      }
      const label = t.count
        ? `Team row ${cap}: ${t.count} of ${cap} ${FN[t.fn]}`
        : `Team row ${cap}: empty`;
      teams.push(
        `<button class="trow" data-row="${r}" aria-label="${label}">${cells.join('')}</button>`
      );
    }

    const wall = [];
    for (let r = 0; r < 5; r++) {
      const cells = [];
      for (let c = 0; c < 5; c++) {
        const fn = (c - r + 5) % 5; // inverse of wallColumn
        const filled = b.wall[r][c] === 1;
        cells.push(
          `<span class="wcell g${fn}${filled ? ' filled' : ''}" data-rc="${r}-${c}">` +
            (filled
              ? tileHTML(fn)
              : `<svg class="ghost" aria-hidden="true"><use href="#${ICONS[fn]}"/></svg>`) +
            `</span>`
        );
      }
      wall.push(`<div class="wrow">${cells.join('')}</div>`);
    }

    const bcells = [];
    for (let i = 0; i < E.BENCH_SIZE; i++) {
      const entry = b.bench[i];
      const inner =
        entry === undefined ? '' : entry === E.FIRST_MOVER ? tokenHTML() : tileHTML(entry);
      bcells.push(
        `<span class="bcell"><span class="bslot">${inner}</span><span class="pen">−${E.BENCH_PENALTIES[i]}</span></span>`
      );
    }

    el.innerHTML = `
      <div class="board-head">
        <span class="board-name">${esc(G.names[seat])}</span>
        ${b.firstMover ? '<svg class="board-fm" title="First Mover next quarter"><use href="#ic-first"/></svg>' : ''}
        <span class="expand-hint">tap to expand</span>
        <span class="board-spacer"></span>
        <span class="clock" data-seat="${seat}"></span>
        <span class="score" data-seat="${seat}">${b.score}</span>
      </div>
      <div class="play-area">
        <div class="teams">${teams.join('')}</div>
        <div class="wall">${wall.join('')}</div>
        <div class="bench-wrap">
          <button class="bench" aria-label="The bench: ${b.bench.length} of 7 occupied">${bcells.join('')}</button>
        </div>
      </div>`;
    wrap.appendChild(el);
  });
  renderClocks();
}

function applySelection() {
  $$('.tile.sel, .tile.dim').forEach((t) => t.classList.remove('sel', 'dim'));
  $$('.trow.can-drop, .bench.can-drop').forEach((t) => t.classList.remove('can-drop'));
  if (!sel || !G || G.cur.over) return;

  const srcEl =
    sel.source.type === 'agency'
      ? $(`.agency[data-agency="${sel.source.index}"]`)
      : $('#centre');
  if (srcEl) {
    $$('.tile', srcEl).forEach((t) => {
      t.classList.add(Number(t.dataset.fn) === sel.fn ? 'sel' : 'dim');
    });
  }

  const dests = E.legalMoves(G.cur).filter(
    (m) => sameSource(m.source, sel.source) && m.fn === sel.fn
  );
  const boardEl = $(`.board[data-seat="${G.cur.seatToMove}"]`);
  if (!boardEl) return;
  for (const m of dests) {
    if (m.dest.type === 'team') {
      const row = $(`.trow[data-row="${m.dest.row}"]`, boardEl);
      row.classList.add('can-drop');
      row.setAttribute('aria-label', row.getAttribute('aria-label') + ' — legal destination');
    } else {
      const bench = $('.bench', boardEl);
      bench.classList.add('can-drop');
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
  if (instant()) return Promise.resolve();
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
    { duration: dur, delay, easing: 'cubic-bezier(.25,.8,.25,1)', fill: 'both' }
  );
  return anim.finished.then(() => el.remove()).catch(() => el.remove());
}

function popup(text, rect, cls = '') {
  if (instant()) return;
  const el = document.createElement('div');
  el.className = 'popup ' + cls;
  el.textContent = text;
  el.style.left = rect.left + rect.width / 2 - 12 + 'px';
  el.style.top = rect.top - 8 + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
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
  bannerTimer = setTimeout(() => el.classList.remove('show'), 1600);
  return sleep(650);
}

function tickChip(id, delta) {
  const el = $(id);
  el.textContent = Number(el.textContent) + delta;
}

// The Phase A beat: taken tiles fly to their destination, leftovers spill
// into the open market, the token flips onto the bench.
async function animatePhaseA(before, interim, move) {
  const mover = before.seatToMove;
  const takenFn = move.fn;

  // Capture source rects before re-rendering.
  const srcEl =
    move.source.type === 'agency'
      ? $(`.agency[data-agency="${move.source.index}"]`)
      : $('#centre');
  const takenRects = $$(`.tile[data-fn="${takenFn}"]`, srcEl).map((t) =>
    t.getBoundingClientRect()
  );
  const leftoverRects = {};
  if (move.source.type === 'agency') {
    for (let fn = 0; fn < 5; fn++) {
      if (fn === takenFn) continue;
      const els = $$(`.tile[data-fn="${fn}"]`, srcEl);
      if (els.length) leftoverRects[fn] = els.map((t) => t.getBoundingClientRect());
    }
  }
  const tokenEl = move.source.type === 'centre' ? $('#fm-token') : null;
  const tokenRect = tokenEl ? tokenEl.getBoundingClientRect() : null;

  // Show the interim state with arrivals hidden, then fly into them.
  G.view = snap(interim);
  renderAll();
  setPhase('Hiring');

  const boardEl = $(`.board[data-seat="${mover}"]`);
  const iBoard = interim.boards[mover];
  const bBoard = before.boards[mover];
  const flights = [];
  let flightNo = 0;
  const stag = () => ({ delay: flightNo++ * 45 });

  // Team-row arrivals: rows fill right to left, so new tiles are the
  // leftmost of the occupied block.
  const arrivals = [];
  if (move.dest.type === 'team') {
    const r = move.dest.row;
    const cap = r + 1;
    const cells = $$(`.trow[data-row="${r}"] .tcell`, boardEl);
    for (let i = cap - iBoard.teams[r].count; i < cap - bBoard.teams[r].count; i++) {
      arrivals.push({ el: cells[i], html: tileHTML(takenFn) });
    }
  }
  // Bench arrivals (overflow, voluntary dumps, and the token).
  const bcells = $$('.bcell .bslot', boardEl);
  for (let i = bBoard.bench.length; i < iBoard.bench.length; i++) {
    const entry = iBoard.bench[i];
    arrivals.push({
      el: bcells[i],
      html: entry === E.FIRST_MOVER ? tokenHTML() : tileHTML(takenFn),
      thud: true,
      token: entry === E.FIRST_MOVER,
    });
  }
  // Token set aside on a full bench: it still flips to the mover.
  if (tokenRect && !arrivals.some((a) => a.token) && iBoard.firstMover) {
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

  // Leftovers spill and scatter into the open market.
  for (const [fn, rects] of Object.entries(leftoverRects)) {
    const targets = $$(`#centre .tile[data-fn="${fn}"]`);
    const delta = interim.centre[fn] - before.centre[fn];
    const newOnes = targets.slice(targets.length - delta);
    newOnes.forEach((t, k) => {
      t.classList.add('pre');
      flights.push(fly(rects[k] || rects[0], t.getBoundingClientRect(), tileHTML(Number(fn)), stag()));
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

// The closing-the-books beat: completed teams' lead tiles glide onto the org
// chart row by row while the score ticks, the bench takes its toll, then
// either the final whistle or the next quarter's deal.
async function animateResolution(interim, final) {
  setPhase('Closing the books');
  await banner(`Q${interim.round} · <span class="r">closing the books</span>`);

  for (let seat = 0; seat < interim.players; seat++) {
    const boardEl = $(`.board[data-seat="${seat}"]`);
    const b = interim.boards[seat];
    const wallCopy = b.wall.map((r) => r.slice());
    let score = b.score;

    for (let r = 0; r < 5; r++) {
      const t = b.teams[r];
      if (t.count !== r + 1) continue;
      const c = E.wallColumn(t.fn, r);
      const rowEl = $(`.trow[data-row="${r}"]`, boardEl);
      const cells = $$('.tcell', rowEl);
      const lead = cells[cells.length - 1];
      const target = $(`.wcell[data-rc="${r}-${c}"]`, boardEl);

      await fly(lead.getBoundingClientRect(), target.getBoundingClientRect(), tileHTML(t.fn), {
        dur: 380,
      });
      target.innerHTML = tileHTML(t.fn);
      target.classList.add('filled', 'landed');

      wallCopy[r][c] = 1;
      const d = E.scorePlacement(wallCopy, r, c);
      score += d;
      popup('+' + d, target.getBoundingClientRect(), 'pos');
      setScore(seat, score);

      // Surplus tiles clear to the lid.
      const surplus = r; // capacity r+1, one placed
      if (surplus > 0 && !instant()) {
        const lidRect = $('#lid-chip').getBoundingClientRect();
        cells.slice(0, -1).forEach((cell, k) => {
          if (cell.classList.contains('occ')) {
            fly(cell.getBoundingClientRect(), lidRect, tileHTML(t.fn), {
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
      tickChip('#lid-count', surplus);
      await beat(140);
    }

    // Bench penalties — the overstaffing bill.
    if (b.bench.length > 0) {
      const benchEl = $('.bench', boardEl);
      let pen = 0;
      for (let i = 0; i < b.bench.length; i++) pen += E.BENCH_PENALTIES[i];
      popup('−' + pen, benchEl.getBoundingClientRect(), 'neg');
      score = Math.max(0, score - pen);
      setScore(seat, score);
      if (!instant()) {
        const lidRect = $('#lid-chip').getBoundingClientRect();
        $$('.bcell .bslot', benchEl).forEach((slot, i) => {
          const inner = slot.firstElementChild;
          if (!inner) return;
          if (!inner.classList.contains('token')) {
            fly(slot.getBoundingClientRect(), lidRect, tileHTML(b.bench[i]), {
              dur: 380,
              delay: i * 40,
              lift: 8,
            });
          }
          slot.innerHTML = '';
        });
      }
      tickChip('#lid-count', b.bench.filter((e) => e !== E.FIRST_MOVER).length);
      await beat(200);
    }
  }

  if (final.over) {
    // Game-ending rows sweep across, then the whistle.
    for (let seat = 0; seat < final.players; seat++) {
      const boardEl = $(`.board[data-seat="${seat}"]`);
      for (let r = 0; r < 5; r++) {
        if (final.boards[seat].wall[r].every((x) => x === 1)) {
          $$('.wcell', boardEl)
            .slice(r * 5, r * 5 + 5)
            .forEach((cell, k) => setTimeout(() => cell.classList.add('sweep'), k * 70));
        }
      }
    }
    await beat(600);
    await banner('<span class="r">Full time</span>');
    await beat(700);
    return;
  }

  // Alumni wave — the lid refills the bag, visibly.
  if (final.refills > interim.refills && !instant()) {
    const lidRect = $('#lid-chip').getBoundingClientRect();
    const bagRect = $('#bag-chip').getBoundingClientRect();
    $('#bag-chip').classList.add('wave');
    $('#lid-chip').classList.add('wave');
    banner('<span class="r">Alumni wave</span> — the market restocks');
    const waves = [];
    for (let i = 0; i < 7; i++) {
      waves.push(fly(lidRect, bagRect, tileHTML(i % 5), { dur: 420, delay: i * 55, lift: 30 }));
    }
    await Promise.all(waves);
    setTimeout(() => {
      $('#bag-chip').classList.remove('wave');
      $('#lid-chip').classList.remove('wave');
    }, 1600);
  }

  // The next quarter's deal.
  G.view = snap(final);
  renderAll();
  setPhase('Hiring');
  await banner(
    `Q${final.round} · <b>${esc(G.names[final.startPlayer])}</b> has the <span class="r">First&nbsp;Mover</span>`
  );
  await dealAnimation();
}

async function dealAnimation() {
  if (instant()) return;
  const bagRect = $('#bag-chip').getBoundingClientRect();
  const tiles = $$('#agencies .tile');
  tiles.forEach((t) => t.classList.add('pre'));
  await Promise.all(
    tiles.map((t, i) =>
      fly(bagRect, t.getBoundingClientRect(), tileHTML(Number(t.dataset.fn)), {
        dur: 330,
        delay: i * 24,
        lift: 18,
      })
    )
  );
  tiles.forEach((t) => t.classList.remove('pre'));
}

// ---------------------------------------------------------------------------
// Moves.

async function submitMove(dest) {
  if (!G || animating || G.cur.over || !sel) return;
  stopClock();
  const move = { source: sel.source, fn: sel.fn, dest, t: Math.round(G.spent[G.cur.seatToMove]) };

  const before = G.cur;
  let interim, final;
  try {
    interim = E.applyTake(before, move);
    final = E.apply(before, move);
  } catch (err) {
    console.error(err);
    announce('That move is not legal.');
    return;
  }
  G.moves.push(move);
  G.cur = final;
  sel = null;
  animating = true;

  announce(describeMove(before, interim, move));
  await animatePhaseA(before, interim, move);
  const resolved = final.over || final.round > interim.round;
  if (resolved) await animateResolution(interim, final);

  G.view = snap(final);
  renderAll();
  animating = false;

  if (final.over) {
    endGame('natural');
  } else {
    startClock(final.seatToMove);
    if (resolved) {
      announce(
        `Q${final.round} begins. ` +
          G.names.map((n, i) => `${n} ${final.boards[i].score}`).join(', ') +
          `. ${G.names[final.startPlayer]} starts.`
      );
    }
    scheduleBot();
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
    sel = { source: m.source, fn: m.fn };
    await submitMove(m.dest);
  })();
}

function describeMove(before, interim, move) {
  const name = G.names[before.seatToMove];
  const k =
    move.source.type === 'agency'
      ? before.agencies[move.source.index][move.fn]
      : before.centre[move.fn];
  const src =
    move.source.type === 'agency' ? AGENCY_NAMES[move.source.index] : 'the open market';
  let msg = `${name} takes ${k} ${FN[move.fn]} from ${src}`;
  if (move.source.type === 'centre' && before.firstMoverInCentre) {
    msg += ' and the First Mover token';
  }
  if (move.source.type === 'agency') {
    const spilled = before.agencies[move.source.index].reduce((a, b) => a + b, 0) - k;
    if (spilled > 0) msg += `; ${spilled} to the open market`;
  }
  msg += move.dest.type === 'team' ? `. Placed on team row ${move.dest.row + 1}.` : '. Sent to the bench.';
  const benched =
    interim.boards[before.seatToMove].bench.length - before.boards[before.seatToMove].bench.length;
  if (move.dest.type === 'team' && benched > 0) msg += ` ${benched} to the bench.`;
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
    endGame('timeout', flagged);
  }
}

// ---------------------------------------------------------------------------
// Game lifecycle.

function freshSeed() {
  const buf = new Uint32Array(3);
  crypto.getRandomValues(buf);
  return `${SEED_A[buf[0] % SEED_A.length]}-${SEED_B[buf[1] % SEED_B.length]}-${buf[2] % 90 + 10}`;
}

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
  };
  sel = null;
  animating = false;
  $('#setup').classList.add('hidden');
  $('#game').classList.remove('hidden');
  $('#end-modal').close?.();
  renderAll();
  announce(
    `New game, seed ${seed}. ${G.names[s.startPlayer]} opens the hiring in Q1.`
  );
  (async () => {
    animating = true;
    await banner(
      `Q1 · <b>${esc(G.names[s.startPlayer])}</b> opens the <span class="r">hiring</span>`
    );
    await dealAnimation();
    animating = false;
    startClock(s.seatToMove);
    scheduleBot(); // the seed may hand the bot the opening move
  })();
}

function endGame(ending, flaggedSeat = null) {
  if (G.clockTimer) {
    clearInterval(G.clockTimer);
    G.clockTimer = null;
  }
  G.clockSeat = null;
  setPhase('Full time');

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
        ? 'Level on points and completed rows — the rulebook calls it a shared win.'
        : `Final whistle after Q${G.cur.round}.`;

  const rows = G.names
    .map((name, seat) => {
      const b = G.cur.boards[seat];
      const bonus = ending === 'natural' ? E.bonuses(b.wall) : 0;
      const detail =
        ending === 'natural'
          ? `${E.completeRows(b.wall)} rows · ${E.completeColumns(b.wall)} cols · ${E.completeFunctions(b.wall)} functions`
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
    <p class="whistle">${ending === 'timeout' ? 'Flag falls' : 'Final whistle'}</p>
    <p class="champion spot">${title}</p>
    <p class="end-sub">${sub}</p>
    <table class="final-table">
      <tr><th>Firm</th><th>Org chart</th><th class="num">Play</th><th class="num">Bonus</th><th class="num">Total</th></tr>
      ${rows}
    </table>`;
  announce(`${title}. ` + G.names.map((n, i) => `${n} ${result.scores[i]}`).join(', ') + '.');
  $('#end-modal').showModal?.();
}

// The game record (§10). Hot-seat games are exhibitions, bot games are
// practice: archived either way, never counted toward a league.
function gameRecord() {
  return {
    v: E.ENGINE_VERSION,
    term: 'dev',
    mode: G.cfg.bot ? 'practice' : 'exhibition',
    seed: G.seed,
    seats: G.names,
    config: { clockMs: G.clockMs, splashHistory: false },
    device: G.names.map((_, i) => (G.cfg.bot && i === BOT_SEAT ? 'bot' : 'hotseat')),
    moves: G.moves,
    result: G.result || null,
  };
}

function downloadRecord() {
  const blob = new Blob([JSON.stringify(gameRecord(), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `headcount-${G.seed}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------------------------------------------------------------------------
// Input — two-tap, keyboard-friendly (everything is a real button).

document.addEventListener('click', (e) => {
  if (!G || animating || G.cur.over) return;
  // The bot's turn is the bot's: taps select nothing while it thinks.
  if (G.cfg.bot && G.cur.seatToMove === BOT_SEAT && !e.target.closest('.board-head')) return;

  const tile = e.target.closest('button.tile');
  if (tile) {
    const agencyEl = tile.closest('.agency');
    const inCentre = !!tile.closest('#centre');
    if (agencyEl || inCentre) {
      const source = agencyEl
        ? { type: 'agency', index: Number(agencyEl.dataset.agency) }
        : { type: 'centre' };
      const fn = Number(tile.dataset.fn);
      if (sel && sameSource(sel.source, source) && sel.fn === fn) {
        sel = null; // second tap on the same pick cancels
      } else {
        sel = { source, fn };
        const k =
          source.type === 'agency' ? G.cur.agencies[source.index][fn] : G.cur.centre[fn];
        announce(
          `Selected ${k} ${FN[fn]} from ${
            source.type === 'agency' ? AGENCY_NAMES[source.index] : 'the open market'
          }. Choose a highlighted team row or the bench.`
        );
      }
      applySelection();
      return;
    }
  }

  const row = e.target.closest('.trow.can-drop');
  if (row) {
    submitMove({ type: 'team', row: Number(row.dataset.row) });
    return;
  }
  const bench = e.target.closest('.bench.can-drop');
  if (bench) {
    submitMove({ type: 'bench' });
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
let setupMode = 'hotseat'; // 'hotseat' | 'practice'

function renderNameInputs() {
  const wrap = $('#name-inputs');
  const existing = $$('input', wrap).map((i) => i.value);
  wrap.innerHTML = '';
  const count = setupMode === 'practice' ? 1 : setupPlayers;
  for (let i = 0; i < count; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = setupMode === 'practice' ? 'Your name' : `Player ${i + 1}`;
    input.value = existing[i] || '';
    input.setAttribute('aria-label', `Player ${i + 1} name`);
    wrap.appendChild(input);
  }
}

$$('#players-seg .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('#players-seg .seg-btn').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    setupPlayers = Number(btn.dataset.players);
    renderNameInputs();
  });
});

$$('#mode-seg .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('#mode-seg .seg-btn').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    setupMode = btn.dataset.mode;
    const practice = setupMode === 'practice';
    $('#players-seg').classList.toggle('hidden', practice);
    $('#mode-hint').textContent = practice
      ? `A practice match against ${BOT_NAME} — our in-house recruiter. ` +
        'Practice games count for nothing; play until the rules feel obvious.'
      : 'Everyone plays on this device, passing turns.';
    // Novices should learn the rules before they learn the clock.
    if (practice) $('#clock-select').value = '0';
    renderNameInputs();
  });
});

$('#setup-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const typed = $$('#name-inputs input').map((i, k) => i.value.trim() || `Player ${k + 1}`);
  const practice = setupMode === 'practice';
  startGame({
    players: practice ? 2 : setupPlayers,
    names: practice ? [typed[0], BOT_NAME] : typed,
    bot: practice,
    clockMs: Number($('#clock-select').value),
    seed: $('#seed-input').value,
  });
});

$('#btn-new').addEventListener('click', () => {
  if (G && !G.cur.over && G.moves.length > 0 && !confirm('Abandon this game?')) return;
  if (G) {
    G.dead = true;
    if (G.clockTimer) clearInterval(G.clockTimer);
  }
  $('#end-modal').close?.();
  $('#game').classList.add('hidden');
  $('#setup').classList.remove('hidden');
});
$('#btn-export').addEventListener('click', downloadRecord);
$('#btn-record').addEventListener('click', downloadRecord);
$('#btn-rematch').addEventListener('click', () => {
  $('#end-modal').close();
  startGame({ ...G.cfg, seed: '' }); // fresh market, same table
});
$('#btn-setup').addEventListener('click', () => {
  if (G) G.dead = true;
  $('#end-modal').close();
  $('#game').classList.add('hidden');
  $('#setup').classList.remove('hidden');
});

renderNameInputs();

// ---------------------------------------------------------------------------
// Headless smoke test: ?smoke=1 plays a full deterministic game through the
// real UI pipeline with animations skipped, then stamps the outcome into the
// DOM for a headless browser to read. Not a player feature.

// ?smoke=1 plays to the end; ?smoke=N&stop=1 stops after N moves (for
// layout screenshots).
const smokeParams = new URLSearchParams(location.search);
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
        sel = { source: m.source, fn: m.fn };
        await submitMove(m.dest);
      }
      out.textContent = G.cur.over
        ? `SMOKE OK moves=${G.moves.length} q=${G.cur.round} scores=${G.cur.result.scores.join('/')} winner=${G.cur.result.winner}`
        : `SMOKE PARTIAL moves=${G.moves.length} q=${G.cur.round}`;
      if (smokeParams.has('probe')) {
        const odd = [];
        $$('.tile').forEach((t) => {
          const r = t.getBoundingClientRect();
          if (r.height > 50 || r.width > 50) {
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
