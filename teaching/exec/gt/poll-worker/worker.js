// gt-poll — tiny live-poll backend for the exec teaching decks.
//
// Deliberately separate from the Pavilion relay: different job, different
// blast radius. One Durable Object per poll id; a vote is "voter v picked
// option o", last vote wins, so people can change their answer. The deck
// polls GET /p/:id and decides for itself when to reveal — the server never
// knows whether results are on screen.
//
//   POST /p/:id/vote     {o: 0..7, v: "voter-uuid"}    -> {ok:true}
//   GET  /p/:id                                        -> {counts:[..], total}
//   POST /p/:id/say      {t: "text", v: "voter-uuid"}  -> {ok:true}
//   GET  /p/:id/answers                                -> {answers:[..], total}
//   GET  /p/:id/votes                                  -> {votes:{voterId:o}, total}
//   GET  /p/:id/entries                                -> {entries:[{v,t}], total}
//   POST /p/:id/draw     {v, n: name, d: strokes}      -> {ok:true}
//   GET  /p/:id/draws                                  -> {draws:[{v,n,d}], total}
//   POST /p/:id/target   {s: secret, t: 1..100}        -> {ok:true}
//   GET  /p/:id/target   (never returns the number)    -> {set: bool, round}
//   POST /p/:id/round    {s: secret, r: 1..6}          -> {ok:true}
//   POST /p/:id/guess    {v, n, g: 1..100}             -> {r:"high"|"low"|"correct", left}
//   GET  /p/:id/guesses                                -> {guesses:[{v,n,g,r,rd}], total}
//   POST /p/:id/reset    {s: "<ADMIN_SECRET>"}         -> {ok:true}
//
//   The Hidden Agenda lane (Module 8's capstone, a hidden-role game at one
//   table; one room per table). Roles are a secret the server holds — a
//   phone can fetch ONLY its own role, and the Auditor's check is answered
//   here, so nothing a phone can read gives the game away:
//   POST /p/:id/cs/seat    {v, n}                       -> {ok}     take a seat (lobby only)
//   GET  /p/:id/cs/me?v=   (own role, own night, own notes)  -> {...}
//   POST /p/:id/cs/act     {v, kind, target|s|a|c|y|b}  -> {ok, role?}  pick/check/clear/notes/vote/reco
//   GET  /p/:id/cs/board   (public: seats, log, vote tallies; roles+notes only once over)
//   POST /p/:id/cs/deal    {s, backers, bidder?}        -> {ok, roster}   admin: deal roles
//   POST /p/:id/cs/setrole {s, v, role}                 -> {ok}    admin: card fallback
//   POST /p/:id/cs/phase   {s, to: night|day|over}      -> {ok, result}  admin: run the clock
//   POST /p/:id/cs/vote    {s, accused}                 -> {ok}    admin: open a recusal vote
//   POST /p/:id/cs/tally   {s}                          -> {ok, result}  admin: close it
//   POST /p/:id/cs/remove  {s, v, how}                  -> {ok}    admin: manual removal (fallback)
//   GET  /p/:id/cs/mod?s=  (everything)                 -> {...}   admin
//
// The target/guess lanes are the number game: the instructor's secret
// number lives here and ONLY here — verdicts are computed server-side
// and the number itself is never returned by any route, so it cannot be
// read out of a phone (or this public repo). The standing number is the
// NUMBER_TARGET Wrangler secret (set once:
// echo "<n>" | npx wrangler secret put NUMBER_TARGET), so nothing needs
// setting on session day and a /reset doesn't unset the game; POST
// /target still stores a per-room override on top of it. The game runs
// in five rounds, advanced by the instructor (round 6 means the game is
// over): one guess per voter per round, five guesses total, and a
// correct guess ends that voter's game. Each guess records the round it
// was made in (rd), so the deck can show the room's distribution round
// by round.
//
// /votes and /entries are the per-voter views behind the class points
// system: voter ids are random uuids, anonymous until a phone claims a
// name in the gt-names room ("Name|voter-uuid" say lines). Read-only, so
// decks built before they existed are unaffected.
//
// Poll ids are [a-z0-9-], max 64 chars. Question text and option labels live
// in the site's /go/polls.json, not here — the server only counts. /say is
// the write-in lane (the Hotelling examples wall): unlike votes, one voter
// may send several answers; capped per voter and per room so a stuck finger
// or a prankster can't flood the screen.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/p\/([a-z0-9-]{1,64})(\/(vote|say|answers|votes|entries|draw|draws|target|round|guess|guesses|reset)|\/cs\/[a-z]+)?$/);
    if (!m) return json({ error: 'not found' }, 404);
    const stub = env.POLLS.get(env.POLLS.idFromName(m[1]));
    return stub.fetch(req);
  },
};

export class PollRoom {
  constructor(state, env) {
    this.storage = state.storage;
    this.env = env;
  }

  /* the number game's target: a per-room override if one was POSTed,
     else the standing NUMBER_TARGET secret, else unset */
  async target() {
    const t = await this.storage.get('target');
    if (Number.isInteger(t)) return t;
    const dt = parseInt(this.env.NUMBER_TARGET || '', 10);
    return (Number.isInteger(dt) && dt >= 1 && dt <= 100) ? dt : null;
  }

  async fetch(req) {
    const url = new URL(req.url);
    const action = url.pathname.split('/')[3] || '';
    if (action === 'cs') return this.closedSession(req, url, url.pathname.split('/')[4] || '');

    if (req.method === 'GET' && action === 'answers') {
      const answers = (await this.storage.get('answers')) || [];
      return json({ answers: answers.map(a => a.t), total: answers.length });
    }

    if (req.method === 'GET' && action === 'entries') {
      const answers = (await this.storage.get('answers')) || [];
      return json({ entries: answers, total: answers.length });
    }

    if (req.method === 'GET' && action === 'votes') {
      const votes = (await this.storage.get('votes')) || {};
      return json({ votes, total: Object.keys(votes).length });
    }

    if (req.method === 'GET' && action === 'draws') {
      const map = await this.storage.list({ prefix: 'draw:' });
      const draws = [...map.entries()].map(([k, val]) => ({ v: k.slice(5), n: val.n, d: val.d }));
      return json({ draws, total: draws.length });
    }

    if (req.method === 'GET' && action === 'target') {
      const t = await this.target();
      const rd = await this.storage.get('round');
      return json({ set: Number.isInteger(t), round: Number.isInteger(rd) ? rd : 1 });
    }

    if (req.method === 'GET' && action === 'guesses') {
      const guesses = (await this.storage.get('guesses')) || [];
      return json({ guesses, total: guesses.length });
    }

    if (req.method === 'GET') {
      const votes = (await this.storage.get('votes')) || {};
      const counts = [];
      let total = 0;
      for (const o of Object.values(votes)) {
        counts[o] = (counts[o] || 0) + 1;
        total++;
      }
      for (let i = 0; i < counts.length; i++) counts[i] = counts[i] || 0;
      return json({ counts, total });
    }

    if (req.method === 'POST' && action === 'say') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
      const v = String(body.v || '');
      if (!/^[A-Za-z0-9-]{8,64}$/.test(v)) return json({ error: 'bad voter' }, 400);
      // eslint-disable-next-line no-control-regex
      const t = String(body.t || '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!t) return json({ error: 'bad text' }, 400);
      const answers = (await this.storage.get('answers')) || [];
      if (answers.length >= 400) return json({ error: 'full' }, 429);
      if (answers.filter(a => a.v === v).length >= 15) return json({ error: 'enough' }, 429);
      answers.push({ v, t });
      await this.storage.put('answers', answers);
      return json({ ok: true });
    }

    if (req.method === 'POST' && action === 'target') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
      const secret = this.env.ADMIN_SECRET;
      if (!secret || body.s !== secret) return json({ error: 'no' }, 403);
      const t = body.t;
      if (!Number.isInteger(t) || t < 1 || t > 100) return json({ error: 'bad target' }, 400);
      await this.storage.put('target', t);
      const rd = await this.storage.get('round');
      if (!Number.isInteger(rd)) await this.storage.put('round', 1);
      return json({ ok: true });
    }

    if (req.method === 'POST' && action === 'round') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
      const secret = this.env.ADMIN_SECRET;
      if (!secret || body.s !== secret) return json({ error: 'no' }, 403);
      const r = body.r;
      if (!Number.isInteger(r) || r < 1 || r > 6) return json({ error: 'bad round' }, 400);
      await this.storage.put('round', r);
      return json({ ok: true });
    }

    if (req.method === 'POST' && action === 'guess') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
      const v = String(body.v || '');
      if (!/^[A-Za-z0-9-]{8,64}$/.test(v)) return json({ error: 'bad voter' }, 400);
      const g = body.g;
      if (!Number.isInteger(g) || g < 1 || g > 100) return json({ error: 'bad guess' }, 400);
      const t = await this.target();
      if (!Number.isInteger(t)) return json({ error: 'not started' }, 409);
      // eslint-disable-next-line no-control-regex
      const n = String(body.n || '').replace(/[\x00-\x1f\x7f|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
      const rdRaw = await this.storage.get('round');
      const rd = Number.isInteger(rdRaw) ? rdRaw : 1;
      if (rd > 5) return json({ error: 'over' }, 409);
      const guesses = (await this.storage.get('guesses')) || [];
      if (guesses.length >= 500) return json({ error: 'full' }, 429);
      const mine = guesses.filter(x => x.v === v);
      if (mine.some(x => x.r === 'correct')) return json({ error: 'done' }, 409);
      if (mine.length >= 5) return json({ error: 'out of guesses' }, 429);
      if (mine.some(x => x.rd === rd)) return json({ error: 'round played' }, 409);
      const r = g > t ? 'high' : (g < t ? 'low' : 'correct');
      guesses.push({ v, n, g, r, rd });
      await this.storage.put('guesses', guesses);
      return json({ r, left: 5 - mine.length - 1 });
    }

    /* the drawing lane (the median dog): one drawing per voter, redrawing
       overwrites, strokes as "x,y x,y;x,y ..." on a 300x300 grid */
    if (req.method === 'POST' && action === 'draw') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
      const v = String(body.v || '');
      if (!/^[A-Za-z0-9-]{8,64}$/.test(v)) return json({ error: 'bad voter' }, 400);
      const d = String(body.d || '');
      if (!d || d.length > 6000 || !/^[0-9,; ]+$/.test(d)) return json({ error: 'bad drawing' }, 400);
      // eslint-disable-next-line no-control-regex
      const n = String(body.n || '').replace(/[\x00-\x1f\x7f|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
      const existing = await this.storage.get('draw:' + v);
      if (!existing) {
        const map = await this.storage.list({ prefix: 'draw:' });
        if (map.size >= 80) return json({ error: 'full' }, 429);
      }
      await this.storage.put('draw:' + v, { n, d });
      return json({ ok: true });
    }

    if (req.method === 'POST' && action === 'vote') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
      const o = body.o, v = String(body.v || '');
      if (!Number.isInteger(o) || o < 0 || o > 7) return json({ error: 'bad option' }, 400);
      if (!/^[A-Za-z0-9-]{8,64}$/.test(v)) return json({ error: 'bad voter' }, 400);
      const votes = (await this.storage.get('votes')) || {};
      votes[v] = o;
      await this.storage.put('votes', votes);
      return json({ ok: true });
    }

    if (req.method === 'POST' && action === 'reset') {
      let body;
      try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
      const secret = this.env.ADMIN_SECRET;
      if (!secret || body.s !== secret) return json({ error: 'no' }, 403);
      await this.storage.delete('votes');
      await this.storage.delete('answers');
      await this.storage.delete('target');
      await this.storage.delete('guesses');
      await this.storage.delete('round');
      await this.storage.delete('cs');
      const map = await this.storage.list({ prefix: 'draw:' });
      if (map.size) await this.storage.delete([...map.keys()]);
      return json({ ok: true });
    }

    return json({ error: 'not found' }, 404);
  }

  /* ================= Hidden Agenda =================
     One table of a hidden-role game. State is one object under 'cs':
       phase  lobby | night | day | vote | over
       round  the night number (1 on the first night)
       seats  {voter: {n, role: m|b|a|c, alive, out:{how, r}|null}}
              m committee member, b manipulator, a auditor, c general counsel
       bidder the Manipulators' secret bidder, a letter A-D
       nights {r: {picks:{voter:target}, check:{v,target,role}|null,
                   clear:{v,target}|null, notes:{voter:{s:[..],a,c}},
                   result:{target, cleared, removed}}}
       days   {r: {accused, votes:{voter:'y'|'n'}, hand:{yes,no}|absent, result:{yes,no,recused}}}
              seats may carry open:true while the moderator has released
              one for a new phone (see /seat and /release)
       recos  {voter: letter}
       winner committee | backers | null
       log    [{r, when:'night'|'day', text}]
     The moderator page drives phases with the admin secret; phones only
     ever see their own role and their own actions until the game is over,
     when /board opens everything for the reveal. */
  async closedSession(req, url, sub) {
    const secret = this.env.ADMIN_SECRET;
    const cs = (await this.storage.get('cs')) || {
      phase: 'lobby', round: 0, seats: {}, bidder: null, nights: {}, days: {}, recos: {}, winner: null, log: [],
    };
    const save = () => this.storage.put('cs', cs);
    const okVoter = v => /^[A-Za-z0-9-]{8,64}$/.test(String(v || ''));
    const cleanName = n => String(n || '').replace(/[\x00-\x1f\x7f|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    const aliveIds = () => Object.keys(cs.seats).filter(v => cs.seats[v].alive);
    const backersAlive = () => aliveIds().filter(v => cs.seats[v].role === 'b');
    const nameOf = v => (cs.seats[v] ? cs.seats[v].n : null);
    const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    /* a seat moves to a new phone: the seat and every reference to it in the
       nights, days and recommendations take the new voter id, so history,
       role and removal come along */
    const rekey = (from, to) => {
      const sw = x => (x === from ? to : x);
      cs.seats[to] = cs.seats[from]; delete cs.seats[from];
      Object.values(cs.nights).forEach(n => {
        n.picks = Object.fromEntries(Object.entries(n.picks).map(([k, t]) => [sw(k), sw(t)]));
        if (n.check) { n.check.v = sw(n.check.v); n.check.target = sw(n.check.target); }
        if (n.clear) { n.clear.v = sw(n.clear.v); n.clear.target = sw(n.clear.target); }
        n.notes = Object.fromEntries(Object.entries(n.notes).map(([k, x]) => [sw(k), { s: (x.s || []).map(sw), a: sw(x.a), c: sw(x.c) }]));
        if (n.result) { n.result.target = sw(n.result.target); n.result.removed = sw(n.result.removed); }
      });
      Object.values(cs.days).forEach(d => { d.accused = sw(d.accused); d.votes = Object.fromEntries(Object.entries(d.votes).map(([k, y]) => [sw(k), y])); });
      cs.recos = Object.fromEntries(Object.entries(cs.recos).map(([k, b]) => [sw(k), b]));
    };
    const checkWin = () => {
      if (cs.winner || cs.phase === 'lobby') return;
      const a = aliveIds().length, b = backersAlive().length;
      if (b === 0) cs.winner = 'committee';
      else if (b * 2 >= a) cs.winner = 'backers';
      if (cs.winner) { cs.phase = 'over'; cs.log.push({ r: cs.round, when: 'day', text: cs.winner === 'committee' ? 'Every Manipulator removed. The committee wins' : 'The Manipulators are half the table. The Manipulators win' }); }
    };
    let body = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); } }
    const isAdmin = () => secret && ((req.method === 'POST' ? body.s : url.searchParams.get('s')) === secret);

    /* ---- public / per-phone ---- */
    if (req.method === 'POST' && sub === 'seat') {
      const v = String(body.v || ''), n = cleanName(body.n);
      if (!okVoter(v) || !n) return json({ error: 'bad seat' }, 400);
      const sameName = id => id !== v && norm(cs.seats[id].n) === norm(n);
      if (!cs.seats[v]) {
        /* a seat the moderator has released for a new phone: the same name
           from an unknown phone takes it over, history and all */
        const open = Object.keys(cs.seats).find(id => cs.seats[id].open && sameName(id));
        if (open) {
          rekey(open, v); delete cs.seats[v].open;
          cs.log.push({ r: cs.round, when: cs.phase === 'night' ? 'night' : 'day', text: cs.seats[v].n + ' moved to a new phone' }); /* the seat keeps its own spelling */
          await save();
          return json({ ok: true, moved: true });
        }
        if (cs.phase !== 'lobby') return json({ error: 'started' }, 409);
      }
      /* one name per table: two Mikes would be one button on every phone's list */
      if (Object.keys(cs.seats).some(sameName)) return json({ error: 'taken' }, 409);
      if (!cs.seats[v]) {
        if (Object.keys(cs.seats).length >= 30) return json({ error: 'full' }, 429);
        cs.seats[v] = { n, role: null, alive: true, out: null };
      } else cs.seats[v].n = n;
      await save();
      return json({ ok: true });
    }
    if (req.method === 'POST' && sub === 'unseat') {
      const v = String(body.v || '');
      if (cs.phase !== 'lobby') return json({ error: 'started' }, 409);
      delete cs.seats[v]; await save();
      return json({ ok: true });
    }
    if (req.method === 'GET' && sub === 'me') {
      const v = url.searchParams.get('v') || '';
      const me = cs.seats[v] || null;
      const seats = Object.entries(cs.seats).map(([id, s]) => ({ v: id, n: s.n, alive: s.alive, out: s.out }));
      const out = { phase: cs.phase, round: cs.round, dealt: !!(me && me.role), seats, me: null, winner: cs.winner };
      if (me) {
        out.me = { n: me.n, role: cs.phase === 'lobby' && !me.role ? null : me.role, alive: me.alive, out: me.out };
        const night = cs.nights[cs.round] || null;
        if (me.role === 'b') {
          out.mates = Object.entries(cs.seats).filter(([id, s]) => s.role === 'b' && id !== v).map(([id, s]) => ({ n: s.n, alive: s.alive, pick: night && night.picks[id] ? nameOf(night.picks[id]) : null }));
          out.bidder = cs.bidder;
        }
        if (night) {
          out.night = {
            myPick: night.picks[v] ? nameOf(night.picks[v]) : null,
            myCheck: night.check && night.check.v === v ? { target: nameOf(night.check.target), role: night.check.role } : null,
            myClear: night.clear && night.clear.v === v ? nameOf(night.clear.target) : null,
            myNotes: night.notes[v] || null,
          };
          const prev = cs.nights[cs.round - 1];
          out.lastNotes = prev && prev.notes[v] ? prev.notes[v] : null;
          out.lastClear = prev && prev.clear && prev.clear.v === v ? prev.clear.target : null;
          if (me.role === 'a') out.checks = Object.entries(cs.nights).filter(([, n]) => n.check && n.check.v === v).map(([r, n]) => ({ r: +r, target: nameOf(n.check.target), role: n.check.role }));
        }
        const day = cs.days[cs.round] || null;
        if (day) out.day = { accused: nameOf(day.accused), accusedV: day.accused, myVote: day.votes[v] || null, open: cs.phase === 'vote', result: day.result || null };
        out.reco = cs.recos[v] || null;
      }
      if (cs.phase === 'over') out.reveal = { bidder: cs.bidder, roles: Object.fromEntries(Object.values(cs.seats).map(s => [s.n, s.role])) };
      return json(out);
    }
    if (req.method === 'POST' && sub === 'act') {
      const v = String(body.v || ''), me = cs.seats[v];
      if (!me) return json({ error: 'not seated' }, 403);
      const kind = String(body.kind || '');
      const target = body.target ? String(body.target) : null;
      const night = cs.nights[cs.round];
      if (kind === 'pick' || kind === 'check' || kind === 'clear') {
        if (cs.phase !== 'night' || !night) return json({ error: 'not night' }, 409);
        if (!me.alive) return json({ error: 'removed' }, 403);
        if (!target || !cs.seats[target] || !cs.seats[target].alive) return json({ error: 'bad target' }, 400);
        if (kind === 'pick') {
          if (me.role !== 'b') return json({ error: 'not yours' }, 403);
          if (cs.seats[target].role === 'b') return json({ error: 'own side' }, 400);
          night.picks[v] = target;
        } else if (kind === 'check') {
          if (me.role !== 'a') return json({ error: 'not yours' }, 403);
          if (night.check) return json({ error: 'done' }, 409);
          night.check = { v, target, role: cs.seats[target].role };
        } else {
          if (me.role !== 'c') return json({ error: 'not yours' }, 403);
          if (night.clear) return json({ error: 'done' }, 409);
          const prev = cs.nights[cs.round - 1];
          if (prev && prev.clear && prev.clear.target === target) return json({ error: 'same as last night' }, 409);
          night.clear = { v, target };
        }
        await save();
        return json(kind === 'check' ? { ok: true, role: cs.seats[target].role } : { ok: true });
      }
      if (kind === 'notes') {
        if (cs.phase !== 'night' || !night) return json({ error: 'not night' }, 409);
        if (me.role === 'b') return json({ error: 'not yours' }, 403);
        const ids = Array.isArray(body.s) ? body.s.map(String).filter(x => cs.seats[x] && x !== v).slice(0, 3) : [];
        const a = body.a && cs.seats[String(body.a)] ? String(body.a) : null;
        const c = body.c && cs.seats[String(body.c)] ? String(body.c) : null;
        night.notes[v] = { s: ids, a, c };
        await save();
        return json({ ok: true });
      }
      if (kind === 'vote') {
        const day = cs.days[cs.round];
        if (cs.phase !== 'vote' || !day) return json({ error: 'no vote open' }, 409);
        if (!me.alive) return json({ error: 'removed' }, 403);
        if (v === day.accused) return json({ error: 'accused' }, 403);
        if (body.y !== 'y' && body.y !== 'n') return json({ error: 'bad vote' }, 400);
        day.votes[v] = body.y;
        await save();
        return json({ ok: true });
      }
      if (kind === 'reco') {
        if (cs.phase !== 'over') return json({ error: 'not over' }, 409);
        const b = String(body.b || '');
        if (!/^[A-D]$/.test(b)) return json({ error: 'bad bidder' }, 400);
        cs.recos[v] = b;
        await save();
        return json({ ok: true });
      }
      return json({ error: 'bad kind' }, 400);
    }
    if (req.method === 'GET' && sub === 'board') {
      const seats = Object.entries(cs.seats).map(([id, s]) => ({ n: s.n, alive: s.alive, out: s.out, role: cs.phase === 'over' ? s.role : undefined }));
      const day = cs.days[cs.round] || null;
      const out = { phase: cs.phase, round: cs.round, seats, log: cs.log, winner: cs.winner, seated: seats.length, alive: seats.filter(s => s.alive).length };
      if (day) out.vote = { accused: nameOf(day.accused), yes: Object.entries(day.votes).filter(([, y]) => y === 'y').map(([id]) => nameOf(id)), no: Object.entries(day.votes).filter(([, y]) => y === 'n').map(([id]) => nameOf(id)), open: cs.phase === 'vote', result: day.result || null, hand: day.hand || { yes: 0, no: 0 } };
      if (cs.phase === 'night') {
        const n = cs.nights[cs.round];
        out.night = { backersIn: Object.keys(n.picks).filter(id => cs.seats[id] && cs.seats[id].alive).length, backersAlive: backersAlive().length, checkDone: !!n.check, clearDone: !!n.clear, notesIn: Object.keys(n.notes).length };
      }
      if (cs.phase === 'over') {
        out.bidder = cs.bidder;
        /* the room's read: for every night, who named whom among the top-three suspects */
        out.notes = Object.fromEntries(Object.entries(cs.nights).map(([r, n]) => [r, Object.entries(n.notes).map(([by, x]) => ({ by: nameOf(by), s: x.s.map(nameOf).filter(Boolean), a: nameOf(x.a), c: nameOf(x.c) }))]));
        const tally = {};
        Object.values(cs.recos).forEach(b => { tally[b] = (tally[b] || 0) + 1; });
        out.recos = tally;
      }
      return json(out);
    }

    /* ---- admin ---- */
    if (!isAdmin()) return json({ error: 'no' }, 403);
    if (req.method === 'GET' && sub === 'mod') return json(cs);
    if (req.method === 'POST' && sub === 'deal') {
      if (cs.phase !== 'lobby') return json({ error: 'started' }, 409);
      const ids = Object.keys(cs.seats);
      if (ids.length < 5) return json({ error: 'too few' }, 400);
      let nb = Number.isInteger(body.backers) ? body.backers : (ids.length >= 12 ? 3 : 2);
      nb = Math.max(1, Math.min(nb, Math.floor((ids.length - 2) / 2)));
      for (let i = ids.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [ids[i], ids[k]] = [ids[k], ids[i]]; }
      ids.forEach((v, i) => { cs.seats[v].role = i < nb ? 'b' : (i === nb ? 'a' : (i === nb + 1 ? 'c' : 'm')); });
      cs.bidder = /^[A-D]$/.test(String(body.bidder || '')) ? body.bidder : 'ABCD'[Math.floor(Math.random() * 4)];
      await save();
      return json({ ok: true, roster: Object.entries(cs.seats).map(([id, s]) => ({ v: id, n: s.n, role: s.role })), bidder: cs.bidder });
    }
    if (req.method === 'POST' && sub === 'setrole') {
      const v = String(body.v || ''), role = String(body.role || '');
      if (!cs.seats[v] || !/^[mbac]$/.test(role)) return json({ error: 'bad' }, 400);
      cs.seats[v].role = role;
      if (!cs.bidder) cs.bidder = /^[A-D]$/.test(String(body.bidder || '')) ? body.bidder : 'ABCD'[Math.floor(Math.random() * 4)];
      await save();
      return json({ ok: true });
    }
    if (req.method === 'POST' && sub === 'phase') {
      const to = String(body.to || '');
      if (!/^(night|day|over)$/.test(to)) return json({ error: 'bad phase' }, 400);
      if (cs.phase === 'over') return json({ error: 'over' }, 409);
      let result = null;
      if (to === 'night') {
        if (Object.values(cs.seats).some(s => !s.role)) return json({ error: 'undealt' }, 409);
        if (cs.phase === 'vote') return json({ error: 'vote open' }, 409);
        cs.round += 1;
        cs.nights[cs.round] = { picks: {}, check: null, clear: null, notes: {}, result: null };
        cs.phase = 'night';
      } else if (to === 'day') {
        if (cs.phase === 'night') {
          const n = cs.nights[cs.round];
          const bs = backersAlive();
          const picks = bs.map(v => n.picks[v]).filter(Boolean);
          const agreed = bs.length > 0 && picks.length === bs.length && picks.every(p => p === picks[0]) && cs.seats[picks[0]] && cs.seats[picks[0]].alive;
          const target = agreed ? picks[0] : null;
          const cleared = !!(target && n.clear && n.clear.target === target);
          const removed = target && !cleared ? target : null;
          if (removed) cs.seats[removed] = { ...cs.seats[removed], alive: false, out: { how: 'complaint', r: cs.round } };
          n.result = { target, cleared, removed };
          result = { target: nameOf(target), cleared, removed: nameOf(removed) };
          cs.log.push({ r: cs.round, when: 'night', text: removed ? nameOf(removed) + ' pulled off the committee after an anonymous allegation' : (cleared ? 'An allegation was made and dismissed' + (n.clear ? ', General Counsel had shielded ' + nameOf(n.clear.target) : '') : 'No allegation tonight') });
        }
        cs.phase = 'day';
        checkWin();
      } else {
        cs.phase = 'over';
        if (!cs.winner) { const a = aliveIds().length, b = backersAlive().length; cs.winner = b === 0 ? 'committee' : (b * 2 >= a ? 'backers' : (body.winner === 'backers' ? 'backers' : 'committee')); }
        cs.log.push({ r: cs.round, when: 'day', text: 'Game over. ' + (cs.winner === 'committee' ? 'The committee wins' : 'The Manipulators win') });
      }
      await save();
      return json({ ok: true, phase: cs.phase, round: cs.round, result, winner: cs.winner });
    }
    if (req.method === 'POST' && sub === 'vote') {
      if (cs.phase !== 'day') return json({ error: 'not day' }, 409);
      const accused = String(body.accused || '');
      if (!cs.seats[accused] || !cs.seats[accused].alive) return json({ error: 'bad accused' }, 400);
      if (cs.days[cs.round] && cs.days[cs.round].result) return json({ error: 'one vote a day' }, 409);
      cs.days[cs.round] = { accused, votes: {}, result: null };
      cs.phase = 'vote';
      await save();
      return json({ ok: true });
    }
    if (req.method === 'POST' && sub === 'tally') {
      const day = cs.days[cs.round];
      if (cs.phase !== 'vote' || !day) return json({ error: 'no vote' }, 409);
      const hand = day.hand || { yes: 0, no: 0 }; /* votes the moderator entered for phones that could not */
      const yes = Object.values(day.votes).filter(y => y === 'y').length + hand.yes, no = Object.values(day.votes).filter(y => y === 'n').length + hand.no;
      const recused = yes > no;
      if (recused) cs.seats[day.accused] = { ...cs.seats[day.accused], alive: false, out: { how: 'recused', r: cs.round } };
      day.result = { yes, no, recused };
      cs.phase = 'day';
      cs.log.push({ r: cs.round, when: 'day', text: nameOf(day.accused) + (recused ? ' voted off, ' : ' stays, ') + yes + ' to ' + no + (hand.yes + hand.no ? ' (' + (hand.yes + hand.no) + ' by hand)' : '') });
      checkWin();
      await save();
      return json({ ok: true, result: day.result, winner: cs.winner });
    }
    if (req.method === 'POST' && sub === 'remove') {
      const v = String(body.v || ''), how = body.how === 'recused' ? 'recused' : 'complaint';
      if (!cs.seats[v] || !cs.seats[v].alive) return json({ error: 'bad' }, 400);
      cs.seats[v] = { ...cs.seats[v], alive: false, out: { how, r: Math.max(1, cs.round) } };
      cs.log.push({ r: cs.round, when: how === 'recused' ? 'day' : 'night', text: nameOf(v) + (how === 'recused' ? ' voted off' : ' pulled off the committee overnight') + ' (entered by the moderator)' });
      checkWin();
      await save();
      return json({ ok: true, winner: cs.winner });
    }
    if (req.method === 'POST' && sub === 'release') {
      /* open a seat for a new phone (a dead one): the next unknown phone that
         picks this seat's name takes it over. off:true cancels. */
      const v = String(body.v || '');
      if (!cs.seats[v]) return json({ error: 'bad' }, 400);
      if (body.off) delete cs.seats[v].open; else cs.seats[v].open = true;
      await save();
      return json({ ok: true });
    }
    if (req.method === 'POST' && sub === 'hand') {
      /* votes counted by hand for phones that cannot vote, added at the tally */
      const day = cs.days[cs.round];
      if (cs.phase !== 'vote' || !day) return json({ error: 'no vote' }, 409);
      const clip = x => Math.max(0, Math.min(30, Number.isInteger(x) ? x : 0));
      day.hand = { yes: clip(body.yes), no: clip(body.no) };
      await save();
      return json({ ok: true, hand: day.hand });
    }
    if (req.method === 'POST' && sub === 'restore') {
      const v = String(body.v || '');
      if (!cs.seats[v]) return json({ error: 'bad' }, 400);
      cs.seats[v] = { ...cs.seats[v], alive: true, out: null };
      cs.winner = null; if (cs.phase === 'over') cs.phase = 'day';
      cs.log.push({ r: cs.round, when: 'day', text: nameOf(v) + ' restored by the moderator' });
      await save();
      return json({ ok: true });
    }
    return json({ error: 'not found' }, 404);
  }
}
