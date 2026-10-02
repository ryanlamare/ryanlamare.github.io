/* ---- Module 1's closing exercise, the room view: a train (Ryan's idea, 18
   Sep 2026; built the same evening as a sample for him to drive). Every pair that
   sends a hand (game/, room m1-hands) is one carriage: four windows, four
   blinds in the four suit colours, the backs of its four cards. It rolls in
   from the left and couples onto the train standing at a Victorian
   terminus, under the two great arches and the clock.

   A click on a carriage opens it: the four cards fly out of its windows and
   turn face up at the front, as they did from the table. Closing it sends
   them back, the blinds go up on a lit compartment, and the train rolls on
   to the next place, so each hand is talked about in front of a different
   backdrop: the places of the other seven modules (a tree in an autumn
   field, an airfield, a cell block, a jet overhead, a bingo hall, ships at
   sea, a car lot), with plain countryside between them when the room has
   more hands than the programme has modules. All scenery is wordless. When
   the last carriage has been opened the train leaves for the horizon.

   The places have depth on the move (Ryan's note on his first drive, 18
   Sep): the wide ones end in shapes, not cut edges (a bay whose shore comes
   down from a headland on the horizon, a river that winds in from a thread,
   a runway, a road and a canal that run off to a point), what lies on the
   ground shears as it passes and what stands on it slides at the pace of
   its distance, so the far side of a place lags the near side. At a stand
   every place is the picture it was.

   Mouse only. With a hand open, Esc, the arrow keys, space or a click
   outside close it; with none open the keys move on as usual. A click on
   the locomotive rolls the train on without opening anything; the E key
   plays the ending from wherever the train is (any open hand closes first,
   unopened carriages stay unopened, no stop in between is visited); a click
   on the sun puts everything back at the terminus (for a rehearsal). What has
   been opened, and where the train has got to, are kept in sessionStorage
   per room while the room is live. ?demo=1 keeps eight invented hands,
   ?demo=15 (any number to 15) more of them; they also show if the poll
   server cannot be reached. ?room=<x> reads the rehearsal room
   m1-hands-<x>. Expects POLL_API and GT_RAIL (rail.js). ---- */
(function(){
  const $=id=>document.getElementById(id), svg=$('railSvg');
  if(!svg||!window.GT_RAIL)return;
  const R=GT_RAIL, C=R.C, rng=R.rng, slide=svg.closest('.slide');
  const mk=(t,a,p)=>R.mk(t,a,p||svg);
  const INK=C.INK,PAPER=C.PAPER,SOFT=C.SOFT,CARD=C.CARD,RED=C.RED,OCHRE=C.OCHRE,TEAL=C.TEAL,TERRA=C.TERRA,IRON=C.IRON,WARM=C.WARM,
        SKY='#CFDDD6',SKYLOW='#E2EADF',GRASS='#BFC99C',GRASSD='#A9B585',HILL='#B4C2A2',HILLFAR='#C8D3BC',HEDGE='#6F8A55',STUBBLE='#D8C98F',BRICK='#D8C08A',BRICKD='#BFA56E',SLATE='#4A453C',TAN='#C9B48A';
  const P=(d,fill,par,o)=>mk('path',Object.assign({d,fill},o||{}),par), Rr=(x,y,w,h,fill,par,o)=>mk('rect',Object.assign({x,y,width:w,height:h,fill},o||{}),par),
        Ci=(cx,cy,r,fill,par,o)=>mk('circle',Object.assign({cx,cy,r,fill},o||{}),par), Li=(x1,y1,x2,y2,par,o)=>mk('line',Object.assign({x1,y1,x2,y2},o||{}),par);
  const OUT={stroke:INK,'stroke-width':2.4,'stroke-linejoin':'round'};

  const SUITN=['THE SITUATION','THE PLAYERS','NEED TO KNOW','WHAT THEY KNOW'];
  const DEMO=[
    ['Getting sign-off on a new hire when the budget sits with another director','My director, the finance director, the two other heads competing for the same headcount','Whether finance has already decided the headcount is going elsewhere','That I have asked twice before, and that my team is carrying the most work'],
    ['Renewing a supplier contract that runs out in three months','The supplier, their sales lead, our procurement team, one rival supplier','What their order book looks like and whether they need us as much as we need them','That switching would cost us six months, and they know it'],
    ['Agreeing a launch date with the product team when we share the same engineers','The product lead, the engineering manager, the marketing team waiting on both of us','Which of their deadlines is real and which is a negotiating position','That our date was set by the board, so we cannot move it far'],
    ['Asking for a promotion when the role has not been created yet','My manager, her manager, HR, a colleague who wants the same role','Whether they are hiring externally, and what the colleague has already been told','That I have had an approach from outside, which I mentioned once'],
    ['Merging two teams’ processes after a reorganisation','The other team lead, both teams, the head of department who set it up','Whether the other lead wants this to work or is waiting for it to fail','That my process is the one the department head used to run'],
    ['A tender against two rivals for a client we already serve','The client’s buying team, the two rivals, our own delivery team','Whether the client is running the tender to get a better price from us or to leave','That we have missed two deliveries this year'],
    ['Persuading the board to fund a pilot they turned down last year','The chair, the finance director, the one board member who backed it, my own boss','Which objection actually killed it last time, money or timing','That the numbers I showed last time were optimistic'],
    ['Splitting a shared office between three teams after a move','The three team leads, facilities, the people who arrive earliest','Whether the other leads have already agreed something between themselves','That my team has the most people in the office on any given day']
  ];
  const dm=/[?&]demo=(\d+)/.exec(location.search), demoOnly=!!dm, DEMON=dm?Math.max(1,Math.min(15,+dm[1]===1?8:+dm[1])):8;
  const DEMOLIST=Array.from({length:DEMON},(_,i)=>({v:'demo'+i,cards:DEMO[i%DEMO.length]}));
  const SUF=(()=>{const m=location.search.match(/[?&]room=([a-z0-9-]{1,20})/);return m?'-'+m[1]:'';})();
  const ROOM='m1-hands'+SUF, KEY='gt-m1-journey'+SUF;
  const st={live:false,failed:false,list:[],demoShown:0};
  /* each phone sends four lines, "k‖text"; group them by phone in arrival order, the last line per card wins */
  function group(entries){const by=new Map();
    entries.forEach(e=>{const m=/^([1-4])‖([\s\S]*)$/.exec(String(e.t||''));if(!m)return;if(!by.has(e.v))by.set(e.v,{v:e.v,cards:['','','','']});by.get(e.v).cards[+m[1]-1]=m[2].trim();});
    return [...by.values()].filter(h=>h.cards.some(Boolean));}

  /* ================= the world: sky, then layers that slide past at their own pace ================= */
  const RAIL=612, FRONT=1224, STOPD=2600, PLAT_END=1560;
  Rr(0,0,1280,470,SKY);Rr(0,300,1280,170,SKYLOW,null,{opacity:.7});
  const goldO=Rr(0,0,1280,720,'#EFA968',null,{opacity:0,'pointer-events':'none'});
  const sun=mk('g',{style:'cursor:pointer'});Ci(1050,138,64,'#F3E6B8',sun,{opacity:.45});Ci(1050,138,42,'#EFDFA8',sun);
  const cloudG=mk('g',{fill:'#F6F2E7','pointer-events':'none'}), clouds=[];            /* a cloud over the sun must not take its click */
  (function(){const r=rng(7);for(let i=0;i<6;i++){const g=mk('g',{},cloudG);[[0,0,44,17],[-30,5,26,12],[32,6,30,12],[8,-12,26,15],[-12,-7,20,12]].forEach(e=>mk('ellipse',{cx:e[0],cy:e[1],rx:e[2],ry:e[3]},g));clouds.push({g,x:r()*1280,y:50+r()*210,s:.6+r()*.7,v:3+r()*5});}})();
  function tiler(W,factor,build){const g=mk('g',{}),a=mk('g',{},g),b=mk('g',{transform:'translate('+W+' 0)'},g);build(a);build(b);return {g,W,factor};}
  const tiles=[];
  tiles.push(tiler(1600,.1,g=>{const W=1600;let d1='M0 470',d2='M0 470';
    for(let x=0;x<=W;x+=40){const t=x/W*Math.PI*2;d1+=' L'+x+' '+(424-24*Math.sin(t*2+1)-12*Math.sin(t*5)).toFixed(1);d2+=' L'+x+' '+(446-16*Math.sin(t*3+2)-7*Math.sin(t*7)).toFixed(1);}
    P(d1+' L'+W+' 470 Z',HILLFAR,g);P(d2+' L'+W+' 470 Z',HILL,g);}));
  Rr(0,462,1280,258,GRASS);
  tiles.push(tiler(2400,.4,g=>{const r=rng(31);
    [[60,470,420,STUBBLE],[640,478,360,GRASSD],[1180,468,460,STUBBLE],[1820,480,380,GRASSD]].forEach(f=>P('M'+f[0]+' '+(f[1]+64)+' L'+(f[0]+70)+' '+f[1]+' L'+(f[0]+f[2])+' '+f[1]+' L'+(f[0]+f[2]+90)+' '+(f[1]+64)+' Z',f[3],g,{opacity:.75}));
    for(let i=0;i<7;i++){const x=r()*2400,y=478+r()*50;P('M'+x+' '+y+' q120 -14 260 4',HEDGE,g,{fill:'none',stroke:HEDGE,'stroke-width':5,'stroke-linecap':'round',opacity:.8});}
    for(let i=0;i<11;i++){const x=r()*2400,y=486+r()*52,s=.7+r()*.6,c=mk('g',{transform:'translate('+x.toFixed(0)+' '+y.toFixed(0)+') scale('+s.toFixed(2)+')'},g);
      Rr(-2,-6,4,16,'#6B4226',c);Ci(-10,-14,13,'#7E9B5B',c);Ci(9,-16,15,'#6F8A55',c);Ci(0,-26,14,'#8AA765',c);}
    [[520,520],[1500,512]].forEach(h=>{const c=mk('g',Object.assign({transform:'translate('+h[0]+' '+h[1]+')'},OUT),g);Rr(-22,-20,44,22,SOFT,c);P('M-27 -20 L0 -40 L27 -20 Z',TERRA,c);Rr(-5,-12,10,14,INK,c,{stroke:'none'});Rr(12,-44,7,14,SOFT,c);});}));
  const groundG=mk('g',{});                               /* what lies on the ground at the places (water, tarmac, a shore): under everything that stands at any of them */
  const placeG=mk('g',{});                                /* the places the train stops in front of, a little further off than the line */
  const nearClip=mk('clipPath',{id:'jrnClip'},mk('defs',{})), nearClipR=mk('rect',{x:0,y:0,width:1280,height:720},nearClip);
  const nearWrap=mk('g',{'clip-path':'url(#jrnClip)'});
  const stationG=mk('g',{});                              /* the platform and its canopy, beside the line */
  tiles.push((function(){const t=tiler(1300,1,g=>{
      const w=mk('g',{stroke:INK,'stroke-width':1.3,fill:'none',opacity:.7},g);
      for(let i=0;i<4;i++){const x=90+i*325;Li(x,RAIL-6,x,RAIL-150,g,{stroke:'#5A4632','stroke-width':5,'stroke-linecap':'round'});Li(x-16,RAIL-140,x+16,RAIL-140,g,{stroke:'#5A4632','stroke-width':4});Li(x-12,RAIL-128,x+12,RAIL-128,g,{stroke:'#5A4632','stroke-width':3.4});
        [[-14,-140],[14,-140],[-10,-128]].forEach(o=>P('M'+(x+o[0])+' '+(RAIL+o[1])+' q162 22 325 0','none',w));}
      const f=mk('g',{stroke:'#7A6248','stroke-width':3,'stroke-linecap':'round'},g);Li(0,RAIL-22,1300,RAIL-22,f);Li(0,RAIL-12,1300,RAIL-12,f);for(let x=20;x<1300;x+=52)Li(x,RAIL-28,x,RAIL-4,f);});
    nearWrap.appendChild(t.g);return t;})());
  /* the line itself */
  Rr(0,RAIL-2,1280,30,'#B9AE97');
  const sleepG=mk('g',{fill:'#6B5A45'});for(let x=-26;x<1320;x+=26)Rr(x,RAIL+3,12,6,null,sleepG);
  Rr(0,RAIL,1280,3.4,IRON);
  const trainG=mk('g',{}), smoke=R.smoke(svg);
  Rr(0,RAIL+28,1280,100,GRASSD);
  tiles.push(tiler(1700,1.5,g=>{const r=rng(91);for(let i=0;i<26;i++){const x=r()*1700,y=652+r()*60;P('M'+x+' '+y+' l-5 -12 M'+x+' '+y+' l0 -15 M'+x+' '+y+' l6 -11','none',g,{stroke:'#8A9A6A','stroke-width':2.4,'stroke-linecap':'round'});}
    for(let i=0;i<5;i++){const x=r()*1700;Ci(x,716,30,'#8FA36B',g);Ci(x+34,722,24,'#7E9B5B',g);}}));

  /* ================= the terminus: two arches and a clock (the far side of the platform) ================= */
  const ticks=[];                                         /* {x: world centre at the place layer, f(now,dt)} called while in view */
  let clockH,clockM;
  (function(){const g=mk('g',{transform:'translate(600 0)'},placeG), o=mk('g',OUT,g);
    Rr(-560,300,1120,270,BRICK,o);Rr(-560,290,1120,14,BRICKD,o);
    [-250,250].forEach(cx=>{P('M'+(cx-170)+' 520 L'+(cx-170)+' 440 A170 170 0 0 1 '+(cx+170)+' 440 L'+(cx+170)+' 520 Z',BRICKD,o);
      P('M'+(cx-146)+' 520 L'+(cx-146)+' 440 A146 146 0 0 1 '+(cx+146)+' 440 L'+(cx+146)+' 520 Z','#6E8F93',o);
      const m=mk('g',{stroke:SOFT,'stroke-width':3,opacity:.9},g);for(let a=20;a<=160;a+=20)Li(cx,440,cx-Math.cos(a*Math.PI/180)*146,440-Math.sin(a*Math.PI/180)*146,m);
      P('M'+(cx-96)+' 440 A96 96 0 0 1 '+(cx+96)+' 440','none',m);Li(cx-146,440,cx+146,440,m);for(let x=-120;x<=120;x+=40)Li(cx+x,440,cx+x,520,m);});
    Rr(-46,200,92,370,BRICK,o);P('M-54 200 L0 150 L54 200 Z',SLATE,o);Rr(-52,196,104,10,BRICKD,o);Li(0,150,0,128,o);
    Ci(0,258,30,CARD,o);const h=mk('g',{stroke:INK,'stroke-linecap':'round'},g);for(let i=0;i<12;i++){const a=i*Math.PI/6;Li(Math.sin(a)*24,258-Math.cos(a)*24,Math.sin(a)*27,258-Math.cos(a)*27,h,{'stroke-width':1.6});}
    clockH=Li(0,258,0,244,h,{'stroke-width':3.4});clockM=Li(0,258,0,236,h,{'stroke-width':2.2});Ci(0,258,2.6,RED,g);
    [-540,-470,470,540].forEach(x=>Rr(x-16,330,32,60,'#6E8F93',o,{rx:16}));
    const ar=mk('g',{fill:SLATE},g);for(let x=-540;x<=540;x+=54)if(Math.abs(x)>60)P('M'+(x-17)+' 570 L'+(x-17)+' 546 A17 17 0 0 1 '+(x+17)+' 546 L'+(x+17)+' 570 Z',null,ar);
    Rr(-560,526,1120,8,BRICKD,o);
  })();
  const people=[];let guard=null;
  (function(){const g=stationG;
    Rr(-400,RAIL-96,PLAT_END+400,58,'#DDD5C2',g);Li(-400,RAIL-96,PLAT_END,RAIL-96,g,{stroke:INK,'stroke-width':1.6,opacity:.5});
    Rr(-400,RAIL-40,PLAT_END+400,40,'#CFC6B2',g);Rr(-400,RAIL-40,PLAT_END+400,5,CARD,g);P('M'+PLAT_END+' '+(RAIL-40)+' l70 40 l-70 0 Z','#CFC6B2',g);
    Li(-400,RAIL-40,PLAT_END,RAIL-40,g,{stroke:INK,'stroke-width':2.4});
    /* the canopy on its iron columns, a gas lamp on each */
    const lampG=mk('g',{},g);
    for(let x=-320;x<PLAT_END-60;x+=190){Li(x,RAIL-40,x,RAIL-150,g,{stroke:IRON,'stroke-width':5});P('M'+(x-26)+' '+(RAIL-150)+' q22 4 26 28 q4 -24 26 -28','none',g,{stroke:IRON,'stroke-width':3});
      Rr(x-5,RAIL-48,10,8,IRON,g);Li(x,RAIL-112,x+16,RAIL-112,g,{stroke:IRON,'stroke-width':2.4});Ci(x+18,RAIL-106,9,WARM,lampG,{opacity:.3});P('M'+(x+13)+' '+(RAIL-112)+' l10 0 l-2 10 l-6 0 Z',WARM,g,{stroke:INK,'stroke-width':1.4});}
    Rr(-400,RAIL-164,PLAT_END+340,14,IRON,g);
    const v=mk('g',{fill:RED,stroke:INK,'stroke-width':1.2},g);for(let x=-400;x<PLAT_END-72;x+=24)P('M'+x+' '+(RAIL-150)+' l12 12 l12 -12 Z',null,v);
    Rr(-400,RAIL-170,PLAT_END+340,7,SOFT,g,{stroke:INK,'stroke-width':1.6});
    /* the people on the platform: gentlemen in top hats, ladies in bonnets, a porter with a trolley of trunks, the guard with his flag */
    const r=rng(17), COATS=['#2B3A55','#6B2D3E','#35584A',SLATE,'#7A4A2A',TEAL];
    function gent(x,c){const p=mk('g',{},g);Rr(-5,-30,10,30,c,p,{rx:3,stroke:INK,'stroke-width':1.6});Li(-2.5,0,-2.5,8,p,{stroke:INK,'stroke-width':3});Li(2.5,0,2.5,8,p,{stroke:INK,'stroke-width':3});Ci(0,-36,5.4,'#E9C9A8',p,{stroke:INK,'stroke-width':1.4});Rr(-4.6,-52,9.2,12,INK,p);Rr(-7.5,-41.5,15,2.6,INK,p);people.push({g:p,x,y:RAIL-72,ph:r()*6});return p;}
    function lady(x,c){const p=mk('g',{},g);P('M-4 -30 L4 -30 L13 8 L-13 8 Z',c,p,{stroke:INK,'stroke-width':1.6,'stroke-linejoin':'round'});Ci(0,-36,5.2,'#E9C9A8',p,{stroke:INK,'stroke-width':1.4});P('M-7 -36 Q-6 -45 1 -44 Q7 -43 6 -35 Z',OCHRE,p,{stroke:INK,'stroke-width':1.2});Li(6,-24,14,-46,p,{stroke:INK,'stroke-width':1.6});P('M2 -46 Q14 -58 26 -46 Z',CARD,p,{stroke:INK,'stroke-width':1.4});people.push({g:p,x,y:RAIL-70,ph:r()*6});return p;}
    [[-260,0],[-170,1],[-40,0],[130,1],[300,0],[330,1],[520,0],[700,1],[760,0],[905,1],[1080,0]].forEach((e,i)=>(e[1]?lady:gent)(e[0],COATS[i%COATS.length]));
    const por=gent(420,'#4A453C');const tr=mk('g',OUT,por);Li(10,-20,26,4,tr);Rr(22,-14,30,14,'#7A4A2A',tr);Rr(26,-26,22,12,'#9A6B3A',tr);Ci(30,5,4,INK,tr);Rr(14,2,40,3,INK,tr,{stroke:'none'});
    guard=gent(1130,'#1B1C19');guard.arm=mk('g',{},guard);Li(0,0,0,-24,guard.arm,{stroke:INK,'stroke-width':2.2});P('M0 -24 l16 5 l-16 5 Z','#2F8A4B',guard.arm,{stroke:INK,'stroke-width':1.2});
    guard.arm.setAttribute('transform','translate(5 -26) rotate(150)');
    ticks.push({x:600,w:1500,f(now){const d=new Date(),m=d.getMinutes()+d.getSeconds()/60,h=(d.getHours()%12)+m/60;clockM.setAttribute('transform','rotate('+(m*6).toFixed(1)+' 0 258)');clockH.setAttribute('transform','rotate('+(h*30).toFixed(1)+' 0 258)');
      lampG.setAttribute('opacity',(.75+.25*Math.sin(now/170)).toFixed(2));}});
  })();

  /* ================= the places. Each is drawn about x=0 with its ground at y=556, and may return a tick ================= */
  const GY=556;
  /* depth (Ryan, 18 Sep: the wide places had no perspective on the move, the sea a block of blue sliding in and out). A place
     is drawn as it looks with the train standing in front of it, and the height of a thing's foot on the canvas says how far
     off it is: the sea's horizon passes at half the camera's pace, the ground the buildings stand on (GY) at three quarters,
     the verge by the fence a little faster. D.up(y) is a group for upright things standing at y, which slides; D.flat() is a
     group for what lies on the ground (water, tarmac, a shore), which shears, so a shoreline swings round as it passes the
     way it does from a carriage window. With the train at a stand every offset is nought, so the stopped picture is the
     drawing. The ground of every place is in groundG (D.gg is this place's group there, D.back(y) an upright in it, for a
     headland on the horizon), because the far end of a bay is in view from the stop before it and has to pass behind
     whatever stands there. D.reach is how far off (in camera units) the place can still be seen; beyond it the place is
     not drawn. Far things pass slowly, so how far a place may run on is set by its neighbours: keep the two ends of a
     place inside about (2600 x pace - 250) / 2 of its middle at each depth, or its tip meets the next place's. */
  const DS=.25/118;
  function depthKit(g,gg){const ups=[],flats=[];let last=null;
    return {reach:1900,gg,up(y,par){const e=mk('g',{},par||g);ups.push({e,k:(y-GY)*DS});return e;},back(y){return this.up(y,gg);},flat(){const e=mk('g',{},gg);flats.push(e);return e;},
      set(d){if(d===last)return;last=d;ups.forEach(u=>u.e.setAttribute('transform','translate('+(-d*u.k).toFixed(1)+' 0)'));
        const c=-d*DS;flats.forEach(e=>e.setAttribute('transform','matrix(1 0 '+c.toFixed(4)+' 1 '+(-c*GY).toFixed(1)+' 0)'));}};}
  /* a band lying on the ground whose two ends run to a point (a yard, a promenade), so no end is a cut edge */
  const strip=(x,y0,y1,fill,par)=>P('M'+(-x-240)+' '+((y0+y1)/2)+' Q'+(-x-110)+' '+y0+' '+(-x)+' '+y0+' L'+x+' '+y0+' Q'+(x+110)+' '+y0+' '+(x+240)+' '+((y0+y1)/2)+' Q'+(x+110)+' '+y1+' '+x+' '+y1+' L'+(-x)+' '+y1+' Q'+(-x-110)+' '+y1+' '+(-x-240)+' '+((y0+y1)/2)+' Z',fill,par);
  function figure(par,x,y,s,stripes){const p=mk('g',{transform:'translate('+x+' '+y+') scale('+s+')'},par);Ci(0,-38,6,INK,p);Rr(-7,-31,14,22,stripes?CARD:INK,p,{stroke:INK,'stroke-width':1.6});if(stripes)for(let i=0;i<4;i++)Rr(-7,-28+i*5.4,14,2.4,INK,p);Rr(-6,-9,5,12,INK,p);Rr(1,-9,5,12,INK,p);return p;}
  function car(par,x,y,s,fill){const c=mk('g',{transform:'translate('+x+' '+y+') scale('+s+')'},par);P('M-52 -8 Q-52 -20 -40 -21 L-28 -21 L-16 -34 Q-13 -37 -8 -37 L22 -37 Q27 -37 30 -34 L40 -21 L50 -20 Q56 -19 56 -12 L56 -6 Q56 -2 52 -2 L-48 -2 Q-52 -2 -52 -6 Z',fill,c,{stroke:INK,'stroke-width':2.2,'stroke-linejoin':'round'});P('M-12 -32 L-3 -32 L-3 -21 L-22 -21 Z M2 -32 L20 -32 L28 -21 L2 -21 Z',SOFT,c);Ci(-28,-2,8,INK,c);Ci(32,-2,8,INK,c);Ci(-28,-2,3,PAPER,c);Ci(32,-2,3,PAPER,c);return c;}
  const PLACES={
    /* Module 2: the tree in an autumn field, the church and its village */
    tree(g,D){const r=rng(3);P('M-620 '+GY+' Q-300 '+(GY-52)+' 0 '+(GY-30)+' Q320 '+(GY-64)+' 620 '+GY+' Z','#CDB97A',g);
      const far=D.up(GY-40), v=mk('g',{fill:SLATE},far);Rr(250,GY-92,56,52,null,v);      /* the village is beyond the crest of the field */P('M244 '+(GY-92)+' L278 '+(GY-118)+' L312 '+(GY-92)+' Z',null,v);Rr(306,GY-128,26,88,null,v);P('M302 '+(GY-128)+' L319 '+(GY-196)+' L336 '+(GY-128)+' Z',null,v);
      [[190,0],[380,4],[430,-2],[480,2]].forEach(c=>{Rr(c[0],GY-62+c[1],34,22,null,v);P('M'+(c[0]-4)+' '+(GY-62+c[1])+' l21 -15 l21 15 Z',null,v);});
      [[-470,'#C9622B'],[-430,'#C9A227'],[-395,'#A9402B'],[520,'#D98A2B'],[556,'#A9402B']].forEach(c=>{Rr(c[0]-2,GY-58,4,20,'#6B4226',far);Ci(c[0],GY-70,18,c[1],far);});
      P('M-84 '+GY+' L-76 '+(GY-120)+' Q-130 '+(GY-190)+' -190 '+(GY-214)+' M-76 '+(GY-120)+' Q-70 '+(GY-220)+' -40 '+(GY-290)+' M-66 '+(GY-150)+' Q0 '+(GY-200)+' 70 '+(GY-226),'none',g,{stroke:'#6B4226','stroke-width':9,'stroke-linecap':'round'});
      P('M-100 '+GY+' L-86 '+(GY-130)+' L-56 '+(GY-130)+' L-44 '+GY+' Z','#6B4226',g);
      const LC=['#C9622B','#D98A2B','#A9402B','#C9A227','#8A9A4B','#B5573A'];for(let i=0;i<46;i++){const a=r()*Math.PI*2,q=Math.sqrt(r());Ci(-64+Math.cos(a)*q*170,GY-236+Math.sin(a)*q*92,12+r()*13,LC[i%LC.length],g,{opacity:.92});}
      for(let i=0;i<6;i++){const a=r()*Math.PI*2,q=.4+r()*.5;Ci(-64+Math.cos(a)*q*160,GY-236+Math.sin(a)*q*86,5,RED,g,{stroke:INK,'stroke-width':1});}
      const lv=[];for(let i=0;i<12;i++)lv.push({e:mk('ellipse',{rx:5,ry:2.6,fill:LC[i%LC.length]},g),x:-220+r()*320,y:GY-300+r()*280,ph:r()*6,v:16+r()*14});
      return now=>lv.forEach(l=>{const y=GY-300+((l.y-(GY-300)+now/1000*l.v)%300),x=l.x+Math.sin(now/700+l.ph)*16;l.e.setAttribute('transform','translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+(Math.sin(now/400+l.ph)*50).toFixed(0)+')');});},
    /* Module 3: the airfield, and an aircraft climbing out */
    airfield(g,D){D.reach=2500;const F=D.flat(), B=D.up(GY-30);
      /* the apron, and the runway running off it both ways, narrowing to a point as it goes; the buildings stand along its far edge */
      P('M-920 '+(GY-52)+' L-640 '+(GY-30)+' L640 '+(GY-30)+' L920 '+(GY-52)+' L640 '+(GY+4)+' L-640 '+(GY+4)+' Z','#7A7870',F);
      P('M-920 '+(GY-52)+' L-640 '+(GY-13)+' L640 '+(GY-13)+' L920 '+(GY-52),'none',F,{stroke:PAPER,'stroke-width':2.4,'stroke-dasharray':'26 20',opacity:.7});
      const o=mk('g',OUT,B);
      P('M-420 '+(GY-30)+' l0 -62 Q-340 '+(GY-136)+' -260 '+(GY-92)+' l0 62 Z',SOFT,o);P('M-396 '+(GY-30)+' l0 -46 Q-340 '+(GY-104)+' -284 '+(GY-76)+' l0 46 Z',INK,o);
      Rr(-90,GY-84,340,54,SOFT,o);Rr(-104,GY-94,368,12,PAPER,o);const w=mk('g',{fill:TEAL,opacity:.85},B);for(let i=0;i<12;i++)Rr(-74+i*27,GY-72,17,20,null,w);
      P('M-200 '+(GY-30)+' L-195 '+(GY-150)+' L-171 '+(GY-150)+' L-166 '+(GY-30)+' Z',SOFT,o);P('M-214 '+(GY-150)+' L-207 '+(GY-184)+' L-159 '+(GY-184)+' L-152 '+(GY-150)+' Z',INK,o);Rr(-210,GY-194,54,11,PAPER,o);Li(-183,GY-194,-183,GY-216,o);
      const beacon=Ci(-183,GY-218,5,RED,B);Li(420,GY-30,420,GY-100,B,{stroke:INK,'stroke-width':3});const sock=mk('g',{},B);[[RED,0],[CARD,14],[RED,28],[CARD,42]].forEach((c,i)=>P('M'+c[1]+' '+(-8+i)+' L'+(c[1]+14)+' '+(-7+i)+' L'+(c[1]+14)+' '+(7-i)+' L'+c[1]+' '+(8-i)+' Z',c[0],sock,{stroke:INK,'stroke-width':1.4}));
      function plane(par,fin){const p=mk('g',{},par);P('M-66 -30 L-84 -35 L-82 -29 L-60 -25 Z',CARD,p,OUT);P('M-60 -34 L-74 -64 L-57 -64 L-36 -36 Z',fin,p,OUT);P('M-66 -35 L-40 -37 L40 -37 Q62 -36 69 -26 Q62 -15 40 -14 L-28 -14 Q-52 -17 -66 -35 Z',CARD,p,OUT);P('M47 -34 Q58 -33 63 -28 L49 -28 Z',INK,p);for(let x=-34;x<=38;x+=8)Ci(x,-30,1.5,INK,p);P('M16 -21 L-26 -7 L-10 -7 L34 -21 Z',PAPER,p,OUT);Rr(-8,-14,34,12,TEAL,p,{rx:6,stroke:INK,'stroke-width':2});return p;}
      const a=plane(g,'#37658A');a.setAttribute('transform','translate(310 '+(GY-8)+') scale(.9)');const b=plane(g,OCHRE);b.setAttribute('transform','translate(540 '+(GY-6)+') scale(.9)');
      const fl=plane(g,RED);
      return now=>{beacon.setAttribute('opacity',(now%1600)<260?1:.2);sock.setAttribute('transform','translate(420 '+(GY-94)+') rotate('+(8+Math.sin(now/900)*5).toFixed(1)+')');
        const k=(now%15000)/9000;fl.setAttribute('opacity',k<1?1:0);if(k<1)fl.setAttribute('transform','translate('+(-560+k*1150).toFixed(1)+' '+(GY-60-k*k*330).toFixed(1)+') scale('+(.8-k*.3).toFixed(2)+') rotate('+(-4-k*12).toFixed(1)+')');};},
    /* Module 4: the cell block, its watchtower and the bus */
    prison(g,D){strip(640,GY-8,GY+6,'#CDBEA2',D.gg);
      const tw=mk('g',OUT,D.up(GY-22));Rr(-420,GY-300,74,300,SOFT,tw);Rr(-414,GY-352,62,52,SOFT,tw);P('M-424 '+(GY-352)+' L-383 '+(GY-388)+' L-342 '+(GY-352)+' Z',INK,tw);Rr(-404,GY-340,42,20,INK,tw);   /* the tower stands behind the block */
      const o=mk('g',OUT,g);Rr(-330,GY-250,700,250,'#D9C4A9',o);Rr(-340,GY-262,720,14,BRICKD,o);
      for(let t=0;t<2;t++)for(let i=0;i<8;i++){const x=-318+i*85,y=GY-236+t*118;Rr(x,y,72,96,'#2A2925',o);const b=mk('g',{stroke:'#D9C4A9','stroke-width':3},g);for(let k=1;k<6;k++)Li(x+k*12,y,x+k*12,y+96,b);Li(x,y+60,x+72,y+60,b);if((i+t)%3!==0)figure(g,x+24+((i*7)%20),y+94,.9,true);}
      const N=D.up(GY+16), bus=mk('g',OUT,N);                                              /* the bus and its queue are on this side of the yard */Rr(400,GY-64,200,56,OCHRE,bus,{rx:8});Rr(408,GY-54,28,40,INK,bus,{rx:3});for(let i=0;i<5;i++)Rr(446+i*30,GY-54,24,18,SOFT,bus);Li(400,GY-30,600,GY-30,bus);Ci(440,GY-6,11,INK,bus);Ci(560,GY-6,11,INK,bus);Ci(440,GY-6,4,PAPER,bus,{stroke:'none'});Ci(560,GY-6,4,PAPER,bus,{stroke:'none'});
      const q=[0,1,2].map(i=>figure(N,330-i*34,GY+2,1,true));
      return now=>q.forEach((f,i)=>f.setAttribute('transform','translate('+(330-i*34)+' '+(GY+2+Math.sin(now/520+i)*1.2).toFixed(1)+')'));},
    /* Module 5: open country, a river and its bridge, and the jet overhead */
    jet(g,D){D.reach=2600;P('M-940 '+GY+' Q-790 '+(GY-10)+' -640 '+(GY-20)+' Q-200 '+(GY-50)+' 640 '+(GY-16)+' Q800 '+(GY-9)+' 960 '+GY+' Z',GRASSD,g);
      /* the river: a thread at the horizon that winds in, widening as it comes, under the bridge and out of sight behind the near bank.
         Each row is [y, left bank, right bank]; it lies on the ground, so it swings round as the train goes by */
      const F=D.flat(), RV=[[444,517,522],[452,463,477],[462,382,408],[474,330,370],[488,318,372],[502,216,284],[516,93,167],[532,22,118],[548,-42,82],[566,-115,35],[588,-170,10]];
      const bank=a=>{let d='';for(let i=1;i<a.length-1;i++)d+=' Q'+a[i][0]+' '+a[i][1]+' '+((a[i][0]+a[i+1][0])/2)+' '+((a[i][1]+a[i+1][1])/2);return d+' L'+a[a.length-1][0]+' '+a[a.length-1][1];};
      const lf=RV.map(v=>[v[1],v[0]]), rt=RV.map(v=>[v[2],v[0]]).reverse();
      P('M'+lf[0][0]+' '+lf[0][1]+bank(lf)+' L'+rt[0][0]+' '+rt[0][1]+bank(rt)+' Z','#A9C9C9',F);
      const rp=mk('g',{fill:'none',stroke:'#F0EAD9','stroke-width':2,opacity:.8},F);[[-60,560],[10,574],[-90,580],[60,540],[110,524],[236,504]].forEach(w=>P('M'+w[0]+' '+w[1]+' q7 -5 14 0 q7 5 14 0',null,rp));
      const o=mk('g',OUT,D.up(GY-26));P('M-10 '+(GY-22)+' L-10 '+(GY-50)+' Q80 '+(GY-92)+' 170 '+(GY-58)+' L170 '+(GY-34)+' L140 '+(GY-32)+' Q136 '+(GY-66)+' 84 '+(GY-64)+' Q34 '+(GY-62)+' 26 '+(GY-24)+' Z',SOFT,o);
      const nb=D.up(592);P('M-470 604 Q-330 574 -90 571 Q170 568 330 604 Z',GRASS,nb);                /* the near bank, and its reeds */
      const rd=mk('g',{fill:'none',stroke:'#8A9A6A','stroke-width':2.4,'stroke-linecap':'round'},nb);for(let i=0;i<9;i++){const x=-300+i*62+(i%2)*14,y=584-Math.abs(i-4)*-2.4;P('M'+x+' '+y+' l-5 -12 M'+x+' '+y+' l0 -15 M'+x+' '+y+' l6 -11',null,rd);}
      const j=mk('g',{},g), b=mk('g',{transform:'scale(.34)'},j);const JO={stroke:INK,'stroke-width':7,'stroke-linejoin':'round'};
      Li(1180,190,2400,190,b,{stroke:'#FFFFFF','stroke-width':16,'stroke-linecap':'round',opacity:.55});
      P('M922 138 L1052 28 L1114 28 L1090 180 Z',RED,b,JO);P('M1056 176 L1178 158 L1186 168 L1076 190 Z',CARD,b,JO);
      P('M28 210 C 40 168, 96 140, 180 136 L 900 132 C 990 134, 1040 158, 1090 176 L 1140 186 L 1140 196 C 1090 222, 1030 236, 960 240 L 150 250 C 92 250, 42 240, 28 210 Z',CARD,b,JO);
      P('M76 166 C 90 150, 112 142, 140 140 L 136 158 C 114 160, 96 166, 84 174 Z',INK,b);[TEAL,TERRA,TEAL,RED,TERRA,TEAL,TEAL,RED,TERRA,TEAL,TERRA,TEAL].forEach((c,i)=>Rr(210+i*62,166,34,20,c,b,{rx:5}));
      P('M 420 232 L 610 232 L 760 330 L 540 330 Z',SOFT,b,JO);Rr(480,262,92,44,CARD,b,Object.assign({rx:20},JO));
      return now=>{const k=(now%46000)/46000;j.setAttribute('transform','translate('+(520-k*1500).toFixed(1)+' '+(150+Math.sin(now/1300)*7).toFixed(1)+') rotate('+(Math.sin(now/1900)*1.2).toFixed(2)+')');};},
    /* Module 6: a seaside hall with the cage on its roof */
    bingo(g,D){strip(640,GY-10,GY+6,'#D9CBA8',D.gg);const o=mk('g',OUT,g);Rr(-250,GY-150,500,150,CARD,o);Rr(-270,GY-164,540,16,RED,o);
      for(let i=0;i<5;i++){const x=-220+i*100;P('M'+x+' '+(GY-20)+' L'+x+' '+(GY-90)+' A30 30 0 0 1 '+(x+60)+' '+(GY-90)+' L'+(x+60)+' '+(GY-20)+' Z',i===2?INK:TEAL,o);}
      const aw=mk('g',{stroke:INK,'stroke-width':1.4},g);for(let i=0;i<20;i++)Rr(-250+i*25,GY-148,25,18,i%2?CARD:RED,aw);
      Li(-70,GY-164,-40,GY-330,o,{'stroke-width':6,'stroke-linecap':'round'});Li(70,GY-164,40,GY-330,o,{'stroke-width':6,'stroke-linecap':'round'});
      Ci(0,GY-300,74,'#F0EAD9',o,{'stroke-width':5});const wr=mk('g',{fill:'none',stroke:INK,'stroke-width':1.4,opacity:.45},g);[20,44,66].forEach(rx=>mk('ellipse',{cx:0,cy:GY-300,rx,ry:74},wr));[-36,0,36].forEach(dy=>mk('ellipse',{cx:0,cy:GY-300+dy,rx:Math.sqrt(74*74-dy*dy),ry:9},wr));
      P('M-30 '+(GY-410)+' L30 '+(GY-410)+' L18 '+(GY-372)+' L-18 '+(GY-372)+' Z',RED,o);
      const balls=mk('g',{},g), BC=[TEAL,TERRA,OCHRE,'#26713D','#6B2D3E'], bs=[], r=rng(8);for(let i=0;i<11;i++){const c=mk('g',{},balls);Ci(0,0,13,BC[i%5],c,{stroke:INK,'stroke-width':2});Ci(0,0,6.5,CARD,c);bs.push({c,a:r()*6,q:.25+r()*.6,w:.5+r()*.7});}
      const bulbs=[];for(let i=0;i<22;i++)bulbs.push(Ci(-262+i*25,GY-170,4.2,WARM,g,{stroke:INK,'stroke-width':1}));
      return now=>{bs.forEach((b,i)=>{const a=b.a+now/1000*b.w,x=Math.cos(a)*52*b.q,y=Math.abs(Math.sin(a*1.3))*-46*b.q+44-(i%3)*10;b.c.setAttribute('transform','translate('+x.toFixed(1)+' '+(GY-300+y).toFixed(1)+') rotate('+(a*40%360).toFixed(0)+')');});
        bulbs.forEach((b,i)=>b.setAttribute('opacity',((Math.floor(now/260)+i)%3)?1:.25));};},
    /* Module 7: the line runs along the shore, and the fleet is out */
    sea(g,D){D.reach=4400;const F=D.flat(), A=1180, B=470, Y0=GY-118, Y1=GY+6;
      /* the bay: the shore comes down from a headland on the horizon, a long way off, to run beside the line, and goes back up
         to the other headland, so the sea is first seen far ahead and the shoreline sweeps in under the train. It lies on the
         ground, so it shears; the waves are in four bands, each at its own pace; every ship stands at its own distance */
      const sh=(m,dx,dy)=>['C'+m*(A-130+dx)+' '+(Y0+3+dy)+' '+m*(900+dx)+' '+(Y0+26+dy)+' '+m*(800+dx)+' '+(Y0+50+dy),'C'+m*(700+dx)+' '+(Y0+74+dy)+' '+m*(600+dx)+' '+(Y1-20+dy)+' '+m*(B+dx)+' '+(Y1+dy)];
      const back=(m,dx,dy)=>'C'+m*(600+dx)+' '+(Y1-20+dy)+' '+m*(700+dx)+' '+(Y0+74+dy)+' '+m*(800+dx)+' '+(Y0+50+dy)+' C'+m*(900+dx)+' '+(Y0+26+dy)+' '+m*(A-130+dx)+' '+(Y0+3+dy)+' '+m*(A+dx)+' '+Y0;
      [1,-1].forEach(m=>P('M'+m*(A+50)+' '+Y0+' '+sh(m,70,8).join(' ')+' L'+m*(B-60)+' '+(Y1+8)+' L'+m*(B+100)+' '+(Y1-40)+' L'+m*900+' '+(Y0+20)+' Z','#E6D9AE',F));
      P('M'+(-A)+' '+Y0+' L'+A+' '+Y0+' '+sh(1,0,0).join(' ')+' L'+(-B)+' '+Y1+' '+back(-1,0,0)+' Z','#A9C9C9',F);
      [1,-1].forEach(m=>P('M'+m*A+' '+Y0+' '+sh(m,0,0).join(' '),'none',F,{stroke:'#F7F2E6','stroke-width':2.6,'stroke-linecap':'round',opacity:.9}));
      [1,-1].forEach(m=>P('M'+m*860+' '+Y0+' Q'+m*1000+' '+(Y0-42)+' '+m*1170+' '+(Y0-46)+' Q'+m*1360+' '+(Y0-44)+' '+m*1580+' '+Y0+' Z',HILL,D.back(Y0)));
      const r=rng(12), hw=y=>y<Y0+50?A-40-(y-Y0)*6.6:790-(y-Y0-50)*4.2;
      [Y0+16,Y0+46,Y0+76,Y0+106].forEach(by=>{const wv=mk('g',{fill:'none',stroke:'#F0EAD9','stroke-width':2,opacity:.8},D.up(by));for(let i=0;i<15;i++){const y=by-12+r()*24, x=(r()*2-1)*(hw(y)-50);P('M'+x.toFixed(0)+' '+y.toFixed(0)+' q7 -5 14 0 q7 5 14 0',null,wv);}});
      const o=mk('g',OUT,D.up(GY-70));P('M-120 '+(GY-70)+' L-70 '+(GY-128)+' L-30 '+(GY-104)+' L10 '+(GY-150)+' L60 '+(GY-112)+' L110 '+(GY-70)+' Z','#8E8A82',o);[[-66,RED],[10,TEAL],[58,RED]].forEach(s=>{P('M'+(s[0]-8)+' '+(GY-124+(s[0]===10?-24:0))+' l8 -22 l8 22 Z',s[1],o);Ci(s[0],GY-150+(s[0]===10?-24:0),5,'#E9C9A8',o);});
      const sp=mk('g',{fill:'none',stroke:'#37658A','stroke-width':3},D.up(GY-60));for(let i=1;i<6;i++)mk('ellipse',{cx:470,cy:GY-60,rx:i*9,ry:i*5},sp);
      const ships=[[-420,GY-40,'#26713D',1],[-250,GY-84,TERRA,.8],[250,GY-36,'#37658A',1.05],[380,GY-96,OCHRE,.75]].map(s=>{const h=mk('g',{},D.up(s[1]));P('M-40 -8 Q-44 -22 -50 -26 L-34 -20 L34 -20 Q44 -22 50 -32 Q50 -6 30 0 L-28 0 Q-38 -2 -40 -8 Z','#5A3A22',h,OUT);Li(0,-20,0,-64,h,{stroke:INK,'stroke-width':3});P('M-26 -58 Q0 -50 26 -58 L22 -28 Q0 -20 -22 -28 Z',s[2],h,OUT);P('M0 -64 l-16 -5 l16 -5 Z',RED,h,{stroke:INK,'stroke-width':1.4});return {h,x:s[0],y:s[1],s:s[3]};});
      return now=>ships.forEach((s,i)=>s.h.setAttribute('transform','translate('+(s.x+Math.sin(now/2600+i)*10).toFixed(1)+' '+(s.y+Math.sin(now/800+i*2)*2.4).toFixed(1)+') scale('+s.s+') rotate('+(Math.sin(now/900+i)*2.5).toFixed(1)+')'));},
    /* Module 8: a car lot from another century */
    lot(g,D){D.reach=2500;const F=D.flat(), B=D.up(GY-26);
      /* the forecourt, its near kerb longer than its far one, the road it fronts running off both ways to a point, and the bays painted toward the same point */
      P('M-790 '+(GY-46)+' L-670 '+(GY-26)+' L670 '+(GY-26)+' L790 '+(GY-46)+' L740 '+(GY+6)+' L-740 '+(GY+6)+' Z','#8C8A82',F);
      P('M-790 '+(GY-46)+' L-740 '+(GY+6)+' L740 '+(GY+6)+' L790 '+(GY-46),'none',F,{stroke:PAPER,'stroke-width':2.4,'stroke-linejoin':'round',opacity:.75});
      const bay=mk('g',{stroke:CARD,'stroke-width':2,opacity:.6},F);for(let i=0;i<7;i++){const x=-32+i*104;Li(x,GY+2,x*.92,GY-22,bay);}
      const o=mk('g',OUT,B);Rr(-330,GY-104,210,78,CARD,o);Rr(-316,GY-92,150,52,TEAL,o);for(let i=1;i<4;i++)Li(-316+i*37.5,GY-92,-316+i*37.5,GY-40,o,{'stroke-width':1.6});Rr(-158,GY-84,26,58,TERRA,o);
      P('M-356 '+(GY-128)+' L-226 '+(GY-100)+' L-96 '+(GY-136)+' L-96 '+(GY-124)+' L-226 '+(GY-88)+' L-356 '+(GY-116)+' Z',OCHRE,o);
      Li(-40,GY-26,-40,GY-250,o,{'stroke-width':6});const star=mk('g',{},B);const pts=[];for(let i=0;i<16;i++){const a=i*Math.PI/8,q=i%2?22:48;pts.push((Math.cos(a)*q).toFixed(1)+' '+(Math.sin(a)*q).toFixed(1));}P('M'+pts.join(' L')+' Z',OCHRE,star,OUT);Ci(0,0,15,RED,star,{stroke:INK,'stroke-width':2});
      P('M-84 '+(GY-196)+' L10 '+(GY-212)+' L10 '+(GY-184)+' L-84 '+(GY-172)+' Z',TEAL,o);const bulbs=[];for(let i=0;i<7;i++)bulbs.push(Ci(-76+i*13,GY-186-i*2.4,3.4,WARM,B,{stroke:INK,'stroke-width':1}));
      const pn=[];[[-40,GY-236,300,GY-150],[300,GY-150,600,GY-226]].forEach(s=>{Li(s[0],s[1],s[2],s[3],B,{stroke:INK,'stroke-width':1.4});for(let i=1;i<12;i++){const k=i/12,x=s[0]+(s[2]-s[0])*k,y=s[1]+(s[3]-s[1])*k+Math.sin(k*Math.PI)*16;pn.push({e:P('M-6 0 L6 0 L0 14 Z',[RED,OCHRE,TEAL,CARD][i%4],B,{stroke:INK,'stroke-width':1}),x,y,ph:i});}});
      Li(300,GY-26,300,GY-150,o,{'stroke-width':4});Li(600,GY-26,600,GY-226,o,{'stroke-width':4});
      for(let i=0;i<6;i++)car(g,20+i*104,GY-4,.82,TAN);
      return now=>{star.setAttribute('transform','translate(-40 '+(GY-262)+') rotate('+(now/60%360).toFixed(1)+')');bulbs.forEach((b,i)=>b.setAttribute('opacity',((Math.floor(now/220)+i)%4)?1:.2));
        pn.forEach(p=>p.e.setAttribute('transform','translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+') rotate('+(Math.sin(now/240+p.ph)*16).toFixed(1)+')'));};},
    /* the country between: a windmill, a canal, sheep, a castle, balloons, oast houses, a ring of stones */
    windmill(g){P('M-400 '+GY+' Q0 '+(GY-70)+' 400 '+GY+' Z',GRASSD,g);const o=mk('g',OUT,g);P('M-36 '+(GY-30)+' L-22 '+(GY-170)+' L22 '+(GY-170)+' L36 '+(GY-30)+' Z',CARD,o);P('M-26 '+(GY-170)+' Q0 '+(GY-204)+' 26 '+(GY-170)+' Z',SLATE,o);Rr(-8,GY-64,16,34,INK,o);Rr(-6,GY-130,12,16,TEAL,o);
      const s=mk('g',{},g);for(let i=0;i<4;i++){const b=mk('g',{transform:'rotate('+i*90+')'},s);Li(0,0,0,-104,b,{stroke:INK,'stroke-width':4});Rr(3,-104,20,74,SOFT,b,{stroke:INK,'stroke-width':1.8});for(let k=1;k<5;k++)Li(3,-104+k*15,23,-104+k*15,b,{stroke:INK,'stroke-width':1});}Ci(0,0,5,INK,s);
      return now=>s.setAttribute('transform','translate(0 '+(GY-176)+') rotate('+(now/40%360).toFixed(1)+')');},
    canal(g,D){D.reach=2300;const F=D.flat();                                              /* the cut bends away to the horizon at both ends, narrowing as it goes */
      P('M-720 '+(GY-82)+' C-640 '+(GY-78)+' -610 '+(GY-46)+' -520 '+(GY-46)+' L520 '+(GY-46)+' C610 '+(GY-46)+' 640 '+(GY-78)+' 720 '+(GY-82)+' C670 '+(GY-70)+' 670 '+(GY-16)+' 540 '+(GY-16)+' L-540 '+(GY-16)+' C-670 '+(GY-16)+' -670 '+(GY-70)+' -720 '+(GY-82)+' Z','#A9C9C9',F);
      P('M-720 '+(GY-82)+' C-640 '+(GY-78)+' -610 '+(GY-48)+' -520 '+(GY-48)+' L520 '+(GY-48)+' C610 '+(GY-48)+' 640 '+(GY-78)+' 720 '+(GY-82),'none',F,{stroke:'#8E8A82','stroke-width':5,'stroke-linecap':'round'});
      P('M-552 '+(GY-17)+' L552 '+(GY-17)+' L580 '+(GY+2)+' L-580 '+(GY+2)+' Z',GRASS,F);           /* the near bank, so no field tree stands half in the water */
      const o=mk('g',OUT,D.up(GY-30));P('M110 '+(GY-16)+' L110 '+(GY-50)+' Q200 '+(GY-96)+' 290 '+(GY-50)+' L290 '+(GY-16)+' L250 '+(GY-16)+' Q250 '+(GY-64)+' 200 '+(GY-64)+' Q150 '+(GY-64)+' 150 '+(GY-16)+' Z',BRICK,o);
      const tow=D.up(GY-36), b=mk('g',{},tow);P('M-70 -4 L-78 -16 L70 -16 L78 -4 Z','#2B3A55',b,OUT);Rr(-52,-32,96,16,RED,b,OUT);for(let i=0;i<4;i++)Rr(-44+i*22,-28,12,8,CARD,b,{stroke:INK,'stroke-width':1.2});Rr(50,-40,6,24,INK,b);Rr(-56,-35,104,4,'#26713D',b,{stroke:INK,'stroke-width':1.2});
      const h=mk('g',{},tow);P('M-22 -22 Q-8 -30 12 -24 L20 -36 L28 -34 L24 -18 L12 -14 L12 0 L8 0 L6 -12 L-14 -12 L-16 0 L-20 0 Z','#7A4A2A',h,{stroke:INK,'stroke-width':1.6,'stroke-linejoin':'round'});
      return now=>{const x=-480+((now/1000*9)%760);b.setAttribute('transform','translate('+x.toFixed(1)+' '+(GY-24+Math.sin(now/700)*.8).toFixed(1)+')');h.setAttribute('transform','translate('+(x+150).toFixed(1)+' '+(GY-50+Math.abs(Math.sin(now/300))*-1.6).toFixed(1)+')');};},
    sheep(g){P('M-500 '+GY+' Q-100 '+(GY-80)+' 500 '+GY+' Z','#C4D0A2',g);const r=rng(21),fl=[];for(let i=0;i<13;i++){const s=mk('g',{},g),x=-300+r()*560,y=GY-14-r()*40;mk('ellipse',{cx:0,cy:-10,rx:13,ry:9,fill:CARD,stroke:INK,'stroke-width':1.6},s);Ci(12,-13,5,INK,s);Li(-6,-2,-6,4,s,{stroke:INK,'stroke-width':2});Li(6,-2,6,4,s,{stroke:INK,'stroke-width':2});fl.push({s,x,y,ph:r()*6});}
      const o=mk('g',OUT,g);Rr(330,GY-70,60,40,SOFT,o);P('M322 '+(GY-70)+' l38 -26 l38 26 Z',TERRA,o);
      return now=>fl.forEach(f=>f.s.setAttribute('transform','translate('+(f.x+Math.sin(now/4000+f.ph)*14).toFixed(1)+' '+f.y.toFixed(1)+') rotate('+(Math.max(0,Math.sin(now/1500+f.ph))*9).toFixed(1)+')'));},
    castle(g){P('M-460 '+GY+' Q-200 '+(GY-150)+' 0 '+(GY-150)+' Q220 '+(GY-150)+' 460 '+GY+' Z',GRASSD,g);const o=mk('g',OUT,g);Rr(-120,GY-230,240,90,'#B8B2A4',o);Rr(-150,GY-280,60,140,'#B8B2A4',o);Rr(90,GY-256,60,116,'#B8B2A4',o);
      for(let i=0;i<3;i++){Rr(-150+i*24,GY-292,12,12,'#B8B2A4',o);}P('M-40 '+(GY-140)+' L-40 '+(GY-190)+' A24 24 0 0 1 8 '+(GY-190)+' L8 '+(GY-140)+' Z',INK,o);P('M96 '+(GY-256)+' l10 -14 l12 10 l14 -16 l18 20 Z','#B8B2A4',o);Rr(-130,GY-250,10,20,INK,o);
      Li(-120,GY-280,-120,GY-330,o);const fl=P('M0 0 L30 6 L0 14 Z',RED,g,{stroke:INK,'stroke-width':1.4});const bd=[0,1,2].map(i=>P('M-7 0 q3.5 -5 7 0 q3.5 -5 7 0','none',g,{stroke:INK,'stroke-width':1.8}));
      return now=>{fl.setAttribute('transform','translate(-120 '+(GY-330)+') skewY('+(Math.sin(now/260)*7).toFixed(1)+')');bd.forEach((b,i)=>b.setAttribute('transform','translate('+(60+Math.cos(now/2300+i*2)*90).toFixed(1)+' '+(GY-340+Math.sin(now/1700+i*2)*26).toFixed(1)+')'));};},
    balloons(g){P('M-500 '+GY+' Q0 '+(GY-50)+' 500 '+GY+' Z','#C4D0A2',g);const bl=[[-220,RED,CARD,1],[60,TEAL,OCHRE,.8],[300,TERRA,CARD,.62]].map((b,i)=>{const e=mk('g',{},g);P('M0 -60 C44 -60 50 -8 14 26 L-14 26 C-50 -8 -44 -60 0 -60 Z',b[1],e,OUT);P('M0 -60 C16 -60 18 -8 5 26 L-5 26 C-18 -8 -16 -60 0 -60 Z',b[2],e,{stroke:INK,'stroke-width':1.4});Li(-12,26,-8,44,e,{stroke:INK,'stroke-width':1.4});Li(12,26,8,44,e,{stroke:INK,'stroke-width':1.4});Rr(-9,44,18,13,'#9A6B3A',e,{stroke:INK,'stroke-width':1.8});return {e,x:b[0],s:b[3],i};});
      return now=>bl.forEach(b=>b.e.setAttribute('transform','translate('+(b.x+Math.sin(now/5200+b.i)*30).toFixed(1)+' '+(250+b.i*46+Math.sin(now/3100+b.i*2)*22).toFixed(1)+') scale('+b.s+')'));},
    oasts(g){P('M-520 '+GY+' Q-100 '+(GY-40)+' 520 '+GY+' Z',GRASSD,g);const hp=mk('g',{stroke:'#6F8A55','stroke-width':5,'stroke-linecap':'round'},g);for(let i=0;i<16;i++)Li(-480+i*22,GY-6,-480+i*22,GY-64,hp);
      const o=mk('g',OUT,g);[[-40,1],[40,.9],[112,1.05]].forEach(k=>{const t=mk('g',{transform:'translate('+k[0]+' '+GY+') scale('+k[1]+')'},o);Rr(-26,-84,52,84,BRICK,t);P('M-28 -84 L-6 -168 L6 -168 L28 -84 Z',TERRA,t);P('M-6 -168 L-10 -192 L8 -186 L6 -168 Z',CARD,t);});Rr(150,GY-70,120,70,BRICK,o);P('M142 '+(GY-70)+' l68 -40 l68 40 Z',SLATE,o);
      const sm=R.smoke(g);let last=0;return (now,dt)=>{if(now-last>1300){last=now;sm.puff(300,GY-112,{r:4,grow:7,vy:-14,max:3.2,op:.7});}sm.step(dt,5);};},
    stones(g){P('M-520 '+GY+' Q0 '+(GY-64)+' 520 '+GY+' Z','#C4D0A2',g);const o=mk('g',OUT,g);[-210,-130,-40,60,150].forEach((x,i)=>{Rr(x,GY-110+(i%2)*6,22,96,'#A8A398',o);Rr(x+52,GY-108,22,94,'#A8A398',o);Rr(x-6,GY-128+(i%2)*6,86,20,'#B8B2A4',o);});Rr(250,GY-74,24,60,'#A8A398',o,{transform:'rotate(14 262 '+(GY-14)+')'});
      const bd=[0,1,2,3].map(()=>P('M-7 0 q3.5 -5 7 0 q3.5 -5 7 0','none',g,{stroke:INK,'stroke-width':1.8}));return now=>bd.forEach((b,i)=>b.setAttribute('transform','translate('+(((now/1000*26+i*60)%1100)-550).toFixed(1)+' '+(GY-230+i*14+Math.sin(now/600+i)*6).toFixed(1)+')'));}
  };
  const ORDER=['tree','windmill','airfield','canal','prison','sheep','jet','castle','bingo','balloons','sea','oasts','lot','stones'];
  /* the stops after the terminus for a room of n hands: the seven places of the programme, and as many stretches of
     country between them as the room needs so every hand has its own backdrop */
  function route(n){const need=Math.max(0,n-1), extra=Math.max(0,need-7);const out=[];for(let i=0;i<ORDER.length;i++){if(i%2===0||(i-1)/2<extra)out.push(ORDER[i]);}return out.slice(0,Math.max(need,0));}
  const built=new Map();
  function ensurePlace(k,name){if(!name||built.has(k))return;const at={transform:'translate('+(640+k*STOPD*.75)+' 0)'}, gg=mk('g',at,groundG), g=mk('g',at,placeG), D=depthKit(g,gg), f=PLACES[name](g,D);built.set(k,{g,gg,name,D,f,on:true});}

  /* ================= the train ================= */
  const loco=R.loco(trainG);loco.g.setAttribute('transform','translate('+(-R.LOCO_LEN)+' 0)');loco.g.style.cursor='pointer';
  Rr(0,-90,R.LOCO_LEN,94,'transparent',loco.g);
  const cars=new Map();let order=[], pending=[], lastEnter=0, shown=null;
  const T={s:1,off:0,jolt:0,cam:0,vel:0,mode:'station',end:0,stop:0,from:0,to:0,t0:0,dur:6400,whistle:0,chuff:0,leaveV:0};
  let saved={opened:[],stop:0,gone:false};try{saved=Object.assign(saved,JSON.parse(sessionStorage.getItem(KEY)||'{}'));}catch(_){}
  const opened=new Set(saved.opened);
  function save(){try{if(st.live)sessionStorage.setItem(KEY,JSON.stringify({opened:[...opened],stop:T.stop,gone:T.mode==='gone'||T.mode==='leaving'}));}catch(_){}}
  const slotX=i=>-R.LOCO_LEN-(i+1)*R.PITCH;
  function wantScale(){const n=Math.max(order.length+pending.length,1);return Math.min(1,1180/(R.LOCO_LEN+n*R.PITCH+10));}
  function addCar(d,instant){const c=R.carriage(trainG,{livery:order.length});c.v=d.v;c.d=d;c.i=order.length;c.g.style.cursor='pointer';
    c.x=instant?slotX(c.i):Math.min(slotX(c.i)-260,-(FRONT+160)/T.s);c.coupled=instant;if(opened.has(d.v))c.raise(1);
    c.g.addEventListener('click',e=>{e.stopPropagation();open(c);});cars.set(d.v,c);order.push(c);if(instant)T.s=wantScale();place(c);}
  function place(c){c.g.setAttribute('transform','translate('+c.x.toFixed(1)+' 0)');}
  function counts(){document.querySelectorAll('[data-handn]').forEach(e=>e.textContent=st.live?st.list.length:0);}
  const stops=()=>route(order.length+pending.length);
  function goNext(){if(shown||T.mode==='travel'||T.mode==='leaving'||T.mode==='gone')return;const S=stops();
    if(T.stop>=S.length){if(order.length&&order.every(c=>opened.has(c.v)))leave();return;}
    ensurePlace(T.stop+1,S[T.stop]);ensurePlace(T.stop+2,S[T.stop+1]);                  /* and the one after, whose far end may be in view from the next stop */
    T.mode='travel';T.from=T.cam;T.to=(T.stop+1)*STOPD;T.stop++;T.t0=performance.now();T.whistle=T.t0;save();wake();}
  function leave(){if(T.mode==='leaving'||T.mode==='gone')return;T.mode='leaving';T.end=0;T.leaveV=0;T.whistle=performance.now();save();wake();}
  /* the E key (Ryan, 18 Sep: a way to the end when short of time): the ending from wherever the train is. An open hand closes
     first, its blinds go up, and the train leaves for the horizon; the carriages nobody opened keep their blinds down, and no
     stop in between is visited. Pressed on the move, the train finishes the run it is on and leaves as it arrives. T.end is
     1 while that is pending, so a second E, a click on a carriage and the roll-on after a closed hand all stand aside. */
  function ending(){if(T.end||T.mode==='leaving'||T.mode==='gone')return;T.end=1;
    if(shown){close();setTimeout(()=>{if(T.end)leave();},1500);}else if(T.mode!=='travel')leave();}
  addEventListener('keydown',e=>{if((e.key!=='e'&&e.key!=='E')||e.metaKey||e.ctrlKey||e.altKey||!slide.classList.contains('active'))return;
    const a=document.activeElement;if(a&&(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(a.tagName)||a.isContentEditable))return;
    e.preventDefault();e.stopImmediatePropagation();ending();},true);
  loco.g.addEventListener('click',e=>{e.stopPropagation();if(T.end)return;if(T.mode==='station'||T.mode==='stopped'){const S=stops();if(T.stop>=S.length)leave();else goNext();}});
  sun.addEventListener('click',()=>{if(shown)return;opened.clear();order.forEach(c=>c.raise(0));T.mode='station';T.end=0;T.stop=0;T.cam=0;T.off=0;T.vel=0;far.on=false;farG.setAttribute('opacity',0);goldO.setAttribute('opacity',0);duskO.setAttribute('opacity',0);trainG.setAttribute('opacity',1);smoke.clear();save();wake();});

  /* the train a long way off, heading for the horizon */
  const farG=mk('g',{opacity:0},svg);svg.insertBefore(farG,groundG);const far={on:false,t0:0};
  (function(){Rr(0,-7,16,7,C.GREEN,farG);Rr(11,-12,3,5,INK,farG);for(let i=0;i<9;i++)Rr(-(i+1)*15,-6,13,6,R.COACH[i%5],farG);})();
  const farSmoke=R.smoke(svg);svg.insertBefore(farSmoke.g,groundG);

  const duskO=Rr(0,0,1280,720,'#E8954F',null,{opacity:0,'pointer-events':'none'});
  let raf=0,lastT=0;
  function wake(){if(!raf)raf=requestAnimationFrame(frame);}
  const smooth=k=>k*k*k*(k*(k*6-15)+10);
  function frame(now){
    raf=0;if(!slide.classList.contains('active')){lastT=0;return;}
    const dt=lastT?Math.min(.05,(now-lastT)/1000):0;lastT=now;
    if(pending.length&&now-lastEnter>900&&!shown){lastEnter=now;addCar(pending.shift(),false);counts();}
    /* the camera: a run between two stops, eased at both ends */
    let moved=0;
    if(T.mode==='travel'){const k=Math.min(1,(now-T.t0)/T.dur), c=T.from+(T.to-T.from)*smooth(k);moved=c-T.cam;T.cam=c;if(k>=1){T.mode='stopped';T.vel=0;smoke.puff(chX()-30*T.s,RAIL-6,{r:5,grow:14,vx:-30,vy:-6,max:1.2,op:.7});if(T.end)leave();}}
    else if(T.mode==='leaving'){T.leaveV=Math.min(620,T.leaveV+210*dt);moved=T.leaveV*dt;T.off+=moved;
      if(FRONT+T.off-(R.LOCO_LEN+order.length*R.PITCH)*T.s>1330){T.mode='gone';far.on=true;far.t0=now;trainG.setAttribute('opacity',0);save();}}
    T.vel=dt?moved/dt:0;
    const sw=wantScale();T.s+=(sw-T.s)*Math.min(1,dt*2.4);
    if(moved){loco.roll(moved/T.s);order.forEach(c=>{if(c.coupled)c.roll(moved/T.s);});}
    order.forEach(c=>{if(c.coupled){const w=slotX(c.i);if(c.x!==w){c.x=w;place(c);}return;}
      const to=slotX(c.i), d=to-c.x, v=Math.min(560,70+d*2.6)/T.s*1, step=Math.min(d,v*dt);c.x+=step;c.roll(step);place(c);
      if(to-c.x<.5){c.x=to;c.coupled=true;place(c);T.jolt=1;smoke.puff(FRONT+T.off+(to+R.CAR_LEN)*T.s,RAIL-14*T.s,{r:4,grow:12,vy:-10,max:.9,op:.7});}});
    T.jolt=Math.max(0,T.jolt-dt*3.2);const jx=T.jolt?Math.sin(now/24)*2.2*T.jolt:0, bob=T.vel>30?Math.sin(now/90)*.5:0;
    trainG.setAttribute('transform','translate('+(FRONT+T.off+jx).toFixed(1)+' '+(RAIL+bob).toFixed(1)+') scale('+T.s.toFixed(3)+')');
    /* smoke from the chimney: lazy at a stand, a chuff for every quarter turn of the driver on the move; steam from the whistle on leaving */
    if(T.mode!=='gone'){const cx=chX(), cy=RAIL+loco.chimney.y*T.s;
      if(Math.abs(T.vel)>20){const q=Math.floor(loco.dist/23/(Math.PI/2));if(q!==T.chuff){T.chuff=q;smoke.puff(cx,cy,{r:7*T.s+2,grow:24,vy:-46,vx:-T.vel*.12,max:2.4});}}
      else if(!T.lazy||now-T.lazy>850){T.lazy=now;smoke.puff(cx,cy,{r:5*T.s+1,grow:10,vy:-24,vx:6,max:3});}
      if(now-T.whistle<900)smoke.puff(FRONT+T.off+(loco.valve.x-R.LOCO_LEN)*T.s,RAIL+loco.valve.y*T.s,{r:2.5,grow:22,vy:-90,vx:-10,max:.7});}
    smoke.step(dt,-T.vel*.55);
    loco.glow.setAttribute('opacity',(.3+.2*Math.sin(now/130)).toFixed(2));
    /* the world */
    tiles.forEach(t=>t.g.setAttribute('transform','translate('+(-((T.cam*t.factor)%t.W)).toFixed(1)+' 0)'));
    placeG.setAttribute('transform','translate('+(-T.cam*.75).toFixed(1)+' 0)');groundG.setAttribute('transform',placeG.getAttribute('transform'));stationG.setAttribute('transform','translate('+(-T.cam).toFixed(1)+' 0)');
    nearClipR.setAttribute('x',Math.max(0,PLAT_END+80-T.cam).toFixed(0));
    sleepG.setAttribute('transform','translate('+(-(T.cam%26)).toFixed(1)+' 0)');
    stationG.style.display=T.cam>PLAT_END+700?'none':'';
    const viewX=T.cam*.75+640;ticks.forEach(t=>{if(Math.abs(t.x-viewX)<(t.w||900)+700)t.f(now,dt);});
    built.forEach((p,k)=>{const d=T.cam-k*STOPD, on=Math.abs(d)<p.D.reach;if(on!==p.on){p.on=on;p.g.style.display=p.gg.style.display=on?'':'none';}if(on){p.D.set(d);if(p.f)p.f(now,dt);}});
    if(T.cam<1900){people.forEach(p=>p.g.setAttribute('transform','translate('+p.x+' '+(p.y+Math.sin(now/600+p.ph)*.8).toFixed(1)+')'));
      const up=T.mode==='travel'&&T.stop===1&&now-T.t0<2600;guard.arm.setAttribute('transform','translate(5 -26) rotate('+(up?20+Math.sin(now/110)*14:150)+')');}
    clouds.forEach(c=>{c.x+=(c.v-T.vel*.03)*dt;if(c.x<-140)c.x=1400;if(c.x>1420)c.x=-120;c.g.setAttribute('transform','translate('+c.x.toFixed(1)+' '+c.y.toFixed(1)+') scale('+c.s.toFixed(2)+')');});
    /* the last of it: a small train crossing the far hills, and the evening coming on */
    if(far.on){const k=Math.min(1,(now-far.t0)/16000), x=1330-k*640, y=446-Math.sin(k*2.2)*10-k*16, s=1.5-k*1.1;
      farG.setAttribute('opacity',(k<.85?1:(1-k)/.15).toFixed(2));farG.setAttribute('transform','translate('+x.toFixed(1)+' '+y.toFixed(1)+') scale('+(-s).toFixed(2)+' '+s.toFixed(2)+')');
      if(k<.9&&(now%420)<18)farSmoke.puff(x-12*s,y-12*s,{r:2.5*s,grow:5,vy:-9,vx:8,max:2.6,op:.8});
      goldO.setAttribute('opacity',(.5*Math.min(1,k*1.6)).toFixed(3));duskO.setAttribute('opacity',(.16*Math.min(1,k*1.6)).toFixed(3));}
    farSmoke.step(dt,0);
    wake();
  }
  function chX(){return FRONT+T.off+(loco.chimney.x-R.LOCO_LEN)*T.s;}

  /* ================= a carriage, opened: its four cards fly out of the windows and turn face up ================= */
  const dim=$('jdim'), layer=$('hfrontA'), fc=layer.querySelector('.fcards');
  const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const cardHTML=(i,text,down)=>'<div class="hcard s'+i+(down?' down':'')+'"><div class="suit">'+SUITN[i]+'</div><div class="txt">'+esc(text)+'</div><svg class="pip" viewBox="0 0 40 40"><use href="#pip'+i+'"/></svg></div>';
  const FAN=['rotate(-4deg) translateY(10px)','rotate(-1.3deg)','rotate(1.3deg)','rotate(4deg) translateY(10px)'];
  const scale=()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale'))||1;
  function toWin(fly,win){const a=fly.getBoundingClientRect(), b=win.getBoundingClientRect(), sc=scale();
    return 'translate('+(((b.left+b.width/2)-(a.left+a.width/2))/sc)+'px,'+(((b.top+b.height/2)-(a.top+a.height/2))/sc)+'px) scale('+(b.width/a.width)+')';}
  function open(c){if(shown||T.end||!slide.classList.contains('active')||!c.coupled||T.mode==='travel'||T.mode==='leaving'||T.mode==='gone')return;
    shown=c;const was=opened.has(c.v);fc.innerHTML=c.d.cards.map((t,i)=>'<div class="fly">'+cardHTML(i,t,!was)+'</div>').join('');layer.classList.add('on');dim.classList.add('on');
    const flies=[...fc.children];flies.forEach(f=>{f.style.transition='none';f.style.transform='none';});
    const starts=flies.map((f,i)=>toWin(f,c.wins[i]));flies.forEach((f,i)=>{f.style.transform=starts[i];});void fc.offsetWidth;
    flies.forEach((f,i)=>{f.style.transition='';f.style.transitionDelay=(i*90)+'ms';f.style.transform=FAN[i];
      if(!was){const h=f.querySelector('.hcard');setTimeout(()=>h.classList.add('edge'),i*90+220);
        setTimeout(()=>{h.style.transition='none';h.classList.remove('down');h.style.transform='rotateY(-90deg)';void h.offsetWidth;h.style.transition='';h.classList.remove('edge');h.style.transform='';},i*90+450);}});}
  function close(){if(!shown)return;const c=shown, first=!opened.has(c.v);shown=null;dim.classList.remove('on');
    [...fc.children].forEach((f,i)=>{f.style.transitionDelay=(i*60)+'ms';f.style.transform=toWin(f,c.wins[i]);});
    setTimeout(()=>{if(!shown){layer.classList.remove('on');fc.innerHTML='';}},900);
    if(first){opened.add(c.v);save();const t0=performance.now();(function up(t){const k=Math.min(1,(t-t0-700)/600);if(k>0)c.raise(1-Math.pow(1-k,3));if(k<1)requestAnimationFrame(up);})(t0);
      setTimeout(()=>{if(shown||T.end)return;const S=stops();if(T.stop<S.length)goNext();else if(order.every(x=>opened.has(x.v)))leave();},1700);}
    wake();}
  dim.addEventListener('click',close);layer.addEventListener('click',close);
  addEventListener('keydown',e=>{if(!shown||!slide.classList.contains('active'))return;
    if(['Escape','ArrowRight','ArrowLeft','ArrowDown','ArrowUp','PageDown','PageUp',' ','Spacebar'].includes(e.key)){close();e.preventDefault();e.stopImmediatePropagation();}},true);

  /* ================= the room ================= */
  let first=true;
  function sync(){
    const demo=!st.live&&(demoOnly||st.failed), L=st.live?st.list:demo?DEMOLIST.slice(0,st.demoShown):[];
    L.forEach(d=>{const c=cars.get(d.v);if(c){c.d=d;return;}if(pending.find(x=>x.v===d.v))return;
      if(first&&st.live)addCar(d,true);else pending.push(d);});
    const seen=new Set(L.map(d=>d.v));
    if([...cars.keys()].some(v=>!seen.has(v))){                                   /* a Poll Desk reset, or the demo train giving way to the room */
      order.forEach(c=>c.g.remove());cars.clear();order=[];pending=pending.filter(d=>seen.has(d.v));if(shown){shown=null;dim.classList.remove('on');layer.classList.remove('on');fc.innerHTML='';}
      if(st.live&&!L.length){opened.clear();T.stop=0;T.cam=0;T.off=0;T.mode='station';T.end=0;trainG.setAttribute('opacity',1);far.on=false;farG.setAttribute('opacity',0);goldO.setAttribute('opacity',0);duskO.setAttribute('opacity',0);save();}
      L.forEach(d=>{if(!cars.has(d.v)&&!pending.find(x=>x.v===d.v))pending.push(d);});}
    if(first&&st.live){first=false;                                                /* a reload picks the journey up where it was */
      if(saved.gone&&order.length){T.mode='gone';T.off=3000;trainG.setAttribute('opacity',0);goldO.setAttribute('opacity',.5);duskO.setAttribute('opacity',.16);}
      else if(saved.stop){const S=stops();T.stop=Math.min(saved.stop,S.length);for(let k=1;k<=T.stop+1;k++)ensurePlace(k,S[k-1]);T.cam=T.stop*STOPD;T.mode=T.stop?'stopped':'station';}}
    $('handD').style.display=demo?'':'none';counts();wake();
  }
  function fetchIt(){fetch(POLL_API+'/p/'+ROOM+'/entries').then(r=>r.json()).then(d=>{
      const was=st.live, next=group(d.entries||[]), changed=JSON.stringify(next)!==JSON.stringify(st.list);st.live=true;st.failed=false;st.list=next;if(changed||!was)sync();
    }).catch(()=>{if(!st.live){st.failed=true;sync();}});}
  if(!demoOnly){setInterval(fetchIt,2500);fetchIt();}
  setInterval(()=>{if(!st.live&&(demoOnly||st.failed)&&st.demoShown<DEMOLIST.length&&slide.classList.contains('active')){st.demoShown++;sync();}},1100);
  new MutationObserver(()=>{if(slide.classList.contains('active'))wake();}).observe(slide,{attributes:true,attributeFilter:['class']});
  sync();
})();
