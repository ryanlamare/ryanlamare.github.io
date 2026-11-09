/* The Oil Pricing Exercise (Program on Negotiation, Harvard Law School), run on phones (9 Nov 2026, Ryan's call:
   Session 7 plays PON's own exercise in place of Price Wars, which was his re-creation of it). Two countries,
   Alba and Batia, each run by a board; each month a board sets its price for oil, $30, $20 or $10, without
   seeing the other's. Eight months. The brief and its profit schedule are PON's, bought, on paper in the room:
   NOTHING OF THE SCHEDULE IS IN THIS FILE OR ANYWHERE IN THE REPO. The deck takes it from the session's private
   file, dropped on it, and until then draws an invented one marked DEMO. Phones never need it: a board sets its
   price on one phone and keeps its profits on PON's paper record.

   His own rules on top of PON's, from his BADM 590 memos (and his LER 565 run of the same game):
     month 4      all profits are doubled, and before it each board may send one representative to meet
     months 7, 8  a country that is more profitable than the other in the month has its profit quadrupled,
                  and before month 7 (never before month 8) the boards may meet once more
   A meeting happens only if both boards ask for it.

   RYAN MOVES THE GAME ON, never the phones (his 29 Sep correction to Price Wars, kept): the desk (s7/desk/)
   opens each month, shows the room both prices, sends out each memo and sends the representatives to meet. A
   phone only ever sets its own board's price for the month that is open, once, and answers the memo's question.

   Everything is one append-only log of lines in the poll room neg7-oil (kit/gtrooms.js adds -neg, and a
   rehearsal's name), each beginning "o|". The game is rebuilt from the lines in the order they arrived:
     o|g|N              the game starts with N groups (each one Alba board and one Batia board), in month 1 (desk)
     o|st|r3            the desk moves the room on, forwards only. The stages, in order:
                        m1 r1 m2 r2 m3 r3 q4 mm4 m4 r4 m5 r5 m6 r6 q7 mm7 m7 r7 m8 r8
                        (mN: month N is open for prices; rN: month N's prices are shown; q4, q7: the memo is out
                        and the boards answer it; mm4, mm7: the representatives are meeting; r8 ends the game)
     o|j|a3|<phone>     a phone joined Alba's board in group 3 (b = Batia); a phone's latest line counts
     o|p|a3|2|20        Alba in group 3 set $20 for month 2: the FIRST such line counts, and only while month 2 is open
     o|q|a3|4|y|Sam     Alba in group 3 will meet before month 4 and sends Sam (n = no): the first line counts,
                        and only while the memo's question is open
     o|P|a3|2|20        the desk set (or corrected) the price itself: the latest counts, until the month is shown
     o|Q|a3|4|n         the desk answered the memo's question for a board: the latest counts
   The poll server keeps 15 lines a sender, so a phone sends its prices, its answers and its joins under three
   sender names of its own. */
(function(){
const O = {};
O.API = 'https://gt-poll.rlamare.workers.dev';
O.ROOM = 'neg7-oil';
O.NAME = {a:'Alba', b:'Batia'};
O.PRICES = [30, 20, 10];
O.MONTHS = 8;
O.GATES = [4, 7];                      /* a memo, and perhaps a meeting, comes before each of these months */
O.STAGES = ['m1','r1','m2','r2','m3','r3','q4','mm4','m4','r4','m5','r5','m6','r6','q7','mm7','m7','r7','m8','r8'];
O.idx = s => O.STAGES.indexOf(s);
/* what the desk's one button does from each stage */
O.NEXT = {
  m1:['r1','Show month 1’s prices'], r1:['m2','Open month 2'], m2:['r2','Show month 2’s prices'], r2:['m3','Open month 3'],
  m3:['r3','Show month 3’s prices'], r3:['q4','Send out the first memo'], q4:['mm4','Send the representatives to meet'],
  mm4:['m4','The representatives are back: open month 4'], m4:['r4','Show month 4’s prices'], r4:['m5','Open month 5'],
  m5:['r5','Show month 5’s prices'], r5:['m6','Open month 6'], m6:['r6','Show month 6’s prices'], r6:['q7','Send out the urgent memo'],
  q7:['mm7','Send the representatives to meet'], mm7:['m7','The representatives are back: open month 7'],
  m7:['r7','Show month 7’s prices'], r7:['m8','Open month 8'], m8:['r8','Show month 8’s prices, and end the game']};
O.title = s => { const n = +s.slice(-1);
  return s[0] === 'q' ? 'A memo before month ' + n : s.slice(0, 2) === 'mm' ? 'The representatives are meeting' :
         s[0] === 'm' ? 'Month ' + n + ': set your price' : s === 'r8' ? 'The eight months are over' : 'Month ' + n + ': the prices'; };

/* his two memos, word for word (BADM 590). They are his, not PON's, so they can live here; the phones show each one
   only once the desk has sent it out, and the memo page (s7/memo/) is not linked from anywhere a participant pages. */
O.MEMO = {
  4: {head:'MEMO', to:'Oil Pricing Boards of Alba and Batia', from:'Ryan Lamare', open:'Dear Oil Pricing Boards:', p:[
    'This memo is to inform you that political elections in each of your respective countries have just taken place, and both Alba and Batia have chosen to elect free-market, pro-business governments. Fortunately, you’ve all kept your jobs! In other good news, the pro-business administration has lowered corporate taxes, so all profits will be doubled this month!',
    'Further, each government has agreed to temporarily suspend its embargo on business communication between the two nations. This means that, prior to the next round of price setting, one representative from each country will be given an opportunity to meet with a representative of the other country without fear of antitrust liability or prosecution.',
    'You and your fellow board members must decide (1) whether you would like to send a representative to meet with the other country’s representative, and (2) if so, who your chosen representative will be. If either country refuses to meet, no meeting will occur.',
    'Neither board should assume that the favorable business conditions and suspension of communication embargoes currently in place will exist beyond the fourth round of price setting.'],
    close:'Good luck, oil barons!', sign:'Ryan'},
  7: {head:'URGENT MEMO', to:'Oil Pricing Boards of Alba and Batia', from:'Ryan Lamare', open:'Dear Oil Pricing Boards:', p:[
    'URGENT NEWS OUT OF ALBA AND BATIA! Your price setting efforts have garnered extraordinary worldwide interest and, as a result, the decisions you make over the final two rounds will affect not just your country’s oil profits but the relative economies of each country as a whole. This means that, in any of the remaining price setting rounds, if one country is able to demonstrate that it is more profitable in oil pricing than the other, that country’s profits will be quadrupled while the other country’s profits will remain the same. However, if both countries are equally profitable, neither economy will receive an advantage, so all profits will remain the same (i.e., no profits will be quadrupled).',
    'These new conditions hold for the final two rounds of price setting.',
    'Once again, each government has agreed to temporarily suspend its embargo on business communication between the two nations. This means that, prior to the next round of price setting, one representative from each country will be given an opportunity to meet with a representative of the other country without fear of antitrust liability or prosecution. Unfortunately, the courts are catching on to your government’s clandestine business activities, so both countries’ governments have pledged no further communications with each other on any business matters following this last opportunity.',
    'You and your fellow board members must once again decide (1) whether you would like to send a representative to meet with the other country’s representative, and (2) if so, who your chosen representative will be. If either country refuses to meet, no meeting will occur. Remember, any meeting will occur before the seventh round of price setting, but not the eighth.'],
    close:'Good luck, and no pressure, but the entire economy of both of your countries is in your hands. So yeah…', sign:'Ryan'}};

O.clean = n => String(n || '').replace(/[|,\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30);
O.boards = G => { const T = []; for (let j = 1; j <= G.n; j++) T.push('a' + j, 'b' + j); return T; };
O.rival = t => (t[0] === 'a' ? 'b' : 'a') + t.slice(1);

/* the game, from the room's lines in the order they arrived */
O.parse = function(lines){
  const G = {n:0, stage:'', price:{}, ans:{}, rep:{}, joins:{}};
  const by = {};                                   /* each phone's latest board */
  const open = m => G.stage === 'm' + m, shown = m => O.idx(G.stage) >= O.idx('r' + m);
  lines.forEach(line => {
    const f = String(line).split('|'); if (f[0] !== 'o') return;
    const board = /^[ab][1-6]$/.test(f[2] || '') && (!G.n || +f[2][1] <= G.n) ? f[2] : null, k = +f[3];
    switch (f[1]) {
      case 'g':  if (!G.n && /^[1-6]$/.test(f[2])) { G.n = +f[2]; G.stage = 'm1'; } break;
      case 'st': if (G.n && O.idx(f[2]) > O.idx(G.stage)) G.stage = f[2]; break;
      case 'j':  if (board && f[3]) by[f[3]] = board; break;
      case 'p':  if (board && open(k) && O.PRICES.includes(+f[4]) && !(G.price[board] || [])[k]) (G.price[board] = G.price[board] || [])[k] = +f[4]; break;
      case 'P':  if (board && k >= 1 && k <= O.MONTHS && !shown(k) && O.PRICES.includes(+f[4])) (G.price[board] = G.price[board] || [])[k] = +f[4]; break;
      case 'q': case 'Q': {
        if (!board || !O.GATES.includes(k) || !/^[yn]$/.test(f[4] || '')) break;
        const first = !(G.ans[board] || {})[k];
        if (f[1] === 'q' ? (first && G.stage === 'q' + k) : O.idx(G.stage) < O.idx('m' + k)) {
          (G.ans[board] = G.ans[board] || {})[k] = f[4];
          (G.rep[board] = G.rep[board] || {})[k] = f[4] === 'y' ? O.clean(f[5]) : '';
        }
        break; }
    }
  });
  Object.values(by).forEach(b => { if (!G.n || +b[1] <= G.n) G.joins[b] = (G.joins[b] || 0) + 1; });
  return G;
};
O.p = (G, t, m) => (G.price[t] || [])[m] || null;
O.ans = (G, t, g) => (G.ans[t] || {})[g] || null;
O.rep = (G, t, g) => (G.rep[t] || {})[g] || '';
O.meets = (G, g, j) => O.ans(G, 'a' + j, g) === 'y' && O.ans(G, 'b' + j, g) === 'y';
O.month = G => { const m = /^(?:mm|[mrq])(\d)$/.exec(G.stage || ''); return m ? +m[1] : 0; };
O.shown = G => { let k = 0; for (let m = 1; m <= O.MONTHS; m++) if (O.idx(G.stage) >= O.idx('r' + m)) k = m; return k; };   /* the last month whose prices are out */
O.allIn = (G, m) => G.n > 0 && O.boards(G).every(t => O.p(G, t, m));
O.over = G => G.stage === 'r8';

/* the month's profits, [Alba, Batia], from a schedule {"30,20":[alba, batia], ...} (Alba's price first):
   month 4 doubles them, and in months 7 and 8 whichever country made more has its own quadrupled */
O.profit = function(S, m, a, b){
  const c = S && S[a + ',' + b]; if (!c) return null;
  let x = c[0], y = c[1];
  if (m === 4) { x *= 2; y *= 2; }
  if (m >= 7) { if (c[0] > c[1]) x *= 4; else if (c[1] > c[0]) y *= 4; }
  return [x, y];
};
/* a group's running totals over the months that have been shown */
O.totals = function(G, S, j, upto){
  let x = 0, y = 0;
  for (let m = 1; m <= (upto || O.shown(G)); m++) { const a = O.p(G, 'a' + j, m), b = O.p(G, 'b' + j, m), r = a && b ? O.profit(S, m, a, b) : null; if (r) { x += r[0]; y += r[1]; } }
  return [x, y];
};
/* what a pair of fixed plans would have earned over the eight months: plan(m) gives [Alba's price, Batia's price] */
O.would = (S, plan) => { let x = 0, y = 0; for (let m = 1; m <= O.MONTHS; m++) { const [a, b] = plan(m), r = O.profit(S, m, a, b); if (r) { x += r[0]; y += r[1]; } } return [x, y]; };

/* an invented schedule for the deck opened without the private file: the same shape of game, none of PON's numbers */
O.DEMO_SCHEDULE = {'30,30':[12,12], '30,20':[3,19], '30,10':[3,16], '20,30':[19,3], '20,20':[9,9], '20,10':[4,16], '10,30':[16,3], '10,20':[16,4], '10,10':[6,6]};
/* an invented room of four groups, for the deck opened before any game has started */
O.demoLines = function(){
  const L = ['o|g|4'], P = {
    1:[[30,30],[30,30],[30,30],[30,30],[30,30],[30,30],[20,30],[30,20]],
    2:[[20,30],[10,20],[10,10],[20,20],[10,10],[10,10],[10,10],[10,10]],
    3:[[30,20],[20,20],[20,10],[30,30],[30,20],[20,20],[30,30],[10,20]],
    4:[[20,20],[30,20],[20,20],[30,30],[30,30],[20,30],[20,20],[10,10]]};
  const Q = {4:{1:['y','y'], 2:['y','n'], 3:['y','y'], 4:['y','y']}, 7:{1:['y','y'], 2:['n','n'], 3:['y','y'], 4:['y','n']}};
  const N = ['Ana','Ben','Cal','Dee','Eli','Fay','Gus','Hal'];
  for (let j = 1; j <= 4; j++) for (let k = 0; k < 3; k++) L.push('o|j|a' + j + '|demo-a' + j + k, 'o|j|b' + j + '|demo-b' + j + k);
  O.STAGES.forEach(s => {
    if (s !== 'm1') L.push('o|st|' + s);
    const n = +s.slice(-1);
    if (/^m\d$/.test(s)) for (let j = 1; j <= 4; j++) L.push('o|p|a' + j + '|' + n + '|' + P[j][n - 1][0], 'o|p|b' + j + '|' + n + '|' + P[j][n - 1][1]);
    if (s[0] === 'q') for (let j = 1; j <= 4; j++) ['a', 'b'].forEach((c, i) => L.push('o|q|' + c + j + '|' + n + '|' + Q[n][j][i] + (Q[n][j][i] === 'y' ? '|' + N[(j - 1) * 2 + i] : '')));
  });
  return L;
};

O.voter = function(){ let v = null; try { v = localStorage.getItem('gt-voter'); if (!v) { v = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)); localStorage.setItem('gt-voter', v); } } catch(_) { v = 'v' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); } return v; };
O.entries = () => fetch(O.API + '/p/' + O.ROOM + '/entries', {cache:'no-store'}).then(r => { if (!r.ok) throw 0; return r.json(); }).then(d => (d.entries || []).map(e => e.t));
O.say = (v, t) => fetch(O.API + '/p/' + O.ROOM + '/say', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({v, t})}).then(r => { if (!r.ok) throw r.status; return true; });
if (typeof window !== 'undefined') window.OIL = O;
if (typeof module !== 'undefined') module.exports = O;
})();
