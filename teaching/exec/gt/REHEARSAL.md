# Rehearsing the programme alone (and once with a second person)

Written 12 Sep 2026. Everything runs against the live site and the live
Worker, exactly as on the day. Rehearsal answers land in the real rooms;
Poll Desk resets them, and the last step here is that reset.

## Set up once

- **Make five student identities in Chrome.** Every Chrome *profile* has its own storage, so it is a separate phone. (Private windows are not: all incognito windows share one identity.) In Chrome, click your avatar at the top right, then **Add**, name it **Student 1**, choose **Continue without an account**, pick a colour, **Done**. Repeat for Student 2 to Student 5. Each profile opens as its own window with its name in the top bar.
- **Your phone is Student 6** and, in m8, the moderator.
- **The deck stays in your normal profile**, full screen, on the external screen if you have one.
- In each student window open **ryanlamare.com/go** and bookmark it. That page lists every poll and, underneath, the eight game pages, so nothing else ever needs typing.
- Open **ryanlamare.com/teaching/exec/gt/poll-desk/** in your normal profile and paste the admin secret once. Press **reset** on every room, including gt-names, before you start.
- Leave `go/roster.json` empty for the solo run so you see the typed-name path. Each student types a different first name the first time it asks (Ana, Ben, Cara, Dev, Eli; your phone is Fay).
- Keep a notes file open. One line per thing you notice, with the module and slide number from the deck's tick bar. Send me the whole file afterwards rather than fixing as you go.

## Run each module (day two first: m5, m6, m7, m8, then m1 to m4)

- Open **ryanlamare.com/teaching/exec/gt/m5/** (and so on) in your normal profile and go full screen.
- Move through the deck with the right arrow. Say the slides aloud at speaking pace; that is the timing check.
- **When a slide shows a QR:** in every student window, on /go, tap the poll or game that matches the slide. Answer from three or four of them, then press the arrow on the deck for the reveal. Look at what each student window shows *after* answering, and what the deck shows before and after the reveal.
- **Pair games** (m2 centipede, last card and the ultimatum; m3 engines; m6 penalties, the boss battle and the inspection game, and rock paper scissors; m7 chicken and split or steal): Student 1 picks Student 2 as partner, Student 3 picks Student 4. Play one pair to the end and leave the other pair mid-game to see what an unfinished pair looks like on the deck.
- **The m1 hand** (the closing exercise): one phone per group, so answer the four cards from two student windows only, lock each in, and watch the hands land face down on the table; then walk them with the arrow key. `?demo=1` on the m1 deck URL shows eight demo hands without a room, and `?demo=1&walk=2500` walks the table by itself, one press every 2.5 seconds, to watch the cards fly.
- **The m4 dilemmas** (the closing exercise, two touches): one phone per Price Wars team, so open **ryanlamare.com/teaching/exec/gt/m4/pds/** in two student windows only, fill the four cards, lock each in, and watch the matrix cards land on The room's dilemmas; walk them with the arrow key. Later, on How would you get out of yours?, press **Open the question on the phones** and answer it from the same two windows; the chips land on the cards, then walk again. `?demo=1` on the m4 deck URL shows six demo dilemmas without a room. The Axelrod vote is an ordinary /go poll: vote from three windows, reveal the counts with the arrow, then press **Run the room's tournament** on the next slide.
- **Whole-room games** (m1 dog, number game and offers; m5 investment rounds; m7 auction; m8 car market): join from all five windows and your phone *before* pressing the key that opens the round on the deck. m8's market keys are 1, 2, 3 to open rounds, C to close, W for the warranty rule.
- **After the Top of the table slide** of each module open **ryanlamare.com/go/points** in Student 1's window and check the number matches the board.
- Once per module, tap **change** on a student's name and pick it again, to see the name-guard panel and the "that's me, on another phone" path.

## Hidden Agenda, the drills, and the run with your wife

- **Hidden Agenda needs five seats.** The m8 phone page takes rehearsal overrides, so use five *tabs* in your normal profile rather than the five profiles:
  ```
  ryanlamare.com/teaching/exec/gt/m8/game/?g=cs&t=tapas&v=seat-0001-aaaaaaaa&n=Ana
  ryanlamare.com/teaching/exec/gt/m8/game/?g=cs&t=tapas&v=seat-0002-aaaaaaaa&n=Ben
  ryanlamare.com/teaching/exec/gt/m8/game/?g=cs&t=tapas&v=seat-0003-aaaaaaaa&n=Cara
  ryanlamare.com/teaching/exec/gt/m8/game/?g=cs&t=tapas&v=seat-0004-aaaaaaaa&n=Dev
  ryanlamare.com/teaching/exec/gt/m8/game/?g=cs&t=tapas&v=seat-0005-aaaaaaaa&n=Eli
  ```
  Your phone opens **ryanlamare.com/teaching/exec/gt/m8/game/mod.html?t=tapas**. The deck's keys on the table slide are D for a day, N for a night, P to pause.
- **Play every branch once, in this order:** deal roles from the phone; night 1 where the Manipulators agree and nobody is shielded (someone leaves); day 1 with a vote that ties (they stay); night 2 where General Counsel shields the person named (dismissed); day 2 with a vote that removes; night 3 where the Manipulators pick different people (nobody leaves); then **game over** from the phone. Deal again and play a second game to the Manipulators winning. Watch the reveal, the suspicion spectrum, the recommendation and the awards on the deck each time.
- **The dead-phone drill:** during a night, close Ben's tab. On the moderator page tap **new phone** on Ben. Open a new tab with `?g=cs&t=tapas&v=seat-0099-aaaaaaaa&n=Ben`; it should land in Ben's seat with his role. Then, during a vote, use the **by hand** buttons and check the count on the deck.
- **The duplicate-name drill:** in a sixth tab use `n=ana`. It should be refused and told to add an initial.
- **Finish:** Poll Desk, reset every room including gt-names.
- **The run with your wife (next week):** reset every room first. Her phone on mobile data, not your wifi. She scans the QR off the screen, has not seen the decks, says aloud anything she has to think about, and never asks you what to tap. You run the deck and the moderator page from where you will stand. Student 1 to 4 windows fill the pairs and the table. Time each module against the estimates in STATE.md. Kill her phone once in Hidden Agenda and do the handover for real. Reset everything afterwards.
