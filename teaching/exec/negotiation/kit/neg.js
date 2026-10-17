/* The Strategic Negotiation sessions' shared runtime (kit/, 17 Oct 2026): rooms, the poll server,
   the wire format, demo rooms and the private file. Every session's deck and phone page load this
   first, then their own session.js, which calls NK.session({...}) with the session's steps.

   A session is a list of steps, in the order the room meets them:
     {id, type:'poll', q, o:[answers], demo:[counts]}            a question on phones, one answer each
     {id, type:'deal', name, group:'pair'|'group', max, roles:[{k, n}], fields:[...], extra, nodeal, demo}
                                                                  an exercise whose result each phone records
   Fields of a deal step (each may carry roles:[...] to ask only those roles, and always:true to be
   asked even when there was no deal, and own:true when each person answers for themselves rather than for
   the agreement):
     {k, type:'money', q, cur:'$', min, max}      a number, typed
     {k, type:'choice', q, o:[...]}               one of a few answers
     {k, type:'scale', q, lo, hi}                 1 to 5
     {k, type:'option', q, n}                     one of n options on the paper agreement form (A1, A2...)

   Wire (one room a step: <prefix>-<id>, and <prefix>-<id>-<x> with ?room=<x>):
     "d|7|a|fee=45000;first=0"   group 7's role a recorded a deal (values by field key)
     "d|7|a|x"                   ... recorded no deal (plus any always-asked fields: "x;proc=4")
     "c|7|a|text"                ... anything else they agreed, in their own words
   The latest line of each kind from each phone counts, so a phone can record again.
   Polls are plain votes in their own room.

   Licensed exercises: nothing confidential lives in this public repo. A deck's overlays (bargaining
   zones, scores) come from the session's private file, dropped on the deck once and kept in that
   browser. Opened plain, a deck runs on invented DEMO DATA. */
(function(){
const NK = window.NK = {};
NK.API = 'https://gt-poll.rlamare.workers.dev';
const Q = NK.Q = new URLSearchParams(location.search);
NK.demo = Q.has('demo');                          /* a phone that never touches the network */
NK.live = Q.has('live') || Q.has('room');         /* a deck that reads real phones */
NK.suffix = (Q.get('room') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);

NK.session = function(cfg){
  NK.S = cfg;
  cfg.steps.forEach((st, i) => {
    st.i = i;
    st.room = cfg.prefix + '-' + st.id + (NK.suffix ? '-' + NK.suffix : '');
    if (st.type === 'deal') st.fields = st.fields || [];
  });
  return cfg;
};
NK.step = id => NK.S.steps.find(s => s.id === id);
NK.roleIndex = (st, k) => st.roles.findIndex(r => r.k === k);
/* the fields a role is asked */
NK.fieldsFor = (st, role) => st.fields.filter(f => !f.roles || f.roles.includes(role));

/* ---------- text and numbers ---------- */
NK.clean = t => String(t || '').replace(/[|\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
NK.fmt = (n, cur) => (n < 0 ? '−' : '') + (cur || '') + Math.round(Math.abs(n)).toLocaleString('en-GB');
NK.short = (n, cur) => {                          /* $45k, $1.2m: for axis labels */
  const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1e6) return s + (cur || '') + (Math.round(a / 1e5) / 10) + 'm';
  if (a >= 1e4) return s + (cur || '') + Math.round(a / 1e3) + 'k';
  if (a >= 1e3) return s + (cur || '') + (Math.round(a / 100) / 10) + 'k';
  return s + (cur || '') + Math.round(a);
};
/* seeded random numbers, so every viewing of a demo room matches */
NK.rng = function(seed){
  let s = seed | 0;
  return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
};

/* ---------- the poll server ---------- */
const post = (room, path, body) => fetch(NK.API + '/p/' + room + '/' + path, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body)})
  .then(r => { if (!r.ok) throw new Error(path + ' ' + r.status); return r.json(); });
const get = (room, path) => fetch(NK.API + '/p/' + room + (path ? '/' + path : ''), {cache:'no-store'}).then(r => r.json());
NK.vote = (room, v, o) => post(room, 'vote', {o, v});
NK.say = (room, v, t) => post(room, 'say', {t, v});
NK.counts = room => get(room).then(d => d.counts || []);
NK.votes = room => get(room, 'votes').then(d => d.votes || {});
NK.entries = room => get(room, 'entries').then(d => d.entries || []);

/* one id per browser, shared by every session's phone page */
NK.voter = function(){
  let v; try { v = localStorage.getItem('negk-voter'); } catch(_){}
  if (!v) { v = 'negk-' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 6); try { localStorage.setItem('negk-voter', v); } catch(_){} }
  return v;
};

/* ---------- the wire ---------- */
NK.enc = vals => Object.keys(vals).filter(k => vals[k] != null && vals[k] !== '').map(k => k + '=' + vals[k]).join(';');
NK.dec = s => {
  const o = {};
  String(s || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) { const v = +p.slice(i + 1); if (Number.isFinite(v)) o[p.slice(0, i)] = v; } });
  return o;
};
/* a deal step's room, read: one entry per group, its agreement and what each role said */
NK.parse = function(st, entries){
  const keys = st.roles.map(r => r.k), dl = {}, cl = {};
  (entries || []).forEach(e => {
    const p = String(e.t || '').split('|');
    if (!/^\d{1,2}$/.test(p[1]) || !keys.includes(p[2])) return;
    const g = +p[1], role = p[2], rest = p.slice(3).join('|');
    if (p[0] === 'd') {
      const x = rest === 'x' || rest.startsWith('x;');
      dl[e.v] = {g, role, x, vals: NK.dec(x ? rest.slice(2) : rest), v:e.v};   /* a phone's latest record counts, even if it changed group */
    }
    if (p[0] === 'c' && rest.trim()) cl[e.v] = {g, role, t:NK.clean(rest)};
  });
  const by = {};
  Object.values(dl).forEach(r => { (by[r.g] = by[r.g] || {})[r.role] = r; });
  const shared = st.fields.filter(f => !f.own && (!f.roles || f.roles.length > 1));   /* the agreement; own:true fields are each person's own answer */
  const groups = Object.keys(by).map(Number).sort((a, b) => a - b).map(g => {
    const recs = by[g], order = keys.filter(k => recs[k]);
    const out = {n:g, roles:recs, sides:order.length};
    const deals = order.filter(k => !recs[k].x);
    out.mismatch = deals.length > 0 && deals.length < order.length;           /* one phone says deal, another no deal */
    if (!deals.length) { out.nodeal = true; out.vals = {}; return out; }
    out.vals = {};
    shared.forEach(f => {
      /* the agreement on a shared field: what most of the group's phones say (the first role in the list breaks a tie) */
      const tally = new Map();
      deals.forEach(k => { const v = recs[k].vals[f.k]; if (v != null) tally.set(v, (tally.get(v) || 0) + 1); });
      if (!tally.size) return;
      let best = null, bn = 0; tally.forEach((n, v) => { if (n > bn) { best = v; bn = n; } });
      out.vals[f.k] = best;
      if (tally.size > 1) out.mismatch = true;
    });
    return out;
  });
  /* what else they agreed: one card per group, even when two phones wrote the same thing */
  const terms = [];
  Object.values(cl).sort((a, b) => a.g - b.g).forEach(x => {
    if (!terms.some(t => t.g === x.g && t.t.toLowerCase() === x.t.toLowerCase())) terms.push(x);
  });
  return {groups, terms, deals:groups.filter(g => !g.nodeal), nodeals:groups.filter(g => g.nodeal)};
};
/* every role's answers to one field, across the room (for questions each person answers for themselves) */
NK.answers = function(st, parsed, k){
  const out = [];
  parsed.groups.forEach(g => Object.values(g.roles).forEach(r => { if (r.vals[k] != null) out.push({g:g.n, role:r.role, v:r.vals[k], x:r.x}); }));
  return out;
};

/* ---------- demo rooms ---------- */
/* a deal step's demo(rnd, n) returns group n's room as phones would send it:
   {vals:{...}} for a deal, {x:true} for none, plus optional per:{role:{...}} (each role's own answers),
   skip:[roles that never recorded], diff:{role:{field:value}} (a phone that remembers differently), text */
NK.demoEntries = function(st){
  if (!st.demo) return [];
  const rnd = NK.rng(st.demo.seed || 20261017), out = [];
  for (let n = 1; n <= (st.demo.groups || 14); n++) {
    const d = st.demo.gen(rnd, n) || {};
    st.roles.forEach((r, ri) => {
      if ((d.skip || []).includes(r.k)) return;
      const own = Object.assign({}, d.x ? {} : d.vals, (d.per || {})[r.k] || {}, (d.diff || {})[r.k] || {});
      const keep = {};
      NK.fieldsFor(st, r.k).forEach(f => { if (own[f.k] != null && (!d.x || f.always)) keep[f.k] = own[f.k]; });
      const body = (d.x ? 'x' : '') + (Object.keys(keep).length ? (d.x ? ';' : '') + NK.enc(keep) : '');
      out.push({v:'demo-' + r.k + n, t:'d|' + n + '|' + r.k + '|' + (body || 'x')});
      if (d.text && ri === 0) out.push({v:'demo-' + r.k + n, t:'c|' + n + '|' + r.k + '|' + d.text});
    });
  }
  return out;
};

/* ---------- the private file (decks only) ---------- */
/* {"session":N, "steps":{"<id>":{...}}, "key":"..."}: kept in this browser, never in the repo */
NK.privKey = () => 'negk-priv-' + NK.S.prefix;
NK.priv = function(){ try { const p = JSON.parse(localStorage.getItem(NK.privKey())); return p && p.session === NK.S.n ? p : null; } catch(_) { return null; } };
NK.pv = id => { const p = NK.priv(); return p && p.steps ? p.steps[id] || null : null; };
NK.usePriv = function(p){
  if (!p || p.session !== NK.S.n || typeof p.steps !== 'object') return false;
  try { localStorage.setItem(NK.privKey(), JSON.stringify(p)); } catch(_) { return false; }
  return true;
};

/* ---------- encrypted forms (phones, for licensed agreement forms) ---------- */
/* <session>/forms.enc is AES-GCM; the key travels in the session link's #k=, which a browser never sends */
NK.openForms = async function(url){
  const H = new URLSearchParams(location.hash.slice(1)), store = 'negk-key-' + NK.S.prefix;
  let k = H.get('k');
  try { if (k) localStorage.setItem(store, k); else k = localStorage.getItem(store); } catch(_){}
  if (!k) return null;
  const b64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '')), c => c.charCodeAt(0));
  const blob = b64(await (await fetch(url, {cache:'no-store'})).text());
  const key = await crypto.subtle.importKey('raw', b64(k), 'AES-GCM', false, ['decrypt']);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM', iv:blob.slice(0, 12)}, key, blob.slice(12))));
};
})();
