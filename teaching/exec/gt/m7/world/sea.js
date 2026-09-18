/* ---- Module 7's closing exercise, the room view: a seafarer's chart (Ryan's
   idea, 18 Sep 2026). Odysseus had himself bound to the mast so that he
   could sail past the Sirens: the oldest commitment device there is. Every
   phone that sends (world/, room m7-world) is a ship that sails in from the
   edge of the chart and circles the Sirens' rock. The SAIL is the colour of
   the module the game came from, the PENNANT is the kind of move, the hull
   is the phone's own (world/ships.js, shared with the phone page).

   A click on a ship opens it from the side, the answers written on the ship
   itself: the game on the hull, the move on the sail, what makes it credible
   inside the rope at the mast, the downside under the
   waterline where a monster coils. No name is shown until WHOSE SHIP IS THIS? is clicked.

   Then the odyssey (Ryan, 18 Sep, late): a click on Troy sends the whole
   fleet there to gather, as in the book, and then round the trials in turn,
   the Cyclops, Charybdis, Scylla. At each
   the ships gather and hold a moment, then the ones fated to be wrecked
   there flare red, roll over and go down, leaving a wreck on the chart (still
   clickable), and the rest sail on. One ship makes it home to Ithaca and a
   banner names its pair. The fates are drawn from a seed of the room and the
   fleet's size, so a reload replays the same voyage to its end state. It is
   luck and nothing else: nobody is judged and nothing is scored.

   With a ship open, Esc, the arrow keys, space or a click outside close it;
   with none open the keys move on as usual. ?demo=1 keeps the invented
   fleet; ?room=<x> reads the rehearsal room m7-world-<x>. ALL TEXT in DEMO
   is invented and nothing depends on it. Every SVG node is made with
   createElementNS and moved by its transform attribute (no innerHTML on
   SVG, no CSS transforms on SVG). Expects POLL_API, M7SUF and M7_SHIPS. ---- */
(function(){
  const $=id=>document.getElementById(id), svg=$('seaSvg');
  if(!svg)return;
  const slide=svg.closest('.slide'), NS='http://www.w3.org/2000/svg', S=window.M7_SHIPS;
  function mk(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);(parent||svg).appendChild(e);return e;}
  function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
  const INK='#1B1C19', PAPER='#E9E2D2', SOFT='#F0EAD9', RED='#CE1E32', OCHRE='#C9A227', TEAL='#59949C', BLUE='#37658A',
        GREEN='#26713D', SIENNA='#8E3E28', LAND='#DDCBA2', SEA='#CFDDD6', MUTED='#6A5F59';

  const NAMES='Sam,Priya,Marcus,Elena,Tom,Aisha,Ben,Chloe,Daniel,Farah,George,Hannah,Ivan,Jess,Karim,Laura,Mike,Nadia,Owen,Rosa,Theo,Uma,Vik,Wen'.split(',');
  /* module, kind, the game, the move, what makes it credible, the downside */
  const E=[
    [2,'t','I need a price cut from our parts supplier, and they can accept, reject or counter','Unless the price comes down, we move the contract to their rival when it renews','We have already qualified the rival’s parts, and they know it','The rival learns we need them, and their price goes up too'],
    [4,'p','We and the other lessor keep undercutting each other on the same airlines','If they hold their rates this quarter, we hold ours','We publish our rate card, so any cut would be seen at once','It looks like collusion to a regulator'],
    [5,'c','Two teams, one launch date, and neither wants to move first','We announce our date to customers before the planning meeting','Customers have it in writing','If we slip, we slip in public'],
    [3,'c','Dividing the maintenance budget with the other division','We tell finance our number before the meeting, and we do not move from it','Our director signed it off in front of theirs','If the pot shrinks, our number looks greedy and we cannot trim it'],
    [2,'p','I need two extra engineers from my director','If I get them, I deliver a month early','The date goes into my objectives','A month early on this means a month late on something else'],
    [4,'t','Two bidders who keep sweetening the terms for the same customer','If they add free maintenance again, we match it on every one of their accounts','We did it once, last year','It costs us more than it costs them'],
    [5,'c','Which system the two offices standardise on','We migrate our office first, before the decision','The old system is switched off','If head office picks the other one, we pay twice'],
    [0,'p','A key engineer is deciding whether to stay','If she stays through the project, the lead role is hers','It is announced to the team now','Two others wanted that role'],
    [2,'c','The airline wants a lower rate at every renewal','We tell them the rate is the rate, and show them the list','Every customer sees the same list','We lose the one customer who really would have walked'],
    [4,'p','Neither department wants to give up headcount first','If they release one post, we release one','Both posts go to the same committee on the same day','The committee takes both and gives neither back'],
    [3,'t','A customer disputes every invoice to delay payment','The next disputed invoice goes straight to arbitration','It is in the new contract','Arbitration is slow, and it sours the account'],
    [5,'c','Who takes the early slot at the shared hangar','We book our slot for the whole year in advance','The deposit is not refundable','A quiet month, and we have paid for an empty hangar'],
    [2,'t','I need sign-off from legal, and they keep countering','If it is not signed by Friday, the deal team goes to outside counsel','The budget for outside counsel is already approved','Legal stops doing us favours'],
    [4,'c','A price war with the other repair shop','We sign a most-favoured-customer clause with our biggest account','It is in the contract, and the rival has heard about it','Every discount we ever give now costs us twice'],
    [0,'c','My own habit of reopening decisions the night before','I send the decision to the client before I go home','It is in their inbox','Sometimes the second thought was the right one'],
    [5,'p','Two suppliers who both need to invest for the new part to work','If they tool up, we guarantee the first two years of orders','The guarantee is signed by our finance director','If the part is delayed, we are buying things we cannot use'],
    [3,'c','Splitting the engine shop’s hours with the other fleet','We move our engines in on the first of the month, every month','Our aircraft are already scheduled around it','We cannot take a better slot when one comes up'],
    [2,'p','I need a yes from the union on the new roster','If they accept the roster, no compulsory weekends this year','It goes into the agreement','A busy summer with nobody we can call in'],
    [4,'t','The other airline keeps poaching our trained crew','For every pilot they take, we make offers to two of theirs','We have done it before','Wages go up for everyone, us included'],
    [5,'c','Which of us travels to the other for the quarterly review','I book the room here for the year','The invitations are already accepted','They stop coming in person'],
    [0,'t','A tenant who is always a month late','One more late payment and the lease is not renewed','It was said in front of their board','An empty unit is worse than a late payer'],
    [2,'c','I need a decision from the steering group, and it keeps deferring','We tell the client the go-live date today','The client has planned around it','The steering group feels bounced, and remembers'],
    [3,'p','Sharing out the bonus pool between two teams','If they take the smaller share this year, they choose first next year','It is minuted','Next year’s pool might be half the size'],
    [5,'c','Both of us waiting for the other to set the agenda','I circulate mine a week early','Everyone has read it','I have shown my hand'],
  ];
  const DEMO=E.map((e,i)=>({v:'demo'+i,name:NAMES[i],name2:NAMES[(i+12)%NAMES.length],module:e[0],kind:e[1],game:e[0]?S.GAME[e[0]]:e[2],move:e[3],cred:i%4===3?e[4]:S.CRED[['ct','rp','mo'][i%4]],down:e[5],done:true}));
  const demoOnly=/[?&]demo=1/.test(location.search);
  const ROOM='m7-world'+(window.M7SUF||'');
  const st={live:false,list:[],demoShown:0};

  /* ================= the chart ================= */
  const CX=620, CY=392, RX=480, RY=190, RINGS=[0.56,0.78,1.0], CAP=[7,10,13];
  const F=36, FB=720-52;                         /* the neatline's inset; its bottom edge, clear of the deck's tick bar */
  mk('rect',{x:0,y:0,width:1280,height:720,fill:SOFT});
  const defs=mk('defs',{});
  const clip=mk('clipPath',{id:'seaClip'},defs);mk('rect',{x:F,y:F,width:1280-2*F,height:FB-F},clip);
  mk('rect',{x:F,y:F,width:1280-2*F,height:FB-F,fill:SEA});
  const chart=mk('g',{'clip-path':'url(#seaClip)'});

  /* rhumb lines from two roses, as on a portolan */
  (function(){const g=mk('g',{stroke:INK,'stroke-width':.8,opacity:.13},chart);
    [[930,100],[330,330]].forEach(c=>{for(let i=0;i<32;i++){const a=i*Math.PI/16;mk('line',{x1:c[0],y1:c[1],x2:c[0]+Math.cos(a)*1600,y2:c[1]+Math.sin(a)*1600},g);}});})();

  /* wavelets, scattered, drifting a little */
  const waves=mk('g',{fill:'none',stroke:TEAL,'stroke-width':1.6,'stroke-linecap':'round',opacity:.55},chart);
  (function(){const r=rng(7);for(let i=0;i<120;i++){const x=F+20+r()*(1280-2*F-60), y=F+20+r()*(720-2*F-40), w=7+r()*6;
    if((x>960&&y<280)||(x<250&&y>560)||(x<260&&y>110&&y<250)||(x>690&&x<1000&&y<170)||(x>1070&&y>530)||(Math.abs(x-CX)<150&&Math.abs(y-CY)<66))continue;
    mk('path',{d:'M'+x.toFixed(0)+' '+y.toFixed(0)+' q'+(w/2).toFixed(1)+' -5 '+w.toFixed(1)+' 0 q'+(w/2).toFixed(1)+' 5 '+w.toFixed(1)+' 0'},waves);}})();

  /* Ithaca, top right: home */
  (function(){const g=mk('g',{},chart);
    mk('path',{d:'M1072 36 C1060 70 1086 92 1080 120 C1076 150 1110 176 1150 170 C1196 190 1230 160 1244 150 L1244 36 Z',fill:LAND,stroke:INK,'stroke-width':2.5,'stroke-linejoin':'round'},g);
    mk('path',{d:'M1064 60 C1054 84 1074 100 1068 124 C1066 158 1104 186 1148 180 C1190 198 1224 176 1244 162',fill:'none',stroke:INK,'stroke-width':1,'stroke-dasharray':'2 4',opacity:.6},g);
    /* hills */
    mk('path',{d:'M1150 92 l18 -30 l16 30 M1178 92 l22 -40 l22 40',fill:LAND,stroke:INK,'stroke-width':2,'stroke-linejoin':'round'},g);
    /* a little temple */
    const t=mk('g',{transform:'translate(1112 118)'},g);
    mk('path',{d:'M-18 0 H18 M-16 -22 H16 M-18 -22 L0 -34 L18 -22 Z',fill:PAPER,stroke:INK,'stroke-width':2,'stroke-linejoin':'round'},t);
    [-12,-4,4,12].forEach(x=>mk('line',{x1:x,y1:0,x2:x,y2:-22,stroke:INK,'stroke-width':2.5},t));
    /* an olive tree */
    mk('line',{x1:1200,y1:132,x2:1200,y2:116,stroke:INK,'stroke-width':2.5},g);mk('circle',{cx:1200,cy:108,r:10,fill:GREEN,stroke:INK,'stroke-width':1.5},g);
    /* jetties out to the near berths */
    [[1076,58,1052,60],[1084,102,1062,104],[1082,142,1066,146],[1100,170,1092,184],[1138,176,1136,202],[1182,184,1184,208],[1222,172,1228,192]].forEach(j=>{
      mk('line',{x1:j[0],y1:j[1],x2:j[2],y2:j[3],stroke:INK,'stroke-width':5,'stroke-linecap':'round'},g);mk('line',{x1:j[0],y1:j[1],x2:j[2],y2:j[3],stroke:SIENNA,'stroke-width':2.4,'stroke-linecap':'round'},g);});
    const tx=mk('text',{x:1160,y:156,'text-anchor':'middle','font-family':'Jost, sans-serif','font-weight':700,'font-size':13,'letter-spacing':'.3em',fill:INK},g);tx.textContent='ITHACA';
  })();

  /* the Odyssey's trials, dotted round the chart (Ryan, 18 Sep, in place of
     here be dragons): Troy where the voyage starts, the Cyclops, Scylla and
     Charybdis, and Ithaca where it ends. Nothing on the chart harms a ship. */
  const trials=mk('g',{},chart);
  /* Troy, top left, under the cartouche: walls, and the horse outside them */
  (function(){const g=mk('g',{id:'seaTroy'},trials);
    mk('path',{d:'M36 128 C90 126 116 150 124 182 C132 212 114 238 36 240 Z',fill:LAND,stroke:INK,'stroke-width':2.5,'stroke-linejoin':'round'},g);
    mk('path',{d:'M48 168 H108 V206 H48 Z',fill:'#C4673D',stroke:INK,'stroke-width':2},g);
    [48,60,72,84,96].forEach(x=>mk('rect',{x,y:162,width:7,height:8,fill:'#C4673D',stroke:INK,'stroke-width':1.5},g));
    mk('rect',{x:94,y:146,width:16,height:24,fill:'#C4673D',stroke:INK,'stroke-width':2},g);
    mk('path',{d:'M72 206 V190 a6 6 0 0 1 12 0 V206 Z',fill:INK},g);
    /* the horse, on wheels */
    const h=mk('g',{transform:'translate(150 214)'},g);
    mk('path',{d:'M-22 -4 H16 V-22 H-22 Z M12 -22 L18 -40 H30 L32 -32 L24 -30 L22 -22 Z',fill:SIENNA,stroke:INK,'stroke-width':2,'stroke-linejoin':'round'},h);
    mk('path',{d:'M-18 -4 V10 M-8 -4 V10 M4 -4 V10 M12 -4 V10',stroke:SIENNA,'stroke-width':4,'stroke-linecap':'round'},h);
    mk('path',{d:'M-18 -4 V10 M-8 -4 V10 M4 -4 V10 M12 -4 V10',stroke:INK,'stroke-width':1.2,'stroke-linecap':'round',opacity:.5},h);
    mk('path',{d:'M-26 12 H20',stroke:INK,'stroke-width':2.5},h);
    [-20,-2,14].forEach(x=>{mk('circle',{cx:x,cy:14,r:5,fill:OCHRE,stroke:INK,'stroke-width':1.8},h);});
    mk('circle',{cx:27,cy:-36,r:1.4,fill:INK},h);
    mk('path',{d:'M16 -22 H-22 M-4 -22 V-4',stroke:INK,'stroke-width':1,opacity:.5},h);
  })();
  /* the Cyclops, bottom left: a rocky shore, his cave, his sheep, and the giant himself */
  const cyclops=mk('g',{transform:'translate(36 668) scale(.7) translate(-36 -668)'},trials);
  (function(){const g=cyclops;
    /* the giant stands behind the shore */
    mk('path',{d:'M104 668 L112 560 C112 538 188 538 188 560 L196 668 Z',fill:SIENNA,stroke:INK,'stroke-width':2.5,'stroke-linejoin':'round'},g);
    mk('path',{d:'M186 556 C204 540 216 520 226 500',stroke:'#D9A878','stroke-width':16,'stroke-linecap':'round'},g);
    mk('path',{d:'M186 556 C204 540 216 520 226 500',stroke:INK,'stroke-width':2.5,fill:'none',opacity:0},g);
    mk('path',{d:'M112 560 C100 580 96 604 98 626',stroke:'#D9A878','stroke-width':14,'stroke-linecap':'round'},g);
    /* the boulder */
    mk('path',{d:'M208 478 L232 466 L256 476 L262 500 L246 514 L218 510 L204 496 Z',fill:'#8A8174',stroke:INK,'stroke-width':2.5,'stroke-linejoin':'round'},g);
    mk('path',{d:'M232 466 L238 490 L262 500 M238 490 L218 510',stroke:INK,'stroke-width':1.2,fill:'none',opacity:.5},g);
    /* the head, one eye */
    mk('circle',{cx:150,cy:506,r:32,fill:'#D9A878',stroke:INK,'stroke-width':2.5},g);
    mk('path',{d:'M124 486 C130 468 170 468 176 486 L170 480 L160 486 L150 478 L140 486 L130 480 Z',fill:INK},g);
    mk('circle',{cx:150,cy:504,r:12,fill:PAPER,stroke:INK,'stroke-width':2.5},g);mk('circle',{cx:151,cy:505,r:6,fill:INK},g);
    mk('path',{d:'M134 490 L166 488',stroke:INK,'stroke-width':4,'stroke-linecap':'round'},g);
    mk('path',{d:'M138 526 Q150 520 162 526',stroke:INK,'stroke-width':2.5,fill:'none','stroke-linecap':'round'},g);
    /* the shore in front of him */
    mk('path',{d:'M36 560 C120 566 200 590 262 620 C300 638 330 656 330 668 L36 668 Z',fill:LAND,stroke:INK,'stroke-width':2.5,'stroke-linejoin':'round'},g);
    mk('path',{d:'M60 668 C60 626 130 626 130 668 Z',fill:INK},g);
    [[190,624],[224,640],[258,656]].forEach(p=>{mk('ellipse',{cx:p[0],cy:p[1],rx:11,ry:7,fill:PAPER,stroke:INK,'stroke-width':1.8},g);mk('circle',{cx:p[0]+11,cy:p[1]-3,r:4,fill:INK},g);
      mk('path',{d:'M'+(p[0]-6)+' '+(p[1]+6)+' v5 M'+(p[0]+4)+' '+(p[1]+6)+' v5',stroke:INK,'stroke-width':2},g);});
  })();
  /* Scylla and Charybdis, the strait along the top */
  let whirl=null;
  (function(){const g=mk('g',{},trials);
    mk('path',{d:'M700 36 L702 66 C716 100 738 112 770 114 C802 116 822 92 832 36 Z',fill:'#8A8174',stroke:INK,'stroke-width':2.5,'stroke-linejoin':'round'},g);
    mk('path',{d:'M740 36 L748 100 M790 36 L784 104',stroke:INK,'stroke-width':1.2,opacity:.5},g);
    const neck=(d,hx,hy,flip)=>{mk('path',{d,fill:'none',stroke:INK,'stroke-width':10,'stroke-linecap':'round'},g);mk('path',{d,fill:'none',stroke:GREEN,'stroke-width':6.5,'stroke-linecap':'round'},g);
      const h=mk('g',{transform:'translate('+hx+' '+hy+') scale('+(flip?-1:1)+' 1)'},g);
      mk('path',{d:'M-8 -6 C-2 -12 10 -10 12 -2 L6 2 L-4 4 Z',fill:GREEN,stroke:INK,'stroke-width':2,'stroke-linejoin':'round'},h);
      mk('path',{d:'M12 -2 l9 -3 l-4 4 l5 3 l-10 0',fill:RED,stroke:INK,'stroke-width':1.2,'stroke-linejoin':'round'},h);
      mk('circle',{cx:0,cy:-5,r:2.2,fill:PAPER,stroke:INK,'stroke-width':1},h);mk('circle',{cx:.6,cy:-5,r:1,fill:INK},h);};
    neck('M770 100 C800 96 830 70 852 54',852,54,false);
    neck('M776 104 C812 108 840 96 866 92',866,92,false);
    neck('M772 108 C790 130 818 138 846 134',846,134,false);
    neck('M760 106 C740 128 728 136 706 140',706,140,true);
    /* the whirlpool turns */
    whirl=mk('g',{},g);
    const WX=1150, WY=590;let d='M'+WX+' '+WY;for(let i=0;i<=170;i++){const a=i*0.22, r=2+i*0.26;d+=' L'+(WX+Math.cos(a)*r*1.3).toFixed(1)+' '+(WY+Math.sin(a)*r*0.8).toFixed(1);}
    mk('ellipse',{cx:WX,cy:WY,rx:62,ry:40,fill:BLUE,opacity:.25},whirl);
    mk('path',{d,fill:'none',stroke:BLUE,'stroke-width':2.6,'stroke-linecap':'round'},whirl);
    mk('path',{d,fill:'none',stroke:PAPER,'stroke-width':1,'stroke-linecap':'round',opacity:.7,transform:'rotate(180 '+WX+' '+WY+')'},whirl);
    mk('circle',{cx:WX,cy:WY,r:5,fill:INK},whirl);
  })();

  /* the title cartouche, top left */
  (function(){const g=mk('g',{},chart);
    mk('path',{d:'M66 62 H452 l-12 20 l12 20 H66 l12 -20 Z',fill:SOFT,stroke:INK,'stroke-width':2.5,'stroke-linejoin':'round'},g);
    const b=mk('text',{x:259,y:87,'text-anchor':'middle','font-family':'Jost, sans-serif','font-weight':700,'font-size':14.5,'letter-spacing':'.18em',fill:INK},g);b.textContent='THE ODYSSEY OF STRATEGIC MOVES';
  })();

  /* the legend, bottom centre: sails over pennants */
  (function(){const g=mk('g',{},chart), Y=FB-66, W=520, X=CX-W/2;
    mk('rect',{x:X,y:Y,width:W,height:54,fill:SOFT,stroke:INK,'stroke-width':2},g);
    mk('line',{x1:X+96,y1:Y+6,x2:X+96,y2:Y+48,stroke:INK,'stroke-width':1,opacity:.4},g);
    const lab=(x,y,s,head)=>{const t=mk('text',{x,y,'font-family':'Jost, sans-serif','font-weight':head?700:600,'font-size':11,'letter-spacing':'.14em',fill:head?MUTED:INK},g);t.textContent=s;};
    lab(X+14,Y+20,'SAILS',true);lab(X+14,Y+43,'PENNANTS',true);
    [2,3,4,5].forEach((n,i)=>{const x=X+112+i*102;mk('path',{d:'M'+x+' '+(Y+8)+' h15 q3 7.5 0 15 h-15 q-3 -7.5 0 -15 Z',fill:S.SAIL[n],stroke:INK,'stroke-width':1.5},g);lab(x+23,Y+20,'MODULE '+n);});
    [['c','COMMITMENT',0],['t','THREAT',150],['p','PROMISE',262]].forEach(k=>{const x=X+112+k[2];
      mk('path',{d:'M'+x+' '+(Y+32)+' v15 M'+x+' '+(Y+32)+' l15 5 l-15 5 Z',fill:S.PENNANT[k[0]],stroke:INK,'stroke-width':1.5,'stroke-linejoin':'round'},g);lab(x+23,Y+43,k[1]);});
  })();

  /* the two layers the ships live in, either side of the rock */
  const backG=mk('g',{},chart);

  /* the Sirens' rock */
  const rockG=mk('g',{},chart);
  const notesG=mk('g',{},chart);
  (function(){const g=rockG;
    mk('ellipse',{cx:CX,cy:CY+30,rx:150,ry:20,fill:TEAL,opacity:.35},g);
    mk('path',{d:'M'+(CX-138)+' '+(CY+30)+' L'+(CX-118)+' '+(CY-4)+' L'+(CX-92)+' '+(CY+6)+' L'+(CX-70)+' '+(CY-34)+' L'+(CX-34)+' '+(CY-22)+' L'+(CX-10)+' '+(CY-52)+' L'+(CX+26)+' '+(CY-30)+' L'+(CX+52)+' '+(CY-44)+' L'+(CX+84)+' '+(CY-8)+' L'+(CX+108)+' '+(CY-14)+' L'+(CX+140)+' '+(CY+30)+' Z',fill:'#8A8174',stroke:INK,'stroke-width':2.5,'stroke-linejoin':'round'},g);
    mk('path',{d:'M'+(CX-70)+' '+(CY-34)+' L'+(CX-54)+' '+(CY+30)+' M'+(CX-10)+' '+(CY-52)+' L'+(CX+6)+' '+(CY+30)+' M'+(CX+52)+' '+(CY-44)+' L'+(CX+60)+' '+(CY+30)+' M'+(CX-118)+' '+(CY-4)+' L'+(CX-100)+' '+(CY+30)+' M'+(CX+84)+' '+(CY-8)+' L'+(CX+96)+' '+(CY+30),fill:'none',stroke:INK,'stroke-width':1.2,opacity:.55},g);
    mk('path',{d:'M'+(CX-70)+' '+(CY-34)+' L'+(CX-34)+' '+(CY-22)+' L'+(CX-46)+' '+(CY+30)+' L'+(CX-54)+' '+(CY+30)+' Z M'+(CX-10)+' '+(CY-52)+' L'+(CX+26)+' '+(CY-30)+' L'+(CX+18)+' '+(CY+30)+' L'+(CX+6)+' '+(CY+30)+' Z',fill:INK,opacity:.16},g);
    /* surf */
    mk('path',{d:'M'+(CX-156)+' '+(CY+30)+' q8 -7 16 0 q8 7 16 0 q8 -7 16 0 q8 7 16 0 q8 -7 16 0 q8 7 16 0 q8 -7 16 0 q8 7 16 0 q8 -7 16 0 q8 7 16 0 q8 -7 16 0 q8 7 16 0 q8 -7 16 0 q8 7 16 0 q8 -7 16 0 q8 7 16 0 q8 -7 16 0 q8 7 16 0 q8 -7 16 0',fill:'none',stroke:PAPER,'stroke-width':3,'stroke-linecap':'round'},g);
    /* three Sirens, pictograms: a gown, a head, long hair, a lyre */
    const siren=(x,y,gown,flip)=>{const s=mk('g',{transform:'translate('+x+' '+y+') scale('+(flip?-1:1)+' 1)'},g);
      mk('path',{d:'M-4 -30 C-14 -28 -14 -10 -10 -2 L-4 -8 Z',fill:OCHRE,stroke:INK,'stroke-width':1.2},s);
      mk('path',{d:'M0 -22 L-11 4 H11 Z',fill:gown,stroke:INK,'stroke-width':1.8,'stroke-linejoin':'round'},s);
      mk('circle',{cx:0,cy:-28,r:6.5,fill:PAPER,stroke:INK,'stroke-width':1.8},s);
      mk('path',{d:'M4 -16 L15 -20',stroke:INK,'stroke-width':2.2,'stroke-linecap':'round'},s);
      mk('path',{d:'M13 -28 C9 -14 21 -14 19 -28 M13 -27 H19 M15 -26 V-17 M17 -26 V-17',fill:'none',stroke:INK,'stroke-width':1.4,'stroke-linecap':'round'},s);};
    siren(CX-52,CY-32,RED,false);siren(CX+8,CY-50,TEAL,false);siren(CX+66,CY-32,RED,true);
  })();
  const frontG=mk('g',{},chart);
  const harbourG=mk('g',{},chart);

  /* the neatline: a double rule with a graduated band between */
  (function(){const g=mk('g',{});
    const W=1280-2*F, H=FB-F, n=40, m=22;
    mk('rect',{x:F-14,y:F-14,width:W+28,height:H+28,fill:'none',stroke:INK,'stroke-width':3},g);
    mk('rect',{x:F,y:F,width:W,height:H,fill:'none',stroke:INK,'stroke-width':2},g);
    for(let i=0;i<n;i+=2){mk('rect',{x:F+i*W/n,y:F-9,width:W/n,height:5,fill:INK},g);mk('rect',{x:F+(i+1)*W/n,y:FB+4,width:W/n,height:5,fill:INK},g);}
    for(let i=0;i<m;i+=2){mk('rect',{x:F-9,y:F+i*H/m,width:5,height:H/m,fill:INK},g);mk('rect',{x:1280-F+4,y:F+(i+1)*H/m,width:5,height:H/m,fill:INK},g);}
  })();

  /* ================= a ship ================= */
  const EMBLEM={
    2:'M0 9 V-1 M0 -1 L-7 -8 M0 -1 L7 -8 M0 4 L-5 0 M0 4 L5 0',
    3:'M8 0 A8 8 0 1 1 -8 0 A8 8 0 1 1 8 0 M0 -8 V8 M-7 -4 L7 4 M-7 4 L7 -4',
    4:'M-9 -6 h9 v12 h-9 Z M1 -3 l8 -2 l3 11 l-8 2 Z',
    5:'M-10 0 H9 M3 0 L-4 -8 M3 0 L-4 8 M-8 0 L-11 -4 M-8 0 L-11 4',
    0:'M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z'};
  function shipNode(b,parent){
    const L=b.look, g=mk('g',{class:'seaship',style:'cursor:pointer'},parent), body=mk('g',{},g);
    b.body=body;
    /* wake */
    mk('path',{d:'M-40 3 q-8 -5 -16 0 M-46 8 q-8 -5 -16 0',fill:'none',stroke:PAPER,'stroke-width':2.2,'stroke-linecap':'round',opacity:.9},body);
    /* oars */
    for(let i=0;i<L.oars;i++){const x=-18+i*(36/Math.max(L.oars-1,1));mk('line',{x1:x,y1:-4,x2:x-9,y2:9,stroke:INK,'stroke-width':1.6,'stroke-linecap':'round'},body);}
    /* mast, yard, pennant */
    mk('line',{x1:0,y1:-10,x2:0,y2:-64,stroke:INK,'stroke-width':2.6,'stroke-linecap':'round'},body);
    mk('path',{d:'M0 -64 L-20 -58.5 L0 -53 Z',fill:L.pennant,stroke:INK,'stroke-width':1.5,'stroke-linejoin':'round'},body);
    /* the sail, bellied toward the bow */
    mk('path',{d:'M-22 -52 L22 -52 Q31 -37 24 -22 L-24 -22 Q-16 -37 -22 -52 Z',fill:L.sail,stroke:INK,'stroke-width':2,'stroke-linejoin':'round'},body);
    mk('path',{d:EMBLEM[b.d.module]||EMBLEM[0],transform:'translate(2 -34.5) scale(.95)',fill:b.d.module===4||b.d.module===0?L.sailInk:'none',stroke:L.sailInk,'stroke-width':1.8,'stroke-linecap':'round','stroke-linejoin':'round',opacity:.92},body);
    mk('line',{x1:-25,y1:-52,x2:25,y2:-52,stroke:INK,'stroke-width':2.6,'stroke-linecap':'round'},body);
    /* bound to the mast */
    mk('path',{d:'M-3.6 -14 L3.6 -14 L2.6 -9.5 L-2.6 -9.5 Z',fill:RED,stroke:INK,'stroke-width':1},body);
    mk('circle',{cx:0,cy:-17.2,r:3.3,fill:PAPER,stroke:INK,'stroke-width':1.2},body);
    mk('path',{d:'M-5 -13.2 H5 M-5 -10.6 H5',stroke:OCHRE,'stroke-width':1.4,'stroke-linecap':'round'},body);
    /* the hull: a galley, stern curling up behind, a ram and an eye at the bow */
    mk('path',{d:'M-44 -30 C-38 -30 -36 -22 -35 -10 L30 -10 L37 -22 L41 -20 L36 -8 L48 0 L34 0 C30 6 24 8 16 8 L-22 8 C-36 8 -42 -4 -44 -30 Z',fill:L.hull,stroke:INK,'stroke-width':2,'stroke-linejoin':'round'},body);
    mk('path',{d:'M-36 -5 L33 -5',stroke:L.stripe,'stroke-width':2.6,'stroke-linecap':'round'},body);
    mk('ellipse',{cx:28,cy:-1.5,rx:3.4,ry:2.4,fill:PAPER,stroke:INK,'stroke-width':1},body);mk('circle',{cx:28.6,cy:-1.5,r:1.1,fill:INK},body);
    /* the water in front of the hull */
    mk('path',{d:'M-48 7 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0',fill:'none',stroke:SEA,'stroke-width':4.5,'stroke-linecap':'round'},body);
    mk('path',{d:'M-48 7 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0',fill:'none',stroke:TEAL,'stroke-width':1.4,'stroke-linecap':'round',opacity:.8},body);
    mk('rect',{x:-50,y:-70,width:104,height:84,fill:'transparent'},g);
    g.addEventListener('click',()=>open(b));
    return g;
  }
  function put(b,now){
    const still=b.state==='wreck'||b.state==='sink';
    const bob=still?0:Math.sin(now/620+b.ph)*1.6, roll=b.state==='wreck'?0:b.state==='sink'?(b.roll||0):Math.sin(now/900+b.ph*1.7)*2.2;
    b.g.setAttribute('transform','translate('+b.x.toFixed(1)+' '+(b.y+bob).toFixed(1)+') scale('+b.s.toFixed(3)+')');
    b.body.setAttribute('transform','scale('+b.face.toFixed(3)+' 1) rotate('+roll.toFixed(2)+')');
  }

  /* ================= the fleet ================= */
  const ships=new Map();                       /* v -> ship */
  let pending=[], home=[], shown=null, lastEnter=0;
  const revealed=new Set();
  /* ---- the odyssey: three trials in turn, then Ithaca for one ship ---- */
  /* the voyage, as in the book: the fleet gathers off Troy first, then the Cyclops, Charybdis, Scylla, and home. Nobody is lost at Troy. */
  const STOPS=[{name:'Troy',x:300,y:214},{name:'the Cyclops',x:340,y:480},{name:'Charybdis',x:1010,y:520},{name:'Scylla',x:842,y:198}];
  const VKEY='gt-m7-voyage-'+ROOM, LEG=2600, HOLD=1700, SINK=1400;
  let voy=null, wrecked=[0,0,0,0];               /* {plan:{survivor, wreck:{v:stop}}, phase: leg|hold|sink|final|done, stop, t0}; wrecked counts the restored wrecks at each trial */
  /* a finished voyage is kept for the session so a reload mid-session shows the same end; never on demo data, where a refresh starts clean */
  try{const sv=JSON.parse(sessionStorage.getItem(VKEY)||'null');if(sv&&sv.plan&&!demoOnly)voy={plan:sv.plan,phase:'done',stop:3,t0:0,restored:true};}catch(_){}
  function saveVoy(){try{if(voy&&st.live)sessionStorage.setItem(VKEY,JSON.stringify({plan:voy.plan}));else sessionStorage.removeItem(VKEY);}catch(_){}}
  /* after a voyage, a click on Troy puts the whole fleet back at sea for another run */
  function resetVoyage(){
    ships.forEach(b=>{if(b.g)b.g.remove();});ships.clear();pending=[];home=[];voy=null;wrecked=[0,0,0,0];saveVoy();
    if(banner)banner.classList.remove('on');shown=null;fill(null);sync(true);
  }
  /* where the i-th ship of the fleet holds at a trial: a loose arc in front of it */
  function spot(stop,i){const P=STOPS[stop];return {x:P.x+((i%5)-2)*56+(Math.floor(i/5)%2)*22,y:P.y-6+Math.floor(i/5)*30};}
  /* the fates: one survivor, the rest lost at the three trials, front-loaded so the tension builds */
  function makePlan(vs){
    const r=rng(S.hash(ROOM+'|'+vs.length)), order=vs.slice().sort();
    for(let i=order.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    const survivor=order[0], doomed=order.slice(1), N=doomed.length, k1=Math.round(N*.42), k2=Math.round((N-k1)*.55), wreck={};
    doomed.forEach((v,i)=>{wreck[v]=i<k1?1:i<k1+k2?2:3;});
    return {survivor,wreck};
  }
  function setSail(){
    if(voy||!slide.classList.contains('active'))return;
    const now=performance.now();
    while(pending.length)launch(pending.shift(),now,true);
    const vs=[...ships.values()].filter(b=>b.state==='ring'||b.state==='enter').map(b=>b.v);
    if(!vs.length)return;
    if(shown)close();
    voy={plan:makePlan(vs),phase:'leg',stop:0,t0:now};
    leg(0);saveVoy();counts();wake();
  }
  function leg(stop){
    let i=0;const now=performance.now();
    ships.forEach(b=>{if(!['ring','enter','voy'].includes(b.state))return;
      const to=spot(stop,i++);b.state='voy';b.from={x:b.x,y:b.y,s:b.s};b.to=to;b.t0=now;b.dir=to.x>=b.x?1:-1;frontG.appendChild(b.g);});
    voy.phase='leg';voy.stop=stop;voy.t0=now;
  }
  /* how a ship is lost depends on the trial (Ryan, 18 Sep): at the Cyclops a red starburst flares
     and it rolls over; at Charybdis it spirals down into the whirlpool; at Scylla it is snatched up
     to the cliff and eaten. In every case the mast is left leaning where the fleet held, so the
     wreck stays on the chart and can still be opened. */
  const WX=1150, WY=590, SCX=770, SCY=118;
  function wreckNode(b,settled,stop){
    const g=mk('g',{class:'wreck'},b.g);
    let d='';for(let i=0;i<20;i++){const a=i*Math.PI/10-Math.PI/2, r=i%2?11:26;d+=(i?' L':'M')+(Math.cos(a)*r).toFixed(1)+' '+(Math.sin(a)*r).toFixed(1);}
    const star=mk('path',{d:d+' Z',fill:RED,stroke:INK,'stroke-width':2,'stroke-linejoin':'round',transform:'translate(0 -16) scale(0)'},g);
    const mast=mk('g',{opacity:0},g);
    mk('path',{d:'M-6 6 L14 -30',stroke:INK,'stroke-width':3,'stroke-linecap':'round'},mast);
    mk('path',{d:'M14 -30 L0 -22 L12 -18 Z',fill:b.look.sail,stroke:INK,'stroke-width':1.5,'stroke-linejoin':'round'},mast);
    mk('path',{d:'M-22 8 q6 -5 12 0 q6 5 12 0 q6 -5 12 0 q6 5 12 0',fill:'none',stroke:PAPER,'stroke-width':2.4,'stroke-linecap':'round'},mast);
    b.wreck={g,star,mast,stop};b.sx=b.x;b.sy=b.y;b.ss=b.s;
    if(settled){if(stop===1)star.setAttribute('transform','translate(0 -16) scale(.5)');mast.setAttribute('opacity','1');b.body.setAttribute('opacity','0');}
    return g;
  }
  function sinkStep(b,now){
    const k=Math.min(1,(now-b.t0)/SINK), W=b.wreck, e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    if(W.stop===1){ /* the Cyclops: the crash */
      const flare=k<.18?k/.18*1.2:k<.5?1.2:1.2-(k-.5)/.5*.7;
      W.star.setAttribute('transform','translate(0 -16) scale('+flare.toFixed(3)+')');
      b.roll=55*Math.min(1,k*1.3);b.body.setAttribute('opacity',(1-k).toFixed(2));
    }else if(W.stop===2){ /* Charybdis: down the whirlpool */
      const a=k*k*14, r=(1-e)*46;
      b.x=b.sx+(WX-b.sx)*e+Math.cos(a)*r*1.3;b.y=b.sy+(WY-b.sy)*e+Math.sin(a)*r*.8;b.s=b.ss*(1-.85*e);b.roll=k*540;
      b.body.setAttribute('opacity',(k<.6?1:1-(k-.6)/.4).toFixed(2));
    }else{ /* Scylla: snatched up and eaten */
      const q=Math.min(1,k/.7), ee=q*q;
      b.x=b.sx+(SCX-b.sx)*ee;b.y=b.sy+(SCY-b.sy)*ee;b.s=b.ss*(1-.8*ee);b.roll=-25*q;
      b.body.setAttribute('opacity',(k<.55?1:Math.max(0,1-(k-.55)/.15)).toFixed(2));
      if(k>.7){const f=(k-.7)/.3, flare=f<.3?f/.3:1-(f-.3)/.7;W.star.setAttribute('transform','translate('+(SCX-b.sx).toFixed(0)+' '+(SCY-b.sy-10).toFixed(0)+') scale('+(flare*.9).toFixed(3)+')');}
    }
    W.mast.setAttribute('opacity',(k>.6?(k-.6)/.4:0).toFixed(2));
    if(k>=1){b.state='wreck';b.body.setAttribute('opacity','0');b.x=b.sx;b.y=b.sy;b.s=b.ss;if(W.stop!==1)W.star.setAttribute('transform','scale(0)');}
  }
  function final(){
    const b=ships.get(voy.plan.survivor);
    voy.phase='final';
    if(!b){voy.phase='done';return;}
    home=[b.v];b.state='voy';dock(b,performance.now(),false);
  }
  const banner=$('seaBanner');
  function showBanner(b){if(!banner||!b)return;const d=b.d, who=d.name?d.name+(d.name2?' & '+d.name2:''):'One ship';
    $('seaBannerWho').textContent=who+(d.name?' made it home safely':' made it home safely');banner.classList.add('on');}
  /* the voyage starts from Troy: a click on the city (Ryan, 18 Sep: no button, he remembers) */
  const troy=$('seaTroy');
  if(troy)troy.addEventListener('click',e=>{e.stopPropagation();if(voy&&voy.phase==='done')resetVoyage();else setSail();});
  if(banner)banner.addEventListener('click',()=>banner.classList.remove('on'));
  function ringOf(){const n=[0,0,0];ships.forEach(b=>{if(b.state==='enter'||b.state==='ring')n[b.ring]++;});
    let best=0,bv=1e9;for(let i=0;i<3;i++){const v=n[i]/CAP[i];if(v<bv-1e-9){bv=v;best=i;}}return best;}
  /* home: ships dock round Ithaca's shore, the nearer berths first, then a second row farther out */
  const BERTHS=[[1026,70],[1036,112],[1040,154],[1074,194],[1124,216],[1178,224],[1228,208],
                [974,62],[982,106],[986,152],[1008,198],[1050,238],[1102,260],[1156,268],[1210,260]];
  function anchorSpot(i){const b=BERTHS[i%BERTHS.length], lap=Math.floor(i/BERTHS.length);return {x:b[0]-lap*46,y:b[1]+lap*34};}
  function place(b){b.x=CX+Math.cos(b.th)*RX*b.rho;b.y=CY+Math.sin(b.th)*RY*b.rho;
    b.s=.74+.30*(b.y-(CY-RY))/(2*RY);
    const sn=-Math.sin(b.th);if(!b.dir)b.dir=sn<0?-1:1;if(sn>.10)b.dir=1;else if(sn<-.10)b.dir=-1;}
  /* a ship comes about in well under a second, like a card turning */
  function turn(b,dt){const d=b.dir-b.face;if(Math.abs(d)<.01){b.face=b.dir;return;}b.face+=Math.sign(d)*Math.min(Math.abs(d),dt*4.5);if(Math.abs(b.face)<.08)b.face=b.dir*.08;}
  function launch(b,now,instant){
    b.ring=ringOf();b.rt=RINGS[b.ring];b.ph=(b.look.seed%628)/100;
    b.th=instant?(b.look.seed%6283)/1000:Math.PI*(1.05+((b.look.seed>>>4)%100)/100*0.9)+(Math.random()<.5?0:Math.PI);
    b.rho=instant?b.rt:2.1;b.t0=now;b.state=instant?'ring':'enter';
    b.g=shipNode(b,backG);place(b);b.face=b.dir;put(b,now);ships.set(b.v,b);
  }
  function dock(b,now,instant){
    const at=anchorSpot(home.indexOf(b.v));
    if(!b.g)b.g=shipNode(b,harbourG);else harbourG.appendChild(b.g);
    if(instant){b.x=at.x;b.y=at.y;b.s=.5;b.face=1;b.state='anchored';b.ph=(b.look.seed%628)/100;put(b,now);ships.set(b.v,b);return;}
    b.state='home';b.t0=now;b.from={x:b.x,y:b.y,s:b.s};b.to=at;
  }
  function counts(){let sea=0,hm=0,wr=0;ships.forEach(b=>{if(b.state==='home'||b.state==='anchored')hm++;else if(b.state==='wreck'||b.state==='sink')wr++;else sea++;});sea+=pending.length;
    $('seaAt').textContent=sea;$('seaHome').textContent=hm;const w=$('seaWreck');if(w)w.textContent=wr;document.querySelectorAll('[data-m7worldn]').forEach(e=>e.textContent=sea+hm+wr);
    if(troy)troy.style.cursor=((voy&&voy.phase!=='done')||(!voy&&!sea))?'default':'pointer';}

  let raf=0,lastSort=0,lastT=0;
  function wake(){if(!raf)raf=requestAnimationFrame(frame);}
  function frame(now){
    raf=0;if(!slide.classList.contains('active')){lastT=0;return;}
    const dt=lastT?Math.min(.05,(now-lastT)/1000):0;lastT=now;
    if(pending.length&&now-lastEnter>520){lastEnter=now;launch(pending.shift(),now,false);counts();}
    const sailing=[];
    ships.forEach(b=>{
      if(b.state==='enter'){const k=Math.min(1,(now-b.t0)/7000), e=1-Math.pow(1-k,3);b.rho=2.1+(b.rt-2.1)*e;if(k>=1)b.state='ring';}
      if(b.state==='enter'||b.state==='ring'){b.th+=dt*0.06*(b.state==='enter'?1.5:1);sailing.push(b);}
      if(b.state==='home'){const k=Math.min(1,(now-b.t0)/6500), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
        b.x=b.from.x+(b.to.x-b.from.x)*e;b.y=b.from.y+(b.to.y-b.from.y)*e-Math.sin(e*Math.PI)*30;b.s=b.from.s+(.5-b.from.s)*e;
        b.face=b.to.x>=b.from.x?1:-1;if(k>=1){b.state='anchored';b.face=1;if(voy&&voy.phase==='final'){voy.phase='done';showBanner(b);counts();}}}
      if(b.state==='voy'&&b.to){const k=Math.min(1,(now-b.t0)/LEG), e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
        b.x=b.from.x+(b.to.x-b.from.x)*e;b.y=b.from.y+(b.to.y-b.from.y)*e-Math.sin(e*Math.PI)*14;b.s=b.from.s+(.82-b.from.s)*e;turn(b,dt);}
      if(b.state==='sink')sinkStep(b,now);
    });
    /* the odyssey's clock: sail, hold, the wrecks, sail on; then home for one */
    if(voy&&voy.phase==='leg'&&now-voy.t0>LEG+80){voy.phase='hold';voy.t0=now;}
    else if(voy&&voy.phase==='hold'&&now-voy.t0>HOLD){let any=false;
      ships.forEach(b=>{if(b.state==='voy'&&voy.plan.wreck[b.v]===voy.stop){b.state='sink';b.t0=now;b.roll=0;wreckNode(b,false,voy.stop);any=true;}});
      voy.phase='sink';voy.t0=now;if(!any)voy.t0=now-SINK;counts();}
    else if(voy&&voy.phase==='sink'&&now-voy.t0>SINK+500){if(voy.stop<3)leg(voy.stop+1);else final();counts();}
    /* ships keep their distance: a full berth on their own ring, half of one from the rings either side */
    for(let i=0;i<sailing.length;i++)for(let j=i+1;j<sailing.length;j++){const A=sailing[i],B=sailing[j],dr=Math.abs(A.ring-B.ring);if(dr>1)continue;
      const gap=(dr?0.17:0.40)/Math.min(A.rt,B.rt);let d=(B.th-A.th)%(2*Math.PI);if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;
      if(Math.abs(d)<gap){const push=(gap-Math.abs(d))*dt*1.6*(d>=0?1:-1);B.th+=push;A.th-=push;}}
    ships.forEach(b=>{if(b.state==='enter'||b.state==='ring'){place(b);turn(b,dt);}put(b,now);});
    /* far side of the rock behind it, near side in front; nearer ships over farther ones */
    if(now-lastSort>400){lastSort=now;
      const L=[...ships.values()].filter(b=>b.state==='enter'||b.state==='ring').sort((a,c)=>a.y-c.y);
      L.forEach(b=>{(b.y<CY+6?backG:frontG).appendChild(b.g);});}
    song(now);
    waves.setAttribute('transform','translate('+(Math.sin(now/2600)*5).toFixed(1)+' 0)');
    cyclops.setAttribute('transform','translate(0 '+(Math.sin(now/1700)*2.5).toFixed(1)+') translate(36 668) scale(.7) translate(-36 -668)');if(whirl)whirl.setAttribute('transform','rotate('+((now/40)%360).toFixed(1)+' 1150 590)');
    wake();
  }

  /* the song: notes rising off the rock */
  const notes=[];
  function song(now){
    if(notes.length<7&&Math.random()<.02){const t=mk('text',{'font-size':15+Math.random()*7,'font-family':'serif',fill:RED,'text-anchor':'middle'},notesG);
      t.textContent=Math.random()<.5?'♪':'♫';notes.push({t,x:CX-70+Math.random()*140,t0:now,sw:Math.random()*6,life:4200+Math.random()*1800});}
    for(let i=notes.length-1;i>=0;i--){const n=notes[i], k=(now-n.t0)/n.life;
      if(k>=1){n.t.remove();notes.splice(i,1);continue;}
      n.t.setAttribute('x',(n.x+Math.sin(k*6+n.sw)*12).toFixed(1));n.t.setAttribute('y',(CY-64-k*86).toFixed(1));n.t.setAttribute('opacity',(k<.15?k/.15:1-(k-.15)/.85).toFixed(2));}
  }

  /* ================= a ship, opened ================= */
  const ov=$('seaOpen'), big=$('seaBig');
  let bigParts=null;
  function buildBig(){
    const g=mk('g',{},big), P={};
    /* the water, the rocks under it */
    P.sea=mk('path',{d:'M0 502 q14 -9 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 V620 H0 Z',fill:'#1F3B4D'},g);
    /* mast and pennant */
    mk('rect',{x:396,y:22,width:9,height:366,fill:INK},g);
    P.pennant=mk('path',{d:'M396 24 L212 47 L396 70 Z',stroke:INK,'stroke-width':3,'stroke-linejoin':'round'},g);
    P.kind=mk('text',{x:330,y:53,'text-anchor':'middle','font-family':'Jost, sans-serif','font-weight':700,'font-size':15,'letter-spacing':'.2em',fill:PAPER},g);
    /* the sail */
    P.sail=mk('path',{d:'M168 80 L912 80 Q948 186 920 288 L160 288 Q188 186 168 80 Z',stroke:INK,'stroke-width':4,'stroke-linejoin':'round'},g);
    mk('rect',{x:150,y:72,width:780,height:10,rx:5,fill:INK},g);
    mk('path',{d:'M160 288 L120 388 M920 288 L984 386',stroke:INK,'stroke-width':2.5,fill:'none'},g);
    /* bound to the mast: a figure, and the rope that runs on to frame what makes it credible */
    const rope=(d)=>{mk('path',{d,fill:'none',stroke:INK,'stroke-width':9,'stroke-linecap':'round','stroke-linejoin':'round'},g);
      mk('path',{d,fill:'none',stroke:OCHRE,'stroke-width':5.5,'stroke-linecap':'round','stroke-linejoin':'round'},g);
      mk('path',{d,fill:'none',stroke:INK,'stroke-width':5.5,'stroke-dasharray':'2 9','stroke-linecap':'butt',opacity:.55},g);};
    mk('rect',{x:468,y:300,width:482,height:78,fill:SOFT},g);
    rope('M468 300 H950 V378 H468 Z');
    /* the figure, bound */
    mk('path',{d:'M400 316 L376 388 H424 Z',fill:RED,stroke:INK,'stroke-width':3,'stroke-linejoin':'round'},g);
    mk('circle',{cx:400,cy:302,r:15,fill:PAPER,stroke:INK,'stroke-width':3},g);
    rope('M374 334 H426 M372 350 H428 M374 366 H426');
    rope('M428 350 H468');
    /* the crew at their oars, wax in their ears */
    [150,196,242,288,334].forEach(x=>{mk('circle',{cx:x,cy:372,r:12,fill:PAPER,stroke:INK,'stroke-width':2.5},g);mk('circle',{cx:x+9,cy:372,r:3.2,fill:OCHRE,stroke:INK,'stroke-width':1.2},g);});
    /* the hull */
    P.hull=mk('path',{d:'M58 276 C84 280 92 330 100 388 L962 388 L998 344 L1014 350 L994 400 L1052 474 L974 474 C958 520 916 540 868 540 L236 540 C132 540 76 440 58 276 Z',stroke:INK,'stroke-width':4,'stroke-linejoin':'round'},g);
    P.stripe=mk('path',{d:'M96 400 H984',fill:'none','stroke-width':7,'stroke-linecap':'round'},g);
    /* the steering oar at the stern */
    mk('path',{d:'M112 330 L60 560 l16 4 l10 -60 Z',fill:SIENNA,stroke:INK,'stroke-width':2.5,'stroke-linejoin':'round'},g);
    mk('ellipse',{cx:956,cy:438,rx:20,ry:13,fill:PAPER,stroke:INK,'stroke-width':2.5},g);mk('circle',{cx:960,cy:438,r:6,fill:INK},g);
    /* the waterline over the hull, and the deep */
    mk('path',{d:'M0 506 q14 -9 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 V620 H0 Z',fill:'#1F3B4D',opacity:.93},g);
    mk('path',{d:'M0 506 q14 -9 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0',fill:'none',stroke:PAPER,'stroke-width':3,opacity:.85},g);
    /* under the water, between Scylla and Charybdis: the whirlpool to the left, her heads rising by the bow */
    (function(){let d='M120 588';for(let i=0;i<=150;i++){const a=i*0.24, r=2+i*0.5;d+=' L'+(120+Math.cos(a)*r*1.25).toFixed(1)+' '+(588+Math.sin(a)*r*0.4).toFixed(1);}
      mk('path',{d,fill:'none',stroke:PAPER,'stroke-width':2.4,'stroke-linecap':'round',opacity:.75},g);mk('circle',{cx:120,cy:588,r:6,fill:INK},g);})();
    const neck=(d,hx,hy)=>{mk('path',{d,fill:'none',stroke:INK,'stroke-width':22,'stroke-linecap':'round'},g);mk('path',{d,fill:'none',stroke:GREEN,'stroke-width':15,'stroke-linecap':'round'},g);
      const h=mk('g',{transform:'translate('+hx+' '+hy+') scale(2.2)'},g);
      mk('path',{d:'M-8 -6 C-2 -12 10 -10 12 -2 L6 2 L-4 4 Z',fill:GREEN,stroke:INK,'stroke-width':1.4,'stroke-linejoin':'round'},h);
      mk('path',{d:'M12 -2 l9 -3 l-4 4 l5 3 l-10 0',fill:RED,stroke:INK,'stroke-width':.9,'stroke-linejoin':'round'},h);
      mk('circle',{cx:0,cy:-5,r:2.2,fill:PAPER,stroke:INK,'stroke-width':.8},h);mk('circle',{cx:.6,cy:-5,r:1,fill:INK},h);};
    neck('M1010 640 C1000 606 964 586 948 560',946,552);
    neck('M1046 640 C1044 604 1016 570 1000 542',998,532);
    neck('M1082 640 C1084 606 1064 578 1046 562',1044,556);
    return P;
  }
  function fit(el,max,min){const box=el.parentElement;for(let f=max;f>=min;f--){el.style.fontSize=f+'px';if(box.scrollHeight<=box.clientHeight+2)break;}}
  function fill(b){
    if(!b){ov.classList.remove('on');return;}
    if(!bigParts)bigParts=buildBig();
    const d=b.d, L=b.look, P=bigParts;
    P.pennant.setAttribute('fill',L.pennant);P.kind.textContent=(S.KIND[d.kind]||'').toUpperCase();
    P.sail.setAttribute('fill',L.sail);P.hull.setAttribute('fill',L.hull);P.stripe.setAttribute('stroke',L.stripe);
    const sail=$('seaSailBox');sail.style.color=L.sailInk;
    $('seaGameK').textContent=d.module?'THE GAME · MODULE '+d.module+' · '+S.GAME[d.module].toUpperCase():'THE GAME';
    $('seaMove').textContent=d.move;$('seaGame').textContent=d.module?(S.PLAY[d.module]||d.game):d.game;$('seaCred').textContent=d.cred;$('seaDown').textContent=d.down;
    const w=$('seaWhose');w.textContent=revealed.has(b.v)?((d.name||'—')+(d.name2?' & '+d.name2:'')):'WHOSE SHIP IS THIS?';w.classList.toggle('named',revealed.has(b.v));
    ov.classList.add('on');
    fit($('seaMove'),34,15);fit($('seaGame'),22,13);fit($('seaCred'),21,12);fit($('seaDown'),21,13);
  }
  function open(b){if(!slide.classList.contains('active'))return;if(voy&&voy.phase!=='done')return;if(b.state==='sink')return;shown=b;fill(b);}
  function close(){
    if(!shown)return;shown=null;fill(null);
  }
  $('seaWhose').addEventListener('click',e=>{e.stopPropagation();e.currentTarget.blur();if(!shown)return;revealed.has(shown.v)?revealed.delete(shown.v):revealed.add(shown.v);fill(shown);});
  $('seaClose').addEventListener('click',e=>{e.stopPropagation();e.currentTarget.blur();close();});
  ov.addEventListener('click',e=>{if(e.target===ov)close();});
  addEventListener('keydown',e=>{if(!shown||!slide.classList.contains('active'))return;
    if(['Escape','ArrowRight','ArrowLeft','ArrowDown','ArrowUp','PageDown','PageUp',' ','Spacebar'].includes(e.key)){close();e.preventDefault();e.stopImmediatePropagation();}},true);

  /* ================= the room ================= */
  function sync(first){
    const L=st.live?st.list:DEMO.slice(0,st.demoShown), seen=new Set(), now=performance.now();
    L.forEach(d=>{seen.add(d.v);
      let b=ships.get(d.v)||pending.find(x=>x.v===d.v);
      if(b){b.d=d;return;}
      b={v:d.v,d,look:S.look(d.v,d.module,d.kind,d.h),x:0,y:0,s:1,face:1,ph:0};
      if(voy&&voy.restored&&st.live&&voy.plan.wreck[d.v]!==undefined){const stop=voy.plan.wreck[d.v], i=wrecked[stop]++, at=spot(stop,i);
        b.g=shipNode(b,frontG);b.x=at.x;b.y=at.y;b.s=.82;b.face=1;b.state='wreck';wreckNode(b,true,stop);put(b,now);ships.set(b.v,b);}
      else if(voy&&voy.restored&&st.live&&voy.plan.survivor===d.v){home=[d.v];dock(b,now,true);showBanner(b);}
      else if(first)launch(b,now,true);
      else pending.push(b);});
    [...ships.keys()].forEach(v=>{if(!seen.has(v)){const b=ships.get(v);if(b.g)b.g.remove();ships.delete(v);if(shown===b){shown=null;fill(null);}}});
    pending=pending.filter(b=>seen.has(b.v));
    if(st.live&&!L.length&&(home.length||voy)){home=[];voy=null;wrecked=[0,0,0,0];saveVoy();if(banner)banner.classList.remove('on');}          /* a Poll Desk reset */
    if(shown)fill(shown);
    $('seaDemo').style.display=st.live?'none':'';
    counts();wake();
  }
  function fetchIt(){
    fetch(POLL_API+'/p/'+ROOM+'/entries').then(r=>r.json()).then(d=>{
      const was=st.live, next=S.fleet(d.entries||[]), changed=JSON.stringify(next)!==JSON.stringify(st.list);
      if(!was){ships.forEach(b=>{if(b.g)b.g.remove();});ships.clear();pending=[];shown=null;fill(null);}   /* the demo fleet goes when the room answers */
      st.live=true;st.list=next;
      if(changed||!was)sync(!was&&slide.classList.contains('active'));
    }).catch(()=>{});
  }
  if(!demoOnly){setInterval(fetchIt,2500);fetchIt();}
  setInterval(()=>{if(!st.live&&st.demoShown<DEMO.length&&slide.classList.contains('active')){st.demoShown++;sync();}},650);
  new MutationObserver(()=>{if(slide.classList.contains('active'))wake();}).observe(slide,{attributes:true,attributeFilter:['class']});
  sync();
})();
