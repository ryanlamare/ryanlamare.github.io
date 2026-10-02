/* ---- Module 5's closing exercise, the room view: one flight (Ryan's idea,
   18 Sep 2026, in the style of Module 3's airfield). Each phone (games/)
   sends two lines into m5-games, a‖name‖players‖situation‖partner and
   b‖options‖s-or-b-or-c‖focal point; the deck groups the room's lines by
   phone (the latest a and b win) and lights one window on the aircraft per
   pair, in arrival order from the front, two panes under one shade, tinted
   by the game. The windows spread evenly from the front door to the rear
   door and close up as more arrive.

   The aircraft is in flight: clouds stream past in three layers, the land
   scrolls far below, the aircraft bobs, the wing flexes, the lights blink.
   A click on a window raises its shade and the camera pushes in to it; the
   opened view is that row of the cabin, two passengers who are the two
   PLAYERS the pair named, their faces drawing the game the pair tapped:
   stag hunt, both smiling at each other; battle of the sexes, one pleased
   and one glum, turned to each other; chicken, arms folded, chins up,
   neither looking. The focal point is on the seat-back screen, and the
   pair's own names stand above their answers from the moment the row opens
   (Ryan, 18 Sep: anonymity is dropped). Closing pulls the camera back; the
   shade stays up and two small heads show in the window.

   When the last shade is up the flight lands: it descends, the land comes
   up, the gear comes down, a runway scrolls in, it touches down and stops.
   Windows stay clickable throughout and a late window simply lights. A
   click on the sun lowers every shade and takes off again (for rehearsal).

   The E key plays the ending from wherever the flight is: an open row
   closes, every shade still down goes up in a ripple from the front of the
   cabin with no zoom, and the flight lands without the wait. Once it is on
   its way down or on the ground E does nothing; the sun is the way back.

   Mouse only, but for E. With a row open, Esc, the arrow keys, space or a
   click close it; with none open the keys move on as usual. ?demo=1 keeps
   the invented entries (they also show until the room answers). ALL TEXT in
   DEMO is editable; nothing depends on it. Every node of the scene is made with
   createElementNS and moved by its transform attribute (no innerHTML on the
   scene, no CSS transforms on SVG). Expects POLL_API and M5SUF. ---- */
(function(){
  const $=id=>document.getElementById(id), svg=$('flightSvg');
  if(!svg)return;
  const slide=svg.closest('.slide'), NS='http://www.w3.org/2000/svg';
  function mk(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);(parent||svg).appendChild(e);return e;}
  function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
  function hash(v){let h=2166136261;v=String(v);for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619);}
    h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;return h>>>0;}
  const INK='#1B1C19', PAPER='#E9E2D2', SOFT='#F0EAD9', CARD='#F7F2E6', RED='#CE1E32', OCHRE='#C9A227', TEAL='#59949C', TERRA='#B5573A',
        SKY='#CFDDD6', SKYLOW='#E2EADF', SKYHIGH='#BDD2D0', GRASS='#BFC99C', GRASSD='#A9B585', HILL='#B4C2A2', HILLFAR='#C8D3BC', APRON='#7A7870', RUNWAY='#55534D', CLOUD='#F6F2E7', WATER='#A8C5CC';
  const TINT={s:TEAL,b:TERRA,c:RED};

  const NAMES='Sam,Priya,Marcus,Elena,Tom,Aisha,Ben,Chloe,Daniel,Farah,George,Hannah,Ivan,Jess,Karim,Laura,Mike,Nadia,Oscar,Rachel,Steve,Yusuf'.split(',');
  const E=[
    ['Me and the hiring committee','Recruiting a candidate','The strongest record, or the best cultural fit','s','Where the candidate did their PhD'],
    ['Us and the supplier','Tooling up for the new engine line','Invest now, or wait for the signed contract','s','The letter of intent'],
    ['Our engineers and theirs','One CAD standard for the joint programme','Our standard, or theirs','b','Whoever held the design authority'],
    ['Us and the other department','Moving onto the new reporting system','This quarter, or next year','s','The year end'],
    ['Us and the customer','Where the quarterly review is held','Our site, or theirs','b','The last contract said their site'],
    ['Our ops team and the other airline’s','One maintenance schedule for the merged fleet','Our schedule, or theirs','b','The bigger fleet'],
    ['Us and the airport','The hub lease renewal','Cut the fees, or move the hub','c','The lease expiry date'],
    ['Two project leads','Which of two overlapping projects gets the test rig','Mine first, or theirs first','c','Whoever had booked it'],
    ['Me and my manager','The date for the design review','Before the holidays, or after','s','The quarter close'],
    ['Us and the launch customer','The spec for the first production unit','Their wish list, or the certified baseline','b','What was already certified'],
    ['Our finance team and the customer’s','Which currency the long-term deal is priced in','Dollars, or pounds','b','Whatever the last deal used'],
    ['Me and a colleague','Who presents to the board','Me, or him','c','Seniority'],
    ['Two sites','Which site hosts the shared test facility','Ours, or theirs','b','The site with spare floor space'],
    ['Us and the regulator','How to report a minor finding','Formally, or in the routine update','s','The last audit’s precedent'],
    ['Us and a partner airline','Adopting the same data format for engine health','Now, or when the standard is final','s','The standards body’s draft'],
    ['Me and my team','Which meeting day the team keeps free','Monday, or Friday','b','The old calendar'],
    ['Two suppliers and us','Who holds the spare parts inventory','Us, or them','c','The contract’s silence on it'],
    ['Us and procurement','A single supplier or two for the casting','One, or two','s','The last programme did two'],
    ['Me and the client','Which time zone the standing call runs in','Theirs, or ours','b','Where the client sits'],
    ['Our safety team and production','When to stop the line for an inspection','Now, or at the shift change','s','The shift change'],
    ['Us and the union','The rota for the new shift pattern','Four days, or five','b','What the sister plant does'],
    ['Me and the auditor','How much detail goes in the report','Everything, or the material items','s','The previous year’s report'],
  ];
  const DEMO=E.map((e,i)=>({v:'demo'+i,name:NAMES[i],name2:NAMES[(i+11)%NAMES.length],p:e[0],sit:e[1],opt:e[2],g:e[3],fp:e[4]}));
  const NAME={s:'STAG HUNT',b:'BATTLE OF THE SEXES',c:'CHICKEN'};
  const demoOnly=/[?&]demo=1/.test(location.search);
  const ROOM='m5-games'+M5SUF;
  const st={live:false,list:[],demoShown:0};
  const nEls=[...document.querySelectorAll('[data-jetn]')];
  function current(){return st.live?st.list:DEMO.slice(0,st.demoShown);}
  function group(entries){
    const by=new Map();
    entries.forEach(e=>{const p=String(e.t||'').split('‖');if(p[0]!=='a'&&p[0]!=='b')return;
      if(!by.has(e.v))by.set(e.v,{v:e.v});const r=by.get(e.v);
      if(p[0]==='a'){r.name=p[1]||'';r.p=p[2]||'';r.sit=p[3]||'';r.name2=p[4]||'';}
      else{r.opt=p[1]||'';r.g=/^[sbc]$/.test(p[2])?p[2]:null;r.fp=p[3]||'';}});
    return [...by.values()].filter(r=>r.sit&&r.g);
  }
  const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2, easeOut=k=>1-Math.pow(1-k,3), cl=(v,a,b)=>Math.max(0,Math.min(1,(v-a)/(b-a)));

  /* ================= the world: sky, sun, clouds, land ================= */
  const world=mk('g',{});                           /* the camera moves this one group */
  const HY0=600, HY1=470;                           /* the horizon at cruise, and on the ground */
  mk('rect',{x:0,y:0,width:1280,height:720,fill:SKY},world);
  mk('rect',{x:0,y:0,width:1280,height:210,fill:SKYHIGH,opacity:.55},world);
  const lowSky=mk('g',{transform:'translate(0 '+HY0+')'},world);
  mk('rect',{x:0,y:-250,width:1280,height:250,fill:SKYLOW,opacity:.4},lowSky);mk('rect',{x:0,y:-150,width:1280,height:150,fill:SKYLOW,opacity:.5},lowSky);mk('rect',{x:0,y:-60,width:1280,height:60,fill:SKYLOW,opacity:.6},lowSky);
  const sunG=mk('g',{style:'cursor:pointer',transform:'translate(168 196)'},world);
  mk('circle',{cx:0,cy:0,r:62,fill:'#F3E7BC',opacity:.45},sunG);mk('circle',{cx:0,cy:0,r:42,fill:'#EFDFA8'},sunG);
  const farCloudG=mk('g',{fill:CLOUD,opacity:.8,'pointer-events':'none'},world);
  const farPlaneG=mk('g',{'pointer-events':'none'},world);
  const hillFarG=mk('g',{fill:HILLFAR},world), hillG=mk('g',{fill:HILL},world);
  const landG=mk('g',{},world);
  const midCloudG=mk('g',{fill:CLOUD,'pointer-events':'none'},world);
  const jetG=mk('g',{},world);
  const puffG=mk('g',{fill:CLOUD,'pointer-events':'none'},world);
  const nearCloudG=mk('g',{fill:'#FBF8F0','pointer-events':'none'},world);

  /* hills on the horizon, two layers, each drawn three times and wrapped */
  const HILLS=[{g:hillFarG,d:'M0 1 L0 -22 Q120 -50 260 -28 Q380 -10 520 -36 Q640 -58 760 -26 Q900 2 1010 -30 Q1150 -60 1280 -22 L1280 1 Z',v:.22,o:0,t:[]},
               {g:hillG,d:'M0 1 L0 -10 Q160 -34 330 -12 Q520 8 700 -18 Q880 -40 1040 -12 Q1170 6 1280 -10 L1280 1 Z',v:.42,o:500,t:[]}];
  HILLS.forEach(H=>{for(let i=0;i<3;i++){const t=mk('g',{},H.g);mk('path',{d:H.d},t);H.t.push(t);}});

  /* the land far below: a patchwork of fields leaning one way, a river, woods, a road and a small town or two, on a
     tile drawn twice. y runs from 0 at the horizon to 120 at the foot of the canvas; the group is scaled about the
     horizon as the aircraft comes down, so the same land comes up to meet it */
  const LW=2400, LEAN=.9, tiles=[];
  mk('rect',{x:-700,y:0,width:1400,height:122,fill:GRASSD},landG);
  (function(){
    const FIELD=['#BFC99C','#C9CF9F','#D6CF9A','#CDBD7E','#B7C48F','#A9B585','#D9D3B0','#B3BC86','#C4B877'];
    const ROWS=[[1,9,40,110],[9,22,60,150],[22,44,90,220],[44,78,140,320],[78,121,200,420]];
    for(let n=0;n<2;n++){
      const r=rng(77), t=mk('g',{},landG);tiles.push(t);
      ROWS.forEach(([y0,y1,w0,w1])=>{let x=0;while(x<LW){let w=w0+r()*(w1-w0);if(x+w>LW-w0)w=LW-x;const c=FIELD[Math.floor(r()*FIELD.length)], a=x+.7, b=x+w-.7, ya=y0+.35, yb=y1-.35;
        mk('path',{d:'M'+(a+ya*LEAN).toFixed(1)+' '+ya+' L'+(b+ya*LEAN).toFixed(1)+' '+ya+' L'+(b+yb*LEAN).toFixed(1)+' '+yb+' L'+(a+yb*LEAN).toFixed(1)+' '+yb+' Z',fill:c},t);
        if(r()<.3&&y1>20){const k=3+Math.floor(r()*4), f=mk('g',{stroke:INK,'stroke-width':.5,opacity:.13},t);for(let i=1;i<k;i++){const yy=ya+(yb-ya)*i/k;mk('line',{x1:a+yy*LEAN,y1:yy,x2:b+yy*LEAN,y2:yy},f);}}
        x+=w;}});
      /* a river from the horizon to the foreground, widening as it comes; a lake */
      [[640,0],[1790,2.1]].forEach(([xr,p])=>{let up='',dn='';for(let y=0;y<=122;y+=6){const c=xr+y*LEAN+Math.sin(y/13+p)*(8+y*.22), w=.7+y*.085;up+=(y?' L':'M')+(c-w).toFixed(1)+' '+y;dn=' L'+(c+w).toFixed(1)+' '+y+dn;}
        mk('path',{d:up+dn+' Z',fill:WATER},t);});
      mk('ellipse',{cx:1240,cy:31,rx:64,ry:6.5,fill:WATER},t);mk('ellipse',{cx:1292,cy:35,rx:30,ry:4,fill:WATER},t);
      /* roads, leaning with the fields */
      [[300,.7],[1500,1.15],[2150,.55]].forEach(([x0,m])=>mk('line',{x1:x0,y1:0,x2:x0+122*m,y2:122,stroke:PAPER,'stroke-width':1.1,opacity:.75},t));
      /* woods */
      for(let i=0;i<16;i++){const y=6+r()*100, k=.45+y/70, x=r()*LW, g=mk('g',{fill:r()<.5?'#8DA176':'#9BAE82'},t);
        for(let j=0;j<3+Math.floor(r()*3);j++)mk('ellipse',{cx:(x+(r()-.5)*40*k).toFixed(1),cy:(y+(r()-.5)*5*k).toFixed(1),rx:(9+r()*10)*k,ry:(2.4+r()*2)*k},g);}
      /* towns: a handful of roofs round a spire */
      [[360,18],[1560,40],[2120,12],[980,66]].forEach(([x,y])=>{const k=.5+y/52, g=mk('g',{},t);
        for(let j=0;j<9;j++){const hx=x+(r()-.5)*58*k, hy=y+(r()-.5)*9*k, w=(4+r()*3)*k, hh=2.6*k;
          mk('rect',{x:hx.toFixed(1),y:(hy-hh).toFixed(1),width:w.toFixed(1),height:hh.toFixed(1),fill:SOFT},g);
          mk('path',{d:'M'+(hx-.6*k).toFixed(1)+' '+(hy-hh).toFixed(1)+' L'+(hx+w/2).toFixed(1)+' '+(hy-hh-2.2*k).toFixed(1)+' L'+(hx+w+.6*k).toFixed(1)+' '+(hy-hh).toFixed(1)+' Z',fill:j%3?TERRA:'#8C4A34'},g);}
        mk('rect',{x:x-1.2*k,y:y-8*k,width:2.4*k,height:8*k,fill:SOFT},g);mk('path',{d:'M'+(x-1.6*k)+' '+(y-8*k)+' L'+x+' '+(y-14*k)+' L'+(x+1.6*k)+' '+(y-8*k)+' Z',fill:INK},g);});
    }
  })();

  /* the airfield, in the land's own coordinates: it is placed when the descent begins so that its threshold passes
     under the wheels just before they touch. x=0 is the threshold; the runway runs away to the left */
  const afG=mk('g',{display:'none'},landG), AFLEN=3900, WHEEL_Y=46;
  (function(){
    mk('rect',{x:-AFLEN,y:0,width:AFLEN+300,height:122,fill:GRASS},afG);
    [[66,8],[84,11],[106,16]].forEach(([y,hh])=>mk('rect',{x:-AFLEN,y,width:AFLEN+300,height:hh,fill:GRASSD,opacity:.3},afG));
    /* the apron and two taxiways down to the runway */
    mk('rect',{x:-1500,y:8,width:1100,height:16,fill:APRON},afG);
    [-1150,-640].forEach(x=>mk('path',{d:'M'+x+' 23 L'+(x+46)+' 23 L'+(x+66)+' 35 L'+(x+20)+' 35 Z',fill:APRON},afG));
    mk('rect',{x:-AFLEN+200,y:34,width:AFLEN-160,height:28,fill:RUNWAY},afG);
    mk('line',{x1:-AFLEN+200,y1:35.4,x2:40,y2:35.4,stroke:PAPER,'stroke-width':.8,opacity:.8},afG);
    mk('line',{x1:-AFLEN+200,y1:60.6,x2:40,y2:60.6,stroke:PAPER,'stroke-width':1.1,opacity:.8},afG);
    mk('line',{x1:-AFLEN+260,y1:47.8,x2:-44,y2:47.8,stroke:PAPER,'stroke-width':1.7,'stroke-dasharray':'19 14',opacity:.85},afG);
    [[33.2,1.5],[63,2]].forEach(([y,w])=>mk('line',{x1:-AFLEN+200,y1:y,x2:40,y2:y,stroke:'#FFF3C4','stroke-width':w,'stroke-linecap':'round','stroke-dasharray':'0.1 36'},afG));
    const k=mk('g',{fill:PAPER,opacity:.85},afG);for(let i=0;i<6;i++)mk('rect',{x:-30,y:37.4+i*3.75,width:24,height:2},k);
    [[-130,4],[-210,8],[-290,4]].forEach(([x,w])=>{mk('rect',{x:x,y:39.4,width:w*3,height:2.8},k);mk('rect',{x:x,y:53.6,width:w*3,height:2.8},k);});
    /* the hangar and the tower lifted from Module 3's airfield, standing on the horizon */
    const b=mk('g',{transform:'translate(-520 0) scale(.48) translate(0 -466)',stroke:INK,'stroke-width':2.5,'stroke-linejoin':'round'},afG);
    mk('path',{d:'M40 466 L40 418 Q110 384 180 418 L180 466 Z',fill:SOFT},b);mk('path',{d:'M62 466 L62 430 Q110 408 158 430 L158 466 Z',fill:INK,stroke:'none'},b);
    const tw=mk('g',{transform:'translate(-1002 0) scale(.48) translate(0 -466)',stroke:INK,'stroke-width':2.5,'stroke-linejoin':'round'},afG);
    mk('path',{d:'M236 466 L240 372 L260 372 L264 466 Z',fill:SOFT},tw);mk('path',{d:'M224 372 L230 344 L270 344 L276 372 Z',fill:INK},tw);mk('rect',{x:228,y:336,width:44,height:9,fill:PAPER},tw);mk('line',{x1:250,y1:336,x2:250,y2:318},tw);
  })();
  const beacon=mk('circle',{cx:-882,cy:-72.6,r:2.2,fill:RED},afG);
  /* the windsock, in the grass on the near side of the runway */
  mk('line',{x1:-781,y1:96,x2:-781,y2:70,stroke:INK,'stroke-width':1.6},afG);const sock=mk('g',{},afG);
  [[RED,0],[CARD,15],[RED,30],[CARD,45]].forEach(([c,x],i)=>mk('path',{d:'M'+x+' '+(-8+i*1.2)+' L'+(x+15)+' '+(-6.8+i*1.2)+' L'+(x+15)+' '+(6.8-i*1.2)+' L'+x+' '+(8-i*1.2)+' Z',fill:c,stroke:INK,'stroke-width':1.5},sock));

  /* clouds in three layers: far and middle behind the aircraft, the near ones below it and in front; and a few
     thin streaks that whip past close to the camera */
  const clouds=[], streaks=[];
  (function(){const r=rng(11);
    function cloud(parent,lay){const g=mk('g',{},parent);
      [[0,0,44,15],[-30,5,26,10],[32,6,30,10],[8,-11,26,13],[-12,-6,20,11]].forEach(e=>mk('ellipse',{cx:e[0],cy:e[1],rx:e[2],ry:e[3]},g));
      const c={g,lay,x:0,y:0,s:1,v:0};fresh(c,r,true);clouds.push(c);}
    for(let i=0;i<6;i++)cloud(farCloudG,0);
    for(let i=0;i<5;i++)cloud(midCloudG,1);
    for(let i=0;i<3;i++)cloud(nearCloudG,2);
    for(let i=0;i<4;i++){const e=mk('rect',{x:0,y:0,width:90+r()*120,height:2.6,rx:1.3,opacity:.55,fill:'#FFFFFF'},nearCloudG);streaks.push({e,x:r()*1600-200,y:90+r()*470,v:520+r()*260,w:0});}
  })();
  const cr=rng(29);
  function fresh(c,r,any){r=r||cr;
    if(c.lay===0){c.y=108+r()*330;c.s=.42+r()*.34;c.v=9+r()*7;}
    else if(c.lay===1){c.y=112+r()*440;c.s=.9+r()*.55;c.v=30+r()*16;}
    else{c.y=515+r()*62;c.s=1.7+r()*.7;c.v=96+r()*40;}
    c.x=any?r()*1500-110:-70*c.s-r()*260;}
  const RISE=[70,210,430];

  /* now and then another aircraft crosses, far off, with its own thin trail */
  const far={g:mk('g',{display:'none'},farPlaneG),on:false,next:9,x:0,y:0,dir:1};
  mk('line',{x1:-150,y1:0,x2:-20,y2:0,stroke:'#FFFFFF','stroke-width':2.2,'stroke-linecap':'round',opacity:.6},far.g);
  mk('path',{d:'M-22 0 L14 -2.6 Q24 0 14 2.6 Z M-20 -1 L-27 -11 L-21 -11 L-11 -1 Z M-4 1 L-12 8 L-6 8 L6 1 Z',fill:'#93A3A1'},far.g);

  /* ================= the aircraft: the approved drawing, nose to the left ================= */
  const JX=45, JY0=150, PIVX=790, PIVY=300;  /* it pitches about its main wheels, so they meet the runway where they should */
  const trailA=mk('path',{fill:'#FFFFFF',opacity:.4},jetG), trailB=mk('path',{fill:'#FFFFFF',opacity:.55},jetG);
  const gearG=mk('g',{display:'none',stroke:INK,'stroke-width':4,'stroke-linecap':'round',fill:INK},jetG);
  mk('line',{x1:215,y1:240,x2:215,y2:302},gearG);mk('circle',{cx:215,cy:304.5,r:9.5,stroke:'none'},gearG);mk('circle',{cx:215,cy:304.5,r:3.2,fill:PAPER,stroke:'none'},gearG);
  mk('line',{x1:790,y1:236,x2:790,y2:300},gearG);mk('line',{x1:779,y1:302,x2:803,y2:302},gearG);
  [779,803].forEach(x=>{mk('circle',{cx:x,cy:302.5,r:11.5,stroke:'none'},gearG);mk('circle',{cx:x,cy:302.5,r:3.8,fill:PAPER,stroke:'none'},gearG);});
  const LINE={stroke:INK,'stroke-width':3.5,'stroke-linejoin':'round'};
  /* the fin's root sits INSIDE the hull's top edge and is drawn first, so the hull's outline closes it (Ryan, 17 Sep) */
  mk('path',Object.assign({d:'M922 138 L1052 28 L1114 28 L1090 180 Z',fill:RED},LINE),jetG);
  mk('path',Object.assign({d:'M1056 176 L1178 158 L1186 168 L1076 190 Z',fill:CARD},LINE),jetG);
  mk('path',Object.assign({d:'M28 210 C 40 168, 96 140, 180 136 L 900 132 C 990 134, 1040 158, 1090 176 L 1140 186 L 1140 196 C 1090 222, 1030 236, 960 240 L 150 250 C 92 250, 42 240, 28 210 Z',fill:CARD},LINE),jetG);
  mk('path',{d:'M76 166 C 90 150, 112 142, 140 140 L 136 158 C 114 160, 96 166, 84 174 Z',fill:INK},jetG);
  [160,990].forEach((x,i)=>mk('rect',{x,y:150+i*2,width:18,height:58,rx:5,fill:'none',stroke:INK,'stroke-width':2,opacity:.5},jetG));
  const winsG=mk('g',{},jetG);
  const wing=mk('path',Object.assign({fill:SOFT},LINE),jetG);
  const engG=mk('g',{},jetG);
  mk('rect',{x:480,y:262,width:92,height:44,rx:20,fill:CARD,stroke:INK,'stroke-width':3.5},engG);
  const heat=mk('g',{stroke:PAPER,'stroke-width':2.4,'stroke-linecap':'round','pointer-events':'none'},engG);
  [[578,272,26],[580,284,38],[578,296,24]].forEach(h=>mk('line',{x1:h[0],y1:h[1],x2:h[0]+h[2],y2:h[1]},heat));
  /* lights: a red beacon on the roof, a white strobe at the tail, red at the wing tip with its own strobe */
  function lamp(x,y,c,parent){const g=mk('g',{'pointer-events':'none'},parent||jetG);mk('circle',{cx:x,cy:y,r:9,fill:c,opacity:.35},g);mk('circle',{cx:x,cy:y,r:3.4,fill:c},g);return g;}
  const navTop=lamp(560,131,RED), navTail=lamp(1184,163,'#FFFFFF'), tipG=mk('g',{},jetG), navTip=lamp(752,327,RED,tipG), navTipS=lamp(741,327,'#FFFFFF',tipG);

  /* ================= the windows ================= */
  const X0=198, X1=958, WY=170, SHADE_UP=3.5, wins=new Map(), opened=new Set();
  const SKIN=['#F1D3B8','#E6BC95','#C99266','#9C6941','#70472B'], HAIR=[INK,'#4E3420','#8A5A2B','#B9B2A3','#C9A24B','#2E2A26'], CLOTH=['#37658A','#6B2D3E','#26713D','#2B3A55','#7A4E8A','#8A6A2B','#4A5A52'];
  function people(d){const a=hash(d.v), b=hash(d.v+'/2');
    const one=h=>({skin:SKIN[h%5],hair:HAIR[(h>>>3)%6],style:(h>>>7)%5,cloth:CLOTH[(h>>>11)%7],specs:(h>>>15)%5===0,ph:(h%628)/100});
    const P=[one(a),one(b)];if(P[1].cloth===P[0].cloth)P[1].cloth=CLOTH[(CLOTH.indexOf(P[0].cloth)+3)%7];
    if(P[0].specs&&P[1].specs)P[1].specs=false;if(P[1].skin===P[0].skin&&P[1].hair===P[0].hair)P[1].hair=HAIR[(HAIR.indexOf(P[0].hair)+2)%6];
    P.glum=(a>>>18)%2;return P;}
  function winNode(d){
    const g=mk('g',{style:'cursor:pointer',opacity:0},winsG), P=people(d), w={v:d.v,g,x:null,tx:0,pw:14,tpw:14,sh:18,tsh:opened.has(d.v)?SHADE_UP:18,op:0,panes:[],heads:[],edges:[],game:null};
    for(let k=0;k<2;k++){w.panes.push(mk('rect',{y:0,height:18,rx:4},g));
      const hd=mk('g',{},g);mk('path',{d:'M-5.4 18 Q-5.4 12.6 0 12.6 Q5.4 12.6 5.4 18 Z',fill:P[k].cloth},hd);mk('circle',{cx:0,cy:8.6,r:3.7,fill:P[k].skin},hd);if(P[k].style!==4)mk('path',{d:'M-3.7 8 Q-3.9 4.4 0 4.4 Q3.9 4.4 3.7 8 Q2 6.2 0 6.2 Q-2 6.2 -3.7 8 Z',fill:P[k].hair},hd);w.heads.push(hd);}
    w.shade=mk('rect',{x:0,y:0,height:18,rx:4,fill:SOFT},g);
    for(let k=0;k<2;k++)w.edges.push(mk('rect',{y:0,height:18,rx:4,fill:'none','stroke-width':2.6},g));
    w.hit=mk('rect',{x:-5,y:-8,height:34,fill:'transparent'},g);
    g.addEventListener('click',e=>{e.stopPropagation();open(d.v);});
    return w;
  }
  function paint(w,g){if(w.game===g)return;w.game=g;w.panes.forEach(p=>p.setAttribute('fill',TINT[g]));w.edges.forEach(p=>p.setAttribute('stroke',TINT[g]));}
  function size(w){const pw=w.pw;
    w.panes[0].setAttribute('x',0);w.panes[1].setAttribute('x',(pw+4).toFixed(2));w.edges[0].setAttribute('x',0);w.edges[1].setAttribute('x',(pw+4).toFixed(2));
    [...w.panes,...w.edges].forEach(r=>r.setAttribute('width',pw.toFixed(2)));w.shade.setAttribute('width',(pw*2+4).toFixed(2));w.hit.setAttribute('width',(pw*2+14).toFixed(2));
    const k=Math.min(1,(pw-1.6)/10.8);w.heads.forEach((h,i)=>h.setAttribute('transform','translate('+((i?pw+4:0)+pw/2).toFixed(2)+' '+(18-18*k).toFixed(2)+') scale('+k.toFixed(3)+')'));}
  function layout(){
    /* every window is a response, and the row always runs the length of the cabin: the windows spread evenly from the
       front door to the rear door and close up as more arrive (Ryan, 17 Sep). One window sits mid-cabin. */
    const L=current(), n=L.length, pitch=n>1?(X1-X0)/(n-1):0, x0=n>1?X0:(X0+X1)/2;
    const pw=pitch&&pitch<40?Math.max(7,(pitch-6)/2):14;
    L.forEach((d,i)=>{const w=wins.get(d.v);if(!w)return;w.tx=x0+i*pitch-pw-2;w.tpw=pw;if(w.x===null){w.x=w.tx;w.pw=pw;size(w);}});
  }
  function stepWindows(dt,snap){
    wins.forEach(w=>{
      if(w.op<1){w.op=snap?1:Math.min(1,w.op+dt/.4);w.g.setAttribute('opacity',w.op.toFixed(2));}
      let moved=w.moved!==true;
      if(w.x!==w.tx){const k=snap?1:Math.min(1,dt*5);w.x+=(w.tx-w.x)*k;if(Math.abs(w.tx-w.x)<.05)w.x=w.tx;moved=true;}
      if(w.pw!==w.tpw){const k=snap?1:Math.min(1,dt*5);w.pw+=(w.tpw-w.pw)*k;if(Math.abs(w.tpw-w.pw)<.03)w.pw=w.tpw;size(w);}
      if(moved){w.moved=true;w.g.setAttribute('transform','translate('+w.x.toFixed(2)+' '+WY+')');}
      if(w.sh!==w.tsh){const k=snap?1:Math.min(1,dt*9);w.sh+=(w.tsh-w.sh)*k;if(Math.abs(w.tsh-w.sh)<.05)w.sh=w.tsh;w.shade.setAttribute('height',w.sh.toFixed(2));}
    });
  }
  function draw(){
    const L=current(), seen=new Set();
    L.forEach(d=>{seen.add(d.v);let w=wins.get(d.v);if(!w){w=winNode(d);wins.set(d.v,w);}paint(w,d.g);});
    [...wins.keys()].forEach(v=>{if(!seen.has(v)){wins.get(v).g.remove();wins.delete(v);opened.delete(v);}});
    layout();
    ['s','b','c'].forEach(g=>$('lg'+g.toUpperCase()).textContent=L.filter(d=>d.g===g).length);
    nEls.forEach(e=>e.textContent=L.length);
    $('jetD').style.display=st.live?'none':'';
    if(shown){const d=L.find(x=>x.v===shown.v);if(d){shown=d;fillRow(d,false);}else close();}
    if(!L.length&&fl.ph!=='cruise')reset();
    if(!slide.classList.contains('active'))stepWindows(0,true);
    wake();
  }

  /* ================= the flight: cruise, and the landing when the last shade is up ================= */
  const VC=26, VTD=215, TDESC=12, TFLARE=2.6, TROLL=8, S1=(720-HY1)/120, GXTD=(JX+PIVX-640)/S1, JY1=HY1+WHEEL_Y*S1-314;   /* on the ground the wheels stand on the runway's line */
  const fl={ph:'cruise',t:0,h:0,h0:1,v:VC,gear:0,pitch:0,off:0,offTD:0,af:false,fade:0,hold:0,bump:-9,nosed:false};
  const hOf=t=>t<TDESC?.92*ease(t/TDESC):.92+.08*easeOut(Math.min(1,(t-TDESC)/TFLARE)), vOf=h=>VC+(VTD-VC)*h*h;
  function allUp(){const L=current();return L.length>0&&L.every(d=>opened.has(d.v));}
  function afGone(){return !fl.af;}
  function descend(){end.on=false;let D=0;for(let t=0;t<TDESC+TFLARE;t+=1/120)D+=vOf(hOf(t))/120;
    fl.ph='descend';fl.t=0;fl.offTD=fl.off+D;fl.af=true;fl.fade=0;fl.nosed=false;afG.setAttribute('opacity',1);afG.setAttribute('display','');}
  function puff(x,y,n,big){for(let i=0;i<n;i++){const e=mk('circle',{cx:0,cy:0,r:1,opacity:.8},puffG);puffs.push({e,x:x+(Math.random()-.3)*18,y:y-Math.random()*4,vx:50+Math.random()*120,vy:-(8+Math.random()*30),r:(7+Math.random()*10)*big,t:0,life:1+Math.random()*.7});}}
  const puffs=[];
  function reset(){opened.clear();wins.forEach(w=>{w.tsh=18;});fl.hold=0;end.on=false;
    if(fl.ph==='descend'){fl.ph='climb';fl.t=0;fl.h0=fl.h;}
    else if(fl.ph==='roll'||fl.ph==='landed'){fl.ph='takeoff';fl.t=0;}
    wake();}
  sunG.addEventListener('click',e=>{e.stopPropagation();if(!shown&&cam.k===0)reset();});
  /* the E key, the suite's skip to the end (Ryan, 18 Sep): an open row closes first; then every shade still down goes
     up, one after another from the front of the cabin, the whole ripple inside two and a half seconds however full
     the room, with no zoom; and the flight lands as it does after the last click, without the 2.5 s wait. A window
     that arrives while the ending is on joins the ripple. Pressed again, or once the flight is on its way down or on
     the ground, it does nothing. Pressed during a take-off the shades go up at once and it lands when it has levelled */
  const end={on:false,t:0,gap:.1};
  function ending(){
    if(shown)close();
    const L=current();if(end.on||!L.length||fl.ph==='descend'||fl.ph==='roll'||fl.ph==='landed')return;
    end.on=true;end.t=0;end.gap=Math.max(.05,Math.min(.16,2.4/Math.max(1,L.filter(d=>!opened.has(d.v)).length)));wake();
  }
  function stepEnding(dt){
    if(!end.on||shown||cam.k>0)return;              /* it waits for the camera to pull back from an open row */
    const L=current(), down=L.filter(d=>!opened.has(d.v));if(!L.length){end.on=false;return;}
    end.t-=dt;while(end.t<=0&&down.length){const d=down.shift(), w=wins.get(d.v);opened.add(d.v);if(w)w.tsh=SHADE_UP;end.t+=end.gap;}
    if(!down.length)end.t=0;
  }
  function stepFlight(dt,now){
    if(fl.ph==='cruise'){fl.h=0;fl.v=VC;fl.gear=0;fl.pitch+=(0-fl.pitch)*Math.min(1,dt*2);
      if(allUp()&&!shown&&cam.k===0&&afGone()){fl.hold+=dt;if(fl.hold>(end.on?.4:2.5))descend();}else fl.hold=0;}
    else if(fl.ph==='descend'){fl.t+=dt;const t=fl.t;fl.h=hOf(t);fl.v=vOf(fl.h);fl.gear=cl(t,5,7.4);
      fl.pitch=t<TDESC-1.2?-1.4*ease(Math.min(1,t/2.5)):-1.4+4.6*ease(cl(t,TDESC-1.2,TDESC+TFLARE));
      if(t>=TDESC+TFLARE){fl.ph='roll';fl.t=0;fl.h=1;fl.bump=now;fl.off=fl.offTD;puff(JX+PIVX,JY1+314,9,1);}}
    else if(fl.ph==='roll'){fl.t+=dt;const k=Math.min(1,fl.t/TROLL);fl.h=1;fl.gear=1;fl.v=VTD*Math.pow(1-k,1.35);
      fl.pitch=3.2*(1-ease(cl(fl.t,.7,2.1)));
      if(!fl.nosed&&fl.t>2.05){fl.nosed=true;puff(JX+215,JY1+314,4,.6);}
      if(k>=1){fl.ph='landed';fl.v=0;fl.pitch=0;}}
    else if(fl.ph==='landed'){fl.h=1;fl.v=0;fl.gear=1;fl.pitch=0;}
    else if(fl.ph==='takeoff'){fl.t+=dt;fl.h=1;fl.gear=1;fl.v=Math.min(VTD,fl.v+dt*(14+fl.v*.6));
      const want=fl.v>VTD*.8?5:0;fl.pitch+=(want-fl.pitch)*Math.min(1,dt*1.6);
      if(fl.v>=VTD&&fl.pitch>4.2){fl.ph='climb';fl.t=0;fl.h0=1;}}
    else if(fl.ph==='climb'){fl.t+=dt;const T=3+9*fl.h0, k=Math.min(1,fl.t/T);fl.h=fl.h0*(1-ease(k));fl.v=vOf(fl.h);fl.gear=Math.min(fl.gear,1-cl(fl.t,1.6,3.8));
      const want=k<.75?5*Math.sqrt(fl.h0):0;fl.pitch+=(want-fl.pitch)*Math.min(1,dt*1.2);
      if(k>=1){fl.ph='cruise';fl.hold=0;}}
    fl.off+=fl.v*dt;
    if(fl.af){const thr=GXTD+200+(fl.off-fl.offTD), s=1+(S1-1)*fl.h;if(fl.ph==='cruise'&&thr-AFLEN>700/s){fl.af=false;afG.setAttribute('display','none');}
      /* E after a take-off: the field it left is still far below and would take a minute and more to pass, so it fades into the fields and the next landing can begin */
      else if(fl.ph==='cruise'&&end.on&&allUp()){fl.fade=Math.min(1,fl.fade+dt/1.5);afG.setAttribute('opacity',(1-fl.fade).toFixed(2));if(fl.fade>=1){fl.af=false;afG.setAttribute('display','none');}}
      else if(fl.fade){fl.fade=0;afG.setAttribute('opacity',1);}}
  }

  /* ================= the camera, and one frame ================= */
  const cam={k:0,dir:0,fx:640,fy:360}, ZOOM=11, TX=376, TY=262;
  let shown=null, raf=0, lastT=0, lastGear=-1, lastHY=-1;
  function wake(){if(!raf)raf=requestAnimationFrame(frame);}
  function jetXform(now){
    const calm=1-ease(cam.k), air=fl.ph==='landed'?0:fl.ph==='roll'?fl.v/VTD:1;
    const bob=(Math.sin(now/1700)*5+Math.sin(now/617)*1.6)*calm*air*(1-fl.h*.6), wob=(Math.sin(now/2300+1)*.55+Math.sin(now/830)*.18)*calm*air*(1-fl.h*.5);
    const dtb=(now-fl.bump)/1000, bump=dtb>=0&&dtb<2.5?Math.exp(-dtb*2.6)*Math.sin(dtb*10)*4.5:0, rumble=(fl.ph==='roll'||fl.ph==='takeoff')?Math.sin(now/34)*.7*Math.min(1,fl.v/90):0;
    return {x:JX,y:JY0+(JY1-JY0)*fl.h+bob+Math.abs(bump)*.6+rumble,a:fl.pitch+wob,bump};
  }
  function frame(now){
    raf=0;if(!slide.classList.contains('active')){lastT=0;if(!shown&&cam.k){cam.k=0;cam.dir=0;world.removeAttribute('transform');}return;}
    const dt=lastT?Math.min(.05,(now-lastT)/1000):0;lastT=now;
    /* the landing waits while a row is open, so none of it is missed */
    const busy=fl.ph!=='cruise'&&fl.ph!=='landed', wdt=(shown&&busy)?0:dt;
    stepEnding(dt);stepFlight(wdt,now);
    const h=fl.h, HY=HY0+(HY1-HY0)*h, s=(720-HY)/120, air=fl.ph==='cruise'?1:fl.ph==='landed'?0:Math.min(1,.12+fl.v/VTD)*(h>.98?1:1-.4*h);

    if(HY!==lastHY){lastHY=HY;lowSky.setAttribute('transform','translate(0 '+HY.toFixed(1)+')');landG.setAttribute('transform','translate(640 '+HY.toFixed(2)+') scale('+s.toFixed(4)+')');}
    const o=((fl.off%LW)+LW)%LW;tiles[0].setAttribute('transform','translate('+(o-640).toFixed(2)+' 0)');tiles[1].setAttribute('transform','translate('+(o-640-LW).toFixed(2)+' 0)');
    if(fl.af){const thr=GXTD+200+(fl.off-fl.offTD);afG.setAttribute('transform','translate('+thr.toFixed(2)+' 0)');
      beacon.setAttribute('opacity',(now%1600)<260?1:.18);sock.setAttribute('transform','translate(-781 72) scale(.5) rotate('+(8+Math.sin(now/900)*5+Math.sin(now/310)*2+(1-air)*10).toFixed(1)+')');}
    HILLS.forEach(H=>{H.o=(H.o+fl.v*H.v*s*wdt)%1280;const sy=(.62+.75*h).toFixed(3);H.t.forEach((t,i)=>t.setAttribute('transform','translate('+(H.o+(i-1)*1280).toFixed(1)+' '+HY.toFixed(1)+') scale(1 '+sy+')'));});

    clouds.forEach(c=>{c.x+=(c.v*air*(c.lay?1:.8)+4+c.lay*2)*wdt;if(c.x>1290+70*c.s)fresh(c);
      const y=c.y-RISE[c.lay]*h;c.g.setAttribute('transform','translate('+c.x.toFixed(1)+' '+y.toFixed(1)+') scale('+c.s.toFixed(2)+')');});
    nearCloudG.setAttribute('opacity',Math.max(0,1-h*2.2).toFixed(2));
    streaks.forEach(k=>{k.x+=k.v*air*wdt;if(k.x>1300){k.x=-260-Math.random()*1500;k.y=90+Math.random()*470;}k.e.setAttribute('transform','translate('+k.x.toFixed(0)+' '+k.y.toFixed(0)+')');});
    if(far.on){far.x+=far.dir*(far.dir>0?46+30*air:34)*wdt;far.g.setAttribute('transform','translate('+far.x.toFixed(1)+' '+far.y.toFixed(1)+') scale('+(far.dir*.62)+' .62)');
      if(far.x<-200||far.x>1480){far.on=false;far.g.setAttribute('display','none');far.next=now/1000+16+Math.random()*18;}}
    else if(now/1000>far.next&&h<.05){far.on=true;far.dir=Math.random()<.5?1:-1;far.x=far.dir>0?-160:1440;far.y=112+Math.random()*120;far.g.setAttribute('display','');}

    /* the aircraft */
    const J=jetXform(now);
    jetG.setAttribute('transform','translate('+J.x+' '+J.y.toFixed(2)+') rotate('+J.a.toFixed(3)+' '+PIVX+' '+PIVY+')');
    const flex=(Math.sin(now/760)*2.4+Math.sin(now/233)*.8)*(air*.8+.2)*(1-ease(cam.k))-J.bump*1.6;
    wing.setAttribute('d','M 420 232 L 610 232 L 760 '+(330+flex).toFixed(2)+' L 540 '+(330+flex).toFixed(2)+' Z');
    engG.setAttribute('transform','translate(0 '+(flex*.35).toFixed(2)+')');tipG.setAttribute('transform','translate(0 '+flex.toFixed(2)+')');
    heat.setAttribute('opacity',(.4+.3*Math.sin(now/70)).toFixed(2));heat.setAttribute('transform','translate('+(Math.sin(now/55)*3).toFixed(1)+' 0)');
    navTop.setAttribute('opacity',(now%1300)<240?1:.12);navTail.setAttribute('opacity',(now%1700)<110?1:0);navTipS.setAttribute('opacity',((now+420)%1700)<110?1:0);
    if(fl.gear!==lastGear){lastGear=fl.gear;gearG.setAttribute('display',fl.gear>0?'':'none');gearG.setAttribute('transform','translate(0 '+(-(1-ease(fl.gear))*80).toFixed(1)+')');}
    const tro=Math.max(0,1-h*2.6);trailA.setAttribute('opacity',(.4*tro).toFixed(2));trailB.setAttribute('opacity',(.55*tro).toFixed(2));
    if(tro>0){trailA.setAttribute('d',trail(716,268,2,13,now,1.3));trailB.setAttribute('d',trail(650,284+flex*.35,3,18,now,0));}
    for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];p.t+=wdt;const k=p.t/p.life;if(k>=1){p.e.remove();puffs.splice(i,1);continue;}
      p.x+=p.vx*wdt*(1-k*.6);p.y+=p.vy*wdt;p.e.setAttribute('cx',p.x.toFixed(1));p.e.setAttribute('cy',p.y.toFixed(1));p.e.setAttribute('r',(p.r*(.4+k*1.3)).toFixed(1));p.e.setAttribute('opacity',(.9*(1-k*k)).toFixed(2));}
    stepWindows(dt,false);

    /* the camera pushes in to the opened window, and pulls back */
    if(cam.dir){cam.k=Math.max(0,Math.min(1,cam.k+cam.dir*dt/(cam.dir>0?.75:.62)));
      if(cam.dir>0&&cam.k>=.6&&shown)ov.classList.add('on');
      if(cam.k===0||cam.k===1)cam.dir=0;
      if(cam.k===0)world.removeAttribute('transform');
      else{const e=ease(cam.k), z=1+(ZOOM-1)*e*e, px=cam.fx+(TX-cam.fx)*e, py=cam.fy+(TY-cam.fy)*e;
        world.setAttribute('transform','translate('+(px-z*cam.fx).toFixed(2)+' '+(py-z*cam.fy).toFixed(2)+') scale('+z.toFixed(4)+')');}}
    if(shown)stepRow(now,dt);
    wake();
  }
  /* a contrail: a ribbon that starts thin behind the engine, widens and wavers as it goes */
  function trail(x0,y0,w0,w1,now,ph){let up='',dn='';const N=11, x1=1480;
    for(let i=0;i<=N;i++){const k=i/N, x=x0+(x1-x0)*k, w=(i?w0+(w1-w0)*Math.sqrt(k):0)/2, y=y0+Math.sin(x/120-now/520+ph)*5*k+Math.sin(x/47-now/300+ph)*1.5*k;
      up+=(i?' L':'M')+x.toFixed(0)+' '+(y-w).toFixed(1);dn=' L'+x.toFixed(0)+' '+(y+w).toFixed(1)+dn;}
    return up+dn+' Z';}

  /* ================= a row, opened: two passengers, the screen between them, the pair's answers beside ================= */
  const ov=$('rowOpen'), rsvg=$('rowSvg');
  const SEAT='#3F5868', SEATL='#587486';
  function mr(tag,attrs,parent){return mk(tag,attrs,parent||rsvg);}
  let row=null;
  /* the fixed part of the cabin: the wall, the bin overhead, the window with the sky going by, two seats, the screen's arm */
  const rowSky=(function(){
    mr('rect',{x:0,y:0,width:700,height:610,fill:CARD});
    mr('rect',{x:0,y:0,width:700,height:58,fill:SOFT});mr('line',{x1:0,y1:58,x2:700,y2:58,stroke:INK,'stroke-width':3});
    [175,525].forEach(x=>{mr('rect',{x:x-46,y:34,width:92,height:12,rx:6,fill:PAPER,stroke:INK,'stroke-width':2.2});mr('circle',{cx:x-70,cy:40,r:5,fill:OCHRE,stroke:INK,'stroke-width':1.8});});
    mr('line',{x1:350,y1:0,x2:350,y2:58,stroke:INK,'stroke-width':2,opacity:.4});
    const defs=mr('defs',{}), cp=mr('clipPath',{id:'rowWinClip'},defs);mk('rect',{x:266,y:84,width:168,height:202,rx:58},cp);
    const g=mr('g',{'clip-path':'url(#rowWinClip)'});
    mk('rect',{x:266,y:84,width:168,height:202,fill:SKY},g);mk('rect',{x:266,y:200,width:168,height:90,fill:SKYLOW,opacity:.8},g);
    const sky={clouds:[],ground:mk('g',{opacity:0},g)};
    mk('rect',{x:266,y:232,width:168,height:60,fill:GRASS},sky.ground);mk('path',{d:'M266 234 Q310 216 350 230 Q400 244 434 222 L434 236 L266 236 Z',fill:HILL},sky.ground);
    for(let i=0;i<3;i++){const c=mk('g',{fill:CLOUD},g);[[0,0,40,13],[-26,5,24,9],[28,5,26,9],[6,-10,22,11]].forEach(e=>mk('ellipse',{cx:e[0],cy:e[1],rx:e[2],ry:e[3]},c));sky.clouds.push({g:c,x:230+i*90,y:134+i*50,v:38+i*22,s:.7+i*.25});}
    sky.shade=mk('rect',{x:266,y:84,width:168,height:34,fill:SOFT,stroke:INK,'stroke-width':2.2},g);mk('rect',{x:334,y:110,width:32,height:5,rx:2.5,fill:INK,opacity:.5},g);
    sky.frame=mr('rect',{x:266,y:84,width:168,height:202,rx:58,fill:'none',stroke:TEAL,'stroke-width':9});
    mr('rect',{x:259,y:77,width:182,height:216,rx:64,fill:'none',stroke:INK,'stroke-width':3});
    [168,532].forEach(cx=>{
      mr('rect',{x:cx-118,y:204,width:236,height:440,rx:34,fill:SEAT,stroke:INK,'stroke-width':3.2});
      mr('rect',{x:cx-84,y:118,width:168,height:150,rx:30,fill:SEATL,stroke:INK,'stroke-width':3.2});
      mr('path',{d:'M'+(cx-84)+' 172 L'+(cx-84)+' 148 Q'+(cx-84)+' 118 '+(cx-54)+' 118 L'+(cx+54)+' 118 Q'+(cx+84)+' 118 '+(cx+84)+' 148 L'+(cx+84)+' 172 Z',fill:PAPER,stroke:INK,'stroke-width':3.2,'stroke-linejoin':'round'});});
    mr('rect',{x:322,y:400,width:56,height:230,rx:12,fill:SEATL,stroke:INK,'stroke-width':3.2});
    return sky;
  })();
  const peopleG=mr('g',{});
  /* the row in front, from behind: the tops of its two seats; the screen (HTML, over the drawing) sits between them */
  [168,532].forEach(cx=>{mr('rect',{x:cx-140,y:532,width:280,height:120,rx:40,fill:'#33495A',stroke:INK,'stroke-width':3.2});
    mr('path',{d:'M'+(cx-100)+' 532 L'+(cx-100)+' 560 Q'+(cx-100)+' 572 '+(cx-88)+' 572 L'+(cx+88)+' 572 Q'+(cx+100)+' 572 '+(cx+100)+' 560 L'+(cx+100)+' 532 Z',fill:PAPER,stroke:INK,'stroke-width':3.2,'stroke-linejoin':'round'});});
  mr('rect',{x:1.5,y:1.5,width:697,height:607,fill:'none',stroke:INK,'stroke-width':3});

  const HAIRS=[
    {f:'M-63 -6 Q-68 -78 0 -79 Q68 -78 63 -6 Q44 -44 0 -45 Q-44 -44 -63 -6 Z'},
    {f:'M-64 2 Q-72 -80 6 -80 Q70 -76 63 -8 Q54 -46 -14 -50 Q-46 -42 -64 2 Z'},
    {b:'M-74 78 Q-90 -88 0 -88 Q90 -88 74 78 Q60 90 44 78 L44 -10 L-44 -10 L-44 78 Q-60 90 -74 78 Z',f:'M-63 -8 Q-62 -76 0 -77 Q62 -76 63 -8 Q34 -48 0 -46 Q-34 -48 -63 -8 Z'},
    {bun:true,f:'M-63 -6 Q-68 -78 0 -79 Q68 -78 63 -6 Q44 -40 0 -41 Q-44 -40 -63 -6 Z'},
    {f:'M-60 -18 Q-60 -70 0 -71 Q60 -70 60 -18 Q46 -55 0 -56 Q-46 -55 -60 -18 Z'}];
  /* one passenger. dir is +1 for the one on the left (the other is to their right). mood: 'smile' | 'glum' | 'firm' */
  function person(P,cx,dir,mood,game){
    const chicken=game==='c', turn=chicken?-dir:dir, fx=turn*15, up=chicken?-9:0;
    const g=mr('g',{},peopleG), body=mk('g',{},g), LN={stroke:INK,'stroke-width':3.2,'stroke-linejoin':'round','stroke-linecap':'round'};
    mk('path',Object.assign({d:'M'+(cx-122)+' 640 L'+(cx-112)+' 396 Q'+(cx-106)+' 318 '+(cx-44)+' 306 L'+(cx+44)+' 306 Q'+(cx+106)+' 318 '+(cx+112)+' 396 L'+(cx+122)+' 640 Z',fill:P.cloth},LN),body);
    mk('path',Object.assign({d:'M'+(cx-26)+' 304 L'+cx+' 358 L'+(cx+26)+' 304 Z',fill:CARD},LN),body);
    if(chicken){                                      /* arms folded across the chest */
      const a=mk('g',{transform:'translate(0 -56)'},body);
      mk('path',Object.assign({d:'M'+(cx-112)+' 452 Q'+(cx-118)+' 520 '+(cx-60)+' 524 L'+(cx+58)+' 500 Q'+(cx+84)+' 494 '+(cx+80)+' 470 Q'+(cx+76)+' 452 '+(cx+52)+' 456 L'+(cx-70)+' 478 Z',fill:P.cloth},LN),a);
      mk('path',Object.assign({d:'M'+(cx+112)+' 452 Q'+(cx+120)+' 540 '+(cx+56)+' 546 L'+(cx-56)+' 528 Q'+(cx-84)+' 522 '+(cx-80)+' 498 Q'+(cx-76)+' 478 '+(cx-50)+' 484 L'+(cx+70)+' 500 Z',fill:P.cloth},LN),a);
      mk('ellipse',Object.assign({cx:cx-72,cy:506,rx:20,ry:16,fill:P.skin},LN),a);mk('ellipse',Object.assign({cx:cx+74,cy:478,rx:19,ry:15,fill:P.skin},LN),a);
    }
    mk('path',Object.assign({d:'M'+(cx-24)+' 266 L'+(cx-24)+' 310 Q'+cx+' 328 '+(cx+24)+' 310 L'+(cx+24)+' 266 Z',fill:P.skin},LN),body);
    const head=mk('g',{},g), H=HAIRS[P.style];
    if(H.b)mk('path',Object.assign({d:H.b,fill:P.hair},LN),head);
    if(H.bun)mk('circle',Object.assign({cx:0,cy:-92,r:25,fill:P.hair},LN),head);
    mk('ellipse',Object.assign({cx:-turn*60,cy:8,rx:11,ry:15,fill:P.skin},LN),head);                /* the ear on the far side */
    mk('ellipse',Object.assign({cx:0,cy:0,rx:62,ry:70,fill:P.skin},LN),head);
    mk('path',Object.assign({d:H.f,fill:P.hair},LN),head);
    const face=mk('g',{},head), eyes=[-22,22].map(x=>mk('ellipse',{cx:fx+x,cy:-4+up,rx:6.2,ry:6.2,fill:INK},face));
    if(P.specs){[-22,22].forEach(x=>mk('circle',{cx:fx+x,cy:-4+up,r:17,fill:'none',stroke:INK,'stroke-width':3},face));mk('line',{x1:fx-5,y1:-6+up,x2:fx+5,y2:-6+up,stroke:INK,'stroke-width':3},face);}
    const M={smile:'M'+(fx-22)+' '+(26+up)+' Q'+fx+' '+(50+up)+' '+(fx+22)+' '+(26+up),glum:'M'+(fx-19)+' '+(40+up)+' Q'+fx+' '+(22+up)+' '+(fx+19)+' '+(40+up),firm:'M'+(fx-14)+' '+(33+up)+' L'+(fx+14)+' '+(33+up)};
    mk('path',{d:M[mood],fill:'none',stroke:INK,'stroke-width':5,'stroke-linecap':'round'},face);
    if(mood==='smile')[-38,38].forEach(x=>mk('circle',{cx:fx+x,cy:22,r:9,fill:RED,opacity:.2},face));
    if(mood==='glum')[-22,22].forEach(x=>mk('line',{x1:fx+x-8,y1:-22-(x*turn>0?4:0),x2:fx+x+8,y2:-22-(x*turn>0?0:4),stroke:INK,'stroke-width':3.4,'stroke-linecap':'round'},face));
    return {P,cx,dir,turn,chicken,body,head,face,eyes,tilt:chicken?-dir*7:dir*4,gx:0,gy:0,wx:0,wy:0,blink:1.5+Math.random()*3,glance:2.5+Math.random()*4,gl:0};
  }
  function buildRow(d){
    while(peopleG.firstChild)peopleG.firstChild.remove();
    const P=people(d), moods=d.g==='s'?['smile','smile']:d.g==='c'?['firm','firm']:P.glum?['glum','smile']:['smile','glum'];
    rowSky.frame.setAttribute('stroke',TINT[d.g]);
    row={v:d.v,g:d.g,a:person(P[0],168,1,moods[0],d.g),b:person(P[1],532,-1,moods[1],d.g)};
  }
  function stepRow(now,dt){
    if(!row)return;
    const landed=fl.ph==='landed'||fl.ph==='roll'||fl.ph==='takeoff', sp=landed?fl.v/VTD:1;
    rowSky.clouds.forEach(c=>{c.x+=(c.v*sp+3)*dt;if(c.x>500)c.x=190-Math.random()*40;c.g.setAttribute('transform','translate('+c.x.toFixed(1)+' '+(c.y-(landed?60:0))+') scale('+c.s+')');});
    rowSky.ground.setAttribute('opacity',landed?1:0);
    [row.a,row.b].forEach((p,i)=>{
      const br=Math.sin(now/1350+p.P.ph)*2.2;
      p.body.setAttribute('transform','translate(0 '+br.toFixed(2)+')');
      /* a glance: friends look down at the screen and back; in chicken one steals a look at the other and looks away again */
      p.glance-=dt;if(p.glance<=0){if(p.gl){p.gl=0;p.glance=3.5+Math.random()*5;}else{p.gl=1;p.glance=p.chicken?.55+Math.random()*.4:1+Math.random()*.9;}}
      p.wx=p.chicken?(p.gl?p.dir*9:-p.dir*5):(p.gl?p.dir*2:p.dir*5);p.wy=p.chicken?(p.gl?2:-3):(p.gl?8:0);
      p.gx+=(p.wx-p.gx)*Math.min(1,dt*12);p.gy+=(p.wy-p.gy)*Math.min(1,dt*12);
      p.blink-=dt;let ry=6.2;if(p.blink<0){ry=p.blink>-.13?.9:6.2;if(p.blink<-.13)p.blink=2.2+Math.random()*3.8;}
      p.eyes.forEach(e=>{e.setAttribute('ry',ry);e.setAttribute('transform','translate('+p.gx.toFixed(2)+' '+p.gy.toFixed(2)+')');});
      const nod=Math.sin(now/2100+p.P.ph*2)*1.1;
      p.head.setAttribute('transform','translate('+p.cx+' '+(198+br*1.25).toFixed(2)+') rotate('+(p.tilt+nod).toFixed(2)+' 0 60)');
    });
  }
  function fillRow(d,fresh){
    if(fresh||!row||row.v!==d.v||row.g!==d.g)buildRow(d);
    const g=$('rowG');g.textContent=NAME[d.g];g.className='g '+d.g;
    $('rowSit').textContent=d.sit;$('rowP').textContent=d.p;$('rowOpt').textContent=d.opt;$('rowFp').textContent=d.fp;
    $('rowWho').textContent=[d.name,d.name2].filter(Boolean).join(' & ');  /* the pair's names, or the one name, or nothing at all; their two avatars, when the shared kit exists, go in #rowAv beside them */
  }
  function open(v){
    if(shown||cam.k>0||!slide.classList.contains('active'))return;
    const d=current().find(x=>x.v===v), w=wins.get(v);if(!d||!w)return;
    opened.add(v);w.tsh=SHADE_UP;
    /* where that window is on the canvas right now, through the aircraft's own pitch */
    const J=jetXform(performance.now()), a=J.a*Math.PI/180, lx=w.x+w.pw+2-PIVX, ly=WY+9-PIVY;
    cam.fx=J.x+PIVX+lx*Math.cos(a)-ly*Math.sin(a);cam.fy=J.y+PIVY+lx*Math.sin(a)+ly*Math.cos(a);
    shown=d;fillRow(d,true);cam.dir=1;wake();
  }
  function close(){if(!shown)return;shown=null;ov.classList.remove('on');cam.dir=-1;wake();}
  $('rowClose').addEventListener('click',e=>{e.stopPropagation();e.currentTarget.blur();close();});
  ov.addEventListener('click',()=>close());
  addEventListener('keydown',e=>{if(!shown||!slide.classList.contains('active'))return;
    if(['Escape','ArrowRight','ArrowLeft','ArrowDown','ArrowUp','PageDown','PageUp',' ','Spacebar'].includes(e.key)){close();e.preventDefault();e.stopImmediatePropagation();}},true);
  addEventListener('keydown',e=>{if((e.key!=='e'&&e.key!=='E')||e.ctrlKey||e.metaKey||e.altKey||!slide.classList.contains('active'))return;
    const a=document.activeElement;if(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable))return;
    ending();e.preventDefault();e.stopImmediatePropagation();},true);

  /* ================= the room ================= */
  function fetchIt(){
    fetch(POLL_API+'/p/'+ROOM+'/entries').then(r=>r.json()).then(d=>{
      const was=st.live;st.live=true;const next=group(d.entries||[]);
      const changed=JSON.stringify(next)!==JSON.stringify(st.list);st.list=next;
      if(changed||!was)draw(); /* first live contact redraws even an empty room, so the demo tag goes */
    }).catch(()=>{});
  }
  if(!demoOnly){setInterval(fetchIt,2500);fetchIt();}
  setInterval(()=>{if(!st.live&&st.demoShown<DEMO.length){st.demoShown++;draw();}},400);
  new MutationObserver(()=>{if(slide.classList.contains('active'))wake();}).observe(slide,{attributes:true,attributeFilter:['class']});
  draw();
})();
