# Data repository — orientation brief

**Status: thinking stage, nothing built.** Long-term. The homepage already has a
`#data` section reading "Coming soon", so the slot exists.

Goal: anyone reading a paper can find its data and code, and reproduce the
results, from ryanlamare.com — within what each data licence actually permits.

---

## The one structural decision: catalogue, not host

**Do not host the canonical copy on ryanlamare.com.** The site should link out to
proper archives. Reasons that matter to a journal and to future-you:

- **A DOI is citable and permanent.** A URL on a personal site is neither.
- **Archives version properly.** "v1.2, the one behind the published table" is a
  question a personal site cannot answer.
- **It survives you.** Change institutions, restructure the site, let a domain
  lapse — the DOI still resolves.
- **Journals increasingly require it.** ILR Review and others expect a deposited
  replication package, not a link to a personal page.

So: archives hold the artefacts; the site is the shop window that makes them
findable and explains what's in them.

## Where to deposit

- **Zenodo** — free, mints DOIs, 50 GB per record, and **connects directly to
  GitHub**: tag a release and it archives the snapshot and issues a DOI
  automatically. This is the low-effort default for code and open data.
- **Harvard Dataverse** — the social-science norm, and importantly supports
  *mediated access*: files that require a request and your approval. The right
  home for anything that can be shared but not simply published.
- **LSE Research Online** — already used for two book chapters (`eprints.lse.ac.uk`
  links in the CV). Institutional expectations may apply; worth asking the
  library what LSE requires versus recommends.
- **UK Data Service ReShare** — for UK survey-derived outputs, and already the
  counterparty for WERS.

Suggested default: **Zenodo via GitHub releases** for code, **Dataverse** when
access has to be mediated, **LSE Research Online** where the institution expects
a copy.

## Three access tiers — every project is one of these

1. **Open.** Code and data both public. Target for the FINRA coded dataset.
2. **Restricted.** Code public; data cannot be redistributed at all. WERS is
   this — UKDS licensed. The package is: all code, a precise data-availability
   statement telling a replicator how to obtain the identical extract, and any
   derived aggregates the licence *does* allow.
3. **Mediated.** Shareable on request. Dataverse handles this natively.

Every entry needs a **data availability statement**. For restricted data that
statement *is* the deliverable — it is what makes the work replicable in
principle even when the data cannot travel.

## Good news: the WERS project is already shaped like a replication package

`config.do` + `run_all.do` at the root, `make_*/analyze_*` pairs, outputs
segregated into `_output/{_data,_figures,_logs,_tables}`, and no microdata in
git. That is essentially the AEA Data Editor layout already. What it still needs
is a README carrying the data availability statement, software versions, and
expected runtime. That is a small job, not a rebuild.

## FINRA — decide the sharing question early

- The **coded dataset** is original intellectual work derived from public
  documents. Very likely publishable, and the more valuable contribution.
- The **9.5 GB scraped PDF corpus** is a different question. Bulk redistribution
  of another organisation's documents may run into their terms of use. **Check
  before planning to host it.** The safer and more useful package is the coded
  dataset plus the scraper that rebuilds the corpus from source.
- `CODING_GUIDE.md` is the methodological appendix a reviewer would want. It is
  already written, which is unusual and worth exploiting.

## The elegant tie-in

Publications already live in one place: `cv_data.py`. Adding an optional field —
say `replication="https://doi.org/..."` — to an entry could surface a
"replication package" link automatically on **the CV, the homepage publication
list, and the data repository page**, from one edit. Same single-source-of-truth
pattern already proven for publications. The `#data` section then generates
itself from whichever entries carry that field.

## Scope realism

Do **not** backfill 36 published articles. Start where the marginal cost is
lowest and the value highest:

1. **New papers from now on** — build the package as the paper is written.
2. **The two R&Rs**, since they are live and the code is current.
3. **FINRA**, when the dataset lands — likely the single most-used thing here.

## Open questions

- What does LSE require versus merely recommend for data deposit?
- Does ILR Review's replication policy set a specific format for the R&R?
- FINRA's terms on redistributing award documents in bulk.
- Zenodo or Dataverse as the primary — depends how much needs mediated access.
