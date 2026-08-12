# Rivet — engine specification

The complete rules, stated precisely enough to implement without guessing.
Companion to `RIVET.md`, which holds the design decisions and the why; this
file holds only *what the engine must do*.

Mechanically this is base Azul, unchanged. That is deliberate: the rules are
correct because thousands of people have debugged them, and Azee stays a usable
fallback only while the games are identical. **Theme the names and the art,
never the rules.**

Two conventions used throughout:

- 📕 **Rulebook.** Azul's actual rule. Do not deviate.
- ⚖️ **Our ruling.** A genuine ambiguity or a case the rulebook leaves open,
  resolved here so the engine is deterministic. Flagged so a future reader knows
  it was a choice, not a quotation.

Vocabulary: the Rivet name first, the Azul name in brackets where they differ.
Both appear because the rulebook and every online reference use the Azul terms.

> ⚠️ **The code has not caught up yet.** The engine, the wire protocol and the
> UI still use the previous theme's identifiers (`agency`, `team`, `bench`) and
> the previous name. This file is the target; the copy-and-code pass that
> reconciles them is the next build step. See *Identifiers* in §10.

---

## 1. Components

| Thing | Count | Notes |
|---|---|---|
| Workers [tiles] | **100** | 20 each of 5 trades |
| Trades [colours] | 5 | Ironwork, Masonry, Carpentry, Electrical, Plumbing |
| Agencies [factory displays] | **2n+1** | 5 at 2 players, 7 at 3, 9 at 4 |
| First Call token [first player marker] | 1 | |
| Player board | 1 each | Crew lines, tower, idle row |
| Bag, lid [discard] | 1 each | |

Each player board has:

- **Crew lines** [pattern lines] — 5 rows of capacity **1, 2, 3, 4, 5** (row *r*,
  1-indexed, holds *r* workers). One line per floor of the tower, the smallest
  at the top. Filled **right to left**; the rightmost space sits against the
  tower.
- **Tower** [wall] — 5×5 grid, one fixed trade per cell (§2). Each cell is one
  **job**; each row is one **floor**.
- **Idle** [floor line] — 7 spaces with penalties
  **−1, −1, −2, −2, −2, −3, −3**, filled left to right. Workers hired with no
  job to put them on.

## 2. The tower is a cyclic Latin square

Trade *f* (index 0–4) belongs in floor *r* (index 0–4) at column:

```
column = (f + r) mod 5
```

Which gives, with trades indexed Ironwork 0, Masonry 1, Carpentry 2,
Electrical 3, Plumbing 4:

| | c0 | c1 | c2 | c3 | c4 |
|---|---|---|---|---|---|
| **r0** | Iron | Mas | Carp | Elec | Plum |
| **r1** | Plum | Iron | Mas | Carp | Elec |
| **r2** | Elec | Plum | Iron | Mas | Carp |
| **r3** | Carp | Elec | Plum | Iron | Mas |
| **r4** | Mas | Carp | Elec | Plum | Iron |

Every trade appears exactly once per row and once per column. **Do not
hardcode this table** — derive it from the formula, or a transcription slip
becomes a scoring bug that only shows up in one cell.

> ⚠️ **Correction, 2026-08-12.** Both spec files previously claimed that a
> complete column was "one function staffed across every department". That is
> **false about this board**: because the square is cyclic, every column
> contains all five trades, exactly as every row does. The only single-trade
> line is the main diagonal, which nothing scores. Rows and columns cannot be
> told apart by what is in them — only by which axis they run along. The theme
> must therefore distinguish them **physically** (a floor runs across; a riser
> runs up), never by trade mix. This error survived into the old theme's bonus
> copy for a week; it is recorded rather than quietly fixed so the same
> reasoning isn't repeated.

## 3. Setup

1. All 100 workers into the bag.
2. Fill each agency with exactly **4** workers drawn from the bag.
3. First Call token to the hall; the hall holds no workers yet.
4. 📕 Choose the week-1 start player. ⚖️ Derive it from the game seed so setup
   is fully reproducible.

## 4. Week structure

Every week is three phases, in order.

### Phase A — Hiring [Factory Offer]

Starting with the start player and proceeding in seat order, players take turns
one at a time — cycling round repeatedly, not once each — until the phase ends.
On your turn you **must** do one of:

**(a) Hire from an agency.** Choose one agency and one trade present in it.
Take **every** worker of that trade from it — 📕 you hire the gang, not the man;
there is no option to take fewer. **All remaining workers in that agency move to
the hall.**

**(b) Hire from the hall.** Choose one trade present in the hall and take
**every** worker of that trade. If the First Call token is still in the hall,
you also take it and place it on your idle row (§6.3).

Then place all hired workers in **one** destination:

- **A crew line** — legal only if all of §5 holds. Fill right to left. Workers
  that don't fit overflow to the idle row.
- **The idle row** — always legal (§5.4).

Phase A ends when **all agencies and the hall are empty**.

### Phase B — The jobs get built [Wall Tiling]

⚖️ Phases B and C contain no decisions, so they are **not moves**: `apply()`
resolves both automatically when the last Phase A move empties the agencies and
the hall. A game's move list contains only Phase A choices.

Player boards are independent, so resolution order across players doesn't affect
any result. Within a single board, order **matters**:

For each player, **for floors 1 through 5 in that order**:

1. If the crew line is **complete** (holds exactly *r* workers), the job gets
   built: move **one** worker to its tower cell — floor *r*, column from §2.
2. **Score that placement immediately** (§7).
3. Discard the line's remaining *r−1* workers to the lid — the excess you no
   longer need. The line is now empty.
4. If the line is **incomplete**, leave it untouched. It carries to next week.

> ⚠️ Floors are processed **top to bottom, scoring after each placement**. A job
> built on floor 1 can extend a vertical run that floor 2's placement then
> scores. Batch-placing all workers and scoring afterwards gives different,
> wrong answers.

Then, for each player:

5. Apply idle penalties (§7.3).
6. Discard all idle workers to the lid. The First Call token is **not**
   discarded — its holder becomes the next start player and returns it to the
   hall in Phase C.

### Phase C — Next week

1. Check the end condition (§8). If met, the game is over — **do not refill**.
2. The holder of the First Call token becomes start player and returns the
   token to the hall.
3. Refill every agency to **4** workers (§6.1 for an empty bag).

## 5. Crew-line legality

A crew line *r* is a legal destination for trade *f* only if **all** hold:

1. **Line not full.** It holds fewer than *r* workers.
2. **Line not a different trade.** It is empty, or already holds *f*.
3. **Tower cell free.** Floor *r* of the tower does not already contain a job of
   trade *f*. (The cell is determined by §2; it is never a choice.)

Additionally:

4. **The idle row is always a legal destination.** 📕 A player may send workers
   to idle voluntarily even when a legal crew line exists — sometimes it is the
   right move, to keep a trade away from a rival or to avoid committing a floor.
5. **If no crew line is legal**, the workers must all go to the idle row. This
   is forced, not a choice.

## 6. Edge cases

Everything here is a real situation that occurs in ordinary play.

### 6.1 The bag runs out

📕 When the bag empties during a refill, **refill the bag from the lid**
(everything discarded so far), shuffle, and continue drawing.

⚖️ Shuffle with the seeded generator (§9), so the refill is reproducible.

> **When it actually fires** (corrected in review — an earlier draft overstated
> this). A week deals 4 workers per agency: **20** at 2 players, **28** at 3,
> **36** at 4, from 100 total. At **2 players** the week-5 deal empties the bag
> *exactly* (5 × 20 = 100) and needs no refill — the refill fires only in games
> that reach a **week-6** deal, which novice games often do and efficient games
> often don't. At **3 players** it fires mid-deal in **week 4** (3 × 28 = 84),
> and at **4 players** in **week 3** — i.e. in every 3- or 4-player game that
> gets that far. So it is a main path, just not a universal one at 2 players:
> test it as normal, and don't be surprised when a crisp 5-week pair game never
> triggers it.

⚖️ Theme note: the UI marks this refill as **new arrivals** — a fresh crowd at
the hall. Flavour only, no rules effect; it also makes the engine's most
bug-prone path visible on screen instead of silent.

If the bag **and** the lid are both empty and agencies remain unfilled: 📕 play
the week with what's there. Agencies may be partially filled or empty. This one
genuinely is rare, but it's legal and the engine must not throw.

### 6.2 Idle overflow

📕 When the idle row is full (7 occupied) and more workers arrive, the excess
goes **straight to the lid** with no further penalty. The idle penalty is capped
at its 7 spaces: **−14** at most.

### 6.3 The First Call token

- It occupies the leftmost free idle space and **its space's penalty applies**
  like any worker.
- ⚖️ If the idle row is already full when the token is taken, the token is set
  aside and incurs no penalty. The player still becomes the next start player.
  (The rulebook doesn't address this; it needs a definite answer.)
- It is never discarded to the lid.

### 6.4 The hall holds only the token

You cannot take the token by itself. If the hall contains the First Call token
and no workers, the hall is **not** a legal source.

### 6.5 An agency holds only one trade

Legal. You hire all of it and **nothing** moves to the hall; the agency is
simply empty.

### 6.6 Partially filled crew line

Legal to add the same trade, up to capacity. The remainder overflows to the idle
row. A line holding 1 of 3 that receives 4 workers keeps 2 and idles 2.

### 6.7 Simultaneous game end

📕 If more than one player completes a floor in the same Phase B, the game still
ends after that phase. **Every** player scores their end-game bonuses. Resolve
by the tiebreak in §8.

### 6.8 Score cannot go negative

📕 If idle penalties would take a score below zero, the score becomes **0**.
Applied at each Phase B, so a running total is never negative.

## 7. Scoring

### 7.1 Building a job

Let *h* be the number of contiguous built cells in the new job's **floor**,
including itself, scanning left and right until a gap. Let *v* be the same for
its **column** — the riser.

```
if h == 1 and v == 1:  score 1
else:                  score (h if h > 1 else 0) + (v if v > 1 else 0)
```

Worked cases:

| Situation | h | v | Points |
|---|---|---|---|
| Isolated job | 1 | 1 | **1** |
| Two across, nothing vertical | 2 | 1 | **2** |
| Three across, two up | 3 | 2 | **5** |
| Completes a full floor, nothing vertical | 5 | 1 | **5** |
| Full floor and full riser | 5 | 5 | **10** |

> The trap: a job that is part of both an *h* run and a *v* run scores **both**,
> and an isolated job scores 1 rather than 0. Getting either wrong produces
> scores that look plausible all game and are wrong throughout.

### 7.2 Floor completion during Phase B

Because floors resolve 1→5 with immediate scoring, a placement can benefit from
one made moments earlier in the same phase. Do not optimise this into a batch.

### 7.3 Idle penalties

Sum the penalty of each occupied idle space, left to right:

```
[-1, -1, -2, -2, -2, -3, -3]
```

Four occupied spaces is −1−1−2−2 = **−6**. Apply after all crew lines resolve,
then clamp at 0 (§6.8).

## 8. End of game

📕 The game ends **immediately after the Phase B in which at least one player
completes a full horizontal floor** on their tower. No further refill, no
further week.

⚖️ Theme note: the fiction is that once a floor is finished end to end the
tower's shape is settled and the rest goes up on rails, so that's where the job
is judged. Flavour only.

Final bonuses, added once, per player:

| Achievement | Points |
|---|---|
| Each complete **floor** (5 across) | **+2** |
| Each complete **riser** (5 down) | **+7** |
| Each **trade** built all 5 times | **+10** |

**Tiebreak.** 📕 Most complete floors wins. If still level, the rulebook
declares a shared victory.

⚖️ **In a league game**, record a genuine tie as a **draw**. League points are
**inclusive totals, not bonuses**: win **3**, draw **2**, loss **1** — the
"point for playing" is the loser's point, not something added on top of a win.
In a **three-player game**: winner 3, the other two 1 each; a two-way tie for
top scores 2 each, 1 for third. Don't invent further tiebreaks — draws are rare
and a shared result is honest.

⚖️ **In a cup game a draw is not available** — somebody has to advance. Apply
the rulebook tiebreak, and if still level, **coin-flip on camera**. The run
sheet already treats that as a good answer that the room enjoys, so this needs
no new machinery. The engine should return `draw` and let the tournament layer
resolve it, rather than deciding on its own.

⚖️ **Repeat matchups in the same week both count** for the league. Simplest
rule, and it needs no bookkeeping.

## 9. Determinism

The keystone of the whole design (see `RIVET.md`): **a complete game is
`seed + move list`.**

- **Never `Math.random()`.** Every random draw comes from a seeded PRNG.
- Seed fixed at room creation and recorded with the game.
- The bag is derived by seeded shuffle; so is every mid-game refill from the lid
  (§6.1) and the week-1 start player (§3.4).
- Given the same seed and the same move list, every client and the server must
  reach **byte-identical** state. This is what lets the server derive the winner
  by replay instead of trusting a client's report.
- **Per-turn state hash.** Clients compare each turn; divergence must fail loudly
  and immediately rather than drift until the scores disagree.

Draw order must be fully specified, not incidental: draw workers **one at a
time** from the shuffled bag, filling agency 0 to 4 (or 6, or 8), each agency's
four slots in index order.

⚖️ **Seat order is join order**, fixed when the game starts and recorded in the
game header — data, never re-derived.

⚖️ **The state hash needs a canonical serialization**: one `serialize(state)`
function in the engine defines the byte layout — fixed field order, integers
only (scores, counts, indices; nothing that can float), no locale-dependent
strings. Clients and server hash the same bytes or the guarantee is theatre.

## 10. Move representation

One move is one complete turn — hire and place together, never two half-moves:

```js
{
  source: { type: 'agency', index: 0 },  // or { type: 'centre' }
  fn:     2,                             // trade index 0-4
  dest:   { type: 'team', row: 3 },      // or { type: 'bench' }
  t:      12840                          // mover's clock consumed so far, ms
}
```

⚖️ `t` is the mover's own elapsed clock at submit. It never affects `apply()` —
determinism comes from the seed and the first three fields — but without it a
game that ends on time cannot be audited or honestly archived, and it powers
think-time stats and the phone-fairness question for free.

`apply(state, move) -> newState`, pure. The engine must expose
`legalMoves(state)` — the UI highlights from it, the random test bot draws from
it, and the server validates against it. One source of truth for legality; never
a second copy in the UI.

### ⚖️ Identifiers — theme-neutral, decided 2026-08-12

The identifiers above (`agency`, `centre`, `team`, `bench`, `fn`) are the
**previous theme's** words, and they are baked into the wire protocol and the
archived game record. The record is meant to outlive the term, so a themed
identifier is a migration waiting to happen the next time the theme moves — and
it has now moved twice.

**They become theme-neutral in the code pass**: `source`, `pool`, `line`,
`floor`, `trade`. Not Rivet's words either — the theme then lives only in the
copy layer and can change again without touching a single stored game. This is
free today because the archive is empty; it stops being free the moment a real
league game is recorded.

### The game record

What the archive stores — one object per game, kilobytes:

```js
{
  v:      1,                    // engine/rules version; replays use the matching engine
  term:   '2027-fall',          // cohort key — powers the all-time Record Book
  mode:   'league',             // 'league' | 'cup' | 'exhibition' | 'practice'
  seed:   'a3f9c2…',
  seats:  ['sam', 'alex'],      // join order; seat 0 per §3
  config: { clockMs: 300000, splashHistory: true },
  device: ['laptop', 'phone'],  // per seat, for the clock-fairness question
  moves:  [ /* Phase A moves only, in order */ ],
  result: { scores: [61, 58], winner: 0, ending: 'natural' }
                                // ending: 'natural' | 'timeout' | 'void'
}
```

⚖️ `mode` matters: **exhibition** (instructor demo) and **practice** (vs the
bot) games are archived but excluded from the league, records and awards by
default.

## 11. Clocks

Our addition, not Azul's.

- **5 minutes per player**, configurable at room creation. Chess clock: your
  clock runs only on your turn.
- **Clocks pause through Phase B and C.** Base rules make the build phase fully
  automatic, so there is no decision to time. (This is a reason to implement base
  rules rather than the variant blank wall, where tiling *is* a choice.)
- **Latency is free.** Your clock stops when you submit; your opponent's starts
  when they receive.
- **Timeout loses**, as in chess. Record it as won-on-time and **exclude it from
  score-based awards** — a timeout leaves an artificially low score that would
  corrupt "Tallest Tower".
- ⚖️ **Disconnection is not a loss and not a void — reconnect first.** A whole
  game is `seed + move list`, so a returning client resumes from the exact
  position in one fetch. The dropped player's clock **keeps running** while
  they're gone, as in chess; if it expires before they return, that's a timeout.
  The instructor can void instead when the wifi, not the player, was the
  problem. Void is the last resort, never the default.

## 12. Test checklist

Derived from the sections above. A random-move bot playing thousands of headless
games covers most of it, because it idles constantly and so exercises the
paths a competent player avoids.

**Invariants — assert continuously:**

- [ ] Workers conserved: bag + lid + agencies + hall + all towers + idle rows = **100**, every turn.
- [ ] No score is ever negative.
- [ ] No tower cell is ever built twice.
- [ ] No crew line ever holds two trades, or exceeds capacity.
- [ ] `legalMoves` is never empty while any agency or the hall holds a worker.
- [ ] Every game terminates.

**Scoring:**

- [ ] Isolated job scores 1, not 0.
- [ ] A job in both a horizontal and a vertical run scores **both**.
- [ ] Floors resolve 1→5, and a floor-1 placement affects a floor-2 score in the same phase.
- [ ] Idle penalty table applied left to right; 7 occupied = −14.
- [ ] Idle overflow beyond 7 adds no further penalty.
- [ ] Score clamps at 0, never below.

**Edge cases:**

- [ ] Bag empties mid-deal → refills from lid and continues. Random-bot games
      run long, so **assert this fires routinely across the soak**. Assert the
      other side too: a 2-player game ending after week 5 refills **zero**
      times — the week-5 deal uses the bag's last 20 workers exactly (§6.1).
- [ ] Worker conservation still holds across a lid-to-bag refill.
- [ ] Bag *and* lid empty → partially filled agencies, no throw.
- [ ] Hall holding only the First Call token is not a legal source.
- [ ] Hiring the only trade in an agency moves nothing to the hall.
- [ ] Forced idle dump when no crew line is legal.
- [ ] Voluntary idle dump is offered even when legal lines exist.
- [ ] First Call token takes an idle penalty; full idle row → no penalty, still start player.
- [ ] Two players complete a floor in the same phase → both score bonuses, tiebreak applies.

**Determinism:**

- [ ] Same seed + same moves → identical final state, across separate processes.
- [ ] A recorded game replays to the same winner.
- [ ] State hashes match between two clients for a full game.

**End game:**

- [ ] Triggers only after Phase B, never mid-phase.
- [ ] No refill happens after the trigger.
- [ ] Bonuses: +2 floor, +7 riser, +10 trade-complete.
- [ ] Tiebreak on most complete floors, then draw.

## 13. Player counts

| Players | Agencies | Notes |
|---|---|---|
| 2 | 5 | Standard weekly match |
| 3 | 7 | Odd groups — **no byes** |
| 4 | 9 | Supported; not currently needed |

📕 Player count changes **nothing** but the agency count. Workers, board, scoring
and end condition are identical. Treat it as a constant, never a code path —
three-player support is a UI layout question, not an engine question.

### ⚖️ Three-player games distort cup seeding — rotate the slot

Only one player wins a three-player game, so being in one means roughly a
1-in-3 round instead of 1-in-2. Across a term that washes out, which is why flat
league scoring is fine. Across the **cup's three rounds** it doesn't: the top
four are seeded off three results.

It only bites on odd attendance — 14 students is seven clean pairs. When it does:
**rotate the three-player slot so nobody lands in it twice**, exactly as the bye
tables in `teaching/ler565/week6/live/RULES.md` already rotate the bye. Then
fall back to that file's existing tiebreaks, including "your call" — it's a
game, not a ranking exercise.

Worth a line in the run sheet so it isn't discovered on the night.
