# Headcount — working memo

**Status: active — build steps 1–4 done: engine, hot-seat board UI, greedy bot
+ Training Ground (2026-08-06, with the punch list below applied the same day),
and two-device play over a relay (2026-08-12). Next: step 5, backend, identity,
results and the leaderboard — which needs the Cloudflare account.** Everything
lives in `headcount/`: `engine.js` (pure rules module), `bot.js` (greedy
practice opponent, "The Consultant"), `words.js` (room codes and seeds),
`net.js` (the transport layer), `relay/` (the relay itself — see *Two devices*
below), and `index.html` + `style.css` + `ui.js` (the playable board — two-tap
input, chess clocks, animation layer driven by engine state-diffs via
`applyTake`; the setup screen's Training Ground mode plays you against the bot,
recorded as `mode: 'practice'`, and its Two devices mode opens or joins a room).
Preview with `./serve.sh` at `/teaching/ler565/headcount/`. Tests:
`node teaching/ler565/headcount/test/engine.test.js` (soak size as an
optional argument), `test/bot.test.js`, `test/relay.test.js` (the protocol,
headless) and `test/online.test.js` (two-device play through the real UI in
headless Chrome); `?smoke=1` on the game URL plays a full deterministic game
through the real UI pipeline in a headless browser (`&bot=1` for a practice
game — that one needs `--virtual-time-budget`, since `--dump-dom` fires long
before the bot has finished thinking). Scoped 2026-08-04; reviewed and
extended 2026-08-05. The deadline is a year-plus out. Class size has ranged
**14 to 36** across years, so sizes (board top-N, pairing tables, instructor
board) are settings, not constants. The game is called **Headcount** — see
*Theme* below; the name checked clear on 2026-08-05, no existing board game
uses it.

Goal: replace `azee.mattle.online` with our own version, hosted here, so students
never create an account. LER 565 leans on Azee in every live session, weeks 1–6,
and the three reflections are 25% of the grade — this is a load-bearing
dependency on someone else's free site, not a one-week gimmick.

**This is explicitly not an MVP.** The point is a better experience than Azee,
not a thinner one. Anything below that reads as scope-trimming is a
misunderstanding of the brief.

---

## The goal, stated

> Students already paired in a Zoom breakout room join a shared game with a
> short room code and play a full timed game on any device, anywhere, with no
> account and no install. Results record themselves. A term-long league runs
> alongside the week 6 knockout cup, and both end in an award.

Out of scope, deliberately: **matchmaking** (Zoom already pairs them) and
**account creation** (the entire point).

---

## Decisions already made

### Architecture

- **Move-based engine.** `apply(state, move) -> newState`, pure, never mutated
  from a UI handler. A network message, a bot's turn and a replay step are then
  all the same thing arriving from different places.
- **Seeded RNG, never `Math.random()`.** Bag order derives from a seed fixed at
  room creation, so a whole game compresses to `seed + move list` — a few hundred
  bytes. This single decision buys deterministic tests, reproducible bug reports,
  replay, unforgeable results and the shared-bag trick below. It is the keystone;
  don't trade it away.
- **Three layers: engine / UI / transport.** The bot and the network connection
  are both just move sources.
- **Azul is perfect information.** Only the bag is hidden, and a shared seed
  removes even that, so every client can run the full engine and cross-check its
  opponents. The server never needs game logic *during* play.
- **Per-turn state hash.** Clients compare each turn. Under the seeded design
  they should be bit-identical forever, so divergence must fail loudly and
  immediately rather than drift silently until the scores disagree.

### Rules and format

- **Base Azul, not the blank-wall variant.** The variant makes wall-tiling a
  decision, which would need its own clock; base rules make it automatic.
- **Player count is a constant, not a code path.** Azul is natively 2–4 players
  and the only difference is the number of factory displays: 5 / 7 / 9. Three-
  player support is a UI layout problem, not an engine problem.
- **No byes — ever.** Odd groups get one three-player game instead. This deletes
  the whole bye-rotation apparatus in `week6/live/RULES.md`; the pairing tables
  get much shorter.
- **Chess clock, 5 minutes per player, running only on your turn.** Configurable
  per room. Clocks pause during end-of-round wall-tiling, since base rules make
  that automatic and there's no decision to time.
- **Latency is free.** Your clock stops on submit, your opponent's starts on
  receive. Neither player is charged for transit.
- **Timeout loses, like chess.** But record it as won-on-time and exclude it from
  score-based awards — a timeout leaves an artificially low score that would
  quietly corrupt "highest game" stats.
- Both the weekly matches and the week 6 tournament run the same 5-minute
  clocks. The last live session is two hours, so full-length games fit.

### Identity, results, data

- **Roster name-picker, not personal links.** Join screen lists the class: click
  your name. `localStorage` remembers the device, so from week two it's
  *"Welcome back, Sam — not Sam?"* Rejected: personal join links (students lose
  them) and a Canvas link repository (every student can see everyone's link, so
  anyone can play as anyone).
- The security model is **that you can see them.** They're in your Zoom room, you
  assigned the pairings, and two people can't claim one name in a session without
  it showing. Adequate for fourteen students playing for a leaderboard.
- **QR codes are for session entry, not identity.** A QR encodes the same token,
  so it doesn't fix a lost link. It *is* a good way to get everyone into a
  session fast: screen-share one, everyone scans, everyone lands on the join
  screen with the session pre-selected. Scan with the phone **camera**, not from
  Zoom's chat — Zoom's in-app webview may have ephemeral storage (breaking
  "Welcome back, Sam") and dies when the app backgrounds. Test this on a real
  phone in a real Zoom call before week 1; the fix is a run-sheet line, not code.
- **The instructor is on the roster too.** Week 1 opens with a live demo match
  against a student, so the instructor is a playable name like any other.
  Instructor games record as **exhibitions** — archived, excluded from the
  league, records and awards by default.
- **Room codes are two corporate words, not hex** — `SYNERGY-BISON`,
  `PIVOT-MERLOT` — from a curated list with no ambiguous characters. The code's
  real transport is Zoom audio: "synergy bison" survives a bad mic, "X7K2QF"
  doesn't. The format is part of the protocol, so it's decided now.
- **Real names, not firm names.** Pseudonymous company names were considered
  (2026-08-05) and rejected: a small six-week online class of HR professionals
  bonds through real interactions under real names, and inventing a company
  name is a social hazard of its own. The cohort is small and US-based; there is
  no privacy problem real names need to solve here.
- **Results record themselves.** No submit button. The engine knows the game
  ended; both clients send their logs.
- **The server replays the move log and derives the winner itself.** Nobody
  reports anything. Faking a result means fabricating a legal move sequence that
  your opponent's client independently corroborates — a two-person conspiracy, in
  a class of fourteen.
- **Archive whole games, not results.** Storing `seed + move list` means awards
  can be invented in week 5 and applied retroactively to week 1. Never instrument
  in advance for a stat you might want.
- **Only real endings count.** A natural finish or a genuine timeout records; a
  dropped connection voids, with an instructor override. Otherwise bad wifi
  becomes a permanent mark on the league table.

### Consequence worth being explicit about

Automatic results mean **a real backend with persistent storage**, not the
stateless relay an earlier draft had. That was a deliberate trade, made with the
cheaper Sheet-fed option on the table. Storage is kilobytes; cost is still
effectively nothing at this scale.

---

## League, cup, awards

The football structure, which gives the term a shape:

- **League** — every weekly match, weeks 1–5. Running table, top five shown.
- **Cup** — the week 6 knockout. Already built: `week6/live/bracket.html` needs
  no changes and is already game-agnostic.
- **Champion of Champions** — league winner vs cup winner. One person taking
  both is *the Double*, which is a good way to end a course.

**League scoring: win 3, draw 2, loss 1 — inclusive totals; the "point for
playing" *is* the loser's point, not a bonus on top** (three-player split in the
rules spec §8). The participation point is
load-bearing — on pure win-count a student who's 0–6 by week 4 is mathematically
out and stops caring, in a course where participation is 20% of the grade. Keep
the same scoring for three-player games rather than weighting them; odd/even
rotates over a term and it washes out.

Byes, if they ever happen anyway, earn the participation point only.

**Retroactive awards** — all computed from the archive at term end, no advance
planning needed: highest single game, most completed columns, best comeback from
behind, most improved first-half to second.

### The Record Book — the archive outlives the term

Every game record carries a `term` key from day one, so records accrue across
*years*, not just weeks: all-time **Best Quarter**, all-time biggest comeback,
longest win streak — plus a **Hall of Champions** listing every year's Employer
of the Year, Cup winner, and any Doubles. Future cohorts play against history:
"the all-time record is 94, set in 2026" is the cheapest motivation the league
will ever buy, and the splash screen gets it for free. One field now;
reconstructing term boundaries from timestamps later is exactly the archaeology
this project exists to avoid. Records pages obey the uplifting rule like
everything else — halls and highs, never lows.

### Public board vs private rank — they are different things

- **Public leaderboard: a top N, never a full ranking.** A permanent, visible
  bottom in a class where everyone knows each other is the thing to avoid. "Most
  improved" alongside it gives the lower half something live to chase.
- **Private stats page: always show the student their exact position.** Visible
  only to them. Withholding it is not kindness — in a class of 30 it would leave
  25 people unable to tell 6th from 30th, unable to see they're close to
  breaking in, and unable to see themselves climbing. The harm in a public
  bottom is *social*; telling someone privately where they stand is neither
  public nor mocking, and it's information they're entitled to.

Pair the private rank with **distance to the next rung** — "4 points off 5th."
That turns a position into a target rather than a verdict, and it's only
possible once a student can see where they actually are.

**Size N to the class.** Five of fourteen is a third of the room; five of thirty
is a sixth, and thin enough that most people have nothing visible to chase. Make
the board length a setting rather than a constant.

---

## The stats screens

The sports-broadcast framing, and nearly free once the archive exists — it's all
just queries over stored games.

**Pre-game splash:** head-to-head record, each player's personal best, average
score, recent form (`W L W W L`), last meeting's score. Must degrade gracefully
in week 1 when there are no stats — "first meeting" is a fine thing to show. Keep
it brief and click-to-start; it sits inside a limited breakout window and must
not eat the clock. Needs a three-way layout too.

**No league position on the splash** — but for a narrow reason, not because rank
is shameful. The splash is **mutually visible and shown involuntarily**: it
appears before every game with an opponent looking at the same screen. That's
the wrong place to surface someone's standing. Head-to-head stays, because
repeated play against a known opponent is the course's own material and the
whole reason the screen is interesting.

Each student's own position belongs on **their private stats page**, where it is
always available and visible only to them (see below).

**Post-game screen** — likely the bigger win, since the moment a game ends is
when students care most. Final scores, what it did to the head-to-head, and league
movement: *"Sam ↑2 to 4th."*

**Presentation: this deserves theatre — and animation is the default experience,
not garnish** (Ryan, 2026-08-05: full creative licence here; do not import the
slide decks' restraint). The splash is a *splash* — a big animated card, the
head-to-head numbers landing with a pop, records sliding in. Moves animate
Azee-style and then some: tiles fly from agency to team, leftovers spill and
scatter into the open market, and at the quarter close the performance-review
sweep — completed teams' lead tiles glide onto the org chart one row at a time
while the score ticks up with each placement, surplus tiles clearing off the
table. Beats worth staging: bench tiles landing with a heavier, reluctant thud
(the penalty should *feel* like overstaffing); the First Mover token's flip when
someone bites; the **alumni wave** as a visible cascade back into the market; a
completed column lighting up cell by cell; a game-ending row sweeping across;
the cycle-complete finale with the winner's board taking the spotlight. Two engineering
rules keep all this cheap rather than a retrofit: animations are **driven by
engine state-diffs** (the pure engine produces before/after; the UI animates
the difference — never animation logic inside the engine), and one
`prefers-reduced-motion` media query provides an instant-move fallback. That
query is an OS accessibility setting for vestibular disorders, not a design
constraint — it costs one line, silently serves the rare student who needs it,
and places zero limits on how far the animations go for everyone else.

---

## Other things worth building

- **Instructor live board.** Every breakout room's game and score updating on
  your screen at once — who's about to finish, who hasn't started, who dropped.
  Not a toy: it's what makes seven — or, at 36 students, eighteen —
  simultaneous games manageable, and it falls out of the server almost free. It also tells you what games *actually* take,
  which is how the run-sheet timings get fixed.
- **Spectator mode for the final.** The run sheet already screen-shares it; let
  the class watch on their own screens at full size instead of through Zoom
  compression.
- ~~Replay viewer~~ — **cut** (Ryan, 2026-08-05): the class won't re-watch
  moves; this is one activity among many. The archive keeps full move lists
  regardless — it powers records and stats — so a viewer could return later at
  zero data cost. It just isn't in the build.
- **The Training Ground.** Practice against a bot, linked from orientation week,
  so students arrive at week 1 already knowing the rules. This deliberately
  **reverses the earlier "bots are out" ruling** (reopened by Ryan, 2026-08-05):
  a bot is now a *practice* feature — and still never plays a league game except
  as the emergency stand-in. The practice opponent is a **greedy heuristic bot**
  (best immediate placement, avoids the bench), not the random test bot, whose
  play is too absurd to teach anyone anything. Practice games record with
  `mode: 'practice'` and count for nothing.
- **Talent Weekly — the auto-generated round-up.** A page that rebuilds itself
  from the archive after each session: the league table plus two or three
  canned-template blurbs — *"Sam stunned the market from 19 down"* — picked by
  simple rules (biggest comeback, streak extended, all-time record threatened).
  **Zero instructor work is the constraint, not a preference**: it generates and
  publishes itself, Canvas gets a link once in week 1 and never again. Any
  template that needs weekly hand-tuning is out of spec.
- **Per-student stats feeding the reflections.** *"9 games, average 62, floor
  penalties 40% above class average."* Students reflecting on their own play
  data rather than their memory of it — the strongest pedagogical argument here,
  and it only exists because results are automatic.
- **Per-student data export.** The private stats page's numbers, downloadable,
  so a reflection can cite *"my 9 games, average 62"* directly. Nearly free once
  the stats page exists.

### The archive is course content, not just plumbing

Repeated play is the theory the course teaches, and a term-long league produces
a genuine dataset about it from the students' own behaviour:

- **Reputation.** The leaderboard means everyone knows who's strong. Whether
  play changes against a known-strong opponent is measurable here.
- **End-game effects.** Finitely repeated games predict unravelling near the
  end. Week 6 is the last chance — whether behaviour shifts is an observable
  test of a prediction the class has already been taught.
- **The pre-game splash is an intervention, not just decoration.** Showing head-
  to-head history makes the shadow of the future explicit. Showing it to some
  pairs and not others is a clean in-class demonstration — which is why room
  creation carries a **show-history flag** from day one; without a per-room
  toggle the comparison is never clean.

This is all for teaching and for fun — nothing here is a research project.

---

## Theme

**Headcount.** Competing firms hire from a shared talent market, slot people into
teams, and pay for the ones they can't deploy. Chosen over *Shopfloor* and
*Piecework* because the course is HRM and strategy — corporate staffing, not
bargaining and ER — so the register is consulting-and-corporate throughout.

It also settles the naming problem: not Azul (Plan B Games' name and art; the
mechanics themselves aren't copyrightable), and not Azee, which is
mattle.online's name rather than ours.

Every mechanic carries meaning — this is a reskin, not a coat of paint:

| Azul | Headcount | Why it works |
|---|---|---|
| Factory display | **Agency** | Take all of one role and **the rest spill into the open market** — your hire hands the leftovers to a competitor |
| Centre pool | **Open market** | Accumulates everyone's leftovers |
| First-player marker | **First Mover** token | Initiative next round, *at a cost* — a timing commitment you pay for, which is week 6's content exactly |
| Pattern lines | **Teams** | One role type each, and a **partly staffed team delivers nothing** until complete |
| The wall | **Org chart** | Placement scores by adjacency — complementarity between filled roles |
| Floor line | **The bench** | People you couldn't deploy, at escalating cost |
| Tile colours | **Five functions** | Engineering, Sales, Operations, Finance, Analytics — see *Tiles* below |

The wall is a Latin square, so the bonuses land cleanly:

- **Row** (+2) — a department with one of every function: a balanced team.
- **Column** (+7) — one function staffed across every department.
- **All five of a colour** (+10) — you've cornered the market on a role.

**Rounds are Quarters.** The round counter reads Q1, Q2, Q3…, and Phase B is
the **performance review** (renamed from "closing the books" — Ryan,
2026-08-06 — the accounting phrase never quite sang; the HR one is also
literally what the phase does to your teams). Naming only — a game can run to
Q6 or Q7 and nobody's fiscal calendar minds — but it gives the clock pause a
voice, makes the round structure read corporate, and retroactively earns the
*Best Quarter* award name. The game's end is **recruitment cycle complete**
(was "final whistle / full time", briefly "closing bell" — Ryan, 2026-08-06;
the football register belongs to the league framing, not the in-game
theatre, and the cycle phrasing closes the loop the theme opens: a game is
one recruitment cycle). A timeout still reads "out of time". When the bag refills from the lid, that's the **alumni
wave** — boomerang hires re-entering the market. (See rules spec §6.1 for when
it actually fires: every 3-player game, but 2-player games only past Q5.)

The bench is the mechanic that sings. In Azul it's an abstract penalty; here
it's overstaffing — you took four people to deny a rival and now you're paying
for the two you can't place. That's a real staffing tradeoff, and students feel
it immediately.

**Theme the names and the art, never the rules.** Base Azul mechanics stay
exactly as they are — same tile counts, same scoring, same 5/7/9 agencies. The
rules are correct because thousands of people have debugged them, and Azee stays
a usable fallback only while the games are identical. A themed rule tweak
quietly costs both.

Worth knowing rather than smoothing over: tiles-as-workers means the game has
you hoarding people to block a rival and discarding the surplus at a penalty.
For an HRM course that's the most discussable thing on the board, and a
reflection prompt writes itself.

### Tiles — colour plus isotype, never text

**No words on tiles.** Each function is a flat background colour carrying a
single isotype-style pictogram: solid silhouette, no outline, no interior
detail, no strokes. Squares of text would read as a spreadsheet; this reads as a
game, and it stays abstract enough that the mechanics feel like a game rather
than an HR exercise.

| Function | Colour | Isotype | Silhouette |
|---|---|---|---|
| Engineering | **Blue** | Cog | Round, toothed — spiky outline |
| Sales | **Red** | Headset | Arc with mic boom — open, asymmetric |
| Operations | **Yellow** | Crate | Solid square, diagonal straps |
| Finance | **Ink** | Coin stack | Stacked discs — horizontal rhythm |
| Analytics | **Teal** | Bar chart | Three bars — vertical rhythm |

Two decisions inside that table worth keeping:

**The five silhouettes are deliberately different in *shape*, not just subject** —
spiky-round, open-asymmetric, solid-square, horizontal-rhythm, vertical-rhythm.
At tile size on a phone, subject matter is invisible and only the silhouette
reads. Two round icons (a cog and a magnifier, say) would be a recurring
misread across a 5×5 grid. This bit once already: the crate's bands began
horizontal and collided with the coin stack in real play (Ryan, 2026-08-06)
— hence the diagonal straps. Diagonal was the only free direction: vertical
would collide with the bar chart.

**Teal rather than green.** Red against green is the one pair a colourblind
player genuinely cannot separate, and roughly one man in twelve has some red-
green deficiency. In a graded activity that's a fairness problem, not a polish
problem.

Which is the real argument for the isotypes: **the pictogram is the
accessibility layer, not decoration.** Colour alone would fail those students
outright. Colour *and* shape means a tile is identifiable either way, and the
board still works in greyscale. The aesthetic call and the correct engineering
call are the same one here.

Practically: an inline `<svg style="display:none">` sprite referenced by
`<use href="#id">`, exactly the pattern the decks already use. Flat solid fills
survive being scaled down; anything with strokes or interior detail turns to
mush at 40px. A light-coloured tile needs a border against the paper background;
the ink tile doesn't.

### Award names

Corporate-metric names, which the theme earns:

- **Employer of the Year** — league winner
- **The Cup** — week 6 knockout
- **The Double** — both, by one person
- **Best Quarter** — highest single game
- **Turnaround** — best comeback from behind
- **Most Improved** — first half to second
**No wooden spoon, and no award for finishing last** — considered and rejected.
Joke contests about low finishers are mean-spirited, and the goal is uplifting.

Treat that as the **rule for any award added later: every award celebrates
something achieved, none marks a failure.** It's a checkable test, and it's also
why the table shows a top five rather than a full ranking — not to hide
information, but because a permanent public bottom is the same idea wearing a
different hat.

---

## Mobile and devices

Assume a player or two is on a phone or iPad every session. Verdicts:

- **iPad: fine.** Near-desktop dimensions, essentially no special work.
- **Phone: needs a genuinely different layout, not a scaled-down one.**

**Do not reuse the decks' fixed-canvas approach.** The slides lay out on
1280×720 and scale to the viewport via `--scale`, which is right for something
you only look at. Scaled to a 390px-wide phone, an Azul tile lands around 13px —
far below a usable touch target. Scaling works for viewing and fails for
tapping. The game needs real responsive layout.

Phone portrait can't show everything at once: at a comfortable ~44px touch
target a player board alone wants ~450px of width. So section it — factories as
a scrollable row, your board, opponents collapsed to score-and-progress with
tap-to-expand. You rarely need the factories and your own pattern lines in view
simultaneously.

**Two-tap interaction, not drag-and-drop.** Tap a colour in a factory, legal
pattern lines highlight, tap the destination. Drag needs precision touch can't
give, and two-tap is *better* on desktop too — so it's one interaction model on
mouse, trackpad and touch rather than three. Decide this before the UI is built;
it's expensive to retrofit.

**The clock creates a fairness problem here.** If phone play is slower, a
5-minute chess clock systematically penalises phone users — and the league has
awards attached. Record the device with each game: the archive can then answer
whether phone players actually lose on time more often, rather than leaving it a
guess. Steer league games toward laptops if it turns out to matter.

**The game is installable as a PWA** (added 2026-08-08): `manifest.webmanifest`
plus icons in `headcount/` let a student "Add to Home Screen", where the game
opens full-screen under its own icon — a 2×2 of the real tiles. It is still
just the website: no store, no separate codebase, and deliberately **no service
worker** — the `?v=` cache-buster convention stays the whole update story, and
a cache-first worker would quietly serve stale files against it. Optional and
purely additive; the plain URL behaves exactly as before.

**The best phone setup is second-screen**: Zoom on the laptop, game on the
phone, which makes the phone a dedicated controller and is genuinely pleasant.
Zoom *and* game on one phone is poor no matter what we build — app-switching
through a breakout room. Worth saying so in the run sheet rather than pretending
the design can fix it.

---

## Two devices — built 2026-08-12 (build step 4)

Students on separate devices now play a real game against each other. The wire
format is `headcount/relay/PROTOCOL.md`; how to run it is
`headcount/relay/README.md`. Three things are worth having in this memo rather
than only in those.

**The relay never runs the engine.** A complete game is `seed + move list` and
Azul is perfect information once the bag order is shared, so the room's whole
job is to hand out a code and a seed, agree seat order, put each move in front
of the other players in order exactly once, and remember the log. The one thing
it *is* authoritative about is **who sent a message** — it stamps the seat from
the connection, so a client cannot play its opponent's turn. Everything else —
legality, scoring, whose turn it is — every client decides identically, from the
engine. That is what makes the same protocol implementable in 200 lines of Node
for the kitchen table and in a Durable Object for the class, and it is why
`relay/room.js` is one file that both of them run.

**Two relays, one implementation.** `relay/dev-relay.js` runs on a laptop with
no dependencies (the WebSocket framing is hand-rolled RFC 6455, which is cheaper
than a `node_modules` in a repo that has none) — run it beside `./serve.sh` and
two devices on the same wifi can play today, no account anywhere. `relay/worker.js`
is the same `room.js` inside a Cloudflare Durable Object for the class. The
Worker is written, and waits only on the account.

**Reconnect is the interesting case, and it's cheap.** Because a game is
`seed + move list`, a returning client rebuilds the exact position from one
`welcome` message — there is no delta protocol and no snapshot. A resume token
in `localStorage` returns you to *your* seat, so a phone that locked mid-game is
a five-second interruption rather than a lost game. The dropped player's clock
keeps running while they are gone, as §11 requires and as chess does.

Two additions the spec didn't have, both from thinking about a breakout room
rather than a protocol:

- **Rematch is a message.** Same room, same seats, fresh bag. Pairs play several
  games in a session and making them read the code aloud again each time is
  friction for nothing.
- **The room code is the largest thing on the lobby screen**, because its real
  transport is Zoom audio.

Tested at three levels: `test/relay.test.js` plays a full game between two
headless clients over real WebSockets and compares state hashes at every ply;
`test/online.test.js` opens the actual game page in headless Chrome, hosts a
room, plays a full game against a bare opponent, **drops the socket mid-game**
and finishes with a rematch. What is still untested is a human: the memo's own
testing rules — a real Zoom playtest, separate networks, don't coach the other
player — are the next thing, and they are what step 4 existed to make possible.

## Design punch list — from playthroughs, applied at the refinement pass

Compiled from Ryan's first hot-seat playthrough (2026-08-05). These are
deliberate deferrals, not oversights: the refinement pass runs after build
step 3 so the changes react to real play rather than guesses.

**All six applied 2026-08-06.** The pacing knob from item 1 is `--tempo` in
`style.css` (currently 2 — double the original durations); it scales every
theatre duration, the CSS keyframes and the JS flights/beats alike, so pace
stays one edit. Ambient loops (clock blink, drop-hint pulse) deliberately
don't scale. Kept for the record:

1. **Slow everything down, a lot** — especially the end-of-round
   books-closing sequence. Use a central timing scale so pacing is one knob,
   not fifty edits.
2. **Team rows must align with the org chart**: identical cell size and
   row-for-row alignment, so you can see exactly which wall row each team
   tiles into at the close.
3. **Colour and tile-design pass.** Unfilled org-chart cells should be
   *exactly* the same colour as the real tiles, made obviously unfilled by
   opacity — while claimable tiles in the market carry a large border. Colour
   becomes the primary way you read what's filled, what's claimable, and
   what's still open.
4. **First Mover token needs to be unmistakably not a tile**: a black "1" on
   a white background, borderless. (The no-words rule is for tiles; the
   token is the one legitimate glyph, as in Azul itself.)
5. **Desktop boards bigger** — there's plenty of blank space; use it.
6. **Phone: one screen, no sideways scrolling.** Agencies wrap (roughly
   3 + 2), then the open market, then your board — all visible together —
   with the opponent's collapsed board below the fold.

Ryan's second look (2026-08-06), also applied: agencies carry **no visible
name** (the names survive in screen-reader labels and move announcements);
the Bag/Lid chips became a single **Recruit pool** chip, with discards
flying to an invisible off-screen drain and the alumni wave restocking the
pool chip; the start-of-quarter deal slowed further (it should read as an
event, not a shuffle); the red HIRING tag came off the active board (the
border and topbar already say it); and the football/accounting register
left the in-game copy — *performance review* and *recruitment cycle
complete* (see *Theme*).

## From the first live two-device playtest (2026-08-12)

Ryan played laptop against phone through the deployed relay, the night it went
up. Everything below was applied the same session.

**Two layout faults, both "the board won't sit still".**

1. **The market resized as tiles were drawn**, which re-wrapped the agencies
   and shunted every board a few pixels down the page, every turn. The open
   market's *box* is now a fixed width with height reserved for three rows —
   its contents churn constantly and none of that reaches the layout.
2. **The phone could be dragged sideways** to reveal the Record and New
   buttons. `overflow-x: hidden` now makes that impossible anywhere, and the
   topbar never wraps: the phase label is the only thing allowed to shrink, and
   it ellipsises rather than tipping onto a second line and pushing the boards
   down 34px mid-game.

Both are silent regressions if nobody measures them, so `?smoke=1&layout=1`
now plays a whole game while sampling the market's height, the boards' top edge
and the document's scroll width after every move, and fails unless each is a
single value. Checked at 1440, 820 and 500 px.

**Four wording faults.**

3. **"Functions" for a completed set of five** read as jargon next to *rows* and
   *columns*. The end screen now says **sets** — "3 rows · 2 columns · 1 set".
   Display only: the engine, the rules spec and the move format still call the
   five tile types *functions*, which is the right domain word for
   Engineering/Sales/Operations/Finance/Analytics. Only the **bonus** is a set.
4. **"Ryan has the First Mover"** was clunky. Both quarter banners now read
   `Q3 · First Mover: Ryan`.
5. **The setup screen was undersold.** It now opens with back-of-the-box copy —
   *Hire fast. Staff smart. Outperform your rivals.* — over a pitch that says
   what you actually do and what it costs you.
6. **"Table"** meant nothing as a section heading; it is **Game type** now.

**And one deletion.** The mode picker offered Hot-seat, Training Ground and Two
devices. LER 565 is an **online** class — students are never in the same room —
so pass-and-play has no purpose here, and the earlier reasoning that it was the
wifi-failure fallback was simply wrong for this cohort: they cannot share a
laptop. Two modes now, **Live game** and **Training Ground**, with the live one
first and preselected because it is the point. The local multi-player code path
survives in `startGame` because the smoke tests drive it, but has no way in from
the interface. Put it back if an in-person class ever wants it — the
pass-and-play fallback rule in `TEACHING_HUB.md` still stands for MG478, which
*is* in person.

## Build order

**`HEADCOUNT-RULES.md` is the engine spec** — the complete rules stated
precisely enough to implement without guessing, plus the edge cases and a test
checklist. Build step 1 from that file, not from this one. It marks which rules
are Azul's and which are our resolution of a genuine ambiguity, so a future
reader can tell a quotation from a choice.

1. **Engine + headless tests.** No UI. Random-vs-random, thousands of games.
2. **Board UI + hot-seat.** Clickable solo. The animation layer and the two-tap
   interaction are designed here, not bolted on afterwards.
3. **Greedy bot + Training Ground.** Falls straight out of step 2 and gives
   orientation week something to link.
4. **Relay + two-device play.** A real Zoom playtest can't happen hot-seat.
   Done 2026-08-12 — see *Two devices* above.
5. **Backend, identity, results, leaderboard, admin.** Instructor auth is one
   secret; roster and term setup is a one-page admin screen.
6. **Stats screens, Record Book, Hall of Champions, Talent Weekly, instructor
   board.**

### Testing

- **Two bots, two jobs.** The **random** bot is the test fixture: it benches
  constantly and so exercises the overflow and negative-scoring paths a
  competent player avoids — exactly where Azul implementations go wrong. The
  **greedy** bot is the Training Ground opponent (see above) and the emergency
  stand-in for a no-show. Neither ever plays a league game.
- **Playtest with a human over Zoom**, replicating the class setup. Bots don't
  click, so nothing about input handling gets tested any other way.
- Deliberately don't coach the other player through the first game. Where they
  hesitate is the UI bug list.
- **Test across genuinely separate networks**, not two laptops on one wifi.
  Campus and student networks are where connection setup actually fails.
- Record `seed + move list` for every playtest game — any bug is then
  reproducible from a short string.

---

## Open questions

None blocking. Everything below is settled; recorded so it isn't reopened by
accident.

- **Backend: Cloudflare Workers + Durable Objects — decided 2026-08-05.** Two
  constraints narrowed it: the server must run **the same JS engine module** as
  the clients (it replays games to derive winners; a second engine in another
  language would be madness), and it must not cold-start at class time (free
  Node hosts sleep). One Durable Object per room provides the WebSocket relay
  and room state; DO storage holds the kilobyte-scale archive. Free-plan limits
  verified (≈3M requests/month, DOs and WebSockets included) — oversized even at
  36 students. **Live since 2026-08-12** at
  `wss://headcount-relay.rlamare.workers.dev`, deployed with `npx wrangler
  deploy` from `headcount/relay/` and wired into `PRODUCTION_RELAY` in
  `headcount/net.js`. The free plan carried the Durable Object without
  complaint — the SQLite-backed migration in `wrangler.toml` is what makes that
  true, so don't change it to `new_classes`. Verified end to end the same day:
  two clients played a complete 99-move game through the deployed Worker,
  byte-identical at every ply, then reconnected into it from the stored move
  log. Median round trip 102 ms.
- **No wooden spoon**, and no award for finishing last — see *Award names*.

- **Repeat matchups in a week both count.** Simplest, no bookkeeping.
- **Late joiners** — show points-per-game beside the total, so someone starting
  in week 3 isn't looking at a table they cannot catch.
- **Three-player head-to-head** counts if you finished above the other player.
- **Draws** are worth 2 league points; cup games coin-flip instead
  (`HEADCOUNT-RULES.md` §8).
- **Public board is a top N sized to the class; private rank is always shown to
  the student it belongs to.**
- **Firm names — considered and rejected** (2026-08-05); see *Identity* above.
  Real names everywhere.
- **Disconnects reconnect first, void last** — rules spec §11. The dropped
  player's clock runs while they're gone; the instructor voids only when the
  wifi, not the player, was the problem.
- **Every move carries a clock timestamp** (rules spec §10), so timeouts are
  auditable and think-time and device-fairness stats come free.

---

## Keep Azee as the fallback for the first term

`week6/live/RULES.md` already treats "Azee is down" as a scenario. If *ours*
breaks during a graded tournament that's our fault and we need somewhere to go.
Don't burn the bridge until it has survived a term.

Accessibility isn't optional: the decks carry `sr-only` transcripts, and a
playable game needs keyboard control and screen-reader-legible state to hold the
same line. Design it in rather than bolting it on.
