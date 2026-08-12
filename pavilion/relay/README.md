# The Headcount relay

Two devices, one game. `PROTOCOL.md` is the wire format; this is how to run it.

| File | What it is |
|---|---|
| `PROTOCOL.md` | The spec. Read this first. |
| `room.js` | The room state machine. Shared — both relays below *are* this file. |
| `dev-relay.js` | A laptop relay, no dependencies. For playtests and the test suite. |
| `worker.js` + `wrangler.toml` | The same thing as a Cloudflare Worker + Durable Object, for the class. |

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

Pick **Two devices → Open a room** on one, read the code out, **Join a room** on
the other. `net.js` works the relay's address out from the page's own address,
so there is nothing to configure as long as both run on the same machine.

Check `http://localhost:8787/health` to see what rooms exist and how far along
they are.

## Live

`wss://headcount-relay.rlamare.workers.dev`, deployed 2026-08-12 and already in
`PRODUCTION_RELAY` in `../net.js`. `https://headcount-relay.rlamare.workers.dev/`
answers with a small JSON health object.

To ship a change to the relay: `npx wrangler deploy` from this directory. The
URL doesn't change, so nothing else needs touching. Note that this deploys
*independently of the site* — pushing to `main` publishes the game, but the
relay only moves when you deploy it.

The free plan carries the Durable Object because `wrangler.toml` asks for the
SQLite-backed kind. Changing that line to `new_classes` would quietly make this
a paid-plan-only deployment.

`npx wrangler dev` runs the Worker locally on the same port as `dev-relay.js`,
which is the way to check a change against the real Durable Object before
deploying it.

## Testing

```bash
node pavilion/test/relay.test.js    # protocol, headless, ~1s
node pavilion/test/online.test.js   # the real UI in headless Chrome
```

The first drives real `net.js` clients over real WebSockets against
`dev-relay.js` and plays a complete game, comparing state hashes at every ply.
The second opens the actual game page with `?uitest=online`, hosts a room, plays
a full game against a bare opponent, **drops the socket mid-game** to exercise
the reconnect path, and finishes with a rematch. Both start their own relay on
an ephemeral port, so neither needs anything running first.

## What this is not, yet

No persistence beyond the room itself, no roster, no results, no instructor
controls — all build step 5. The relay deliberately never runs the engine
during play (`PROTOCOL.md`, "The one idea"); step 5 is where it starts
replaying finished games to derive winners, which is what makes an archived
result unforgeable.
