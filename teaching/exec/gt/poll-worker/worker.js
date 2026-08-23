// gt-poll — tiny live-poll backend for the exec teaching decks.
//
// Deliberately separate from the Pavilion relay: different job, different
// blast radius. One Durable Object per poll id; a vote is "voter v picked
// option o", last vote wins, so people can change their answer. The deck
// polls GET /p/:id and decides for itself when to reveal — the server never
// knows whether results are on screen.
//
//   POST /p/:id/vote   {o: 0..7, v: "voter-uuid"}      -> {ok:true}
//   GET  /p/:id                                        -> {counts:[..], total}
//   POST /p/:id/reset  {s: "<ADMIN_SECRET>"}           -> {ok:true}
//
// Poll ids are [a-z0-9-], max 64 chars. Question text and option labels live
// in the site's /go/polls.json, not here — the server only counts.

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
    const m = url.pathname.match(/^\/p\/([a-z0-9-]{1,64})(\/(vote|reset))?$/);
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

  async fetch(req) {
    const url = new URL(req.url);
    const action = url.pathname.split('/')[3] || '';

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
      return json({ ok: true });
    }

    return json({ error: 'not found' }, 404);
  }
}
