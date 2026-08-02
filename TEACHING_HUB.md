# Teaching hub — working memo

**Status: parked until the LER 565 class finishes (w/c 2026-08-09).** Nothing has
been built yet. This memo is the brief; pick it up here.

Goal: make the teaching materials browsable — click Teaching on the homepage,
choose an affiliation, choose a course, get its weeks — instead of the current
state, where every deck is reachable only by typing its exact URL.

---

## Decisions already made

- **Top level is affiliation, not course.** The organising constraint is keeping
  the three bodies of work separate, so that has to be visible in the URL.
- **No explanatory prose about the separation.** The structure does the work;
  writing "not an LSE course" would be defensive and draws attention to a
  distinction that should just be quietly evident.
- **Index lecture slides and live sessions only.** Games, quizzes, brackets,
  shortlist rounds and the Titan Wars memo are never listed — they stay
  reachable from inside the live decks during a session, and nowhere else.
- **Not searchable.** `robots.txt` plus `noindex` on everything under
  `/teaching/`. See the caveat below — this is weaker than it sounds while the
  repo is public.
- **Generate, don't hand-write.** A script walks `teaching/`, reads each deck's
  `<title>`, and builds the index pages — so a new week appears everywhere
  automatically, same pattern as `build_cv.py`.

## Proposed structure

```
/teaching/                 the three affiliations
  lse/                     MG478 — links to the LSE course guide until built
  illinois/                LER 565 · LER 543 (later)
  executive/               Applied Game Theory — Rolls-Royce & Partners

/teaching/illinois/ler565/ Week 1 … Week 6, each [lecture] [live session]
```

Open: `illinois` vs `uiuc` in the URL. Leaning `illinois` as more readable.

## Verified before proposing (2026-08-02)

- **Only 2 absolute links** exist in the whole teaching tree, both inside
  `exec/rrpf` (`/teaching/exec/rrpf/pd/` and `.../pd/game/`). They need
  rewriting on the move; nothing else does.
- **Game links are relative siblings** (`bracket.html`, `quiz.html`), so they
  survive intact provided each folder moves whole.
- **Deck titles are consistently formatted** (`LER 565 · Week 4 — …`,
  `LER 565 · Week 4 Live Session — …`), so the index can be generated from them
  without a separate metadata file.
- `/teaching/` and `/teaching/ler565/` currently **404** — GitHub Pages does not
  generate directory listings.
- The homepage Teaching section currently lists **only MG478**, linking out to
  LSE. None of the 23 built decks are linked from anywhere on the site.

## Open questions

1. **Private repo?** Requires a paid GitHub plan (Pro ~$4/mo); on Free, Pages
   only serves public repos. Check github.com/settings/billing. This matters
   more than it first appears — see below.
2. **Redirect stubs at the old URLs?** Class ends w/c 2026-08-09, so by the time
   this is built the current links are probably spent. Default: move cleanly,
   leave no residue. Revisit if students still hold links.
3. `illinois` or `uiuc`.

## The caveat that actually matters

`noindex` stops search engines; it does **not** stop access. Anyone with a URL
can still open anything.

More to the point: **while the site repo is public, every deck's source is on
GitHub and GitHub is itself indexed.** So `noindex` on the website does not hide
the Titan Wars memo from someone searching GitHub. If "not searchable" is a real
requirement rather than a preference, the repo going private is the change that
delivers it — not the meta tags.

## Later: revealable games

Wanted: activities visible each week but greyed out, unlocked ahead of class or
live in the session. Replacing Canvas PDFs with portable materials Ryan owns.
Three ways to do it, in increasing order of cost and strength:

1. **Cosmetic lock** — tile greyed, becomes clickable at a timestamp baked into
   the page. ~20 lines, no infrastructure, works offline. But the link sits in
   the page source and the clock is the student's, so it discourages rather than
   prevents. Fine for "don't spoil it", useless for genuinely secret content.
2. **Scheduled publish** — the game file is genuinely absent from the site until
   a scheduled GitHub Action publishes it. Nothing to find early because nothing
   is there. Uses infrastructure that already exists (the CV Action), costs
   nothing, and needs no live intervention. **Best value; start here.**
3. **Live instructor switch** — flip a game open mid-session from a phone.
   Requires the realtime service (see below). The right moment for this is the
   MG478 rebuild, where it replaces Mentimeter.

Note the interaction: with a **private** repo, option 1 becomes meaningfully
stronger, because unlisted content is no longer discoverable through GitHub.

## Also parked: live multiplayer games

For the MG478 rebuild. GitHub Pages is static and cannot run a backend, so
anything where students' devices see each other's choices needs external state —
PartyKit, Firebase, or Supabase, roughly 50 lines of JS, free tiers historically
adequate for a class. Design rules agreed: room codes not logins, no personal
data, and an offline fallback so a wifi failure degrades to the pairs-on-one-
laptop version rather than killing the session.
