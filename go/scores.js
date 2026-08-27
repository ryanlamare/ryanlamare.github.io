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
     twothirds  — closest guess(es) to 2/3 of the average win.
     invest     — "name|round|i-or-d" lines; +$5 a round when the round's
                  investment rate clears 90%, −$10 when it doesn't, $0 out.
                  floorZero:true clips a negative event total to zero.
     mediandog  — the drawing room's median snout-to-tail span; the
                  three nearest distances take gold/silver/bronze
                  (podium points, ties share the medal).
     numbergame — first correct guess on attempt k earns 6−k points.
     ultimatum  — "prop|resp|offer|a-or-r" lines, latest per pair; an
                  accepted deal pays each player their share in £ ÷ 100
                  (rounded, minimum 1), a rejected one pays nobody —
                  the game's own lesson, priced in points.
     centipede  — "taker|other|turn" lines (the live game posts the
                  taker first), latest per pair; the taker earns the
                  pot in points (£ ÷ 100, so turn 3 pays 3 and a full
                  run pays whoever it capped on 10).
     lastcard   — "winner|loser|leaves" lines, latest per pair; the
                  winner earns 3 points. */

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
        { key: 'ultimatum', label: 'The ultimatum game', kind: 'ultimatum', room: 'm2-ultimatum' },
        { key: 'centipede', label: 'The centipede game', kind: 'centipede', room: 'm2-centipede' },
      ],
    },
    {
      id: 'm5',
      title: 'Coordination Games',
      events: [
        { key: 'quiz', label: 'Quiz', kind: 'consensus', threshold: 0.9, points: 1,
          rooms: [
            { id: 'm5-k1', type: 'c' }, { id: 'm5-k2', type: 't' }, { id: 'm5-k3', type: 'c' },
            { id: 'm5-k4', type: 'c' }, { id: 'm5-k5', type: 't' }, { id: 'm5-k6', type: 't' },
            { id: 'm5-k7', type: 't' }, { id: 'm5-k8', type: 't' }, { id: 'm5-k9', type: 't' },
            { id: 'm5-k10', type: 'c' }, { id: 'm5-k11', type: 't' }, { id: 'm5-k12', type: 'c' },
            { id: 'm5-k13', type: 't' }, { id: 'm5-k14', type: 'c' }, { id: 'm5-k15', type: 'c' },
          ] },
        { key: 'twothirds', label: 'Two-thirds', kind: 'twothirds', room: 'm5-twothirds', winPoints: 5 },
        { key: 'invest', label: 'Investment', kind: 'invest', room: 'm5-invest', floorZero: false },
      ],
    },
  ];

  /* rooms that game pages write to directly (name-tagged /say lines, not
     polls.json polls) — listed here so the personal record can show them */
  const GAME_ROOMS = [
    { id: 'm1-dog', label: 'The median dog · Module 1', kind: 'draw' },
    { id: 'm1-number', label: 'I’m thinking of a number · Module 1', kind: 'guesses' },
    { id: 'm1-av', label: 'Added values, your offers · Module 1', kind: 'av' },
    { id: 'm2-lastcard', label: 'Take the last card · Module 2' },
    { id: 'm2-ultimatum', label: 'The ultimatum game · Module 2' },
    { id: 'm2-centipede', label: 'The centipede game · Module 2' },
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
          addPoints(tally, name, ev.key, ev.points);
        }
      });
    }
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
      const m = String(t).match(/^(.{1,40}?)\s*\|\s*([1-4])\s*\|\s*([id])$/i);
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

  /* the ultimatum game: names ride inside the lines, no voter join
     needed. Latest line per (unordered) pair wins, mirroring the deck;
     an accepted deal pays both sides their share, a rejection pays
     nobody. A name playing in several pairs sums its deals. */
  async function scoreUltimatum(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const byPair = new Map();
    (d.answers || []).forEach(t => {
      const p = String(t).split('|').map(s => s.trim());
      if (p.length !== 4 || !p[0] || !p[1] || !/^\d{1,4}$/.test(p[2]) || +p[2] > 1000 || !/^[ar]$/i.test(p[3])) return;
      byPair.set([norm(p[0]), norm(p[1])].sort().join('~'),
        { prop: p[0], resp: p[1], offer: +p[2], res: p[3].toLowerCase() });
    });
    byPair.forEach(g => {
      if (g.res !== 'a') return;
      addPoints(tally, g.prop, ev.key, Math.max(1, Math.round((1000 - g.offer) / 100)));
      addPoints(tally, g.resp, ev.key, Math.max(1, Math.round(g.offer / 100)));
    });
  }

  /* centipede: the live game posts the taker first, latest line per
     (unordered) pair wins; the taker earns the pot in points and the
     other player nothing — no negatives */
  async function scoreCentipede(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const byPair = new Map();
    (d.answers || []).forEach(t => {
      const p = String(t).split('|').map(s => s.trim());
      if (p.length !== 3 || !p[0] || !p[1] || !/^(10|[1-9])$/.test(p[2])) return;
      byPair.set([norm(p[0]), norm(p[1])].sort().join('~'), { taker: p[0], turn: +p[2] });
    });
    byPair.forEach(g => addPoints(tally, g.taker, ev.key, g.turn));
  }

  /* take the last card: winner first, latest line per pair; a flat
     3 points to the winner */
  async function scoreLastcard(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const byPair = new Map();
    (d.answers || []).forEach(t => {
      const p = String(t).split('|').map(s => s.trim());
      if (p.length !== 3 || !p[0] || !p[1]) return;
      byPair.set([norm(p[0]), norm(p[1])].sort().join('~'), p[0]);
    });
    byPair.forEach(winner => addPoints(tally, winner, ev.key, 3));
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
        else if (ev.kind === 'ultimatum') await scoreUltimatum(ev, claims, tally);
        else if (ev.kind === 'centipede') await scoreCentipede(ev, claims, tally);
        else if (ev.kind === 'lastcard') await scoreLastcard(ev, claims, tally);
        else if (ev.kind === 'mediandog') await scoreDog(ev, claims, tally);
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
    }));
    return ids;
  }

  function gameLine(id, t, nkey) {
    const p = String(t).split('|').map(s => s.trim());
    if (id === 'm5-invest') return 'R' + p[1] + ': ' + (p[2] === 'i' ? 'invested' : 'sat out');
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
              const key = g.id === 'm5-invest' ? p[1] : [p[0], p[1]].sort().join('~');
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
