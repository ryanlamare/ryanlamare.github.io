# ryanlamare.com

Personal academic site for J. Ryan Lamare (LSE), served by GitHub Pages from this
repo at the domain in `CNAME`. Pushing to `main` publishes; the site is live
roughly 30 seconds later.

`.nojekyll` at the repo root turns Jekyll off — the site is plain hand-written
HTML and used no Jekyll features, while Jekyll *silently* refused to publish any
path beginning with an underscore (which 404'd `teaching/_template/`). Don't
delete it. Anything that works locally but 404s live is worth checking here first.

## The one rule

**Publications live in exactly one place: `cv_data.py`.** Edit that, run
`python3 build_cv.py`, commit. Everything else regenerates.

`cv/index.html` and the marked regions of `index.html` are **generated files**.
Editing them by hand works until the next build silently overwrites you.

## How it fits together

```
cv_data.py          <-- the only file you edit for CV/publication content
     |
     |  python3 build_cv.py
     v
cv/index.html       web CV  (also the print source for the PDF)
index.html          only between <!-- BEGIN:featured --> / <!-- END:featured -->
                    and <!-- BEGIN:fullpubs --> / <!-- END:fullpubs -->
     |
     |  GitHub Actions (.github/workflows/build-cv.yml), on every push
     v
Lamare-CV.pdf       rendered from cv/index.html by weasyprint
```

`cv_template.html` holds the CV's chrome and CSS with a `<!--CV-BODY-->`
placeholder. Change how the CV *looks* there; change what it *says* in
`cv_data.py`.

WeasyPrint is **not** installed locally and does not need to be — the Action
renders the PDF. To preview locally anyway: `weasyprint cv/index.html out.pdf`.

## Adding or updating a publication

Find the right group in `PUB_GROUPS` (`Books`, `Journal Articles`,
`Articles Under Review`, `Working Papers`, `Book Chapters`,
`Reports, Reviews &amp; Other`) and add a `dict(...)`, newest first — entries are
listed in the order they appear.

```python
dict(
    y="2026",
    authors=["J. Ryan Lamare", "Jane Coauthor"],   # in order; ME is bolded on the site
    t="Title Without Quote Marks",
    u="https://doi.org/10.1234/abcd",              # None -> plain text, no link
    venue_cv="<i>ILR Review</i> 78(1): 1–25.",     # CV form, italics allowed
    venue_home=None,                               # None -> derived automatically
    icon="ic-factory",
    featured=True,                                 # optional: also in Featured Publications
    award="LERA 2027 Prize",                       # optional badge
),
```

Then:

```bash
python3 build_cv.py
```

### Conventions the builder relies on

- **Authors** are a plain list. The CV renders `A, B, and C`; the site renders
  `A, B, &amp; C` with `J. Ryan Lamare` bolded. Never hand-write those strings.
- **`venue_cv` is authoritative.** `venue_home` is derived from it: journal form
  `<i>J</i> 12(3): 4–5.` becomes `J, 12(3), 4–5.`, and chapter form
  `In A, B, eds., <i>Book</i>. City: Pub.` becomes `In A &amp; B (Eds.), Book. Pub.`
  Set `venue_home` explicitly only when the derivation gets it wrong.
- **Icons** (site only): `ic-factory` `ic-ballot` `ic-protest` `ic-scales`
  `ic-chart` `ic-megaphone` `ic-briefcase`.
- **Flags**: `eds=True` for edited volumes, `etal=True` for truncated author
  lists, `book=True` for books (title italicised instead of quoted).
- `Articles Under Review` and `Working Papers` use `dict(raw="...")` — a single
  HTML string, CV-only, not shown on the site.
- Update `UPDATED` (e.g. `"July 2026"`) when making a substantive change; it
  prints in the CV header.

### Status changes

A paper moving from under review to accepted means **two** edits: remove its
`raw=` entry from `Articles Under Review`, and add a full `dict(...)` to
`Journal Articles`. Papers do not move themselves.

## Verifying

`python3 build_cv.py --check` exits non-zero if the generated files are out of
date, and writes nothing — useful before committing.

After a push, confirm the Action went green; it commits the rebuilt PDF itself.

## Teaching decks

Slides are hand-written HTML, one self-contained file per deck, under
`teaching/<affiliation>/<course>/<week>/<lecture|live>/index.html`. There is no
framework and no build step. **Start a new deck by copying `teaching/_template/`**
— it carries the real engine and house styles, lifted from the week 6 lecture.

**The top level is affiliation, not course** (`lse/`, `illinois/`), because
keeping the three bodies of work separate is the organising constraint, and it
has to be visible in the URL. The structure does that job on its own — don't add
prose explaining the separation.

### The hub

`/teaching/` is a generated index: affiliation → course → weeks. Same pattern as
the CV, one layer thinner:

```
teaching_data.py    <-- affiliations, courses, how each reads
     |
     |  python3 build_teaching.py          (--check exits non-zero if stale)
     v
teaching/index.html                  the affiliation hub
teaching/<affiliation>/index.html
teaching/<affiliation>/<course>/index.html   the week list
```

**Weeks are in no data file.** The builder walks the course directory, finds
`week<N>/lecture/` and `week<N>/live/`, and takes each deck's name from its own
`<title>` — so the house title format (`LER 565 · Week 4 — Topic`,
`… Week 4 Live Session — Topic`) is load-bearing. Add a week folder and it
appears; there is nowhere else to update. Those four `index.html` files are
**generated** — editing them by hand works until the next build.

**Only lectures and live sessions are indexed.** Games, quizzes, brackets and
shortlist rounds stay reachable from inside a live deck during a session, and
nowhere else. The executive programme (`teaching/exec/gt/`) is deliberately
**unlisted** — no entry in `teaching_data.py` is what keeps it off the hub, and
its URLs are sent to a client rather than browsed to. (An earlier attempt lived
at `teaching/exec/rrpf/`; it failed review, was superseded by `exec/gt/`, and
was deleted on 24 Aug 2026 — it exists only in git history. Do not resurrect
its *text* as a source — with one Ryan-endorsed exception: its pd deck
(`teaching/exec/rrpf/pd/index.html` at `f945b7a^`, "Module 4 — Prisoner's
Dilemmas") is a good design reference — game staged first across several
slides, theory named afterwards, business cases in the back half, 25–95
words a slide.)

Everything under `teaching/` carries `<meta name="robots" content="noindex,nofollow">`,
including the decks. `robots.txt` does **not** disallow the path, and that is on
purpose — a crawler has to fetch a page to see its noindex, so blocking would
leave bare URLs indexable instead. The reasoning is written into `robots.txt`
itself. None of it restricts *access*: while this repo is public, every deck's
source is on GitHub. Only a private repo changes that.

### The exec game-theory programme

`teaching/exec/gt/` is the eight-module Applied Game Theory executive
programme (unlisted, like everything under `exec/`; it supersedes the deleted
`exec/rrpf/` attempt — never use that as a source). Unlike the LSE
decks, the suite shares one `deck.css` + `deck.js` — deliberate: all eight
were built together as one system, so a restyle is one edit, and Ryan approved
the centered-caps title geometry for the whole suite. **Module 1 is the
design-approved reference** — Ryan's LER 550 wording, exec-adapted with his
sign-off, an interactive beat every 3–6 slides. Modules 2–8 are faithful HTML
transfers of the 550 decks awaiting the same design pass, one module at a
time, sample-first. **Each module is a merge of LER 550 and LER 565 for
executives, minus the HR-course framing** (Ryan, 23 Aug 2026): the 550 master
supplies the wording, and the matching 565 week's lecture *and* live web decks
(`teaching/illinois/ler565/week<N>/`) supply designed figures and widgets to
lift directly — never redraw a treatment a 565 deck already has.
Slides marked COMPANY SLOT and `.swapchip` tokens are the
only client-specific parts — swap those to retarget the programme at a new
client. The 550 source pptx live in OneDrive (`Work/Teaching/LER 550/`,
read-only). **Extract only from the master, `LER 550 slides spring 2024.pptm`**
— the per-topic pptx (e.g. `Sequential Strategies powerpoint.pptx`) are student
handout versions that silently omit the games and interactive slides (Ryan,
23 Aug 2026). A module transferred from a per-topic deck must be checked
against the master's section before its design pass.

Live polls run through **`gt-poll`** (`teaching/exec/gt/poll-worker/`, a
Cloudflare Worker at gt-poll.rlamare.workers.dev — separate from the Pavilion
relay on purpose: a poll outage must never take down game night). Participants
answer at **`/go/`** (site root for a short URL, same reasoning as
`/pavilion/`); poll questions live in `/go/polls.json`, so a new poll or quiz
is a JSON entry plus a deck slide. The deck fetches counts and reveals only on
a keypress — hidden-until-reveal is client-side, and the slide falls back to
marked DEMO DATA if the Worker is unreachable. The `/reset` admin secret is a
Wrangler secret, deliberately not in this repo.

### Preview while editing

```bash
./serve.sh            # http://localhost:8000
```

Always preview through the server, never by opening the file directly: the decks
use root-absolute paths (`/brand.css`, `/edit.js`) which only resolve when served
from the site root. In VS Code, the Live Preview extension (`ms-vscode.live-server`)
renders a deck in a side panel and reloads on save. `serve.sh` also prints a LAN
address so you can check a deck on your phone or the lecture-room machine.

### Deck anatomy

The engine is ~1.8 KB of inline JS at the bottom of every deck. It expects:

- **`<section class="slide" data-i="N">`** — one per slide, `data-i` zero-based and
  matching document order. Add `cover` for a title slide (flips the tick bar to
  light). Exactly one slide carries `active` at load.
- **`<div class="ticks">`** — the progress bar, with **one `<span class="tick">` per
  slide**. These are static markup, not generated: add a slide, add a tick.
- **`[data-step="N"]`** — progressive reveal. Items with no attribute (or `0`) show
  immediately; `1, 2, 3 …` appear on successive presses. Arrow/space advances the
  step first, then moves to the next slide once the highest step has shown.
- **`<section class="sr-only">`** — **required accessible transcript**: one nested
  `<section>` per slide, in order, describing the slide *including what any figure
  shows*. Screen readers cannot follow the visual deck. Keep it in sync when
  slides are added or reordered; a deck without it is not finished.
- Slides are laid out on a fixed 1280×720 canvas and scaled to the viewport via
  the `--scale` custom property. Design to that canvas, not to a screen size.

House idioms: `.kicker` / `.tag` for the small label (with an empty `<i></i>` for
the red square), `<span class="r">` for the red word in a cover `h1`, `.sub` for
the cover subtitle, `.cap` for the caption under a figure, `.fig` for the figure
area. Icons come from an inline `<svg style="display:none">` sprite referenced by
`<use href="#id">` — copy symbols from an existing deck rather than redrawing.

### Slide voice — read before writing any deck text

**Two modes, and knowing which one you're in matters more than either rule.**

**LSE course decks — the authorship contract (22 Aug 2026): Ryan writes all
deck text himself** — in PowerPoint or plain text, with bracketed markers such
as `[pic: …]` or `[reveal one by one]`. Claude's job is mechanical conversion:
his words verbatim, visuals only where marked or where an existing 565 slide
type directly fits, and any suggestion goes back to him as a question, never
as a change. Do not draft slide text unprompted.

**The exec gt suite — the design-pass mode (23 Aug 2026, Module 1 is the
worked example):** Ryan's *existing* 550/MG478 slides are the text source
(extraction replaces authorship — he does not write fresh text), and he has
authorized: adapting delivery-context words ("this class"→"these sessions",
"students"→"people in the room"), consolidating for time *when he asks*, and
design treatments from the 565 system plus interactive widgets. Two hard
conditions: **every wording change is enumerated for his veto in the build
report**, and each module goes **sample-first** — a short block he drives and
redlines before the full build. Put open design questions to him as questions
in prose and let him answer at whatever length he likes — do **not** package
them as lettered picks or ask for "one line back" (Ryan, 31 Aug 2026: that
habit outlived whatever it was for; it takes a day to get a game right and he
wants to talk it through). Never call anything "approved" that he hasn't
approved.

Deck text is Ryan's speaking script, not display copy. Start from his own
wording in the source decks (LER 550 / MG478 / the 565 web decks) and trim;
never restyle, never re-sequence his slide order, and never invent structural
devices (planted arcs, withheld reveals) he doesn't teach with. When a source
slide carries a photo, the photo is often the joke — pull the real image from
the pptx (`ppt/media/` in the zip) instead of re-illustrating it.

Phrasings that read as AI-written are banned everywhere, titles included:

- Staccato or inverted titles ("This Morning, in Order"). Titles are complete
  headlines he would say out loud ("Roadmap for Today's Session").
- Em-dash bolt-on clauses ("A decision or a game? — and a quick poll"). If a
  dash is doing a comma's job, use the comma; if it's appending an
  afterthought, write the sentence properly or cut the afterthought.
- Quip fragment pairs ("Ten points. Well played.") and tag-on words
  ("…, promise.").
- Verbless fragments anywhere a line is spoken.

Agendas are running orders, not schedules — no clock times. The test for every
line, titles included: can Ryan say it verbatim and sound like himself?

### Known wrinkle: the CSS is duplicated

Each **LSE/Illinois** deck inlines its own ~20 KB of CSS, and the decks have
drifted (week 1 and week 6 are only ~79% identical). There is deliberately no
shared `deck.css` for them: extracting one means deciding, per rule, whether a
difference is drift or intent. New course decks inherit the template's copy. If
you restyle, **you are editing one deck, not all of them** — say so rather than
implying a global change. The exec `gt/` suite is the exception, on purpose: it
shares one `deck.css`/`deck.js` because all eight decks were built together.

### Games

`teaching/*/games/`, plus the in-lecture ones (Titan Wars, the alarm-clock and
chicken games). Plain HTML/JS, no dependencies, no build. They work offline and on
any student device, which is the point — keep it that way. State lives in the page;
GitHub Pages is static hosting and cannot run a backend, so anything genuinely
multiplayer-across-devices needs an external realtime service.

**Pavilion** (`pavilion/`, live at `/pavilion/`) is the in-house Azul-style
game, mid-build — two nations hiring craftspeople from one crowd to build rival
exhibits at the 1893 Chicago World's Fair. It lives at the site root rather than
under `teaching/ler565/` so students get a short URL — it is still an LER 565
activity. Its specs are `pavilion/PAVILION.md` (design, why) and
`pavilion/PAVILION-RULES.md` (engine spec, what) — read both before touching it.

⚠️ **The code below the copy layer is deliberately theme-neutral, and that is
not drift.** A tile has a `kind`, it comes from a `source` or the `pool`, and it
goes to a `line` or the `floor` — through `engine.js`, `bot.js`, `relay/`, the
wire format and the tests. The game is *called* Pavilion and the player sees
disciplines, agencies, the gate, crews and idle, but **every one of those words
lives in `ui.js` and nowhere else**, so a fourth theme is an edit to one file
rather than a migration of the archive (rules spec §10). Read *Theme* in
`PAVILION.md` before writing any player-facing string, and don't rename an
identifier to match the theme — that is the thing this arrangement exists to
prevent. Two exceptions, both commented: the deployed Worker's host name and its
`HeadcountRoom` class are the *deployment's* names, with live rooms behind them.

⚠️ **Theme changes are expensive and this one has moved three times.** The rule
Ryan set: **every proposed term gets a paragraph, read aloud — if the paragraph
needs "because the rules say so", the term is wrong.** Write the paragraph
before proposing the word. The three failed themes and the mechanic each one
couldn't explain are recorded in `PAVILION.md`; don't reopen them.

The **records site** (`pavilion/records/`, live at `/pavilion/records/`) is the
public half: a hand-written hub, and one stub file per league that loads
`records.js`. Every table, record and honour is a pure query in
`relay/stats.js` — if you find yourself computing a standing in a page, it
belongs there instead. Two rules that look like details and are not: the hub's
hand-written list **is** the listed/unlisted flag, and the top-five-never-a-full-
ranking rule is enforced at the point of display, not by the API.

An empty archive shows you nothing, so `node pavilion/relay/seed.js` starts a
dev relay full of plausible games (`--live` plays real ones into the deployed
relay, and refuses any term that isn't a `demo`/`test`/`trial`).

The engine is a pure seeded ES module; run the headless suites
(`node pavilion/test/engine.test.js` and `test/bot.test.js`)
before committing engine or bot changes. The board UI (`index.html`/`style.css`/`ui.js`) previews through
`./serve.sh`; `?smoke=1` on the game URL plays a full game headlessly and
stamps `SMOKE OK` into the DOM — check it in headless Chrome after UI changes.
The UI stages animations from engine state-diffs (`applyTake` vs `apply`) and
must never re-implement rules; legality always comes from `legalMoves`.

Two-device play goes through `net.js` (transport) and `relay/`
(`PROTOCOL.md` is the wire format, `README.md` is how to run it). The relay
**never runs the engine during play** — a game is `seed + move list`, so clients
decide every rule question identically and the server only orders messages and
stamps who sent them. `relay/room.js` is one state machine shared by the laptop
relay and the Cloudflare Worker; change the protocol there, not twice.

Once a game is **over**, `relay/result.js` replays it through the same
`engine.js` and derives the winner — which is a different job, and the one that
makes an archived result unforgeable. `relay/archive.js` holds the term, the
roster, every stored game and the API's one route table (shared by both hosts
the same way `room.js` is); `admin/` is the instructor's page, behind one
`ADMIN_SECRET`. **Nobody reports a result, including the instructor**, and a
game records only when a term is set and every seat picked their name off the
roster — everything else plays identically and simply doesn't record.

The **term key is the only partition**: rosters are stored per term so each
cohort keeps its own class list, but player **ids are bare name slugs and
deliberately not scoped**, so the same name is the same person across years and
an all-time Record Book is possible at all. **Voiding and deleting are different
things** — a void happened and can be restored (re-derived from the moves); a
delete should never have been archived and goes outright.

After touching any of it run `test/relay.test.js` (headless clients over real
WebSockets), `test/archive.test.js` (results, roster, storage, the API),
`test/stats.test.js` (tables, records, honours — pure, no server) and
`test/online.test.js` (the real UI in headless Chrome, including a mid-game
disconnect). They start their own relay where they need one, so nothing needs to
be running first.

## Everything else

- `index.html` outside the two marked regions (About, Media, Teaching, Contact)
  is hand-written.
- The Media and Teaching sections overlap with the CV's, but **this is
  deliberate, not drift** — the CV entries and the homepage entries serve
  different purposes and audiences, and are meant to read differently. Do not
  unify them into `cv_data.py` without being asked. Only publications are
  single-source.
- `teaching/` holds self-contained lecture decks and in-class games.
- `edit.js` is an in-browser editor for those teaching decks, authenticated with
  a GitHub token kept in the browser's localStorage. Unrelated to the CV.
