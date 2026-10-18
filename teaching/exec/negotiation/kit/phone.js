/* The participant's phone for every session but the sample (kit/, 17 Oct 2026). One page a session
   (<session>/deal/), built from the session's steps in session.js: a poll is a question with one
   answer held to send; an exercise asks for the pair or group number, the role, then the result as
   the paper agreement form has it, and a hold sends it. The page never shows anything confidential:
   the briefs stay on paper, and a licensed form's wording, where a phone needs it, opens from the
   session's forms.enc with the key in the link (#k=...).
   ?step=<id> opens that step (each exercise's QR carries one). ?demo=1 never touches the network.
   Deep links for the deck's phone frame and for screenshots (demo only):
     ?demo=1&frame=1&step=<id>&g=7&role=<k>&at=group|role|form|done&v=fee.45000,first.0&x=1&t=<text>
     ?demo=1&frame=1&step=<survey id>&at=q&qi=2   (a survey, at its third question)
   All wording is Claude's draft, for Ryan to change. */
(function(){
const N = window.NK, S = N.S, Q = N.Q;
/* the steps this phone asks; phone:false marks a step only the deck reads (another session's room, say) */
const STEPS = S.steps.filter(s => s.phone !== false);
if (Q.has('frame')) document.body.classList.add('frame');
const app = document.getElementById('app');
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const button = (cls, label, fn) => { const b = el('button', cls, label); b.type = 'button'; b.onclick = fn; return b; };

/* ---------- state ---------- */
const KEY = 'negk-phone-' + S.prefix + (N.suffix ? '-' + N.suffix : '') + (N.demo ? '-demo' : '');
const DEEP = N.demo && !!Q.get('at');
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch(_) { return {}; } };
let st = DEEP || Q.has('fresh') ? {} : load();
st.p = st.p || {}; st.d = st.d || {};
const save = () => { if (!DEEP) try { localStorage.setItem(KEY, JSON.stringify(st)); } catch(_){} };
const voter = N.voter();
const send = (room, t) => N.demo ? Promise.resolve() : N.say(room, voter, t);
const vote = (room, o) => N.demo ? Promise.resolve() : N.vote(room, voter, o);

/* the deck's phone frame and the screenshots open part-way through */
if (DEEP) {
  const s = N.step(Q.get('step'));
  if (s) {
    STEPS.forEach(x => { if (x.i < s.i) { if (x.type === 'poll') st.p[x.id] = {skip:true}; else st.d[x.id] = {sent:true, ack:true}; } });
    if (s.type === 'survey') st.p[s.id] = {a:{}, i:+Q.get('qi') || 0};
    if (s.type === 'deal') {
      const d = st.d[s.id] = {vals:{}};
      const at = Q.get('at');
      if (at !== 'group') d.g = +Q.get('g') || 7;
      if (at !== 'group' && at !== 'role') d.role = Q.get('role') || s.roles[0].k;
      (Q.get('v') || '').split(',').forEach(p => { const [k, v] = p.split('.'); if (k && v != null && v !== '') d.vals[k] = +v; });
      if (Q.has('x')) d.x = true;
      if (Q.get('t')) d.text = Q.get('t');
      (s.extras || []).forEach(x => { if (Q.get('t.' + x.k)) (d.texts = d.texts || {})[x.k] = Q.get('t.' + x.k); });
      if (at === 'done') d.sent = true;
    }
  }
}

/* licensed forms' wording, for the steps that need it */
let forms = null, formsErr = false;
const needsForms = STEPS.some(s => s.forms);

/* ---------- pieces ---------- */
const colour = (s, d) => d && d.role != null ? 'c' + Math.max(0, N.roleIndex(s, d.role)) : '';
function head(s, d){
  ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'].forEach(c => document.body.classList.remove(c));
  const c = s && s.type === 'deal' ? colour(s, d) : ''; if (c) document.body.classList.add(c);
  const t = el('div', 'tag'), l = el('span');
  l.append(el('i'), document.createTextNode(s && s.type === 'deal' ? s.name : S.title));
  t.appendChild(l);
  if (N.demo && !Q.has('frame')) t.appendChild(el('span', 'demo', 'Demo'));
  else if (s && s.type === 'deal' && d && d.g != null) {
    const r = d.role != null ? s.roles[N.roleIndex(s, d.role)] : null;
    t.appendChild(el('b', null, (s.group === 'group' ? 'Group ' : 'Pair ') + d.g + (r ? ' · ' + r.n : '')));
  }
  return t;
}
function shell(){ const w = el('div', 'wrap'); app.replaceChildren(w); scrollTo(0, 0); return w; }
function holdButton(label, onDone){
  const b = el('button', 'hold'); b.type = 'button';
  const f = el('div', 'fill'), s = el('span', null, label);
  b.append(f, s);
  let timer = null;
  const start = e => { if (b.disabled) return; e.preventDefault(); b.classList.add('holding'); timer = setTimeout(() => { timer = null; b.classList.remove('holding'); onDone(); }, 650); };
  const stop = () => { if (timer) { clearTimeout(timer); timer = null; } b.classList.remove('holding'); };
  b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
  b.addEventListener('contextmenu', e => e.preventDefault());
  return b;
}
function splash(cls, top, line, then){
  const s = el('div', 'splash ' + (cls || ''));
  s.append(el('div', 'ck', top), el('div', 'cp', line));
  document.body.appendChild(s);
  setTimeout(() => { s.remove(); then(); }, 1300);
}

/* ---------- which step this phone is on ---------- */
function finished(s){
  if (s.type === 'poll' || s.type === 'survey') { const p = st.p[s.id]; return !!(p && (p.sent || p.skip)); }
  const d = st.d[s.id]; return !!(d && d.sent && d.ack);
}
function current(){
  const want = N.step(Q.get('step') || '');
  if (want && want.phone !== false && (want.type === 'deal' || !finished(want))) return want;
  return STEPS.find(s => !finished(s)) || null;
}
function nextAfter(s){ return STEPS.find(x => x.i > s.i && !finished(x)) || null; }

function draw(){
  const s = current();
  if (!s) return allDone();
  if (s.type === 'poll') return pollScreen(s);
  if (s.type === 'survey') return surveyScreen(s);
  const d = st.d[s.id] || (st.d[s.id] = {vals:{}});
  d.vals = d.vals || {};
  if (s.forms && !forms && !N.demo) return needForms(s, d);
  if (d.sent) return doneScreen(s, d);
  if (d.g == null) return groupScreen(s, d);
  if (d.role == null) return roleScreen(s, d);
  formScreen(s, d);
}

/* ---------- a poll ---------- */
function pollScreen(s){
  const w = shell(); w.append(head(s), el('h2', null, s.q));
  if (s.hint) w.appendChild(el('p', 'hint', s.hint));
  const box = el('div', 'opts'); let pick = -1;
  const opts = s.o.map((o, k) => { const b = el('button', 'opt', o); b.type = 'button'; b.onclick = () => { pick = k; opts.forEach((x, j) => x.classList.toggle('on', j === k)); go.disabled = false; }; box.appendChild(b); return b; });
  const err = el('div', 'err');
  const go = holdButton('Hold to send', () => {
    vote(s.room, pick).then(() => { st.p[s.id] = {o:pick, sent:true}; save(); splash('', S.title, 'Answer sent', draw); })
      .catch(() => { err.textContent = 'That did not go through. Hold again.'; });
  });
  go.disabled = true;
  w.append(box, go, err, button('back', 'Skip this question', () => { st.p[s.id] = {skip:true}; save(); draw(); }));
}

/* ---------- a survey: one question a screen, sent together at the end ---------- */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function surveyScreen(s){
  const p = st.p[s.id] || (st.p[s.id] = {a:{}, i:0});
  p.a = p.a || {};
  const ver = {}; s.qs.forEach(q => { if (q.versions) ver[q.k] = NK_ver(q); });
  if (p.i >= s.qs.length) return surveySend(s, p, ver);
  const q = s.qs[p.i], vq = q.versions ? Object.assign({}, q, q.versions[ver[q.k]]) : q;
  const w = shell(); w.append(head(s), el('div', 'hint', 'Question ' + (p.i + 1) + ' of ' + s.qs.length), el('h2', vq.q.length > 110 ? 'long' : null, vq.q));
  const next = button('go', p.i + 1 < s.qs.length ? 'Next question' : 'Done', () => { p.i++; save(); draw(); });
  const ready = () => { next.disabled = p.a[q.k] == null; };
  if (q.type === 'money') {
    const m = el('div', 'money'), inp = el('input'); inp.inputMode = 'numeric'; inp.autocomplete = 'off';
    if (p.a[q.k] != null) inp.value = Math.round(p.a[q.k]).toLocaleString('en-GB');
    inp.oninput = () => { const d = inp.value.replace(/[^0-9]/g, '').slice(0, 10); inp.value = d ? (+d).toLocaleString('en-GB') : ''; if (d) p.a[q.k] = +d; else delete p.a[q.k]; save(); ready(); };
    m.append(el('span', null, q.cur || ''), inp); w.appendChild(m);
  } else if (q.type === 'date') {
    const row = el('div', 'ch'), ms = el('select'), ds = el('select');
    [ms, ds].forEach(x => { x.style.cssText = 'font:600 17px var(--sans);padding:12px;border:2.5px solid var(--ink);background:var(--paper-soft);color:var(--ink)'; });
    ms.appendChild(new Option('Month', '')); MONTHS.forEach((m, k) => ms.appendChild(new Option(m, k + 1)));
    ds.appendChild(new Option('Day', '')); for (let d = 1; d <= 31; d++) ds.appendChild(new Option(String(d), d));
    if (p.a[q.k] != null) { ms.value = Math.floor(p.a[q.k] / 100); ds.value = p.a[q.k] % 100; }
    const set = () => { if (ms.value && ds.value) p.a[q.k] = (+ms.value) * 100 + (+ds.value); else delete p.a[q.k]; save(); ready(); };
    ms.onchange = set; ds.onchange = set; row.append(ms, ds); w.appendChild(row);
  } else {
    const box = el('div', 'opts');
    const bs = vq.o.map((o, k) => { const b = button('opt' + (p.a[q.k] === k ? ' on' : ''), o, () => { p.a[q.k] = k; save(); bs.forEach((x, j) => x.classList.toggle('on', j === k)); ready(); }); box.appendChild(b); return b; });
    w.appendChild(box);
  }
  ready();
  w.appendChild(next);
  if (p.i > 0) w.appendChild(button('back', 'Back', () => { p.i--; save(); draw(); }));
  w.appendChild(button('back', 'Skip this question', () => { delete p.a[q.k]; p.i++; save(); draw(); }));
}
function NK_ver(q){ return N.version(voter, q.k, q.versions.length); }
function surveySend(s, p, ver){
  const w = shell(); w.append(head(s), el('h2', null, s.sendQ || 'Send your answers'), el('p', 'hint', 'Your answers are anonymous. Nobody sees who said what.'));
  const err = el('div', 'err');
  const go = holdButton('Hold to send', () => {
    send(s.room, 'a|' + N.enc(ver) + '|' + N.enc(p.a)).then(() => { p.sent = true; save(); splash('', S.title, 'Answers sent', draw); })
      .catch(() => { err.textContent = 'That did not go through. Hold again.'; });
  });
  w.append(go, err, button('back', 'Back to the questions', () => { p.i = 0; save(); draw(); }));
}

/* ---------- an exercise ---------- */
function groupScreen(s, d){
  const w = shell(); w.append(head(s, d), el('h2', null, s.group === 'group' ? 'Your group number' : 'Your pair number'));
  if (s.groupHint) w.appendChild(el('p', 'hint', s.groupHint));
  const g = el('div', 'nums');
  for (let n = 1; n <= (s.max || 24); n++) g.appendChild(button(null, String(n), () => { d.g = n; save(); draw(); }));
  w.appendChild(g);
}
function roleScreen(s, d){
  const w = shell(); w.append(head(s, d), el('h2', null, 'Your role'));
  const box = el('div', 'roles' + (s.roles.length === 3 || s.roles.some(r => r.n.length > 22) ? ' one' : ''));
  s.roles.forEach((r, i) => box.appendChild(button('role c' + i, r.n, () => { d.role = r.k; save(); draw(); })));
  w.append(box, button('back', s.group === 'group' ? 'Change group number' : 'Change pair number', () => { delete d.g; save(); draw(); }));
}
const fq = (s, f) => { const t = forms && forms.steps && forms.steps[s.id] && forms.steps[s.id][f.k + ':q']; return t || f.q; };
const label = (s, f, j) => {
  const fl = forms && forms.steps && forms.steps[s.id] && forms.steps[s.id][f.k];
  if (fl && fl[j]) return fl[j];
  return f.code ? f.code + (j + 1) : (f.o ? f.o[j] : String(j + 1));
};
function formScreen(s, d){
  const w = shell(), fields = N.fieldsFor(s, d.role);
  w.append(head(s, d), el('h2', null, d.x ? (s.nodealTitle || 'No deal') : (s.recordQ || 'Record your deal')));
  const err = el('div', 'err');
  const ask = f => !d.x || f.always;
  const ready = () => fields.every(f => !ask(f) || f.optional || d.vals[f.k] != null);
  if (d.x && s.nodealNote) w.appendChild(el('p', 'nodealnote', s.nodealNote));
  fields.filter(ask).forEach(f => {
    const box = el('div', 'field');
    if (f.type === 'money') {
      const lab = el('label', null, f.q), m = el('div', 'money'), inp = el('input');
      inp.inputMode = 'numeric'; inp.autocomplete = 'off'; inp.id = 'f-' + f.k; lab.htmlFor = inp.id;
      inp.placeholder = f.placeholder || '';
      if (d.vals[f.k] != null) inp.value = Math.round(d.vals[f.k]).toLocaleString('en-GB');
      inp.oninput = () => {
        const digits = inp.value.replace(/[^0-9]/g, '').slice(0, 9);
        inp.value = digits ? (+digits).toLocaleString('en-GB') : '';
        if (digits) d.vals[f.k] = +digits; else delete d.vals[f.k];
        save(); go.disabled = !ready();
      };
      m.append(el('span', null, f.cur || ''), inp); box.append(lab, m);
    } else {
      box.appendChild(el('div', 'q', fq(s, f)));
      const n = f.type === 'scale' ? 5 : f.type === 'option' ? f.n : f.o.length;
      const texts = Array.from({length:n}, (_, j) => f.type === 'scale' ? String(j + 1) : label(s, f, j));
      const long = texts.some(t => t.length > (n > 3 ? 6 : 14));
      const ch = el('div', 'ch ' + (long ? 'col' : 'n' + Math.min(n, 5)));
      const bs = texts.map((t, j) => {
        const val = f.type === 'scale' ? j + 1 : j;
        const b = button('c' + (d.vals[f.k] === val ? ' on' : ''), t, () => { d.vals[f.k] = val; save(); bs.forEach((x, k) => x.classList.toggle('on', k === j)); go.disabled = !ready(); });
        ch.appendChild(b); return b;
      });
      box.appendChild(ch);
      if (f.type === 'scale') { const e = el('div', 'ends'); e.append(el('span', null, '1 · ' + (f.lo || '')), el('span', null, (f.hi || '') + ' · 5')); box.appendChild(e); }
    }
    w.appendChild(box);
  });
  let ta = null;
  if (s.extra && !d.x) {
    const ex = el('div', 'extra'), lab = el('label', null, s.extra); ta = el('textarea');
    ta.maxLength = 140; ta.placeholder = 'Optional'; ta.value = d.text || ''; ta.oninput = () => { d.text = ta.value; save(); };
    lab.htmlFor = ta.id = 'extra'; ex.append(lab, ta); w.appendChild(ex);
  }
  /* several boxes for the other terms, each sent as its own line */
  const tas = [];
  if (s.extras && !d.x) {
    d.texts = d.texts || {};
    s.extras.forEach(x => {
      const ex = el('div', 'extra'), lab = el('label', null, x.q), t = el('textarea');
      t.maxLength = 140; t.placeholder = 'Optional'; t.value = d.texts[x.k] || '';
      t.oninput = () => { d.texts[x.k] = t.value; save(); };
      lab.htmlFor = t.id = 'extra-' + x.k; ex.append(lab, t); w.appendChild(ex); tas.push({k:x.k, t});
    });
  }
  const go = holdButton('Hold to send', () => {
    const vals = {};
    fields.forEach(f => { if (ask(f) && d.vals[f.k] != null) vals[f.k] = d.vals[f.k]; });
    const bad = fields.find(f => f.type === 'money' && vals[f.k] != null && ((f.min != null && vals[f.k] < f.min) || (f.max != null && vals[f.k] > f.max)));
    if (bad) { err.textContent = 'Check the number for ' + bad.q.toLowerCase() + '.'; return; }
    const body = d.x ? 'x' + (Object.keys(vals).length ? ';' + N.enc(vals) : '') : (N.enc(vals) || 'ok=1');
    const text = ta ? N.clean(ta.value) : '';
    const keyed = tas.map(x => ({k:x.k, t:N.clean(x.t.value)})).filter(x => x.t);
    send(s.room, 'd|' + d.g + '|' + d.role + '|' + body)
      .then(() => text ? send(s.room, 'c|' + d.g + '|' + d.role + '|' + text) : null)
      .then(() => keyed.reduce((p, x) => p.then(() => send(s.room, 'c|' + d.g + '|' + d.role + '|' + x.k + '|' + x.t)), Promise.resolve()))
      .then(() => { d.sent = true; save(); splash(colour(s, d), s.name, d.x ? (s.nodealTitle || 'No deal') : (s.sentWord || 'Deal recorded'), draw); })
      .catch(() => { err.textContent = 'That did not go through. Hold again.'; });
  });
  go.disabled = !ready();
  w.append(go, err);
  if (s.nodeal !== false) w.appendChild(button('nodeal', d.x ? (s.dealAfterAll || 'We did reach a deal') : (s.nodealButton || 'We did not reach a deal'), () => { d.x = !d.x; save(); draw(); }));
  w.appendChild(button('back', 'Change role', () => { delete d.role; save(); draw(); }));
}
function summary(s, d){
  const ul = el('ul', 'deal');
  N.fieldsFor(s, d.role).forEach(f => {
    const v = d.vals[f.k]; if (v == null || (d.x && !f.always)) return;
    const shown = f.type === 'money' ? N.fmt(v, f.cur) + (f.suffix || '') : f.type === 'scale' ? v + ' of 5' : label(s, f, v);
    const li = el('li'); li.append(el('span', null, f.short || fq(s, f)), el('b', null, shown)); ul.appendChild(li);
  });
  if (!d.x) (s.extras || []).forEach(x => {
    const t = d.texts && N.clean(d.texts[x.k]); if (!t) return;
    const li = el('li'); li.append(el('span', null, x.short || x.q), el('b', null, t)); ul.appendChild(li);
  });
  return ul;
}
function doneScreen(s, d){
  const w = shell(), box = el('div', 'done');
  box.append(el('div', 'k', d.x ? (s.nodealTitle || 'No deal') : (s.sentWord || 'Deal recorded')));
  const main = N.fieldsFor(s, d.role).find(f => f.type === 'money' && d.vals[f.k] != null && !d.x);
  box.appendChild(el('div', 'big', main ? N.fmt(d.vals[main.k], main.cur) + (main.suffix || '') : 'Thank you'));
  box.appendChild(el('div', 'sm', 'Eyes on the screen'));
  w.append(head(s, d), box, summary(s, d));
  const nx = nextAfter(s);
  if (nx) w.appendChild(button('go ghost', 'Next: ' + (nx.type === 'deal' ? nx.name : 'a question'), () => { d.ack = true; save(); draw(); }));
  w.appendChild(button('back', 'Change what we recorded', () => { d.sent = false; d.ack = false; save(); draw(); }));
}
function needForms(s, d){
  const w = shell();
  w.append(head(s, d), el('h2', null, 'This form opens from the link on the screen'),
    el('p', 'hint', formsErr ? 'It could not be opened. Scan the code on the screen again, and open the whole link.' : 'Scan the code on the screen at the front.'));
}
function allDone(){
  const w = shell(), box = el('div', 'done');
  box.append(el('div', 'k', S.title), el('div', 'big', 'Thank you'), el('div', 'sm', 'Eyes on the screen'));
  w.append(head(null), box);
  const last = [...STEPS].reverse().find(s => s.type === 'deal' && st.d[s.id] && st.d[s.id].sent);
  if (last) w.appendChild(button('back', 'Change what we recorded for ' + last.name, () => { st.d[last.id].sent = false; st.d[last.id].ack = false; save(); draw(); }));
}

/* ---------- start ---------- */
/* a reset of a room on the Poll Desk brings this phone back to the start of that step */
function checkResets(){
  if (N.demo) return Promise.resolve();
  const jobs = STEPS.map(s => {
    if (s.type === 'poll' && st.p[s.id] && st.p[s.id].sent) return N.votes(s.room).then(v => { if (!(voter in v)) delete st.p[s.id]; }).catch(() => {});
    if (s.type === 'survey' && st.p[s.id] && st.p[s.id].sent) return N.entries(s.room).then(es => { if (!es.some(e => e.v === voter)) delete st.p[s.id]; }).catch(() => {});
    if (s.type === 'deal' && st.d[s.id] && st.d[s.id].sent) return N.entries(s.room).then(es => { if (!es.some(e => e.v === voter)) st.d[s.id] = {vals:{}}; }).catch(() => {});
    return null;
  });
  return Promise.all(jobs).then(() => save());
}
const openForms = needsForms && !N.demo ? N.openForms(location.pathname.replace(/deal\/?(index\.html)?$/, '') + 'forms.enc').then(f => { forms = f; }).catch(() => { formsErr = true; }) : Promise.resolve();
draw();
Promise.all([checkResets(), openForms]).then(draw);
})();
