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
import { standings, byName, records, honours, seasonsOf, mostImproved, playerCard } from '../relay/stats.js';

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

const state = { games: [], rosters: [], season: null, tab: 'table', boardSize: DEFAULT_BOARD, error: null };

// Tabs are linkable: /records/ler565/#class goes straight to the standings. The
// hash is the reader's word ("class"), not the code's ("table") — a URL you can
// say out loud in a lecture is worth one line of mapping.
//
// The standings come first: during term it is the page, and the records are the
// thing you go looking for rather than the thing you check every week.
const TABS = { table: 'The class', records: 'Records', honours: 'Honours' };
const HASH = { records: 'records', table: 'class', honours: 'honours' };
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
    app.innerHTML = `<p class="empty">No games yet. The table, the records and the honours all appear
      the moment the first game is played — nobody has to file anything.</p>`;
    return;
  }

  const seasonList = seasons();
  const showPicker = seasonList.length > 1 || seasonList[0]?.season;
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
    ${panel('honours', honoursPanel())}`;

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

  const rising = mostImproved(seasonGames()).slice(0, 3);

  return `
    <div class="card">
      <h2>The class</h2>
      <div class="scroller">
        <table>
          <caption class="sr-only">The whole class ranked by points: position, player, games played,
            won, drawn, lost, points, best single score, and recent form newest first. Players who
            have not played yet are listed without a position.</caption>
          ${head('<th><span class="sr-only">Position</span></th>')}
          <tbody>${table.map((r) => row(r, r.rank <= state.boardSize)).join('')}</tbody>
        </table>
      </div>
      <p class="note">Win 3, draw 2, loss 1 — the point for playing is the loser's point, not a bonus,
        so a single game is worth more than a missed session. The top ${state.boardSize} are marked.
        Nothing here is a title: the season sets the seeding for the Cup.</p>
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
          ${byName(table).map((r) => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}
        </select>
      </label>
      <div id="mine"></div>
    </div>`;
}

function head(first) {
  return `<thead><tr>
    ${first}<th class="who">Player</th>
    <th>P<span class="sr-only">layed</span></th><th class="hide">W<span class="sr-only">on</span></th>
    <th class="hide">D<span class="sr-only">rawn</span></th><th class="hide">L<span class="sr-only">ost</span></th>
    <th>Pts<span class="sr-only"> (points)</span></th><th class="hide">Best</th><th>Form</th>
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
    <td class="hide">${dash(r.best)}</td>
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
  //
  // ⚖️ **The Cup is the only title** (2026-08-13). There was a Grand Prize for
  // topping the league and a Double for taking both; the league stopped
  // awarding anything when it became the seeding for week 6, so they went. What
  // is left of the season is the top seed, printed as a fact rather than a
  // prize — four or five games can say who qualified well, and cannot say who
  // the best player was.
  const rolls = honours(state.games).filter((h) => h.champion || h.cup);
  if (!rolls.length) return `<p class="empty">No season has finished yet.</p>`;

  return `<div class="card">
    <h2>Roll of honour</h2>
    ${rolls
      .map(
        (h) => `<div class="roll" style="padding:12px 0;border-bottom:1px solid var(--line)">
          <span class="season">${esc(seasonLabel(h.season) === 'All time' ? '—' : seasonLabel(h.season))}</span>
          ${
            h.cup
              ? `<span><span class="prize">The Cup</span><br><span class="holder">${esc(h.cup.name)}</span></span>`
              : `<span><span class="prize">The Cup</span><br><span class="when">not played yet</span></span>`
          }
          ${
            h.champion
              ? `<span><span class="prize">Top seed</span><br><span class="holder">${esc(h.champion.name)}</span>
                  <span class="when">${h.champion.points} pts</span></span>`
              : ''
          }
        </div>`
      )
      .join('')}
    <p class="note">The Cup is the title, won in the last session: three games, then semi-finals and a
      final. The weeks before it decide the seeding, and the top seed is recorded here because
      qualifying well is worth remembering — not because it wins anything.</p>
  </div>`;
}

load();
