/* ---- The end of the line (Ryan's idea, 18 Sep 2026: the train that left a
   Victorian terminus in Module 1 pulls into the final station, and the
   awards are given out there). The same London station a century and a half
   on: the old yellow-brick range with its arched windows, and over it the
   white lattice roof that rises from one trunk and fans out across the
   concourse. Wordless scenery, as on the journey.

   Two slides use it. On the awards slide the train arrives as the slide
   opens: the Module 1 locomotive with one carriage per hand the room sent
   in (room m1-hands; eight if it cannot be read), every blind up and every
   compartment lit, slowing to the buffers with a last breath of steam while
   the pigeons on the near platform scatter. The awards are the departures
   board hanging from the roof: a row is blank until its press, then its
   letters flap round to the award and the name. On the podium slide the
   train is already standing; gold brings confetti and the whistle.

   A click on the station clock runs the arrival again (for a rehearsal).
   Every node is made with createElementNS and moved by its transform
   attribute. Expects POLL_API and GT_RAIL (rail.js). ---- */
(function(){
  if(!window.GT_RAIL)return;
  const R=GT_RAIL, C=R.C, rng=R.rng, INK=C.INK,PAPER=C.PAPER,SOFT=C.SOFT,CARD=C.CARD,RED=C.RED,OCHRE=C.OCHRE,TEAL=C.TEAL,TERRA=C.TERRA,IRON=C.IRON,WARM=C.WARM;
  const BRICK='#D8C08A',BRICKD='#BFA56E',ROOF='#E2DDEC',LATT='#FBF8F0',GLASS='#46505E',STONE='#D8D2C4',STONED='#C4BDAC';
  const RAIL=634, FRONT=1212, TX=1010;
  let hands=8;
  const ready=fetch(POLL_API+'/p/m1-hands/entries').then(r=>r.json()).then(d=>{const by=new Set();(d.entries||[]).forEach(e=>{if(/^[1-4]‖/.test(String(e.t||'')))by.add(e.v);});if(by.size)hands=Math.min(15,by.size);}).catch(()=>{});

  function build(svg,opt){
    const slide=svg.closest('.slide'), mk=(t,a,p)=>R.mk(t,a,p||svg);
    const P=(d,fill,par,o)=>mk('path',Object.assign({d,fill},o||{}),par), Rr=(x,y,w,h,fill,par,o)=>mk('rect',Object.assign({x,y,width:w,height:h,fill},o||{}),par),
          Ci=(cx,cy,r,fill,par,o)=>mk('circle',Object.assign({cx,cy,r,fill},o||{}),par), Li=(x1,y1,x2,y2,par,o)=>mk('line',Object.assign({x1,y1,x2,y2},o||{}),par);
    const OUT={stroke:INK,'stroke-width':2.4,'stroke-linejoin':'round'};
    /* the old range: brick, a cornice, tall arched windows, some of them lit */
    Rr(0,0,1280,720,BRICK);
    const br=mk('g',{stroke:BRICKD,'stroke-width':1.4,opacity:.55});for(let y=70;y<560;y+=26)Li(0,y,1280,y,br);
    Rr(0,286,1280,12,BRICKD,null,{stroke:INK,'stroke-width':1.6});
    const wins=[];for(let i=0;i<11;i++){const x=34+i*118;P('M'+x+' 548 L'+x+' 372 A32 32 0 0 1 '+(x+64)+' 372 L'+(x+64)+' 548 Z',BRICKD,null,OUT);
      wins.push(P('M'+(x+8)+' 548 L'+(x+8)+' 374 A24 24 0 0 1 '+(x+56)+' 374 L'+(x+56)+' 548 Z',(i*7)%3===0?WARM:GLASS));Li(x+32,350,x+32,548,null,{stroke:BRICKD,'stroke-width':3});Li(x+8,440,x+56,440,null,{stroke:BRICKD,'stroke-width':3});}
    for(let i=0;i<11;i++){const x=46+i*118;Rr(x,190,40,70,(i*5)%4===0?WARM:GLASS,null,OUT);}
    /* the lattice roof: one trunk, fanning out over everything */
    const pt=(u,v)=>{v=Math.max(0,v);return [TX+u*(30+1240*Math.pow(v,1.55)),566-36-500*Math.pow(v,.6)];};
    (function(){let d='';for(let v=0;v<=1.001;v+=.05){const p=pt(-1.25,v);d+=(d?' L':'M')+p[0].toFixed(0)+' '+p[1].toFixed(0);}d+=' L-40 -10 L1320 -10';for(let v=1;v>=-.001;v-=.05){const p=pt(1.25,v);d+=' L'+p[0].toFixed(0)+' '+p[1].toFixed(0);}
      P(d+' Z',ROOF);P(d+' Z','#B9A9E0',null,{opacity:.18});
      const g=mk('g',{fill:'none',stroke:LATT,'stroke-width':3.2,'stroke-linecap':'round'});
      for(let k=-1;k<=1;k+=2)for(let u0=-2.5;u0<=2.5;u0+=.25){let s='';for(let v=0;v<=1.001;v+=.04){const u=u0+k*1.25*v;if(Math.abs(u)>1.25){if(s){P(s,null,g);s='';}continue;}const p=pt(u,v);s+=(s?' L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);}if(s)P(s,null,g);}
      const e=mk('g',{fill:'none',stroke:INK,'stroke-width':2.2,opacity:.8});[-1.25,1.25].forEach(u=>{let s='';for(let v=0;v<=1.001;v+=.04){const p=pt(u,v);s+=(s?' L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);}P(s,null,e);});
      P('M'+(TX-30)+' 566 L'+(TX-22)+' 520 L'+(TX+22)+' 520 L'+(TX+30)+' 566 Z',LATT,null,OUT);})();
    /* the concourse floor and the far platform */
    Rr(0,548,1280,40,STONE);Li(0,548,1280,548,null,{stroke:INK,'stroke-width':2});
    Rr(0,RAIL-52,1280,52,STONED);Rr(0,RAIL-52,1280,5,'#F2D24A');Li(0,RAIL-52,1280,RAIL-52,null,{stroke:INK,'stroke-width':1.6});
    /* a trolley gone half way into the wall */
    (function(){const g=mk('g',Object.assign({transform:'translate(236 548)'},OUT));Li(0,-44,0,-8,g);Li(0,-44,26,-44,g);Li(0,-8,30,-8,g);Rr(2,-38,24,14,'#7A4A2A',g);Rr(4,-24,22,16,'#9A6B3A',g);Ci(8,-3,4,INK,g);Rr(26,-56,8,56,BRICK,g,{stroke:'none'});})();
    /* the hanging clock: the real time */
    const clk=mk('g',{transform:'translate(1150 250)',style:'cursor:pointer'});Li(0,-90,0,-34,clk,{stroke:INK,'stroke-width':3});Ci(0,0,35,INK,clk);Ci(0,0,30,CARD,clk);
    const hm=mk('g',{stroke:INK,'stroke-linecap':'round'},clk);for(let i=0;i<12;i++){const a=i*Math.PI/6;Li(Math.sin(a)*23,-Math.cos(a)*23,Math.sin(a)*27,-Math.cos(a)*27,hm,{'stroke-width':2});}
    const cH=Li(0,0,0,-15,hm,{'stroke-width':4}), cM=Li(0,0,0,-23,hm,{'stroke-width':2.6}), cS=Li(0,4,0,-25,hm,{'stroke-width':1.2,stroke:RED});Ci(0,0,2.6,RED,clk);
    /* people on the far platform: cases, backpacks, a coffee, a phone */
    const people=[], r=rng(29), COATS=['#2B3A55','#6B2D3E','#35584A',TEAL,TERRA,OCHRE,'#4A453C','#7A4E8A'], SKIN=['#E9C9A8','#C99A6B','#8A5A3A','#F0D5B8'];
    function person(x,i){const p=mk('g',{}), c=COATS[i%COATS.length], kind=i%4;
      Rr(-5.5,-9,4.6,18,INK,p);Rr(.9,-9,4.6,18,INK,p);Rr(-8,-36,16,29,c,p,{rx:5,stroke:INK,'stroke-width':1.8});Ci(0,-44,6.4,SKIN[i%SKIN.length],p,{stroke:INK,'stroke-width':1.6});P('M-6.4 -45 Q-5 -53 1 -52 Q7 -51 6.4 -44 Q2 -48 -6.4 -45 Z',INK,p);
      if(kind===0){Rr(12,-16,15,24,RED,p,{rx:2,stroke:INK,'stroke-width':1.8});Li(19.5,-16,19.5,-30,p,{stroke:INK,'stroke-width':2});Li(15,-30,24,-30,p,{stroke:INK,'stroke-width':2});}
      else if(kind===1){Rr(-14,-35,8,20,OCHRE,p,{rx:3,stroke:INK,'stroke-width':1.6});}
      else if(kind===2){Rr(8,-27,6,9,CARD,p,{stroke:INK,'stroke-width':1.4});}
      else{Rr(7,-30,4,8,INK,p);}
      people.push({g:p,x,y:RAIL-58,ph:r()*6,arm:null});return p;}
    (opt.people||[70,150,290,356,470,610,690,820,905,1090]).forEach((x,i)=>person(x,i));
    /* the line, the buffers, the near platform */
    Rr(0,RAIL-2,1280,30,'#8E887A');const sl=mk('g',{fill:'#5A5144'});for(let x=6;x<1280;x+=26)Rr(x,RAIL+3,12,6,null,sl);Rr(0,RAIL,1280,3.4,IRON);
    (function(){const g=mk('g',OUT);Rr(1236,RAIL-30,12,30,IRON,g);Rr(1226,RAIL-34,30,10,RED,g);Li(1248,RAIL,1272,RAIL-26,g,{'stroke-width':4});})();
    const trainG=mk('g',{}), smoke=R.smoke(svg);
    Rr(0,RAIL+28,1280,720-RAIL-28,STONE);Rr(0,RAIL+28,1280,6,'#F2D24A');Li(0,RAIL+28,1280,RAIL+28,null,{stroke:INK,'stroke-width':2});
    const tac=mk('g',{fill:STONED});for(let x=8;x<1280;x+=16)Ci(x,RAIL+44,2.6,null,tac);
    /* pigeons on the near platform */
    const birds=[];for(let i=0;i<7;i++){const g=mk('g',{});mk('ellipse',{cx:0,cy:-6,rx:9,ry:6,fill:'#8C8E96',stroke:INK,'stroke-width':1.5},g);Ci(8,-12,4.2,'#6E7079',g,{stroke:INK,'stroke-width':1.4});P('M12 -12 l5 1.5 l-5 1.5 Z',OCHRE,g);P('M-8 -7 l-9 -3 l3 6 Z','#6E7079',g,{stroke:INK,'stroke-width':1.2});
      const wing=P('M-4 -8 Q2 -22 10 -8 Z','#A9ABB3',g,{stroke:INK,'stroke-width':1.3,opacity:0});birds.push({g,wing,hx:160+i*150+r()*60,hy:RAIL+52+r()*8,x:0,y:0,ph:r()*6,fly:0,face:r()<.5?1:-1});}
    const confG=mk('g',{}), conf=[];

    /* the train: the Module 1 locomotive and the room's carriages, blinds up */
    const loco=R.loco(trainG);loco.g.setAttribute('transform','translate('+(-R.LOCO_LEN)+' 0)');
    let cars=[], s=1, off=0, vel=0, mode='idle', t0=0, from=0, chuff=0, lazy=0, hiss=0, whistle=0;
    function makeTrain(){cars.forEach(c=>c.g.remove());cars=[];for(let i=0;i<hands;i++){const c=R.carriage(trainG,{livery:i});c.raise(1);c.g.setAttribute('transform','translate('+(-R.LOCO_LEN-(i+1)*R.PITCH)+' 0)');cars.push(c);}
      s=Math.min(1,1170/(R.LOCO_LEN+hands*R.PITCH+10));}
    const len=()=>(R.LOCO_LEN+hands*R.PITCH)*s;
    function arrive(){makeTrain();off=-(FRONT+60);from=off;mode='arriving';t0=performance.now();birds.forEach(b=>{b.fly=0;});wake();}
    function stand(){makeTrain();off=0;mode='standing';wake();}
    clk.addEventListener('click',arrive);

    let raf=0,lastT=0,started=false;
    function wake(){if(!raf)raf=requestAnimationFrame(frame);}
    function frame(now){
      raf=0;if(!slide.classList.contains('active')){lastT=0;return;}
      const dt=lastT?Math.min(.05,(now-lastT)/1000):0;lastT=now;let moved=0;
      if(mode==='arriving'){const D=9000,k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,2.6),o=from*(1-e);moved=o-off;off=o;
        if(k>.2)birds.forEach(b=>{if(!b.fly&&FRONT+off>b.hx-260)b.fly=now;});
        if(k>=1){mode='standing';hiss=now;}}
      vel=dt?moved/dt:0;
      if(moved){loco.roll(moved/s);cars.forEach(c=>c.roll(moved/s));}
      trainG.setAttribute('transform','translate('+(FRONT+off).toFixed(1)+' '+RAIL+') scale('+s.toFixed(3)+')');
      const cx=FRONT+off+(loco.chimney.x-R.LOCO_LEN)*s, cy=RAIL+loco.chimney.y*s;
      if(mode!=='idle'){if(vel>20){const q=Math.floor(loco.dist/23/(Math.PI/2));if(q!==chuff){chuff=q;smoke.puff(cx,cy,{r:6*s+2,grow:22,vy:-44,vx:-vel*.1,max:2.2});}}
        else if(now-lazy>900){lazy=now;smoke.puff(cx,cy,{r:5*s+1,grow:9,vy:-22,vx:5,max:3});}
        if(hiss&&now-hiss<1600&&(now%90)<34)smoke.puff(FRONT+off-(36+Math.random()*30)*s,RAIL-10*s,{r:4,grow:30,vy:-16,vx:-60+Math.random()*150,max:1.5,op:.8});
        if(whistle&&now-whistle<1100)smoke.puff(FRONT+off+(loco.valve.x-R.LOCO_LEN)*s,RAIL+loco.valve.y*s,{r:2.5,grow:22,vy:-90,vx:-8,max:.7});}
      smoke.step(dt,-vel*.5);loco.glow.setAttribute('opacity',(.3+.2*Math.sin(now/130)).toFixed(2));
      const d=new Date(),sec=d.getSeconds(),m=d.getMinutes()+sec/60,h=(d.getHours()%12)+m/60;cS.setAttribute('transform','rotate('+sec*6+')');cM.setAttribute('transform','rotate('+(m*6).toFixed(1)+')');cH.setAttribute('transform','rotate('+(h*30).toFixed(1)+')');
      people.forEach((p,i)=>p.g.setAttribute('transform','translate('+(p.x+(i%3===0?Math.sin(now/2600+p.ph)*12:0)).toFixed(1)+' '+(p.y+Math.sin(now/620+p.ph)*.8).toFixed(1)+')'));
      birds.forEach(b=>{if(b.fly){const k=(now-b.fly)/1000;if(k>9){b.fly=0;}
          const out=Math.min(k,2.4),back=Math.max(0,k-6.4)/2.6,q=back?1-back:Math.min(1,out/2.4),x=b.hx-b.face*-1*q*(260+b.ph*30),y=b.hy-Math.sin(q*Math.PI*.5)*(330+b.ph*26);
          b.wing.setAttribute('opacity',q>.02?1:0);b.wing.setAttribute('transform','scale(1 '+(Math.sin(now/55+b.ph)>0?1:-.6)+')');b.g.setAttribute('transform','translate('+x.toFixed(1)+' '+y.toFixed(1)+') scale('+b.face+' 1)');}
        else{const peck=Math.max(0,Math.sin(now/420+b.ph*3))>.8?14:0, hop=Math.sin(now/3100+b.ph)*22;b.wing.setAttribute('opacity',0);b.g.setAttribute('transform','translate('+(b.hx+hop).toFixed(1)+' '+b.hy.toFixed(1)+') scale('+b.face+' 1) rotate('+peck+')');}});
      for(let i=conf.length-1;i>=0;i--){const c=conf[i];c.t+=dt;c.vy+=260*dt;c.x+=c.vx*dt+Math.sin(c.t*5+c.ph)*.8;c.y+=Math.min(c.vy,150)*dt;if(c.y>RAIL+40||c.t>9){c.e.remove();conf.splice(i,1);continue;}
        c.e.setAttribute('transform','translate('+c.x.toFixed(1)+' '+c.y.toFixed(1)+') rotate('+((c.t*c.sp*200)%360).toFixed(0)+') scale(1 '+Math.cos(c.t*c.sp*6).toFixed(2)+')');}
      wins.forEach((w,i)=>{if((i*7)%3===0)w.setAttribute('opacity',(.85+.15*Math.sin(now/900+i)).toFixed(2));});
      wake();
    }
    function burst(){whistle=performance.now();const COL=[RED,OCHRE,TEAL,TERRA,CARD,'#26713D'];for(let i=0;i<150;i++){const e=Rr(-4,-2.5,8,5,COL[i%COL.length],confG,{stroke:INK,'stroke-width':.8});
        conf.push({e,x:640+(Math.random()-.5)*700,y:-20-Math.random()*260,vx:(Math.random()-.5)*60,vy:20+Math.random()*60,t:0,ph:Math.random()*6,sp:.5+Math.random()});}birds.forEach(b=>{if(!b.fly)b.fly=performance.now();});wake();}
    new MutationObserver(()=>{if(!slide.classList.contains('active'))return;if(!started){started=true;ready.then(()=>opt.arrive?arrive():stand());}wake();}).observe(slide,{attributes:true,attributeFilter:['class']});
    if(slide.classList.contains('active')){started=true;ready.then(()=>opt.arrive?arrive():stand());}
    return {arrive,burst};
  }

  const a=document.getElementById('termA'), b=document.getElementById('termB');
  if(a)build(a,{arrive:true});
  const pod=b?build(b,{arrive:false,people:[40,92,150,196,1086,1132,1180,1236]}):null;   /* the crowd stands clear of the podium */
  window.podiumGold=function(el,on){if(on&&pod)pod.burst();};

  /* the departures board: a row's letters flap round to what it says */
  const GLYPH='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function flap(el,delay){if(el.dataset.final===undefined)el.dataset.final=el.textContent;el.dataset.flapping='1';const t0=performance.now()+delay;
    (function step(now){const final=el.dataset.final, k=(now-t0)/(700+final.length*14);if(k<0){el.textContent=final.replace(/\S/g,'\u00a0');requestAnimationFrame(step);return;}
      if(k>=1){el.textContent=final;delete el.dataset.flapping;return;}
      const fixed=Math.floor(final.length*k);let s=final.slice(0,fixed);for(let i=fixed;i<final.length;i++)s+=/\s/.test(final[i])?final[i]:GLYPH[(Math.random()*26)|0];el.textContent=s;requestAnimationFrame(step);})(performance.now());}
  window.awFlip=function(el,on){if(!on)return;[['.at',0],['.an',260],['.aw2',480]].forEach(([q,d])=>{const e=el.querySelector(q);if(e)flap(e,d);});};
})();
