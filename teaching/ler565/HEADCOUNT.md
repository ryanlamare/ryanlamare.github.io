# Headcount — working memo

**Status: parked, nothing built.** This memo is the brief; pick it up here.
Scoped 2026-08-04. The game is called **Headcount** — see *Theme* below.

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
  screen with the session pre-selected.
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

**League scoring: 3 points a win, 1 for playing.** The participation point is
load-bearing — on pure win-count a student who's 0–6 by week 4 is mathematically
out and stops caring, in a course where participation is 20% of the grade. Keep
the same scoring for three-player games rather than weighting them; odd/even
rotates over a term and it washes out.

Byes, if they ever happen anyway, earn the participation point only.

**Retroactive awards** — all computed from the archive at term end, no advance
planning needed: highest single game, most completed columns, best comeback from
behind, most improved first-half to second.

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

---

## Other things worth building

- **Instructor live board.** Every breakout room's game and score updating on
  your screen at once — who's about to finish, who hasn't started, who dropped.
  Not a toy: it's what makes seven simultaneous games manageable, and it falls
  out of the server almost free. It also tells you what games *actually* take,
  which is how the run-sheet timings get fixed.
- **Spectator mode for the final.** The run sheet already screen-shares it; let
  the class watch on their own screens at full size instead of through Zoom
  compression.
- **Replay viewer.** Watch any archived game back, move by move. Play the
  decisive turn of the final in the last session.
- **Per-student stats feeding the reflections.** *"9 games, average 62, floor
  penalties 40% above class average."* Students reflecting on their own play
  data rather than their memory of it — the strongest pedagogical argument here,
  and it only exists because results are automatic.
- **Auto-generated weekly table** to paste into Canvas, keeping the league alive
  between sessions.

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
  pairs and not others is a clean in-class demonstration.

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
| Operations | **Yellow** | Crate | Solid square with bands |
| Finance | **Ink** | Coin stack | Stacked discs — horizontal rhythm |
| Analytics | **Teal** | Bar chart | Three bars — vertical rhythm |

Two decisions inside that table worth keeping:

**The five silhouettes are deliberately different in *shape*, not just subject** —
spiky-round, open-asymmetric, solid-square, horizontal-rhythm, vertical-rhythm.
At tile size on a phone, subject matter is invisible and only the silhouette
reads. Two round icons (a cog and a magnifier, say) would be a recurring
misread across a 5×5 grid.

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

**The best phone setup is second-screen**: Zoom on the laptop, game on the
phone, which makes the phone a dedicated controller and is genuinely pleasant.
Zoom *and* game on one phone is poor no matter what we build — app-switching
through a breakout room. Worth saying so in the run sheet rather than pretending
the design can fix it.

---

## Build order

**`HEADCOUNT-RULES.md` is the engine spec** — the complete rules stated
precisely enough to implement without guessing, plus the edge cases and a test
checklist. Build step 1 from that file, not from this one. It marks which rules
are Azul's and which are our resolution of a genuine ambiguity, so a future
reader can tell a quotation from a choice.

1. **Engine + headless tests.** No UI. Random-vs-random, thousands of games.
2. **Board UI + hot-seat.** Clickable solo.
3. **Relay + two-device play.** Moved up from last — a real Zoom playtest can't
   happen hot-seat.
4. **Backend, identity, results, leaderboard.**
5. **Stats screens, replay, instructor board.**

### Testing

- A **random-move bot is a test fixture, not a feature.** Students never see it.
  It exists because a *good* bot avoids floor penalties by construction and so
  never exercises the overflow and negative-scoring paths — which is exactly
  where Azul implementations go wrong. It doubles as an emergency stand-in if
  someone doesn't show for a three-player game.
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

- **Backend host: pick any mainstream provider.** The cohort is mostly US-based
  and every student has reached `azee.mattle.online`, an ordinary web host, so
  reachability is not the constraint it would be with a different roster. Free
  tiers are wildly oversized for fourteen students once a week. Revisit only if a
  future cohort's geography changes.
- **No wooden spoon**, and no award for finishing last — see *Award names*.

- **Repeat matchups in a week both count.** Simplest, no bookkeeping.
- **Late joiners** — show points-per-game beside the total, so someone starting
  in week 3 isn't looking at a table they cannot catch.
- **Three-player head-to-head** counts if you finished above the other player.
- **Draws** are worth 2 league points; cup games coin-flip instead
  (`HEADCOUNT-RULES.md` §8).
- **Public board is a top N sized to the class; private rank is always shown to
  the student it belongs to.**

---

## Keep Azee as the fallback for the first term

`week6/live/RULES.md` already treats "Azee is down" as a scenario. If *ours*
breaks during a graded tournament that's our fault and we need somewhere to go.
Don't burn the bridge until it has survived a term.

Accessibility isn't optional: the decks carry `sr-only` transcripts, and a
playable game needs keyboard control and screen-reader-legible state to hold the
same line. Design it in rather than bolting it on.
