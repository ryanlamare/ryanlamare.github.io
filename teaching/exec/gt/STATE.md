# Applied Game Theory for RRPF — where the programme stands

Written 8 Sep 2026 as a handover between machines. The decks are the source of
truth; this page is the short version of what is built, what is open, and how
to pick the work up on another computer.

## Modules

| Module | State |
|---|---|
| m1–m6 | Shipped and live. m6's penalty table changed on 7 Sep (see below). |
| m7 | Rebuilt around four game classes, 30 slides, live. Redlined through three passes; the wording flagged below still awaits a final veto. |
| m8 | BUILT 11 Sep, first cut, local commit, awaiting Ryan's redlines. 34 slides: cover, objectives, the car market game (his 590GT three-round card game, on phones), the 550 spine, then **Hidden Agenda** (the 565 week-5 werewolf reskin, renamed 11 Sep) at two tables at once, the Tapas committee and the Granito management team, four fictional bidders per table and RRPF on neither list, roles dealt to phones behind the admin secret, nights on phones with pointing printed as the fallback, one big-screen clock for both tables, the phones' nightly notes drawn as a suspicion spectrum with three honours per table, the recommendation against the Backers' secret bidder, ten points to the winning side, and the final Top of the class. |

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

## m8 as it stands

- **Pages.** `m8/game/?g=market` and `?g=cs` (participants; the shortlist opens from a link on the phone), `m8/game/mod.html?t=tapas|granito` (the moderator's phone, admin secret), `m8/game/moderator-script.html?t=` and `m8/game/bidders.html?t=` (printable), `m8/game/cs.js` (both tables' setting and bidders: the one file to edit after the pre-meeting with JN and BJ).
- **Worker.** The Closed Session lane (`/p/:id/cs/...`) is deployed (11 Sep, version 23f22dfb). Roles live only on the server; a phone can read only its own; the Auditor's answer is computed there. Tested locally with a scripted 12-seat game (68 checks) and the legacy routes; the live routes were probed with a scratch room.
- **Rooms.** `m8-market` (unscored), `m8-cs-tapas` and `m8-cs-granito` (SCORING, ten to the winning side). Poll Desk lists all three. Rehearse in scratch rooms with `?room=` on the pages and `?tapas=&granito=&market=` on the deck; `?api=` points everything at a local Worker.
- **Keys on the deck.** Market board: 1, 2, 3 open the rounds on every phone, C closes, W is the rule change. The two committees: D starts a five-minute day, N a ninety-second night and inverts the slide to dark, P pauses.
- **Roles.** Committee Member, Manipulator, Auditor, General Counsel (renamed from the 565 Booster, Compliance Officer and Chair). Two Manipulators at ten or eleven, three from twelve. Removal is by anonymous allegation overnight or by a vote to remove by day; the words "recused" and "complaint" are gone from every page. The night question is only "who do you suspect", up to three names. General Counsel *shields* (not clears). The role slides are pictograms, no company names, so nothing primes a bidder.
- **The car market (built 11 Sep, evening).** Everyone is a buyer; the lot on the lot slide is the sellers, one car per buyer, drawn from the joins and frozen when round one opens. Keys on that slide: 1, 2, 3 open rounds, C closes, W opens the rule change (warranties). The deck posts only the open and close markers; every phone runs `m8/game/lot.js` over the same lines and seed, so results are never posted. A sale washes the whole phone peach or lemon. Sold cars are replaced by arrivals (lemons only while the average price is under 3000); peaches unsold after round two withdraw and lemon owners take their spots; the warranty round brings the peaches back with a badge and asks for two prices. Rehearse with `?market=<room>` on the deck and `?room=` on the phones.
- **The close (11 Sep).** After the lesson: a write-in wall, "Information asymmetries in your world" (room `m8-yourworld`, sorted aloud into signal / jam / screen), then **The awards** (five fun awards computed from the rooms: Best in show, The mind reader, The partnership, Trusted and trusting, Sharpest buyer) and the closing **podium**, gold, silver and bronze from the programme totals. The m8 leaderboard and the eight-module recap are gone.
- **Not yet decided.** Physical prizes or not. Settled 11 Sep: one round only, no reserve; the bidders stay exactly even and nothing is needed from JN and BJ for the cards; the module one wall is cut from m8, the game stands alone.

## Day two, a first timing

| Module | Estimate |
|---|---|
| m5 Coordination | 60–75 min |
| m6 Mixed strategies | 60 min |
| m7 Strategic moves | 75 min |
| m8 Information asymmetries | 120 min: market 15, spine 30, the wall 10, Closed Session rules and dealing 10, one round of play 35–40, reveal and debrief 15, awards 10 |

About five and a half hours of content. With a 45-minute lunch and two 15-minute breaks that is 9:00 to 4:15 or 10:00 to 5:15. A second round of Closed Session does not fit without cutting elsewhere.

## Open items

- **Wording still to veto** (all Claude's): the auction slides, the reputation slide's two chips, the brinkmanship figure, the Sun Tzu copy and its toy numbers, the cautionary slide's bullets after the opening question, the penalty widget's bullets, the airtime slide (facts unchecked against the 550 source), the Rebel bullets in m5, and the m6 rules bullet that now reads "the odds in the table".
- **The penalty table** is back to the real 58 / 95 / 93 / 70 across m6 and m7 (`m6/game/pk.js`, mirrored in `go/scores.js`) since 11 Sep; the m7 committed keeper goes left every time.
- **Before any real session:** reset the seeded and test rooms in Poll Desk, and fill `go/roster.json` with the participants' first names.

## Working from another machine

- Clone the repo from GitHub; do not put it in OneDrive or Google Drive.
- Preview with `./serve.sh`, never by opening a deck file directly.
- The case documents (Tapas, Granito, the 550 quiz) are deliberately untracked and stay on the home machine. Never commit them.
- Claude Code's project memory (the design record, case notes, game answers) lives outside the repo on the home Mac, under `~/.claude/projects/-Users-rlamare-Sites-ryanlamare-github-io/memory/`. Copy that folder by hand to the same path on another Mac if the same context is wanted there.
