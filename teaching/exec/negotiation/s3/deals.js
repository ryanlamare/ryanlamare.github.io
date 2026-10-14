/* The Job Offer, recorded on phones (Session 3 sample, 14 Oct 2026).
   Shared by the deck (s3/index.html) and the phone page (s3/deal/).

   Each phone sends its pair's agreement to the gt-poll write-in lane, and
   the deck scores every deal and draws the debrief from the room's own
   results. Phones never see a point: they send which option was agreed on
   each issue, and the scoring lives only with the deck.

   THE POINTS BELOW ARE INVENTED. The issues and options are the ones on the
   shared agreement form, but the real payoff schedules belong to a licensed
   exercise and never go in this public repo. In a live session the deck
   swaps in the real schedules from a private file (see NEG.useScoring);
   this sample runs on these demo points and on demo deals.

   Wire (room neg3-deals, or neg3-deals-<x> with ?room=<x>):
     "d|7|a|20342031"  pair 7's applicant recorded the deal: one digit per
                       issue, the option's position on the form (0-4)
     "d|7|r|x"         pair 7's recruiter recorded no deal
     "s|7|a|00101000"  which issues this person believed both sides wanted
                       the same option on (one 0/1 per issue)
     "c|7|a|text"      anything else the pair agreed, in their own words
     "t|y|text"        the second exercise (Thai Solar Park): did this person's
                       deal depend on what happens later (y/n), and how
     "r|7|15600|16800|32400|32400"  the deck, once the room has seen its deals:
                       pair 7's applicant and recruiter points, together, and
                       the most possible ("r|7|x|32400" for no deal), so each
                       phone can show its own pair's result
   The latest line of each kind from each phone counts. The opening quiz is a
   plain vote in room neg3-impress (with the same suffix). */
(function(){
const NEG = window.NEG = {};

NEG.API = 'https://gt-poll.rlamare.workers.dev';

NEG.issues = [
  {k:'bonus',    n:'Signing bonus',    o:['$10,000','$9,000','$8,000','$7,000','$6,000']},
  {k:'moving',   n:'Moving expenses',  o:['100%','90%','80%','70%','60%']},
  {k:'location', n:'Location',         o:['Baltimore','Philadelphia','New York','Washington','Boston']},
  {k:'vacation', n:'Vacation',         o:['25 days','20 days','15 days','10 days','5 days']},
  {k:'job',      n:'Job assignment',   o:['Benefits','Admin Services','Community Relations','Risk Management','Compensation']},
  {k:'retire',   n:'Retirement match', o:['4%','5%','6%','7%','8%']},
  {k:'salary',   n:'Salary',           o:['$66,000','$68,000','$70,000','$72,000','$74,000']},
  {k:'start',    n:'Starting date',    o:['June 1','June 15','July 1','July 15','August 1']},
];
NEG.roles = {a:'Applicant', r:'Recruiter'};

/* DEMO points, invented (see above), one row per issue in form order */
const DEMO = {
  a: [[1000,750,500,250,0],[2400,1800,1200,600,0],[0,600,1200,2400,1800],[4000,3000,2000,1000,0],
      [0,600,1200,2400,1800],[0,800,1600,2400,3200],[0,1500,3000,4500,6000],[0,200,400,600,800]],
  r: [[0,800,1600,2400,3200],[0,600,1200,1800,2400],[0,1200,600,2400,1800],[0,200,400,600,800],
      [600,0,1200,2400,1800],[800,600,400,200,0],[6000,4500,3000,1500,0],[4000,3000,2000,1000,0]],
};
NEG.pts = DEMO;
NEG.demoScoring = true;

/* a live session: the deck reads the real schedules from a private file once
   ({"a":[[..5]x8],"r":[[..5]x8]}), and keeps them in this browser only */
NEG.useScoring = function(p){
  const ok = x => Array.isArray(x) && x.length === 8 && x.every(r => Array.isArray(r) && r.length === 5 && r.every(Number.isFinite));
  if (!p || !ok(p.a) || !ok(p.r)) return false;
  NEG.pts = {a:p.a, r:p.r}; NEG.demoScoring = false; return true;
};
try { const s = localStorage.getItem('neg3-scoring'); if (s) NEG.useScoring(JSON.parse(s)); } catch(_){}

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
  const dl = {}, sl = {}, cl = {}, res = {}, tl = {};
  (entries || []).forEach(e => {
    const p = String(e.t || '').split('|');
    if (p[0] === 'd' && /^\d{1,2}$/.test(p[1]) && (p[2] === 'a' || p[2] === 'r') && /^([0-4]{8}|x)$/.test(p[3])) dl[e.v] = {pair:+p[1], role:p[2], d:p[3]};
    if (p[0] === 's' && /^\d{1,2}$/.test(p[1]) && (p[2] === 'a' || p[2] === 'r') && /^[01]{8}$/.test(p[3])) sl[e.v] = {pair:+p[1], role:p[2], m:p[3]};
    if (p[0] === 'c' && /^\d{1,2}$/.test(p[1]) && (p[2] === 'a' || p[2] === 'r') && p.slice(3).join(' ').trim()) cl[e.v] = {pair:+p[1], role:p[2], t:NEG.clean(p.slice(3).join(' '))};
    if (p[0] === 'r' && /^\d{1,2}$/.test(p[1])) res[+p[1]] = p[2] === 'x' ? {nodeal:true, m:+p[3]} : {a:+p[2], r:+p[3], j:+p[4], m:+p[5]};
    if (p[0] === 't' && (p[1] === 'y' || p[1] === 'n')) tl[e.v] = {yes:p[1] === 'y', t:NEG.clean(p.slice(2).join(' '))};
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
  const t2 = Object.values(tl), ex2 = {yes:t2.filter(x => x.yes).length, no:t2.filter(x => !x.yes).length, terms:[]};
  t2.forEach(x => { if (x.yes && x.t && !ex2.terms.some(y => y.toLowerCase() === x.t.toLowerCase())) ex2.terms.push(x.t); });
  return {pairs, beliefs, terms, results:res, ex2};
};

/* the sample's room: sixteen pairs as a real room tends to come out (one
   impasse, one pair that remembers two different salaries, one side that
   never recorded), drawn from a fixed seed so every viewing matches */
NEG.demoEntries = function(){
  let s = 20261014;
  const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const K = NEG.kinds(), out = [];
  const skills = [.92,.18,.66,.41,.83,.27,.55,.74,.12,.61,.48,.88,.35,.7,.5,.3];
  const TERMS = {1:'Salary review after six months', 3:'Half the bonus now, half after the first year', 5:'The company pays for a month of temporary housing',
    7:'A training course paid for in the first year', 8:'Start in June working remotely, move in August', 10:'One extra week of vacation from the second year',
    12:'Bonus doubles if the first-year targets are met', 14:'A mentor from the compensation team', 13:'Moving costs paid up front, not reimbursed'};
  skills.forEach((sk, idx) => {
    const n = idx + 1, lean = (rnd() - .5) * 2.4;
    const d = K.map((k, i) => {
      if (k.kind === 'congruent') return rnd() < .58 + .42 * sk ? k.eff : (rnd() < .7 ? 2 : [1, 3][rnd() < .5 ? 0 : 1]);
      if (k.kind === 'integrative') return rnd() < .1 + .66 * sk ? k.eff : (rnd() < .75 ? 2 : (k.eff === 0 ? 1 : 3));
      return Math.max(0, Math.min(4, Math.round(2 + lean + (rnd() - .5) * 1.2)));
    });
    const ds = d.join('');
    if (n === 16) { out.push({v:'demo-a' + n, t:'d|' + n + '|a|x'}); out.push({v:'demo-r' + n, t:'d|' + n + '|r|x'}); }
    else {
      out.push({v:'demo-a' + n, t:'d|' + n + '|a|' + ds});
      if (n !== 15) {
        const dr = n === 11 ? d.map((o, i) => i === 6 ? Math.min(4, o + 1) : o).join('') : ds;
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
  /* the second exercise: most deals tied to what the plant produces */
  const EX2 = ['The price moves with the plant’s output in its first year', 'Part of the price is refunded if output falls short of the forecast',
    'A bonus to the seller if output beats the forecast', 'Half paid now, half after a year of measured output', 'An independent engineer checks the output after six months',
    'The seller guarantees a minimum output for three years'];
  for (let k = 0, said = 0; k < 31; k++) {
    const yes = k % 3 !== 2, how = yes && said < EX2.length && k % 2 === 0 ? EX2[said++] : '';
    out.push({v:'demo-t' + k, t:'t|' + (yes ? 'y' : 'n') + '|' + how});
  }
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
