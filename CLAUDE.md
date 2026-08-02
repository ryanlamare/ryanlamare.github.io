# ryanlamare.com

Personal academic site for J. Ryan Lamare (LSE), served by GitHub Pages from this
repo at the domain in `CNAME`. Pushing to `main` publishes; the site is live
roughly 30 seconds later.

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

## Everything else

- `index.html` outside the two marked regions (About, Media, Teaching, Contact)
  is hand-written. The Media and Teaching sections **duplicate** content that
  also lives in the CV — if you change one, check the other.
- `teaching/` holds self-contained lecture decks and in-class games.
- `edit.js` is an in-browser editor for those teaching decks, authenticated with
  a GitHub token kept in the browser's localStorage. Unrelated to the CV.
- `gen_cv.py` is the **superseded** CV generator from before this pipeline
  existed. Kept only for reference; do not run it — it writes to a path that no
  longer exists and uses the old Archivo styling.
