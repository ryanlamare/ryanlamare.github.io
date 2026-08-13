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
`teaching/<course>/<week>/<lecture|live>/index.html`. There is no framework and
no build step. **Start a new deck by copying `teaching/_template/`** — it carries
the real engine and house styles, lifted from the week 6 lecture.

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

### Known wrinkle: the CSS is duplicated

Each deck inlines its own ~20 KB of CSS, and the decks have drifted (week 1 and
week 6 are only ~79% identical). There is deliberately no shared `deck.css` yet:
extracting one means deciding, per rule, whether a difference is drift or intent.
New decks inherit the template's copy. If you restyle, **you are editing one deck,
not all of them** — say so rather than implying a global change.

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

After touching any of it run `test/relay.test.js` (headless clients over real
WebSockets), `test/archive.test.js` (results, roster, storage, the API) and
`test/online.test.js` (the real UI in headless Chrome, including a mid-game
disconnect). All three start their own relay, so nothing needs to be running
first.

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
