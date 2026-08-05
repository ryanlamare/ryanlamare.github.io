# Headcount — engine specification

The complete rules, stated precisely enough to implement without guessing.
Companion to `HEADCOUNT.md`, which holds the design decisions and the why; this
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

Vocabulary: the Headcount name first, the Azul name in brackets where they
differ. Both appear because the rulebook and every online reference use the
Azul terms.

---

## 1. Components

| Thing | Count | Notes |
|---|---|---|
| Tiles | **100** | 20 each of 5 functions |
| Functions [colours] | 5 | Engineering, Sales, Operations, Finance, Analytics |
| Agencies [factory displays] | **2n+1** | 5 at 2 players, 7 at 3, 9 at 4 |
| First Mover token [first player marker] | 1 | |
| Player board | 1 each | Teams, org chart, bench |
| Bag, lid [discard] | 1 each | |

Each player board has:

- **Teams** [pattern lines] — 5 rows of capacity **1, 2, 3, 4, 5** (row *r*,
  1-indexed, holds *r* tiles). Filled **right to left**; the rightmost space
  sits against the org chart.
- **Org chart** [wall] — 5×5 grid, fixed function per cell (§2).
- **Bench** [floor line] — 7 spaces with penalties
  **−1, −1, −2, −2, −2, −3, −3**, filled left to right.

## 2. The org chart is a cyclic Latin square

Function *f* (index 0–4) belongs in row *r* (index 0–4) at column:

```
column = (f + r) mod 5
```

Which gives, with functions indexed Engineering 0, Sales 1, Operations 2,
Finance 3, Analytics 4:

| | c0 | c1 | c2 | c3 | c4 |
|---|---|---|---|---|---|
| **r0** | Eng | Sal | Ops | Fin | Ana |
| **r1** | Ana | Eng | Sal | Ops | Fin |
| **r2** | Fin | Ana | Eng | Sal | Ops |
| **r3** | Ops | Fin | Ana | Eng | Sal |
| **r4** | Sal | Ops | Fin | Ana | Eng |

Every function appears exactly once per row and once per column. **Do not
hardcode this table** — derive it from the formula, or a transcription slip
becomes a scoring bug that only shows up in one cell.

This is also why the end-game bonuses theme themselves: a complete row is a
department with one of every function, a complete column is one function staffed
across every department.

## 3. Setup

1. All 100 tiles into the bag.
2. Fill each agency with exactly **4** tiles drawn from the bag.
3. First Mover token to the centre; the centre holds no tiles yet.
4. 📕 Choose the round-1 start player. ⚖️ Derive it from the game seed so setup
   is fully reproducible.

## 4. Round structure

Every round is three phases, in order.

### Phase A — Hiring [Factory Offer]

Starting with the start player and proceeding in seat order, each player takes
exactly one turn until the phase ends. On your turn you **must** do one of:

**(a) Take from an agency.** Choose one agency and one function present in it.
Take **every** tile of that function from it. **All remaining tiles in that
agency move to the centre.**

**(b) Take from the centre.** Choose one function present in the centre and take
**every** tile of that function. If the First Mover token is still in the
centre, you also take it and place it on your bench (§6.3).

Then place all taken tiles in **one** destination:

- **A team row** — legal only if all of §5 holds. Fill right to left. Tiles that
  don't fit overflow to the bench.
- **The bench** — always legal (§5.4).

Phase A ends when **all agencies and the centre are empty**.

> 📕 You take *all* tiles of the chosen function, never a subset. There is no
> option to take fewer.

### Phase B — Wall Tiling

Player boards are independent, so resolution order across players doesn't affect
any result. Within a single board, order **matters**:

For each player, **for rows 1 through 5 in that order**:

1. If the row is **complete** (holds exactly *r* tiles), move **one** tile to
   its org chart cell — row *r*, column from §2.
2. **Score that placement immediately** (§7).
3. Discard the row's remaining *r−1* tiles to the lid. The row is now empty.
4. If the row is **incomplete**, leave it untouched. It carries to next round.

> ⚠️ Rows are processed **top to bottom, scoring after each placement**. A tile
> placed in row 1 can extend a vertical run that row 2's placement then scores.
> Batch-placing all tiles and scoring afterwards gives different, wrong answers.

Then, for each player:

5. Apply bench penalties (§7.3).
6. Discard all bench tiles to the lid. The First Mover token is **not**
   discarded — its holder becomes the next start player and returns it to the
   centre in Phase C.

### Phase C — Next round

1. Check the end condition (§8). If met, the game is over — **do not refill**.
2. The holder of the First Mover token becomes start player and returns the
   token to the centre.
3. Refill every agency to **4** tiles (§6.1 for an empty bag).

## 5. Team-row legality

A team row *r* is a legal destination for function *f* only if **all** hold:

1. **Row not full.** It holds fewer than *r* tiles.
2. **Row not a different function.** It is empty, or already holds *f*.
3. **Org chart cell free.** Row *r* of the org chart does not already contain
   *f*. (The cell is determined by §2; it is never a choice.)

Additionally:

4. **The bench is always a legal destination.** 📕 A player may dump to the
   bench voluntarily even when a legal team row exists — sometimes it is the
   right move, to deny tiles or to avoid committing a row.
5. **If no team row is legal**, the tiles must all go to the bench. This is
   forced, not a choice.

## 6. Edge cases

Everything here is a real situation that occurs in ordinary play.

### 6.1 The bag runs out

📕 When the bag empties during a refill, **refill the bag from the lid**
(everything discarded so far), shuffle, and continue drawing.

⚖️ Shuffle with the seeded generator (§9), so the refill is reproducible.

> **This is a main path, not an exotic one.** A round deals 4 tiles per agency:
> **20** tiles at 2 players, **28** at 3, **36** at 4, out of 100 total. So the
> bag empties around round 5 at two players and round 4 at three — in
> essentially every game that runs to a natural finish. An implementation that
> treats the refill as a rare edge case will ship a bug that appears in the
> second half of *every* match. Test it as a normal path.

If the bag **and** the lid are both empty and agencies remain unfilled: 📕 play
the round with what's there. Agencies may be partially filled or empty. This one
genuinely is rare, but it's legal and the engine must not throw.

### 6.2 Bench overflow

📕 When the bench is full (7 occupied) and more tiles arrive, the excess goes
**straight to the lid** with no further penalty. The bench penalty is capped at
its 7 spaces: **−14** at most.

### 6.3 The First Mover token

- It occupies the leftmost free bench space and **its space's penalty applies**
  like any tile.
- ⚖️ If the bench is already full when the token is taken, the token is set
  aside and incurs no penalty. The player still becomes the next start player.
  (The rulebook doesn't address this; it needs a definite answer.)
- It is never discarded to the lid.

### 6.4 The centre holds only the token

You cannot take the token by itself. If the centre contains the First Mover
token and no tiles, the centre is **not** a legal source.

### 6.5 An agency holds only one function

Legal. You take all of it and **nothing** moves to the centre; the agency is
simply empty.

### 6.6 Partially filled team row

Legal to add the same function, up to capacity. The remainder overflows to the
bench. A row holding 1 of 3 that receives 4 tiles keeps 2 and benches 3.

### 6.7 Simultaneous game end

📕 If more than one player completes a row in the same Phase B, the game still
ends after that phase. **Every** player scores their end-game bonuses. Resolve
by the tiebreak in §8.

### 6.8 Score cannot go negative

📕 If bench penalties would take a score below zero, the score becomes **0**.
Applied at each Phase B, so a running total is never negative.

## 7. Scoring

### 7.1 Placing a tile

Let *h* be the number of contiguous filled cells in the placed tile's **row**,
including itself, scanning left and right until a gap. Let *v* be the same for
its **column**.

```
if h == 1 and v == 1:  score 1
else:                  score (h if h > 1 else 0) + (v if v > 1 else 0)
```

Worked cases:

| Situation | h | v | Points |
|---|---|---|---|
| Isolated tile | 1 | 1 | **1** |
| Two in a row, nothing vertical | 2 | 1 | **2** |
| Three horizontal, two vertical | 3 | 2 | **5** |
| Completes a full row, nothing vertical | 5 | 1 | **5** |
| Full row and full column | 5 | 5 | **10** |

> The trap: a tile that is part of both an *h* run and a *v* run scores **both**,
> and an isolated tile scores 1 rather than 0. Getting either wrong produces
> scores that look plausible all game and are wrong throughout.

### 7.2 Row completion during Phase B

Because rows resolve 1→5 with immediate scoring, a placement can benefit from
one made moments earlier in the same phase. Do not optimise this into a batch.

### 7.3 Bench penalties

Sum the penalty of each occupied bench space, left to right:

```
[-1, -1, -2, -2, -2, -3, -3]
```

Four occupied spaces is −1−1−2−2 = **−6**. Apply after all team rows resolve,
then clamp at 0 (§6.8).

## 8. End of game

📕 The game ends **immediately after the Phase B in which at least one player
completes a full horizontal row** on their org chart. No further refill, no
further round.

Final bonuses, added once, per player:

| Achievement | Points |
|---|---|
| Each complete **row** (5 across) | **+2** |
| Each complete **column** (5 down) | **+7** |
| Each **function** placed all 5 times | **+10** |

**Tiebreak.** 📕 Most complete horizontal rows wins. If still level, the
rulebook declares a shared victory.

⚖️ **In a league game**, record a genuine tie as a **draw**, worth 2 league
points each (against 3 for a win, 1 for playing). Don't invent further
tiebreaks — draws are rare and a shared result is honest.

⚖️ **In a cup game a draw is not available** — somebody has to advance. Apply
the rulebook tiebreak, and if still level, **coin-flip on camera**. The run
sheet already treats that as a good answer that the room enjoys, so this needs
no new machinery. The engine should return `draw` and let the tournament layer
resolve it, rather than deciding on its own.

⚖️ **Repeat matchups in the same week both count** for the league. Simplest
rule, and it needs no bookkeeping.

## 9. Determinism

The keystone of the whole design (see `HEADCOUNT.md`): **a complete game is
`seed + move list`.**

- **Never `Math.random()`.** Every random draw comes from a seeded PRNG.
- Seed fixed at room creation and recorded with the game.
- The bag is derived by seeded shuffle; so is every mid-game refill from the lid
  (§6.1) and the round-1 start player (§3.4).
- Given the same seed and the same move list, every client and the server must
  reach **byte-identical** state. This is what lets the server derive the winner
  by replay instead of trusting a client's report.
- **Per-turn state hash.** Clients compare each turn; divergence must fail loudly
  and immediately rather than drift until the scores disagree.

Draw order must be fully specified, not incidental: draw tiles **one at a time**
from the shuffled bag, filling agency 0 to 4 (or 6, or 8), each agency's four
slots in index order.

## 10. Move representation

One move is one complete turn — take and place together, never two half-moves:

```js
{
  source: { type: 'agency', index: 0 }   // or { type: 'centre' }
  fn:     2,                             // function index 0-4
  dest:   { type: 'team', row: 3 }       // or { type: 'bench' }
}
```

`apply(state, move) -> newState`, pure. The engine must expose
`legalMoves(state)` — the UI highlights from it, the random test bot draws from
it, and the server validates against it. One source of truth for legality; never
a second copy in the UI.

## 11. Clocks

Our addition, not Azul's.

- **5 minutes per player**, configurable at room creation. Chess clock: your
  clock runs only on your turn.
- **Clocks pause through Phase B and C.** Base rules make wall tiling fully
  automatic, so there is no decision to time. (This is a reason to implement base
  rules rather than the variant blank wall, where tiling *is* a choice.)
- **Latency is free.** Your clock stops when you submit; your opponent's starts
  when they receive.
- **Timeout loses**, as in chess. Record it as won-on-time and **exclude it from
  score-based awards** — a timeout leaves an artificially low score that would
  corrupt "Best Quarter".

## 12. Test checklist

Derived from the sections above. A random-move bot playing thousands of headless
games covers most of it, because it benches constantly and so exercises the
paths a competent player avoids.

**Invariants — assert continuously:**

- [ ] Tiles conserved: bag + lid + agencies + centre + all boards + benches = **100**, every turn.
- [ ] No score is ever negative.
- [ ] No org chart cell is ever filled twice.
- [ ] No team row ever holds two functions, or exceeds capacity.
- [ ] `legalMoves` is never empty while any agency or the centre holds a tile.
- [ ] Every game terminates.

**Scoring:**

- [ ] Isolated tile scores 1, not 0.
- [ ] A tile in both a horizontal and a vertical run scores **both**.
- [ ] Rows resolve 1→5, and a row-1 placement affects a row-2 score in the same phase.
- [ ] Bench penalty table applied left to right; 7 occupied = −14.
- [ ] Bench overflow beyond 7 adds no further penalty.
- [ ] Score clamps at 0, never below.

**Edge cases:**

- [ ] Bag empties mid-refill → refills from lid and continues. **Assert this
      fires in most full games**, not just a contrived one — if it never
      triggers, the test games aren't reaching a natural end.
- [ ] Tile conservation still holds across a lid-to-bag refill.
- [ ] Bag *and* lid empty → partially filled agencies, no throw.
- [ ] Centre holding only the First Mover token is not a legal source.
- [ ] Taking the only function in an agency moves nothing to the centre.
- [ ] Forced bench dump when no team row is legal.
- [ ] Voluntary bench dump is offered even when legal rows exist.
- [ ] First Mover token takes a bench penalty; full bench → no penalty, still start player.
- [ ] Two players complete a row in the same phase → both score bonuses, tiebreak applies.

**Determinism:**

- [ ] Same seed + same moves → identical final state, across separate processes.
- [ ] A recorded game replays to the same winner.
- [ ] State hashes match between two clients for a full game.

**End game:**

- [ ] Triggers only after Phase B, never mid-phase.
- [ ] No refill happens after the trigger.
- [ ] Bonuses: +2 row, +7 column, +10 function-complete.
- [ ] Tiebreak on most complete rows, then draw.

## 13. Player counts

| Players | Agencies | Notes |
|---|---|---|
| 2 | 5 | Standard weekly match |
| 3 | 7 | Odd groups — **no byes** |
| 4 | 9 | Supported; not currently needed |

📕 Player count changes **nothing** but the agency count. Tiles, board, scoring
and end condition are identical. Treat it as a constant, never a code path —
three-player support is a UI layout question, not an engine question.

### ⚖️ Three-player games distort cup seeding — rotate the slot

Only one player wins a three-player game, so being in one means roughly a
1-in-3 round instead of 1-in-2. Across a term that washes out, which is why flat
league scoring is fine. Across the **cup's three rounds** it doesn't: the top
four are seeded off three results.

It only bites on odd attendance — 14 students is seven clean pairs. When it does:
**rotate the three-player slot so nobody lands in it twice**, exactly as the bye
tables in `week6/live/RULES.md` already rotate the bye. Then fall back to that
file's existing tiebreaks, including "your call" — it's a game, not a ranking
exercise.

Worth a line in the run sheet so it isn't discovered on the night.
