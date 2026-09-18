/* ---- Module 3's closing exercise, the room view: an airfield (Ryan's idea,
   18 Sep 2026, in the style of Module 7's sea chart). Every pair that sends
   (engines/, room m3-engines) is one aircraft, both its engines and the line
   along its fuselage painted in that pair's split, teal to them and
   terracotta to the other party. It taxis in from the left and joins the
   line beside the runway, engines running.

   A click on an aircraft opens it: the fan head on, winding up from a
   standstill to its split, the two shares, and the pair's three notes. No
   name is shown until WHOSE AIRCRAFT IS THIS? is clicked. Closing it sends
   the aircraft out: it backtracks to the threshold, rolls, lifts off and
   joins the circuit over the field, so by the end the whole room is in the
   air together. An aircraft in the circuit opens again on a click and simply
   goes on circling when closed. One aircraft uses the runway at a time; the
   next one cleared waits in the line.

   Mouse only. With an aircraft open, Esc, the arrow keys, space or a click
   outside close it; with none open the keys move on as usual. Which
   aircraft have flown is kept in sessionStorage per room, so a reload keeps
   it; a Poll Desk reset of the room clears it. ?demo=1 keeps the invented
   fleet (it also shows if the poll server cannot be reached); ?room=<x>
   reads the rehearsal room m3-engines-<x>. ALL TEXT in DEMO is invented and
   nothing depends on it. Every node of the scene is made with
   createElementNS and moved by its transform attribute (no innerHTML on the
   scene, no CSS transforms on SVG). Expects POLL_API and M3SUF. ---- */
(function(){
  const $=id=>document.getElementById(id), svg=$('fieldSvg');
  if(!svg)return;
  const slide=svg.closest('.slide'), NS='http://www.w3.org/2000/svg';
  function mk(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);(parent||svg).appendChild(e);return e;}
  function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
  const INK='#1B1C19', PAPER='#E9E2D2', SOFT='#F0EAD9', CARD='#F7F2E6', RED='#CE1E32', OCHRE='#C9A227', TEAL='#59949C', TERRA='#B5573A',
        SKY='#CFDDD6', SKYLOW='#E2EADF', GRASS='#BFC99C', GRASSD='#A9B585', HILL='#B4C2A2', HILLFAR='#C8D3BC', APRON='#7A7870', RUNWAY='#55534D', CLOUD='#F6F2E7';

  const DEMO=[
    ['The engine overhaul contract, at renewal','The incumbent shop','d','Guarantee the turnaround time',100],
    ['One spare engine, and two aircraft that both needed it','Our own operations team','i','Ground the older aircraft',50],
    ['The last headcount in the budget round','The other department head','n','',30],
    ['A customer’s fleet renewal','The incumbent supplier','d','Lead on delivery dates',0],
    ['The Saturday morning slot at the airport','A rival airline','i','Bid below cost to get it',100],
    ['A shared engineer for the quarter','The other project lead','n','',60],
    ['The last slot at the paint shop','A rival lessor','n','',100],
    ['This year’s training budget','The other division','n','',40],
    ['A customer’s five-year fleet order','The other manufacturer','d','Bundle the maintenance',70],
    ['The early hangar slot','The night shift','n','',50],
    ['The bonus pool between two teams','The other team','i','Argue from last year’s numbers',45],
    ['The one stand at the trade show','A competitor','d','Book before the dates were announced',80],
    ['The delivery slot in March','Another customer of the same factory','n','',20],
    ['The test cell for the week','The other programme','i','Ask for all five days',35],
    ['The credit for the saving','The procurement team','n','',65]
  ];
  const NAMES='Priya,Tom,Elena,Marcus,Sam,Aisha,Ben,Cara,Dev,Hana,Ivan,Jo,Kemi,Luis,Mei,Noor,Owen,Rosa,Theo,Uma,Vik,Wen,Yara,Zoe,Alex,Bea,Carl,Dina,Eli,Fay'.split(',');
  const DEMOLIST=DEMO.map((e,i)=>({v:'demo'+i,pie:e[0],party:e[1],k:e[2],move:e[3],pct:e[4],name:NAMES[i],name2:NAMES[i+15]}));
  const KIND={d:'A dominant strategy',i:'An inferior strategy',n:'No dominant or inferior strategy'};
  /* each phone sends four lines; group them by phone in arrival order, the last line per card wins */
  function group(entries){
    const by=new Map();
    entries.forEach(e=>{const m=/^([1-4])‖([\s\S]*)$/.exec(String(e.t||''));if(!m)return;
      if(!by.has(e.v))by.set(e.v,{v:e.v,pie:'',party:'',k:'n',move:'',pct:null,name:'',name2:''});
      const g=by.get(e.v), t=m[2].trim();
      if(m[1]==='1'){const q=t.split('‖');g.pie=q[0].trim();g.name=(q[1]||'').trim();g.name2=(q[2]||'').trim();}else if(m[1]==='2')g.party=t;
      else if(m[1]==='3'){const mm=/^([din])‖([\s\S]*)$/.exec(t);if(mm){g.k=mm[1];g.move=mm[2].trim();}}
      else{const p=+t;if(Number.isFinite(p))g.pct=Math.max(0,Math.min(100,Math.round(p)));}});
    return [...by.values()].filter(g=>g.pie&&g.pct!==null);
  }
  const demoOnly=/[?&]demo=1/.test(location.search);
  const ROOM='m3-engines'+(window.M3SUF||'');
  const st={live:false,failed:false,list:[],demoShown:0};

  /* ================= the field ================= */
  const HORIZON=452, RWY=650;                       /* the horizon; the runway's centreline, where the wheels roll */
  mk('rect',{x:0,y:0,width:1280,height:HORIZON,fill:SKY});
  mk('rect',{x:0,y:HORIZON-150,width:1280,height:150,fill:SKYLOW,opacity:.7});
  mk('circle',{cx:1062,cy:112,r:44,fill:'#EFDFA8'});
  const farCloudG=mk('g',{});
  const backG=mk('g',{});                           /* the far side of the circuit */
  const midCloudG=mk('g',{});
  const frontG=mk('g',{});                          /* the near side of the circuit, and anything climbing out */
  /* hills, then the airport's buildings on the horizon */
  mk('path',{d:'M0 '+HORIZON+' L0 420 Q120 384 260 412 Q380 434 520 404 Q640 380 760 414 Q900 446 1010 410 Q1130 376 1280 418 L1280 '+HORIZON+' Z',fill:HILLFAR});
  mk('path',{d:'M0 '+HORIZON+' L0 438 Q160 410 330 436 Q520 458 700 430 Q880 408 1040 438 Q1170 456 1280 432 L1280 '+HORIZON+' Z',fill:HILL});
  mk('rect',{x:0,y:HORIZON,width:1280,height:720-HORIZON,fill:GRASS});
  (function(){const g=mk('g',{stroke:INK,'stroke-width':2.5,'stroke-linejoin':'round'});
    /* the hangar */
    mk('path',{d:'M40 466 L40 418 Q110 384 180 418 L180 466 Z',fill:SOFT},g);
    mk('path',{d:'M62 466 L62 430 Q110 408 158 430 L158 466 Z',fill:INK,stroke:'none'},g);
    /* the terminal */
    mk('rect',{x:330,y:424,width:300,height:42,fill:SOFT},g);
    mk('rect',{x:318,y:416,width:324,height:10,fill:PAPER},g);
    const w=mk('g',{stroke:'none',fill:TEAL,opacity:.85},g);for(let i=0;i<12;i++)mk('rect',{x:342+i*24,y:434,width:15,height:16},w);
    /* the tower */
    mk('path',{d:'M236 466 L240 372 L260 372 L264 466 Z',fill:SOFT},g);
    mk('path',{d:'M224 372 L230 344 L270 344 L276 372 Z',fill:INK},g);
    mk('rect',{x:228,y:336,width:44,height:9,fill:PAPER},g);
    mk('line',{x1:250,y1:336,x2:250,y2:318},g);
  })();
  const beacon=mk('circle',{cx:250,cy:316,r:4.5,fill:RED});
  /* the apron and its holding lines, the runway in front */
  mk('rect',{x:0,y:470,width:1280,height:140,fill:APRON});
  const linesG=mk('g',{stroke:OCHRE,'stroke-width':2,'stroke-dasharray':'14 12',opacity:.8});
  mk('rect',{x:0,y:614,width:1280,height:66,fill:RUNWAY});
  mk('line',{x1:0,y1:618,x2:1280,y2:618,stroke:PAPER,'stroke-width':2,opacity:.8});
  mk('line',{x1:0,y1:676,x2:1280,y2:676,stroke:PAPER,'stroke-width':2.5,opacity:.8});
  mk('line',{x1:210,y1:647,x2:1280,y2:647,stroke:PAPER,'stroke-width':4,'stroke-dasharray':'46 34',opacity:.85});
  (function(){const g=mk('g',{fill:PAPER,opacity:.85});for(let i=0;i<6;i++)mk('rect',{x:36,y:623+i*8.4,width:58,height:4.6},g);
    const t=mk('text',{x:0,y:0,'font-family':'Archivo Black, Arial Black, sans-serif','font-weight':900,'font-size':58,fill:PAPER,opacity:.85,transform:'translate(112 664) scale(1 .5)'});t.textContent='03';})();
  /* the windsock */
  mk('line',{x1:1206,y1:470,x2:1206,y2:410,stroke:INK,'stroke-width':3});
  const sock=mk('g',{});
  (function(){[[RED,0],[CARD,15],[RED,30],[CARD,45]].forEach(([c,x],i)=>mk('path',{d:'M'+x+' '+(-8+i*1.2)+' L'+(x+15)+' '+(-6.8+i*1.2)+' L'+(x+15)+' '+(6.8-i*1.2)+' L'+x+' '+(8-i*1.2)+' Z',fill:c,stroke:INK,'stroke-width':1.5},sock));})();
  const groundG=mk('g',{});                         /* aircraft on the ground, back row first */
  const rollG=mk('g',{});                           /* the one on the runway, in front of the line */

  /* clouds, drifting; one layer behind the circuit and one through the middle of it */
  const clouds=[];
  (function(){const r=rng(11);
    function cloud(parent,x,y,s,v){const g=mk('g',{fill:CLOUD},parent);
      [[0,0,44,17],[-30,5,26,12],[32,6,30,12],[8,-12,26,15],[-12,-7,20,12]].forEach(e=>mk('ellipse',{cx:e[0],cy:e[1],rx:e[2],ry:e[3]},g));
      clouds.push({g,x,y,s,v});}
    for(let i=0;i<5;i++)cloud(farCloudG,r()*1280,60+r()*250,.7+r()*.5,4+r()*4);
    for(let i=0;i<3;i++)cloud(midCloudG,r()*1280,120+r()*180,1+r()*.5,8+r()*5);})();

  /* ================= an aircraft, side on, facing right; the origin is where its wheels touch ================= */
  let seq=0;
  function planeNode(b){
    const g=mk('g',{style:'cursor:pointer'},groundG), id='fcl'+(seq++), p=b.d.pct/100;
    const defs=mk('defs',{},g), c1=mk('clipPath',{id:id+'a'},defs), c2=mk('clipPath',{id:id+'b'},defs), c3=mk('clipPath',{id:id+'c'},defs);
    mk('rect',{x:10,y:-13,width:28,height:10,rx:5},c1);mk('rect',{x:-8,y:-14,width:34,height:12.5,rx:6},c2);mk('rect',{x:-46,y:-25,width:92,height:4.4,rx:2.2},c3);
    function split(x,y,w,h,clip){const s=mk('g',{'clip-path':'url(#'+clip+')'},g);mk('rect',{x,y,width:w,height:h,fill:TERRA},s);mk('rect',{x:x+w*(1-p),y,width:w*p,height:h,fill:TEAL},s);}
    b.gear=mk('g',{stroke:INK,'stroke-width':2.2,fill:INK},g);
    mk('line',{x1:46,y1:-16,x2:46,y2:-4},b.gear);mk('circle',{cx:46,cy:-3.2,r:3.2,stroke:'none'},b.gear);
    mk('line',{x1:-16,y1:-16,x2:-16,y2:-4},b.gear);mk('circle',{cx:-16,cy:-3.6,r:3.6,stroke:'none'},b.gear);
    /* the far engine, behind the fuselage */
    split(10,-13,28,10,id+'a');mk('rect',{x:10,y:-13,width:28,height:10,rx:5,fill:INK,opacity:.18},g);mk('rect',{x:10,y:-13,width:28,height:10,rx:5,fill:'none',stroke:INK,'stroke-width':1.8},g);
    mk('path',{d:'M-66 -30 L-84 -35 L-82 -29 L-60 -25 Z',fill:CARD,stroke:INK,'stroke-width':2.2,'stroke-linejoin':'round'},g);
    mk('path',{d:'M-60 -34 L-74 -64 L-57 -64 L-36 -36 Z',fill:RED,stroke:INK,'stroke-width':2.4,'stroke-linejoin':'round'},g);
    mk('path',{d:'M-66 -35 L-40 -37 L40 -37 Q62 -36 69 -26 Q62 -15 40 -14 L-28 -14 Q-52 -17 -66 -35 Z',fill:CARD,stroke:INK,'stroke-width':2.6,'stroke-linejoin':'round'},g);
    mk('path',{d:'M47 -34 Q58 -33 63 -28 L49 -28 Z',fill:INK},g);
    const win=mk('g',{fill:INK},g);for(let x=-34;x<=38;x+=8)mk('circle',{cx:x,cy:-30,r:1.5},win);
    split(-46,-25,92,4.4,id+'c');
    /* the wing, and the near engine under it */
    mk('path',{d:'M16 -21 L-26 -7 L-10 -7 L34 -21 Z',fill:PAPER,stroke:INK,'stroke-width':2.2,'stroke-linejoin':'round'},g);
    b.heat=mk('g',{stroke:PAPER,'stroke-width':1.6,'stroke-linecap':'round',opacity:.7},g);
    [[-12,-11,12],[-11,-7.6,16],[-12,-4.2,11]].forEach(h=>mk('line',{x1:h[0],y1:h[1],x2:h[0]-h[2],y2:h[1]},b.heat));
    split(-8,-14,34,12.5,id+'b');mk('rect',{x:-8,y:-14,width:34,height:12.5,rx:6,fill:'none',stroke:INK,'stroke-width':2.2},g);
    mk('ellipse',{cx:24.5,cy:-7.8,rx:2,ry:5.2,fill:INK},g);
    mk('rect',{x:-88,y:-68,width:162,height:72,fill:'transparent'},g);
    g.addEventListener('click',e=>{e.stopPropagation();open(b);});
    return g;
  }
  function put(b,now){
    const jig=(b.state==='queue'||b.state==='taxi'||b.state==='cleared')?Math.sin(now/38+b.ph)*.45:0;
    b.g.setAttribute('transform','translate('+b.x.toFixed(1)+' '+(b.y+jig).toFixed(1)+') scale('+(b.s*b.face).toFixed(3)+' '+b.s.toFixed(3)+') rotate('+(-b.pitch).toFixed(1)+')');
    if(b.heat){const air=b.state==='ring'||b.state==='climb';b.heat.setAttribute('opacity',air?0:(.35+.35*Math.sin(now/70+b.ph)).toFixed(2));
      b.heat.setAttribute('transform','translate('+(Math.sin(now/55+b.ph)*1.5).toFixed(1)+' 0)');}
    const up=b.state==='ring'||(b.state==='climb'&&now-b.t0>900);if(b.gearUp!==up){b.gearUp=up;b.gear.setAttribute('opacity',up?0:1);}
  }

  /* the line beside the runway: rows of at least eight, the back row filled first from the front of the queue */
  let lay=null;
  function layout(n){
    n=Math.max(n,8);const rows=n<=8?1:n<=16?2:n<=27?3:4, per=Math.max(8,Math.ceil(n/rows)), pitch=1130/per, gap=rows>1?Math.min(48,96/(rows-1)):0;
    const s=Math.min(1,pitch/160)*(rows>=4?.82:1), y0=rows===1?566:rows===2?532:504;
    return {rows,per,pitch,s,ys:Array.from({length:rows},(_,r)=>y0+r*(rows===2?54:rows===3?46:31))};
  }
  function slot(i){const r=Math.floor(i/lay.per)%lay.rows, c=i%lay.per;return {x:1196-c*lay.pitch-(r%2)*lay.pitch*.35,y:lay.ys[r],s:lay.s*(1-(lay.rows-1-r)*.035),row:r};}
  function relay(){const n=planes.size+pending.length, nl=layout(n);
    if(!lay||nl.rows!==lay.rows||nl.per!==lay.per){lay=nl;while(linesG.firstChild)linesG.firstChild.remove();lay.ys.forEach(y=>mk('line',{x1:0,y1:y+1,x2:1280,y2:y+1},linesG));
      planes.forEach(b=>{b.to=slot(b.i);});restack();}}
  function restack(){[...planes.values()].filter(b=>b.g.parentNode===groundG).sort((a,c)=>(a.to?a.to.y:a.y)-(c.to?c.to.y:c.y)).forEach(b=>groundG.appendChild(b.g));}

  /* ================= the circuit over the field ================= */
  const CLIMB=5600, SPIN=.27;
  const CX=640, CY=205, RX=470, RY=104, RINGS=[0.62,0.82,1.0,1.17], CAP=[6,8,10,14];
  const planes=new Map();let pending=[], lastEnter=0, shown=null, runway=null;const waiting=[];
  const FKEY='gt-m3-flown'+(window.M3SUF||'');
  let flown=new Set();try{flown=new Set(JSON.parse(sessionStorage.getItem(FKEY)||'[]'));}catch(_){}
  function saveFlown(){try{sessionStorage.setItem(FKEY,JSON.stringify([...flown]));}catch(_){}}
  const revealed=new Set();
  function ringOf(){const n=RINGS.map(()=>0);planes.forEach(b=>{if(b.state==='ring'||b.state==='climb')n[b.ring]++;});
    for(let r=0;r<RINGS.length;r++)if(n[r]<CAP[r])return r;return RINGS.length-1;}
  function ringPos(b){const rho=RINGS[b.ring], sn=Math.sin(b.th);return {x:CX+Math.cos(b.th)*RX*rho,y:CY+sn*RY*rho-b.ring*6,s:.56+.2*sn};}
  function turn(b,dt){const d=b.dir-b.face;if(Math.abs(d)<.01){b.face=b.dir;return;}b.face+=Math.sign(d)*Math.min(Math.abs(d),dt*4);if(Math.abs(b.face)<.06)b.face=.06*Math.sign(d);}
  function arrive(b,now,instant){
    b.i=b.i===undefined?nextI++:b.i;relay();b.to=slot(b.i);b.g=planeNode(b);b.face=1;b.dir=1;b.pitch=0;b.ph=(b.i*1.7)%6.28;
    if(flown.has(b.v)){b.state='ring';b.ring=ringOf();b.th=(b.i*2.4)%(2*Math.PI);const p=ringPos(b);b.x=p.x;b.y=p.y;b.s=p.s;(Math.sin(b.th)<0?backG:frontG).appendChild(b.g);}
    else if(instant){b.state='queue';b.x=b.to.x;b.y=b.to.y;b.s=b.to.s;}
    else{b.state='taxi';b.x=-110-Math.random()*20;b.y=b.to.y;b.s=b.to.s;}
    planes.set(b.v,b);restack();put(b,now);
  }
  let nextI=0;
  /* cleared for take-off: one at a time on the runway */
  function clear(b){if(b.state!=='queue'&&b.state!=='taxi')return;b.state='cleared';waiting.push(b);}
  function depart(b,now){runway=b;b.state='backtrack';b.t0=now;b.from={x:b.x,y:b.y,s:b.s};b.dur=Math.max(900,Math.hypot(b.x-170,RWY-b.y)/.46);b.dir=-1;rollG.appendChild(b.g);}
  function counts(){let gnd=pending.length,air=0;planes.forEach(b=>{if(b.state==='ring'||b.state==='climb')air++;else gnd++;});
    $('fieldGnd').textContent=gnd;$('fieldAir').textContent=air;document.querySelectorAll('[data-engn]').forEach(e=>e.textContent=st.live?st.list.length:0);}

  let raf=0,lastT=0,lastSort=0;
  function wake(){if(!raf)raf=requestAnimationFrame(frame);}
  const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
  function frame(now){
    raf=0;if(!slide.classList.contains('active')){lastT=0;return;}
    const dt=lastT?Math.min(.05,(now-lastT)/1000):0;lastT=now;
    if(pending.length&&now-lastEnter>620){lastEnter=now;arrive(pending.shift(),now,false);counts();}
    if(!runway&&waiting.length&&!shown){const b=waiting.shift();if(planes.get(b.v)===b)depart(b,now);}
    const circling=[];
    planes.forEach(b=>{
      if(b.state==='taxi'||b.state==='queue'||b.state==='cleared'){const dx=b.to.x-b.x, dy=b.to.y-b.y;
        b.x+=Math.sign(dx)*Math.min(Math.abs(dx),dt*(b.state==='taxi'?330:160));b.y+=Math.sign(dy)*Math.min(Math.abs(dy),dt*60);b.s+=(b.to.s-b.s)*Math.min(1,dt*3);
        if(b.state==='taxi'&&Math.abs(dx)<.5)b.state='queue';}
      else if(b.state==='backtrack'){const k=Math.min(1,(now-b.t0)/b.dur), e=ease(k);
        b.x=b.from.x+(170-b.from.x)*e;b.y=b.from.y+(RWY-b.from.y)*Math.min(1,e*2.2);b.s=b.from.s+(1.05-b.from.s)*e;turn(b,dt);
        if(k>=1){b.state='lineup';b.t0=now;b.dir=1;}}
      else if(b.state==='lineup'){turn(b,dt);if(now-b.t0>700&&b.face>.99){b.state='roll';b.t0=now;}}
      else if(b.state==='roll'){const t=(now-b.t0)/1000;b.x=170+80*t*t;b.pitch=t>1.9?Math.min(11,(t-1.9)*26):0;
        if(t>2.35){b.state='climb';b.t0=now;b.ring=ringOf();b.th=-.6;const p3=ringPos(b), tx=Math.sin(b.th)*RX, ty=-Math.cos(b.th)*RY, tl=Math.hypot(tx,ty);
          b.path=[{x:b.x,y:b.y},{x:b.x+640,y:b.y-30},{x:p3.x-tx/tl*340,y:p3.y-ty/tl*340+60},p3];flown.add(b.v);saveFlown();runway=null;counts();}}
      else if(b.state==='climb'){const k=Math.min(1,(now-b.t0)/CLIMB), u=1-k, P=b.path;
        const nx=u*u*u*P[0].x+3*u*u*k*P[1].x+3*u*k*k*P[2].x+k*k*k*P[3].x, ny=u*u*u*P[0].y+3*u*u*k*P[1].y+3*u*k*k*P[2].y+k*k*k*P[3].y;
        if(dt){const vx=(nx-b.x)/dt, vy=(ny-b.y)/dt;if(Math.abs(vx)>12)b.dir=vx>0?1:-1;const want=Math.max(-6,Math.min(22,-Math.atan2(vy,Math.abs(vx)+40)*57.3));b.pitch+=(want-b.pitch)*Math.min(1,dt*2.5);}
        b.x=nx;b.y=ny;b.s=1.05+(P[3].s-1.05)*(k*k*(3-2*k));turn(b,dt);if(k>=1){b.state='ring';counts();}}
      else if(b.state==='ring'){b.th-=dt*SPIN;circling.push(b);}
    });
    /* aircraft in the circuit keep their distance */
    for(let i=0;i<circling.length;i++)for(let j=i+1;j<circling.length;j++){const A=circling[i],B=circling[j],dr=Math.abs(A.ring-B.ring);if(dr>1)continue;
      const gap=(dr?.24:.46)/Math.min(RINGS[A.ring],RINGS[B.ring]);let d=(B.th-A.th)%(2*Math.PI);if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;
      if(Math.abs(d)<gap){const push=(gap-Math.abs(d))*dt*1.4*(d>=0?1:-1);B.th+=push;A.th-=push;}}
    circling.forEach(b=>{const p=ringPos(b);b.x=p.x;b.y=p.y;b.s=p.s;b.dir=Math.sin(b.th)>0?1:-1;
      const want=-Math.cos(b.th)*b.dir*5;b.pitch+=(want-b.pitch)*Math.min(1,dt*2);turn(b,dt);});
    planes.forEach(b=>put(b,now));
    if(now-lastSort>400){lastSort=now;
      [...planes.values()].filter(b=>b.state==='ring').sort((a,c)=>a.y-c.y).forEach(b=>{(Math.sin(b.th)<-.05?backG:frontG).appendChild(b.g);});}
    clouds.forEach(c=>{c.x+=c.v*dt;if(c.x>1400)c.x=-120;c.g.setAttribute('transform','translate('+c.x.toFixed(1)+' '+c.y.toFixed(1)+') scale('+c.s.toFixed(2)+')');});
    beacon.setAttribute('opacity',(now%1600)<260?1:.18);
    sock.setAttribute('transform','translate(1206 414) rotate('+(8+Math.sin(now/900)*5+Math.sin(now/310)*2).toFixed(1)+')');
    wake();
  }

  /* ================= an aircraft, opened: the fan head on, and the pair's notes ================= */
  const ov=$('fieldOpen');
  const FX=230,FY=230,FR=196;
  function sector(a0,a1){const big=(a1-a0)%360>180?1:0;
    const x0=FX+FR*Math.sin(a0*Math.PI/180),y0=FY-FR*Math.cos(a0*Math.PI/180),x1=FX+FR*Math.sin(a1*Math.PI/180),y1=FY-FR*Math.cos(a1*Math.PI/180);
    return 'M'+FX+' '+FY+' L'+x0+' '+y0+' A'+FR+' '+FR+' 0 '+big+' 1 '+x1+' '+y1+' Z';}
  function fanNode(pct,parent){
    const s=document.createElementNS(NS,'svg');s.setAttribute('class','efan');s.setAttribute('viewBox','0 0 460 460');s.setAttribute('aria-hidden','true');parent.appendChild(s);
    mk('circle',{cx:230,cy:230,r:222,fill:INK},s);mk('circle',{cx:230,cy:230,r:204,fill:'#E4D9C0'},s);mk('circle',{cx:230,cy:230,r:196,fill:INK},s);
    const rot=mk('g',{},s), a=pct*3.6;
    if(a>=360)mk('circle',{cx:230,cy:230,r:196,fill:TEAL},rot);else if(a>0)mk('path',{d:sector(0,a),fill:TEAL},rot);
    if(a<=0)mk('circle',{cx:230,cy:230,r:196,fill:TERRA},rot);else if(a<360)mk('path',{d:sector(a,360),fill:TERRA},rot);
    const bl=mk('g',{stroke:PAPER,'stroke-width':3,opacity:.55,fill:'none'},rot);for(let i=0;i<18;i++)mk('path',{d:'M230 82 q26 60 8 138',transform:'rotate('+(i*20)+' 230 230)'},bl);
    mk('circle',{cx:230,cy:230,r:46,fill:INK},rot);mk('path',{d:'M230 196 q30 14 12 46 q-14 24 -42 12',stroke:PAPER,'stroke-width':9,fill:'none','stroke-linecap':'round'},rot);
    return rot;
  }
  /* the fan winds up from a standstill: its pace climbs over eight seconds to one turn every three, and holds there */
  function windUp(rot){let t0=null,ang=0,last=null;const TOP=120,RAMP=8000;
    const step=ts=>{if(!rot.isConnected||!shown)return;if(t0===null){t0=ts;last=ts;}const t=ts-t0,dt=ts-last;last=ts;
      const k=Math.min(1,t/RAMP),w=TOP*(k*k);ang=(ang+w*dt/1000)%360;rot.setAttribute('transform','rotate('+ang.toFixed(2)+' 230 230)');requestAnimationFrame(step);};
    requestAnimationFrame(step);}
  const wordFor=p=>p>=100?'They won everything':p<=0?'They lost everything':p===50?'An even split':p>50?'Most of it to this side':'Most of it to the other party';
  let built=null;
  function fill(b){
    if(!b){ov.classList.remove('on');built=null;return;}
    const d=b.d;
    if(built!==b.v){built=b.v;const box=$('fieldFan');while(box.firstChild)box.firstChild.remove();windUp(fanNode(d.pct,box));}
    $('fieldA').textContent=d.pct;$('fieldB').textContent=100-d.pct;$('fieldWord').textContent=wordFor(d.pct);
    $('fieldPie').textContent=d.pie;$('fieldParty').textContent=d.party;
    $('fieldKind').textContent=KIND[d.k]||KIND.n;$('fieldMove').textContent=d.k==='n'?'':d.move;$('fieldStrat').classList.toggle('none',d.k==='n');
    const w=$('fieldWhose'), named=revealed.has(b.v);w.textContent=named?((d.name||'—')+(d.name2?' & '+d.name2:'')):'WHOSE AIRCRAFT IS THIS?';w.classList.toggle('named',named);
    ov.classList.add('on');
  }
  function open(b){if(!slide.classList.contains('active'))return;if(['backtrack','lineup','roll','climb'].includes(b.state))return;shown=b;fill(b);}
  function close(){if(!shown)return;const b=shown;shown=null;fill(null);clear(b);wake();}
  $('fieldWhose').addEventListener('click',e=>{e.stopPropagation();e.currentTarget.blur();if(!shown)return;revealed.has(shown.v)?revealed.delete(shown.v):revealed.add(shown.v);fill(shown);});
  $('fieldClose').addEventListener('click',e=>{e.stopPropagation();e.currentTarget.blur();close();});
  ov.addEventListener('click',e=>{if(e.target===ov)close();});
  addEventListener('keydown',e=>{if(!shown||!slide.classList.contains('active'))return;
    if(['Escape','ArrowRight','ArrowLeft','ArrowDown','ArrowUp','PageDown','PageUp',' ','Spacebar'].includes(e.key)){close();e.preventDefault();e.stopImmediatePropagation();}},true);

  /* ================= the room ================= */
  function sync(first){
    const demo=!st.live&&(demoOnly||st.failed), L=st.live?st.list:demo?DEMOLIST.slice(0,st.demoShown):[], seen=new Set(), now=performance.now();
    L.forEach(d=>{seen.add(d.v);
      let b=planes.get(d.v)||pending.find(x=>x.v===d.v);
      if(b){if(b.d.pct!==d.pct&&b.g){const par=b.g.parentNode;b.d=d;b.g.remove();b.g=planeNode(b);par.appendChild(b.g);}b.d=d;return;}
      b={v:d.v,d,x:0,y:0,s:1,face:1,dir:1,pitch:0,ph:0};
      if(first||flown.has(d.v))arrive(b,now,true);else pending.push(b);});
    [...planes.keys()].forEach(v=>{if(!seen.has(v)){const b=planes.get(v);if(b.g)b.g.remove();planes.delete(v);if(runway===b)runway=null;if(shown===b){shown=null;fill(null);}}});
    pending=pending.filter(b=>seen.has(b.v));
    if(st.live&&!L.length&&flown.size){flown=new Set();saveFlown();nextI=0;}                 /* a Poll Desk reset */
    if(!planes.size&&!pending.length)nextI=0;
    if(shown)fill(shown);
    $('fieldDemo').style.display=demo?'':'none';
    relay();counts();wake();
  }
  function fetchIt(){
    fetch(POLL_API+'/p/'+ROOM+'/entries').then(r=>r.json()).then(d=>{
      const was=st.live, next=group(d.entries||[]), changed=JSON.stringify(next)!==JSON.stringify(st.list);
      if(!was&&planes.size){planes.forEach(b=>{if(b.g)b.g.remove();});planes.clear();pending=[];waiting.length=0;runway=null;shown=null;fill(null);nextI=0;}   /* the demo fleet goes if the room answers after all */
      st.live=true;st.failed=false;st.list=next;
      if(changed||!was)sync(false);
    }).catch(()=>{if(!st.live){st.failed=true;sync();}});
  }
  if(!demoOnly){setInterval(fetchIt,2500);fetchIt();}
  setInterval(()=>{if(!st.live&&(demoOnly||st.failed)&&st.demoShown<DEMOLIST.length&&slide.classList.contains('active')){st.demoShown++;sync();}},650);
  new MutationObserver(()=>{if(slide.classList.contains('active'))wake();}).observe(slide,{attributes:true,attributeFilter:['class']});
  lay=layout(8);lay.ys.forEach(y=>mk('line',{x1:0,y1:y+1,x2:1280,y2:y+1},linesG));
  sync();
})();
