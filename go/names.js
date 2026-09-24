/* gt-names — the duplicate-name guard and the attendee list, shared by
   every page that asks "who are you?" (the /go/ polls and the module game
   pages).

   Two people typing "Mike" would share one row in the points system:
   scores pool by name, so a collision silently merges two people. Before a
   page commits a name it asks GT_NAMES.guard(); if another phone has
   already claimed that name the picker shows a choice instead of
   committing — "that's me, on another phone" (the dead-phone case: scores
   merge by name on purpose) or add a last initial. The check is
   client-side against the gt-names join table, so a tie within the same
   second slips through, and a page that cannot reach the server commits
   as before rather than blocking the room. */
const GT_NAMES = (() => {
  const API = 'https://gt-poll.rlamare.workers.dev';
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  /* how many other phones currently claim this name (latest claim per phone) */
  async function others(name, voter) {
    const d = await fetch(API + '/p/gt-names/entries').then(r => r.json());
    const latest = new Map();
    (d.entries || []).forEach(e => latest.set(e.v, e.t));
    let n = 0;
    latest.forEach((t, v) => { if (v !== voter && norm(t) === norm(name)) n++; });
    return n;
  }

  /* guard(name, voter, commit, host, opts)
       commit(name)  the page's own commit; called at once when the name is
                     free (or the server cannot be reached), otherwise after
                     the person has chosen
       host          the element the picker lives in; the choice is put at
                     its top so the list stays reachable underneath
       opts.clean    the page's own name cleaner, applied to the edited name */
  function guard(name, voter, commit, host, opts) {
    const clean = (opts && opts.clean) || (s => String(s).trim().replace(/\s+/g, ' ').slice(0, 30));
    let asked = false;
    const go = () => { if (!asked) { asked = true; commit(name); } };
    const t = setTimeout(go, 2500); /* a slow server never blocks the room */
    others(name, voter).then(n => {
      clearTimeout(t);
      if (asked) return;
      if (!n) { go(); return; }
      asked = true;
      show(name, voter, commit, host, clean);
    }).catch(() => { clearTimeout(t); go(); });
  }

  function show(name, voter, commit, host, clean) {
    host.querySelectorAll('.gt-taken').forEach(e => e.remove());
    const box = document.createElement('div');
    box.className = 'gt-taken';
    box.style.cssText = 'border:2.5px solid var(--red,#c8102e);padding:14px 16px;margin-bottom:14px;display:flex;flex-direction:column;gap:10px;background:var(--card,#fff)';
    const h = document.createElement('div');
    h.style.cssText = 'font-weight:700;font-size:17px;line-height:1.3';
    h.textContent = 'Someone has already joined as ' + name + '.';
    const p = document.createElement('div');
    p.style.cssText = 'font-weight:600;font-size:14px;line-height:1.4;color:var(--muted,#666)';
    p.textContent = 'If that’s you on another phone, tap the black button. If not, add your last initial so the points stay yours.';
    const me = document.createElement('button');
    me.type = 'button';
    me.style.cssText = 'font-family:inherit;font-weight:700;font-size:14px;letter-spacing:.08em;background:var(--ink,#111);color:var(--paper,#fff);border:2.5px solid var(--ink,#111);padding:12px 16px;cursor:pointer';
    me.textContent = 'THAT’S ME, ON ANOTHER PHONE';
    me.addEventListener('click', () => { box.remove(); commit(name); });
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px';
    const inp = document.createElement('input');
    inp.maxLength = 30; inp.autocomplete = 'off';
    inp.value = name + ' ';
    inp.placeholder = 'e.g. ' + name + ' B.';
    inp.style.cssText = 'flex:1;min-width:0;font-family:inherit;font-weight:600;font-size:16px;background:var(--card,#fff);border:2.5px solid var(--ink,#111);padding:12px 14px';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.style.cssText = 'font-family:inherit;font-weight:700;font-size:14px;letter-spacing:.08em;background:var(--red,#c8102e);color:var(--paper,#fff);border:2.5px solid var(--red,#c8102e);padding:12px 16px;cursor:pointer';
    ok.textContent = 'USE THIS';
    const use = () => {
      const v = clean(inp.value);
      if (!v) return;
      if (norm(v) === norm(name)) { inp.focus(); return; } /* unchanged: still taken */
      box.remove();
      guard(v, voter, commit, host, { clean }); /* the new name is checked too */
    };
    ok.addEventListener('click', use);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); use(); } });
    row.appendChild(inp); row.appendChild(ok);
    box.appendChild(h); box.appendChild(p); box.appendChild(row); box.appendChild(me);
    host.insertBefore(box, host.firstChild);
    box.scrollIntoView({ block: 'nearest' });
    inp.focus();
    try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (_) {}
  }

  /* partner({host, roster, not, hint, done}): the "Who's with you?" step every
     in-your-world ending asks after "Who are you?" (in pairs, one phone, from
     18 Sep 2026). The roster minus yourself, a typed name, or "I'm on my own
     this time" (done('-')). Pairs rotate module by module, so each page
     remembers the partner for its own exercise only. */
  function partner(o) {
    const host = o.host, clean = o.clean || (s => String(s).trim().replace(/\s+/g, ' ').slice(0, 30));
    host.innerHTML = '';
    if (o.hint) { const h = document.createElement('div'); h.className = 'hint'; h.textContent = o.hint; host.appendChild(h); }
    const list = document.createElement('div'); list.className = 'choices';
    (o.roster || []).filter(n => norm(n) !== norm(o.not)).forEach(n => { const b = document.createElement('button'); b.className = 'pick'; b.type = 'button'; b.textContent = n; b.addEventListener('click', () => o.done(clean(n))); list.appendChild(b); });
    host.appendChild(list);
    const row = document.createElement('div'); row.className = 'namerow'; row.style.marginTop = list.children.length ? '12px' : '0';
    const inp = document.createElement('input'); inp.maxLength = 30; inp.placeholder = list.children.length ? 'Not on the list? Type the name' : 'Type their first name'; inp.autocomplete = 'off';
    const ok = document.createElement('button'); ok.type = 'button'; ok.textContent = 'OK';
    const go = () => { const v = clean(inp.value); if (v) o.done(v); };
    ok.addEventListener('click', go); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    row.appendChild(inp); row.appendChild(ok); host.appendChild(row);
    const a = document.createElement('button'); a.className = 'back'; a.type = 'button'; a.style.marginTop = '14px'; a.textContent = o.alone || 'I’m on my own this time'; a.addEventListener('click', () => o.done('-')); host.appendChild(a);
  }

  /* roster(): the attendee list every "who are you?" picker shows. It is
     kept on the poll server and edited on the Poll Desk, never in this
     public repo, where a name would stay in git history. Resolves [] when
     the list is empty or the server is slow or out of reach, and a picker
     with no names asks people to type theirs. A picker that reads it again
     while it is up passes null, so a failed read keeps the names it has. */
  function roster(failed = []) {
    const ask = fetch(API + '/p/gt-roster/roster', { cache: 'no-store' })
      .then(r => r.json()).then(d => Array.isArray(d.names) ? d.names : failed).catch(() => failed);
    return Promise.race([ask, new Promise(r => setTimeout(() => r(failed), 4000))]);
  }

  /* forgotten(voter): a Poll Desk reset of the name room (gt-names; RESET
     EVERY ROOM includes it) means the name this phone remembers no longer
     counts, so the phone forgets it too and the page asks "who are you?"
     again, as a reset room already unlocks the phones that answered in it
     (Ryan, 24 Sep 2026: his phone stayed registered through every reset).
     Only a phone that has reached the server with a claim at some point is
     checked (its last claim may be an older name: the name room takes 15
     claims a phone), so a name picked while offline is kept, and a server
     that is slow or out of reach changes nothing. Resolves true when the
     name was forgotten. */
  function forgotten(voter) {
    let name = null, claimed = null;
    try { name = localStorage.getItem('gt-name'); claimed = localStorage.getItem('gt-claimed'); } catch (_) {}
    if (!name || !claimed) return Promise.resolve(false);
    const ask = fetch(API + '/p/gt-names/entries', { cache: 'no-store' }).then(r => r.json()).then(d => {
      if (!Array.isArray(d.entries) || d.entries.some(e => e.v === voter)) return false;
      try { localStorage.removeItem('gt-name'); localStorage.removeItem('gt-claimed'); } catch (_) { return false; }
      return true;
    }).catch(() => false);
    return Promise.race([ask, new Promise(r => setTimeout(() => r(false), 4000))]);
  }

  return { guard, others, norm, partner, roster, forgotten };
})();
