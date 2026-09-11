/* Closed Session — the two tables, in one place.

   Everything client-specific about the capstone game lives here: which
   airline each table is, who the four bidders are, and what the Backers
   are secretly loyal to. The phone page, the moderator page, the deck's
   bidder slides and the printable dossier all read this file, so a change
   from the pre-meeting with JN and BJ is one edit.

   COMPANY SLOT (RRPF). The bidders are deliberately drawn at the strategic
   layer only: each one strong on one axis and weak on another, no numbers,
   no instruments, and RRPF itself is not on either list on purpose (a room
   of RRPF people would take its side, and the honest committee's job is to
   read each other, not to defend their employer). The Backers' bidder is
   dealt at random by the Worker unless the moderator picks one.

   Roles: m committee member, b backer, a auditor, c general counsel. */
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
        strong: ['Lowest headline cost', 'A clean, familiar deal the board understands'],
        weak: ['Rigid on everything but the price', 'No interest in the airline beyond this engine'] },
      { k: 'B', name: 'Northlake Leasing', arch: 'The lessor',
        strong: ['Flexible on structure, quick to say yes', 'Has done this for airlines like Tapas before'],
        weak: ['Costs more than the bank', 'Wants more security from the airline'] },
      { k: 'C', name: 'The manufacturer’s finance arm', arch: 'The maker',
        strong: ['Knows the engine better than anyone', 'Offers support around the engine, not just money'],
        weak: ['Slow to decide', 'Ties the airline closer to one supplier'] },
      { k: 'D', name: 'Castellane Capital', arch: 'The fund',
        strong: ['Fastest to close', 'Asks the fewest questions'],
        weak: ['Unknown to the airline', 'Gone the moment the deal is signed'] },
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
      { k: 'C', name: 'Tramontane Aviation Parts', arch: 'The quick one',
        strong: ['Fastest turnaround, least hassle', 'Collects the engines and handles the paperwork'],
        weak: ['Pays less for the trouble it saves', 'Smaller than the others'] },
      { k: 'D', name: 'Halden Aero Materials', arch: 'The guarantor',
        strong: ['Stands behind every part it supplies', 'The strongest promise on what it sells back'],
        weak: ['Slowest to agree terms', 'Wants the engines inspected before it commits'] },
    ],
  },
};
const CS_ROLES = {
  m: { title: 'Committee Member', line: 'You’re here in good faith. Find the Backers before they take the committee over.' },
  b: { title: 'Backer', line: 'You secretly back one bidder, whatever the offers say. Never reveal it.' },
  a: { title: 'Auditor', line: 'Each night you can check one colleague’s true loyalty. You can’t prove what you learn.' },
  c: { title: 'General Counsel', line: 'Each night you can clear one colleague. A complaint against them that night is dismissed.' },
};
if (typeof module !== 'undefined') module.exports = { CS_TABLES, CS_ROLES };
