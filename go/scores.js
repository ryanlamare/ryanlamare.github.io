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
        { key: 'quiz', label: 'Quiz', kind: 'consensus', threshold: 0.8, maxPoints: 5,
          rooms: [
            { id: 'm5-k1', type: 'c' }, { id: 'm5-k2', type: 't' }, { id: 'm5-k3', type: 'c' },
            { id: 'm5-k4', type: 'c' }, { id: 'm5-k5', type: 't' }, { id: 'm5-k6', type: 't' },
            { id: 'm5-k7', type: 't' }, { id: 'm5-k8', type: 't' }, { id: 'm5-k9', type: 't' },
            { id: 'm5-k10', type: 'c' }, { id: 'm5-k11', type: 't' }, { id: 'm5-k12', type: 'c' },
            { id: 'm5-k13', type: 'c' }, { id: 'm5-k14', type: 'c' }, { id: 'm5-k15', type: 'c' }, { id: 'm5-k16', type: 'c' },
          ] },
        { key: 'twothirds', label: 'Two-thirds', kind: 'twothirds', room: 'm5-twothirds', winPoints: 5 },
        /* the investment game (m5-invest) is deliberately unscored: it is a
           whole-room trust game, and the module's ten points are already
           spoken for by its two skill games */
      ],
    },
    {
      id: 'm6',
      title: 'Mixed Strategies',
      events: [
        /* the penalty shootout: ten kicks each, taken in turns, a point for
           every two goals you score as the striker (goalsPerPoint); five is
           the most anyone can take, which makes this the programme's
           five-point module. Beat the keeper (m6-solo) and rock, paper,
           scissors (m6-rps) are played for what they show, not for points. */
        { key: 'shootout', label: 'Shootout', kind: 'shootout', room: 'm6-pk', goalsPerPoint: 2 },
        /* the inspection game (m6-inspect) is deliberately unscored: it is
           played to see what a regulator is up against, and a prize for
           skipping safety steps would reward the wrong thing (Ryan, 5 Sep
           2026). scoreInspection stays below in case that ever changes */
        /* the boss battle: the top scorers take one kick each against the
           instructor on the big screen; a goal is a bonus point (only a
           name's first kick counts) */
        { key: 'boss', label: 'Boss battle', kind: 'bossbattle', room: 'm6-vs', points: 1 },
      ],
    },
    {
      id: 'm7',
      title: 'Credibility, Commitment, and Strategic Moves',
      events: [
        /* chicken in pairs, six rounds, the wheel from round four: the
           driver ahead on total payoff takes winPoints; a dead heat pays
           nobody. The added value game (m1-av) is a negotiation game and
           stays unscored, as in Module 1 */
        { key: 'chicken', label: 'Chicken', kind: 'chicken', room: 'm7-chicken', winPoints: 5 },
        /* split or steal: only round 2, the strategic-move round, counts.
           Anyone who ends the round with half the pot (both split, or a
           steal followed by handing over half) takes sharePoints; the
           mover who used the move and then split anyway, or who stole and
           handed over half, takes bonusPoints on top. A steal that keeps
           the lot pays nothing on this board (Ryan's rule: never a reward
           for the wrong thing) */
        { key: 'gb', label: 'Split or steal', kind: 'goldenballs', room: 'm7-gb', sharePoints: 3, bonusPoints: 2 },
        /* the committed penalty is played by the instructor on the big
           screen, no room. The stag hunt (m7-stag) was built as a control
           for split or steal and cut from the deck */
        /* the auction: the winner takes the pot and pays their bid, the
           runner-up pays their bid for nothing — in POINTS, which is the
           whole trap. minPoints caps how far one auction can drag anyone */
        { key: 'auction', label: 'Auction', kind: 'auction', room: 'm7-auction', pot: 10, minPoints: -10 },
      ],
    },
    {
      id: 'm8',
      title: 'Information Asymmetries',
      events: [
        /* Hidden Agenda, the capstone: two tables play at once (one room
           each), and everyone on the winning side of their table takes
           winPoints — the same ten as Price Wars, because it is the last
           game of the programme. The car market (m8-market) is played for
           what it shows and stays unscored. Roles come from the Worker's
           /cs/board, which only reveals them once a table is over. */
        { key: 'closed', label: 'Hidden Agenda', kind: 'closedsession', rooms: [{ id: 'm8-cs-tapas' }, { id: 'm8-cs-granito' }], winPoints: 10 },
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
    { id: 'm6-solo', label: 'Beat the keeper · Module 6', solo: true },
    { id: 'm6-pk', label: 'The penalty shootout · Module 6' },
    { id: 'm6-vs', label: 'Boss battle · Module 6', solo: true },
    { id: 'm6-inspect', label: 'The inspection game · Module 6' },
    { id: 'm6-rps', label: 'Rock, paper, scissors · Module 6' },
    { id: 'm7-chicken', label: 'Chicken · Module 7' },
    { id: 'm7-gb', label: 'Split or steal · Module 7' },
    { id: 'm7-auction', label: 'The auction · Module 7', solo: true },
    { id: 'm8-market', label: 'The car market · Module 8', kind: 'market' },
    { id: 'm8-cs-tapas', label: 'Hidden Agenda, the Tapas table · Module 8', kind: 'cs' },
    { id: 'm8-cs-granito', label: 'Hidden Agenda, the Granito table · Module 8', kind: 'cs' },
  ];

  const norm = s => String(s).trim().toLowerCase().replace(/\s+/g, ' ');

  /* answers that mean the same thing count together: accents and punctuation
   dropped, a leading "the" ignored, digit-only answers compared without
   spaces ("50 - 50" is "50/50"), and a shorter answer joins a longer one
   that contains it as whole words ("Kelce" joins "Travis Kelce") */
  function fuzzyKey(t,room){
  let s=String(t).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  s=s.replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  s=s.replace(/^(the|a|an) /,'');
  /* the two piles: "50 50", "50/50", "50-50", "fifty fifty", "50 and 50" and a bare "50"
     are all the same split; the pair is keyed larger pile first */
  if(room==='m5-k11'){
    const w=s.replace(/\bfifty\b/g,'50').replace(/\bhundred\b/g,'100').replace(/\bzero\b/g,'0');
    const nums=(w.match(/\d+/g)||[]).map(Number);
    if(nums.length===2&&nums[0]+nums[1]===100)return Math.max(...nums)+'-'+Math.min(...nums);
    if(nums.length===1&&nums[0]>=0&&nums[0]<=100)return Math.max(nums[0],100-nums[0])+'-'+Math.min(nums[0],100-nums[0]);
  }
  if(/^[\d\s]+$/.test(s))s=s.replace(/\s/g,'');
  return s;
}
  function fuzzyGroups(counts){
  const keys=[...counts.keys()].sort((a,b)=>counts.get(b)-counts.get(a)||a.length-b.length);
  const groupOf=new Map(), reps=[];
  const contains=(a,b)=>a===b||(' '+a+' ').includes(' '+b+' ');
  keys.forEach(k=>{
    const rep=reps.find(r=>contains(r,k)||contains(k,r));
    if(rep)groupOf.set(k,rep);else{reps.push(k);groupOf.set(k,k);}
  });
  return groupOf;
}

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
        perVoter = new Map([...latestPerVoter(d.entries)].map(([v, t]) => [v, fuzzyKey(t, room.id)]).filter(([, t]) => t));
        /* spellings that mean the same answer count as one (see fuzzyKey) */
        const raw = new Map();
        perVoter.forEach(a => raw.set(a, (raw.get(a) || 0) + 1));
        const groupOf = fuzzyGroups(raw);
        perVoter = new Map([...perVoter].map(([v, a]) => [v, groupOf.get(a)]));
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

  /* the penalty shootout: "A|B|n|seat|l-or-r" lines, twenty kicks taken in
     turns (A kicks the odd ones, B the even ones — ten each). The rule is
     the phones' rule (MUST match m6/game/pk.js): a keeper who dives the
     way the ball goes saves it, otherwise it is a goal. The striker earns a
     point per goalsPerPoint goals. Join and kit lines (n = 0) carry no move. */
  function h01(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  const pkGoal = (key, n, kick, dive) => kick !== dive;
  async function scoreShootout(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const latest = new Map(); /* pair|n|seat -> move */
    (d.answers || []).forEach(t => {
      const p = String(t).split('|').map(x => x.trim());
      if (p.length !== 5 || !p[0] || !p[1] || !/^[1-9]\d?$/.test(p[2]) || !/^[ab]$/.test(p[3]) || !/^[lr]$/.test(p[4])) return;
      const key = [norm(p[0]), norm(p[1])].sort().join('~');
      latest.set(key + '|' + p[2] + '|' + p[3], { A: p[0], B: p[1], key, n: +p[2], seat: p[3], x: p[4] });
    });
    const pairs = new Map();
    latest.forEach(m => {
      if (!pairs.has(m.key)) pairs.set(m.key, { A: m.A, B: m.B, kicks: {} });
      const pr = pairs.get(m.key);
      pr.kicks[m.n] = pr.kicks[m.n] || {};
      pr.kicks[m.n][m.seat] = m.x;
    });
    const per = ev.goalsPerPoint || 2;
    pairs.forEach(pr => {
      const key = [norm(pr.A), norm(pr.B)].sort().join('~');
      const goals = { a: 0, b: 0 };
      for (let n = 1; n <= 20; n++) {
        const k = pr.kicks[n]; if (!k || !k.a || !k.b) continue;
        const ks = n % 2 ? 'a' : 'b', kick = k[ks], dive = k[ks === 'a' ? 'b' : 'a'];
        if (pkGoal(key, n, kick, dive)) goals[ks]++;
      }
      const pa = Math.floor(goals.a / per), pb = Math.floor(goals.b / per);
      if (pa) addPoints(tally, pr.A, ev.key, pa);
      if (pb) addPoints(tally, pr.B, ev.key, pb);
    });
  }

  /* the boss battle: "::keeper|n|pos|name" calls a shooter up, "name|n|l-or-r"
     is their kick, "::dive|n|zone|pos0|pos1" is where the keeper ended up
     (the deck slides him in real time); a kick into any zone but the
     keeper's is a goal. One kick each: a name's first resolved kick pays
     ev.points if it went in, later kicks pay nothing */
  async function scoreBossBattle(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const keeper = {}, dive = {}, shots = {};
    (d.answers || []).forEach(t => {
      const p = String(t).split('|').map(x => x.trim());
      if (p[0] === '::keeper' && p.length === 4 && /^\d{1,3}$/.test(p[1])) keeper[+p[1]] = p[3];
      else if (p[0] === '::dive' && p.length === 5 && /^\d{1,3}$/.test(p[1]) && /^[lrc]$/.test(p[2])) dive[+p[1]] = p[2];
      else if (p.length === 3 && p[0] && p[0][0] !== ':' && /^[1-9]\d{0,2}$/.test(p[1]) && /^[lr]$/.test(p[2])) {
        shots[+p[1]] = shots[+p[1]] || {}; shots[+p[1]][norm(p[0])] = { name: p[0], kick: p[2] };
      }
    });
    const taken = new Set();
    Object.keys(dive).map(Number).sort((a, b) => a - b).forEach(n => {
      const who = keeper[n]; if (!who) return;
      const sh = shots[n] && shots[n][norm(who)]; if (!sh) return;
      if (taken.has(norm(who))) return;
      taken.add(norm(who));
      if (sh.kick !== dive[n]) addPoints(tally, who, ev.key, ev.points || 1);
    });
  }

  /* the inspection game: "A|B|n|seat|x" lines, eight rounds; seat a is the
     regulator for rounds 1-4 and seat b for rounds 5-8 (i = inspect,
     t = trust the paperwork); the other seat is the shop (f = full check,
     k = skip a step). Payoffs regulator-first, MUST match m6/game/. The
     name ahead on total payoff takes winPoints; a dead heat pays nobody */
  const INSPECT_PAY = { if: [-1, 0], ik: [4, -8], tf: [0, 0], tk: [-5, 2] };
  async function scoreInspection(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const latest = new Map();
    (d.answers || []).forEach(t => {
      const p = String(t).split('|').map(x => x.trim());
      if (p.length !== 5 || !p[0] || !p[1] || !/^[1-8]$/.test(p[2]) || !/^[ab]$/.test(p[3]) || !/^[itfk]$/.test(p[4])) return;
      const key = [norm(p[0]), norm(p[1])].sort().join('~');
      latest.set(key + '|' + p[2] + '|' + p[3], { A: p[0], B: p[1], key, n: +p[2], seat: p[3], x: p[4] });
    });
    const pairs = new Map();
    latest.forEach(m => {
      if (!pairs.has(m.key)) pairs.set(m.key, { A: m.A, B: m.B, r: {} });
      const pr = pairs.get(m.key);
      pr.r[m.n] = pr.r[m.n] || {};
      pr.r[m.n][m.seat] = m.x;
    });
    pairs.forEach(pr => {
      let tA = 0, tB = 0;
      for (let n = 1; n <= 8; n++) {
        const k = pr.r[n]; if (!k || !k.a || !k.b) continue;
        const rs = n <= 4 ? 'a' : 'b', reg = k[rs], shop = k[rs === 'a' ? 'b' : 'a'];
        const pay = INSPECT_PAY[reg + shop]; if (!pay) continue;
        if (rs === 'a') { tA += pay[0]; tB += pay[1]; } else { tB += pay[0]; tA += pay[1]; }
      }
      if (tA > tB) addPoints(tally, pr.A, ev.key, ev.winPoints);
      else if (tB > tA) addPoints(tally, pr.B, ev.key, ev.winPoints);
    });
  }

  /* chicken: "A|B|n|seat|x|t" lines, six rounds on a thirty-second clock:
     s = swerve, g = straight, and from round 4 w = the steering wheel
     thrown out of the window, which is a straight whatever else that
     driver sent. Not throwing needs no line (the retired k line is
     ignored). t = seconds taken, never a rule. Five-field lines are read
     without a time. Latest line per pair, round, seat and phase wins.
     Payoffs 0,0 / -10,+10 / +10,-10 / -100,-100; MUST match
     m7/game/chicken.js. The driver ahead on total takes winPoints; a dead
     heat pays nobody */
  const CHICKEN_PAY = { ss: [0, 0], sg: [-10, 10], gs: [10, -10], gg: [-100, -100] };
  async function scoreChicken(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const pairs = new Map();
    (d.answers || []).forEach(t => {
      const p = String(t).split('|').map(x => x.trim());
      if ((p.length !== 5 && p.length !== 6) || !p[0] || !p[1] || !/^[1-6]$/.test(p[2]) || !/^[ab]$/.test(p[3]) || !/^[sgw]$/.test(p[4])) return;
      if (p[4] === 'w' && +p[2] < 4) return;
      const key = [norm(p[0]), norm(p[1])].sort().join('~');
      if (!pairs.has(key)) pairs.set(key, { A: p[0], B: p[1], r: {} });
      const pr = pairs.get(key), n = +p[2];
      pr.r[n] = pr.r[n] || { a: {}, b: {} };
      if (p[4] === 'w') pr.r[n][p[3]].w = true; else pr.r[n][p[3]].d = p[4];
    });
    pairs.forEach(pr => {
      let tA = 0, tB = 0;
      for (let n = 1; n <= 6; n++) {
        const r = pr.r[n]; if (!r) continue;
        const a = r.a.w ? 'g' : r.a.d, b = r.b.w ? 'g' : r.b.d;
        if (!a || !b) continue;
        const pay = CHICKEN_PAY[a + b]; if (!pay) continue;
        tA += pay[0]; tB += pay[1];
      }
      if (tA > tB) addPoints(tally, pr.A, ev.key, ev.winPoints);
      else if (tB > tA) addPoints(tally, pr.B, ev.key, ev.winPoints);
    });
  }

  /* split or steal: "A|B|n|seat|x" lines, two rounds; s/t = split/steal,
     seat b in round 2 first posts n/q (used the move or not) and, after a
     steal against a split, h/k (handed over half or kept it). Latest per
     pair, round, seat and phase. MUST match m7/game/moves.js (GB) */
  async function scoreGoldenballs(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const PH = { s: 'd', t: 'd', n: 'c', q: 'c', h: 'e', k: 'e' };
    const pairs = new Map();
    (d.answers || []).forEach(t => {
      const p = String(t).split('|').map(x => x.trim());
      if (p.length !== 5 || !p[0] || !p[1] || !/^[12]$/.test(p[2]) || !/^[ab]$/.test(p[3]) || !PH[p[4]]) return;
      const key = [norm(p[0]), norm(p[1])].sort().join('~');
      if (!pairs.has(key)) pairs.set(key, { A: p[0], B: p[1], r: {} });
      const pr = pairs.get(key), n = +p[2];
      pr.r[n] = pr.r[n] || { a: {}, b: {} };
      pr.r[n][p[3]][PH[p[4]]] = p[4];
    });
    const share = ev.sharePoints || 3, bonus = ev.bonusPoints || 2;
    pairs.forEach(pr => {
      const r = pr.r[2]; if (!r || !r.b.c || !r.a.d || !r.b.d) return;
      let mA = 0, mB = 0, hand;
      if (r.a.d === 's' && r.b.d === 's') { mA = 500; mB = 500; }
      else if (r.a.d === 't' && r.b.d === 's') { mA = 1000; }
      else if (r.a.d === 's' && r.b.d === 't') { if (!r.b.e) return; hand = r.b.e; if (hand === 'h') { mA = 500; mB = 500; } else mB = 1000; }
      if (mA === 500) addPoints(tally, pr.A, ev.key, share);
      if (mB === 500) addPoints(tally, pr.B, ev.key, share);
      if (r.b.c === 'n' && r.b.d === 's') addPoints(tally, pr.B, ev.key, bonus);
      if (r.b.d === 't' && hand === 'h') addPoints(tally, pr.B, ev.key, bonus);
    });
  }

  /* the auction, live: "name|amount" bids in the order they landed and a
     "::sold" marker from the deck; a name's standing bid is its highest; the
     top standing bid wins the pot and pays the bid, the next name pays its
     bid for nothing. Points can go negative here — that is the game — down
     to ev.minPoints. MUST match m7/game/moves.js (AUCTION) */
  async function scoreAuction(ev, claims, tally) {
    const d = await j('/p/' + ev.room + '/answers');
    const best = new Map();
    (d.answers || []).forEach((t, idx) => {
      const p = String(t).split('|').map(x => x.trim());
      if (p.length !== 2 || !p[0] || p[0][0] === ':' || !/^\d{1,3}$/.test(p[1])) return;
      const amt = +p[1]; if (amt < 1 || amt > 50) return;
      const cur = best.get(norm(p[0]));
      if (!cur || amt > cur.amt) best.set(norm(p[0]), { name: p[0], amt, idx });
    });
    const standing = [...best.values()].sort((x, y) => y.amt - x.amt || x.idx - y.idx);
    if (!standing.length) return;
    const floor = ev.minPoints === undefined ? -10 : ev.minPoints;
    const clamp = v => Math.max(floor, v);
    addPoints(tally, standing[0].name, ev.key, clamp((ev.pot || 10) - standing[0].amt));
    if (standing[1]) addPoints(tally, standing[1].name, ev.key, clamp(-standing[1].amt));
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

  /* Hidden Agenda: once a table is over, its board carries every seat's
     role and the winner; the winning side's names each take winPoints */
  async function scoreClosedSession(ev, claims, tally) {
    for (const room of ev.rooms) {
      try {
        const d = await j('/p/' + room.id + '/cs/board');
        if (d.phase !== 'over' || !d.winner) continue;
        d.seats.forEach(s => {
          if (!s.role || !s.n) return;
          const side = s.role === 'b' ? 'backers' : 'committee';
          if (side === d.winner) addPoints(tally, s.n, ev.key, ev.winPoints);
        });
      } catch (_) { /* a table that isn't there yet scores nobody */ }
    }
  }

  /* decision times under a clock, for the Quick draw and Careful marksman
     awards: every scored game that runs on a clock is listed here, with
     how its lines carry the seconds. A name needs `min` timed decisions
     to qualify; the shortest mean wins Quick draw, the longest Careful
     marksman, ties share, and with fewer than two qualifiers neither is
     given. Latest line per pair, round, seat and phase, as the rules read
     them, so a retry never counts twice.
     -> {fastest:[names], slowest:[names], rows:[{name, mean, n}] asc} */
  const TIMED = [
    /* chicken: "A|B|n|seat|x|t", the driver is seat a = A, seat b = B */
    { room: 'm7-chicken', min: 3, read: p => {
        if (p.length !== 6 || !/^[1-6]$/.test(p[2]) || !/^[ab]$/.test(p[3]) || !/^[sgw]$/.test(p[4]) || !/^\d{1,3}$/.test(p[5])) return null;
        const key = [norm(p[0]), norm(p[1])].sort().join('~');
        return { name: p[3] === 'a' ? p[0] : p[1], slot: key + '~' + p[2] + '~' + p[3] + '~' + (p[4] === 'w' ? 'w' : 'd'), secs: Math.min(+p[5], 30) };
      } },
  ];
  async function decisionTimes() {
    const latest = new Map();
    for (const t of TIMED) {
      try {
        const d = await j('/p/' + t.room + '/answers');
        (d.answers || []).forEach(line => {
          const r = t.read(String(line).split('|').map(x => x.trim()));
          if (r) latest.set(t.room + '~' + r.slot, { name: r.name, secs: r.secs, min: t.min });
        });
      } catch (_) { /* a room that isn't there yet times nobody */ }
    }
    const per = new Map();
    latest.forEach(({ name, secs }) => {
      const k = norm(name);
      if (!per.has(k)) per.set(k, { name: name.trim(), secs: [] });
      per.get(k).secs.push(secs);
    });
    const min = TIMED.reduce((m, t) => Math.min(m, t.min), Infinity);
    const rows = [...per.values()].filter(p => p.secs.length >= min)
      .map(p => ({ name: p.name, n: p.secs.length, mean: p.secs.reduce((a, b) => a + b, 0) / p.secs.length }))
      .sort((a, b) => a.mean - b.mean || a.name.localeCompare(b.name));
    if (rows.length < 2) return { fastest: [], slowest: [], rows };
    const lo = rows[0].mean, hi = rows[rows.length - 1].mean;
    if (lo === hi) return { fastest: [], slowest: [], rows };
    return { fastest: rows.filter(r => r.mean === lo).map(r => r.name), slowest: rows.filter(r => r.mean === hi).map(r => r.name), rows };
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
        else if (ev.kind === 'shootout') await scoreShootout(ev, claims, tally);
        else if (ev.kind === 'bossbattle') await scoreBossBattle(ev, claims, tally);
        else if (ev.kind === 'inspection') await scoreInspection(ev, claims, tally);
        else if (ev.kind === 'chicken') await scoreChicken(ev, claims, tally);
        else if (ev.kind === 'goldenballs') await scoreGoldenballs(ev, claims, tally);
        else if (ev.kind === 'auction') await scoreAuction(ev, claims, tally);
        else if (ev.kind === 'closedsession') await scoreClosedSession(ev, claims, tally);
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
    if (id === 'm5-invest') return 'R' + p[1] + ': ' + (p[2] === 'i' ? 'invested' : 'didn’t invest');
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
    if (id === 'm6-pk' || id === 'm6-rps') {
      if (p[4] === 'j') return 'paired with ' + (norm(p[0]) === nkey ? p[1] : p[0]);
      const me = (norm(p[0]) === nkey) === (p[3] === 'a');
      if (!me) return null;
      const W = { l: 'left', r: 'right' }, T = { r: 'rock', p: 'paper', s: 'scissors' };
      if (id === 'm6-rps') return 'throw ' + p[2] + ': ' + (T[p[4]] || p[4]);
      const kicking = (+p[2] <= 8) === (p[3] === 'a');
      return 'kick ' + p[2] + ': ' + (kicking ? 'shot ' : 'dived ') + (W[p[4]] || p[4]);
    }
    if (id === 'm7-chicken') {
      if (p[4] === 'j') return 'paired with ' + (norm(p[0]) === nkey ? p[1] : p[0]);
      const me = (norm(p[0]) === nkey) === (p[3] === 'a');
      if (!me) return null;
      const W = { s: 'swerved', g: 'went straight', w: 'threw the wheel out', k: 'kept the wheel' };
      const froze = p[4] === 'g' && p.length === 6 && +p[5] >= 30;
      return 'round ' + p[2] + ': ' + (froze ? 'froze, and went straight' : (W[p[4]] || p[4])) + (p.length === 6 && !froze ? ' after ' + p[5] + 's' : '');
    }
    if (id === 'm7-gb' || id === 'm7-stag') {
      if (p[4] === 'j') return 'paired with ' + (norm(p[0]) === nkey ? p[1] : p[0]);
      const me = (norm(p[0]) === nkey) === (p[3] === 'a');
      if (!me) return null;
      const W = id === 'm7-gb'
        ? { s: 'split', t: 'stole', n: 'used the move', q: 'did not use the move', h: 'handed over half', k: 'kept it all' }
        : { s: 'went for the stag', h: 'took the hare', m: 'sent the assurance', q: 'sent nothing' };
      return 'round ' + p[2] + ': ' + (W[p[4]] || p[4]);
    }
    if (id === 'm7-auction') return 'bid ' + p[1];
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
          if (g.kind === 'cs') {
            const d = await j('/p/' + g.id + '/cs/me?v=' + encodeURIComponent(voter));
            if (d && d.me && d.me.role) {
              const R = { m: 'Committee Member', b: 'Manipulator', a: 'Auditor', c: 'General Counsel' };
              let a = 'played as ' + (R[d.me.role] || d.me.role);
              if (d.me.out) a += ', ' + (d.me.out.how === 'recused' ? 'voted off on day ' : 'removed on night ') + d.me.out.r;
              if (d.winner) a += ' — ' + (d.winner === 'committee' ? 'the committee won' : 'the Manipulators won');
              items.push({ id: g.id, q: g.label, answer: a, scored: scoring.has(g.id) });
            }
            continue;
          }
          if (g.kind === 'market') {
            const d = await j('/p/' + g.id + '/answers');
            const mine = (d.answers || []).filter(t => { const p = String(t).split('|').map(x => x.trim()); return p[0] === 'deal' && (norm(p[2]) === nkey || norm(p[3]) === nkey); });
            if (mine.length) items.push({ id: g.id, q: g.label, answer: mine.map(t => { const p = String(t).split('|').map(x => x.trim()); return 'round ' + p[1] + ': ' + (norm(p[2]) === nkey ? 'sold to ' + p[3] : 'bought from ' + p[2]) + ' for $' + p[4]; }).join(' · '), scored: false });
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
          if (mine.length) items.push({ id: g.id, q: g.label, answer: mine.map(t => gameLine(g.id, t, nkey)).filter(Boolean).join(' · '), scored: scoring.has(g.id) });
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

  return { load, decisionTimes, claimName, myHistory, scoringRoomIds, MODULES, GAME_ROOMS, API, fuzzyKey, fuzzyGroups };
})();
