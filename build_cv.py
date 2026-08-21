# -*- coding: utf-8 -*-
"""Build the CV and the site's publication lists from cv_data.py.

    python3 build_cv.py

Writes:
    cv/index.html   the web CV (and, via @media print, the source for the PDF)
    index.html      only the regions between the BEGIN:/END: marker comments

The PDF (Lamare-CV.pdf) is rendered from cv/index.html by weasyprint. That runs
automatically in GitHub Actions on every push, so you do not need weasyprint
installed locally. To do it by hand:  weasyprint cv/index.html Lamare-CV.pdf

Never hand-edit cv/index.html or the marked regions of index.html: this script
overwrites them. Edit cv_data.py instead.
"""
import os
import re
import sys

import cv_data as D

HERE = os.path.dirname(os.path.abspath(__file__))

# CV group title -> label used on the website. None means "CV only".
HOME_GROUPS = {
    "Books": "Books",
    "Journal Articles": "Journal articles",
    "Articles Under Review": None,
    "Working Papers": None,
    "Book Chapters": "Book chapters",
    "Reports, Reviews &amp; Other": "Reports, reviews &amp; other",
}


# --------------------------------------------------------------------- authors
def authors_cv(rec):
    """'A, B, and C' — the CV's house style."""
    names = list(rec["authors"])
    if rec.get("etal"):
        s = ", ".join(names) + ", et al"
    elif len(names) == 1:
        s = names[0]
    elif len(names) == 2:
        s = f"{names[0]} and {names[1]}"
    else:
        s = ", ".join(names[:-1]) + ", and " + names[-1]
    if rec.get("eds"):
        s += ", eds"
    return s


def authors_home(rec):
    """Same list, ampersands instead of 'and', with ME bolded."""
    names = [
        f'<span class="me">{n}</span>' if n == D.ME else n for n in rec["authors"]
    ]
    if rec.get("etal"):
        s = ", ".join(names) + ", et al."
    elif len(names) == 1:
        s = names[0]
    elif len(names) == 2:
        s = f"{names[0]} &amp; {names[1]}"
    else:
        s = ", ".join(names[:-1]) + ", &amp; " + names[-1]
    if rec.get("eds"):
        s += " (Eds.)"
    return s


# ---------------------------------------------------------------------- venues
J_CV = re.compile(r"^<i>(?P<n>.+?)</i>\s+(?P<vol>[\w–-]+)(?:\((?P<iss>[^)]*)\))?:\s*(?P<pg>[^.]+)\.$")
C_CV = re.compile(r"^In (?P<ed>.+?), eds?\., <i>(?P<bk>.+?)</i>\.\s*(?P<rest>.*)$")


def venue_home(rec):
    """The site's venue string. Stored value wins; otherwise derive from the CV form.

    Derivation covers the two regular shapes:
      <i>Journal</i> 12(3): 4-5.        ->  Journal, 12(3), 4-5.
      In A, B, eds., <i>Book</i>. City: Pub.  ->  In A &amp; B (Eds.), Book. Pub.
    Anything irregular falls back to simply dropping the italics, which is what
    the hand-written entries did. Set venue_home explicitly to override.
    """
    if rec.get("venue_home"):
        return rec["venue_home"]
    v = rec["venue_cv"]

    m = J_CV.match(v)
    if m:
        iss = f"({m.group('iss')})" if m.group("iss") else ""
        return f"{m.group('n')}, {m.group('vol')}{iss}, {m.group('pg')}."

    m = C_CV.match(v)
    if m:
        eds = [e.strip() for e in re.sub(r",?\s+and\s+", ", ", m.group("ed")).split(", ")]
        if len(eds) > 4:
            ed_s = f"{eds[0]} et al."
        elif len(eds) == 1:
            ed_s = eds[0]
        elif len(eds) == 2:
            ed_s = f"{eds[0]} &amp; {eds[1]}"
        else:
            ed_s = ", ".join(eds[:-1]) + ", &amp; " + eds[-1]
        label = "(Ed.)" if len(eds) == 1 else "(Eds.)"
        rest = m.group("rest")
        rest = re.sub(r"^[A-Z][\w .,]*?:\s*", "", rest)  # drop "London: " etc.
        return f"In {ed_s} {label}, {m.group('bk')}. {rest}"

    return re.sub(r"</?i>", "", v)


# ------------------------------------------------------------------ CV rendering
def cv_row(year, it, url):
    if url:
        return (
            f'<a class="row rowlink" href="{url}">'
            f'<div class="yr">{year}</div><div class="it">{it}</div></a>'
        )
    return f'<div class="row"><div class="yr">{year}</div><div class="it">{it}</div></div>'


def cv_pub_it(rec):
    a = authors_cv(rec)
    if rec.get("book"):
        title = f'<span class="lt"><i>{rec["t"]}</i></span>'
    else:
        title = f'“<span class="lt">{rec["t"]}</span>”'
    v = f' {rec["venue_cv"]}' if rec["venue_cv"] else ""
    s = f"{a}. {title}.{v}"
    if rec.get("replication"):
        s += f' Replication: {rec["replication"].removeprefix("https://")}.'
    return s


def render_cv_body():
    p = D.PROFILE
    out = [
        f'<div class="head"><div class="name">{p["name"]}</div>'
        f'<div class="updated">Updated {D.UPDATED}</div></div>',
        f'<div class="role">{p["role"]}</div>',
        f'<div class="dept">{p["dept"]}</div>',
        f'<div class="contact">{p["contact"]}</div>',
    ]
    for b in D.BLOCKS:
        kind = b[0]
        if kind == "h2":
            out.append(f"<h2{b[2] or ''}>{b[1]}</h2>")
        elif kind == "h3":
            out.append(f"<h3>{b[1]}</h3>")
        elif kind == "note":
            out.append(f'<div class="note"{b[2] or ""}>{b[1]}</div>')
        elif kind == "row":
            out.append(cv_row(b[1], b[2], b[3]))
        elif kind == "PUBS":
            for gtitle, items in D.PUB_GROUPS:
                out.append(f"<h3>{gtitle}</h3>")
                for rec in items:
                    if "raw" in rec:
                        out.append(cv_row(rec["y"], rec["raw"], rec["u"]))
                    else:
                        out.append(cv_row(rec["y"], cv_pub_it(rec), rec["u"]))
        else:
            raise ValueError(f"unknown block: {kind}")
    return "\n" + "\n".join(out) + "\n"


def build_cv():
    tpl = open(os.path.join(HERE, "cv_template.html"), encoding="utf-8").read()
    html = tpl.replace("\n<!--CV-BODY-->\n", render_cv_body())
    return html


# ------------------------------------------------------------- site rendering
def home_article(rec, indent="      "):
    icon = rec.get("icon") or "ic-papers"
    if rec["u"]:
        title = (
            f'<a class="pub-link" href="{rec["u"]}" target="_blank" '
            f'rel="noopener">{rec["t"]}</a>'
        )
    else:
        title = rec["t"]
    award = (
        f'\n{indent}  <span class="pub-award">{rec["award"]}</span>'
        if rec.get("award")
        else ""
    )
    repl = (
        f'\n{indent}  <div><a class="pub-repl" href="{rec["replication"]}" '
        f'target="_blank" rel="noopener">Replication: '
        f'{rec["replication"].removeprefix("https://")}</a></div>'
        if rec.get("replication")
        else ""
    )
    return (
        f'{indent}<article class="pub"><div class="pub-year">{rec["y"]}'
        f'<span class="pub-ic" aria-hidden="true"><svg viewBox="0 0 64 64">'
        f'<use href="#{icon}"></use></svg></span></div><div>\n'
        f'{indent}  <div class="pub-title">{title}</div>\n'
        f'{indent}  <div class="pub-authors">{authors_home(rec)}</div>\n'
        f'{indent}  <div class="pub-venue">{venue_home(rec)}</div>{repl}{award}'
        f"</div></article>"
    )


def render_featured():
    recs = [
        r
        for _, items in D.PUB_GROUPS
        for r in items
        if r.get("featured") and "raw" not in r
    ]
    return "\n\n".join(home_article(r) for r in recs)


def render_fullpubs():
    out = []
    for gtitle, items in D.PUB_GROUPS:
        label = HOME_GROUPS.get(gtitle, gtitle)
        if label is None:
            continue
        pubs = [r for r in items if "raw" not in r]
        if not pubs:
            continue
        out.append(
            '    <div class="pub-group reveal">\n'
            '      <button class="pub-toggle" aria-expanded="false">\n'
            f'        <span class="mono">{label}</span>\n'
            '        <span class="pub-chevron" aria-hidden="true">+</span>\n'
            "      </button>\n"
            '      <div class="pub-list"><div class="pub-list-inner">\n\n'
            + "\n\n".join(home_article(r) for r in pubs)
            + "\n    </div></div>\n    </div>"
        )
    return "\n\n".join(out)


def splice(text, name, payload):
    begin, end = f"<!-- BEGIN:{name} -->", f"<!-- END:{name} -->"
    pat = re.compile(re.escape(begin) + r".*?" + re.escape(end), re.S)
    if not pat.search(text):
        sys.exit(f"ERROR: markers {begin} / {end} not found in index.html")
    return pat.sub(lambda _: f"{begin}\n{payload}\n{end}", text)


def build_home():
    p = os.path.join(HERE, "index.html")
    t = open(p, encoding="utf-8").read()
    t = splice(t, "featured", render_featured())
    t = splice(t, "fullpubs", render_fullpubs())
    return t


# ---------------------------------------------------------------------- main
def main():
    check = "--check" in sys.argv

    targets = [
        (os.path.join(HERE, "cv", "index.html"), build_cv()),
        (os.path.join(HERE, "index.html"), build_home()),
    ]
    changed = []
    for path, new in targets:
        old = open(path, encoding="utf-8").read() if os.path.exists(path) else None
        if old != new:
            changed.append(os.path.relpath(path, HERE))
            if not check:
                open(path, "w", encoding="utf-8").write(new)

    n = sum(len([r for r in items if "raw" not in r]) for _, items in D.PUB_GROUPS)
    print(f"{n} publications across {len(D.PUB_GROUPS)} groups")
    if check:
        print("CHANGED:" if changed else "up to date:", changed or "no differences")
        sys.exit(1 if changed else 0)
    print("wrote:", ", ".join(changed) if changed else "nothing (already up to date)")


if __name__ == "__main__":
    main()
