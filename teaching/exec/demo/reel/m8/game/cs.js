/* Hidden Agenda — the two tables, in one place.

   Everything client-specific about the capstone game lives here: which
   airline each table is, who the four bidders are, and what the Backers
   are secretly loyal to. The phone page, the moderator page, the deck's
   bidder slides and the printable dossier all read this file, so a change
   from the pre-meeting with JN and BJ is one edit.

   COMPANY SLOT (RRPF). The bidders are deliberately drawn at the strategic
   layer only: each one strong on one axis and weak on another, no numbers,
   no instruments, and RRPF itself is not on either list on purpose (a room
   of RRPF people would take its side, and the honest committee's job is to
   read each other, not to defend their employer). The Manipulators' bidder is
   dealt at random by the Worker unless the moderator picks one. Bidders are
   exactly even: two strengths and two watch-outs each, and no numbers.

   Roles: m committee member, b manipulator, a auditor, c general counsel. */
const CS_TABLES = {
  tapas: {
    id: 'tapas',
    room: 'm8-cs-tapas',
    title: 'The Tapas committee',
    airline: 'Tapas Airways',
    body: 'the committee',
    choosing: 'who will finance its spare engine',
    lead: 'Tapas Airways is choosing who will finance its spare engine. You are the committee that recommends a bidder to the board.',
    bidders: [
      { k: 'A', name: 'Banco Meridiano', arch: 'The bank',
        strong: ['Lowest cost by a distance', 'The board knows banks and trusts them'],
        weak: ['Take it or leave it: nothing on the terms moves', 'Walks away at the first sign of trouble'] },
      { k: 'B', name: 'Northlake Leasing', arch: 'The lessor',
        strong: ['Reshapes the deal as the airline\u2019s needs change', 'Says yes fast'],
        weak: ['The most expensive of the four', 'Wants a claim on more of the airline\u2019s assets'] },
      { k: 'C', name: 'Kestrel Aero Finance', arch: 'The manufacturer',
        strong: ['Knows the engine better than anyone', 'Support around the engine, not just money'],
        weak: ['Slow to decide', 'Locks the airline into one supplier for years'] },
      { k: 'D', name: 'Castellane Capital', arch: 'The fund',
        strong: ['Deep pockets: could fund the next five engines too', 'Asks the fewest questions'],
        weak: ['Nobody at the airline has ever dealt with them', 'Their money may not be there next year'] },
    ],
  },
  granito: {
    id: 'granito',
    room: 'm8-cs-granito',
    title: 'The Granito management team',
    airline: 'Granito Air',
    body: 'the management team',
    choosing: 'who buys its five stored engines',
    lead: 'Granito Air is choosing who buys its five stored engines. You are the management team that recommends a buyer to the board.',
    bidders: [
      { k: 'A', name: 'AOG-247', arch: 'The cash buyer',
        strong: ['Most cash on the table, now', 'A simple sale, done in weeks'],
        weak: ['Nothing after the cheque clears', 'No help keeping the old fleet flying'] },
      { k: 'B', name: 'Skyline Engine Trading', arch: 'The partner',
        strong: ['Wants a long-term arrangement across both fleets', 'Shares the upside if the parts sell well'],
        weak: ['Less cash up front', 'Ties the airline in for years'] },
      { k: 'C', name: 'Tramontane Aviation Parts', arch: 'The fast mover',
        strong: ['Fastest turnaround, least hassle', 'Collects the engines and handles the paperwork'],
        weak: ['Pays less for the trouble it saves', 'Smaller than the others'] },
      { k: 'D', name: 'Halden Aero Materials', arch: 'The guarantor',
        strong: ['Stands behind every part it supplies', 'The strongest promise on what it sells back'],
        weak: ['Slowest to agree terms', 'Wants the engines inspected before it commits'] },
    ],
  },
};
const CS_ROLES = {
  m: { title: 'Committee Member', line: 'You\u2019re here in good faith. Find the Manipulators before they take the committee over.' },
  b: { title: 'Manipulator', line: 'You secretly back one bidder, whatever the offers say. Never reveal your agenda.' },
  a: { title: 'Auditor', line: 'Each night you can check one committee member for a hidden agenda. You can\u2019t prove what you learn.' },
  c: { title: 'General Counsel', line: 'Each night you can shield one committee member. An allegation against them that night is dismissed.' },
};
const CS_GAME = 'Hidden Agenda';
if (typeof module !== 'undefined') module.exports = { CS_TABLES, CS_ROLES, CS_GAME };
