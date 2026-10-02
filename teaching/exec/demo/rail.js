/* ---- The programme's train (Ryan's idea, 18 Sep 2026): Module 1's hands
   ride in it and Module 8's awards meet it at the terminus, so the drawing
   lives here once and both decks load it. A Victorian express, side on,
   facing right: a single-driver locomotive in green with brass, its tender,
   and six-wheel carriages with a clerestory roof. A carriage has four
   windows, one per card of a hand, each with a blind in that card's suit
   colour; raising the blinds shows a lit compartment.

   Every node is made with createElementNS and moved by its transform
   attribute (no innerHTML, no CSS transforms on SVG). A vehicle's origin is
   the top of the rail at its left end. Nothing here knows about a deck: the
   caller owns the frame loop and calls roll() with the distance travelled. ---- */
window.GT_RAIL=(function(){
  const NS='http://www.w3.org/2000/svg';
  function mk(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;}
  function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
  const C={INK:'#1B1C19',PAPER:'#E9E2D2',SOFT:'#F0EAD9',CARD:'#F7F2E6',RED:'#CE1E32',OCHRE:'#C9A227',TEAL:'#59949C',TERRA:'#B5573A',
    GREEN:'#2F6B45',GREEND:'#24523A',BRASS:'#D9B23C',WARM:'#F6D37A',STEAM:'#F6F2E7',IRON:'#3A3B37'};
  const SUIT=[C.RED,C.TEAL,C.OCHRE,C.TERRA];
  const COACH=['#8E5630','#6B2D3E','#2B3A55','#7A4A2A','#35584A'];       /* teak, crimson lake, blue, chocolate, green: the old companies */
  const LOCO_LEN=236, CAR_LEN=112, GAP=6, PITCH=CAR_LEN+GAP;

  /* a spoked wheel; turn it with spin(angle in degrees) */
  function wheel(parent,cx,cy,r,spokes,rim){
    const g=mk('g',{transform:'translate('+cx+' '+cy+')'},parent), rot=mk('g',{},g);
    mk('circle',{cx:0,cy:0,r:r,fill:C.INK},rot);mk('circle',{cx:0,cy:0,r:r-2.6,fill:rim||C.GREEND},rot);
    const sp=mk('g',{stroke:C.INK,'stroke-width':Math.max(1.2,r*.11)},rot);for(let i=0;i<spokes;i++){const a=i*Math.PI*2/spokes;mk('line',{x1:0,y1:0,x2:(Math.cos(a)*(r-2)).toFixed(1),y2:(Math.sin(a)*(r-2)).toFixed(1)},sp);}
    mk('circle',{cx:0,cy:0,r:Math.max(2,r*.2),fill:C.INK},rot);
    return {r,rot,cx,cy};
  }

  /* ================= the locomotive and its tender ================= */
  function loco(parent){
    const g=mk('g',{},parent), wheels=[];
    const LJ={stroke:C.INK,'stroke-width':2.4,'stroke-linejoin':'round'};
    /* the tender */
    const t=mk('g',LJ,g);
    mk('rect',{x:4,y:-16,width:64,height:6,fill:C.INK,stroke:'none'},t);
    mk('path',{d:'M6 -16 L6 -46 Q6 -50 10 -50 L62 -50 Q66 -50 66 -46 L66 -16 Z',fill:C.GREEN},t);
    mk('path',{d:'M12 -50 Q20 -60 30 -55 Q38 -63 48 -56 Q56 -60 60 -50 Z',fill:C.INK},t);
    mk('rect',{x:11,y:-44,width:50,height:22,fill:'none',stroke:C.RED,'stroke-width':1.4,rx:3},t);
    mk('rect',{x:0,y:-20,width:5,height:7,fill:C.INK,stroke:'none'},t);
    [16,36,56].forEach(x=>wheels.push(wheel(g,x,-8.5,8.5,8)));
    mk('line',{x1:66,y1:-13,x2:78,y2:-13,stroke:C.INK,'stroke-width':3},g);
    /* the frame and the running plate */
    const f=mk('g',LJ,g);
    mk('rect',{x:76,y:-20,width:152,height:5,fill:C.INK,stroke:'none'},f);
    mk('rect',{x:226,y:-24,width:7,height:13,fill:C.RED},f);
    mk('rect',{x:233,y:-20,width:4,height:5,fill:C.INK,stroke:'none'},f);
    /* the cab */
    mk('path',{d:'M80 -20 L80 -62 L112 -62 L112 -20 Z',fill:C.GREEN},f);
    mk('path',{d:'M76 -62 Q96 -70 118 -62 L118 -58 L76 -58 Z',fill:C.INK},f);
    mk('path',{d:'M88 -54 L104 -54 L104 -38 Q96 -34 88 -38 Z',fill:C.SOFT},f);
    const glow=mk('path',{d:'M88 -54 L104 -54 L104 -38 Q96 -34 88 -38 Z',fill:'#F2A24A',opacity:.35,stroke:'none'},f);
    /* the boiler, its bands, the smokebox and the chimney */
    mk('rect',{x:110,y:-54,width:92,height:32,rx:6,fill:C.GREEN},f);
    [128,152,176].forEach(x=>mk('line',{x1:x,y1:-54,x2:x,y2:-22,stroke:C.BRASS,'stroke-width':2.2},f));
    mk('rect',{x:198,y:-56,width:20,height:36,rx:4,fill:C.IRON},f);
    mk('path',{d:'M203 -56 L204 -76 L201 -82 L217 -82 L214 -76 L215 -56 Z',fill:C.IRON},f);
    mk('rect',{x:200,y:-84,width:18,height:4,fill:C.BRASS},f);
    mk('path',{d:'M142 -54 Q142 -68 152 -68 Q162 -68 162 -54 Z',fill:C.BRASS},f);
    mk('path',{d:'M118 -54 L119 -64 L127 -64 L128 -54 Z',fill:C.BRASS},f);
    mk('circle',{cx:222,cy:-50,r:3.4,fill:C.WARM},f);
    /* the single driver behind its splasher, the carrying wheels, the cylinder and the rod */
    wheels.push(wheel(g,96,-10.5,10.5,8));
    const drv=wheel(g,140,-23,23,14);wheels.push(drv);
    wheels.push(wheel(g,186,-9,9,8));wheels.push(wheel(g,208,-9,9,8));
    mk('path',{d:'M112 -22 Q114 -50 140 -50 Q166 -50 168 -22',fill:'none',stroke:C.BRASS,'stroke-width':4},g);
    mk('path',{d:'M112 -22 Q114 -50 140 -50 Q166 -50 168 -22',fill:'none',stroke:C.INK,'stroke-width':1.4,transform:'translate(0 -2.6)'},g);
    mk('rect',{x:188,y:-24,width:26,height:11,rx:2,fill:C.GREEN,stroke:C.INK,'stroke-width':2.2},g);
    const rod=mk('line',{stroke:C.SOFT,'stroke-width':3.4,'stroke-linecap':'round'},g), rodI=mk('line',{stroke:C.INK,'stroke-width':1,'stroke-linecap':'round'},g);
    const pin=mk('circle',{r:3,fill:C.INK},g);
    const o={g,wheels,chimney:{x:209,y:-86},valve:{x:123,y:-66},glow,dist:0,
      roll(d){o.dist+=d;wheels.forEach(w=>w.rot.setAttribute('transform','rotate('+((o.dist/w.r)*57.2958%360).toFixed(1)+')'));
        const a=o.dist/drv.r, px=140+Math.cos(a)*11, py=-23+Math.sin(a)*11, L=52, cx=px+Math.sqrt(L*L-(py+18.5)*(py+18.5));
        [rod,rodI].forEach(l=>{l.setAttribute('x1',px.toFixed(1));l.setAttribute('y1',py.toFixed(1));l.setAttribute('x2',cx.toFixed(1));l.setAttribute('y2',-18.5);});
        pin.setAttribute('cx',px.toFixed(1));pin.setAttribute('cy',py.toFixed(1));}};
    o.roll(0);return o;
  }

  /* ================= a carriage: four windows, four blinds in the suit colours ================= */
  function carriage(parent,opt){
    opt=opt||{};const g=mk('g',{},parent), wheels=[], body=COACH[(opt.livery||0)%COACH.length];
    const LJ={stroke:C.INK,'stroke-width':2.2,'stroke-linejoin':'round'};
    mk('rect',{x:3,y:-15,width:106,height:5,fill:C.INK},g);
    mk('rect',{x:-2,y:-17,width:5,height:6,fill:C.INK},g);mk('rect',{x:109,y:-17,width:5,height:6,fill:C.INK},g);
    mk('rect',{x:8,y:-10.5,width:96,height:2.4,fill:C.INK},g);
    [22,56,90].forEach(x=>wheels.push(wheel(g,x,-7.5,7.5,8,'#4A453C')));
    const b=mk('g',LJ,g);
    mk('path',{d:'M4 -15 L4 -52 L108 -52 L108 -15 Z',fill:body},b);
    mk('rect',{x:4,y:-50,width:104,height:21,fill:C.CARD,stroke:'none'},b);
    mk('path',{d:'M4 -15 L4 -52 L108 -52 L108 -15 Z',fill:'none'},b);
    mk('path',{d:'M1 -52 Q56 -61 111 -52 L111 -50 L1 -50 Z',fill:C.IRON},b);
    mk('path',{d:'M22 -57.5 L24 -63 L88 -63 L90 -57.5 Z',fill:C.SOFT},b);
    const cl=mk('g',{fill:C.INK,opacity:.55},g);for(let i=0;i<7;i++)mk('rect',{x:29+i*8,y:-61.4,width:5,height:2.4},cl);
    mk('line',{x1:6,y1:-27,x2:106,y2:-27,stroke:C.OCHRE,'stroke-width':1.2,opacity:.9},g);
    const wins=[],blinds=[],lit=[];
    for(let i=0;i<4;i++){const x=9.5+i*24.2;
      mk('rect',{x:x,y:-47.5,width:18.5,height:17,rx:2.5,fill:C.INK},g);
      const L=mk('g',{opacity:0},g);mk('rect',{x:x+1.2,y:-46.3,width:16.1,height:14.6,rx:1.8,fill:C.WARM},L);
      mk('circle',{cx:x+6,cy:-37,r:2.6,fill:C.INK,opacity:.75},L);mk('path',{d:'M'+(x+2.4)+' -31.7 q3.6 -5.4 7.2 0 Z',fill:C.INK,opacity:.75},L);
      if(i%2===0){mk('circle',{cx:x+12.6,cy:-36.4,r:2.3,fill:C.INK,opacity:.75},L);mk('path',{d:'M'+(x+9.4)+' -31.7 q3.2 -4.8 6.4 0 Z',fill:C.INK,opacity:.75},L);}
      lit.push(L);
      const bl=mk('rect',{x:x+1.2,y:-46.3,width:16.1,height:14.6,rx:1.8,fill:SUIT[i]},g);blinds.push(bl);
      const w=mk('rect',{x:x,y:-47.5,width:18.5,height:17,rx:2.5,fill:'none',stroke:C.INK,'stroke-width':1.8},g);wins.push(w);
      if(i<3)mk('line',{x1:x+21.4,y1:-50,x2:x+21.4,y2:-16,stroke:C.INK,'stroke-width':1,opacity:.45},g);
    }
    mk('rect',{x:-4,y:-66,width:120,height:70,fill:'transparent'},g);
    const o={g,wheels,wins,blinds,dist:0,up:0,
      roll(d){o.dist+=d;wheels.forEach(w=>w.rot.setAttribute('transform','rotate('+((o.dist/w.r)*57.2958%360).toFixed(1)+')'));},
      /* k from 0 (blinds down, the card backs) to 1 (up: a lit compartment) */
      raise(k){o.up=k;const h=14.6-(14.6-2.6)*k;blinds.forEach(b=>b.setAttribute('height',h.toFixed(2)));lit.forEach(L=>L.setAttribute('opacity',Math.min(1,k*1.6).toFixed(2)));}};
    return o;
  }

  /* ================= smoke and steam: puffs that rise, drift back and thin out ================= */
  function smoke(parent){
    const g=mk('g',{},parent), live=[];
    return {g,
      puff(x,y,o){o=o||{};const c=mk('circle',{cx:0,cy:0,r:1,fill:o.fill||C.STEAM},g);
        live.push({c,x,y,vx:o.vx||0,vy:o.vy===undefined?-26:o.vy,r:o.r||7,grow:o.grow||16,life:0,max:o.max||2.6,op:o.op||.9});if(live.length>90){live.shift().c.remove();}},
      step(dt,wind){for(let i=live.length-1;i>=0;i--){const p=live[i];p.life+=dt;const k=p.life/p.max;
          if(k>=1){p.c.remove();live.splice(i,1);continue;}
          p.x+=(p.vx+(wind||0))*dt;p.y+=p.vy*dt;p.vy*=(1-dt*.5);p.r+=p.grow*dt;
          p.c.setAttribute('transform','translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+')');p.c.setAttribute('r',p.r.toFixed(1));p.c.setAttribute('opacity',(p.op*(1-k)*(1-k*.3)).toFixed(2));}},
      clear(){live.forEach(p=>p.c.remove());live.length=0;}};
  }
  return {mk,rng,C,SUIT,COACH,LOCO_LEN,CAR_LEN,GAP,PITCH,wheel,loco,carriage,smoke};
})();
