# Headcount relay protocol — v1

The wire format between two (or three, or four) Headcount clients and the room
they share. Build step 4. Written before the code so the dev relay and the
Cloudflare Worker are two implementations of one spec rather than two dialects.

Read `../../HEADCOUNT.md` (*Architecture*) and `../../HEADCOUNT-RULES.md`
(§9 determinism, §10 move representation, §11 clocks) first — this file assumes
both and does not restate them.

## The one idea

**The relay is dumb and never runs the engine.** A complete game is
`seed + move list`, every client runs the full engine, and Azul is perfect
information once the bag order is shared. So the room's whole job is:

1. hand out a room code and a seed,
2. agree the seat order,
3. put each move in front of the other players, in order, exactly once,
4. remember the move list so a dropped player can resume from it.

Nothing in this file requires the server to know what a legal move is. That is
deliberate, and it is what makes the same protocol implementable in 200 lines of
Node for the kitchen table and in a Durable Object for the class.

**The one thing the server is authoritative about is who sent a message.** A
client cannot claim to be another seat, because the relay stamps the seat from
the connection. Everything else — legality, scoring, whose turn it is — the
clients decide, from the engine, identically.

## Transport

WebSocket, one connection per player, one room per connection. Text frames
carrying JSON objects. Every message has a `t` (type) field and nothing else is
positional.

The URL carries the room:

```text
wss://<host>/room/<CODE>        join an existing room
wss://<host>/new                create one; the server picks the code
```

The client sends its `hello` immediately on open; the server replies `welcome`
before anything else. A client that receives any other message first should
treat the connection as broken.

## Room codes and seeds

Room codes are **two corporate words** — `SYNERGY-BISON` — from the curated
lists in `../words.js`, chosen so the code survives being read aloud over a bad
Zoom mic (`HEADCOUNT.md`, *Identity*). The **server** generates them, because
only the server can see collisions.

The **seed is fixed at room creation** (§9) and is a third word plus a number:
`LEVERAGE-MARMOT-42`. It is separate from the room code so that a code can be
recycled next week without replaying last week's bag.

## Message catalogue

### Client → server

| `t` | Fields | Meaning |
|---|---|---|
| `hello` | `name`, `device`, `id?`, `players?`, `clockMs?`, `seed?` | Sit down. On `/new` the creator's `players`/`clockMs`/`seed` configure the room; on `/room/<CODE>` they are ignored. `id` is a resume token (below). |
| `start` | — | Host only. Freeze the seats and begin. |
| `rematch` | — | Host only, after a game. Same seats, same room, fresh seed and an empty log. Arrives as another `started`. |
| `move` | `ply`, `move` | One complete turn (§10). `ply` must equal the number of moves already recorded; anything else is a race and is rejected. |
| `hash` | `ply`, `h` | The sender's `stateHash` **after** applying move `ply`. |
| `flag` | `seat` | The sender's clock arithmetic says `seat` has run out (§11). |
| `over` | `result` | The sender's engine says the game finished naturally. |
| `ping` | — | Keepalive. |

### Server → client

| `t` | Fields | Meaning |
|---|---|---|
| `welcome` | `code`, `you`, `room`, `serverNow` | Full room state, including every move so far. Always the first message. |
| `roster` | `seats` | Seats changed: someone joined, renamed, dropped or returned. |
| `started` | `seats`, `seed`, `players`, `clockMs`, `at` | The game is on. Seats are frozen and final. |
| `move` | `ply`, `seat`, `move`, `at` | Broadcast to **everyone including the sender**. `seat` is stamped by the server, never taken from the client. |
| `hash` | `ply`, `seat`, `h` | Relayed for cross-checking. |
| `ended` | `ending`, `flagged?`, `result?` | `natural` \| `timeout` \| `void`. First one wins; later claims are ignored. |
| `presence` | `seat`, `connected` | A player's socket opened or closed. Not a result — see §11, reconnect first. |
| `error` | `code`, `msg` | `no-room`, `room-full`, `started`, `bad-ply`, `not-host`, `not-seated`. Fatal unless noted below. |
| `pong` | — | Keepalive reply. |

### The seat object

```js
{ seat: 0, name: 'Sam', device: 'laptop', connected: true }
```

`device` is `laptop` \| `phone` \| `tablet`, self-reported from the client's own
viewport. It exists to answer the phone-fairness question the memo raises
(*Mobile and devices*) — record it, decide later.

## Sequences

### Hosting

```text
C→S  open wss://host/new
C→S  {t:'hello', name:'Sam', device:'laptop', players:2, clockMs:300000}
S→C  {t:'welcome', code:'SYNERGY-BISON', you:{id:'…', seat:0},
      room:{seed:'LEVERAGE-MARMOT-42', players:2, clockMs:300000,
            seats:[…], started:false, moves:[]}, serverNow:1786…}
     … the joiner arrives …
S→C  {t:'roster', seats:[{seat:0,…},{seat:1,…}]}
C→S  {t:'start'}
S→*  {t:'started', seats:[…], seed:'LEVERAGE-MARMOT-42', players:2,
      clockMs:300000, at:1786…}
```

### A turn

```text
C→S  {t:'move', ply:0, move:{source:{type:'agency',index:2}, fn:1,
                             dest:{type:'team',row:3}, t:4210}}
S→*  {t:'move', ply:0, seat:0, move:{…}, at:1786…}
C→S  {t:'hash', ply:0, h:'9f3c…'}      (both clients)
S→*  {t:'hash', ply:0, seat:0, h:'9f3c…'}
```

The sender **does not wait for the echo** — it applies and animates
immediately, then ignores the echoed ply as already-seen. The echo exists so
that everyone, sender included, learns the server's canonical order, and so a
resuming client's replay is byte-identical to everyone else's.

### Resuming

`welcome.room.moves` is the whole game. A returning client rebuilds by
replaying it from the seed; there is no delta protocol and no snapshot,
because a full game is a few hundred bytes.

```text
C→S  open wss://host/room/SYNERGY-BISON
C→S  {t:'hello', name:'Sam', device:'phone', id:'<the token from last time>'}
S→C  {t:'welcome', …, room:{…, started:true, moves:[…41 moves…]}, serverNow:…}
S→*  {t:'presence', seat:0, connected:true}
```

The resume token is minted by the server in `welcome.you.id` and kept in the
client's `localStorage`. It is a capability, not a login: whoever holds it is
that seat. That is the same security model as the roster name-picker — *the
security is that you can see them* (`HEADCOUNT.md`, *Identity*) — and it is
adequate for fourteen people in a Zoom room playing for a leaderboard.

## Rules the clients enforce, not the server

- **Turn order.** A `move` broadcast whose `seat` ≠ the client's own
  `state.seatToMove` is a protocol violation: reject it loudly, do not apply it.
  This is the check that makes a stamped seat worth stamping — without it, a
  buggy client could play its opponent's turn, because `apply()` moves for
  whoever is to move.
- **Legality.** Straight from `legalMoves` / `apply`. A move that throws is a
  bug or a cheat; either way the game stops rather than diverging.
- **Divergence.** Compare each incoming `hash` against your own at that ply.
  They are bit-identical or something is very wrong (§9) — say so on screen
  immediately. A silent drift that only surfaces as disagreeing final scores is
  the exact failure this cross-check exists to prevent.

## Clocks over the wire (§11)

Each move carries `t`, the mover's own elapsed clock at submit, so the move list
alone reconstructs both clocks. Nothing else about the clock is transmitted.

- **Live play: latency is free.** Your clock stops when you submit; your
  opponent's starts when their client *receives*. Transit is charged to nobody.
- **Resuming: the server's stamp.** A client rebuilding from `welcome` cannot
  know when it would have received the last move, so it uses
  `serverNow - lastMove.at` for the current mover's running time. That charges
  the returning player one transit hop they would not otherwise have paid —
  tens of milliseconds against a five-minute clock, and it is the honest
  direction to err, because §11 says a dropped player's clock keeps running.
- **Flagging.** Whoever notices first sends `flag`. The relay broadcasts one
  `ended` and ignores the rest. In practice both clients notice within a frame
  of each other; the tie is resolved by arrival order and it does not matter
  which wins, because they agree on the outcome.

## What the server refuses

- A `move` with the wrong `ply` — `error: bad-ply`. Recoverable: the client has
  fallen behind, so it should treat its own move as unsent, catch up from the
  broadcasts, and let the player try again.
- A `start` from anyone but the host — `error: not-host`.
- A `join` to a room that is full or already started, unless the `id` matches a
  seat (that is a reconnect, and is always allowed) — `error: room-full` /
  `started`.
- A `move` from a spectator — `error: not-seated`.

## Not in v1, deliberately

Everything on this list is build step 5's problem, and none of it changes the
wire format above:

- **Persistence.** The dev relay forgets rooms when it exits and the Worker's
  Durable Object holds them in memory; archiving the finished game record is
  step 5.
- **Identity.** No roster, no name-picker, no instructor auth. You type your
  name.
- **Replay-derived results.** The server records the `result` the clients agree
  on rather than deriving it. Step 5 imports `engine.js` into the Worker and
  derives it — the same module, per *Architecture* — at which point `over`
  becomes advisory and the archive becomes unforgeable.
- **Spectating and the instructor board.** The protocol already broadcasts
  everything a spectator would need; nothing consumes it yet.
