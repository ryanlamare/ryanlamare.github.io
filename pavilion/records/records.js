// Pavilion — the records site's one engine (build step 6).
//
// Every league page is a stub: a title, a league id on <body>, and this file.
// GitHub Pages serves files and cannot route, so a season can never be a URL
// segment without a folder per season forever — the season is a picker inside
// the page instead, which is what ESPN does anyway (PAVILION.md, The site
// shape). One file per league, made once when the league starts.
//
// All the arithmetic is `relay/stats.js`, the same module the tests drive and
// the server could run. This file fetches, picks and renders — if you find
// yourself computing a standing here, it belongs there.
//
// ⚠️ **What the uplifting rule still means here** (revised twice on 2026-08-13,
// both times by Ryan): the class table *is* published in full, ranked, because
// a friendly tournament shows its standings and the participation point means
// the bottom is attendance rather than ability. What remains is that **no award
// is ever given for finishing low**, somebody who has not played is listed but
// not ranked, and the Record Book holds highs only. `topN` and the board length
// survive as a highlight and for screens that still want a short board.

import { defaultRelayUrl, apiBase } from '../net.js';
import { standings, byName, records, seasonsOf, playerCard } from '../relay/stats.js';
import { SPRITE, EMBLEMS } from './isotypes.js';

const LEAGUE = document.body.dataset.league;
const ME_KEY = `pavilion.records.me.${LEAGUE}`;
const DEFAULT_BOARD = 5;

// The Record Book's keys become their names here and nowhere else — `stats.js`
// is theme-neutral like everything below the copy layer (rules spec §10).
//
// ⚖️ **The titles carry themselves and there is no strapline under them**
// (Ryan, 2026-08-14) — "Highest score" does not need *highest score in a single
// game* printed beneath it. That also retired the one theme name on this page:
// Best in Show read as an award for something a judge decides, when the record
// is simply the biggest number anyone has scored.
const RECORD_LABELS = {
  bestGame: 'Highest score',
  widestWin: 'Widest win',
  mostRows: 'Most completed rows',
  mostCols: 'Most completed columns',
  mostKinds: 'Most colour bonuses',
  longestGame: 'Longest game',
  bestAverage: 'Best average',
  longestStreak: 'Longest win streak',
};

const state = { games: [], rosters: [], champions: [], season: null, tab: 'table', boardSize: DEFAULT_BOARD, error: null };

// Tabs are linkable: /records/ler565/#class goes straight to the standings. The
// hash is the reader's word ("class"), not the code's ("table") — a URL you can
// say out loud in a lecture is worth one line of mapping.
//
// The standings come first: during term it is the page, and the records are the
// thing you go looking for rather than the thing you check every week.
const TABS = { table: 'Standings', records: 'Records', champions: 'Champions' };
const HASH = { records: 'records', table: 'standings', champions: 'champions' };
const fromHash = (h) => Object.keys(HASH).find((k) => HASH[k] === String(h || '').replace(/^#/, ''));

const app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const n1 = (x) => (Math.round(x * 10) / 10).toFixed(1);

// A season key reads as a heading: `2027-summer` is "Summer 2027". A league
// with no seasons has nothing to write, which is a real answer and not a gap.
function seasonLabel(season) {
  if (!season) return 'All time';
  const m = String(season).match(/^(\d{4})-(.+)$/);
  if (!m) return season.replace(/-/g, ' ');
  const term = m[2].replace(/-/g, ' ');
  return `${term.charAt(0).toUpperCase()}${term.slice(1)} ${m[1]}`;
}

function when(at) {
  return at ? new Date(at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

// ---------------------------------------------------------------------------

async function load() {
  state.tab = fromHash(location.hash) || state.tab;
  const base = apiBase(defaultRelayUrl(location));
  try {
    const [gamesRes, sessionRes] = await Promise.all([
      fetch(`${base}/records/games?league=${encodeURIComponent(LEAGUE)}`, { cache: 'no-store' }),
      // Only for the board length, which is "sized to the class" and a setting
      // rather than a constant. If it is unreachable, five is the documented
      // default and the page carries on.
      fetch(`${base}/session`, { cache: 'no-store' }).catch(() => null),
    ]);
    if (!gamesRes.ok) throw new Error(`the records service answered ${gamesRes.status}`);
    const body = await gamesRes.json();
    state.games = body.games || [];
    state.rosters = body.rosters || [];
    state.champions = body.champions || [];
    if (sessionRes && sessionRes.ok) state.boardSize = (await sessionRes.json()).boardSize || DEFAULT_BOARD;
    // ⚖️ Open on the newest season, not all-time. During term almost every
    // visit is "how did we do this week", and all-time is one click away —
    // where the reverse would mean a click every week. It also means the class
    // register has a cohort to be the register *of*, which all-time has not.
    state.season = seasons()[0]?.season ?? null;
  } catch (err) {
    state.error = err.message;
  }
  render();
}

function seasonGames() {
  if (!state.season) return state.games;
  return state.games.filter((g) => (g.season ?? null) === state.season);
}

// ⚠️ The class list is a *season's* roster, and all-time deliberately has none.
// "The class" is a cohort; the union of every cohort a league ever had is a
// mailing list, not a class, and seeding an all-time table with it would put
// years of alumni on the page showing nothing played.
function classRoster() {
  if (!state.season && state.rosters.length > 1) return null;
  const entry = state.rosters.find((r) => (r.season ?? null) === state.season) || state.rosters[0];
  return entry?.players || null;
}

// Seasons come from the rosters *and* the games: a term that has a class list
// and no games yet is week 0, which is exactly when the register matters most.
function seasons() {
  const seen = new Map();
  for (const r of state.rosters) seen.set(r.season ?? null, { season: r.season ?? null, games: 0 });
  for (const s of seasonsOf(state.games)) seen.set(s.season, { ...seen.get(s.season), ...s });
  return [...seen.values()].sort((a, b) => String(b.season ?? '').localeCompare(String(a.season ?? '')));
}

// ---------------------------------------------------------------------------

function render() {
  if (state.error) {
    app.innerHTML = `<p class="empty err">The records are unreachable right now — ${esc(state.error)}.</p>
      <p class="empty">Nothing is lost: every game is stored on the relay, and this page is only a view of it.</p>`;
    return;
  }
  if (!state.games.length && !state.rosters.some((r) => r.players.length)) {
    app.innerHTML = `<p class="empty">No games yet. The standings, the records and the cabinet all
      appear the moment the first game is played — nobody has to file anything.</p>`;
    return;
  }

  const seasonList = seasons();
  const showPicker = state.tab !== 'champions' && (seasonList.length > 1 || seasonList[0]?.season);
  if (!state.games.length) state.tab = 'table'; // week 0: the standings are all there is

  // ⚖️ **All time is a Records idea, not a standings one** (Ryan, 2026-08-13).
  // A class is a cohort: "the all-time LER 565 table" would be every student
  // who ever took the course, most of them never having met. Records are the
  // opposite — they are *supposed* to reach across years, which is the whole
  // argument for keeping the archive. So the option only appears on Records,
  // and landing on the standings with it selected falls back to the newest
  // season rather than showing a table of strangers.
  const allTime = state.tab === 'records';
  if (!allTime && !state.season) state.season = seasonList[0]?.season ?? null;

  app.innerHTML = `
    <div class="controls">
      <div class="tabs" role="tablist">
        ${Object.entries(TABS)
          .map(
            ([t, label]) => `<button role="tab" id="tab-${t}" aria-controls="panel-${t}" data-tab="${t}"
              aria-selected="${state.tab === t}">${label}</button>`
          )
          .join('')}
      </div>
      ${
        showPicker
          ? `<label class="pick">Season
              <select id="season">
                ${seasonList
                  .map(
                    (s) =>
                      `<option value="${esc(s.season ?? '')}"${state.season === s.season ? ' selected' : ''}>${esc(
                        seasonLabel(s.season)
                      )}</option>`
                  )
                  .join('')}
                ${allTime ? '<option value=""' + (state.season ? '' : ' selected') + '>All time</option>' : ''}
              </select></label>`
          : ''
      }
    </div>
    ${panel('table', tablePanel())}
    ${panel('records', recordsPanel())}
    ${panel('champions', championsPanel())}`;

  app.querySelectorAll('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      state.tab = b.dataset.tab;
      // replaceState, not a new entry: a tab is a view of one page, and Back
      // should leave the records rather than walk the tabs you clicked.
      history.replaceState(null, '', `#${HASH[state.tab]}`);
      render();
    })
  );
  const picker = app.querySelector('#season');
  if (picker) {
    picker.addEventListener('change', () => {
      state.season = picker.value || null;
      render();
    });
  }
  wireWheel();
  const me = app.querySelector('#me');
  if (me) {
    me.addEventListener('change', () => {
      try {
        localStorage.setItem(ME_KEY, me.value);
      } catch {
        /* private browsing — the panel just won't be remembered */
      }
      renderMine();
    });
    renderMine();
  }
}

// --- Table ------------------------------------------------------------------

// The hidden panels stay in the DOM rather than being rebuilt on each switch —
// they are cheap, and `display: none` keeps them out of the accessibility tree
// as well as off the screen, so a screen reader reads one tab like a page.
function panel(name, html) {
  return `<section class="panel" role="tabpanel" id="panel-${name}" aria-labelledby="tab-${name}"
    data-panel="${name}" ${state.tab === name ? 'data-open' : ''}>${html}</section>`;
}

// ⚖️ **One ranked list of the whole class** (Ryan, 2026-08-13, superseding both
// the top-five board and the alphabetical register). His argument: a friendly
// tournament publishes its standings, and because every game is worth at least
// a point, the bottom of *this* table is attendance rather than ability —
// which is the nudge he wants and is fixed by turning up.
//
// ⚠️ What survives from the old rule, and should not be quietly undone:
// somebody who has not played is listed but **not ranked** (you cannot be 27th
// in something you have not entered), no award is ever given for finishing low,
// and the private line below still leads with the distance to the next rung.
function tablePanel() {
  const roster = classRoster();
  const table = standings(seasonGames(), { roster });
  if (!table.length) return `<p class="empty">No league games in this season yet.</p>`;

  // The tab above says Standings, so a heading saying it again is furniture, and
  // the scoring is not explained under the table either (Ryan, 2026-08-14). The
  // transcript still carries both, because a screen reader has no tab to look at.
  return `
    <div class="card">
      <div class="scroller">
        <table>
          <caption class="sr-only">Standings, ranked by points: position, player, games played,
            won, drawn, lost, points, and recent form newest first. Win 3, draw 2, loss 1 — the
            point for playing is the loser's point. Players who have not played yet are listed
            without a position.</caption>
          ${head('<th><span class="sr-only">Position</span></th>')}
          <tbody>${table.map((r) => row(r, r.rank <= state.boardSize)).join('')}</tbody>
        </table>
      </div>
    </div>

    <div class="card mine">
      <h2>Individual record</h2>
      <label class="pick" style="margin:0 0 12px">Who are you?
        <select id="me">
          <option value="">Pick your name…</option>
          ${byName(table).map((r) => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}
        </select>
      </label>
      <div id="mine"></div>
    </div>`;
}

// No Best column (Ryan, 2026-08-14). A player's best single score is a Record
// Book question and it is on their own card below; in the table it was an eighth
// number competing with the seven that decide the order.
function head(first) {
  return `<thead><tr>
    ${first}<th class="who">Player</th>
    <th>P<span class="sr-only">layed</span></th><th class="hide">W<span class="sr-only">on</span></th>
    <th class="hide">D<span class="sr-only">rawn</span></th><th class="hide">L<span class="sr-only">ost</span></th>
    <th>Pts<span class="sr-only"> (points)</span></th><th>Form</th>
  </tr></thead>`;
}

// One row. `top` marks a place inside the board length — the setting that used
// to decide who was shown at all, now deciding who is highlighted, so "size N
// to the class" still means something with the whole class on screen.
//
// ⚠️ A player with no games gets a dash for a position, not a number: they are
// on the list because the class list is the list, and ranking somebody who has
// not entered is the one thing a standings table genuinely cannot claim.
function row(r, top) {
  const dash = (v) => (r.played ? v : '—');
  return `<tr class="${r.rank === 1 && r.played ? 'gold' : ''}${top && r.played ? ' top' : ''}${r.played ? '' : ' absent'}">
    <td class="rank">${dash(r.rank)}</td>
    <td class="who name">${esc(r.name)}</td>
    <td>${dash(r.played)}</td>
    <td class="hide">${dash(r.won)}</td>
    <td class="hide">${dash(r.drawn)}</td>
    <td class="hide">${dash(r.lost)}</td>
    <td><b>${dash(r.points)}</b></td>
    <td><span class="form" aria-label="Form, newest first: ${r.form
      .map((f) => ({ W: 'won', D: 'drew', L: 'lost' })[f])
      .join(', ')}">${r.form.map((f) => `<b class="${f}" aria-hidden="true">${f}</b>`).join('')}</span></td>
  </tr>`;
}

// The private half of "public board vs private rank". Withholding someone's own
// position is not kindness: it leaves them unable to tell 6th from 30th, unable
// to see they are close, and unable to see themselves climbing. So this shows
// the exact rank — and the distance to the next rung, which is what turns a
// position into a target rather than a verdict.
function renderMine() {
  const pick = app.querySelector('#me');
  const box = app.querySelector('#mine');
  if (!pick || !box) return;

  let id = pick.value;
  if (!id) {
    try {
      const saved = localStorage.getItem(ME_KEY);
      if (saved && [...pick.options].some((o) => o.value === saved)) {
        pick.value = saved;
        id = saved;
      }
    } catch {
      /* no storage, no memory — pick again */
    }
  }
  if (!id) {
    box.innerHTML = `<p class="note">Pick your name to see exactly where you stand. It is on this device only,
      and nobody else's page shows it.</p>`;
    return;
  }

  const card = playerCard(seasonGames(), id, { roster: classRoster() });
  if (!card) {
    box.innerHTML = `<p class="note">No games in this season.</p>`;
    return;
  }
  box.innerHTML = `
    <div class="big">${card.rank}<span style="font-size:20px"> of ${card.of}</span></div>
    <p class="chase">${
      card.gap > 0
        ? `${card.gap} point${card.gap === 1 ? '' : 's'} off ${ordinal(card.nextRank)}.`
        : card.rank === 1
          ? 'Top of the table.'
          : 'Level with the rung above.'
    }</p>
    <p style="margin-top:14px">
      <span class="stat"><b>${card.points}</b><span>Points</span></span>
      <span class="stat"><b>${card.played}</b><span>Played</span></span>
      <span class="stat"><b>${card.best}</b><span>Best</span></span>
      <span class="stat"><b>${n1(card.avg)}</b><span>Average</span></span>
      <span class="stat"><b>${card.won}–${card.drawn}–${card.lost}</b><span>W–D–L</span></span>
    </p>`;
}

function ordinal(n) {
  if (!n) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// --- Records ----------------------------------------------------------------

function recordsPanel() {
  const book = records(seasonGames());
  if (!book.length) return `<p class="empty">No records in this season yet.</p>`;

  return `<div class="book">${book
    .map((r) => {
      const name = RECORD_LABELS[r.key] || r.key;
      // One player can hold a record in several games, and a low record (one
      // completed row, say) can be level across half the class. Neither is
      // wrong in the data — `stats.js` keeps every holder — but a card listing
      // twenty-seven names is a card nobody reads.
      const unique = [...new Map(r.holders.map((h) => [h.id, h])).values()];
      const holders =
        unique.slice(0, 3).map((h) => esc(h.name)).join(' & ') +
        (unique.length > 3 ? ` <span class="when">and ${unique.length - 3} more</span>` : '');
      const at = r.holders[0]?.at;
      return `<div class="rec${r.key === 'bestGame' ? ' best' : ''}">
        <div class="k">${esc(name)}</div>
        <div class="v">${r.key === 'bestAverage' ? n1(r.value) : r.value}</div>
        <div class="who">${holders}</div>
        <div class="when">${at ? when(at) : ''}</div>
      </div>`;
    })
    .join('')}
  </div>`;
}

// --- Honours ----------------------------------------------------------------

// The Hall of Champions — one trophy per cohort, and the only place on this
// site where a student chose what it says. The name and the season are derived
// from the archive; the emblem and the line under it are theirs.
//
// ⚠️ A champion with no card still gets a trophy, just an unengraved one. The
// cabinet is a record of who won, and it must not depend on anybody having
// filled in a form.
// ⚖️ **The Ferris Wheel, not a trophy cabinet** (Ryan, 2026-08-14 — PAVILION.md,
// *The Ferris Wheel*). The champions' cars *are* the trophies: a name, an emblem
// they picked, and their line on hover. The wheel that carried this is the one
// structure everybody came to the 1893 Fair to see, so it explains itself.
//
// ⚠️ **Six cars, and the wheel never grows.** The apex is always the season not
// yet won; five champions ride below it; and the *sixth* champion pushes the
// oldest car off the rim and into the line underneath, newest first. That line is
// unbounded, so the wheel stays legible in 2040 and **nothing is ever dropped** —
// which is the property the archive exists for. Six is this constant and the
// 60° step below is derived from it: apex, bottom, two on each diagonal.
const WHEEL_CARS = 6;
const PLATFORM = 3; // the seat at the bottom of the rim — where a car is "boarding"

function championsPanel() {
  const cabinet = state.champions; // newest first, from the archive
  // The newest season nobody has won yet. There may be none — every season won,
  // or a league with no seasons at all — and then all six seats are champions.
  const coming = seasons().find((s) => !cabinet.some((c) => (c.season ?? null) === s.season));

  const riders = cabinet.slice(0, WHEEL_CARS - (coming ? 1 : 0));
  const siding = cabinet.slice(riders.length);

  const seats = [];
  if (coming) seats.push({ kind: 'coming', season: coming.season });
  for (const c of riders) seats.push({ kind: 'champ', c });
  // Unfilled seats are drawn as empty gondolas rather than left as gaps: a wheel
  // missing half its cars reads as broken, and an empty seat reads as one that
  // has not been won yet — the same thing the old "To be won" trophy said.
  while (seats.length < WHEEL_CARS) seats.push({ kind: 'empty' });

  return `<div class="wheel-stage">
    <div class="wheel" style="--turn:0deg">
      ${frameSvg()}
      ${rigSvg()}
      ${seats.map((s, i) => seat(s, i)).join('')}
    </div>
    <div class="spin">
      <button type="button" class="nudge" data-spin="-1" aria-label="Turn the wheel back">◀</button>
      <button type="button" class="nudge" data-spin="1" aria-label="Turn the wheel on">▶</button>
    </div>
  </div>
  ${
    siding.length
      ? `<h3 class="siding-h">Earlier champions</h3>
         <ul class="siding">${siding.map(sidingCar).join('')}</ul>`
      : ''
  }`;
}

// One seat on the rim. A champion's is a real <button> — clicking brings it down
// to the platform — which is also what makes the wheel keyboard-operable and
// gives the hover line a focus state for free. Empty seats are not buttons,
// because there is nothing to press.
function seat(s, i) {
  const pos = ` style="--i:${i}"`;
  if (s.kind === 'empty') {
    return `<span class="car empty"${pos} aria-hidden="true">${gondola(null)}</span>`;
  }
  if (s.kind === 'coming') {
    const year = (String(s.season ?? '').match(/\d{4}/) || [])[0];
    return `<span class="car coming"${pos}>${gondola(null)}
      <span class="tag"><b>${year ? `Coming ${esc(year)}` : 'To be won'}</b></span></span>`;
  }
  const c = s.c;
  const label = `${c.name}, ${seasonLabel(c.season)}`;
  return `<button type="button" class="car ${carColour(c.season)}"${pos}
      aria-label="${esc(label)}">
    ${gondola(c.emblem)}
    <span class="tag"><b>${esc(c.name)}</b><span class="yr">${esc(seasonLabel(c.season))}</span></span>
    ${c.quote ? `<span class="say">“${esc(c.quote)}”</span>` : ''}
  </button>`;
}

// The overflow line. The quote is printed here rather than hidden behind a hover,
// which is the other half of the loose end the memo names: a champion's line is
// the one thing on this site a student writes, and it has to be readable
// somewhere that is not a mouse-only interaction.
function sidingCar(c) {
  return `<li class="scar ${carColour(c.season)}">
    ${gondola(c.emblem)}
    <span class="tag"><b>${esc(c.name)}</b><span class="yr">${esc(seasonLabel(c.season))}</span></span>
    ${c.quote ? `<span class="line">“${esc(c.quote)}”</span>` : ''}
  </li>`;
}

// A gondola: a hanging car with the champion's emblem in it.
//
// ⚠️ Render only an emblem this build actually has. A card can name one that
// isn't here — a bespoke emblem drawn for a champion is added to the repo, and
// the card can be saved before that lands (or the symbol renamed years later). A
// `<use>` pointing at nothing fails *silently*, which would leave a blank car
// and no clue why; an empty gondola is the honest fallback.
function gondola(emblem) {
  const known = EMBLEMS.some((e) => e.id === emblem) ? emblem : null;
  return `<span class="gondola" aria-hidden="true">
    <span class="hook"></span>
    <span class="cab">${known ? `<svg class="emb"><use href="#${esc(known)}"/></svg>` : ''}</span>
  </span>`;
}

// ⚖️ **The colour is ours, the emblem is theirs** (Ryan). Derived from the season
// key rather than the champion's position, so a car keeps its colour forever
// instead of changing hue every time somebody new wins.
function carColour(season) {
  const s = String(season ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return 'c' + (h % 5);
}

// ⚠️ **One coordinate system for the whole structure**, and the cars are placed
// from the same numbers. Both SVGs use the viewBox below and fill the stage, so
// the geometry is fixed and `--stage` is the only size knob; `HUB`/`RIM` are
// mirrored into CSS as fractions of it, and changing one here means changing
// that fraction there. Getting this wrong is what put the cars inside the rim
// and the bottom one on top of the base.
const VB = { w: 400, h: 500, cx: 200, cy: 200, rim: 168, foot: 478 };

// The rim, spokes and hub — the part that turns.
//
// Twelve spokes because the original was built like a bicycle wheel, and that is
// the detail that makes the silhouette read as *the* Ferris Wheel rather than a
// fairground one.
function rigSvg() {
  const { cx, cy, rim } = VB;
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return `<line x1="${(cx + 10 * Math.sin(a)).toFixed(1)}" y1="${(cy - 10 * Math.cos(a)).toFixed(1)}"
      x2="${(cx + (rim - 4) * Math.sin(a)).toFixed(1)}" y2="${(cy - (rim - 4) * Math.cos(a)).toFixed(1)}" />`;
  }).join('');
  return `<svg class="rig" viewBox="0 0 ${VB.w} ${VB.h}" aria-hidden="true">
    <g class="spokes">${spokes}</g>
    <circle class="rim" cx="${cx}" cy="${cy}" r="${rim}" />
    <circle class="rim inner" cx="${cx}" cy="${cy}" r="${rim - 9}" />
    <circle class="hub" cx="${cx}" cy="${cy}" r="11" />
  </svg>`;
}

// The A-frame and the base, which do not turn. Drawn in the same viewBox so the
// feet land on the base and the base clears the lowest car by construction
// rather than by trial.
function frameSvg() {
  const { cx, cy, foot } = VB;
  const spread = 108;
  return `<svg class="frame" viewBox="0 0 ${VB.w} ${VB.h}" aria-hidden="true">
    <path class="leg" d="M${cx} ${cy} L${cx - spread} ${foot}" />
    <path class="leg" d="M${cx} ${cy} L${cx + spread} ${foot}" />
    <rect class="ground" x="${cx - spread - 34}" y="${foot}" width="${(spread + 34) * 2}" height="13" rx="5" />
  </svg>`;
}

// Turning it. The rim rotates and every car counter-rotates by the same angle,
// which is how a real wheel works — a gondola hangs level all the way round, and
// cars that tumble with the rim is the way this looks wrong. Both come off one
// `--turn` on the wheel, so the CSS transition carries the whole thing.
function wireWheel() {
  const wheel = app.querySelector('.wheel');
  if (!wheel) return;
  const cars = [...wheel.querySelectorAll('.car')];
  let turn = 0;

  const place = () => {
    wheel.style.setProperty('--turn', `${turn * (360 / WHEEL_CARS)}deg`);
    for (const car of cars) {
      const i = Number(car.style.getPropertyValue('--i'));
      const at = (((i + turn) % WHEEL_CARS) + WHEEL_CARS) % WHEEL_CARS;
      const away = Math.abs(at - PLATFORM);
      // Distance from the platform, the short way round the rim.
      const d = Math.min(away, WHEEL_CARS - away);
      car.style.setProperty('--dim', String(1 - d * 0.11));
      car.classList.toggle('boarding', at === PLATFORM);
    }
  };

  // The short way round, so clicking a car never spins the wheel the long way
  // and never unwinds a turn the reader just watched.
  const spinTo = (want) => {
    let d = (want - turn) % WHEEL_CARS;
    if (d > WHEEL_CARS / 2) d -= WHEEL_CARS;
    if (d < -WHEEL_CARS / 2) d += WHEEL_CARS;
    turn += d;
    place();
  };

  cars.forEach((car) =>
    car.addEventListener('click', () => spinTo(PLATFORM - Number(car.style.getPropertyValue('--i'))))
  );
  app.querySelectorAll('[data-spin]').forEach((b) =>
    b.addEventListener('click', () => {
      turn += Number(b.dataset.spin);
      place();
    })
  );
  place();
}

document.body.insertAdjacentHTML('afterbegin', SPRITE);
load();
