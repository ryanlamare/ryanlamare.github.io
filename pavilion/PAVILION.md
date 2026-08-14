# Pavilion — working memo

**Status: active — build steps 1–5 done: engine, hot-seat board UI, greedy bot
+ Training Ground (2026-08-06, with the punch list below applied the same day),
two-device play over a relay (2026-08-12), and the backend spine — archive,
identity, replay-derived results, instructor admin (2026-08-13). **Step 6 is
underway** (2026-08-13): the league stamp, `relay/stats.js` — every table,
record and honour as pure queries — the two public read routes, and the records
site itself at `/pavilion/records/` (hub, and the LER 565 league page with
Standings · Records · Champions and a season picker). The **pre-game splash and
post-game screen** landed 2026-08-14 (see *The stats screens*). Still to build:
the instructor live board, the Bulletin and the challenge ladder. All of those
are more queries over the same module; none of them needs the engine, the wire
format or the archive to change.**

**The theme was rebuilt on 2026-08-12 and the game is now *Pavilion* — see
*Theme* below, which is the part of this memo to read first, along with the
record of the three themes that failed before it. The copy-and-art pass landed
the same day (see *The copy-and-art pass* below), so the code and these specs
now agree: every player-facing word is Pavilion's, and every identifier
underneath is theme-neutral.**

Everything lives in `pavilion/`: `engine.js` (pure rules module), `bot.js` (greedy
practice opponent, "The Commissioner"), `words.js` (room codes and seeds),
`net.js` (the transport layer), `relay/` (the relay, the archive and
`stats.js` — see *Two devices*, *The backend spine* and *What step 6 built*
below), `admin/` (the instructor's page), `records/` (the public records site), and
`index.html` + `style.css` + `ui.js` (the playable board — two-tap
input, chess clocks, animation layer driven by engine state-diffs via
`applyTake`; the setup screen's Training Ground mode plays you against the bot,
recorded as `mode: 'practice'`, and its Two devices mode opens or joins a room).
Preview with `./serve.sh` at `/pavilion/`. Tests:
`node pavilion/test/engine.test.js` (soak size as an
optional argument), `test/bot.test.js`, `test/relay.test.js` (the protocol,
headless), `test/archive.test.js` (term, roster, replay-derived results and the
API), `test/stats.test.js` (the tables, records and honours) and
`test/online.test.js` (two-device play through the real UI in
headless Chrome); `?smoke=1` on the game URL plays a full deterministic game
through the real UI pipeline in a headless browser (`&bot=1` for a practice
game — that one needs `--virtual-time-budget`, since `--dump-dom` fires long
before the bot has finished thinking). Scoped 2026-08-04; reviewed and
extended 2026-08-05. The deadline is a year-plus out. Class size has ranged
**14 to 36** across years, so sizes (board top-N, pairing tables, instructor
board) are settings, not constants.

**The URL is `ryanlamare.com/pavilion`, not a path under `teaching/ler565/`**
(moved 2026-08-12). Students get a short link they can be told out loud. It is
still an LER 565 activity, but the game carries **no course branding** — the
LER 565 kicker came off the setup and lobby screens (Ryan, 2026-08-13) so the
game stands alone and can be used in other contexts.

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
  the whole bye-rotation apparatus in `teaching/ler565/week6/live/RULES.md`; the pairing tables
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
- **Room codes are two Fair words, not hex** — `FERRIS-NORWAY`,
  `MIDWAY-BRAZIL` — from a curated list with no ambiguous characters. The
  code's real transport is Zoom audio: "ferris norway" survives a bad mic,
  "X7K2QF" doesn't. The format is part of the protocol, so it's decided now.
  The word lists, and the two deliberate exclusions, are under *Naming*.
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

⚖️ **Restructured 2026-08-13 — the qualifying/cup shape, and there is no league
title.** Ryan's question was the right one: *does a league even make sense at
four or five games?* As a **table that awards something**, no — four games
against four of thirty-odd possible opponents produces a ranking the data cannot
support, and hands a trophy on a tiebreak. As **seeding**, yes, and easily: a
seed only has to be roughly right, because week 6 re-tests everyone anyway. So
the weeks qualify and the last session decides.

- **Qualifying** — every weekly match, weeks 1–5 (4 games, 5 if week 1 plays for
  real). Running board and class register. **Awards nothing.** Its output is the
  seeding, and the top seed is recorded in the honours as a fact, not a prize.
- **The Cup** — the last session, and the only title. **Three games each, then
  semi-finals and a final**: five rounds, everyone plays at least three, the top
  four reach the semis. `teaching/ler565/week6/live/bracket.html` already runs a
  round-robin group stage with standings and a seeded knockout; it does not yet
  read the archive.
- ⚖️ **No seeding — cut by Ryan, 2026-08-13, and the reason is the good one.**
  The design had the season's points decide week 6's pairings. He dropped it:
  *"having a class list showing the standings is cool and zero stakes, which is
  good bc even the lowest ranked student can still win the cup."* That is worth
  more than a better-tested semi-final — **the table stops being a verdict the
  moment it decides nothing**, which is exactly what lets it be published in
  full (see *The class table*). Anyone in the room can win the Cup.
- **Pairing is therefore just pairing**: three rounds, drawn rather than seeded.
  The only rule it needs is *don't pair the same two people twice* — which is a
  handful of lines, not a seeding system. Do not rebuild the seeding.
- ⚠️ **Odd numbers need no byes** — Pavilion plays two, three or four, and a
  three-player game scores 3/1/1 for the same nine-point maximum as three
  two-player games. Nobody ever sits out a round, which a chess-style bracket
  cannot say.
- **Gone with the league title**: the Grand Prize and the Double. Recorded here
  so nobody re-adds them wondering where they went.

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

### The Hall of Champions — built 2026-08-13

A trophy cabinet, one cup per cohort, and **the only place on the site where a
student chooses what it says**: Ryan asks the champion which emblem they want
and what line goes under it, and types both into the admin page.

- **The winner is derived, the decoration is stored.** Whoever won the term's
  last Cup game, replayed like every other result — nobody declares a champion,
  including Ryan. The card holds only an emblem id and 140 characters.
- ⚠️ **A card carries the player id it was written for.** If a final is later
  voided and the title moves, somebody else's emblem and quote must not silently
  transfer onto the new champion's cup; the cabinet falls back to a plain
  trophy. Pinned in `test/archive.test.js`.
- **A champion with no card still gets a trophy**, unengraved. The cabinet
  records who won, and must never depend on anyone having filled in a form.
- **Emblems come from `records/isotypes.js`**: twenty-five — the game's five
  disciplines, sixteen lifted from the LER 565 decks (the house rule is to copy
  a pictogram rather than redraw one), and four drawn for the cabinet on
  2026-08-13 at Ryan's request: **cat, hound, husky, terrier**. The three dogs
  are distinguished by the only three things that differ in silhouette — ear,
  tail and leg length — and a profile terrier shows *one* folded ear, which is
  what stopped it reading as a bird. One module, two consumers:
  the admin picker shows the same grid the cabinet renders, so what Ryan clicks
  is what students see.
- ⚖️ **A champion can ask for an emblem that doesn't exist yet** (Ryan,
  2026-08-13) — *"what isotype would you like and we'll create it for you"*. At
  one champion a cohort that is affordable, and it is the most personal thing on
  the site. Draw it, add it to the module with an `em-` prefix, and it appears
  in the picker; the recipe and the silhouette rules are at the top of that
  file. The stored card is only an id, so a bespoke emblem is exactly as durable
  as a built-in one.
- ⚠️ **The deck pictograms paint with `--ink` / `--red` / `--paper`, not
  `currentColor`** — they were drawn for slides, where those are the palette. The
  cup and the admin picker both bind those variables locally; without that, half
  the menu comes out black-and-red on gold instead of engraved.
- ⚠️ **The cabinet falls back to a plain cup for an emblem it doesn't have**, so
  a card saved before the drawing is deployed is unengraved rather than broken.
  A `<use>` pointing at a missing symbol fails silently and would otherwise
  leave an empty bowl with no clue why.
- Seasons without a champion show a **ghosted plinth** — "To be won". Anticipation
  is free and an empty cabinet is not the same as a finished one.

### The Record Book — the archive outlives the term

Every game record carries a `term` key from day one, so records accrue across
*years*, not just weeks: the all-time **highest score**, biggest comeback,
longest win streak — plus a **Hall of Champions** listing every year's Grand
Prize winner, Cup winner, and any Doubles. Future cohorts play against history:
"the all-time record is 94, set in 2026" is the cheapest motivation the league
will ever buy, and the splash screen gets it for free. One field now;
reconstructing term boundaries from timestamps later is exactly the archaeology
this project exists to avoid. Records pages obey the uplifting rule like
everything else — halls and highs, never lows.

### The class table — settled 2026-08-13

⚖️ **One ranked list of the whole class, and that is Ryan's call.** The rule
moved twice in a day — from *top five and everyone else off the page*, through
*top five ranked plus the rest alphabetically*, to this. Both earlier shapes are
gone; don't reintroduce them thinking they were the considered position.

His argument, which is a good one: **a friendly tournament publishes its
standings**, and because every game scores at least a point, the bottom of this
table is *attendance, not ability* — a position you fix by turning up, which is
the nudge he wants. *"I mean in tournaments you have to see the bottom?"*

⚠️ **What did not change, and is not up for quiet erosion**: no award is ever
given for finishing low (the 2026-08-05 wooden-spoon ruling stands), nobody is
ranked in something they have not entered, and the private line still leads with
the distance to the next rung so a position reads as a target.

⚠️ **A student who has never played is listed with dashes and no position.**
That is why `standings()` takes a roster: rows come from the class list, not
from the games. Without it, the one person the attendance argument is about is
the one person missing from the page — and the table would be wrong in **week
0**, before a game exists.

- **The board length survives as a highlight.** "Size N to the class" now marks
  the top N in a full list rather than deciding who appears in a short one.
  `topN` stays in `stats.js`, tested, for screens that still want a short board.
- ~~**"Most improved" sits alongside**~~ — **cut outright** (Ryan, 2026-08-14):
  the query, the card and its tests. The argument for it was that a top with no
  bottom is where the rest of the room can be winning; his call is that the
  league table is enough, and the site reads better with one ranking on it than
  two. `relay/stats.js` records what it was, so nobody re-derives it blind.
- ⚠️ **The one thing worth watching**: a chess Swiss entrant opted in, and a
  graded class did not. Recorded because it is the argument that would matter if
  this ever needs revisiting — not because it was overlooked.
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

## Leagues and the records site — decided 2026-08-13, built at step 6

Scoped with Ryan the day step 5 landed, from the question *"can I keep LER 565
separate from games with my wife?"*. It is written down because **one part of it
has a deadline and the rest doesn't**: the league is the front of the term key
and gets stamped onto every game the moment one is played, so the naming has to
be right before the first real game. The pages can be argued about for months.

**Built 2026-08-13 — the deadline part first**: `splitTerm` in `relay/result.js`,
the stamp in `buildRecord`, the derived pair on `archive.config()`, and the line
in the admin page that reads a saved term key back as *"League ler565 · season
2027-summer"*. It landed against an empty archive, so it cost nothing; the same
change after a term of games would have been a migration.

**Then the site itself, the same day**: `relay/stats.js`, two public read
routes, `records/` (the hub, `records.css`, `records.js`, and `records/ler565/`).
See *What step 6 built* below for the shape of it.

### A league is the front of the term key

`ler565-2027-summer`, `ler565-2028-summer`, `kitchen`. The first segment is the
league; everything after it is the season. That is the whole mechanism.

⚠️ **The failure mode is spaces, and it is silent.** Term keys are slugged, so
`LER 565 2027 Summer` becomes `ler-565-2027-summer` and the league is `ler` —
a real term key, a wrong league, and nothing in the system can tell it wasn't
meant. That is the entire reason the admin page prints the split back at you
instead of just accepting the key; the case is pinned in `test/archive.test.js`
so nobody later "fixes" the split to be cleverer about it.

⚖️ **A first-class league object was designed and deliberately skipped**
(2026-08-13). It would have stored leagues as their own records, each with its
own current term and rosters, with a room learning its league from a
`?c=` link. That machinery only earns its keep when **two leagues record at the
same time** — otherwise the single active term is never ambiguous. Ryan teaches
one class at a time, so it was over-building, and he said so before it was
written. If concurrent classes ever happen, this is the design to reach for and
the reason it was passed over is recorded so it isn't reopened blind.

⚖️ **Stamp the league on the record at write time** (built 2026-08-13), derived
from the term key, rather than parsing the term name on every page load. Same
information; the difference is that a typo'd term key becomes a visible, fixable
field in the admin page instead of a season silently missing from an all-time
table with no clue why. About an hour of care at the start of step 6, and the
cheapest insurance available on the one thing that would be miserable to debug
later.

⚠️ **A game already stamped with the wrong league cannot be retagged** — there
is no tool to move a record between terms, and there deliberately isn't one yet:
with the archive empty, the fix is to correct the term key and delete the demo
games. If a real cohort ever records under a typo'd key, *that* is when to build
the retag, and it is a `put` under a new `sum:` key plus a delete of the old one.

### Seasons are optional, and that is the part easy to get wrong

LER 565 has cohorts, so it has seasons. **You and your wife don't** — that is one
continuous record. Nor does a challenge ladder. So a league is a set of games and
a season is an *optional* subdivision of one. Do not hard-code the assumption
that everything has a year attached; it is a cheap decision now and a rewrite
once three pages assume otherwise.

### The site shape — ESPN, not a dashboard

```text
/pavilion/records/            hub — pick a league
/pavilion/records/ler565/     Standings · Records · Champions, with a season picker
/pavilion/records/kitchen/    the same page, no season picker
```

⚠️ **`/records/ler565/2027` is not available and the reason is the host.** GitHub
Pages serves files that exist and cannot route, so a segment per season means a
folder per season, forever. Losing that level costs nothing: **one small file per
league, made once when the league starts**, with the season as a picker inside
the page — which is what ESPN does anyway (`/nba/standings` with a year selector,
not a URL per year). Short links that survive being read aloud, no build step, no
404-rewrite trick.

**A listed/unlisted flag per league**, so the hub shows LER 565 and not the
kitchen table. Not secrecy — these pages carry names and scores, and the roster
is already public by design (*Identity*) — just not advertised. A league that
should genuinely not be stumbled on gets an unguessable id rather than a
permission system.

### The challenge ladder — students who ask to play outside class

Ryan's idea, and it needs almost no new machinery: head-to-head history is
already in the design, because it is what the pre-game splash shows. A ladder is
that same data pointed at one person. Its roster grows as students join and never
rotates, which is exactly why *Seasons are optional* above matters.

⚠️ **It collides with the uplifting rule, and the fix is the shape not the
data.** *Top five, never a full ranking; no wooden spoon* — but "W–L against
Ryan" is by nature a complete ranking of everyone who has played him, with
somebody at the bottom. So lead with **the instructor's own** record ("14 played,
9 won"), give each student **their own line**, and celebrate biggest upset and
most games played rather than listing all comers worst to best. Same rule as the
public board, applied to a different shape.

### What step 6 built — 2026-08-13

```text
relay/stats.js          every table, record and honour, as pure functions
relay/archive.js        leagues() / leagueGames(), and PUBLIC_ROUTES
records/records.js      the one engine every league page runs
records/records.css     shared house style, the board's palette copied
records/index.html      the hub — hand-written league list
records/ler565/         a league page: a title, an id, and the engine
records/isotypes.js     the emblems a champion can pick, lifted from the decks
relay/seed.js           fill an archive, so there is something to look at
test/stats.test.js      78 checks over the arithmetic
```

```bash
node pavilion/relay/seed.js          # a seeded dev relay on :8787, gone on Ctrl-C
node pavilion/relay/seed.js --live   # real games into the deployed relay
```

⚠️ **Live seeding plays actual games** — two clients, a real room, moves over
the wire — because `/record` is not reachable from outside and there is no way
to write a game without playing it. That is the property worth having, not an
inconvenience. It refuses any term that doesn't look like a trial
(`demo`/`test`/`trial`), because a seeded table is a fiction and a fiction in a
real cohort's record is what this archive exists not to hold.

Five decisions taken while building it, worth not rediscovering:

- **`stats.js` imports nothing at all.** It reads the `league` and `season`
  stamped on each record instead of re-splitting the term key — which is what
  the stamp was for — and that keeps `result.js` and the 17 KB engine out of a
  page that never replays a game.
- **A league page is a stub**: `<body data-league="ler565">`, a heading and a
  `<script src>`. Publishing a new league is copying one file; starting a new
  cohort needs no change to it at all, because the season is a picker.
- ⚖️ **The hand-written list on the hub *is* the listed/unlisted flag.** No
  league object, no `listed` column, no permission system: a league that
  shouldn't be stumbled on is a folder nobody linked. `kitchen` is already in
  the archive and already absent from the hub, which is the feature working.
- ⚠️ **The uplifting rule is a display rule, and the data does not enforce it.**
  The page shows a top five and a *private* line you pick your own name to see;
  but `/records/games` returns the season's games to anyone, so a determined
  student with the console can compute the full order. That is the right trade —
  results are public by design (*Identity*) and the harm the rule addresses is
  social, a visible bottom in a room where everyone knows each other — but it is
  a rule about what the site *shows*, not an access control, and nobody should
  later believe otherwise.
- **The board length comes from `/session`**, so "size N to the class" stays one
  setting in the admin page rather than a constant in a stylesheet. Five is the
  documented fallback when the relay is unreachable.

The page opens on **the class standings, newest season** — during term almost
every visit is "how did we do this week" — and tabs are linkable
(`#standings`, `#records`, `#champions`).

⚖️ **"All time" is offered on Records and nowhere else** (Ryan, 2026-08-13).
Records are *supposed* to reach across years; that is the whole argument for
keeping the archive. A class is not: an all-time class table would be every
student who ever took the course, most of whom never met. So the standings
picker lists seasons only, newest first, and arriving at the standings with
all-time selected falls back to the newest season rather than showing a table of
strangers.

The **Honours** tab is gone, replaced by the **Hall of Champions** (above) —
with seeding cut there is no top seed to record, and a roll of honour listing
one prize was a list of one thing.

Still to build, all of it more queries over `stats.js`: the **instructor live
board**, the **Bulletin**, the **challenge ladder**, and the piece the
restructure left — **wiring the bracket to the archive**, so week 6's results
are not typed into a page while the same games are recording themselves.
(Seeding was the other one, and it is cut — see *League, cup, awards*.) The
**pre-game splash** and **post-game screen** were built 2026-08-14 — see *The
stats screens*.

---

## The stats screens

The sports-broadcast framing, and nearly free once the archive exists — it's all
just queries over stored games.

### Both of them built — 2026-08-14

```text
net.js            fetchLeagueGames() — the season's summaries, failing soft
ui.js             the two screens: renderTape() and renderAftermath()
index.html        #tape in the lobby, #end-after in the result modal
style.css         .tape / .aftermath
```

⚖️ **The splash lives in the lobby**, not on a screen of its own between the
start and the board. Everything asked for below is already true of the lobby:
both players are looking at it, it is brief, the host's **"Start the game" is
the click-to-start**, and no clock has begun because no game has. A screen after
the start would have to be dismissed by each device separately — and a player
still reading theirs while the other has moved is exactly the clock-eating this
section warns about. The card appears when **every seat has picked a name off
the roster**, which is the same condition under which the game records at all.

Four things worth not rediscovering:

- **The archive is the trigger for both screens, and its absence shows nothing.**
  The post-game screen is drawn from the **receipt**, not from the local board,
  and a game this client holds no history for shows nothing rather than a first
  meeting on an empty table. A confident lie is worse than a gap.
- **The finished game is removed by id and put back**, so it makes no
  difference whether the season we are holding was fetched before the game or
  after it. A **rematch never passes the lobby again**, so the cache learns
  about the game that just ended or the next screen shows a stale series —
  which `test/online.test.js` now plays out twice to check.
- **The Cup moves the series but not the table.** A knockout game is in
  `RECORD_MODES` and not in `LEAGUE_MODES`: two people meeting in the final have
  met, and the league table does not move in June. Exhibitions and practice
  games show neither.
- **The scoreline is one "side" per player** — name and number together, with
  the separator as a CSS pseudo-element — because the mirrored marquee form
  (*name score – score name*) wraps at 390px and orphans the second name. A
  phone stacks the same markup into a scoreboard, and a three-player room needs
  that shape anyway.

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
Azee-style and then some: craftspeople fly from agency to crew line, the
passed-over spill and scatter to the gate, and at the week's close the
installation sweep — completed crews' lead hands glide into the pavilion one
gallery at a time while the score ticks up with each placement, the rest
clearing off the table. Beats worth staging: idle craftspeople landing with a
heavier, reluctant thud (the penalty should *feel* like payroll you're
carrying); the First Call token's flip when someone bites; **new arrivals** as a
visible cascade back to the gate; a completed aisle lighting up cell by cell; a
game-ending gallery sweeping across; the opening-day finale with the winner's
pavilion taking the spotlight.

**Period type landed early** (2026-08-13, Ryan inviting stylistic play at the
end of the third playtest) — the one piece of the decoration pass below that
did *not* wait, because it costs nothing. `--display` in `style.css` is a
**stack of installed faces, never an `@import`**: a Mac resolves it to Didot,
the 1890s poster face; Windows falls to Georgia; everything else gets its own
serif. It dresses exactly four moments — the logo, the room code, the month
and Fair-opening splashes, and the winner's line — and nothing functional,
because a board is read at a glance and a serif costs you that. The size floor
is the same lesson the First Call token taught: a Didone's hairlines die small,
so anything under ~30px stays in the UI sans. The page also picks up the tiles'
own grain at `soft-light`, so the cream reads as stock rather than a fill.

### The copy pass over the records site — 2026-08-14

Ryan read the whole site for the first time with real games behind it and cut
almost every sentence on it. The pattern is worth stating once rather than
re-litigating per page: **a heading and a number are the content; prose
explaining them is furniture.** Applied — the hub's lede and its note, the
league page's lede, the standings heading (the tab already says it), the
win-3-draw-2 note, each record's strapline, the all-time note, and the
Champions note. What survived is the `sr-only` table caption, because a screen
reader has no tab or column header to look at, and the caption is where the
scoring explanation now lives.

Also in the same pass: **The class → Standings** (with `#standings`), *Your
line* → **Individual record**, the standings' **Best** column removed (it is a
Record Book question and it is on the player's own card), **Most improved** cut
outright, **Most games played** cut, **Best in Show → Highest score**,
**Longest winning run → Longest win streak**, and the footers reduced to one
link that says **Play a game of Pavilion** — a student on the records page wants
a game, not a CV.

⚠️ **Two new records needed a field that did not exist**: the Record Book
counted completed rows only, so **Most completed columns** and **Most colour
bonuses** meant adding `cols` and `kinds` to the derived result
(`relay/result.js`) — *not* to the tiebreak, which is `rows` and stays §8's.
Games archived before 2026-08-14 have neither field and correctly show no card
rather than a record of zero. It was free because the only games in the archive
were a demo season; after a real term it would have been a migration.

**The trophy cabinet is a decoration-pass job** (Ryan, 2026-08-14): a proper
case with large display type over it — *"Trophy Cabinet"* — rather than a grid
of drawn cups on cream. Filed here with the rest of the Fair imagery below and
deliberately not built yet; the cabinet's *data* is done and the champion's
emblem and line already come off the archive.

The rest of the **Fair imagery is the obvious next seam** (Ryan, 2026-08-12)
and stays deferred to the achievements-and-decoration pass, once the rules
and structure are settled — a pavilion that visibly fills as the board does, the
White City behind it, medals and ribbons on the awards screens, period type
throughout. Recorded here so it isn't lost, not so it
happens now. Two engineering
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
  (best immediate placement, avoids idling workers), not the random test bot, whose
  play is too absurd to teach anyone anything. Practice games record with
  `mode: 'practice'` and count for nothing.
- **The Bulletin — the auto-generated round-up.** A page that rebuilds itself
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

**Pavilion. Chicago, 1893.** The World's Columbian Exposition is months away and
your country's pavilion is empty. Craftspeople have come from everywhere for the
work, two nations are hiring from the same crowd, and every display you raise is
one your rival didn't. The competition is not over the commission — you each
have your own pavilion. **It is over the workforce**, which is the actual lesson,
and at a world's fair it is also historically exact: fairs *were* national
competitions, with judges and medals at the end.

### The test this theme had to pass

Three earlier themes failed, and the reason is worth keeping because it is the
standard any future change must meet.

**The rule (Ryan, 2026-08-12): every term gets a paragraph, read aloud. If the
paragraph needs "because the rules say so", the term is wrong.** Ryan will ask
for the paragraph before agreeing to anything. Write it first.

- **Headcount (staffing/consulting register)** — tiles were people you hire.
  Failed on the mechanic it never mentioned: completing a pattern line places
  **one** tile and discards **r−1**, so finishing a team meant firing
  three-quarters of it, every round, on your *successes*. Also called a cyclic
  Latin square an "org chart", and described the column bonus in terms that were
  flatly false about its own board (rules spec §2).
- **Roles-and-fit / candidates-and-shortlists** — fixed the discard, but could
  not explain why the leftovers in an agency become available to *rivals*, and
  its floor-line story ("you paid for the search anyway") failed to explain the
  move players actually make: taking workers deliberately to deny an opponent.
- **Rivet (1927 Chicago skyscraper)** — got everything above right and died on
  scale: **a five-storey building is not a skyscraper**, and "the game ends when
  someone finishes one floor" is nonsense for a building. A structure with an
  expected size and an expected completion cannot be a 5×5 grid.

**Two things unlocked it.** First (Ryan, 2026-08-12): Azul is a mosaic, and the
tile that goes into the wall is *material*, which stays. Stop trying to put a
person there — what lands on your board is a **finished display**; the crew that
built it moves on. Second: pick a **specific structure**, the way Azul picks the
Royal Palace of Évora — but one with no expected scale. A collection of 25
displays is unremarkable where five floors is a joke, and "ready enough to open"
is a real state a collection can be in.

### The mapping

Every mechanic carries meaning — this is a reskin, not a coat of paint:

| Azul | Pavilion | Why it works |
|---|---|---|
| Tile | **A craftsperson** — one of five disciplines | Art, Science, Machinery, Electricity, Agriculture — see *Tiles* below |
| Bag | **The crowd** | Everyone who came to Chicago for the work |
| Factory display | **An agency** | Sends over a mixed group; you get first pick of one discipline |
| Take all of one colour | — | Engage every sculptor an agency sends. The rest weren't hired, so they're still looking — they go and wait with everyone else |
| Centre pool | **The gate** | Whoever a rival passed over. (Not "the hall" — at a world's fair a hall is a building) |
| First-player marker | **First Call** token | First pick at the gate next week, *at a cost*. Keeps the first-mover idea week 2 already teaches |
| Pattern lines | **The crew for one display** | One discipline each; a half-crewed display doesn't go up and waits |
| Line capacity 1…5 | **Display size** | Small cases near the door take one hand; the great set pieces at the back take five — which is how exhibitions were actually laid out, so the ladder explains itself |
| Phase B | **The displays go up** | The crew finishes, the display stands, and the rest move on to another pavilion |
| The wall | **Your pavilion** | 25 displays. Rows are **galleries**, columns are **aisles** |
| Adjacency | **Exhibits that sit together** | A collection reads as one thing or as scattered pieces — which is genuinely what curation is |
| Floor line | **Idle** | Engaged with nowhere to put them. Costs you, and more each one |
| Bag refill from lid | **New arrivals** | More craftspeople still reaching the city |
| Game end | **Opening day** | First pavilion with a gallery complete opens its doors; the Fair opens and the judges make their round |

Two of those pay for the whole theme:

- **The r−1 discard** stops being the worst-explained thing on the board. The
  crew finished; they go on to the next pavilion. It also makes the lid-to-bag
  refill automatic, with no invented excuse.
- **Idle** is the move players actually make. Engaging craftspeople you can't use
  purely to keep them off a rival's site is labour hoarding, and it is the most
  discussable thing on the board.

The pavilion is a Latin square, so the bonuses land cleanly — **and all three of
these are true of the actual board**, unlike the first theme's:

- **Gallery** (+2) — a row filled end to end.
- **Aisle** (+7) — a clear sightline from the door to the back wall.
- **All five of a discipline** (+10) — that discipline represented throughout.

⚠️ Rows and columns **cannot** be distinguished by discipline mix — every column
holds all five, exactly as every row does (rules spec §2). Distinguish them
*physically* or not at all.

### The register

**1893 Chicago, and no grimness.** The Fair's uglier history — the Midway's
ethnographic villages, the exclusion that prompted Wells and Douglass — is real
and explicitly **out of scope** (Ryan, 2026-08-12): this is a fun game. The
period supplies the White City, the electricity, the craft trades and the race
to opening day, and nothing else. One practical consequence: room-code words come
from the **national pavilions**, never the Midway villages.

**Rounds are construction months** (Ryan, playtest 2026-08-13 — they read as
weeks, W1/W2/W3, before that). The counter reads Month 1, Month 2…, each month
opens with a big **Construction Month N** splash in the logo colours, and
Phase B's splash is **Craftspeople build the displays**. A timeout still reads
"out of time".

**Theme the names and the art, never the rules.** Base Azul mechanics stay
exactly as they are — same tile counts, same scoring, same 5/7/9 agencies. The
rules are correct because thousands of people have debugged them, and Azee stays
a usable fallback only while the games are identical.

**Identifiers are theme-neutral, and now they are — done 2026-08-12.** The
theme has moved three times; the wire protocol and the archived game record
carried the first one's words. They are `source` / `pool` / `line` / `floor` /
`kind` — not Pavilion's words either, so the theme can move a fourth time
without touching a stored game. Free while the archive was empty; a migration
afterwards. Rules spec §10 has the table.

### The opening copy

**Rewritten at the second playtest (Ryan, 2026-08-13), superseding the earlier
two-sentences-no-rules rule** — the front door now carries the full pitch, in
Ryan's own copy:

> # Pavilion — the logo in the tile palette, two letters per colour
> ### Hire your craftspeople. Build your exhibit. Bring glory to your country!
>
> **Chicago. 1893.** Visitors flock from across the globe to witness the grand
> opening of the pavilions of the World's Fair. Countries hire the finest
> craftspeople in the city to build exhibits showcasing their country's
> achievements in art, science, machinery, electricity, and agriculture. Will
> your pavilion stand above the rest, etching itself into history as the finest
> in the world, or will it be forgotten? Your chance at World's Fair glory
> awaits!

The fifth discipline is **Agriculture** (Ryan, 2026-08-13, renamed from Nature
to match this pitch; the paragraph test was explicitly waived — his call to
make). Historically exact anyway: the Fair had an Agriculture Building, not a
Nature one. The tree icon and the `--nat`/`ic-nat`/`k4` identifiers stay — the
icon was chosen for its silhouette, and identifiers never chase the theme.

The longer pitch below is **not** interface copy. It is the reference the
tutorial and the rules are written against, and it is here because it is the
paragraph the theme was tested on:

> Chicago, 1893. The World's Fair is months away and your country's pavilion is
> empty. Craftspeople have come from everywhere for the work — engage every
> sculptor an agency sends and the rest wait with everyone else, where a rival
> nation can take them. Each display needs a crew of a single discipline: a small
> case near the door takes one hand, the great set pieces at the back take five.
> Get the crew together and the display goes up. Exhibits that sit together are
> worth more than exhibits standing alone — a gallery filled end to end, a clear
> sightline from the door to the back wall. Anyone you engage and don't need is
> idle on your payroll.

### Naming

**Pavilion** — one evocative noun for the thing you build, the way *Azul* is one
word. It also settles the naming problem: not Azul (Plan B Games' name and art;
the mechanics themselves aren't copyrightable), and not Azee, which is
mattle.online's name rather than ours. URL: **ryanlamare.com/pavilion**.

Considered and passed over: **The Columbian** (the Fair's actual name),
**Court of Honor** (prettiest, two words), **White City** (the most evocative
name available and ambiguous read cold in a 2026 classroom), and — from the
abandoned 1927 theme — *Rivet*, *High Steel*, *Topping Out*.

**Room codes are two Fair words.** Icon plus national pavilion:
`FERRIS-NORWAY`, `MIDWAY-BRAZIL`, `TESLA-CEYLON`. The code's real transport is
Zoom audio, so everything on the list has to survive a bad mic and needs no
spelling out.

- **Icons** — FERRIS · MIDWAY · WHITECITY · PERISTYLE · LAGOON · REPUBLIC ·
  GOLDENDOOR · WOODEDISLE · JACKSONPARK · BURNHAM · OLMSTED · TESLA · EDISON ·
  CRACKERJACK · BLUERIBBON · SHREDDEDWHEAT
- **Pavilions** — JAPAN · NORWAY · GERMANY · FRANCE · BRAZIL · SWEDEN · SPAIN ·
  CEYLON · TURKEY · IRELAND · CANADA · ITALY · GREECE · DENMARK · SIAM · MEXICO

⚠️ Two exclusions, both deliberate. **Nothing from the Midway villages** (see
*The register*). And **none of the five discipline names** — a room called
`MACHINERY-something` beside a Machinery tile is a needless collision.

### Tiles — colour plus isotype, never text

**No words on tiles.** Each discipline is a flat background colour carrying a
single isotype-style pictogram: solid silhouette, no outline, no interior detail,
no strokes. Squares of text would read as a spreadsheet; this reads as a game.

The whole set was drawn and judged at true playing size on a specimen plate
(2026-08-12) rather than argued about in prose — which is the right method here,
because every failure below was invisible at large size and obvious at 40px.

| Discipline | Colour | Isotype | Silhouette class |
|---|---|---|---|
| Art | **Sienna** `#8E3E28` | Palette | Round, with a bite |
| Science | **Water blue** `#37658A` | Erlenmeyer flask | Narrow neck over a wide base |
| Machinery | **Arntz black** `#1B1C19` | Two meshed cogs | Wide diagonal double-lobe |
| Electricity | **Mustard ochre** `#C9A227` | Lightning bolt | Angular zigzag |
| Agriculture | **Lifted green** `#3C8B51` | Tree | Bulbous canopy on a narrow trunk |

**Colours come from the site's own `brand.css`**, which is already an Arntz
palette sampled off his pictograms — so the game and the decks share one system,
and the period is inherited rather than invented. Only Agriculture's green is
adjusted; see below. (The discipline was called Nature until 2026-08-13 —
older prose in this section keeps that name where it records the colour
decisions as they were made.)

Decisions inside that table worth keeping:

**The five silhouettes are deliberately different in *shape*, not just subject.**
At tile size the subject is invisible and only the outline reads. Rejected on
that basis alone, each of them handsome at poster size: a **paintbrush** for Art
(a thin diagonal stick — the bolt's shape class, and too fine to survive), a
**bulb** for Electricity (a circle, next to a cog), an **atom** for Machinery
(drawn almost entirely in line, which is the one form the rule exists against —
three orbits blur to a grey disc), and a **bust** for Art (the flask's silhouette
exactly).

**Two cogs rather than one, and that is what lets the palette in.** A single cog
is a circle and blocks every other round icon. Two meshed cogs make a wide
diagonal double-lobe, which vacates the round class — so the palette becomes the
only circle on the board. The two choices only work as a pair.

**The tree is the strongest icon in the set** (Ryan's wife, 2026-08-12), because
it is the exact *inversion* of the flask: bulbous top on a narrow stem against
narrow top on a wide base. Two shapes cannot be further apart, and it holds even
with colour removed entirely. It replaced a fern and Arntz's own corn, both of
which were tapered verticals like the flask.

**Arntz's corn taught the general lesson even though it wasn't used.** His sign
GMDH02_00016 is an ear built from a grid of kernels between two long husk leaves.
At 40px the kernels close up and the ear goes solid — and it *still reads*,
because the leaves were carrying it. Detail nobody receives is detail not worth
drawing. Going to Arntz at all is not borrowing a look: he is the Isotype system
this spec's "isotype-style" language already referred to.

**⚖️ The red–green rule, corrected.** This memo used to say flatly "teal, never
green". That is the rule stated too bluntly, and it cost the theme its best
Nature colour. The real problem is **red against green at the same lightness**;
red–green deficiency leaves the blue–yellow axis intact, which is why sienna
against blue is fine even though the two are close in tone. So green is available
**provided it is clearly lighter than the sienna**. Arntz's own `#26713D` is not
— it sits almost exactly on it. Lifting to `#3C8B51` keeps the family and opens
the gap to roughly 2:1.

Which is the real argument for the isotypes: **the pictogram is the accessibility
layer, not decoration.** Colour alone would fail those students outright. Colour
*and* shape means a tile is identifiable either way, and the board still works in
greyscale.

**Tiles are textured** (Ryan, 2026-08-12) — one tiled noise field painted *under*
the isotype, so it ages the ground without touching the silhouette. Built as a
single repeated image, never a per-tile filter: a live filter is paid for on
every frame of every animation, and this board animates constantly.

Practically: an inline `<svg style="display:none">` sprite referenced by
`<use href="#id">`, exactly the pattern the decks already use. Flat solid fills
survive being scaled down; anything with strokes or interior detail turns to mush
at 40px. Knockouts are painted in `var(--t-bg)`, the tile's own background.

#### The inverted set — a documented alternate, not a discard

Paper tiles carrying coloured pictograms, which is what Arntz actually drew
(coloured figures on cream, never white figures on colour). Ryan's favourite of
everything on the plate, and parked for a specific reason rather than a vague
one.

```
--t-bg: #F0EAD9 for all five, with a 1.5px inset border in the discipline colour
Art #8E3E28 · Science #37658A · Machinery #1B1C19 · Electricity #977712 · Nature #2E7A43
```

**Why it's parked: a filled tile ghosts to a tint; an inverted tile ghosts to
nothing.** Unbuilt pavilion cells show the real colour dropped to ~30% opacity
(punch-list item 3). Drop opacity on a colour *field* and you still have colour —
paler, obviously unbuilt, still saying *Science goes here*. Drop it on an
*outline* and there was never a field to fade. Twenty-five cells start unbuilt
and fill over five or six weeks, so **the ghost is this board's default
appearance, not its exception.** Electricity and Nature also have to be darkened
to hold contrast on cream, which drifts the palette off `brand.css`.

Switching is four CSS lines and no new art, so it stays live.

### The First Call token

⚖️ **A chamfered plate, a double keyline, and a Clarendon numeral 1**, ink on
`--paper` cream. It must read as *unmistakably not a tile* — that requirement is
older than this theme and survives it.

- **The chamfer is doing the work, not the ornament.** Every tile is a rounded
  square; an octagon is a different object before you've read anything on it.
- **Clarendon rather than Didone.** Didone is the more elegant 1890s answer and
  its whole character is a hairline foot serif — the first thing to go at the
  ~22px the token shrinks to on an idle row. That is the atom's failure in a
  different costume. Clarendon's slabs are thick strokes and hold all the way
  down. Engine-turned guilloche behind the numeral is available and also holds;
  at small size it stops being rings and becomes texture.
- **A ribboned medal was considered and rejected** — the prettiest option and the
  most on-theme, but it is a filled shape on a coloured ground, which is what a
  tile *is*. Keep it for the awards screen, where that is exactly right.
- Ornament earns its place here for the opposite reason it doesn't on the tiles:
  the token is one object seen once a week, not twenty-five seen at a glance.

### Award names

Fair names, which the theme earns:

- ~~**Grand Prize** — league winner~~ and ~~**The Double**~~ — **cut
  2026-08-13** when the league stopped awarding a title (see *League, cup,
  awards*). The season's honour is now **top seed**, printed as a fact.
- **The Cup** — the last session's tournament, and the only title
- ~~**Best in Show**~~ — **retired 2026-08-14** in favour of plain **Highest
  score**: the name read as something a judge awards, when the record is just
  the biggest number anyone has scored. The Record Book's other titles went the
  same way — plain English, and no strapline under any of them.
- **Turnaround** — best comeback from behind
- ~~**Most Improved**~~ — cut 2026-08-14; see *The class table*.

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
plus icons in `pavilion/` let a student "Add to Home Screen", where the game
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
format is `pavilion/relay/PROTOCOL.md`; how to run it is
`pavilion/relay/README.md`. Three things are worth having in this memo rather
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

## The backend spine — built 2026-08-13 (build step 5)

Results now record themselves. Everything below is in `relay/` and `admin/`, and
the wire format grew three backward-compatible additions rather than changing
(`relay/PROTOCOL.md`, v1.1). The parts worth having here rather than only in
those files:

**The relay still never runs the engine *during play*.** That line is intact and
still the reason two relays can be one `room.js`. What changed is that once a
game is *over*, the archive replays `seed + move list` through the same
`engine.js` the clients ran and reads the winner off the final state
(`relay/result.js`). Those are different jobs, and only the second one needs the
engine.

**Nobody reports a result, including the instructor.** A client's `over` message
is advisory from here on and its claimed scores are discarded. Faking a result
means fabricating a legal move sequence that your opponent's client
independently corroborated — a two-person conspiracy, in a class of fourteen.
Better still, the failure mode is honest: a claim the move list doesn't support
is archived as **void with the reason kept**, because a game that can't be
reproduced is a bug report and not a result.

**Identity is one click and no account.** With a term and a class list
configured, the setup screen replaces the name box with the roster and you tap
your name; the device remembers, so from week two it is *"Welcome back, Sam —
not Sam?"*. The security model is unchanged and unapologetic: **the security is
that you can see them.** The one thing the form now refuses is submitting
without picking, because a game played anonymously would silently not record —
the worst possible version of automatic results.

**Two rules decide what gets archived, and they are strict on purpose.** A game
records only if a term is configured *and* every seat matches a roster entry.
Everything else — a rehearsal against the bot, two strangers who found the URL,
anyone who typed a name — plays identically and simply doesn't record. The game
carries no course branding and is meant to be usable elsewhere, so the archive
has to equal the course's record rather than the relay's traffic.

**One thing is derived rather than asked for.** A room can request `league` or
`cup`; **exhibition** is never requested, because an instructor on the roster
sitting at the table is what makes a game an exhibition. That is one fewer thing
to remember before a demo match, and forgetting it was the likeliest way for a
week-1 demo to pollute the league.

**The instructor page does four things and no more** (`/pavilion/admin/`, behind
one secret): set the term, paste the class list, look at what recorded, and
correct the two things only a person can judge — a week 6 game that should be
tagged **cup**, and a game the wifi rather than the player ruined, which is
**void**. Void is the last resort, never the default (§11), and un-voiding
re-derives from the move list rather than restoring the old numbers.

**Deleting is not voiding, and both exist.** A **voided** game happened and
should not count — it stays in the archive, and the instructor can restore it,
which re-derives from the moves. A **deleted** game should never have been in
the archive at all: a demo run, a test, a room two people opened by accident. It
goes, moves and all. A whole term can go the same way, class list included, and
the API refuses unless the caller names the term twice — a misclick must not be
able to delete a cohort. There is no undo and no backup, which the page says.

### Cohorts — how the archive spans years

**The term key is the partition, and it is the only one.** Every record carries
the term it was played under, `sum:` keys are per-term, and the archive can
enumerate every term it has ever seen. So a league table is one term's
summaries; the **Record Book** and the **Hall of Champions** are all of them
merged. That is why the term went in on day one — reconstructing cohort
boundaries from timestamps later is exactly the archaeology this project exists
to avoid.

⚠️ **Which is why term keys are named `<league>-<season>`** — `ler565-2027-summer`,
`kitchen`. The first segment is the league and is what separates a class's tables
from a kitchen-table rivalry; see *Leagues and the records site* above for the
whole shape and for why a first-class league object was skipped. This naming is
the one part of step 6 with a deadline, because it is stamped on every game the
moment it is played.

⚖️ **The roster is per term; player ids are not** (2026-08-13). Those pull in
opposite directions on purpose:

- Each cohort keeps **its own class list**, so 2027 does not paste over 2026 and
  *"who was in the 2026 class"* stays answerable in 2031. A single global roster
  shipped for one day and was replaced before any real term existed — free then,
  a migration afterwards, exactly the argument rules spec §10 makes.
- An id is still a **bare slug of the name**, unscoped. Across cohorts the same
  name means the same person, which is what makes an all-time record book
  possible at all and what lets a student who takes the course twice keep one
  history. ⚠️ The cost: two *different* people sharing a name in different years
  would merge in all-time records. In a class of 14 to 36 that is a small risk
  against a large gain, and it can never touch a term's own table, which reads
  one term's summaries where the roster already made every id unique.

**Records are self-contained**, which is what makes any of this survive. Each
stored game carries the roster ids *and* the display names *and* the full move
list, so a 2026 game is still readable, replayable and attributable in 2031 with
every roster since replaced.

Two smaller decisions worth not rediscovering:

- **A player's id is a slug of their name**, so re-pasting the same roster is
  free and keeps every game attached. ⚠️ *Renaming* somebody starts them a fresh
  history — fix spellings before week 1. The admin page says so in red.
- **The archive's routes live in one table** (`relay/archive.js`), dispatched by
  both the Worker and the laptop relay, exactly as `room.js` is one state
  machine for both. The Worker allow-lists which of them are reachable from
  outside, which is what keeps `/record` — the route that writes a game —
  callable only by a finished room. A prefix strip there instead of an
  allow-list would have published it and made the whole archive forgeable.

⚠️ **The Worker needs two one-off commands before any of this is live**:
`npx wrangler deploy` (ships the second Durable Object, migration v2) and
`npx wrangler secret put ADMIN_SECRET`. Until the secret is set the admin page
is closed and every game records nothing, which is a safe default rather than a
broken one. `relay/README.md` has the sequence.

**Both were done by 2026-08-13**, and the Worker was redeployed the same day
with the league stamp and the records routes.

**The live archive holds a demo season as of 2026-08-14**: term
`ler565-2026-demo`, fifteen invented students plus Ryan as instructor, and 41
real games played into it by `seed.js --live`. It shows up on the LER 565 page as
season *"Demo 2026"* and **Delete a term** removes the lot in one click. It is
there to be looked at, not kept.

⚠️ **The real cohort's roster is still Ryan's to paste, before week 1**, and it
cannot be invented: the roster **is** the login (*Identity*), a player's id is a
slug of their name, and ids are unscoped so a fake person entered now is
permanent. A demo term takes made-up names precisely because it gets deleted.

⚠️ **Do not read a term key without a dash as harmless.** `demo` on its own is a
*league* called demo with no season — games record, and both in-game stats
screens work, but there is no page to see them on, because the records hub's
hand-written list is the whole listed/unlisted mechanism. The league and season
are stamped at write time, so games played under the wrong key stay there; fix
the key before playing, not after.

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
2. **Crew lines must align with the pavilion**: identical cell size and
   row-for-row alignment, so you can see exactly which gallery each crew
   fills at the close.
3. **Colour and tile-design pass.** Unbuilt pavilion cells should be
   *exactly* the same colour as the real tiles, made obviously unfilled by
   opacity — while claimable tiles in the market carry a large border. Colour
   becomes the primary way you read what's filled, what's claimable, and
   what's still open.
4. **First Call token needs to be unmistakably not a tile**: a black "1" on
   a white background, borderless. (The no-words rule is for tiles; the
   token is the one legitimate glyph, as in Azul itself.)
5. **Desktop boards bigger** — there's plenty of blank space; use it.
6. **Phone: one screen, no sideways scrolling.** Agencies wrap (roughly
   3 + 2), then the open market, then your board — all visible together —
   with the opponent's collapsed board below the fold.

Ryan's second look (2026-08-06), also applied: agencies carry **no visible
name** (the names survive in screen-reader labels and move announcements);
the Bag/Lid chips became a single pool chip, with discards flying to an
invisible off-screen drain and the refill restocking the pool chip; the
start-of-week deal slowed further (it should read as an event, not a
shuffle); and the red HIRING tag came off the active board (the border and
topbar already say it). The register decision in the same pass — *performance
review*, *recruitment cycle complete* — belonged to the old theme and is
superseded; see *Theme*.

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

**Four wording faults.** ⚠️ Items 3–5 are recorded as history: they fixed the
*old* theme's copy, and the theme rebuild later the same day superseded all
three. The reasoning still holds — jargon reads as jargon, and the setup screen
carries the pitch — but the strings named below are not the current ones. See
*Theme*.

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

## The copy-and-art pass — 2026-08-12

The job the theme rebuild left behind: the specs were ahead of the code, and
this closed the gap. Three separable things happened, and they are worth
keeping apart because only the first is expensive to redo.

**1. The identifiers went theme-neutral** (rules spec §10, which now carries the
table). `kind` / `source` / `pool` / `line` / `floor` through the engine, the
bot, `relay/room.js`'s shape check, the wire format and all four test suites.
`engine.js` no longer knows the five disciplines are called anything —
`FUNCTION_NAMES` is gone and `ui.js` holds the names. The state hash is
unchanged, because `serialize()` writes values in a fixed order and never field
names, so nothing about determinism moved.

**Two identifiers deliberately did not move**: the deployed Worker's host name
(`headcount-relay.rlamare.workers.dev`) and its `HeadcountRoom` Durable Object
class. Renaming the Worker mints a second one at a second URL; renaming the DO
class needs a `renamed_classes` migration against a relay with live rooms behind
it. Both are plumbing, both are commented as such, and the theme was never
supposed to reach them.

**2. The copy.** Every player-facing string is Pavilion's now, in one file.
Rounds read **W1, W2…**; Phase B is **the displays go up**; the centre is **the
gate**; the floor line is **idle**; a pattern line is **the crew for gallery N**;
the end screen is **opening day** and counts *galleries · aisles · disciplines*.
The final table's columns are **Pavilion · Complete · Play · Bonus · Total**.

Two names needed the paragraph test, so here they are:

> **The Commissioner** (the practice bot). Every nation sent a commissioner to
> Chicago to see its pavilion built. Yours is across the way, hiring from the
> same crowd, and they have done this before.

> **The agencies are Chicago streets** — Clark, Halsted, Canal, State, Wabash,
> Archer, Milwaukee, Blue Island, Ashland. Agencies carry no visible name on the
> board (2026-08-06), so this is only ever heard: "Sam engages 2 Machinery from
> the Halsted Street agency." Streets keep it local and collide with nothing —
> not a room code (landmark + national pavilion) and not a discipline.

**3. The art**, which is the part that shows. All five isotypes were redrawn to
the *Tiles* section above and judged on a specimen plate at 120 / 46 / 24 px and
in greyscale, because every failure the theme rebuild found was invisible large
and obvious small. Two things changed at that plate and nowhere else: the
palette's bite was recut (the first knockout left a filled sliver at the top
right, which read as a corner rather than a bite), and Machinery's two cogs sit
on the viewBox diagonal, so the shared 62% icon box gave a visibly smaller mark
than the other four — it is 72% now. Nudges, not redraws.

Also shipped: the tiled grain, painted under the isotype as **one repeated
image** and never a live filter; the First Call token as a single symbol
(chamfered plate, double keyline, slab-serif 1, ink on cream), which replaces a
white disc that was one CSS tweak away from looking like a tile; the PWA icons
regenerated as a 2×2 of the real tiles; and a five-tile legend on the setup
screen, naming the disciplines once on the way in. ⚠️ That legend was
**removed at the third playtest** (2026-08-13) — the disciplines are now named
only in aria labels and move announcements.

**The palette is `brand.css`'s, copied rather than linked.** `brand.css` also
`@import`s two webfonts, and a phone in a breakout room should not wait on
Google Fonts to see a board. Values only, so they need keeping in step by hand.
Period *type* stays deferred to the decoration pass along with the rest of the
Fair imagery.

**One bug found on the way**, unrelated to the theme and older than it: the
CSS reset zeroes every margin, which includes the `margin: auto` a `<dialog>`
centres itself with, so the end-of-game modal had been opening in the top-left
corner. One line.

**Checked**: all four suites (engine soak 3000 games, bot, relay protocol,
and `online.test.js`'s real-browser two-device game with a mid-game disconnect),
`?smoke=1`, `?uitest=setup`, and `?smoke=1&layout=1` at 1440 / 820 / 500.
Headless Chrome clamps its window to 500px wide, so anything narrower than that
is a screenshot crop rather than a layout — don't read a phone bug into it.

## From the second playtest (2026-08-13)

Ryan's list of fifteen, all applied the same day, all in the copy layer
(`ui.js` / `index.html` / `style.css`) — the engine, the wire format and the
tests below the UI didn't move. The ones that changed standing decisions:

- **The front door carries the full pitch now** — see *The opening copy*,
  which this superseded. The logo is the tile palette two letters at a time
  (Machinery's black skipped: it reads as plain ink and breaks the pattern),
  the tagline is *Hire your craftspeople. Build your exhibit. Bring glory to
  your country!*, and the discipline legend is five equal grid columns so
  ELECTRICITY's label can't shove the tiles off an even rhythm.
- **Training Ground is now "Rehearsal" on the setup screen** — "a rehearsal
  match … before the Fair begins." The memo's older sections keep the old
  name as history; the bot is still the Commissioner.
- **Rounds are construction months** — see *The register*.
- **The month splashes mirror the logo**: big type on the card cream, words
  cycling the four logo colours — `Construction Month N`, `Craftspeople build
  the displays`, and at the end `The World's Fair is Open!` in place of
  "Opening day". The end modal's kicker is **Judging the Pavilions**, and the
  winner's line is *"[name] has built the most prestigious pavilion in the
  world!"* with the name in the house red.
- **The scoring table de-themes on purpose**: the breakdown reads
  *rows · columns · colors* (not galleries · aisles · disciplines) under
  headers **Pavilion · Bonuses · Score · Bonus · Total**, and the button home
  is just **Home**. At the moment of scoring Ryan wants plain board words;
  gameplay copy keeps the themed ones.
- **Less chrome**: the kicker is gone entirely — first "Chicago, 1893", then
  in the same pass "LER 565" itself, so the game stands alone for use outside
  the course. The online-mode explainer, the visible "The gate" label and its
  empty-state line are gone too (the gate survives in aria labels and move
  announcements). The pool chip says **Craftspeople**, and the turn line reads
  "[name] is hiring craftspeople".
- **Clocks are 5:00 (default) or unlimited** — the 3:00 and 10:00 options cut.
- **Raised displays carry a 2px ink frame** in the pavilion, so built vs
  ghost reads at a glance (a ring, not a border — punch #3 still reserves the
  heavy coloured border for hireable tiles).
- **One real bug**: at every month's start the agencies rendered filled,
  *then* the deal animation hid and flew the tiles in — so you saw the spread
  before it "arrived". `hideDealTiles()` now hides them before the month
  splash, and the deal unhides them as they land.

## From the third playtest (2026-08-13)

Same day, after playing the second pass. Copy layer again, plus two real
bugs. The decisions worth keeping:

- **The front door is quieter.** The five-tile discipline legend came off
  entirely — the disciplines are named in the aria labels and the move
  announcements — and instead **the pitch names them in their own colours**,
  which is the same legend for no space at all, since the words were already
  in the sentence. They are bolded *and* underlined as well as coloured: the
  tiles' own rule (never colour by itself) applies to the copy too, and the
  underline is thicker and further off the baseline than a link's so the five
  don't read as navigation.
- **The logo is `PA·VI·LI·ON`, four even pairs, and Machinery's black sits it
  out**: sienna, blue, ochre, green. ⚠️ The uneven `PA·V·IL·I·ON` split was
  tried — it is the only arrangement of eight letters that carries all five
  disciplines — and **rejected**: at title size the black pair dominates the
  word (Ryan, 2026-08-13). Don't re-propose it as the "complete" option; the
  black is on the tiles and in the pitch, and that is enough. Electricity's
  ochre is a *field* colour on a tile rather than ink and sits near 2:1 on
  cream, but two letters at 54px carry it; only the 14px prose darkens, to
  the inverted set's already-documented `#977712`.
- The pitch splits into two paragraphs at *"Will your pavilion stand above
  the rest"*, and the CTA reads **Start the competition**.
- **The seed box is gone.** Nobody outside the tests ever wanted to type one,
  and "blank for a fresh crowd" was explaining a control that had no
  audience. `startGame` still takes a seed; the smoke tests and rematch pass
  it directly.
- **The month number gets its own line**, larger than the words above it —
  it wrapped that way by accident at some widths and Ryan preferred it, so it
  is explicit now rather than left to the banner's width.
- **The Fair-opening splash is the one on ink.** Black ground, palette lifted
  to tints that hold against it. The end of the game should look different
  from the start of a month before a word is read.
- **The end screen loses its explanation.** A natural win needs no "a pavilion
  opened its doors in month N" under the headline; the two endings that *are*
  surprising (timeout, shared win) keep theirs. The table's first column is
  **Player**, not Pavilion. Rematch is blue, Home is gold — the red stays the
  front door's alone.
- **The record buttons are behind `?dev=1`.** "Who can even open json?" is
  the right question for a player-facing button. The memo's testing rule
  still wants `seed + move list` for any bug report, so the capability
  survives rather than being deleted, and build step 5's server writes the
  archive from the same move list regardless. The topbar's **New** is **End**.

**A third bug, in the copy's own CSS.** The coloured disciplines came out ink
black — every one but Electricity, which showed. The `.sub b` rule that bolds
*"Chicago. 1893."* is specificity 0-1-1 and a lone `.pv0` is 0-1-0, so the
palette lost every time; Electricity's own two-class override was the one rule
that outranked it, which is exactly why it alone looked right. `.sub
b:not([class])` now leaves the classed spans alone. Worth remembering as a
shape: a bare element-plus-class rule quietly beats the utility classes it
shares a container with, and the symptom is *one* item mysteriously working.

**Two bugs, both in the phase label's lifecycle.** `renderAll` only writes the
phase label when the game is over, so a rematch opened under the previous
game's "The World's Fair is open" — it now says **Construction begins** until
the first move clears it. And `banner()` toggled its splash class rather than
replacing it, so a finale's black ground could leak onto the next plain
banner; it assigns `className` outright now.

## Build order

**`PAVILION-RULES.md` is the engine spec** — the complete rules stated
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
5. **Backend, identity, results, admin.** Instructor auth is one secret; roster
   and term setup is a one-page admin screen. Done 2026-08-13 — see *The
   backend spine* above. The leaderboard moved to step 6, where it belongs: it
   is a query over the archive, and the archive had to exist first.
6. **The league table, stats screens, Record Book, Hall of Champions, The
   Bulletin, instructor board.** All queries over stored games; nothing about
   the engine, the wire format or the archive has to change for any of them.
   **Underway since 2026-08-13** — the stamp, `relay/stats.js`, the public read
   routes, the records site and (2026-08-14) the pre-game splash and post-game
   screen are in; the instructor board, Bulletin and ladder are not. *What step
   6 built* and *The stats screens* have the detail.
   The site structure they hang off — leagues, seasons, the records hub, the
   challenge ladder — was scoped on 2026-08-13 and is under *Leagues and the
   records site* above. Read it first. Its one deadline piece is **done**: the
   league and season are stamped on every record at write time, so the pages can
   read a field rather than re-parsing a term key, and they can be argued about
   for as long as they need to be.

### Testing

- **Two bots, two jobs.** The **random** bot is the test fixture: it idles
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
  deploy` from `pavilion/relay/` and wired into `PRODUCTION_RELAY` in
  `pavilion/net.js`. The free plan carried the Durable Object without
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
  (`PAVILION-RULES.md` §8).
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

`teaching/ler565/week6/live/RULES.md` already treats "Azee is down" as a scenario. If *ours*
breaks during a graded tournament that's our fault and we need somewhere to go.
Don't burn the bridge until it has survived a term.

Accessibility isn't optional: the decks carry `sr-only` transcripts, and a
playable game needs keyboard control and screen-reader-legible state to hold the
same line. Design it in rather than bolting it on.
