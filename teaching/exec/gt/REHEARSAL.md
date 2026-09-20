# Rehearsing the programme alone

Rewritten 21 Sep 2026 for the plain suite as it is live. One person, one MacBook, one phone. Everything runs against the live site and the live Worker, exactly as on the day, so rehearsal answers land in the real rooms; the Poll Desk clears them, and the last step here is that reset. The earlier version of this file (the league, the boss battle, the networked Price Wars tester) is in git.

## Set up once

- **Two or three extra "phones" on the laptop.** A phone is whatever its browser remembers, so every Chrome *profile* is a separate phone. Click your avatar at the top right of Chrome, **Add**, **Continue without an account**, name it **Student 1**, pick a colour. Repeat for Student 2 and Student 3. Each opens as its own window with its name in the top bar. (Private windows do not work for this: they all share one identity.)
- **Your real phone is one more player**, and in Hidden Agenda it is the moderator.
- **The deck stays in your normal profile**, full screen. Right arrow or space moves on, left goes back, **F** skips or restores the flex slides. Adding `#6` to a deck's address opens its seventh slide (the count starts at zero), which saves arrowing back to a game.
- In each student window open **ryanlamare.com/go** and bookmark it. It lists every poll, then every game page. **The two module 5 vote games are not on it**; they open only from their QR or the addresses given below.
- Open **ryanlamare.com/teaching/exec/gt/poll-desk/** in your normal profile, paste the admin secret, and press **Reset every room** before you start.
- Leave `go/roster.json` empty, so you see the typed-name path. Give each student a different first name the first time it asks (Ana, Ben, Cara; your phone is Fay).
- **Keep a notes file open.** One line per thing you notice: module, slide number from the tick bar, what happened. Note everything and fix nothing as you go; the file is what the next chat works from.

## How to run a module

Open **ryanlamare.com/teaching/exec/gt/m1/** (and so on) and say the slides aloud at speaking pace. When a slide shows a QR, open the matching poll or game in the student windows from /go, answer from two or three of them, then press the arrow for the reveal. Look at what each student window shows *after* answering as well as what the deck shows. **Scan at least one QR per module with your real phone**, off the screen, so the codes themselves are tested and you see each page on a real screen.

For a **pair game**, Student 1 picks Student 2 as partner and you play both sides in two windows side by side. Play one pair to the end. If you have a third window, start a second pair with your phone and leave it unfinished, to see what a half-played pair looks like on the board.

## Module by module

- **m1.** *How familiar are you?* is the first poll of the programme and asks each phone for its name. *I'm thinking of a number*: five rounds, one guess a round. The number is already on the Worker, nothing to set; CLOSE ROUND & SHOW on the slide closes each round and wants the admin secret the first time. *Make me an offer*, twice: the phone asks how much you offer to pay for the £100, one offer per game. Equal cards takes £40 to £60; after you lose three cards only £90 or more is taken. Try one offer each side of the line in both games. The closer is a plain slide, no phones.
- **m2.** *Should you smoke?* is a poll; its count comes back as a line on the two-player tree. The three games share one page (Pick your game): take the last card, the ultimatum, the centipede. Pairing is by exact name, which is the fiddly part; watch how it goes. The centipede rules slide carries no QR; the phones are already on the page. The closer is pen and paper: nothing to rehearse but whether the blank tree on the slide is enough to start from.
- **m3.** The truel vote and the Hotelling write-in are polls (send three or four examples, two of them identical, to see the wall group them). On The engine game expressed as a payoff matrix, open **m3/solve/**: tap a pitch to cross it out, tap again to bring it back; one row and one column left takes the red box. It sends nothing and does not check the work; the answer is the next slide.
- **m4.** Price Wars sends nothing. Open **m4/price/** in two windows, one Aura and one Buco's at the same junction (better: one on the laptop, one on your phone, held up together). Pick a price, LOCK IT IN, Reveal, tap what the other side posted, and check the two ledgers agree. Meet? comes before weeks 3 and 5; after week 4 the phone stops until you tap We have heard the news. The deck's The junction, week by week is one keypress a step. After week 6 the phone shows what each station earned. **m4/rules/** is the instructions page; it still says week 6 pays double, by design, and the line that corrects it at the news is yours out loud. *Rank the strategies* is a poll; run the tournament from the button on the next slide.
- **m5.** The quiz is sixteen polls in a chain with a ten-minute timer on the slide; answer it through in two windows, then walk the two boards. Nothing shows anyone a score: the room keeps its own count, on your word. The investment game is on /go. **Whose system?** is `m5/tapas/?g=bos` and **The hub lease** is `m5/tapas/?g=chicken`. Each of the three runs the same way: reveal round 1, open round 2 from the deck after the volunteer has spoken, reveal round 2. Press forward on the board itself to open round 2; arriving on the board by address does not open it. For a full room, see the bots below.
- **m6.** Beat the keeper (alone, fifteen kicks; Top scorers should now read out of fifteen), the shootout (a pair, twenty kicks, ten each), the inspection game (a pair, eight rounds, swap halfway), rock paper scissors (flex; F skips its three slides). The phones ask for a name and go straight to the game; nobody picks a team any more.
- **m7.** *Would you take the deal?* is two polls in a row. Chicken is a pair game on a clock: six rounds of twenty seconds, and from round four a driver can hold a button to throw the wheel out; do nothing in one round to see Froze at the wheel on the board. Split or steal is a pair game in two rounds; in the second, one of the pair is given a new move the other is not told about. The auction is out loud, for £100, no phones: rehearse your opening bid and the steps. *Surround them, or leave a way out?* is a poll.
- **m8.** The car market sends nothing. Open **m8/car/** in two windows: I AM A BUYER in one; I AM A SELLER and a seller number in the other. Round 1 the seller's whole screen is the car's colour. **The seller taps ROUND 2 and ROUND 3 themselves**, which you will say out loud; in those rounds the car shows only while a finger is held down, and SHOW MY CAR is for the end of the round. **Do the held peek on your real phone**: hold, let your finger drift a little, lift, and check the car is gone every time. That is the one thing a laptop cannot tell you. Hidden Agenda has its own section below.

## A full room: bots

Two or three windows show that a game works; they do not show what a board looks like with twenty-five answers on it. For that, a script plays the phones from the terminal while you drive the deck.

- **Module 5 has them already.** Open the deck as `…/m5/?room=trial` (an ochre chip says REHEARSAL ROOM TRIAL) and run, between your presses:
  `node teaching/exec/gt/trial/m5.js --room trial invest 20`, `… votes bos 20`, `… votes chicken 20`, and `… state` to see what each room holds. `--rate 0.6` sets the share investing; `--a 0.3` the share on the first option. To sit among the bots yourself, open the phone page with the same switch: `m5/game/?room=trial`, `m5/tapas/?g=bos&room=trial`. A QR scanned off a rehearsal deck still opens the real rooms.
- **The Axelrod ranking:** `node teaching/exec/gt/trial/m4.js --room trial rank 5` posts five rankings. They go into the real poll, so reset `m4-axelrod` afterwards. The rest of that script drove the networked Price Wars and no longer applies.
- **Everything else** (the number game, the offers, the quiz, the polls, the pair games) has no bots yet. In a chat, Claude can play the room from the terminal while you drive the deck; the whole-room games and polls are short scripts on the module 5 pattern, the pair games want a bot each.
- Before a bot run, type `trial` in the Poll Desk's rehearsal box and reset, so a leftover round-two marker does not start every phone in round 2.

## Hidden Agenda

One table, you moderating. It takes **six seats** to be dealt two Manipulators (five deals one).

- The phone page takes rehearsal overrides, so use six *tabs* in one student profile, not six profiles:
  ```
  ryanlamare.com/teaching/exec/gt/m8/game/?g=cs&v=seat-0001-aaaaaaaa&n=Ana
  ryanlamare.com/teaching/exec/gt/m8/game/?g=cs&v=seat-0002-aaaaaaaa&n=Ben
  … 0003 Cara, 0004 Dev, 0005 Eli, 0006 Fay
  ```
  The first tab asks **I'M A PARTICIPANT** or **I'M AN OBSERVER**; tap participant. The profile remembers that, so tabs opened afterwards sit straight down; a tab that was already open asks too, so tap it there as well. If a tab sits nowhere the deck can see, that profile is remembering an old table: add `&t=tapas` to the address.
- Your phone opens **ryanlamare.com/teaching/exec/gt/m8/game/mod.html** with the admin secret. The deck's keys on The committee are **D** for a day, **N** for a night, **P** to pause; the clock is the deck's own, so you press N on the deck *and* START NIGHT on the phone.
- **Check on the first deal:** the name board shows your six names and none of the demo names; DEAL ROLES names two Manipulators; the moderator page says they are backing Northlake Leasing.
- **The late seat:** after the deal, open a seventh tab (`seat-0007`, `n=Gil`) and tap participant. START NIGHT 1 should name Gil, offer to drop him, and start. DEAL ROLES should ask before dealing again.
- **Play every branch once:** a night where the Manipulators agree and nobody is shielded (someone leaves); a day whose vote ties (they stay); a night where General Counsel shields the person named; a day whose vote removes; a night where the Manipulators name different people (nobody leaves); then **GAME OVER** from the phone. Watch the recommendation, the reveal of the backed bidder, and What the phones recorded.
- **The dead-phone drill:** during a night close Ben's tab, tap **new phone** on Ben on the moderator page, open a new tab with `v=seat-0099-aaaaaaaa&n=Ben`; it should land in Ben's seat with his role. During a vote, use the **by hand** buttons and check the count on the deck.
- **The duplicate-name drill:** a tab with `n=ana` should be refused and told to add an initial.
- The printed script is linked from the moderator page (Printed script). Read it through once against what you actually did.

## Finish

Poll Desk, **Reset every room**, gt-names included, and the `trial` rehearsal rooms if you used them. Then send the notes file.

The day-of list (pens and paper, the two ends of the room, sellers counting off, ten or eleven at the table, the secret on your phone) is section 8 of `AUDIT-2026-09-20.md`.
