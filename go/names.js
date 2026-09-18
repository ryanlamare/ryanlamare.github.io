/* gt-names — the duplicate-name guard, shared by every page that asks
   "who are you?" (the /go/ polls and the module game pages).

   Two people typing "Mike" would share one row in the points system:
   scores pool by name, so a collision silently merges two people. Before a
   page commits a name it asks GT_NAMES.guard(); if another phone has
   already claimed that name the picker shows a choice instead of
   committing — "that's me, on another phone" (the dead-phone case: scores
   merge by name on purpose) or add a last initial. The check is
   client-side against the gt-names join table, so a tie within the same
   second slips through, and a page that cannot reach the server commits
   as before rather than blocking the room.

   The avatar step (Ryan, 18 Sep 2026) lives here too, so no page had to
   change: once the name is settled and before the page's own commit runs,
   the person builds a small face (/teaching/exec/gt/avatar.js draws it). It
   is the face, large, eight buttons that each cycle one part at a tap, the
   dice among them, and THAT’S ME. It comes up wherever the name step does,
   which is once per phone and again after a page's own "change" (there it
   opens on the face the phone already has). The code is kept on the phone
   (gt-avatar) and posted as 'code|Name' to the room gt-avatars, never into
   gt-names, so nothing that reads names can meet one. It fails open like the
   guard: no drawing script, no storage or no server, and the person plays on;
   a post that did not land is tried again the next time a page loads. */
const GT_NAMES = (() => {
  /* ?api= points the guard somewhere else, the game pages' own idiom (a rehearsal stand-in) */
  const API = (() => { try { return new URLSearchParams(location.search).get('api'); } catch (_) { return null; } })() || 'https://gt-poll.rlamare.workers.dev';
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  /* the drawing, fetched by this file so that no page needs a second script tag */
  if (!window.GT_AVATAR) { const sc = document.createElement('script'); sc.src = '/teaching/exec/gt/avatar.js'; sc.async = true; document.head.appendChild(sc); }

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
    if (!(opts && opts.faced)) { /* the page's commit waits for the face; wrapped once, however often the name is edited */
      const page = commit;
      commit = (n, mine) => face(n, voter, host, () => page(n), mine);
      opts = Object.assign({}, opts, { clean, faced: true });
    }
    let asked = false;
    const go = () => { if (!asked) { asked = true; commit(name); } };
    const t = setTimeout(go, 2500); /* a slow server never blocks the room */
    others(name, voter).then(n => {
      clearTimeout(t);
      if (asked) return;
      if (!n) { go(); return; }
      asked = true;
      show(name, voter, commit, host, opts);
    }).catch(() => { clearTimeout(t); go(); });
  }

  function show(name, voter, commit, host, opts) {
    const clean = opts.clean;
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
    me.addEventListener('click', () => { box.remove(); commit(name, true); }); /* true: the face may already exist, made on the other phone */
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
      guard(v, voter, commit, host, opts); /* the new name is checked too */
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

  /* ---- the avatar step ---- */
  const AKEY = 'gt-avatar', ASENT = 'gt-avatar-sent';
  const lsGet = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };

  /* post 'code|Name' once per change; the Worker keeps fifteen lines a phone, so taps are never posted, only the finish */
  function sendFace(name, voter) {
    const c = lsGet(AKEY);
    if (!c || !name || !voter) return;
    const line = c + '|' + name;
    if (lsGet(ASENT) === line) return;
    fetch(API + '/p/gt-avatars/say', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: line, v: voter }) })
      .then(r => { if (r.ok) lsSet(ASENT, line); }).catch(() => {});
  }
  /* a finish that never reached the server goes again, quietly, when any page with this file loads */
  setTimeout(() => sendFace(lsGet('gt-name'), lsGet('gt-voter')), 1500);

  /* face(name, voter, host, done, mine): done() always runs, whatever fails.
     mine: "that's me, on another phone", so the face made there is taken up
     instead of asking for a second one */
  function face(name, voter, host, done, mine) {
    const A = window.GT_AVATAR;
    if (!A) { done(); return; } /* the drawing never arrived: play on without it */
    const had = lsGet(AKEY);
    if (mine && !had) {
      let moved = false;
      const t = setTimeout(() => { if (!moved) { moved = true; build(A, name, voter, host, done, null); } }, 2500);
      A.roster(API).then(m => {
        if (moved) return;
        moved = true; clearTimeout(t);
        const p = m.get(norm(name));
        if (p && p.built) { lsSet(AKEY, A.code(p)); sendFace(name, voter); done(); }
        else build(A, name, voter, host, done, null);
      });
      return;
    }
    build(A, name, voter, host, done, had);
  }

  function build(A, name, voter, host, done, had) {
    let parts = A.parse(had, name), fig = null, ended = false;
    const NS = 'http://www.w3.org/2000/svg';
    const hidden = [...host.children].filter(e => e.style.display !== 'none');
    const back = () => hidden.forEach(e => { e.style.display = e.dataset.gtHid || ''; delete e.dataset.gtHid; });
    hidden.forEach(e => { e.dataset.gtHid = e.style.display; e.style.display = 'none'; });
    const box = document.createElement('div');
    box.className = 'gt-face';
    box.style.cssText = 'display:flex;flex-direction:column;gap:12px';
    const view = document.createElementNS(NS, 'svg');
    view.setAttribute('viewBox', '0 0 300 214');
    view.setAttribute('role', 'img'); view.setAttribute('aria-label', 'Your avatar');
    view.style.cssText = 'display:block;width:100%;height:auto;max-height:44vh;background:var(--paper-soft,#F0EAD9);border:2.5px solid var(--ink,#111)';
    box.appendChild(view);
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:10px';
    const LABEL = { skin: 'Skin', head: 'Face shape', hair: 'Hair', hcol: 'Hair colour', beard: 'Beard', specs: 'Glasses', cloth: 'Clothes', dice: 'Surprise me' }; /* read out, never shown */
    const icons = {};
    const paint = () => {
      if (fig) fig.remove();
      fig = A.draw(view, parts, { x: 150, y: 210, size: 200 });
      Object.keys(icons).forEach(k => A.icon(icons[k], k, parts));
      lsSet(AKEY, A.code(parts)); /* kept tap by tap, so a page that redraws itself mid-step loses nothing */
    };
    A.KEYS.concat(['dice']).forEach(k => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', LABEL[k]);
      b.style.cssText = 'display:flex;align-items:center;justify-content:center;height:62px;padding:0;background:var(--paper-soft,#F0EAD9);border:2.5px solid var(--ink,#111);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent';
      const i = document.createElementNS(NS, 'svg');
      i.setAttribute('viewBox', '0 0 40 40'); i.setAttribute('aria-hidden', 'true');
      i.style.cssText = 'width:42px;height:42px;display:block;pointer-events:none';
      b.appendChild(i); icons[k] = i;
      b.addEventListener('click', () => { parts = k === 'dice' ? A.random(parts) : A.cycle(parts, k); paint(); });
      grid.appendChild(b);
    });
    box.appendChild(grid);
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.style.cssText = 'width:100%;font-family:inherit;font-weight:700;font-size:16px;letter-spacing:.1em;background:var(--red,#c8102e);color:var(--paper,#fff);border:2.5px solid var(--red,#c8102e);padding:16px 18px;cursor:pointer';
    ok.textContent = 'THAT’S ME';
    ok.addEventListener('click', () => {
      if (ended) return;
      ended = true;
      lsSet(AKEY, A.code(parts));
      sendFace(name, voter);
      box.remove(); back();
      done();
    });
    box.appendChild(ok);
    host.appendChild(box);
    try { paint(); } catch (_) { ended = true; box.remove(); back(); done(); return; } /* a drawing fault never costs anyone their game */
    box.scrollIntoView({ block: 'nearest' });
    let last = performance.now();
    (function blink(now) { if (!box.isConnected) return; A.tick(fig, Math.min(.1, (now - last) / 1000)); last = now; requestAnimationFrame(blink); })(last);
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

  return { guard, others, norm, partner, face };
})();
