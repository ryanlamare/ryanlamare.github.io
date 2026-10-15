/* The Job Offer, played on phones (the Session 2 sample; our own version, 15 Oct 2026).
   The rooms and storage keys keep their neg3- names from when this was Session 3.
   Shared by the deck (s2/index.html) and the phone page (s2/deal/).

   The exercise is ours, not a licensed case: Harbourline Logistics hiring an
   operations manager, eight issues with five options each. Each phone shows
   its person the brief and their own numbers, adds up whatever is on the table
   while the pair negotiates, and sends the deal; the deck scores every deal and
   draws the debrief from the room's own results.

   THE POINTS BELOW ARE INVENTED, with a different structure from the real ones,
   so this public file gives nothing away. The real points and BATNAs live in a
   private folder; phones open them from numbers.enc (encrypted) with the key in
   the session's link (#k=...), and the deck takes them, with the key, from the
   private scoring file dropped on it once (see NEG.useScoring). That file is
   {"a":[[5]x8], "r":[[5]x8], "batna":{"a":n,"r":n}, "issues":[8 names], "key":"..."};
   a file whose issue names differ from these is refused.

   Wire (room neg3-deals, or neg3-deals-<x> with ?room=<x>):
     "d|7|a|20342031"  pair 7's applicant recorded the deal: one digit per
                       issue, the option's position on the form (0-4)
     "d|7|r|x"         pair 7's recruiter recorded no deal
     "s|7|a|00101000"  which issues this person believed both sides wanted
                       the same option on (one 0/1 per issue)
     "c|7|a|text"      anything else the pair agreed, in their own words
     "r|7|5400|5800|11200|14000"  the deck, once the room has seen its deals:
                       pair 7's applicant and recruiter points, together, and
                       the most possible ("r|7|x|14000" for no deal), so each
                       phone can show its own pair's result
   The latest line of each kind from each phone counts. The opening quiz is a
   plain vote in room neg3-impress (with the same suffix). */
(function(){
const NEG = window.NEG = {};

NEG.API = 'https://gt-poll.rlamare.workers.dev';

/* the eight issues in the order of the agreement; s is the short form the phone's numbers use */
NEG.issues = [
  {k:'salary',   n:'Salary',           o:['£54,000','£56,000','£58,000','£60,000','£62,000'], s:['£54k','£56k','£58k','£60k','£62k']},
  {k:'bonus',    n:'Joining bonus',    o:['£2,000','£3,000','£4,000','£5,000','£6,000'], s:['£2k','£3k','£4k','£5k','£6k']},
  {k:'office',   n:'Base office',      o:['London','Reading','Bristol','Leeds','Glasgow']},
  {k:'leave',    n:'Annual leave',     o:['22 days','24 days','26 days','28 days','30 days']},
  {k:'assign',   n:'First assignment', o:['Ports','Depots','Accounts','Fleet','Sales']},
  {k:'training', n:'Training budget',  o:['£1,000','£1,500','£2,000','£2,500','£3,000'], s:['£1k','£1.5k','£2k','£2.5k','£3k']},
  {k:'start',    n:'Start date',       o:['4 weeks','6 weeks','8 weeks','10 weeks','12 weeks'], s:['4 wks','6 wks','8 wks','10 wks','12 wks']},
  {k:'stay',     n:'Minimum stay',     o:['12 months','18 months','24 months','30 months','36 months'], s:['12 mo','18 mo','24 mo','30 mo','36 mo']},
];
NEG.roles = {a:'Applicant', r:'Recruiter'};

/* DEMO points and BATNAs, invented (see above), one row per issue in the agreement's order;
   the phones use them too when they have no key, so the sample's phone and deck agree */
const DEMO = NEG.DEMO = {
  a: [[0,500,1000,1500,2000],[0,200,400,600,800],[600,1200,900,300,0],[0,400,800,1200,1600],
      [1600,1200,800,400,0],[0,200,400,800,600],[1600,1200,800,400,0],[400,300,200,100,0]],
  r: [[2000,1500,1000,500,0],[1600,1200,800,400,0],[600,1200,900,300,0],[1600,1200,800,400,0],
      [0,100,200,300,400],[0,200,400,800,600],[0,100,200,300,400],[0,500,1000,1500,2000]],
  batna: {a:4600, r:4400},
};
NEG.pts = {a:DEMO.a, r:DEMO.r};
NEG.demoScoring = true;
/* each side's score with no deal (its BATNA) */
NEG.batna = DEMO.batna;
/* the key that opens the real numbers on phones; only a live deck has it, from the private file */
NEG.phoneKey = '';

/* a live session: the deck reads the real schedules from a private file once
   ({"a":[[..5]x8],"r":[[..5]x8]}), and keeps them in this browser only */
NEG.useScoring = function(p){
  const ok = x => Array.isArray(x) && x.length === 8 && x.every(r => Array.isArray(r) && r.length === 5 && r.every(Number.isFinite));
  if (!p || !ok(p.a) || !ok(p.r)) return false;
  if (!Array.isArray(p.issues) || p.issues.join('|') !== NEG.issues.map(is => is.n).join('|')) return false;   /* a file must name its issues, and they must be these */
  NEG.pts = {a:p.a, r:p.r}; NEG.demoScoring = false;
  NEG.batna = p.batna && Number.isFinite(p.batna.a) && Number.isFinite(p.batna.r) ? {a:p.batna.a, r:p.batna.r} : null;
  NEG.phoneKey = typeof p.key === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(p.key) ? p.key : '';
  return true;
};
try { const s = localStorage.getItem('neg3-scoring2'); if (s) NEG.useScoring(JSON.parse(s)); } catch(_){}   /* scoring2: our own exercise; a stored file for the old one is ignored */

/* the room: ?room=<x> for a rehearsal; ?demo=1 never touches the network */
const Q = new URLSearchParams(location.search);
NEG.demo = Q.has('demo');
const SUFFIX = Q.get('room') ? '-' + Q.get('room').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) : '';
NEG.room = 'neg3-deals' + SUFFIX;
NEG.quizRoom = 'neg3-impress' + SUFFIX;
NEG.suffix = Q.get('room') || '';

/* the opening quiz, Ryan's BADM 590 question (answer: the second) */
NEG.quiz = {
  q: 'Which applicant makes the best impression?',
  o: ['The applicant who accepts the offer made',
      'The applicant who negotiates the offer in a professional, problem-solving manner',
      'The applicant who negotiates the offer in an unprofessional manner'],
  answer: 1,
  demo: [7, 23, 1],
};
NEG.clean = t => String(t || '').replace(/[|\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);

NEG.score = function(d){            // d: array of 8 option positions
  let a = 0, r = 0;
  d.forEach((o, i) => { a += NEG.pts.a[i][o]; r += NEG.pts.r[i][o]; });
  return {a, r, j:a + r};
};

/* what kind of issue each one is, read off the points: congruent when both
   sides' best option is the same, distributive when every option adds to the
   same total, integrative otherwise (and then, who cares more) */
NEG.kinds = function(){
  return NEG.issues.map((_, i) => {
    const A = NEG.pts.a[i], R = NEG.pts.r[i];
    const best = arr => arr.indexOf(Math.max(...arr));
    const sum = A.map((x, k) => x + R[k]);
    const eff = best(sum);
    if (best(A) === best(R)) return {kind:'congruent', eff};
    if (sum.every(x => x === sum[0])) return {kind:'distributive', eff:-1};
    const ra = Math.max(...A) - Math.min(...A), rr = Math.max(...R) - Math.min(...R);
    return {kind:'integrative', eff, cares: ra >= rr ? 'a' : 'r'};
  });
};

NEG.max = function(){
  const k = NEG.kinds();
  let j = 0; NEG.issues.forEach((_, i) => { const s = NEG.pts.a[i].map((x, o) => x + NEG.pts.r[i][o]); j += Math.max(...s); });
  return {a: NEG.pts.a.reduce((t, r) => t + Math.max(...r), 0), r: NEG.pts.r.reduce((t, r) => t + Math.max(...r), 0), j, kinds:k};
};

/* every deal that cannot be bettered for one side without costing the other
   (5^8 = 390,625 packages, a fraction of a second) */
NEG.frontier = function(){
  const pts = [];
  const rec = (i, a, r) => {
    if (i === 8) { pts.push([r, a]); return; }
    for (let o = 0; o < 5; o++) rec(i + 1, a + NEG.pts.a[i][o], r + NEG.pts.r[i][o]);
  };
  rec(0, 0, 0);
  pts.sort((p, q) => q[0] - p[0] || q[1] - p[1]);
  const out = []; let bestA = -1;
  for (const [r, a] of pts) if (a > bestA) { out.push([r, a]); bestA = a; }
  return out.reverse();              // by recruiter points, low to high
};

NEG.parse = function(entries){
  const dl = {}, sl = {}, cl = {}, res = {};
  (entries || []).forEach(e => {
    const p = String(e.t || '').split('|');
    if (p[0] === 'd' && /^\d{1,2}$/.test(p[1]) && (p[2] === 'a' || p[2] === 'r') && /^([0-4]{8}|x)$/.test(p[3])) dl[e.v] = {pair:+p[1], role:p[2], d:p[3]};
    if (p[0] === 's' && /^\d{1,2}$/.test(p[1]) && (p[2] === 'a' || p[2] === 'r') && /^[01]{8}$/.test(p[3])) sl[e.v] = {pair:+p[1], role:p[2], m:p[3]};
    if (p[0] === 'c' && /^\d{1,2}$/.test(p[1]) && (p[2] === 'a' || p[2] === 'r') && p.slice(3).join(' ').trim()) cl[e.v] = {pair:+p[1], role:p[2], t:NEG.clean(p.slice(3).join(' '))};
    if (p[0] === 'r' && /^\d{1,2}$/.test(p[1])) res[+p[1]] = p[2] === 'x' ? {nodeal:true, m:+p[3]} : {a:+p[2], r:+p[3], j:+p[4], m:+p[5]};
  });
  const by = {};
  Object.values(dl).forEach(x => { (by[x.pair] = by[x.pair] || {})[x.role] = x.d; });
  const pairs = Object.keys(by).map(Number).sort((x, y) => x - y).map(n => {
    const a = by[n].a, r = by[n].r, sides = (a ? 1 : 0) + (r ? 1 : 0);
    const use = a && a !== 'x' ? a : (r && r !== 'x' ? r : null);
    const out = {n, hasA:!!a, hasR:!!r, sides, mismatch: !!(a && r && a !== r)};   // a and r below are points
    if (!use) { out.nodeal = true; return out; }
    out.d = use.split('').map(Number);
    Object.assign(out, NEG.score(out.d));
    return out;
  });
  const beliefs = Object.values(sl).map(x => x.m.split('').map(Number));
  /* the extra terms, one card per pair even when both phones wrote the same thing */
  const terms = [];
  Object.values(cl).sort((x, y) => x.pair - y.pair).forEach(x => {
    if (!terms.some(t => t.pair === x.pair && t.t.toLowerCase() === x.t.toLowerCase())) terms.push(x);
  });
  return {pairs, beliefs, terms, results:res};
};

/* the sample's room: sixteen pairs as a real room tends to come out (one
   impasse, one pair that remembers two different salaries, one side that
   never recorded, one pair where the recruiter took the whole fixed pie),
   drawn from a fixed seed so every viewing matches */
NEG.demoEntries = function(){
  let s = 20261014;
  const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const K = NEG.kinds(), out = [];
  const skills = [.92,.18,.66,.41,.83,.27,.55,.74,.12,.61,.48,.88,.35,.7,.5,.3];
  const TERMS = {1:'Salary review after six months', 3:'Half the bonus now, half after the first year', 5:'Harbourline pays for a month of temporary housing',
    7:'A company car for the first year', 8:'Two weeks working from home before the move', 10:'Two extra days of leave from the second year',
    12:'Bonus doubles if the first-year targets are met', 14:'A mentor from the management board', 13:'Relocation costs paid up front'};
  skills.forEach((sk, idx) => {
    const n = idx + 1, lean = (rnd() - .5) * 2.4;
    const d = K.map((k, i) => {
      if (k.kind === 'congruent') return rnd() < .58 + .42 * sk ? k.eff : (rnd() < .7 ? 2 : [1, 3][rnd() < .5 ? 0 : 1]);
      if (k.kind === 'integrative') return rnd() < .1 + .66 * sk ? k.eff : (rnd() < .75 ? 2 : (k.eff === 0 ? 1 : 3));
      return Math.max(0, Math.min(4, Math.round(2 + lean + (rnd() - .5) * 1.2)));
    });
    if (n === 7) K.forEach((k, i) => { if (k.kind === 'distributive') d[i] = NEG.pts.r[i].indexOf(Math.max(...NEG.pts.r[i])); });
    const ds = d.join('');
    if (n === 16) { out.push({v:'demo-a' + n, t:'d|' + n + '|a|x'}); out.push({v:'demo-r' + n, t:'d|' + n + '|r|x'}); }
    else {
      out.push({v:'demo-a' + n, t:'d|' + n + '|a|' + ds});
      if (n !== 15) {
        const dr = n === 11 ? d.map((o, i) => i === 0 ? (o < 4 ? o + 1 : o - 1) : o).join('') : ds;
        out.push({v:'demo-r' + n, t:'d|' + n + '|r|' + dr});
      }
    }
    if (TERMS[n]) out.push({v:'demo-a' + n, t:'c|' + n + '|a|' + TERMS[n]});
    ['a', 'r'].forEach(role => {
      if (n === 15 && role === 'r') return;
      const m = K.map(k => rnd() < (k.kind === 'congruent' ? .24 + .5 * sk : .07) ? 1 : 0).join('');
      out.push({v:'demo-' + role + n, t:'s|' + n + '|' + role + '|' + m});
    });
  });
  return out;
};

NEG.fetchCounts = function(room){
  return fetch(NEG.API + '/p/' + room, {cache:'no-store'}).then(r => r.json()).then(d => d.counts || []);
};
NEG.vote = function(room, v, o){
  return fetch(NEG.API + '/p/' + room + '/vote', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({o, v})})
    .then(r => { if (!r.ok) throw new Error('vote ' + r.status); return r.json(); });
};
NEG.fetchEntries = function(){
  return fetch(NEG.API + '/p/' + NEG.room + '/entries', {cache:'no-store'}).then(r => r.json()).then(d => d.entries || []);
};
NEG.say = function(v, t){
  return fetch(NEG.API + '/p/' + NEG.room + '/say', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({t, v})})
    .then(r => { if (!r.ok) throw new Error('say ' + r.status); return r.json(); });
};
})();
