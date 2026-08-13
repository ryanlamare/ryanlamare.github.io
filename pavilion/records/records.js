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
// ⚠️ **The uplifting rule is enforced here, at the point of display**: the
// public table is a top N and never a full ranking, the Record Book holds
// highs only, and the one place a full position appears is the panel you have
// to pick your own name to see. `stats.js` will hand you the whole table; do
// not print it.

import { defaultRelayUrl, apiBase } from '../net.js';
import { standings, topN, records, honours, seasonsOf, mostImproved, playerCard } from '../relay/stats.js';

const LEAGUE = document.body.dataset.league;
const ME_KEY = `pavilion.records.me.${LEAGUE}`;
const DEFAULT_BOARD = 5;

// The Record Book's keys become Fair names here and nowhere else — `stats.js`
// is theme-neutral like everything below the copy layer (rules spec §10).
// ⚠️ Only *approved* award names appear (PAVILION.md, Award names). The rest
// stay plain English rather than minting a theme term that never took the
// read-aloud test.
const RECORD_LABELS = {
  bestGame: { name: 'Best in Show', of: 'highest score in a single game', unit: '' },
  widestWin: { name: 'Widest win', of: 'biggest winning margin', unit: '' },
  mostRows: { name: 'Most complete rows', of: 'in one game', unit: '' },
  longestGame: { name: 'Longest game', of: 'moves played', unit: '' },
  mostPlayed: { name: 'Most games played', of: 'turning up is its own record', unit: '' },
  bestAverage: { name: 'Best average', of: 'across a season of play', unit: '' },
  longestStreak: { name: 'Longest winning run', of: 'games in a row', unit: '' },
};

const state = { games: [], season: null, tab: 'table', boardSize: DEFAULT_BOARD, error: null };

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
    state.games = (await gamesRes.json()).games || [];
    if (sessionRes && sessionRes.ok) state.boardSize = (await sessionRes.json()).boardSize || DEFAULT_BOARD;
  } catch (err) {
    state.error = err.message;
  }
  render();
}

function seasonGames() {
  if (!state.season) return state.games;
  return state.games.filter((g) => (g.season ?? null) === state.season);
}

// ---------------------------------------------------------------------------

function render() {
  if (state.error) {
    app.innerHTML = `<p class="empty err">The records are unreachable right now — ${esc(state.error)}.</p>
      <p class="empty">Nothing is lost: every game is stored on the relay, and this page is only a view of it.</p>`;
    return;
  }
  if (!state.games.length) {
    app.innerHTML = `<p class="empty">No games yet. The table, the records and the honours all appear
      the moment the first game is played — nobody has to file anything.</p>`;
    return;
  }

  const seasons = seasonsOf(state.games);
  const showPicker = seasons.length > 1 || seasons[0]?.season;

  app.innerHTML = `
    <div class="controls">
      <div class="tabs" role="tablist">
        ${['table', 'records', 'honours']
          .map(
            (t) => `<button role="tab" id="tab-${t}" aria-controls="panel-${t}" data-tab="${t}"
              aria-selected="${state.tab === t}">
              ${t === 'table' ? 'Table' : t === 'records' ? 'Records' : 'Honours'}</button>`
          )
          .join('')}
      </div>
      ${
        showPicker
          ? `<label class="pick">Season
              <select id="season">
                <option value="">All time</option>
                ${seasons
                  .map(
                    (s) =>
                      `<option value="${esc(s.season ?? '')}"${state.season === s.season ? ' selected' : ''}>${esc(
                        seasonLabel(s.season)
                      )}</option>`
                  )
                  .join('')}
              </select></label>`
          : ''
      }
    </div>
    ${panel('table', tablePanel())}
    ${panel('records', recordsPanel())}
    ${panel('honours', honoursPanel())}`;

  app.querySelectorAll('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      state.tab = b.dataset.tab;
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

function tablePanel() {
  const table = standings(seasonGames());
  if (!table.length) return `<p class="empty">No league games in this season yet.</p>`;

  const board = topN(table, state.boardSize);
  const rising = mostImproved(seasonGames()).slice(0, 3);

  return `
    <div class="card">
      <h2>The table</h2>
      <div class="scroller">
        <table>
          <caption class="sr-only">The top ${state.boardSize} of the league table: position, player,
            games played, won, drawn, lost, league points, best single score, and recent form
            newest first.</caption>
          <thead><tr>
            <th><span class="sr-only">Position</span></th><th>Player</th>
            <th>P<span class="sr-only">layed</span></th><th class="hide">W<span class="sr-only">on</span></th>
            <th class="hide">D<span class="sr-only">rawn</span></th><th class="hide">L<span class="sr-only">ost</span></th>
            <th>Pts<span class="sr-only"> (points)</span></th><th class="hide">Best</th><th>Form</th>
          </tr></thead>
          <tbody>${board.map(row).join('')}</tbody>
        </table>
      </div>
      <p class="note">Win 3, draw 2, loss 1 — the point for playing is the loser's point, not a bonus.
        The board shows the top ${board.length === table.length ? board.length : state.boardSize};
        there is no full ranking here, by design. Your own position is below, and only you are looking at it.</p>
    </div>

    ${
      rising.length
        ? `<div class="card">
            <h2>Most improved</h2>
            <div class="roll">${rising
              .map(
                (p) => `<span><span class="holder">${esc(p.name)}</span>
                  <span class="prize">+${n1(p.delta)} a game</span></span>`
              )
              .join('')}</div>
            <p class="note">First half of your games against the second. It has a top and no bottom —
              the player who improved least simply isn't on it.</p>
          </div>`
        : ''
    }

    <div class="card mine">
      <h2>Your line</h2>
      <label class="pick" style="margin:0 0 12px">Who are you?
        <select id="me">
          <option value="">Pick your name…</option>
          ${table.map((r) => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}
        </select>
      </label>
      <div id="mine"></div>
    </div>`;
}

function row(r) {
  return `<tr class="${r.rank === 1 ? 'gold' : ''}">
    <td class="rank">${r.rank}</td>
    <td class="name">${esc(r.name)}</td>
    <td>${r.played}</td>
    <td class="hide">${r.won}</td>
    <td class="hide">${r.drawn}</td>
    <td class="hide">${r.lost}</td>
    <td><b>${r.points}</b></td>
    <td class="hide">${r.best}</td>
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

  const card = playerCard(seasonGames(), id);
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
      const label = RECORD_LABELS[r.key] || { name: r.key, of: '' };
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
        <div class="k">${esc(label.name)}</div>
        <div class="v">${r.key === 'bestAverage' ? n1(r.value) : r.value}</div>
        <div class="who">${holders}</div>
        <div class="when">${esc(label.of)}${at ? ` · ${when(at)}` : ''}</div>
      </div>`;
    })
    .join('')}
    <p class="note">Records are all-time unless you pick a season — the archive outlives the term, so
      a cohort plays against every cohort before it. Timeouts don't set score records: the game stopped
      early and the board never finished.</p>
  </div>`;
}

// --- Honours ----------------------------------------------------------------

function honoursPanel() {
  // Deliberately ignores the season picker: a roll of honour that shows one
  // season is a fact, not a roll.
  const rolls = honours(state.games).filter((h) => h.champion);
  if (!rolls.length) return `<p class="empty">No season has finished yet.</p>`;

  return `<div class="card">
    <h2>Roll of honour</h2>
    ${rolls
      .map(
        (h) => `<div class="roll" style="padding:12px 0;border-bottom:1px solid var(--line)">
          <span class="season">${esc(seasonLabel(h.season) === 'All time' ? '—' : seasonLabel(h.season))}</span>
          <span><span class="prize">Grand Prize</span><br><span class="holder">${esc(h.champion.name)}</span>
            <span class="when">${h.champion.points} pts</span></span>
          ${
            h.cup
              ? `<span><span class="prize">The Cup</span><br><span class="holder">${esc(h.cup.name)}</span></span>`
              : `<span><span class="prize">The Cup</span><br><span class="when">not played</span></span>`
          }
          ${h.double ? '<span class="double">The Double</span>' : ''}
        </div>`
      )
      .join('')}
    <p class="note">The Grand Prize goes to the top of the league table; the Cup to whoever wins the
      week 6 knockout. One person taking both is the Double.</p>
  </div>`;
}

load();
