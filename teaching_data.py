# -*- coding: utf-8 -*-
"""What the teaching hub says. The only file you edit for hub content.

Weeks are NOT listed here: build_teaching.py walks the course directory and
reads each deck's <title>, so a new week appears in the index the moment the
folder exists. What lives here is the framing a directory walk cannot know —
which affiliations exist, which courses sit under them, and how each is
described.

Run `python3 build_teaching.py` after editing.

Deliberately absent: teaching/exec/rrpf/ (the Rolls-Royce & Partners Finance
executive programme). It stays at its own URL, unlisted, and is sent to a
client directly rather than browsed to. Adding an entry here is what would
list it.
"""

# Prints in the hub footer. Update when the hub gains or loses a course.
UPDATED = "August 2026"

AFFILIATIONS = [
    dict(
        slug="lse",
        short="LSE",
        name="London School of Economics and Political Science",
        unit="Department of Management",
        courses=[
            dict(
                code="MG478",
                title="The Management of People in Global Companies",
                level="MSc · Convenor",
                blurb=(
                    "Core course on the MSc in Human Resources and Organisations, "
                    "examining how strategy (namely game theory), culture, and "
                    "technology shape the management of people in multinational firms."
                ),
                # No dir= yet: the course guide stands in until the decks are built.
                external="https://www.lse.ac.uk/resources/calendar2025-2026/courseGuides/MG/2025_MG478.htm",
                external_label="LSE course guide",
            ),
        ],
    ),
    dict(
        slug="illinois",
        short="Illinois",
        name="University of Illinois Urbana-Champaign",
        unit="School of Labor and Employment Relations",
        courses=[
            dict(
                code="LER 565",
                title="Game Theory and HR Strategy",
                level="Graduate",
                term="Summer 2026",
                blurb=(
                    "Six weeks of applied game theory for human resources — "
                    "sequential and zero-sum play, the prisoner's dilemma, "
                    "coordination, information asymmetries, and strategic moves. "
                    "Each week runs as a lecture and a live session."
                ),
                dir="illinois/ler565",
            ),
        ],
    ),
]
