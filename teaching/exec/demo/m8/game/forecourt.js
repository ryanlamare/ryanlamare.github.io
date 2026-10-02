/* ---- Module 8's car market, the room view: a used-car lot in 1970, the year
   of Akerlof's paper (Ryan's brief, 18 Sep 2026, in the manner of Module 3's
   airfield). A sales office with a butterfly roof and plate glass, a roadside
   sign with chasing bulbs, strings of pennants, saucer lamps, palms, a low
   skyline, and a road along the front with the odd wagon, beetle, pickup or
   bus going by. The scenery is wordless.

   Every car on the lot is the same sedan in the same tan, because nobody can
   tell a lemon from a peach. One car per buyer, never fewer than twenty-four
   before the game starts, parked in rows either side of a driveway. When a
   round closes the sold cars pull out of their bays, drive to the driveway,
   turn onto the road and leave to the RIGHT, turning their true colour as
   they go (ochre lemon, terracotta peach); arrivals drive in from the LEFT
   and park in the free bays; peaches unsold after round two leave to the
   LEFT in terracotta, and in the warranty round they drive back in with a
   green shield on the roof. The light follows the game, not a clock: morning
   before round one, midday, afternoon, and golden hour with the sign and the
   office lit for the warranty round.

   THE RULES LIVE IN lot.js AND NOWHERE ELSE. This file polls the room, runs
   LOT.parse and LOT.simulate, and stages what it sees from the difference
   between one poll and the next: a car index is a car for the whole game.
   Keys on this slide: 1, 2, 3 open rounds, C closes, W is the rule change.

   ?demo=1 is the rehearsal: nothing is fetched or posted. About twenty-eight
   invented buyers join, the keys append the same ::open and ::close lines to
   a list kept in memory, and invented bids arrive after each round opens.
   ?market=<room> reads a rehearsal room on the Worker.

   Every node of the scene is made with createElementNS and moved by its
   transform attribute (no innerHTML on the scene, no CSS transforms on SVG).
   Expects LOT, and QS, POLL_API, deckSay from the deck's inline script. ---- */
(function(){
  const $=id=>document.getElementById(id), svg=$('lotSvg');
  if(!svg||typeof LOT==='undefined')return;
  const slide=svg.closest('.slide'), NS='http://www.w3.org/2000/svg';
  function mk(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);(parent||svg).appendChild(e);return e;}
  function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
  const cl=(v,a,c)=>Math.max(0,Math.min(1,(v-a)/(c-a)));
  const INK='#1B1C19', PAPER='#E9E2D2', SOFT='#F0EAD9', CARD='#F7F2E6', RED='#CE1E32', OCHRE='#C9A227', TEAL='#59949C', TERRA='#B5573A',
        TAN='#D09868', GREEN='#26713D', CHROME='#D9D6CC', NAVY='#37658A', SAGE='#6F9A7A',
        SKY='#CBE0DC', SKYLOW='#E8EDDD', HILLFAR='#C6CDB8', HILL='#B1BD9C', TOWN='#D6D2BF', TOWN2='#C3C8B6',
        TARMAC='#8C867B', ROAD='#5F5B55', PAVE='#D9D1BD', GRASS='#B9C48F', GLASS='#B7D5CF', CLOUD='#F8F4E9', FROND='#4F7A5C', WARM='#F6D37A';

  /* ================= the ground plan ================= */
  const LOTTOP=256, KERB=486, FAR=526, NEAR=560, ROADV=270;       /* the back of the lot; the kerb; the two lanes (wheels) */
  const GAP0=560, GAP1=720;                             /* the driveway through the rows */
  const ROWY=[458,404,354,308,274];                     /* the rows, front first */
  const D=y=>y<=458?.70-(458-y)*.0008:.70+(y-458)*.0018;   /* a car's size by its depth */

  /* ---- the sky ---- */
  mk('rect',{x:0,y:0,width:1280,height:LOTTOP,fill:SKY});
  mk('rect',{x:0,y:110,width:1280,height:LOTTOP-110,fill:SKYLOW,opacity:.75});
  const dawnO=mk('rect',{x:0,y:0,width:1280,height:LOTTOP,fill:'#F3C9A4',opacity:0}), goldO=mk('rect',{x:0,y:0,width:1280,height:LOTTOP,fill:'#F0A35E',opacity:0}),
        roseO=mk('rect',{x:0,y:150,width:1280,height:LOTTOP-150,fill:'#E8846A',opacity:0});
  const sunG=mk('g',{});const sunRing=mk('circle',{r:58,fill:'none',stroke:'#F6EBC4','stroke-width':3,opacity:.7},sunG), sun=mk('circle',{r:40,fill:'#F2E2A6'},sunG);
  const cloudG=mk('g',{fill:CLOUD});
  mk('path',{d:'M0 '+LOTTOP+' L0 214 Q110 186 240 210 Q360 232 500 206 Q640 184 770 214 Q900 238 1020 208 Q1150 182 1280 216 L1280 '+LOTTOP+' Z',fill:HILLFAR});
  mk('path',{d:'M0 '+LOTTOP+' L0 236 Q170 214 340 238 Q520 254 700 232 Q880 214 1050 238 Q1180 250 1280 234 L1280 '+LOTTOP+' Z',fill:HILL});
  /* a low skyline: slabs, a drum tower, a water tower */
  (function(){const g=mk('g',{});
    [[470,226,34,30,TOWN],[508,212,26,44,TOWN2],[538,232,46,24,TOWN],[590,204,30,52,TOWN],[626,224,52,32,TOWN2],[684,216,24,40,TOWN],[714,234,60,22,TOWN2],[782,208,34,48,TOWN],[822,228,44,28,TOWN2],[876,220,28,36,TOWN]].forEach(b=>{
      mk('rect',{x:b[0],y:b[1],width:b[2],height:b[3],fill:b[4]},g);
      for(let y=b[1]+6;y<b[1]+b[3]-6;y+=8)for(let x=b[0]+5;x<b[0]+b[2]-5;x+=7)mk('rect',{x,y,width:3.4,height:3.6,fill:'#A9B7AE',opacity:.7},g);});
    mk('rect',{x:598,y:194,width:14,height:10,fill:TOWN},g);mk('line',{x1:605,y1:194,x2:605,y2:178,stroke:'#A9B0A0','stroke-width':2},g);
    mk('ellipse',{cx:1010,cy:214,rx:15,ry:9,fill:TOWN2},g);mk('path',{d:'M1000 220 L996 256 M1020 220 L1024 256 M1010 222 L1010 256',stroke:TOWN2,'stroke-width':2.4,fill:'none'},g);})();
  const backGold=mk('rect',{x:0,y:170,width:1280,height:LOTTOP-170,fill:'#E9975A',opacity:0});
  /* telephone poles along the back street */
  (function(){const g=mk('g',{stroke:'#6F6A5E','stroke-width':2.2,fill:'none',opacity:.75});
    const xs=[-30,300,730,900,1240];xs.forEach(x=>{mk('line',{x1:x,y1:LOTTOP,x2:x,y2:176},g);mk('line',{x1:x-12,y1:184,x2:x+12,y2:184},g);});
    for(let i=0;i<xs.length-1;i++)[-10,10].forEach(o=>mk('path',{d:'M'+(xs[i]+o)+' 184 Q'+((xs[i]+xs[i+1])/2)+' 204 '+(xs[i+1]+o)+' 184','stroke-width':1.2},g));})();

  /* ---- the ground: the lot, the kerb with its driveway, the road, the near verge ---- */
  mk('rect',{x:0,y:LOTTOP-8,width:1280,height:12,fill:'#CDBF9F',stroke:INK,'stroke-width':2});          /* the back wall */
  mk('rect',{x:0,y:LOTTOP,width:1280,height:KERB-LOTTOP+8,fill:TARMAC});
  mk('rect',{x:0,y:492,width:1280,height:86,fill:ROAD});
  (function(){const g=mk('g',{fill:PAVE,stroke:INK,'stroke-width':2.2,'stroke-linejoin':'round'});
    mk('path',{d:'M-4 480 L'+(GAP0-26)+' 480 Q'+(GAP0-6)+' 481 '+(GAP0-2)+' 494 L-4 494 Z'},g);
    mk('path',{d:'M1284 480 L'+(GAP1+26)+' 480 Q'+(GAP1+6)+' 481 '+(GAP1+2)+' 494 L1284 494 Z'},g);
    mk('rect',{x:-4,y:576,width:1288,height:12},g);})();
  mk('rect',{x:0,y:588,width:1280,height:132,fill:GRASS});
  mk('line',{x1:0,y1:541,x2:1280,y2:541,stroke:OCHRE,'stroke-width':3,'stroke-dasharray':'34 26',opacity:.9});
  const groundGold=mk('rect',{x:0,y:LOTTOP,width:1280,height:720-LOTTOP,fill:'#F0A050',opacity:0});
  const bayG=mk('g',{stroke:CARD,'stroke-width':2.4,'stroke-linecap':'round',opacity:.5});

  /* ---- palms, behind everything that stands on the lot ---- */
  const palms=[];
  function palm(x,top,lean,sc){
    const g=mk('g',{}), bx=x+lean;
    mk('path',{d:'M'+x+' '+(LOTTOP+4)+' Q'+(x+lean*.2)+' '+((LOTTOP+top)/2)+' '+bx+' '+top,stroke:INK,'stroke-width':9*sc,fill:'none','stroke-linecap':'round'},g);
    mk('path',{d:'M'+x+' '+(LOTTOP+4)+' Q'+(x+lean*.2)+' '+((LOTTOP+top)/2)+' '+bx+' '+top,stroke:'#9A7550','stroke-width':5*sc,fill:'none','stroke-linecap':'round'},g);
    const head=mk('g',{},g);
    [[-54,8],[-44,-22],[-20,-40],[8,-42],[34,-28],[52,2],[-30,22],[30,24]].forEach(f=>{const ex=f[0]*sc, ey=f[1]*sc;
      mk('path',{d:'M0 0 Q'+(ex*.55).toFixed(1)+' '+(ey*.9-16*sc).toFixed(1)+' '+ex.toFixed(1)+' '+ey.toFixed(1)+' Q'+(ex*.5).toFixed(1)+' '+(ey*.45-4*sc).toFixed(1)+' 0 0 Z',fill:FROND,stroke:INK,'stroke-width':1.8,'stroke-linejoin':'round'},head);});
    mk('circle',{cx:0,cy:1,r:4*sc,fill:'#7B5A3A',stroke:INK,'stroke-width':1.6},head);
    palms.push({head,x:bx,y:top,ph:x*.013});
  }
  palm(478,92,16,1);palm(520,126,-10,.82);palm(1128,150,-12,.9);palm(1226,132,10,.86);palm(22,118,10,.86);

  /* ---- the sales office: a stone pylon, plate glass, a butterfly roof on V columns ---- */
  const officeLit=(function(){const g=mk('g',{stroke:INK,'stroke-width':2.8,'stroke-linejoin':'round'});
    mk('rect',{x:150,y:204,width:236,height:60,fill:GLASS},g);
    const inside=mk('g',{stroke:'none'},g);
    mk('rect',{x:150,y:244,width:236,height:20,fill:'#8FB5AE',opacity:.55},inside);
    mk('path',{d:'M196 264 L196 246 L250 246 L250 264 Z M262 264 L262 238 L274 238 L274 264 Z',fill:INK,opacity:.55},inside);        /* a desk and a chair */
    const lit=mk('rect',{x:150,y:204,width:236,height:60,fill:WARM,opacity:0,stroke:'none'},g);
    [[210,222],[258,228],[306,222],[350,230]].forEach(p=>{mk('line',{x1:p[0],y1:204,x2:p[0],y2:p[1],'stroke-width':1.4},g);mk('path',{d:'M'+(p[0]-7)+' '+(p[1]+8)+' L'+p[0]+' '+p[1]+' L'+(p[0]+7)+' '+(p[1]+8)+' Z',fill:OCHRE,'stroke-width':1.6},g);});   /* cone lamps */
    for(let x=188;x<386;x+=38)mk('line',{x1:x,y1:204,x2:x,y2:264,'stroke-width':2.2},g);
    mk('rect',{x:150,y:204,width:236,height:60,fill:'none'},g);
    mk('line',{x1:334,y1:236,x2:334,y2:246,'stroke-width':3,'stroke-linecap':'round'},g);                       /* the door's handle */
    /* the pylon, in flagstone */
    mk('path',{d:'M100 264 L108 140 L150 140 L150 264 Z',fill:TERRA},g);
    const st=mk('g',{stroke:INK,'stroke-width':1.3,opacity:.45,fill:'none'},g);
    ['M106 236 L128 236 L130 250 L150 250','M108 214 L122 214 L124 226 L150 226','M110 190 L136 190 L138 204 L150 204','M112 166 L126 166 L128 178 L150 178','M128 236 L126 226 M136 190 L134 178 M122 214 L124 204'].forEach(d=>mk('path',{d},st));
    /* the butterfly roof: a short wing to the left, the long one sweeping up over the glass */
    mk('path',{d:'M24 170 L132 204 L132 216 L24 183 Z',fill:CARD},g);
    mk('path',{d:'M126 204 L452 138 Q460 138 460 145 L458 150 L126 217 Z',fill:CARD},g);
    mk('path',{d:'M126 211 L458 144',stroke:RED,'stroke-width':3.2},g);
    mk('path',{d:'M404 264 L392 164 M404 264 L426 158',fill:'none','stroke-width':3.2,'stroke-linecap':'round'},g);
    mk('path',{d:'M52 264 L46 180 M52 264 L70 186',fill:'none','stroke-width':3,'stroke-linecap':'round'},g);
    /* a starburst on the pylon */
    const sb=mk('g',{transform:'translate(129 160)'},g);
    for(let i=0;i<8;i++)mk('path',{d:'M0 -13 L2.4 -2.4 L0 0 L-2.4 -2.4 Z',fill:OCHRE,'stroke-width':1.2,transform:'rotate('+(i*45)+')'},sb);
    mk('circle',{r:3,fill:CARD,'stroke-width':1.4},sb);
    /* planters */
    [170,222,366].forEach(x=>{mk('circle',{cx:x,cy:256,r:9,fill:FROND,'stroke-width':2},g);mk('path',{d:'M'+(x-8)+' 262 L'+(x+8)+' 262 L'+(x+5)+' 270 L'+(x-5)+' 270 Z',fill:CARD,'stroke-width':2},g);});
    return lit;})();

  /* ---- the roadside sign: a starburst on a mast, a blank kidney panel with a car on it, and an arrow ---- */
  const bulbs=[];                                     /* {c,h,k,set} */
  function bulb(x,y,k,set,parent,r){const h=mk('circle',{cx:x,cy:y,r:(r||3)*2.6,fill:'#FFE9A8',opacity:0},parent), c=mk('circle',{cx:x,cy:y,r:r||3,fill:'#CDBE92',stroke:INK,'stroke-width':1},parent);bulbs.push({c,h,k,set,on:null});}
  let starburst=null;
  (function(){const g=mk('g',{stroke:INK,'stroke-width':2.8,'stroke-linejoin':'round',transform:'translate(-128 0)'});
    mk('rect',{x:996,y:98,width:9,height:166,fill:CARD},g);mk('rect',{x:1019,y:98,width:9,height:166,fill:CARD},g);
    mk('path',{d:'M1005 236 L1019 222 M1005 222 L1019 236 M1005 206 L1019 192 M1005 192 L1019 206','stroke-width':1.8,fill:'none'},g);
    mk('line',{x1:1012,y1:104,x2:1012,y2:66,'stroke-width':4},g);
    /* the arrow, sweeping round from the right to point down at the lot */
    const AR='M1106 84 Q1176 150 1092 224';
    mk('path',{d:AR,fill:'none',stroke:INK,'stroke-width':24,'stroke-linecap':'butt'},g);
    mk('path',{d:'M1116 214 L1064 252 L1074 190 Z',fill:RED},g);
    mk('path',{d:AR,fill:'none',stroke:RED,'stroke-width':18.4,'stroke-linecap':'butt'},g);
    for(let i=0;i<9;i++){const t=.04+i*.105, u=1-t, x=u*u*1106+2*u*t*1176+t*t*1092, y=u*u*84+2*u*t*150+t*t*224;bulb(x,y,i,'arrow',g,2.8);}
    bulb(1082,226,9,'arrow',g,2.8);
    /* the panel */
    mk('path',{d:'M946 134 Q943 116 962 115 L1082 106 Q1100 105 1098 123 L1092 170 Q1090 186 1074 187 L960 193 Q942 194 944 176 Z',fill:TEAL},g);
    mk('path',{d:'M-70 -32 L-42 -29 L-35 -29.5 Q-31 -30.5 -28 -35 L-23 -42.5 Q-21.5 -45 -17 -45 L13 -45 Q17.5 -45 20.5 -41.5 L31 -28.5 L62 -26.5 Q70 -25.5 70.5 -19 L70.5 -8 L56.5 -8 A12.5 12.5 0 0 0 31.5 -8 L-29.5 -8 A12.5 12.5 0 0 0 -54.5 -8 L-70 -8 Q-72 -20 -70 -32 Z',
      fill:CARD,stroke:'none',transform:'translate(1021 168) rotate(-3) scale(.74)'},g);
    mk('circle',{cx:990,cy:161,r:6,fill:CARD,stroke:'none'},g);mk('circle',{cx:1053,cy:158,r:6,fill:CARD,stroke:'none'},g);
    (function(){const P=[[956,124],[1090,114],[1084,178],[952,185]];let k=0;
      for(let s=0;s<4;s++){const A=P[s],B=P[(s+1)%4],n=s%2?4:9;for(let j=0;j<n;j++){const t=j/n;bulb(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,k++,'panel',g,2.4);}}})();
    /* the starburst */
    starburst=mk('g',{},g);
    for(let i=0;i<12;i++){const long=i%2===0, L=long?36:22;mk('path',{d:'M0 '+(-L)+' L3.6 -5 L0 0 L-3.6 -5 Z',fill:long?OCHRE:CARD,'stroke-width':1.6,transform:'rotate('+(i*30)+')'},starburst);}
    for(let i=0;i<6;i++){const a=i*60*Math.PI/180;bulb(Math.sin(a)*38,-Math.cos(a)*38,i,'star',starburst,2.6);}
    mk('circle',{r:8,fill:RED,'stroke-width':2.2},starburst);
  })();

  /* ---- pennants: strings between the office, the poles and the sign, and between the lamps at the kerb ---- */
  const flags=[], FLAGC=[RED,CARD,TEAL,OCHRE,CARD,TERRA];let flagN=0;
  function string(parent,x0,y0,x1,y1,sag){
    const mx=(x0+x1)/2, my=(y0+y1)/2+sag*2;
    mk('path',{d:'M'+x0+' '+y0+' Q'+mx+' '+my+' '+x1+' '+y1,fill:'none',stroke:INK,'stroke-width':1.4},parent);
    const n=Math.max(2,Math.round(Math.hypot(x1-x0,y1-y0)/16));
    for(let j=0;j<n;j++){const t=(j+.5)/n,u=1-t, x=u*u*x0+2*u*t*mx+t*t*x1, y=u*u*y0+2*u*t*my+t*t*y1;
      const el=mk('path',{d:'M-5 0 L5 0 L0 14 Z',fill:FLAGC[flagN%FLAGC.length],stroke:INK,'stroke-width':1.2,'stroke-linejoin':'round'},parent);
      flags.push({el,x,y,ph:flagN*.9});flagN++;}
  }
  function pole(parent,x,top,base){mk('line',{x1:x,y1:base,x2:x,y2:top,stroke:INK,'stroke-width':3.2,'stroke-linecap':'round'},parent);mk('circle',{cx:x,cy:top-3,r:3.4,fill:OCHRE,stroke:INK,'stroke-width':1.6},parent);}
  (function(){const g=mk('g',{});
    pole(g,606,126,LOTTOP+6);pole(g,740,124,LOTTOP+6);pole(g,1076,132,LOTTOP+6);pole(g,1262,150,LOTTOP+6);
    string(g,-20,150,24,172,4);string(g,458,142,606,128,18);string(g,606,128,740,126,16);string(g,740,126,869,118,15);string(g,899,118,1076,134,20);string(g,1076,134,1262,152,20);})();

  const lotG=mk('g',{});                              /* every car on the lot, back row first */
  const kerbG=mk('g',{});                             /* what stands at the kerb, in front of the lot */
  const roadG=mk('g',{});                             /* whatever is on the road, in front of that */

  /* ---- the saucer lamps at the kerb (no pennants down here: a string in front of the rows hid the cars) ---- */
  const lampGlow=[];
  (function(){const xs=[246,552,728,1034];
    xs.forEach(x=>{const g=mk('g',{stroke:INK,'stroke-linejoin':'round'},kerbG);
      mk('path',{d:'M'+(x-2.4)+' 490 L'+(x-1.4)+' 322 L'+(x+1.4)+' 322 L'+(x+2.4)+' 490 Z',fill:CARD,'stroke-width':2},g);
      mk('path',{d:'M'+(x-5)+' 490 L'+(x-3.4)+' 470 L'+(x+3.4)+' 470 L'+(x+5)+' 490 Z',fill:TEAL,'stroke-width':2},g);
      mk('path',{d:'M'+(x-22)+' 318 Q'+x+' 306 '+(x+22)+' 318',fill:'none','stroke-width':2.6},g);
      [-22,22].forEach(o=>{lampGlow.push(mk('ellipse',{cx:x+o,cy:324,rx:22,ry:12,fill:'#FFE9A8',opacity:0,stroke:'none'},g));
        mk('path',{d:'M'+(x+o-12)+' 321 Q'+(x+o)+' 309 '+(x+o+12)+' 321 Z',fill:TEAL,'stroke-width':2},g);
        mk('ellipse',{cx:x+o,cy:322,rx:12,ry:3.6,fill:CARD,'stroke-width':1.8},g);});});
  })();

  /* ---- clouds, as stacked pills ---- */
  const clouds=[];
  (function(){const r=rng(7);
    for(let i=0;i<6;i++){const g=mk('g',{},cloudG);
      [[-54,0,108,17],[-34,-13,78,17],[-4,-25,46,15]].forEach(e=>mk('rect',{x:e[0],y:e[1],width:e[2],height:e[3],rx:e[3]/2},g));
      clouds.push({g,x:r()*1400-60,y:36+r()*120,s:.6+r()*.7,v:3+r()*5});}})();

  /* ================= the car: a late-sixties sedan, side on, facing right; the origin is where its wheels touch ================= */
  const BODY='M-71 -34 L-60 -30.5 L-42 -29.5 L-35 -29.5 Q-31 -30.5 -28 -35 L-23 -42.5 Q-21.5 -45 -17 -45 L13 -45 Q17.5 -45 20.5 -41.5 L31 -28.5 L62 -26.5 Q70 -25.5 70.5 -19 L70.5 -8 L56.5 -8 A12.5 12.5 0 0 0 31.5 -8 L-29.5 -8 A12.5 12.5 0 0 0 -54.5 -8 L-70 -8 Q-72.5 -21 -71 -34 Z',
        WINDOWS='M-25 -30.5 L-20.5 -41 Q-19.5 -42 -17.5 -42 L12 -42 Q14.5 -42 16 -40.5 L26 -29.5 Z';
  let seq=0;
  function wheel(g,x,r,white){const w=mk('g',{transform:'translate('+x+' '+(-r)+')'},g);
    mk('circle',{r,fill:INK},w);if(white)mk('circle',{r:r*.72,fill:CARD},w);mk('circle',{r:r*.46,fill:INK},w);
    const sp=mk('g',{},w);mk('circle',{r:r*.35,fill:CHROME},sp);mk('path',{d:'M'+(-r*.35)+' 0 L'+(r*.35)+' 0 M0 '+(-r*.35)+' L0 '+(r*.35),stroke:INK,'stroke-width':1.3},sp);return sp;}
  function carNode(b){
    const g=mk('g',{},lotG), id='fcw'+(seq++);g.__b=b;
    b.shadow=mk('ellipse',{cx:0,cy:-1.5,rx:70,ry:5.5,fill:INK,opacity:.22},g);
    b.body=mk('path',{d:BODY,fill:TAN,stroke:INK,'stroke-width':3.2,'stroke-linejoin':'round'},g);
    const defs=mk('defs',{},g), cp=mk('clipPath',{id},defs);mk('path',{d:WINDOWS},cp);
    mk('path',{d:WINDOWS,fill:'#DCE8E3',stroke:INK,'stroke-width':2.4,'stroke-linejoin':'round'},g);
    const gl=mk('g',{'clip-path':'url(#'+id+')'},g);b.glint=mk('path',{d:'M-2 -46 L8 -46 L-3 -26 L-13 -26 Z',fill:'#FFFFFF',opacity:0},gl);b.glintOn=false;
    mk('line',{x1:-3,y1:-42,x2:-3,y2:-30,stroke:INK,'stroke-width':2.6},g);
    mk('path',{d:'M-3 -29 L-3 -11 M26 -28.5 L25 -12',stroke:INK,'stroke-width':1.3,opacity:.4,fill:'none'},g);
    mk('line',{x1:-66,y1:-19.5,x2:66,y2:-18.5,stroke:CHROME,'stroke-width':2.2,'stroke-linecap':'round'},g);
    mk('line',{x1:5,y1:-24.5,x2:11,y2:-24.5,stroke:INK,'stroke-width':1.8,'stroke-linecap':'round'},g);
    mk('rect',{x:65,y:-16.5,width:9.5,height:6,rx:2.6,fill:CHROME,stroke:INK,'stroke-width':1.8},g);
    mk('rect',{x:-75,y:-16.5,width:9.5,height:6,rx:2.6,fill:CHROME,stroke:INK,'stroke-width':1.8},g);
    mk('circle',{cx:67.4,cy:-22.4,r:2.7,fill:CARD,stroke:INK,'stroke-width':1.4},g);
    mk('rect',{x:-72.4,y:-31,width:3.6,height:9,rx:1.3,fill:RED,stroke:INK,'stroke-width':1.2},g);
    b.heat=mk('g',{stroke:'#FFFFFF','stroke-width':1.5,'stroke-linecap':'round',fill:'none',opacity:0},g);
    mk('path',{d:'M34 -32 q3.5 -3.5 7 0 t7 0 t7 0'},b.heat);mk('path',{d:'M41 -38 q3.5 -3.5 7 0 t7 0'},b.heat);
    b.wh=[wheel(g,-42,9.6,true),wheel(g,44,9.6,true)];
    /* the warranty: a green shield with a tick, standing on the roof */
    b.badge=mk('g',{opacity:b.badgeOn?1:0},g);
    mk('line',{x1:0,y1:-45,x2:0,y2:-50,stroke:INK,'stroke-width':2.4},b.badge);
    const sh=mk('g',{transform:'translate(-11.7 -76) scale(.9)'},b.badge);
    mk('path',{d:'M13 1 L25 5 V14 C25 21 20 27 13 29 C6 27 1 21 1 14 V5 Z',fill:GREEN,stroke:INK,'stroke-width':2.4,'stroke-linejoin':'round'},sh);
    mk('path',{d:'M7 15 L11 19 L19 10',fill:'none',stroke:PAPER,'stroke-width':3.2,'stroke-linecap':'round','stroke-linejoin':'round'},sh);
    b.badgeFace=1;b.spin=0;b.shKey='';
    return g;
  }
  const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
  const mix=(a,c,k)=>{const A=hex(a),C=hex(c);return 'rgb('+A.map((v,i)=>Math.round(v+(C[i]-v)*k)).join(',')+')';};

  /* ---- the passers-by: none of them the lot's sedan, none of them tan, ochre or terracotta ---- */
  function shadowOf(g,rx){return mk('ellipse',{cx:0,cy:-1.5,rx,ry:5.5,fill:INK,opacity:.22},g);}
  const KINDS=[
    function beetle(g){shadowOf(g,48);
      mk('path',{d:'M-46 -8 Q-49 -20 -37 -25 Q-25 -48 2 -48 Q27 -48 35 -27 Q47 -24 47 -12 L47 -8 Z',fill:NAVY,stroke:INK,'stroke-width':3.2,'stroke-linejoin':'round'},g);
      mk('path',{d:'M-21 -28 Q-13 -43 -1 -43 L-1 -28 Z M4 -43 Q20 -43 27 -28 L4 -28 Z',fill:'#DCE8E3',stroke:INK,'stroke-width':2.2,'stroke-linejoin':'round'},g);
      mk('path',{d:'M-40 -9 A13 13 0 0 1 -14 -9 M15 -9 A13 13 0 0 1 41 -9',fill:'none',stroke:INK,'stroke-width':2.4},g);
      mk('rect',{x:43,y:-15,width:8,height:5,rx:2.4,fill:CHROME,stroke:INK,'stroke-width':1.6},g);mk('rect',{x:-51,y:-15,width:8,height:5,rx:2.4,fill:CHROME,stroke:INK,'stroke-width':1.6},g);
      return [wheel(g,-27,8.6,false),wheel(g,28,8.6,false)];},
    function pickup(g){shadowOf(g,68);
      mk('path',{d:'M-66 -31 L-8 -31 L-8 -45 Q-8 -49 -4 -49 L19 -49 Q25 -49 28 -44 L36 -31 L58 -29 Q66 -28 66 -20 L66 -9 L-66 -9 Z',fill:RED,stroke:INK,'stroke-width':3.2,'stroke-linejoin':'round'},g);
      mk('path',{d:'M-3 -44 L18 -44 L27 -32 L-3 -32 Z',fill:'#DCE8E3',stroke:INK,'stroke-width':2.2,'stroke-linejoin':'round'},g);
      mk('path',{d:'M-62 -24 L-12 -24 M-8 -31 L-8 -10',stroke:INK,'stroke-width':1.8,fill:'none',opacity:.7},g);
      mk('rect',{x:62,y:-17,width:9,height:6,rx:2.6,fill:CHROME,stroke:INK,'stroke-width':1.8},g);mk('rect',{x:-71,y:-17,width:9,height:6,rx:2.6,fill:CHROME,stroke:INK,'stroke-width':1.8},g);
      return [wheel(g,-38,10.6,false),wheel(g,40,10.6,false)];},
    function wagon(g){shadowOf(g,74);
      mk('path',{d:'M-74 -30 L-68 -45 Q-67 -47 -63 -47 L14 -47 Q19 -47 22 -43 L32 -29 L64 -27 Q73 -26 73 -19 L73 -8 L-74 -8 Z',fill:SAGE,stroke:INK,'stroke-width':3.2,'stroke-linejoin':'round'},g);
      mk('path',{d:'M-66 -31 L-62 -43 L-36 -43 L-36 -31 Z M-31 -43 L-5 -43 L-5 -31 L-31 -31 Z M0 -43 L13 -43 L24 -30 L0 -31 Z',fill:'#DCE8E3',stroke:INK,'stroke-width':2.2,'stroke-linejoin':'round'},g);
      mk('path',{d:'M-56 -47 L-56 -52 M6 -47 L6 -52',stroke:INK,'stroke-width':2},g);
      mk('path',{d:'M-70 -55 Q-24 -62 22 -55 Q-24 -50 -70 -55 Z',fill:CARD,stroke:INK,'stroke-width':2,'stroke-linejoin':'round'},g);mk('line',{x1:-52,y1:-55.4,x2:4,y2:-55.4,stroke:RED,'stroke-width':2.2},g);
      mk('rect',{x:69,y:-16,width:9,height:6,rx:2.6,fill:CHROME,stroke:INK,'stroke-width':1.8},g);mk('rect',{x:-79,y:-16,width:9,height:6,rx:2.6,fill:CHROME,stroke:INK,'stroke-width':1.8},g);
      return [wheel(g,-46,9.4,false),wheel(g,46,9.4,false)];},
    function bus(g){shadowOf(g,58);
      mk('path',{d:'M-54 -8 L-54 -46 Q-54 -58 -42 -58 L36 -58 Q50 -58 53 -42 L56 -8 Z',fill:CARD,stroke:INK,'stroke-width':3.2,'stroke-linejoin':'round'},g);
      mk('path',{d:'M-54 -8 L-54 -30 L54.5 -30 L56 -8 Z',fill:TEAL,stroke:INK,'stroke-width':3.2,'stroke-linejoin':'round'},g);
      mk('path',{d:'M-47 -35 L-47 -51 L-27 -51 L-27 -35 Z M-22 -51 L-2 -51 L-2 -35 L-22 -35 Z M3 -51 L23 -51 L23 -35 L3 -35 Z M29 -51 L41 -51 Q46 -50 47 -35 L29 -35 Z',fill:'#DCE8E3',stroke:INK,'stroke-width':2.2,'stroke-linejoin':'round'},g);
      mk('circle',{cx:52,cy:-24,r:3,fill:CARD,stroke:INK,'stroke-width':1.4},g);
      return [wheel(g,-32,9.4,false),wheel(g,34,9.4,false)];}
  ];
  const traffic=[];let nextTraffic=0, kindN=0;
  function spawnTraffic(now){
    const dir=Math.random()<.5?1:-1, y=dir>0?NEAR:FAR;
    if(traffic.some(t=>t.dir===dir&&(dir>0?t.x<420:t.x>860)))return;
    const g=mk('g',{},roadG), wh=KINDS[kindN++%KINDS.length](g);g.__y=y;
    traffic.push({g,wh,dir,y,x:dir>0?-130:1410,v:ROADV,s:D(y),spin:0});
  }

  /* ---- the salesman, in a plaid jacket, pacing the kerb ---- */
  const man={x:960,dir:1,t:0,pause:0,arm:0,walk:0};
  (function(){const g=mk('g',{},kerbG);man.g=g;
    man.l1=mk('line',{x1:-2,y1:-22,x2:-4,y2:0,stroke:INK,'stroke-width':4.4,'stroke-linecap':'round'},g);man.l2=mk('line',{x1:2,y1:-22,x2:4,y2:0,stroke:INK,'stroke-width':4.4,'stroke-linecap':'round'},g);
    man.a2=mk('line',{x1:0,y1:-38,x2:-5,y2:-24,stroke:INK,'stroke-width':3.4,'stroke-linecap':'round'},g);
    mk('rect',{x:-7.5,y:-42,width:15,height:21,rx:3.4,fill:RED,stroke:INK,'stroke-width':2.2},g);
    mk('path',{d:'M-2.5 -42 L-2.5 -21 M2.5 -42 L2.5 -21 M-7.5 -35 L7.5 -35 M-7.5 -28 L7.5 -28',stroke:CARD,'stroke-width':1.3,opacity:.9},g);
    mk('path',{d:'M0 -42 L0 -21 M-7.5 -31.5 L7.5 -31.5',stroke:INK,'stroke-width':.9,opacity:.7},g);
    man.a1=mk('line',{x1:1,y1:-38,x2:6,y2:-24,stroke:INK,'stroke-width':3.4,'stroke-linecap':'round'},g);
    mk('circle',{cx:0,cy:-48,r:5.6,fill:'#E8B98F',stroke:INK,'stroke-width':2},g);
    mk('path',{d:'M-8 -51 L8 -51 M-5.4 -51.4 L-5 -56.4 L5 -56.4 L5.4 -51.4 Z',fill:INK,stroke:INK,'stroke-width':2,'stroke-linejoin':'round'},g);})();

  /* ================= the bays ================= */
  let lay={per:0,rows:0,k:1}, bays=[];              /* bays[j] = the car index parked or expected there, or null */
  function perFor(n,rows){let p=8;while(p*rows<n)p+=2;return p;}
  const rowY=row=>ROWY[Math.min(row,ROWY.length-1)]-(row>=ROWY.length?(row-ROWY.length+1)*30:0);
  const persp=(x,y)=>640+(x-640)*D(y)/D(ROWY[0]);      /* the rows draw in toward the middle as they go back */
  function bayPos(j){const row=Math.floor(j/lay.per), c=j%lay.per, half=lay.per/2, pitch=(GAP0-44)/half, y=rowY(row);
    return {x:persp(c<half?44+pitch*(c+.5):GAP1+pitch*(c-half+.5),y),y,row,left:c<half};}
  const scaleAt=y=>D(y)*(1+(lay.k-1)*cl(500-y,0,30));
  let stickyPer=0;                                     /* within one game the pitch never tightens and loosens again */
  function ensureLayout(baseN,need,inGame){
    /* room for the peaches that come back in the rule change: up to half as many cars again, in five rows */
    let per=Math.max(perFor(Math.ceil(baseN*1.5),5),inGame?stickyPer:0);if(per*5<need)per=perFor(need,5);if(inGame)stickyPer=per;
    let top=-1;bays.forEach((v,j)=>{if(v!==null&&v!==undefined)top=j;});
    const rows=Math.max(3,Math.ceil(Math.max(need,1)/per)), was=lay;
    if(per!==was.per){
      /* the pitch changes: everybody keeps their order and the cars roll to their new marks */
      const order=bays.map((v,j)=>v).filter(v=>v!==null&&v!==undefined);bays=[];order.forEach((v,j)=>{bays[j]=v;const b=cars.get(v);if(b)b.bay=j;});top=order.length-1;
    }
    lay={per,rows:Math.max(rows,Math.ceil((top+1)/per)),k:Math.max(.5,Math.min(1.15,((GAP0-44)/(per/2))/118))};
    while(bays.length<lay.rows*lay.per)bays.push(null);
    if(per!==was.per||lay.rows!==was.rows){
      while(bayG.firstChild)bayG.firstChild.remove();
      for(let r=0;r<Math.max(5,lay.rows);r++){const y=rowY(r), half=lay.per/2, pitch=(GAP0-44)/half;
        for(let c=0;c<=half;c++)[44+pitch*c,GAP1+pitch*c].forEach(x=>{const X=persp(x,y).toFixed(1);mk('line',{x1:X,y1:y-3,x2:X,y2:y+5},bayG);});}
    }
  }
  function freeBay(far){let best=-1,bd=-1;
    for(let j=0;j<lay.rows*lay.per;j++){if(bays[j]!==null&&bays[j]!==undefined)continue;if(!far)return j;const p=bayPos(j), d=Math.abs(p.x-640)+(KERB-p.y)*1.5;if(d>bd){bd=d;best=j;}}
    return best;}

  /* ================= driving ================= */
  function buildPath(pts,r){
    const out=[pts[0]];
    for(let i=1;i<pts.length-1;i++){const A=pts[i-1],B=pts[i],C=pts[i+1], la=Math.hypot(B[0]-A[0],B[1]-A[1])||1, lb=Math.hypot(C[0]-B[0],C[1]-B[1])||1, rr=Math.min(r,la/2,lb/2);
      const p0=[B[0]+(A[0]-B[0])*rr/la,B[1]+(A[1]-B[1])*rr/la], p1=[B[0]+(C[0]-B[0])*rr/lb,B[1]+(C[1]-B[1])*rr/lb];
      for(let k=0;k<=8;k++){const t=k/8,u=1-t;out.push([u*u*p0[0]+2*u*t*B[0]+t*t*p1[0],u*u*p0[1]+2*u*t*B[1]+t*t*p1[1]]);}}
    out.push(pts[pts.length-1]);
    const cum=[0];for(let i=1;i<out.length;i++)cum.push(cum[i-1]+Math.hypot(out[i][0]-out[i-1][0],out[i][1]-out[i-1][1]));
    return {p:out,cum,len:cum[cum.length-1]};
  }
  const aisleOf=p=>p.row===0?KERB-9:(p.y+rowY(p.row-1))/2+3;   /* the lane in front of a row, half hidden by the row in front */
  function pathOut(b,toRight){
    /* two lanes down the driveway, so each stream leaves in single file: the right-hand one for the cars turning right,
       the left-hand one for the cars turning left. A car from the far block crosses the driveway along its own aisle
       first; a car from the near block swings round into the lane */
    const p=bayPos(b.bay), ya=aisleOf(p), pts=[[b.x,b.y],[p.x+50*lay.k,ya]], sg=toRight?1:-1, lane=y=>640+sg*(16+(y-300)*.27), yk=Math.min(ya+16,KERB+2);
    if(p.left===toRight)pts.push([lane(ya)-sg*36,ya]);else pts.push([lane(ya)+sg*44,ya],[lane(yk)-sg*6,yk]);
    pts.push([lane(KERB)+sg*8,KERB+5],[640+sg*136,toRight?NEAR:FAR]);
    pts.push(toRight?[1440,NEAR]:[-160,FAR]);
    const P=buildPath(pts,44);
    /* the gate, as a distance along the path: the last place to wait for a gap in the traffic */
    const G=pts[2];let gi=0,gd=1e9;P.p.forEach((q,i)=>{const d=Math.hypot(q[0]-G[0],q[1]-G[1]);if(d<gd){gd=d;gi=i;}});P.gate=Math.max(0,P.cum[gi]-46);
    return P;
  }
  function pathIn(b){
    const p=bayPos(b.bay), ya=aisleOf(p), mid=ya+(KERB-ya)*.5, pts=[[-150,NEAR],[536,NEAR]];
    if(p.left)pts.push([640,KERB+6],[676,mid],[600,ya],[p.x-54*lay.k,ya]);else pts.push([606,KERB+2],[686,ya],[p.x-54*lay.k,ya]);
    pts.push([p.x,p.y]);
    const P=buildPath(pts,44);P.gate=536+150-60;return P;
  }
  function at(b){const P=b.path;let i=b.pi||0;while(i<P.cum.length-2&&P.cum[i+1]<b.d)i++;while(i>0&&P.cum[i]>b.d)i--;b.pi=i;
    const A=P.p[i],B=P.p[i+1], L=(P.cum[i+1]-P.cum[i])||1, t=Math.max(0,Math.min(1,(b.d-P.cum[i])/L));
    return {x:A[0]+(B[0]-A[0])*t,y:A[1]+(B[1]-A[1])*t,hx:(B[0]-A[0])/L,hy:(B[1]-A[1])/L};}

  const cars=new Map();                                /* index -> the car */
  let movers=[], depQ=[], arrQ=[], lastDep=0, lastArr=0, moveSeq=0;
  const tally={R:{L:0,P:0},L:0,in:0,back:0};           /* what has been staged, for checking against the stat line */
  function place(b){if(!b.g)b.g=carNode(b);else if(b.g.parentNode!==lotG)lotG.appendChild(b.g);const p=bayPos(b.bay);b.x=p.x;b.y=p.y;b.s=scaleAt(p.y);b.face=1;b.dir=1;b.fs=1;b.state='parked';b.fade=1;b.g.setAttribute('opacity',1);}
  function startOut(b,now){
    b.state='move';b.mode=b.out.right?'R':'L';b.path=pathOut(b,b.out.right);b.d=0;b.pi=0;b.v=0;b.seq=moveSeq++;b.col=b.out.right?(b.out.type==='P'?TERRA:OCHRE):TERRA;b.reveal=0;
    if(b.out.right)tally.R[b.out.type==='P'?'P':'L']++;else tally.L++;
    bays[b.bay]=null;b.bay=-1;movers.push(b);lastDep=now;
  }
  function startIn(b,now){
    const j=freeBay(true);if(j<0)return false;
    bays[j]=b.i;b.bay=j;if(!b.g)b.g=carNode(b);roadG.appendChild(b.g);b.badge.setAttribute('opacity',b.badgeOn?1:0);b.body.setAttribute('fill',TAN);b.g.setAttribute('opacity',1);
    b.state='move';b.mode='in';b.path=pathIn(b);b.d=0;b.pi=0;b.v=ROADV;b.seq=moveSeq++;b.x=-150;b.y=NEAR;b.s=D(NEAR);b.face=1;b.dir=1;b.fs=1;b.reveal=0;b.col=null;
    if(b.badgeOn)tally.back++;else tally.in++;
    movers.push(b);lastArr=now;return true;
  }
  function roadThreat(forIn){return traffic.some(t=>forIn?(t.dir<0&&t.x>470&&t.x<1180):(t.dir>0?t.x<900:t.x>380));}
  function drive(b,dt,now){
    const P=b.path, onRoad=b.y>KERB-2;let vt=onRoad?ROADV:205;
    vt*=1-.4*Math.min(1,Math.abs(b.hy||0)*1.2);
    const rem=P.len-b.d;if(b.mode==='in')vt=Math.min(vt,Math.sqrt(2*200*Math.max(0,rem))+10);
    if(b.d<P.gate&&roadThreat(b.mode==='in'))vt=Math.min(vt,Math.sqrt(2*320*Math.max(0,P.gate-b.d-3)));
    for(const o of movers){if(o===b||o.seq>b.seq)continue;const dx=o.x-b.x, dy=o.y-b.y;if(dx*(b.hx||1)+dy*(b.hy||0)<=0&&!(o.mode===b.mode&&b.mode!=='in'&&dy>-2&&b.y>300&&Math.abs(b.x-640)<90))continue;
      const u=Math.hypot(dx/(70*(b.s+o.s)+8),dy/26);if(u<1.5)vt=Math.min(vt,Math.max(0,u-1)*520);}
    b.v+=Math.max(-640*dt,Math.min(300*dt,vt-b.v));if(b.v<0)b.v=0;
    const step=b.v*dt;b.d=Math.min(P.len,b.d+step);
    const q=at(b);b.x=q.x;b.y=q.y;b.hx=q.hx;b.hy=q.hy;
    if(Math.abs(q.hx)>.3)b.dir=q.hx>0?1:-1;
    if(b.mode==='in'&&rem<3)b.dir=1;
    const df=b.dir-b.face;if(Math.abs(df)>.01){b.face+=Math.sign(df)*Math.min(Math.abs(df),dt*6.5);if(Math.abs(b.face)<.07)b.face=.07*Math.sign(df);}else b.face=b.dir;
    b.fs+=((1-.3*Math.min(1,Math.abs(q.hy)*1.15))-b.fs)*Math.min(1,dt*6);
    b.s=scaleAt(b.y);b.spin+=step/(9.6*b.s)*57.3*(b.face>=0?1:-1);
    if(b.col&&b.reveal<1&&b.d>18){b.reveal=Math.min(1,b.reveal+dt/1.3);b.body.setAttribute('fill',mix(TAN,b.col,b.reveal));}
    const want=b.y>KERB-3?roadG:lotG;if(b.g.parentNode!==want)want.appendChild(b.g);
    if(b.d>=P.len-.01){
      if(b.mode==='in'){if(b.face!==1){b.dir=1;return false;}b.state='parked';b.fs=1;const p=bayPos(b.bay);b.x=p.x;b.y=p.y;
        if(b.after){const a=b.after;b.after=null;queueOut(b,a);}return true;}
      b.g.remove();b.g=null;b.state='absent';
      if(b.wantBack){b.wantBack=false;arrQ.push(b);b.state='queued';}
      return true;}
    return false;
  }
  function queueOut(b,o){b.out=o;b.state='leaving';depQ.push(b);const p=c=>{const q=bayPos(c.bay);return Math.abs(q.x-640)+(KERB-q.y)*1.6;};depQ.sort((a,c)=>p(a)-p(c));}
  function put(b,now){
    const parked=b.state==='parked'||b.state==='leaving';
    if(parked){const p=bayPos(b.bay), dx=p.x-b.x, dy=p.y-b.y;if(dx||dy){const m=Math.hypot(dx,dy), st=Math.min(m,2.6);b.x+=dx/m*st;b.y+=dy/m*st;b.spin+=st/(9.6*b.s)*57.3*Math.sign(dx||1);}b.s+=(scaleAt(p.y)-b.s)*.15;}
    const jig=b.state==='leaving'?Math.sin(now/34+b.i)*.4:0;
    b.g.setAttribute('transform','translate('+b.x.toFixed(1)+' '+(b.y+jig).toFixed(1)+') scale('+(b.s*b.face*b.fs).toFixed(3)+' '+b.s.toFixed(3)+')');
    if(b.spinShown!==Math.round(b.spin)){b.spinShown=Math.round(b.spin);const r='rotate('+b.spinShown+')';b.wh[0].setAttribute('transform',r);b.wh[1].setAttribute('transform',r);}
    const bf=b.face<0?-1:1;if(bf!==b.badgeFace){b.badgeFace=bf;b.badge.setAttribute('transform','scale('+bf+' 1)');}
    if(b.shKey!==shadowKey){b.shKey=shadowKey;b.shadow.setAttribute('transform',shadowKey);}
    const heat=parked?heatAmt*(.3+.3*Math.sin(now/420+b.i*1.9)):0;
    if(heat>.02||b.heatOn){b.heatOn=heat>.02;b.heat.setAttribute('opacity',heat.toFixed(2));b.heat.setAttribute('transform','translate('+(Math.sin(now/170+b.i)*1.6).toFixed(1)+' '+(-((now/90+b.i*7)%7)).toFixed(1)+')');}
    /* the glint: a band of light crossing the lot now and then catches each windscreen in turn */
    const gx=(glintX-b.x)/(b.s*(b.face<0?-1:1));
    if(Math.abs(gx)<44){b.glintOn=true;b.glint.setAttribute('opacity',.85);b.glint.setAttribute('transform','translate('+gx.toFixed(1)+' 0)');}else if(b.glintOn){b.glintOn=false;b.glint.setAttribute('opacity',0);}
  }

  /* ================= the frame ================= */
  let raf=0,lastT=0,lastSort=0,day=0,dayTo=0,heatAmt=.5,shadowKey='',glintX=-999,nextGlint=3000,chase=-1,chaseGold=-1,frameN=0;
  const SUNPATH=[[0,318,112,42],[.33,470,74,38],[.55,690,58,38],[.75,940,100,40],[1,1128,190,52]];
  function wake(){if(!raf)raf=requestAnimationFrame(frame);}
  function frame(now){
    raf=0;if(!slide.classList.contains('active')){lastT=0;return;}
    const dt=lastT?Math.min(.05,(now-lastT)/1000):0;lastT=now;frameN++;
    /* departures first, a few at a time; arrivals once the lot's own cars are out on the road */
    if(depQ.length){const gap=Math.max(150,Math.min(440,5200/(depQ.length+6)));
      if(now-lastDep>gap&&movers.filter(m=>m.mode!=='in'&&m.y<KERB).length<6){const b=depQ.shift();if(b.state==='leaving'&&b.bay>=0)startOut(b,now);}}
    else if(arrQ.length&&now-lastDep>500&&now-lastArr>Math.max(260,Math.min(460,5200/(arrQ.length+6)))
      &&movers.filter(m=>m.mode!=='in'&&m.y<KERB+6).length<3&&!movers.some(m=>m.mode==='in'&&m.y>KERB&&m.x<40)&&!traffic.some(t=>t.dir>0&&t.x<330)){
      const b=arrQ[0];if(startIn(b,now))arrQ.shift();}
    if(movers.length){movers=movers.filter(b=>!drive(b,dt,now));}
    cars.forEach(b=>{if(b.g){if(b.fadeOut){b.fade-=dt*2.4;if(b.fade<=0){b.g.remove();cars.delete(b.i);return;}b.g.setAttribute('opacity',b.fade.toFixed(2));}put(b,now);}});
    if((movers.length||frameN<3)&&now-lastSort>140){lastSort=now;
      [...lotG.children].map(g=>g.__b).filter(Boolean).sort((a,c)=>a.y-c.y).forEach(b=>lotG.appendChild(b.g));}
    /* the road */
    const busy=movers.length||depQ.length||arrQ.length;
    if(now>nextTraffic){nextTraffic=now+3800+Math.random()*5200;if(!busy)spawnTraffic(now);}
    for(let i=traffic.length-1;i>=0;i--){const t=traffic[i];let vt=ROADV;
      for(const m of movers){if(Math.abs(m.y-t.y)>16)continue;const gap=(m.x-t.x)*t.dir;if(gap>0&&gap<230)vt=Math.min(vt,Math.max(0,gap-150)*3);}
      t.v+=Math.max(-500*dt,Math.min(240*dt,vt-t.v));t.x+=t.v*dt*t.dir;t.spin+=t.v*dt/(9.6*t.s)*57.3;
      t.g.setAttribute('transform','translate('+t.x.toFixed(1)+' '+(t.y+Math.sin(now/60+i)*.3).toFixed(1)+') scale('+(t.s*t.dir).toFixed(3)+' '+t.s.toFixed(3)+')');
      const r='rotate('+Math.round(t.spin)+')';t.wh[0].setAttribute('transform',r);t.wh[1].setAttribute('transform',r);
      if(t.x<-170||t.x>1450){t.g.remove();traffic.splice(i,1);}}
    if(frameN%10===0&&roadG.children.length>1){const yOf=n=>n.__b?n.__b.y:(n.__y||0);[...roadG.children].sort((a,c)=>yOf(a)-yOf(c)).forEach(n=>roadG.appendChild(n));}
    /* the light follows the game */
    day+=Math.sign(dayTo-day)*Math.min(Math.abs(dayTo-day),dt*.055);
    {let k=0;while(k<SUNPATH.length-2&&SUNPATH[k+1][0]<day)k++;const A=SUNPATH[k],B=SUNPATH[k+1],t=cl(day,A[0],B[0]),e=t*t*(3-2*t);
      const sx=A[1]+(B[1]-A[1])*e, sy=A[2]+(B[2]-A[2])*e, sr=A[3]+(B[3]-A[3])*e, gold=Math.pow(cl(day,.6,1),1.6), dawn=1-cl(day,0,.3);
      sunG.setAttribute('transform','translate('+sx.toFixed(1)+' '+sy.toFixed(1)+')');sun.setAttribute('r',sr.toFixed(1));sunRing.setAttribute('r',(sr+17+Math.sin(now/1400)*2).toFixed(1));
      sun.setAttribute('fill',gold>.4?'#F6B866':dawn>.4?'#F6D9A0':'#F4E6AE');
      dawnO.setAttribute('opacity',(.5*dawn).toFixed(3));goldO.setAttribute('opacity',(.6*gold).toFixed(3));roseO.setAttribute('opacity',(.4*gold).toFixed(3));
      backGold.setAttribute('opacity',(.3*gold).toFixed(3));groundGold.setAttribute('opacity',(.17*gold+.05*dawn).toFixed(3));
      officeLit.setAttribute('opacity',(.92*gold).toFixed(3));lampGlow.forEach(e=>e.setAttribute('opacity',(.75*gold).toFixed(2)));
      cloudG.setAttribute('fill',gold>.5?'#F8DDB9':dawn>.5?'#FAEBDB':CLOUD);
      heatAmt=.45+.55*(1-Math.min(1,Math.abs(day-.5)*2.4));
      const low=1-cl(190-sy,0,130), off=(640-sx)/640;shadowKey='translate('+(off*(4+22*low)).toFixed(0)+' 0) scale('+(1+.3*low*Math.abs(off)).toFixed(2)+' 1)';
      /* the bulbs chase all day and glow at golden hour */
      const step=Math.floor(now/130);if(step!==chase||gold!==chaseGold){chase=step;chaseGold=gold;
        bulbs.forEach(u=>{const on=u.set==='star'?((u.k+Math.floor(step/3))%2===0):((u.k-step)%3+3)%3===0;
          if(on!==u.on){u.on=on;u.c.setAttribute('fill',on?'#FFF3C0':'#CDBE92');}u.h.setAttribute('opacity',on?(.15+.5*gold).toFixed(2):0);});}}
    starburst.setAttribute('transform','translate(1012 62) rotate('+((now/90)%360).toFixed(1)+')');
    /* pennants, palms, clouds */
    const gust=Math.max(0,Math.sin(now/5200))*10;
    for(let i=frameN%2;i<flags.length;i+=2){const f=flags[i];f.el.setAttribute('transform','translate('+f.x.toFixed(1)+' '+f.y.toFixed(1)+') rotate('+(Math.sin(now/230+f.ph)*13+Math.sin(now/940+f.x/170)*9+gust).toFixed(1)+')');}
    palms.forEach(p=>p.head.setAttribute('transform','translate('+p.x+' '+p.y+') rotate('+(Math.sin(now/1700+p.ph)*3.5+gust*.3).toFixed(2)+')'));
    clouds.forEach(c=>{c.x+=c.v*dt;if(c.x>1400)c.x=-130;c.g.setAttribute('transform','translate('+c.x.toFixed(1)+' '+c.y.toFixed(1)+') scale('+c.s.toFixed(2)+')');});
    if(now>nextGlint){nextGlint=now+7000+Math.random()*6000;glintX=-80;}
    if(glintX>-900){glintX+=dt*520;if(glintX>1400)glintX=-999;}
    /* the salesman paces, and turns to watch a car go */
    {const gone=movers.find(m=>m.mode!=='in'&&m.y>KERB-2&&m.x>-40&&m.x<1320);
      if(gone){man.dirShown=gone.x>man.x?1:-1;man.arm+=(1-man.arm)*Math.min(1,dt*5);}
      else{man.arm+=(0-man.arm)*Math.min(1,dt*4);
        if(man.pause>0){man.pause-=dt;}else{man.x+=man.dir*26*dt;man.walk+=dt*7.5;if(man.x>1200||man.x<860){man.dir=-man.dir;man.x=Math.max(860,Math.min(1200,man.x));man.pause=1.2+Math.random()*2.5;}}
        man.dirShown=man.dir;}
      const sw=(man.pause>0||gone)?0:Math.sin(man.walk)*5.5;
      man.l1.setAttribute('x2',(-1.5+sw).toFixed(1));man.l2.setAttribute('x2',(1.5-sw).toFixed(1));
      const up=man.arm, wv=gone?Math.sin(now/130)*3*up:0;
      man.a1.setAttribute('x2',(6-sw*.7+up*5+wv).toFixed(1));man.a1.setAttribute('y2',(-24-up*32).toFixed(1));man.a2.setAttribute('x2',(-5+sw*.7).toFixed(1));
      man.g.setAttribute('transform','translate('+man.x.toFixed(1)+' 489) scale('+(man.dirShown*1.02)+' 1.02)');}
    wake();
  }

  /* ================= the room ================= */
  const demo=QS.get('demo')==='1', ROOM=QS.get('market')||'m8-market';
  const rules=$('lotRules'), stats=$('lotStats');
  const money=v=>'$'+Math.abs(v).toLocaleString('en-GB');
  let S=null, sim=null, synced=false, lastKey='';
  function clearAll(){cars.forEach(b=>{if(b.g)b.g.remove();});cars.clear();movers=[];depQ=[];arrQ=[];bays=[];lay={per:0,rows:0,k:1};stickyPer=0;tally.R.L=tally.R.P=tally.L=tally.in=tally.back=0;}
  function sync(){
    const joins=S?S.joins.length:0, inGame=!!(sim&&sim.N), key=inGame?'g|'+S.seed+'|'+sim.N:'pre', now=performance.now();
    let first=!synced;
    if(synced&&key!==lastKey&&!(lastKey==='pre'&&inGame)){clearAll();first=true;}       /* a Poll Desk reset, or another game */
    lastKey=key;synced=true;
    const want=new Map();
    if(!inGame){const n=Math.max(24,joins+(joins%2));for(let i=0;i<n;i++)want.set(i,{on:true,c:null});}
    else sim.cars.forEach(c=>want.set(c.i,{on:!c.sold&&!c.gone,c}));
    let need=0;want.forEach(w=>{if(w.on)need++;});
    ensureLayout(inGame?sim.N:need,need,inGame);
    want.forEach((w,i)=>{
      let b=cars.get(i);const back=!!(w.c&&w.c.back);
      if(!b){b={i,state:'absent',bay:-1,g:null,badgeOn:back,x:0,y:0,s:1,face:1,dir:1,fs:1,spin:0,fade:1};cars.set(i,b);
        if(w.on){if(first){let j=(i<bays.length&&(bays[i]===null||bays[i]===undefined))?i:freeBay(false);if(j<0){ensureLayout(inGame?sim.N:need,need+lay.per,inGame);j=freeBay(false);}bays[j]=i;b.bay=j;place(b);b.g.__b=b;}
          else{b.state='queued';arrQ.push(b);}}}
      else if(w.on){
        if(b.state==='absent'){b.state='queued';arrQ.push(b);}
        else if(b.state==='leaving'){depQ=depQ.filter(x=>x!==b);b.state='parked';}
        else if(b.state==='move'&&b.mode!=='in')b.wantBack=true;
        b.after=null;}
      else{
        const o={right:!!w.c.sold,type:w.c.type};
        if(b.state==='parked')queueOut(b,o);
        else if(b.state==='leaving')b.out=o;
        else if(b.state==='queued'){arrQ=arrQ.filter(x=>x!==b);b.state='absent';}
        else if(b.state==='move'&&b.mode==='in')b.after=o;
        b.wantBack=false;}
      if(b.badgeOn!==back){b.badgeOn=back;if(b.badge)b.badge.setAttribute('opacity',back?1:0);}
      if(b.g)b.g.__b=b;
    });
    cars.forEach((b,i)=>{if(want.has(i))return;
      if(b.bay>=0)bays[b.bay]=null;depQ=depQ.filter(x=>x!==b);arrQ=arrQ.filter(x=>x!==b);movers=movers.filter(x=>x!==b);
      if(b.g&&!first){b.fadeOut=true;b.bay=-1;b.state='absent';}else{if(b.g)b.g.remove();cars.delete(i);}});
    dayTo=!inGame?0:[0,.33,.55,.75,1][Math.min(4,sim.round)];if(first)day=dayTo;
    /* the cards: Ryan's wording, as it was on the plain slide */
    $('mkBuyers').textContent=joins;
    if(!inGame){rules.classList.remove('off');stats.classList.remove('on');}
    else{rules.classList.add('off');stats.classList.add('on');
      const r=sim.round, x=sim.rounds[r];
      $('lotRound').textContent=(r===4?'The rule change · round 4':'Round '+r)+(sim.open?' · open':' · closed');
      const el=$('lotLine');while(el.firstChild)el.firstChild.remove();
      const say=(t,bold)=>{if(bold){const e=document.createElement('b');e.textContent=t;el.appendChild(e);}else el.appendChild(document.createTextNode(t));};
      if(sim.open){const bids=Object.keys(S.bids[r]||{}).length;say(String(bids),1);say(' bid'+(bids===1?'':'s')+' in of '+joins+'. Press C to close the round');}
      else if(x){say(String(x.bidders),1);say(' bids, average ');say(x.avg===null?'–':money(x.avg),1);say('. ');say(String(x.sold),1);
        say(' sold ('+x.peachSold+' peach'+(x.peachSold===1?'':'es')+', '+x.lemonSold+' lemon'+(x.lemonSold===1?'':'s')+'), '+x.refused+' refused'+(x.none?', '+x.none+' found no car':'')+'. Buyers this round: ');
        say((x.profit<0?'−':'+')+money(x.profit),1);
        if(x.withdrew){say('. ');say(x.withdrew+' peach owner'+(x.withdrew===1?'':'s')+' withdrew',1);}
        if(x.arrivals)say('. '+x.arrivals+' new car'+(x.arrivals===1?'':'s')+' arrived');}
    }
    cars.forEach(b=>{if(b.g)b.g.__b=b;});
    wake();
  }

  /* ---- the rehearsal: a room kept in memory, in the wire format at the top of lot.js ---- */
  const lines=[], NAMES='Priya,Tom,Elena,Marcus,Sam,Aisha,Ben,Cara,Dev,Hana,Ivan,Jo,Kemi,Luis,Mei,Noor,Owen,Rosa,Theo,Uma,Vik,Wen,Yara,Zoe,Alex,Bea,Carl,Dina'.split(',');
  let demoJoined=0, demoBids=[];const dr=rng(1970);
  function demoOpen(r){const r50=v=>Math.round(v/50)*50;
    demoBids=NAMES.slice(0,demoJoined).map(n=>r===1?'bid|1|'+n+'|'+r50(1900+dr()*1300):r===2?'bid|2|'+n+'|'+r50(1400+dr()*1300):r===3?'bid|3|'+n+'|'+r50(1000+dr()*900):'bid|4|'+n+'|'+r50(1000+dr()*500)+'|'+r50(3000+dr()*900));
    demoBids.sort(()=>dr()-.5);}
  function read(){
    if(demo){S=LOT.parse(lines);sim=LOT.simulate(S);sync();return Promise.resolve();}
    return fetch(POLL_API+'/p/'+ROOM+'/answers').then(r=>r.json()).then(d=>{S=LOT.parse(d.answers||[]);sim=LOT.simulate(S);sync();}).catch(()=>{if(!S){S={joins:[],bids:{}};sim=null;sync();}});
  }
  const post=line=>{if(demo){lines.push(line);const m=/^::open\|([1-4])/.exec(line);if(m)demoOpen(+m[1]);else demoBids=[];return Promise.resolve();}return deckSay(ROOM,line);};
  const seed=()=>demo?'rehearsal'+lines.length:Math.random().toString(36).slice(2,10);
  addEventListener('keydown',e=>{
    if(!slide.classList.contains('active')||!S)return;
    const k=e.key;
    if(/^[123]$/.test(k)){const r=+k;if(sim&&sim.round>=r)return;if(r>1&&(!sim||sim.round!==r-1||sim.open))return;
      const line=r===1?'::open|1|'+seed()+'|'+Math.max(2,S.joins.length+(S.joins.length%2)):'::open|'+r+'|'+seed();
      post(line).then(read);e.preventDefault();}
    else if(k==='w'||k==='W'){if(!sim||sim.round<3||sim.open||sim.round>=4)return;post('::open|4|'+seed()+'|w').then(read);e.preventDefault();}
    else if(k==='c'||k==='C'){if(!sim||!sim.open)return;post('::close|'+sim.round).then(read);e.preventDefault();}
  });
  if(demo){
    $('lotDemo').style.display='';
    for(;demoJoined<22;demoJoined++)lines.push('join|'+NAMES[demoJoined]);
    setInterval(()=>{if(!slide.classList.contains('active'))return;let ch=false;
      if(demoJoined<NAMES.length&&!(sim&&sim.N)){lines.push('join|'+NAMES[demoJoined++]);ch=true;}
      for(let n=0;n<3&&demoBids.length;n++){lines.push(demoBids.shift());ch=true;}
      if(ch)read();},650);
    read();
  }else{setInterval(read,2500);read();}
  new MutationObserver(()=>{if(slide.classList.contains('active'))wake();}).observe(slide,{attributes:true,attributeFilter:['class']});
  /* a hook for the headless checks: what has been staged, to hold against the stat line */
  window.LOTSCENE={tally,state:()=>({movers:movers.length,dep:depQ.length,arr:arrQ.length,parked:[...cars.values()].filter(b=>b.state==='parked').length,day:+day.toFixed(2),lay})};
  wake();
})();
