# The Pavilion relay

Two devices, one game — and, since build step 5, the archive those games record
themselves into. `PROTOCOL.md` is the wire format; this is how to run it.

| File | What it is |
|---|---|
| `PROTOCOL.md` | The spec. Read this first. |
| `room.js` | The room state machine. Shared — both relays below *are* this file. |
| `archive.js` | Term, roster, and every game ever played, plus the API's one route table. Shared the same way. |
| `result.js` | Replays a finished game and derives the winner. The only file down here that imports the engine. |
| `dev-relay.js` | A laptop relay, no dependencies. For playtests and the test suite. |
| `worker.js` + `wrangler.toml` | The same thing as a Cloudflare Worker + two Durable Objects, for the class. |

The relay still **never runs the engine during play** (`PROTOCOL.md`, "The one
idea"). `result.js` runs it once, after a game is over, to work out who won —
which is a different job, and the one that makes an archived result unforgeable.

## Playing on your own wifi, today

Two terminals:

```bash
./serve.sh                                          # the site, on :8000
node pavilion/relay/dev-relay.js   # the relay, on :8787
```

Both print a LAN address. Open the game on two devices at the **LAN** one — not
`localhost`, which a phone cannot reach:

```text
http://192.168.x.x:8000/pavilion/
```

Pick **Live game → Open a room** on one, read the code out, **Join a room** on
the other. `net.js` works the relay's address out from the page's own address,
so there is nothing to configure as long as both run on the same machine.

Check `http://localhost:8787/health` to see what rooms exist and how far along
they are.

The laptop relay carries the archive too, in memory — same `archive.js`, so a
game that records here records in the class. Set a term and a roster at
`http://localhost:8000/pavilion/admin/` (the secret is `dev`, or whatever
`PAVILION_ADMIN_SECRET` says), play, and the finished game appears in the games
table. It is forgotten when you Ctrl-C, which is right for a playtest.

## Live

`wss://headcount-relay.rlamare.workers.dev`, deployed 2026-08-12 and already in
`PRODUCTION_RELAY` in `../net.js`. `https://headcount-relay.rlamare.workers.dev/`
answers with a small JSON health object.

That host name is the **deployment's**, not the game's — it went up under the
first theme and there are rooms behind it. Renaming the Worker mints a second
one at a second URL, and renaming the `HeadcountRoom` Durable Object class needs
a `renamed_classes` migration; neither buys anything, because the theme lives in
the copy layer and never on the wire (`PROTOCOL.md`).

To ship a change to the relay: `npx wrangler deploy` from this directory. The
URL doesn't change, so nothing else needs touching. Note that this deploys
*independently of the site* — pushing to `main` publishes the game, but the
relay only moves when you deploy it.

The free plan carries the Durable Objects because `wrangler.toml` asks for the
SQLite-backed kind. Changing those lines to `new_classes` would quietly make
this a paid-plan-only deployment.

### Before the archive works — two one-off steps

```bash
npx wrangler deploy                    # ships the GameArchive object (migration v2)
npx wrangler secret put ADMIN_SECRET   # then paste the same secret into the admin page
```

`ADMIN_SECRET` is the whole of instructor auth: one secret, one instructor.
Until it is set the admin page is simply closed — every `/api/admin/*` request
answers 401 — and with no term configured, games play normally and record
nothing. Nothing else about the relay changes.

Then open `https://ryanlamare.com/pavilion/admin/`, type the secret, set a term
key (`2026-fall`) and paste the class list — in that order, since the roster is
stored per term. From that moment every game between two rostered players
records itself.

**Trying it out first**: set the term to `demo`, play, look around, then delete
that term and set the real one. Deleting a term takes every game in it and its
class list, and you have to type the term key to confirm. Games carry the term
they were played under, so a demo term can also simply be left alone — nothing
ever reads a term you don't ask for.

`npx wrangler dev` runs the Worker locally on the same port as `dev-relay.js`,
which is the way to check a change against the real Durable Object before
deploying it.

## Testing

```bash
node pavilion/test/relay.test.js    # protocol, headless, ~1s
node pavilion/test/archive.test.js  # term, roster, replay-derived results, the API
node pavilion/test/online.test.js   # the real UI in headless Chrome
```

The first drives real `net.js` clients over real WebSockets against
`dev-relay.js` and plays a complete game, comparing state hashes at every ply.
The second tests `result.js` and `archive.js` directly and then over the wire:
it sets a term and a roster through the admin API, plays a full game between two
rostered clients, and checks that the record wrote itself with the winner the
server derived. The third opens the actual game page with `?uitest=online`,
picks a name off the roster, hosts a room, plays a full game against a bare
opponent, **drops the socket mid-game** to exercise the reconnect path, finishes
with a rematch, and checks the archive's receipt reached the end screen. All
three start their own relay on an ephemeral port, so none needs anything
running first.

## What this is not, yet

No league table, no stats screens, no spectating, no instructor live board —
all build step 6, and all of them queries over the archive that step 5 just
started filling. Nothing about the wire format has to change for any of them.
