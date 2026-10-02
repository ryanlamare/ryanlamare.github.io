/* The car market — one engine for the deck (the market maker) and every
   phone (a buyer), so nothing is ever posted back: each phone works out its
   own result from the same bids and the same seed the deck did.

   Room lines (m8-market, plain /say):
     join|name                      a buyer joins
     ::open|1|seed|N                round one opens: the seed and the lot size
     ::open|r|seed                  rounds two and three open
     ::open|4|seed|w                the rule change: peach owners return with a warranty
     ::close|r                      the deck closes a round
     bid|r|name|price               a buyer's bid, latest per name per round
     bid|4|name|plain|warranted     the warranty round asks for two prices

   The lot: N cars, half lemons and half peaches, dealt by the seed. An
   owner sells at or above their price (1000 for a lemon, 3000 for a peach)
   and not a dollar under. A round matches bidders to unsold cars at random
   (seeded), one car per bidder while cars last. Every car sold is replaced
   by a new arrival, and new sellers watch the prices: while a round's
   average price is under 3000 only lemon owners turn up. Peaches still
   unsold after the close of round two withdraw from the lot and lemon owners
   take their spots; the warranty
   round brings them back with a badge, and buyers bid one price for a car
   with a warranty and one for a car without. Only peach owners can afford
   to offer one.

   Classroom-grade: the seed is in the room, so the car types could be read
   out of the page source by a determined buyer. The same standing as the
   added-value rules in Module 1. */
const LOT = (() => {
  const RES = { L: 1000, P: 3000 };
  const VAL = { L: 1500, P: 4000 };
  const norm = s => String(s || '').trim().toLowerCase();
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = hash(String(seed)); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; }

  function parse(lines) {
    const st = { joins: [], opens: {}, closed: {}, bids: {}, seed: null, N: 0 };
    const seen = new Set();
    lines.forEach(t => {
      const p = String(t).split('|').map(x => x.trim());
      if (p[0] === 'join' && p[1]) { const k = norm(p[1]); if (!seen.has(k)) { seen.add(k); st.joins.push(p[1]); } }
      else if (p[0] === '::open' && /^[1-4]$/.test(p[1])) {
        const r = +p[1];
        if (r === 1) { st.seed = p[2] || 'seed'; st.N = Math.max(2, parseInt(p[3], 10) || 0); }
        st.opens[r] = { seed: p[2] || ('r' + r), w: r === 4 };
      }
      else if (p[0] === '::close' && /^[1-4]$/.test(p[1])) st.closed[+p[1]] = true;
      else if (p[0] === 'bid' && /^[1-4]$/.test(p[1]) && p[2]) {
        const r = +p[1], a = Math.round(+p[3]), b = Math.round(+p[4]);
        if (!(a >= 0)) return;
        if (!st.bids[r]) st.bids[r] = {};
        st.bids[r][norm(p[2])] = { name: p[2], price: a, wprice: (b >= 0) ? b : null };
      }
    });
    return st;
  }
  /* the lot as dealt: N cars, half L half P, order fixed by the seed */
  function deal(seed, N) {
    if (N % 2) N++;
    const types = []; for (let i = 0; i < N; i++) types.push(i < N / 2 ? 'L' : 'P');
    const r = rng(seed + '|deal');
    return shuffle(types, r).map((type, i) => ({ i, type, sold: null, gone: null, back: false }));
  }
  /* play every closed round in order -> {cars, results:{r:{nameKey:result}}, rounds:[stats], round, phase} */
  function simulate(st) {
    const out = { cars: st.seed ? deal(st.seed, st.N) : [], results: {}, rounds: {}, round: 0, open: false, warranty: false, N: st.N };
    if (!st.seed) return out;
    for (let r = 1; r <= 4; r++) {
      if (!st.opens[r]) break;
      out.round = r; out.open = !st.closed[r]; out.warranty = r === 4;
      if (r === 4) out.cars.forEach(c => { if (c.gone) { c.gone = null; c.back = true; } });
      if (!st.closed[r]) break;
      const rr = rng(st.seed + '|round|' + r + '|' + st.opens[r].seed);
      const bidders = shuffle(Object.keys(st.bids[r] || {}).sort(), rr);
      const pool = shuffle(out.cars.filter(c => !c.sold && !c.gone), rr);
      const res = {}; let sold = 0, sum = 0, n = 0, peachSold = 0, lemonSold = 0, refused = 0, none = 0, profit = 0;
      bidders.forEach((k, idx) => {
        const b = st.bids[r][k]; const car = pool[idx];
        if (!car) { res[k] = { r, name: b.name, outcome: 'none', bid: b.price }; none++; return; }
        const price = (r === 4 && car.back) ? (b.wprice === null ? b.price : b.wprice) : b.price;
        sum += price; n++;
        if (price >= RES[car.type]) {
          car.sold = { r, buyer: b.name, price };
          const value = VAL[car.type], gain = value - price;
          res[k] = { r, name: b.name, outcome: 'sold', car: car.i, type: car.type, warranty: !!car.back, price, value, profit: gain, bid: price };
          sold++; profit += gain; if (car.type === 'P') peachSold++; else lemonSold++;
        } else { res[k] = { r, name: b.name, outcome: 'refused', car: car.i, warranty: !!car.back, price, bid: price }; refused++; }
      });
      /* new arrivals replace what sold: lemons only while prices are low */
      const ar = rng(st.seed + '|arrive|' + r); let arrivals = 0;
      if (r < 4) for (let k = 0; k < sold; k++) { const type = (n && sum / n < RES.P) ? 'L' : (ar() < 0.5 ? 'L' : 'P'); out.cars.push({ i: out.cars.length, type, sold: null, gone: null, back: false, arrived: r }); arrivals++; }
      let withdrew = 0;
      if (r === 2) {
        out.cars.forEach(c => { if (c.type === 'P' && !c.sold && !c.gone) { c.gone = r; withdrew++; } });
        /* lemon owners take the spots the peach owners gave up, so the lot stays one car per buyer */
        for (let k = 0; k < withdrew; k++) { out.cars.push({ i: out.cars.length, type: 'L', sold: null, gone: null, back: false, arrived: r }); arrivals++; }
      }
      out.results[r] = res;
      out.rounds[r] = { bidders: bidders.length, sold, peachSold, lemonSold, refused, none, avg: n ? Math.round(sum / n) : null, profit, withdrew, arrivals,
        left: out.cars.filter(c => !c.sold && !c.gone).length, peachesLeft: out.cars.filter(c => c.type === 'P' && !c.sold && !c.gone).length };
    }
    return out;
  }
  function mine(sim, name) { const k = norm(name); const list = []; for (let r = 1; r <= 4; r++) if (sim.results[r] && sim.results[r][k]) list.push(sim.results[r][k]); return list; }
  return { RES, VAL, parse, deal, simulate, mine, norm, hash };
})();
if (typeof module !== 'undefined') module.exports = LOT;
