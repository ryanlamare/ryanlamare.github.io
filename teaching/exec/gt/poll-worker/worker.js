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
    const m = url.pathname.match(/^\/p\/([a-z0-9-]{1,64})(\/(vote|say|answers|votes|entries|draw|draws|target|round|guess|guesses|reset))?$/);
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
      const map = await this.storage.list({ prefix: 'draw:' });
      if (map.size) await this.storage.delete([...map.keys()]);
      return json({ ok: true });
    }

    return json({ error: 'not found' }, 404);
  }
}
