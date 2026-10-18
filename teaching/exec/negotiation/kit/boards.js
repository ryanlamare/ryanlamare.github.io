/* The debrief boards every session deck shares (kit/, 17 Oct 2026): the room's data, read from the
   poll server (or, opened plain, the session's invented demo room), and the standard pictures of it.
   A deck calls NKB.start([step ids]) once; its own script wires each board to a slide's reveal steps.
   What the room has seen stays put: a step's data is frozen at its first reveal, as the sample does,
   and an empty room is never frozen (the next read fills it, then it holds). */
(function(){
const N = window.NK, B = window.NKB = {};
const E = B.E = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const sv = B.sv = (tag, at, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
const el = B.el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const txt = B.txt = (parent, at, s) => { const t = sv('text', at, parent); t.textContent = s; return t; };
B.live = N.live;
B.ROLE = ['var(--teal)', 'var(--terracotta)', 'var(--ochre)', 'var(--maroon)', 'var(--green)', 'var(--blue)'];

/* ---------- the room's data ---------- */
const D = B.data = {};
const sum = a => a.reduce((x, y) => x + y, 0);
const redraws = [];
B.onData = fn => redraws.push(fn);
B.start = function(ids){
  ids.forEach(id => {
    const s = N.step(id);
    D[id] = {s, entries: s.type !== 'poll' ? (B.live ? [] : N.demoEntries(s)) : null,
             counts: s.type === 'poll' ? (B.live ? s.o.map(() => 0) : (s.demo || s.o.map(() => 0)).slice()) : null, frozen:null, seen:false};
  });
  document.querySelectorAll('.demotag').forEach(t => t.style.display = B.live ? 'none' : '');
  if (B.live) {
    const tick = () => ids.forEach(id => {
      const d = D[id];
      if (d.s.type === 'poll') N.counts(d.s.room).then(c => { d.counts = d.s.o.map((_, k) => c[k] || 0); if (d.seen && !d.frozen && sum(d.counts)) d.frozen = d.counts.slice(); redraws.forEach(f => f(id)); }).catch(() => {});
      else N.entries(d.s.room).then(es => { d.entries = es; if (d.seen && !d.frozen && es.length) d.frozen = es.slice(); redraws.forEach(f => f(id)); }).catch(() => {});
    });
    tick(); setInterval(tick, 2500);
  }
  dropPrivate();
};
/* a step's data as the room should see it: frozen once revealed */
B.reveal = function(id, on){
  const d = D[id]; d.seen = on;
  if (on && !d.frozen) d.frozen = d.s.type === 'poll' ? (sum(d.counts) ? d.counts.slice() : null) : (d.entries.length ? d.entries.slice() : null);
  if (!on) d.frozen = null;
};
B.counts = id => { const d = D[id]; return d.frozen || d.counts; };
B.parsed = id => { const d = D[id]; return N.parse(d.s, d.frozen || d.entries); };
B.current = id => N.parse(D[id].s, D[id].entries);         /* the record slide counts phones as they arrive */
B.people = id => { const d = D[id]; return N.parseSurvey(d.s, d.frozen || d.entries); };   /* a survey's answers */
B.peopleNow = id => N.parseSurvey(D[id].s, D[id].entries);

/* the private file: dropped on the deck once, kept in this browser */
function dropPrivate(){
  addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('dropping'); });
  addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
  addEventListener('drop', e => {
    e.preventDefault(); document.body.classList.remove('dropping');
    const f = e.dataTransfer.files[0]; if (!f) return;
    f.text().then(t => { const p = JSON.parse(t); if (N.usePriv(p)) { B.note('Private file loaded'); redraws.forEach(fn => fn('*')); } else B.note('That file is not this session’s'); }).catch(() => B.note('That file could not be read'));
  });
}
B.note = function(msg){
  const n = el('div', null, msg);
  n.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);background:var(--ink);color:var(--paper);font:700 14px var(--sans);letter-spacing:.1em;text-transform:uppercase;padding:10px 18px;z-index:99';
  document.body.appendChild(n); setTimeout(() => n.remove(), 2600);
};

/* the phone link for a step, as the room should type it */
B.phoneURL = function(base, id){
  const q = []; if (N.suffix) q.push('room=' + N.suffix); if (id) q.push('step=' + id);
  const p = N.priv();
  return location.host + base + (q.length ? '?' + q.join('&') : '') + (p && p.key ? '#k=' + p.key : '');
};

/* ---------- a poll: one row an answer ---------- */
/* opts: {answer: index of the right answer} or {top: true} to ring the most popular; state {bars, mark} */
B.pollRows = function(box, step, counts, state, opts){
  opts = opts || {};
  const c = counts, mx = Math.max(1, ...c), top = c.indexOf(Math.max(...c));
  box.className = 'qrows' + (opts.tight ? ' tight' : '') + (state.mark ? (opts.answer != null ? ' answer' : ' top') : '');
  box.replaceChildren(...step.o.map((o, k) => {
    const r = el('div', 'qrow' + (opts.answer === k ? ' right' : '') + (opts.answer == null && k === top && c[k] ? ' top' : ''));
    const b = el('div', 'qb'), f = el('div', 'qf'); b.appendChild(f);
    f.dataset.w = (c[k] / mx * 100) + '%'; f.style.width = state.bars ? f.dataset.w : '0';
    const n = el('div', 'qc', state.bars ? String(c[k] || 0) : ''); n.dataset.t = String(c[k] || 0);
    r.append(el('div', 'qt', (opts.labels || step.o)[k]), b, n); return r;
  }));
};
/* bars drawn at full width start again from nothing and grow (a reveal, not a redraw) */
B.grow = function(box){
  box.querySelectorAll('.qf,.bf').forEach(f => { f.style.transition = 'none'; f.style.width = '0'; });
  box.querySelectorAll('.qc,.bc').forEach(n => { n.textContent = ''; });
  void box.offsetWidth;
  box.querySelectorAll('.qf,.bf').forEach(f => { f.style.transition = ''; });
  B.growBars(box);
};
B.growBars = box => requestAnimationFrame(() => requestAnimationFrame(() => {
  box.querySelectorAll('.qf,.bf').forEach(f => f.style.width = f.dataset.w);
  box.querySelectorAll('.qc,.bc').forEach(n => { if (n.dataset.t != null) n.textContent = n.dataset.t; });
}));

/* ---------- who has recorded ---------- */
B.recordGrid = function(grid, count, step, parsed, opts){
  opts = opts || {};
  const by = {}; parsed.groups.forEach(g => by[g.n] = g);
  const top = Math.max(opts.min || 16, ...parsed.groups.map(g => g.n));
  count.textContent = parsed.groups.length;
  grid.className = 'pgrid' + (step.roles.length > 3 ? ' six' : '');
  grid.replaceChildren(...Array.from({length: top}, (_, k) => {
    const n = k + 1, g = by[n], all = g && g.sides === step.roles.length;
    const t = el('div', 'gt' + (all ? ' both' : g ? ' some' : ''));
    t.appendChild(el('b', null, String(n)));
    const dd = el('div', 'dd');
    step.roles.forEach((r, i) => dd.appendChild(el('i', 'rc' + i + (g && g.roles[r.k] ? ' on' : ''))));
    t.appendChild(dd); return t;
  }));
};
B.roleKey = function(box, step){
  box.replaceChildren(...step.roles.map((r, i) => { const s = el('span'); const d = el('i'); d.style.background = B.ROLE[i]; s.append(d, r.n); return s; }));
};

/* ---------- a number line: every group's deal ---------- */
/* opts: {values:[{n, v, mismatch, ring}], cur, lo, hi, zone:{lo, hi, label}, marks:[{v, label, color}], nodeal:[n], state:{dots, zone, marks}, axis,
   ax (the axis's height in the picture, default 262; a deck with ranges gives the dots more room),
   ranges:[{side:'max'|'min', v, label, color}]}: each side's range of settlement, a bar in a band above the dots that runs
   from the side's limit (v) to the end of the line it would rather reach (a payer's 'max' runs left, a seller's 'min' right);
   state['range' + i] shows bar i, and a 'min' bar lights its limit on the axis when it is a tick (Sally's $0) */
const nice = span => { const raw = span / 6, p = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 2.5, 5, 10].map(m => m * p).find(s => span / s <= 7.5) || 10 * p; };
B.strip = function(svg, o){
  const W = 1088, L = 30, R = o.nodeal && o.nodeal.length ? 150 : 30, AX = o.ax || 262, RAD = 15;
  const RG = o.ranges || [], BH = 22, BS = 26;   /* the ranges' bars, in a band at the top */
  const TOP = RG.length ? 22 + RG.length * BS : 44, FOOT = RG.length ? 32 : 24, MID = RG.length ? Math.round((TOP + RAD + AX - RAD - FOOT) / 2) : 150;   /* FOOT keeps the dots clear of the zone's label */
  svg.replaceChildren();
  const vals = o.values.map(x => x.v).concat(o.zone ? [o.zone.lo, o.zone.hi] : [], (o.marks || []).map(m => m.v), RG.map(r => r.v));
  let lo = o.lo != null ? o.lo : Math.min(...vals), hi = o.hi != null ? o.hi : Math.max(...vals);
  if (!(hi > lo)) { lo = lo - 1; hi = hi + 1; }
  const step = nice(hi - lo);
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  if (o.lo == null && lo === Math.min(...vals)) lo -= step;
  if (o.hi == null && hi === Math.max(...vals)) hi += step;
  const x = v => L + (v - lo) / (hi - lo) * (W - L - R);
  /* the zone, under everything */
  if (o.zone) {
    /* with ranges, the zone reaches up round both bars: it is where they overlap */
    const zt = RG.length ? 4 : 40;
    const z = sv('g', {class:'st-late' + (o.state.zone ? ' on' : '')}, svg);
    sv('rect', {x:x(o.zone.lo), y:zt, width:Math.max(2, x(o.zone.hi) - x(o.zone.lo)), height:AX - zt, fill:'color-mix(in srgb, var(--green) 16%, transparent)', stroke:'var(--green)', 'stroke-width':2, 'stroke-dasharray':'6 5'}, z);
    txt(z, {x:x(o.zone.lo) + 10, y:AX - 12, 'text-anchor':'start', 'font-size':14, 'font-weight':800, 'letter-spacing':'.08em', fill:'var(--green)'}, o.zone.label || 'THE BARGAINING ZONE');
  }
  /* the ranges: one bar a side, its label and limit inside the bar at the limit's end */
  const hot = [];
  RG.forEach((r, i) => {
    const on = !!o.state['range' + i], y = 8 + i * BS, H = BH, max = r.side === 'max';
    const x0 = max ? L : x(r.v), x1 = max ? x(r.v) : W - R;
    const g = sv('g', {class:'st-range r' + i + ' ' + (max ? 'max' : 'min') + (on ? ' on' : '')}, svg);
    sv('rect', {class:'rg-bar', x:x0, y, width:Math.max(2, x1 - x0), height:H, fill:r.color || 'var(--ink)'}, g);
    const t = txt(g, {class:'rg-t', x:max ? x1 - 10 : x0 + 10, y:y + 16, 'text-anchor':max ? 'end' : 'start', 'font-size':14, 'font-weight':800, 'letter-spacing':'.07em', fill:'var(--paper)'}, '');
    const amt = N.fmt(r.v, o.cur);
    t.textContent = max ? r.label + '  ' + amt : amt + '  ' + r.label;
    if (on && !max) hot.push(r.v);
  });
  /* the axis */
  sv('line', {x1:L, y1:AX, x2:W - R, y2:AX, stroke:'var(--ink)', 'stroke-width':2.5}, svg);
  for (let v = lo; v <= hi + step / 1e6; v += step) {
    sv('line', {x1:x(v), y1:AX, x2:x(v), y2:AX + 8, stroke:'var(--ink)', 'stroke-width':2}, svg);
    const lit = hot.some(h => Math.abs(h - v) < step / 1e6);
    txt(svg, lit ? {class:'tick-hot', x:x(v), y:AX + 38, 'text-anchor':'middle', 'font-size':30, 'font-weight':900, fill:'var(--red)'} : {x:x(v), y:AX + 30, 'text-anchor':'middle', 'font-size':15, 'font-weight':600, fill:'var(--muted)'}, o.fmt ? o.fmt(v) : N.short(v, o.cur));
  }
  if (o.axis) txt(svg, {x:(L + W - R) / 2, y:AX + 58, 'text-anchor':'middle', 'font-size':14, 'font-weight':700, 'letter-spacing':'.14em', fill:'var(--muted)'}, o.axis);
  /* the marks: lines with their labels at the top */
  let lastX = -1e9, row = 0;
  (o.marks || []).slice().sort((a, b) => a.v - b.v).forEach(m => {
    const mx = x(m.v); row = mx - lastX < 230 ? 1 - row : 0; lastX = mx;
    const g = sv('g', {class:'st-late' + (o.state.marks ? ' on' : '')}, svg), y = 14 + row * 18;
    sv('line', {x1:mx, y1:y + 6, x2:mx, y2:AX, stroke:m.color || 'var(--red)', 'stroke-width':3.5}, g);
    txt(g, {x:mx, y, 'text-anchor':m.anchor || 'middle', 'font-size':13, 'font-weight':800, 'letter-spacing':'.06em', fill:m.color || 'var(--red)'}, m.label);
  });
  /* the dots, eased apart so every group can find its number */
  const placed = [];
  const order = o.values.slice().sort((a, b) => a.v - b.v);
  const g = sv('g', {class:o.state.dots ? 'st-on' : ''}, svg); B._stripDots = g;
  order.forEach((d, i) => {
    const cx = x(d.v); let cy = MID;
    for (let k = 0; k < 40; k++) {
      const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (RAD * 2 + 3);
      const y = MID + off;
      if (y < TOP + RAD || y > AX - RAD - FOOT) continue;
      if (!placed.some(p => Math.hypot(p[0] - cx, p[1] - y) < RAD * 2 + 2)) { cy = y; break; }
    }
    placed.push([cx, cy]);
    const dot = sv('g', {class:'st-dot', style:'transition-delay:' + (i * 55) + 'ms'}, g);
    if (d.ring) sv('circle', {cx, cy, r:RAD + 5, fill:'none', stroke:'var(--red)', 'stroke-width':3.5}, dot);
    sv('circle', {cx, cy, r:RAD, fill:d.fill || 'var(--ink)', stroke:d.mismatch ? 'var(--ochre)' : 'var(--paper)', 'stroke-width':d.mismatch ? 4 : 1.5}, dot);
    txt(dot, {x:cx, y:cy + 5, 'text-anchor':'middle', 'font-size':14, 'font-weight':800, fill:'var(--paper)'}, d.n);
  });
  /* the groups with no deal, at the right */
  if (o.nodeal && o.nodeal.length) {
    const nx = W - R + 40, ng = sv('g', {class:o.state.dots ? 'st-on' : ''}, svg);
    txt(ng, {x:nx + 36, y:44, 'text-anchor':'middle', 'font-size':13, 'font-weight':800, 'letter-spacing':'.12em', fill:'var(--muted)'}, 'NO DEAL');
    o.nodeal.forEach((n, k) => {
      const cx = nx + (k % 3) * 34, cy = 72 + Math.floor(k / 3) * 34;
      const d = sv('g', {class:'st-dot'}, ng);
      sv('circle', {cx, cy, r:RAD - 1, fill:'var(--paper)', stroke:'var(--ink)', 'stroke-width':2.5}, d);
      txt(d, {x:cx, y:cy + 5, 'text-anchor':'middle', 'font-size':13, 'font-weight':800, fill:'var(--ink)'}, n);
    });
  }
  return {x, lo, hi};
};
B.popDots = svg => requestAnimationFrame(() => requestAnimationFrame(() => svg.querySelectorAll('g').forEach(g => { if (g.querySelector(':scope > .st-dot')) g.classList.add('st-on'); })));

/* ---------- bars: how many gave each answer ---------- */
/* opts: {max (the full width; default the largest count), fmt (how a number shows), hot (index to ring), colors} */
B.bars = function(box, labels, counts, state, opts){
  opts = opts || {};
  const mx = opts.max || Math.max(1, ...counts), top = counts.indexOf(Math.max(...counts)), show = opts.fmt || String;
  box.replaceChildren(...labels.map((l, k) => {
    const r = el('div', 'brow' + (state.mark && (opts.hot != null ? opts.hot === k : k === top) && counts[k] ? ' hot' : ''));
    const t = el('div', 'bt'), f = el('div', 'bf'); t.appendChild(f);
    f.dataset.w = (counts[k] / mx * 100) + '%'; f.style.width = state.bars ? f.dataset.w : '0';
    if (opts.colors && opts.colors[k]) f.style.background = opts.colors[k];
    const c = el('div', 'bc', state.bars ? show(counts[k]) : ''); c.dataset.t = show(counts[k]);
    r.append(el('div', 'bl', l), t, c); return r;
  }));
};

/* ---------- the wall: what else the room agreed ---------- */
B.wall = function(box, terms, show, empty){
  if (!show) { box.replaceChildren(); return; }
  if (!terms.length) { box.replaceChildren(el('div', 'wallempty', empty || 'Nothing else this time')); return; }
  box.replaceChildren(...terms.slice(0, 15).map(t => { const c = el('div', 'wcard'); c.append(el('div', 'wn', String(t.g)), el('div', 'wt', t.t)); return c; }));
};
/* the same, one column a box of a step's extras: cols [{label, terms}], shown column by column (show = how many);
   opts {most (cards a column), unit:['pair', 'pairs'], empty} */
B.wallCols = function(box, cols, show, opts){
  opts = opts || {};
  const most = opts.most || 6, unit = opts.unit || ['pair', 'pairs'];
  box.replaceChildren(...cols.map((c, i) => {
    const col = el('div', 'wcol' + (i < show ? ' on' : ''));
    const n = new Set(c.terms.map(t => t.g)).size;
    const h = el('div', 'wch'), cnt = el('div', 'wcn');
    cnt.append(el('b', null, String(n)), el('i', null, n === 1 ? unit[0] : unit[1]));
    h.append(el('span', null, c.label), cnt);
    col.appendChild(h);
    if (!c.terms.length) col.appendChild(el('div', 'wallempty', opts.empty || 'Nothing this time'));
    c.terms.slice(0, most).forEach(t => { const w = el('div', 'wcard'); w.append(el('div', 'wn', String(t.g)), el('div', 'wt', t.t)); col.appendChild(w); });
    if (c.terms.length > most) col.appendChild(el('div', 'wmore', 'and ' + (c.terms.length - most) + ' more'));
    return col;
  }));
};

/* ---------- the record slide's phone, and the link a live room types ---------- */
B.recordSlide = function(o){
  /* o: {step, frame:'iframe id', src, wrap:'phone wrap id', qr:'qr row id', grid, count, key, base} */
  const s = N.step(o.step);
  E(o.frame).src = o.src;
  B.roleKey(E(o.key), s);
  const draw = () => B.recordGrid(E(o.grid), E(o.count), s, B.current(o.step), {min:o.min});
  const link = () => { if (!B.live) return; E(o.wrap).style.display = 'none'; E(o.qr).querySelector('.qrtx').replaceChildren(el('div', 'livelink', B.phoneURL(o.base, o.step))); };
  draw(); link();
  B.onData(id => { if (id === o.step || id === '*') { draw(); link(); } });
};
})();
