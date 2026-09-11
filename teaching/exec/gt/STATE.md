# Applied Game Theory for RRPF — where the programme stands

Written 8 Sep 2026 as a handover between machines. The decks are the source of
truth; this page is the short version of what is built, what is open, and how
to pick the work up on another computer.

## Modules

| Module | State |
|---|---|
| m1–m6 | Shipped and live. m6's penalty table changed on 7 Sep (see below). |
| m7 | Rebuilt around four game classes, 30 slides, live. Redlined through three passes; the wording flagged below still awaits a final veto. |
| m8 | In design (11 Sep). Agreed shape: the 590GT car market game on phones opens; the 550 spine; the m1 wall re-shown and sorted into ask / jam / screen; then the capstone, **Closed Session** (the 565 week 5 werewolf reskin) at two tables at once, Tapas committee and Granito management, JN and BJ moderating, roles dealt to phones behind the admin secret, nights on phones with pointing printed as the fallback, one big-screen clock for both tables, ten points to the winning side; then the awards. A sample block (slides 15–25) and `m8/game/moderator-script.html` are built for Ryan's redlines; nothing is wired yet. |

## m7 as it stands

Cover, objectives, what a strategic move is, then:

1. **Sequential games.** Strategic moves claim first- or second-mover advantage; smoking; sleep; credibility with Clocky; credibility and irreversibility (Cortés, Polaroid, Strangelove); the added value game as a two-question vote; why I became a fierce negotiator; campaign airtime and unintended consequences.
2. **The prisoner's dilemma.** Split or steal (scored, two rounds, Nick's move in round two); Nick and Ibrahim; match or beat.
3. **Coordination games.** Chicken with Footloose; the road; chicken in pairs with the steering wheel (scored); who swerved; credibility and reputation (Bush, Clinton); is commitment always a good thing.
4. **The auction.** The plain dollar auction, live, every bid on screen with a name, then the bidding history on a keypress. Scored: the winner pays their bid and takes ten, the runner-up pays their bid for nothing. (The Granito skin was removed on 10 Sep; Granito now appears only on its m1 slide and the deals page.)
5. **Escalation.** Brinkmanship (Campeau and Bloomingdale's); Sun Tzu's "leave an outlet free" as an animation.
6. **Cautionary tales.** Escalation and predictability; the committed penalty, played by the instructor on the big screen, ten kicks, every one to the left, the keeper knowing.
7. Top of the class (Chicken, Split or steal, Engines).

Nothing in m7 is flex any more. Estimated running time about 75 minutes.

## Open items

- **Wording still to veto** (all Claude's): the auction slides, the reputation slide's two chips, the brinkmanship figure, the Sun Tzu copy and its toy numbers, the cautionary slide's bullets after the opening question, the penalty widget's bullets, the airtime slide (facts unchecked against the 550 source), the Rebel bullets in m5, and the m6 rules bullet that now reads "the odds in the table".
- **The penalty table** is back to the real 58 / 95 / 93 / 70 across m6 and m7 (`m6/game/pk.js`, mirrored in `go/scores.js`) since 11 Sep; the m7 committed keeper goes left every time.
- **Before any real session:** reset the seeded and test rooms in Poll Desk, and fill `go/roster.json` with the participants' first names.

## Working from another machine

- Clone the repo from GitHub; do not put it in OneDrive or Google Drive.
- Preview with `./serve.sh`, never by opening a deck file directly.
- The case documents (Tapas, Granito, the 550 quiz) are deliberately untracked and stay on the home machine. Never commit them.
- Claude Code's project memory (the design record, case notes, game answers) lives outside the repo on the home Mac, under `~/.claude/projects/-Users-rlamare-Sites-ryanlamare-github-io/memory/`. Copy that folder by hand to the same path on another Mac if the same context is wanted there.
