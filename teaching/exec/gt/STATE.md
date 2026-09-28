# Applied Game Theory for RRPF — where the programme stands

Written 8 Sep 2026 as a handover between machines. The decks are the source of
truth; this page is the short version of what is built, what is open, and how
to pick the work up on another computer.

## NEXT CHAT STARTS HERE (28 Sep 2026, evening): the m1–m8 run-through

- **His ask, one module at a time from m1:** are we missing anything important? Is there a lesson they aren't learning that he should add, from old slides or new content? If you were taking game theory for the first time, what isn't covered, or isn't explained well enough?
- **How:** talk it through in prose first, one call per module. He decides, then it gets built.
- **Sources for each module:**
  - its section of the 550 master;
  - his fuller older decks where the master trimmed (the 590GT and 565 intros);
  - the 565 week decks;
  - MG478;
  - a first-timer's view of the standard material.
- **Don't re-propose his cuts:** the paradoxes, Types of games, the median dog, Who blinks first?.
- **State:** m1 is 33 slides, m7 is 34, and m3's aircraft game is kept. He hasn't played it with his wife yet; he'll time it for m3's round or hold it until after the run-through. Brief edits come through a session.
- **m1's round: DONE and live, 28 Sep evening** (his "yes sounds great"; tag `m1-before-answers`). m1 needed no new lesson, only three answers to questions it asked:
  - **Slide 14**, *Common knowledge and equilibrium*: a second bullet in plain words (his ask, rather than a line under the matrix): "That is, an equilibrium is a stable outcome, where no player can get a better payoff by switching to some other strategy on their own". It's stitched from his 565/590GT lines ("a stable outcome", "no player can get a better payoff by switching to some other strategy"). The junction cells light with it.
  - **Slide 22, new**, *So what is the answer?*, between the efficient sequence and *This is actually a game about common knowledge*: his 565/590GT slides 17–18 word for word ("the correct answer they give is… 48", "…that number is… 47!", "Actually no it isn't… 46!!!"; "chapter 1 of the book" became "of the pre-course reading" in the first line). The number line is lifted from the 565 week 1 live deck. It's its own slide because slide 20 had no room, and it follows his 565 order (the answer, then the lesson).
  - **Slide 27**, *Added value matters*: his 550 master s29–30 as the second bullet: "In the first game, to complete each pair I need you just as much as you need me, so the most likely outcome is a 50-50 split (£50 each)". It had gone out when the games were rebuilt on 26 Aug. The card figure is 250px tall so the four bullets fit.
  - Tests: both m1 offers tests address the slides one higher, and pass. m1 presses through clean.
- **His question on the cuts** (paradoxes and the rest): keep them out. Each paradox is taught where a module plays it (the truel, the PD, m6's "sometimes it pays to be unpredictable", m7's commitment). Types of games is how m2 and m3 open.
- **m2's round: DONE and live, 28 Sep evening** (his "lets make those changes… this is excellent"; tag `m2-before-answers`; still 22 slides):
  - **Slide 3:** the recall now reads "Recall the first rule of game theory from our first session:" with the chip "It's not (just) about you!" (m1's slide 14 title), in place of the shoes line m1 no longer has.
  - **Slide 9, Boeing versus Airbus, is solved on the tree:** press 5 puts his 565 slide 41 payoffs on the leaves, as (Airbus, Boeing): price war −1, −1; share the market 2, 1; stay out 0, 2. Press 6 strikes BLOCK the way the smoking tree strikes quitting, turns ACCOMMODATE red, and adds a fifth bullet in his 565 words with the firms named: "Under perfect information, Airbus will enter the market and Boeing will accommodate it". The tree is a little smaller and the bullet gaps tighter (a deck.css rule had always overridden the slide's own 20px bullets; the 23px size stays).
  - **Slide 18, the centipede's results:** "Rollback theory:" is his 550 s60 chain in pounds (Player 2 surely takes at £1,000, so Player 1 takes at £900; Player 2 knows this and takes at £800, and so on, so Player 1 takes the first £100). "The problem:" adds his 565 s47 reason: "because you do better as a group if you wait!"
  - The m2 boards test passes, and m2 presses through clean.
- **Pay It Forward, built and live 28 Sep (his "yes perfect"; tag `m2-before-payforward`):** the *I Think You Should Leave* sketch (S3E3, the 55 burgers one) is the fourth press on the centipede's results (slide 18). The line reads "A pay-it-forward line is a centipede game: it keeps going only as long as nobody grabs", with a WATCH chip that opens deck.js's in-place player. It's a fan upload (52LJaWDdG9c); the other fan upload, BP1zOxcg57E, is the swap if it's taken down. The board sits 44px higher (ROOM 178) so the four lines fit. The chip class is `.wchip`, because m2's `.fchip` is the first-mover cards.
- **m3's round, part one: BUILT and live 28 Sep (tag `m3-before-ladder`; 29 slides).** He and Kimberly ran m3: the matrix ladder had no middle step (Kenney, then straight into the 4×4 engine game), which Claude caused by cutting the Casey and Pat stand-in on 14 Sep. His plan, built:
  - **Kenney (slide 10) has both numbers:** Allied days of bombing · days the convoy sails free (3 minus the first, so every cell sums to three, as the engine game's sum to 100), with a key line. It's there to show the boats-and-planes story put into a matrix (Davis, *Game Theory: A Nontechnical Introduction*).
  - **Two new slides, 11 and 12:** *A workplace example* is his 550 s81 with the union election made a company's negotiating team (two managers leading the talks with a major customer, the board votes). *Seeking the dominant strategy* is his s82 matrix (Casey's share · Pat's, his numbers) beside his s89 lines word for word. **He demonstrates the phones' move there:** a click on a row or column name crosses out the whole line; his keypresses do the same for whatever he hasn't clicked. Dominance is what's left standing, with no circle.
  - **No second Casey and Pat:** the engine game is the room's inferior-first exercise.
  - **The engine game (slide 15) is solved at the tables:** an AT YOUR TABLES band, his call ("in groups").
  - **m3/solve:** the press-and-hold circle is gone (Kimberly: crossing out is easier). The instruction says to tap the *name*, and a tap on a number flashes its two names.
  - The calendar page's links now go to m3/#25 and #26. The m3-solve test was rewritten; m3-solve and m3-lot pass, and the deck presses through clean.
- **m3's round, part two: OPEN.** He wants to keep the aircraft game, skippable when short of time, rebuilt on the cabin-versus-flight split (he and Kimberly had the same idea). It stays as it is at the end of m3 until Claude's draft briefs have had his read.
