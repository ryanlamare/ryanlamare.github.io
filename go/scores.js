/* gt-scores — the class points system, shared by the module decks'
   top-of-the-class slides and the participants' /go/points page.

   Identity: each phone claims a name once (roster picker or typed) and the
   page posts it as a /say line to the gt-names room — the Worker stores the
   voter uuid alongside, so GET /p/gt-names/entries is the join table from
   anonymous voter ids to class names. Scores are then recomputed from the
   raw rooms every time: nothing is ever written back, so the poll rooms
   stay the only storage and a /reset between cohorts wipes the slate.

   WHICH GAMES COUNT lives here and nowhere else: edit MODULES to add or
   remove a scoring event. Skill games score; opinion polls and write-in
   walls never do. Display rule everywhere: top five, never a full ranking
   (each participant sees their own full detail privately on /go/points).

   Scoring kinds:
     consensus  — the common-knowledge rule: a question's top answer must
                  reach the threshold share; everyone in that group scores.
                  With maxPoints set, a name's matched questions scale to
                  that ceiling (15 matches = 5 points, rounded); with
                  points set, each match pays that flat amount.
     twothirds  — closest guess(es) to 2/3 of the average win.
     invest     — "name|round|i-or-d" lines; +$5 a round when the round's
                  investment rate clears 90%, −$10 when it doesn't, $0 out.
                  floorZero:true clips a negative event total to zero.
     mediandog  — the drawing room's median snout-to-tail span; the
                  three nearest distances take gold/silver/bronze
                  (podium points, ties share the medal).
     numbergame — first correct guess on attempt k earns 6−k points.
     centipede  — "taker|other|turn" lines (the live game posts the
                  taker first), latest per pair; the taker earns the
                  pot ÷ 200 in points (turn 3 pays 2, a full run pays
                  5 to whoever it capped on). Ultimatum is deliberately
                  unscored — negotiation games never score, the m1
                  added-value precedent; modules aim at 10 points max.
     lastcard   — "winner|loser|leaves" lines, latest per pair; the
                  winner earns 5 points.
     enginegame — the m3 pitch lines; the side ahead over the pair's
                  rounds earns winPoints, a dead heat pays nobody.
     pricewars  — m4 lock-ins + the deck's "::shock|on" marker; each match
                  scored on the LOWER of its two totals against bands
                  (130→10, 80→3, 50→1), paid to every name that claimed
                  the station in the teams room. Bands are revealed only
                  after the game — the brief says "win as much as you can". */

const GT_SCORES = (() => {
  const API = 'https://gt-poll.rlamare.workers.dev';

  const MODULES = [
    {
      id: 'm1',
      title: 'Introduction',
      events: [
        { key: 'dog', label: 'The median dog', kind: 'mediandog', room: 'm1-dog', podium: [5, 3, 1] },
        { key: 'number', label: 'The number game', kind: 'numbergame', room: 'm1-number' },
      ],
    },
    {
      id: 'm2',
      title: 'Sequential Strategies',
      events: [
        { key: 'lastcard', label: 'Take the last card', kind: 'lastcard', room: 'm2-lastcard' },
        { key: 'centipede', label: 'The centipede game', kind: 'centipede', room: 'm2-centipede' },
      ],
    },
    {
      id: 'm3',
      title: 'Zero-Sum Games',
      events: [
        /* the Tapas engine game: whoever comes out ahead in their pair over
           the four rounds takes 5; a dead heat pays nobody */
        { key: 'engine', label: 'Engine game', kind: 'enginegame', room: 'm3-engine', winPoints: 5 },
      ],
    },
    {
      id: 'm4',
      title: 'Prisoner\u2019s Dilemmas',
      events: [
        /* Price Wars: a match is scored on the LOWER of its two six-week
           totals (so exploiting a partner collapses your own score), in
           bands that are revealed only after the game. Under the week-5
           shock the true best ending (hold, then take turns undercutting
           in weeks 5 and 6) lands both stations on 134 and takes the full
           ten. Team membership comes from the m4-teams room. */
        { key: 'pricewars', label: 'Price Wars', kind: 'pricewars', room: 'm4-prices', teams: 'm4-teams',
          bands: [[130, 10], [80, 3], [50, 1]] },
      ],
    },
    {
      id: 'm5',
      title: 'Coordination Games',
      events: [
        { key: 'quiz', label: 'Quiz', kind: 'consensus', threshold: 0.9, maxPoints: 5,
          rooms: [
            { id: 'm5-k1', type: 'c' }, { id: 'm5-k2', type: 't' }, { id: 'm5-k3', type: 'c' },
            { id: 'm5-k4', type: 'c' }, { id: 'm5-k5', type: 't' }, { id: 'm5-k6', type: 't' },
            { id: 'm5-k7', type: 't' }, { id: 'm5-k8', type: 't' }, { id: 'm5-k9', type: 't' },
            { id: 'm5-k10', type: 'c' }, { id: 'm5-k11', type: 't' }, { id: 'm5-k12', type: 'c' },
            { id: 'm5-k13', type: 't' }, { id: 'm5-k14', type: 'c' }, { id: 'm5-k15', type: 'c' },
          ] },
        { key: 'twothirds', label: 'Two-thirds', kind: 'twothirds', room: 'm5-twothirds', winPoints: 5 },
        /* the investment game (m5-invest) is deliberately unscored: it is a
           whole-room trust game, and the module's ten points are already
           spoken for by its two skill games */
      ],
    },
  ];

  /* rooms that game pages write to directly (name-tagged /say lines, not
     polls.json polls) — listed here so the personal record can show them */
  const GAME_ROOMS = [
    { id: 'm1-dog', label: 'The median dog · Module 1', kind: 'draw' },
    { id: 'm1-number', label: 'I’m thinking of a number · Module 1', kind: 'guesses' },
    { id: 'm1-av', label: 'Added value, your offers · Module 1', kind: 'av' },
    { id: 'm2-lastcard', label: 'Take the last card · Module 2' },
    { id: 'm2-ultimatum', label: 'The ultimatum game · Module 2' },
    { id: 'm2-centipede', label: 'The centipede game · Module 2' },
    { id: 'm2-tapasguess', label: 'How many ways? · Module 2', solo: true },
    { id: 'm3-engine', label: 'The engine game · Module 3' },
    { id: 'm4-prices', label: 'Price Wars · Module 4' },
    { id: 'm5-invest', label: 'The investment game · Module 5' },
  ];

  const norm = s => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
  const j = url => fetch(API + url).then(r => r.json());

  /* voter uuid -> display name, later claims overriding earlier ones */
  async function loadClaims() {
    const d = await j('/p/gt-names/entries');
    const byVoter = new Map();
    (d.entries || []).forEach(e => { if (e.t) byVoter.set(e.v, String(e.t).trim()); });
    return byVoter;
  }

  /* latest entry per voter, in claim-table-friendly form */
  function latestPerVoter(entries) {
    const m = new Map();
    (entries || []).forEach(e => m.set(e.v, e.t));
    return m;
  }

  function addPoints(tally, name, eventKey, pts) {
    const key = norm(name);
    if (!key) return;
    if (!tally.has(key)) tally.set(key, { name, byEvent: {}, total: 0 });
    const row = tally.get(key);
    row.byEvent[eventKey] = (row.byEvent[eventKey] || 0) + pts;
    row.total += pts;
  }

  async function scoreConsensus(ev, claims, tally) {
    /* a name scores a question at most once, however many devices it has */
    const matches = new Map(); /* normalized name -> {name, n} */
    for (const room of ev.rooms) {
      let perVoter; /* voter -> normalized answer */
      if (room.type === 'c') {
        const d = await j('/p/' + room.id + '/votes');
        perVoter = new Map(Object.entries(d.votes || {}).map(([v, o]) => [v, 'o' + o]));
      } else {
        const d = await j('/p/' + room.id + '/entries');
        perVoter = new Map([...latestPerVoter(d.entries)].map(([v, t]) => [v, norm(t)]).filter(([, t]) => t));
      }
      if (!perVoter.size) continue;
      const counts = new Map();
      perVoter.forEach(a => counts.set(a, (counts.get(a) || 0) + 1));
      let top = null;
      counts.forEach((n, a) => { if (!top || n > counts.get(top)) top = a; });
      if (counts.get(top) / perVoter.size < ev.threshold) continue;
      const scoredNames = new Set();
      perVoter.forEach((a, v) => {
        const name = claims.get(v);
        if (name && a === top && !scoredNames.has(norm(name))) {
          scoredNames.add(norm(name));
          const m = matches.get(norm(name)) || { name, n: 0 };
          m.n++;
          matches.set(norm(name), m);
        }
      });
    }
    matches.forEach(m => {
      const pts = ev.maxPoints ? Math.round(m.n / ev.rooms.length * ev.maxPoints) : m.n * ev.points;
      if (pts > 0) addPoints(tally, m.name, ev.key, pts);
    });
  }

  async function scoreTwothirds(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/entries');
    const nums = [];
    latestPerVoter(d.entries).forEach((t, v) => {
      const n = parseInt(String(t).replace(/[^0-9-]/g, ''), 10);
      if (Number.isInteger(n) && n >= 0 && n <= 100) nums.push({ v, n });
    });
    if (!nums.length) return;
    const target = nums.reduce((a, x) => a + x.n, 0) / nums.length * 2 / 3;
    const best = Math.min(...nums.map(x => Math.abs(x.n - target)));
    const winners = new Set();
    nums.forEach(x => {
      if (Math.abs(x.n - target) !== best) return;
      const name = claims.get(x.v);
      if (name && !winners.has(norm(name))) { winners.add(norm(name)); addPoints(tally, name, ev.key, ev.winPoints); }
    });
  }

  async function scoreInvest(ev, claims, tally) {
    /* names ride inside the lines, no voter join needed */
    const d = await j('/p/' + ev.room + '/answers');
    const players = new Map();
    (d.answers || []).forEach(t => {
      const m = String(t).match(/^(.{1,40}?)\s*\|\s*([1-8])\s*\|\s*([id])$/i);
      if (!m) return;
      const key = norm(m[1]);
      if (!players.has(key)) players.set(key, { name: m[1].trim(), rounds: ['', '', '', ''] });
      players.get(key).rounds[+m[2] - 1] = m[3].toLowerCase();
    });
    if (!players.size) return;
    for (let r = 0; r < 4; r++) {
      let inN = 0, part = 0;
      players.forEach(p => { const c = p.rounds[r]; if (c) { part++; if (c === 'i') inN++; } });
      if (!part) continue;
      const pays = inN / part >= 0.9;
      players.forEach(p => {
        if (p.rounds[r] === 'i') addPoints(tally, p.name, ev.key, pays ? 5 : -10);
      });
    }
    if (ev.floorZero) {
      tally.forEach(row => {
        const v = row.byEvent[ev.key];
        if (v < 0) { row.total -= v; row.byEvent[ev.key] = 0; }
      });
    }
  }

  /* centipede: the live game posts the taker first; the FIRST finished game
     per (unordered) pair counts, so a replay after the solution can't farm
     points; the taker earns the pot ÷ 200 in points
     (max 5) and the other player nothing — no negatives */
  async function scoreCentipede(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const byPair = new Map();
    (d.answers || []).forEach(t => {
      const p = String(t).split('|').map(s => s.trim());
      if (p.length !== 3 || !p[0] || !p[1] || !/^(10|[1-9])$/.test(p[2])) return;
      const k = [norm(p[0]), norm(p[1])].sort().join('~');
      if (!byPair.has(k)) byPair.set(k, { taker: p[0], turn: +p[2] });
    });
    byPair.forEach(g => addPoints(tally, g.taker, ev.key, Math.max(1, Math.round(g.turn / 2))));
  }

  /* take the last card: winner first, the FIRST finished game per pair
     counts (the solution slide follows the game, so replays don't score);
     a flat 5 points to the winner */
  async function scoreLastcard(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const byPair = new Map();
    (d.answers || []).forEach(t => {
      const p = String(t).split('|').map(s => s.trim());
      if (p.length !== 3 || !p[0] || !p[1]) return;
      const k = [norm(p[0]), norm(p[1])].sort().join('~');
      if (!byPair.has(k)) byPair.set(k, p[0]);
    });
    byPair.forEach(winner => addPoints(tally, winner, ev.key, 5));
  }

  /* the median dog: spans from the stroke data (bbox width, exactly as
     the deck's kennel computes it), median of spans (average of the two
     middles when even). The podium: the three distinct distances nearest
     the median take gold, silver, bronze (ev.podium points, ties share
     the medal); a name takes only its best medal */
  async function scoreDog(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/draws');
    const dogs = (d.draws || []).map(x => {
      let mn = 300, mx = 0;
      String(x.d).split(';').forEach(s => s.split(' ').forEach(pt => {
        const px = parseInt(pt.split(',')[0], 10);
        if (Number.isFinite(px)) { mn = Math.min(mn, px); mx = Math.max(mx, px); }
      }));
      return { v: x.v, n: x.n, s: Math.max(0, mx - mn) };
    }).sort((a, b) => a.s - b.s);
    if (!dogs.length) return;
    const nD = dogs.length;
    const target = nD % 2 ? dogs[(nD - 1) / 2].s : (dogs[nD / 2 - 1].s + dogs[nD / 2].s) / 2;
    const pts = ev.podium || [5, 3, 1];
    const dists = [...new Set(dogs.map(g => Math.abs(g.s - target)))].sort((a, b) => a - b).slice(0, pts.length);
    const scored = new Set();
    dogs.sort((a, b) => Math.abs(a.s - target) - Math.abs(b.s - target)).forEach(g => {
      const ti = dists.indexOf(Math.abs(g.s - target));
      if (ti < 0) return;
      const name = g.n || claims.get(g.v);
      if (!name || scored.has(norm(name))) return;
      scored.add(norm(name));
      addPoints(tally, name, ev.key, pts[ti]);
    });
  }

  /* the number game: first correct guess on attempt k earns 6-k points
     (5 for a first-guess bullseye, 1 for cracking it on the fifth) */
  async function scoreNumber(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/guesses');
    const byVoter = new Map();
    (d.guesses || []).forEach(x => {
      if (!byVoter.has(x.v)) byVoter.set(x.v, []);
      byVoter.get(x.v).push(x);
    });
    const scored = new Set();
    byVoter.forEach((list, v) => {
      const k = list.findIndex(x => x.r === 'correct');
      if (k < 0) return;
      const name = list[k].n || claims.get(v);
      if (!name || scored.has(norm(name))) return;
      scored.add(norm(name));
      addPoints(tally, name, ev.key, Math.max(1, 6 - (k + 1)));
    });
  }

  /* the engine game: "aurora|borealis|r|a-or-b|p-t-s-c" lines (names ride
     inside), latest per pair+round+seat; a pair's rounds add up Aurora's
     share against 50 a round, and the side ahead takes winPoints */
  const ENGINE_SHARE = [[50, 55, 40, 70], [45, 50, 45, 65], [60, 55, 50, 60], [30, 35, 40, 50]];
  const ENGINE_MK = { p: 0, t: 1, s: 2, c: 3 };
  async function scoreEngine(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const latest = new Map(); /* pair|round|seat -> move */
    (d.answers || []).forEach(t => {
      const p = String(t).split('|').map(x => x.trim());
      if (p.length !== 5 || !p[0] || !p[1] || !/^\d{1,2}$/.test(p[2]) || !/^[ab]$/.test(p[3]) || !/^[ptsc]$/.test(p[4])) return;
      const key = [norm(p[0]), norm(p[1])].sort().join('~');
      latest.set(key + '|' + p[2] + '|' + p[3], { A: p[0], B: p[1], r: +p[2], seat: p[3], m: p[4] });
    });
    const pairs = new Map(); /* pair -> {A,B,rounds:{r:{a,b}}} */
    latest.forEach(m => {
      const key = [norm(m.A), norm(m.B)].sort().join('~');
      if (!pairs.has(key)) pairs.set(key, { A: m.A, B: m.B, rounds: {} });
      const pr = pairs.get(key);
      if (pr.rounds[m.r] === undefined) pr.rounds[m.r] = {};
      pr.rounds[m.r][m.seat] = m.m;
    });
    pairs.forEach(pr => {
      let sum = 0, n = 0;
      Object.values(pr.rounds).forEach(rd => { if (rd.a && rd.b) { sum += ENGINE_SHARE[ENGINE_MK[rd.a]][ENGINE_MK[rd.b]]; n++; } });
      if (!n) return;
      if (sum > 50 * n) addPoints(tally, pr.A, ev.key, ev.winPoints);
      else if (sum < 50 * n) addPoints(tally, pr.B, ev.key, ev.winPoints);
    });
  }

  /* Price Wars: "station|week|price" lines, latest per station+week, and
     a "::shock|on" marker from the deck when the week-5 shock is in play.
     Each match (a1+b1 … a4+b4) is scored on the lower of its two totals,
     and every name that claimed a station in the teams room ("station|name")
     takes that station's points */
  function pwProfit(mine, theirs, week, shock) {
    if (shock && week >= 5) {
      if (mine === '1.40' && theirs === '1.50') return 72;
      if (mine === '1.50' && theirs === '1.40') return 2;
      return mine === '1.50' ? 12 : 9;
    }
    const dbl = (week === 3 || week === 6) ? 2 : 1;
    if (mine === '1.50') return (theirs === '1.50' ? 12 : 2) * dbl;
    return (theirs === '1.50' ? 18 : 9) * dbl;
  }
  async function scorePricewars(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const price = {}; let shock = false;
    (d.answers || []).forEach(t => {
      const s = String(t).trim().toLowerCase();
      const sm = s.match(/^::shock\|(on|off)$/);
      if (sm) { shock = sm[1] === 'on'; return; }
      const m = s.match(/^([ab][1-4])\s*\|\s*([1-6])\s*\|\s*(1\.[45]0)$/);
      if (m) price[m[1] + '|' + m[2]] = m[3];
    });
    const total = st => { let sum = 0, weeks = 0; const mate = (st[0] === 'a' ? 'b' : 'a') + st[1];
      for (let w = 1; w <= 6; w++) { const mine = price[st + '|' + w], theirs = price[mate + '|' + w];
        if (mine && theirs) { sum += pwProfit(mine, theirs, w, shock); weeks++; } }
      return weeks ? sum : null; };
    const pts = {};
    for (let i = 1; i <= 4; i++) {
      const a = total('a' + i), b = total('b' + i);
      if (a === null || b === null) continue;
      const floor = Math.min(a, b);
      let p = 0; for (const [at, v] of ev.bands) { if (floor >= at) { p = v; break; } }
      pts['a' + i] = p; pts['b' + i] = p;
    }
    const td = await j('/p/' + ev.teams + '/answers');
    const member = new Map(); /* name -> station, latest wins */
    (td.answers || []).forEach(t => {
      const m = String(t).match(/^([ab][1-4])\s*\|\s*(.{1,40}?)$/i);
      if (m) member.set(norm(m[2]), { name: m[2].trim(), st: m[1].toLowerCase() });
    });
    member.forEach(({ name, st }) => { if (pts[st]) addPoints(tally, name, ev.key, pts[st]); });
  }

  /* -> {players:[{name, byEvent, total}] desc, events:[{key,label}]} */
  async function load() {
    const claims = await loadClaims();
    const tally = new Map();
    const events = [];
    for (const mod of MODULES) {
      for (const ev of mod.events) {
        events.push({ key: ev.key, label: ev.label });
        if (ev.kind === 'consensus') await scoreConsensus(ev, claims, tally);
        else if (ev.kind === 'twothirds') await scoreTwothirds(ev, claims, tally);
        else if (ev.kind === 'invest') await scoreInvest(ev, claims, tally);
        else if (ev.kind === 'numbergame') await scoreNumber(ev, claims, tally);
        else if (ev.kind === 'centipede') await scoreCentipede(ev, claims, tally);
        else if (ev.kind === 'lastcard') await scoreLastcard(ev, claims, tally);
        else if (ev.kind === 'mediandog') await scoreDog(ev, claims, tally);
        else if (ev.kind === 'enginegame') await scoreEngine(ev, claims, tally);
        else if (ev.kind === 'pricewars') await scorePricewars(ev, claims, tally);
      }
    }
    const players = [...tally.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    return { players, events };
  }

  /* every room the active scoring config draws from */
  function scoringRoomIds() {
    const ids = new Set();
    MODULES.forEach(mod => mod.events.forEach(ev => {
      if (ev.rooms) ev.rooms.forEach(r => ids.add(r.id));
      if (ev.room) ids.add(ev.room);
      if (ev.teams) ids.add(ev.teams);
    }));
    return ids;
  }

  function gameLine(id, t, nkey) {
    const p = String(t).split('|').map(s => s.trim());
    if (id === 'm5-invest') return 'R' + p[1] + ': ' + (p[2] === 'i' ? 'invested' : 'sat out');
    if (id === 'm3-engine') {
      if (p[4] === 'j') return 'paired with ' + (norm(p[0]) === nkey ? p[1] : p[0]);
      const M = { p: 'cut the price', t: 'promised better terms', s: 'solved a concern', c: 'charmed the board' };
      const mine = (norm(p[0]) === nkey) === (p[3] === 'a');
      return 'round ' + p[2] + ': ' + (mine ? 'you ' : (norm(p[0]) === nkey ? p[1] : p[0]) + ' ') + (M[p[4]] || p[4]);
    }
    if (id === 'm2-ultimatum') {
      const me = norm(p[0]) === nkey;
      return (me ? 'offered £' + p[2] + ' to ' + p[1] : 'offered £' + p[2] + ' by ' + p[0]) +
        (p[3] === 'a' ? ' — accepted' : ' — rejected');
    }
    if (id === 'm2-centipede') {
      const took = norm(p[0]) === nkey;
      return 'with ' + (took ? p[1] : p[0]) +
        (p[2] === '10' ? ' — it ran to £1,000' : ' — ' + (took ? 'you' : 'they') + ' took £' + (+p[2] * 100) + ' at turn ' + p[2]);
    }
    if (id === 'm2-lastcard') return norm(p[0]) === nkey ? 'took the last card against ' + p[1] : 'played ' + p[0] + ' — they took the last card';
    if (id === 'm2-tapasguess') return 'guessed ' + (+p[1]).toLocaleString('en-GB') + ' (the answer: 755,476)';
    if (id === 'm1-av') {
      if (p[1] === 'o') return 'offered to keep $' + p[2];
      if (p[1] === 'd') return '$' + p[2] + (p[3] === 'a' ? ' accepted' : ' rejected') + (p[4] === '2' ? ' (three cards lost)' : ' (equal cards)');
    }
    return t;
  }

  /* one phone's full answer record, session order, scored rooms flagged.
     Choice and write-in answers are found by this phone's voter id; game
     lines by the claimed name. */
  async function myHistory(voter, name) {
    const cfg = await fetch('/go/polls.json').then(r => r.json());
    const scoring = scoringRoomIds();
    const nkey = norm(name || '');
    const items = [];
    for (const [id, poll] of Object.entries(cfg.polls)) {
      try {
        if (poll.type === 'text') {
          const d = await j('/p/' + id + '/entries');
          let mine = (d.entries || []).filter(e => e.v === voter).map(e => e.t);
          if (poll.once && mine.length) mine = [mine[mine.length - 1]];
          if (mine.length) items.push({ id, q: poll.q, answer: mine.join(' · '), scored: scoring.has(id) });
        } else {
          const d = await j('/p/' + id + '/votes');
          const o = d.votes ? d.votes[voter] : undefined;
          if (o !== undefined && poll.options[o]) items.push({ id, q: poll.q, answer: poll.options[o].t, scored: scoring.has(id) });
        }
      } catch (_) { /* one unreachable room never hides the rest */ }
    }
    if (nkey) {
      for (const g of GAME_ROOMS) {
        try {
          if (g.kind === 'guesses') {
            const d = await j('/p/' + g.id + '/guesses');
            const mine = (d.guesses || []).filter(x => x.v === voter);
            if (mine.length) {
              const parts = mine.map(x => x.g + (x.r === 'correct' ? ' (correct!)' : (x.r === 'high' ? ' (too high)' : ' (too low)')));
              items.push({ id: g.id, q: g.label, answer: parts.join(' · '), scored: scoring.has(g.id) });
            }
            continue;
          }
          if (g.kind === 'draw') {
            const d = await j('/p/' + g.id + '/draws');
            const mine = (d.draws || []).find(x => x.v === voter);
            if (mine) {
              let mn = 300, mx = 0;
              String(mine.d).split(/[; ]/).forEach(pt => {
                const x = parseInt(pt.split(',')[0], 10);
                if (Number.isFinite(x)) { mn = Math.min(mn, x); mx = Math.max(mx, x); }
              });
              items.push({ id: g.id, q: g.label, answer: 'dog submitted — snout to tail ' + Math.max(0, mx - mn), scored: scoring.has(g.id) });
            }
            continue;
          }
          const d = await j('/p/' + g.id + '/answers');
          let mine = (d.answers || []).filter(t => String(t).split('|').slice(0, 2).some(s => norm(s) === nkey));
          /* the games are latest-line-wins: collapse to the line that counts */
          if (g.kind !== 'av') {
            const latest = new Map();
            mine.forEach(t => {
              const p = String(t).split('|').map(s => norm(s));
              const key = g.solo ? p[0] : g.id === 'm5-invest' ? p[1] : [p[0], p[1]].sort().join('~');
              latest.set(key, t);
            });
            mine = [...latest.values()];
          }
          if (mine.length) items.push({ id: g.id, q: g.label, answer: mine.map(t => gameLine(g.id, t, nkey)).join(' · '), scored: scoring.has(g.id) });
        } catch (_) {}
      }
    }
    return items;
  }

  async function claimName(name, voter) {
    return fetch(API + '/p/gt-names/say', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ t: String(name).trim().slice(0, 40), v: voter }),
    });
  }

  return { load, claimName, myHistory, scoringRoomIds, MODULES, GAME_ROOMS, API };
})();
