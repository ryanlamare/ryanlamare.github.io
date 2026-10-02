/* ---- Module 4's closing exercise, the room view: a cell block seen from the
   side (Ryan's picture, 18 Sep 2026). Three tiers of ten cells with a railed
   gallery along each, a stairwell at the left end, a yard with a prison bus,
   the outer wall with its gate at the right, a watchtower on top. Every
   dilemma that lands is a pair of prisoners in stripes, chained together,
   who step off the bus, cross the yard, climb the stairwell, walk the gallery
   to the next empty cell and are locked in; pairs queue and set off one after
   another, as the ships did. A fourth tier appears above thirty.

   A click on a cell hands its number to the deck, which opens it large. In
   the walk on the second slide, once a cell's escape has played large, the
   deck asks the block to break the pair out: a tunnel comes up through the
   ground outside the wall and they run off; the warden's door opens and they
   walk down the stairs and out through the gate; two bars part and they go
   down a rope from the gallery and run for the gate; or they stay put and
   the cell lamp comes on. What is still lit at the end is the room's stuck
   dilemmas.

   Every SVG node is made with createElementNS and moved by its transform
   attribute (no innerHTML on SVG, no CSS transforms on SVG), the sea chart's
   rule. Expects M4_CELL for the prisoner. ---- */
(function(){
  const NS='http://www.w3.org/2000/svg';
  const INK='#1B1C19', PAPER='#E9E2D2', SOFT='#F0EAD9', CARD='#DFD6C2', RULE='#CDBFA6', TAN='#D9C5AD', STONE='#C9B48F', DARK='#2A2825', MORTAR='#3B3833', FLOORC='#3E3630', BAR='#D9C5AD', OCHRE='#C9A227', SIENNA='#8E3E28', EARTH='#5B4636', HOLE='#0E0D0C', MUTED='#6A5F59';
  const G=640;                                   /* the yard floor */
  const STAIRX=100, BUSDOOR=318, GATE=1215, OUT=1330, TUNNEL=1246;
  const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  /* the block's shape follows how many cells it needs: in pairs (18 Sep) a room is fifteen dilemmas and the
     model, so two tiers of eight big cells; a fuller room gets a third tier, then narrower cells, then more tiers */
  function layout(n){
    let T,COLS,TIERH,CELLH;
    if(n<=16){T=2;COLS=8;TIERH=165;CELLH=146;}
    else if(n<=24){T=3;COLS=8;TIERH=110;CELLH=96;}
    else if(n<=30){T=3;COLS=10;TIERH=110;CELLH=96;}
    else{COLS=10;T=Math.min(5,Math.ceil(n/10));TIERH=110;CELLH=96;}
    const PITCH=1034/COLS, CELLW=PITCH-9, S=CELLH/96, PS=.36*S;
    return {T,COLS,TIERH,CELLH,PITCH,CELLW,S,PS,X0:150,floorY:k=>G-90-k*TIERH};
  }

  window.M4_BLOCK=function(svg,opts){
    opts=opts||{};
    const S=window.M4_CELL;
    function mk(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);(parent||svg).appendChild(e);return e;}
    const slide=svg.closest('.slide');
    const isActive=()=>!slide||slide.classList.contains('active');
    let LY=null, layers={}, cells=[], pairs=new Map(), queue=[], lastStart=0, list=[], onClickFn=null, loop=null, tweens=[];

    /* ================= the scene ================= */
    function buildScene(){
      while(svg.firstChild)svg.removeChild(svg.firstChild);
      cells=[];
      const {T,COLS,CELLH,PITCH,CELLW,S,X0,floorY}=LY;
      const top=floorY(T-1)-CELLH-26;
      mk('rect',{x:0,y:0,width:1280,height:720,fill:SOFT});
      mk('rect',{x:0,y:G,width:1280,height:32,fill:RULE});
      mk('path',{d:'M0 '+G+' H1280',stroke:INK,'stroke-width':2});
      /* the block */
      mk('rect',{x:136,y:top,width:1048,height:G-top,fill:TAN,stroke:INK,'stroke-width':2.5});
      mk('rect',{x:128,y:top-10,width:1064,height:12,fill:STONE,stroke:INK,'stroke-width':2});
      /* the stairwell */
      mk('rect',{x:66,y:top+20,width:66,height:G-top-20,fill:CARD,stroke:INK,'stroke-width':2.5});
      for(let k=0;k<T;k++){const fy=floorY(k);mk('path',{d:'M66 '+fy+' H132',stroke:INK,'stroke-width':1.5});
        for(let st=0;st<8;st++){const y=fy+18*st+18;if(y<G&&(k===0||y<floorY(k-1)-8))mk('path',{d:'M'+(74+(st%6)*8)+' '+y+' h14',stroke:INK,'stroke-width':1.5,opacity:.6});}}
      mk('path',{d:'M66 '+(top+20)+' h66',stroke:INK,'stroke-width':1.5});
      /* the cells, tier by tier */
      layers.back=mk('g',{});
      for(let k=0;k<T;k++){
        const fy=floorY(k), ty=fy-CELLH;
        for(let c=0;c<COLS;c++){
          const i=k*COLS+c, x0=X0+c*PITCH, g=mk('g',{'data-k':i+1,class:'cell'},layers.back);
          mk('rect',{x:x0,y:ty,width:CELLW,height:CELLH,fill:DARK},g);
          const h3=CELLH/3;
          mk('path',{d:'M'+x0+' '+(ty+h3)+' h'+CELLW+' M'+x0+' '+(ty+2*h3)+' h'+CELLW+' M'+(x0+CELLW*.32)+' '+ty+' v'+h3+' M'+(x0+CELLW*.68)+' '+(ty+h3)+' v'+h3+' M'+(x0+CELLW*.43)+' '+(ty+2*h3)+' v'+h3,stroke:MORTAR,'stroke-width':1.2},g);
          mk('rect',{x:x0,y:fy-8,width:CELLW,height:8,fill:FLOORC},g);
          const wx=x0+CELLW-26*S, wy=ty+10*S, ww=18*S, wh=13*S;
          mk('rect',{x:wx,y:wy,width:ww,height:wh,fill:BAR,opacity:.28},g);
          mk('path',{d:'M'+(wx+ww/3)+' '+wy+' v'+wh+' M'+(wx+2*ww/3)+' '+wy+' v'+wh,stroke:DARK,'stroke-width':1.5*S},g);
          const lamp=mk('rect',{x:wx,y:wy,width:ww,height:wh,fill:OCHRE,opacity:0},g);
          const num=mk('text',{x:x0+8*S,y:ty+20*S,'font-family':'Jost,sans-serif','font-weight':'700','font-size':String(12*S),'letter-spacing':'1','fill':BAR,opacity:.85},g);
          num.textContent=i===0?'M':String(i);
          const hole=mk('ellipse',{cx:x0+CELLW/2,cy:fy-4,rx:0,ry:0,fill:HOLE},g);
          cells.push({i,k,x0,cx:x0+CELLW/2,fy,ty,g,num,lamp,hole,state:'empty'});
        }
        /* the gallery slab and its railing, in front of the cells and behind the walkers */
        mk('rect',{x:130,y:fy,width:1054,height:8,fill:STONE,stroke:INK,'stroke-width':1.5},layers.back);
        if(k>0){mk('path',{d:'M130 '+(fy-26)+' H1184',stroke:INK,'stroke-width':1.6},layers.back);
          for(let c=0;c<=COLS;c++)mk('path',{d:'M'+(X0-6+c*PITCH)+' '+(fy-26)+' v26',stroke:INK,'stroke-width':1.2,opacity:.7},layers.back);}
      }
      /* the bus, in the yard */
      const bus=mk('g',{},layers.back);
      mk('rect',{x:296,y:570,width:250,height:60,rx:8,fill:OCHRE,stroke:INK,'stroke-width':2.5},bus);
      mk('rect',{x:296,y:598,width:250,height:5,fill:INK},bus);
      for(let w=0;w<5;w++){mk('rect',{x:352+w*38,y:580,width:28,height:16,fill:PAPER,stroke:INK,'stroke-width':1.5},bus);mk('path',{d:'M'+(361+w*38)+' 580 v16 M'+(371+w*38)+' 580 v16',stroke:INK,'stroke-width':1.2},bus);}
      mk('rect',{x:304,y:578,width:30,height:44,rx:3,fill:DARK,stroke:INK,'stroke-width':1.5},bus);
      mk('circle',{cx:336,cy:632,r:11,fill:INK},bus);mk('circle',{cx:506,cy:632,r:11,fill:INK},bus);
      mk('circle',{cx:336,cy:632,r:4,fill:PAPER},bus);mk('circle',{cx:506,cy:632,r:4,fill:PAPER},bus);
      /* the outer wall and its gate */
      mk('rect',{x:1184,y:top-30,width:22,height:G-top+30,fill:STONE,stroke:INK,'stroke-width':2.5},layers.back);
      mk('rect',{x:1184,y:588,width:22,height:52,fill:SOFT},layers.back);
      mk('path',{d:'M1184 588 h22 M1184 640 h22',stroke:INK,'stroke-width':2.5},layers.back);
      mk('path',{d:'M1206 590 l30 -14 v52 l-30 12 Z',fill:CARD,stroke:INK,'stroke-width':2},layers.back);
      mk('path',{d:'M1212 594 v34 M1220 591 v36 M1228 588 v38',stroke:INK,'stroke-width':1.5},layers.back);
      /* the watchtower, on the stairwell roof */
      const tw=mk('g',{},layers.back);
      mk('rect',{x:70,y:top-28,width:58,height:48,fill:CARD,stroke:INK,'stroke-width':2.5},tw);
      mk('rect',{x:80,y:top-18,width:38,height:20,fill:DARK},tw);
      mk('path',{d:'M64 '+(top-28)+' L99 '+(top-54)+' L134 '+(top-28)+' Z',fill:INK},tw);
      /* the layers the prisoners live in: inside a cell (behind the door), the doors, out on the gallery or in the yard */
      layers.inside=mk('g',{});layers.doors=mk('g',{});layers.outside=mk('g',{});
      cells.forEach(c=>{
        const d=mk('g',{class:'door','data-k':c.i+1},layers.doors), step=(CELLW-12)/4, bw=3.5*Math.min(S,1.4);
        c.bars=[];for(let b=0;b<5;b++)c.bars.push(mk('path',{d:'M'+(c.x0+6+b*step)+' '+(c.ty)+' V'+c.fy,stroke:BAR,'stroke-width':bw,'stroke-linecap':'round'},d));
        mk('path',{d:'M'+(c.x0+6)+' '+(c.ty+12*S)+' H'+(c.x0+CELLW-6)+' M'+(c.x0+6)+' '+(c.fy-12*S)+' H'+(c.x0+CELLW-6),stroke:BAR,'stroke-width':bw,'stroke-linecap':'round'},d);
        mk('circle',{cx:c.x0+CELLW-10,cy:c.ty+CELLH/2,r:4*S,fill:BAR},d);
        c.door=d;setDoor(c,1);
      });
    }
    svg.addEventListener('click',e=>{const t=e.target.closest('[data-k]');if(t&&onClickFn)onClickFn(+t.getAttribute('data-k'));});
    /* open: the door swung back on its hinge, seen edge-on (0 shut, 1 open) */
    function setDoor(c,open){const hx=c.x0+4, sx=1-(1-.1)*open;c.door.setAttribute('transform','translate('+hx+',0) scale('+sx.toFixed(3)+',1) translate('+(-hx)+',0)');c.open=open;}

    /* ================= the prisoners ================= */
    function makePair(){
      const g=mk('g',{class:'pair'},layers.outside), PS=LY.PS, w=80*PS, h=128*PS;
      const a=mk('g',{transform:'translate('+(-w-3).toFixed(1)+','+(-h).toFixed(1)+') scale('+PS.toFixed(3)+')'},g);S.prisonerNodes(a);
      const b=mk('g',{transform:'translate(3,'+(-h).toFixed(1)+') scale('+PS.toFixed(3)+')'},g);S.prisonerNodes(b);
      const ch=mk('g',{transform:'scale('+(PS/.36).toFixed(3)+')'},g);
      mk('path',{d:'M-9 -24 q5 4 10 0',stroke:INK,'stroke-width':2,fill:'none','stroke-dasharray':'2 2'},ch);
      return {g,x:0,y:0,sy:1,face:1,bob:0};
    }
    function place(p,x,y){p.x=x;p.y=y;p.g.setAttribute('transform','translate('+x.toFixed(1)+','+(y-p.bob).toFixed(1)+') scale('+p.face+','+p.sy.toFixed(3)+')');}
    /* a walk along waypoints at a speed, with a bob to the step; resolves when there */
    function walk(p,pts,speed){
      return new Promise(res=>{
        let i=0, t0=null;
        const seg=()=>{if(i>=pts.length){p.bob=0;place(p,p.x,p.y);res();return null;}
          const [x1,y1]=pts[i++], dx=x1-p.x, dy=y1-p.y, d=Math.hypot(dx,dy), ms=d/speed*1000;
          if(dx)p.face=dx<0?-1:1;
          return {x0:p.x,y0:p.y,x1,y1,ms,start:null};};
        let cur=seg();
        tweens.push({step(now){
          if(!cur)return true;
          if(cur.start===null)cur.start=now;
          const f=Math.min(1,(now-cur.start)/Math.max(1,cur.ms));
          p.bob=Math.abs(Math.sin(now/80))*1.6;
          place(p,cur.x0+(cur.x1-cur.x0)*f,cur.y0+(cur.y1-cur.y0)*f);
          if(f>=1){cur=seg();if(!cur)return true;}
          return false;}});
      });
    }
    function tween(ms,fn){return new Promise(res=>{let s=null;tweens.push({step(now){if(s===null)s=now;const f=Math.min(1,(now-s)/ms);fn(ease(f));if(f>=1){res();return true;}return false;}});});}
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    function tick(now){tweens=tweens.filter(t=>!t.step(now));
      /* the queue: one pair sets off every 700 ms, once the slide is showing */
      if(queue.length&&isActive()&&now-lastStart>700){lastStart=now;const q=queue.shift();q.p.g.removeAttribute('visibility');arrive(q.p,q.c);}
      loop=requestAnimationFrame(tick);}
    loop=requestAnimationFrame(tick);

    /* off the bus, across the yard, up the stairwell, along the gallery, into the cell */
    async function arrive(p,c){
      place(p,BUSDOOR,G);
      await walk(p,[[STAIRX,G],[STAIRX,c.fy],[c.cx,c.fy]],230);
      enter(p,c);
      await tween(320,f=>setDoor(c,1-f));
    }
    function enter(p,c){layers.inside.appendChild(p.g);p.g.setAttribute('data-k',c.i+1);p.face=1;place(p,c.cx,c.fy-2);c.state='in';}

    /* ================= what the deck asks ================= */
    function setList(L){
      list=L;
      const need=layout(L.length);
      /* someone left the list (a Poll Desk reset, or the demo giving way to the room): the block is rebuilt and everyone still on it goes straight back in */
      const gone=[...pairs.keys()].some(vv=>!L.some(g=>g.v===vv));
      if(!LY||need.T!==LY.T||need.COLS!==LY.COLS||!cells.length||gone){LY=need;const had=gone?new Map():new Map(pairs);pairs=new Map();queue=[];buildScene();
        /* a rebuild (a fourth tier arriving): everyone already here is put straight back in their cell */
        L.forEach((g,i)=>{if(i>=cells.length)return;if(had.has(g.v)||g.model||opts.instant){const p=makePair();pairs.set(g.v,p);enter(p,cells[i]);setDoor(cells[i],0);}});
      }
      L.forEach((g,i)=>{
        if(pairs.has(g.v)||i>=cells.length)return;
        const p=makePair();pairs.set(g.v,p);const c=cells[i];
        if(g.model||opts.instant){enter(p,c);setDoor(c,0);}
        else{place(p,BUSDOOR,G);p.g.setAttribute('visibility','hidden');queue.push({p,c});}
      });
    }

    /* the break-out, after the cell's escape has played large; resolves when the pair is clear of the block (or has settled) */
    async function breakout(k,route){
      const c=cells[k-1], g=list[k-1];if(!c||!g)return;
      const p=pairs.get(g.v);if(!p||c.state!=='in')return;
      if(route==='n'){c.state='in';await tween(500,f=>c.lamp.setAttribute('opacity',(f*.95).toFixed(2)));return;}
      if(route==='m'){ /* out by agreement, and marched back in */
        await tween(300,f=>setDoor(c,f));layers.outside.appendChild(p.g);place(p,c.cx,c.fy);
        await walk(p,[[c.cx-LY.CELLW*.75,c.fy]],160);await wait(500);await walk(p,[[c.cx,c.fy]],160);
        enter(p,c);await tween(300,f=>setDoor(c,1-f));return;
      }
      c.state='out';
      if(route==='r'){ /* down through the floor, up outside the wall, and away */
        await tween(600,f=>{c.hole.setAttribute('rx',(LY.CELLW*.32*f).toFixed(1));c.hole.setAttribute('ry',(5*LY.S*f).toFixed(1));});
        await tween(500,f=>{p.sy=1-f;place(p,p.x,p.y);});
        const hole=mk('ellipse',{cx:TUNNEL,cy:G,rx:0,ry:0,fill:HOLE},layers.outside);
        await tween(400,f=>{hole.setAttribute('rx',(30*f).toFixed(1));hole.setAttribute('ry',(6*f).toFixed(1));});
        layers.outside.appendChild(p.g);p.face=1;place(p,TUNNEL,G);
        await tween(500,f=>{p.sy=f;place(p,TUNNEL,G);});
        await walk(p,[[OUT,G]],420);p.g.remove();return;
      }
      if(route==='e'){ /* the warden's door, the stairs, the gate */
        await tween(320,f=>setDoor(c,f));layers.outside.appendChild(p.g);place(p,c.cx,c.fy);
        await walk(p,[[STAIRX,c.fy],[STAIRX,G],[GATE,G],[OUT,G]],640);p.g.remove();return;
      }
      if(route==='p'){ /* two bars part, a rope from the railing, the yard, the gate */
        c.bars[2].setAttribute('opacity','0');c.bars[3].setAttribute('opacity','0');
        layers.outside.appendChild(p.g);place(p,c.cx,c.fy);
        const rx=c.cx+LY.CELLW*.36;
        const rope=mk('path',{d:'M'+rx+' '+(c.fy-26)+' V'+(c.fy-26),stroke:SIENNA,'stroke-width':2.5,'stroke-dasharray':'4 3'},layers.outside);
        await tween(350,f=>rope.setAttribute('d','M'+rx+' '+(c.fy-26)+' V'+(c.fy-26+(G-c.fy+26)*f)));
        await walk(p,[[rx,c.fy]],200);
        await tween(700,f=>place(p,rx,c.fy+(G-c.fy)*f));
        await walk(p,[[GATE,G],[OUT,G]],640);p.g.remove();return;
      }
    }
    /* a cell the room already saw break out (a reload): empty, door as they left it */
    function restore(k,route){const c=cells[k-1], g=list[k-1];if(!c||!g)return;const p=pairs.get(g.v);
      if(route==='n'){c.lamp.setAttribute('opacity','.95');return;}
      if(route==='m')return;
      if(p){p.g.remove();}c.state='out';
      if(route==='r'){c.hole.setAttribute('rx',String(LY.CELLW*.32));c.hole.setAttribute('ry',String(5*LY.S));}
      if(route==='e')setDoor(c,1);
      if(route==='p'){c.bars[2].setAttribute('opacity','0');c.bars[3].setAttribute('opacity','0');}
    }
    /* the debrief: the cells that emptied fade, what is still lit is the room's stuck dilemmas */
    function stuck(on){cells.forEach(c=>{const dim=on&&c.state==='out';c.g.setAttribute('opacity',dim?'.3':'1');c.door.setAttribute('opacity',dim?'.3':'1');});}
    /* the open cell's number grows; a cell that has been opened keeps its number red, as the jet's shades stay up */
    function hot(k,seen){cells.forEach(c=>{const h=k===c.i+1, was=seen&&seen.has(c.i+1);c.num.setAttribute('fill',(h||was)?'#CE1E32':BAR);c.num.setAttribute('font-size',String((h?15:12)*LY.S));});}
    const api={setList,breakout,restore,stuck,hot,onClick(fn){onClickFn=fn;},cellCount:()=>cells.length,_debug:()=>({tweens:tweens.length,queue:queue.length,pairs:[...pairs.values()].map(p=>[Math.round(p.x),Math.round(p.y),p.g.parentNode===layers.outside?'out':p.g.parentNode===layers.inside?'in':'gone'])})};
    (window.M4_BLOCKS=window.M4_BLOCKS||[]).push(api);
    return api;
  };
})();
