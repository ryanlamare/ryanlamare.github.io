/* ---- The end of the line (Ryan's idea, 18 Sep 2026: the train that left a
   Victorian terminus in Module 1 pulls into the final station, and the
   awards are given out there). The same London station a century and a half
   on: the old yellow-brick range with its arched windows, and over it the
   white lattice roof that rises from one trunk and fans out across the
   concourse. Wordless scenery, as on the journey.

   Two slides use it. On the awards slide the train comes in from the
   country (Ryan's note after driving it, 18 Sep: the board swamped the scene,
   so the train arrives first and the board comes down afterwards). The slide
   opens on open English countryside late in the afternoon of day two, drawn
   as Module 1's journey is drawn: hills, fields and hedges, the telegraph
   and the near grass each sliding past at its own pace. The Module 1
   locomotive draws into the frame from the left with one carriage per hand
   the room sent in (room m1-hands; eight if it cannot be read), every blind
   up and every compartment lit, and then holds its place while the world
   runs past it: the edge of town (roofs, a spire, a gasholder and mill
   chimneys in the haze, terraces along the top of a brick retaining wall),
   the approach (two colour-light signals that go back to red behind the
   locomotive, a second line running in, a signal box), the end of the
   platform, the end of the brick range, and the roof closing over. The
   train brakes all the way in and creeps the last of it up to the buffers,
   and the station comes to rest exactly as it stands on the podium slide.
   A last breath of steam, the pigeons up off the near platform, and only
   then does the departures board come down from the roof on its two
   hangers, with a little weight to it, blank. About twenty-one seconds from
   the slide opening to the board in place. A row is blank until its press,
   then its letters flap round to the award and the name. A press that comes
   before the board is down brings it down at once and flaps the row when it
   lands, so nothing is ever revealed onto a board nobody can see.

   The arrival plays once per page load, the first time the slide is reached
   with no award showing. Coming back to the slide finds the station as it
   was left; reaching it for the first time backwards from the podium (every
   award already showing) finds the train at the buffers and the board down.
   The arrival keeps its own clock, so leaving the slide half way and coming
   back picks it up where it was. On the podium slide the train is already
   standing, there is no country and no board; gold brings confetti and the
   whistle.

   A click on the station clock runs the arrival again from the country (for
   a rehearsal). Every node is made with createElementNS and moved by its
   transform attribute; the board is the slide's own HTML and moves by its
   style. Expects POLL_API and GT_RAIL (rail.js). ---- */
(function(){
  if(!window.GT_RAIL)return;
  const R=GT_RAIL, C=R.C, rng=R.rng, INK=C.INK,PAPER=C.PAPER,SOFT=C.SOFT,CARD=C.CARD,RED=C.RED,OCHRE=C.OCHRE,TEAL=C.TEAL,TERRA=C.TERRA,IRON=C.IRON,WARM=C.WARM;
  const BRICK='#D8C08A',BRICKD='#BFA56E',ROOF='#E2DDEC',LATT='#FBF8F0',GLASS='#46505E',STONE='#D8D2C4',STONED='#C4BDAC',
        SKY='#D9DCC9',SKYLOW='#F3DDAE',HILLFAR='#CBCFAF',HILL='#B5BC93',GRASS='#C3C792',GRASSD='#AEB37E',HEDGE='#6F8A55',STUBBLE='#DCC888',SLATE='#4A453C',HAZE='#B4B19C',YARD='#A39C8C',AMBER='#F2C14E';
  const RAIL=634, FRONT=1212, TX=1010;
  /* the arrival's clock, in seconds. The camera cruises, then brakes at a constant rate to a stand after RUN pixels (a
     whole number of sleepers, so the line lands where it lies). The train draws into the frame over IN seconds, holds
     HOLD pixels short of its place, and creeps that last stretch up to the buffers between CREEP and REST. Each layer
     of the station is drawn where it ends up and slid right by what is left of the run times its pace. */
  const RUN=8450, CRUISE=6, STOP=17.5, V0=RUN/(CRUISE+(STOP-CRUISE)/2), BRAKE=V0*(STOP-CRUISE)/2, IN=4, HOLD=-170, CREEP=11.5, REST=17.9;
  const F_FAR=.5, F_TOWN=.7, F_WALL=.88, F_FLOOR=.94, F_NEAR=1.08;
  const smooth=k=>k*k*k*(k*(k*6-15)+10);
  const camAt=t=>t<CRUISE?V0*t:RUN-BRAKE*Math.pow(1-Math.min(1,(t-CRUISE)/(STOP-CRUISE)),2);
  const offAt=t=>t<IN?-(FRONT+60)+(FRONT+60+HOLD)*(1-Math.pow(1-t/IN,1.8)):HOLD*(1-smooth(Math.max(0,Math.min(1,(t-CREEP)/(REST-CREEP)))));
  let hands=8;
  const ready=Promise.race([fetch(POLL_API+'/p/m1-hands/entries').then(r=>r.json()).then(d=>{const by=new Set();(d.entries||[]).forEach(e=>{if(/^[1-4]‖/.test(String(e.t||'')))by.add(e.v);});if(by.size)hands=Math.min(15,by.size);}).catch(()=>{}),
    new Promise(res=>setTimeout(res,2500))]);                 /* a room that will not answer does not hold the train up */

  function build(svg,opt){
    const slide=svg.closest('.slide'), mk=(t,a,p)=>R.mk(t,a,p||svg);
    const P=(d,fill,par,o)=>mk('path',Object.assign({d,fill},o||{}),par), Rr=(x,y,w,h,fill,par,o)=>mk('rect',Object.assign({x,y,width:w,height:h,fill},o||{}),par),
          Ci=(cx,cy,r,fill,par,o)=>mk('circle',Object.assign({cx,cy,r,fill},o||{}),par), Li=(x1,y1,x2,y2,par,o)=>mk('line',Object.assign({x1,y1,x2,y2},o||{}),par);
    const OUT={stroke:INK,'stroke-width':2.4,'stroke-linejoin':'round'}, THIN={stroke:INK,'stroke-width':1.8,'stroke-linejoin':'round'};
    const tiles=[], clouds=[], signals=[];let backG=null,farG=null,townG=null,poleG=null,poleClipR=null,foreG=null,stacks=null;
    function tiler(par,W,factor,draw){const g=mk('g',{},par),a=mk('g',{},g),b=mk('g',{transform:'translate('+W+' 0)'},g);draw(a);draw(b);tiles.push({g,W,factor});return g;}

    /* ================= the country the train comes in from (the awards slide only): late afternoon ================= */
    if(opt.arrive){backG=mk('g',{});
      Rr(0,0,1280,470,SKY,backG);[190,260,330,400].forEach(y=>Rr(0,y,1280,470-y,SKYLOW,backG,{opacity:.34}));Ci(1040,292,66,'#F8DCA0',backG,{opacity:.5});Ci(1040,292,42,'#F6C878',backG);
      const cl=mk('g',{fill:'#F8EEDC'},backG), rc=rng(7);for(let i=0;i<6;i++){const g=mk('g',{},cl);[[0,0,44,17],[-30,5,26,12],[32,6,30,12],[8,-12,26,15],[-12,-7,20,12]].forEach(e=>mk('ellipse',{cx:e[0],cy:e[1],rx:e[2],ry:e[3]},g));clouds.push({g,x:rc()*1280,y:40+rc()*190,s:.6+rc()*.7,v:3+rc()*5});}
      tiler(backG,1600,.1,g=>{const W=1600;let d1='M0 470',d2='M0 470';
        for(let x=0;x<=W;x+=40){const t=x/W*Math.PI*2;d1+=' L'+x+' '+(424-24*Math.sin(t*2+1)-12*Math.sin(t*5)).toFixed(1);d2+=' L'+x+' '+(446-16*Math.sin(t*3+2)-7*Math.sin(t*7)).toFixed(1);}
        P(d1+' L'+W+' 470 Z',HILLFAR,g);P(d2+' L'+W+' 470 Z',HILL,g);});
      Rr(0,462,1280,258,GRASS,backG);
      tiler(backG,2400,.4,g=>{const r=rng(31);
        [[60,470,420,STUBBLE],[640,478,360,GRASSD],[1180,468,460,STUBBLE],[1820,480,380,GRASSD]].forEach(f=>P('M'+f[0]+' '+(f[1]+64)+' L'+(f[0]+70)+' '+f[1]+' L'+(f[0]+f[2])+' '+f[1]+' L'+(f[0]+f[2]+90)+' '+(f[1]+64)+' Z',f[3],g,{opacity:.75}));
        for(let i=0;i<7;i++){const x=r()*2400,y=478+r()*50;P('M'+x+' '+y+' q120 -14 260 4',HEDGE,g,{fill:'none',stroke:HEDGE,'stroke-width':5,'stroke-linecap':'round',opacity:.8});}
        for(let i=0;i<11;i++){const x=r()*2400,y=486+r()*52,s=.7+r()*.6,c=mk('g',{transform:'translate('+x.toFixed(0)+' '+y.toFixed(0)+') scale('+s.toFixed(2)+')'},g);
          Rr(-2,-6,4,16,'#6B4226',c);Ci(-10,-14,13,'#7E9B5B',c);Ci(9,-16,15,'#6F8A55',c);Ci(0,-26,14,'#8AA765',c);}
        [[520,520],[1500,512]].forEach(h=>{const c=mk('g',Object.assign({transform:'translate('+h[0]+' '+h[1]+')'},OUT),g);Rr(-22,-20,44,22,SOFT,c);P('M-27 -20 L0 -40 L27 -20 Z',TERRA,c);Rr(-5,-12,10,14,INK,c,{stroke:'none'});Rr(12,-44,7,14,SOFT,c);});});
      /* the edge of town a long way off, all one haze: roofs, a spire, mill chimneys and their north lights, a gasholder */
      farG=mk('g',{},backG);(function(g){const r=rng(53);let d='M-600 512 L-470 502',x=-470;
        while(x<760){const w=26+r()*30,y=500-(14+r()*26);d+=' L'+x.toFixed(0)+' '+y.toFixed(0)+' L'+(x+w/2).toFixed(0)+' '+(y-8-r()*7).toFixed(0)+' L'+(x+w).toFixed(0)+' '+y.toFixed(0);x+=w;}
        P(d+' L760 512 Z',HAZE,g);
        P('M-322 500 L-322 436 L-312 436 L-302 384 L-292 436 L-282 436 L-282 500 Z',HAZE,g);
        [[-84,372],[-36,398]].forEach(c=>P('M'+(c[0]-8)+' 500 L'+(c[0]-4)+' '+c[1]+' L'+(c[0]+4)+' '+c[1]+' L'+(c[0]+8)+' 500 Z',HAZE,g));
        let n='M-6 500 L-6 462';for(let i=0;i<5;i++)n+=' L'+(-6+i*30)+' 462 L'+(24+i*30)+' 444 L'+(24+i*30)+' 462';P(n+' L144 500 Z',HAZE,g);
        Rr(196,452,100,48,HAZE,g);const fr=mk('g',{stroke:HAZE,'stroke-width':3,fill:'none'},g);[190,224,268,302].forEach(x=>Li(x,424,x,500,fr));Li(190,426,302,426,fr);Li(190,440,302,440,fr);
        stacks=R.smoke(g);})(farG);
      /* nearer: a farm where the fields stop, then terraces, their chimneys and lit windows, and one tall mill */
      townG=mk('g',{},backG);(function(g){let mill=false;const r=rng(71), BR=['#B98A62','#C9A27A','#A97A58'], B=522;
        const tree=(x,y,s)=>{const c=mk('g',{transform:'translate('+x+' '+y+') scale('+s+')'},g);Rr(-2,-6,4,16,'#6B4226',c);Ci(-10,-14,13,'#7E9B5B',c);Ci(9,-16,15,'#6F8A55',c);Ci(0,-26,14,'#8AA765',c);};
        tree(-960,B,1);tree(-930,B+4,.8);const f=mk('g',Object.assign({transform:'translate(-880 '+B+')'},THIN),g);Rr(-26,-24,52,24,SOFT,f);P('M-31 -24 L0 -46 L31 -24 Z',TERRA,f);Rr(30,-16,40,16,'#9A6B3A',f);P('M27 -16 L50 -30 L73 -16 Z',SLATE,f);tree(-790,B+2,1.1);tree(-752,B,.9);
        let x=-700;while(x<420){const k=4+((r()*4)|0), w=52, W=k*w, c=BR[(r()*3)|0], h=42+((r()*3)|0)*7, o=mk('g',THIN,g), wn=mk('g',{},g);
          for(let i=0;i<k;i++){Rr(x+i*w+w-13,B-h-36,13,20,c,o);Rr(x+i*w+w-12,B-h-41,4,6,TERRA,o,{'stroke-width':1.2});Rr(x+i*w+w-5,B-h-41,4,6,TERRA,o,{'stroke-width':1.2});}
          Rr(x,B-h,W,h,c,o);P('M'+(x-4)+' '+(B-h)+' L'+(x+10)+' '+(B-h-22)+' L'+(x+W-10)+' '+(B-h-22)+' L'+(x+W+4)+' '+(B-h)+' Z',SLATE,o);
          for(let i=0;i<k;i++){if(i)Li(x+i*w,B-h,x+i*w,B,o,{'stroke-width':1,opacity:.5});[9,31].forEach(dx=>Rr(x+i*w+dx,B-h+9,12,15,r()<.34?WARM:GLASS,wn,{stroke:INK,'stroke-width':1.2}));}
          x+=W;if(r()<.45){tree(x+34,B+2,.9+r()*.3);x+=68;}else x+=20;
          if(!mill&&x>-260){mill=true;const m=mk('g',THIN,g);P('M'+(x+128)+' '+B+' L'+(x+133)+' '+(B-196)+' L'+(x+145)+' '+(B-196)+' L'+(x+150)+' '+B+' Z','#A97A58',m);Rr(x+130,B-202,18,7,SLATE,m);Rr(x,B-112,120,112,'#B98A62',m);Rr(x-4,B-120,128,10,SLATE,m);
            const mw=mk('g',{},g);for(let a=0;a<3;a++)for(let b=0;b<6;b++)Rr(x+9+b*18.6,B-100+a*32,10,18,(a+b)%4===0?WARM:GLASS,mw);x+=176;}}
      })(townG);
      Rr(0,0,1280,720,'#EFA968',backG,{opacity:.1,'pointer-events':'none'});}

    /* ================= the station: each layer in its own group, drawn where it ends up ================= */
    const wallG=mk('g',{}), floorG=mk('g',{});
    if(opt.arrive){poleG=mk('g',{'clip-path':'url(#termPoles)'});poleClipR=mk('rect',{x:0,y:0,width:1280,height:720},mk('clipPath',{id:'termPoles'},mk('defs',{})));}
    const backL=mk('g',{}), peopleG=mk('g',{}), bedG=mk('g',{}), frontL=mk('g',{});
    /* the approach, behind the line: the brick retaining wall the town stands on, stepping down to nothing at its far end */
    (function(g){const o=mk('g',OUT,g);P('M-960 560 L-900 520 L-56 520 L-56 560 Z',BRICK,o);Rr(-906,514,852,8,BRICKD,o);
      const a=mk('g',{fill:BRICKD},g);for(let x=-850;x<-110;x+=74)P('M'+x+' 560 L'+x+' 544 A22 22 0 0 1 '+(x+44)+' 544 L'+(x+44)+' 560 Z',null,a);})(wallG);
    /* the old range: brick, a cornice, tall arched windows, some of them lit; it ends in a pier, and the roof ends with it */
    Rr(-56,-10,1400,570,BRICK,wallG);
    const br=mk('g',{stroke:BRICKD,'stroke-width':1.4,opacity:.55},wallG);for(let y=70;y<560;y+=26)Li(-56,y,1344,y,br);
    Rr(-56,286,1400,12,BRICKD,wallG,{stroke:INK,'stroke-width':1.6});
    const wins=[];for(let i=0;i<11;i++){const x=34+i*118;P('M'+x+' 548 L'+x+' 372 A32 32 0 0 1 '+(x+64)+' 372 L'+(x+64)+' 548 Z',BRICKD,wallG,OUT);
      wins.push(P('M'+(x+8)+' 548 L'+(x+8)+' 374 A24 24 0 0 1 '+(x+56)+' 374 L'+(x+56)+' 548 Z',(i*7)%3===0?WARM:GLASS,wallG));Li(x+32,350,x+32,548,wallG,{stroke:BRICKD,'stroke-width':3});Li(x+8,440,x+56,440,wallG,{stroke:BRICKD,'stroke-width':3});}
    for(let i=0;i<11;i++){const x=46+i*118;Rr(x,190,40,70,(i*5)%4===0?WARM:GLASS,wallG,OUT);}
    /* the lattice roof: one trunk, fanning out over everything */
    const pt=(u,v)=>{v=Math.max(0,v);return [TX+u*(30+1240*Math.pow(v,1.55)),566-36-500*Math.pow(v,.6)];};
    (function(){const cid='termRoof'+(opt.arrive?'A':'B');mk('rect',{x:-56,y:-20,width:1420,height:760},mk('clipPath',{id:cid},mk('defs',{},wallG)));const rf=mk('g',{'clip-path':'url(#'+cid+')'},wallG);
      let d='';for(let v=0;v<=1.001;v+=.05){const p=pt(-1.25,v);d+=(d?' L':'M')+p[0].toFixed(0)+' '+p[1].toFixed(0);}d+=' L-40 -10 L1320 -10';for(let v=1;v>=-.001;v-=.05){const p=pt(1.25,v);d+=' L'+p[0].toFixed(0)+' '+p[1].toFixed(0);}
      P(d+' Z',ROOF,rf);P(d+' Z','#B9A9E0',rf,{opacity:.18});
      const g=mk('g',{fill:'none',stroke:LATT,'stroke-width':3.2,'stroke-linecap':'round'},rf);
      for(let k=-1;k<=1;k+=2)for(let u0=-2.5;u0<=2.5;u0+=.25){let s='';for(let v=0;v<=1.001;v+=.04){const u=u0+k*1.25*v;if(Math.abs(u)>1.25){if(s){P(s,null,g);s='';}continue;}const p=pt(u,v);s+=(s?' L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);}if(s)P(s,null,g);}
      const e=mk('g',{fill:'none',stroke:INK,'stroke-width':2.2,opacity:.8},rf);[-1.25,1.25].forEach(u=>{let s='';for(let v=0;v<=1.001;v+=.04){const p=pt(u,v);s+=(s?' L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1);}P(s,null,e);});
      P('M'+(TX-30)+' 566 L'+(TX-22)+' 520 L'+(TX+22)+' 520 L'+(TX+30)+' 566 Z',LATT,wallG,OUT);
      Rr(-60,-10,30,572,BRICKD,wallG,OUT);for(let y=20;y<560;y+=52)Rr(-64,y,38,14,BRICK,wallG,{stroke:INK,'stroke-width':1.6});})();
    /* a trolley gone half way into the wall */
    (function(){const g=mk('g',Object.assign({transform:'translate(236 548)'},OUT),wallG);Li(0,-44,0,-8,g);Li(0,-44,26,-44,g);Li(0,-8,30,-8,g);Rr(2,-38,24,14,'#7A4A2A',g);Rr(4,-24,22,16,'#9A6B3A',g);Ci(8,-3,4,INK,g);Rr(26,-56,8,56,BRICK,g,{stroke:'none'});})();
    /* the hanging clock: the real time */
    const clk=mk('g',{transform:'translate(1150 250)',style:'cursor:pointer'},wallG);Li(0,-90,0,-34,clk,{stroke:INK,'stroke-width':3});Ci(0,0,35,INK,clk);Ci(0,0,30,CARD,clk);
    const hm=mk('g',{stroke:INK,'stroke-linecap':'round'},clk);for(let i=0;i<12;i++){const a=i*Math.PI/6;Li(Math.sin(a)*23,-Math.cos(a)*23,Math.sin(a)*27,-Math.cos(a)*27,hm,{'stroke-width':2});}
    const cH=Li(0,0,0,-15,hm,{'stroke-width':4}), cM=Li(0,0,0,-23,hm,{'stroke-width':2.6}), cS=Li(0,4,0,-25,hm,{'stroke-width':1.2,stroke:RED});Ci(0,0,2.6,RED,clk);
    /* the yard the approach runs through, its sidings, a signal box in it, and then the concourse floor */
    P('M-1760 '+RAIL+' L-1640 556 L-30 556 L-30 '+RAIL+' Z',YARD,floorG);
    (function(){const g=mk('g',{},floorG);[[574,-1580],[594,-1640]].forEach(l=>{Rr(l[1],l[0]-3,-30-l[1],9,'#979080',g);Li(l[1],l[0],-30,l[0],g,{stroke:IRON,'stroke-width':2.2});});   /* two sidings, and a short rake of wagons left on one: seen over a long train, hidden by a short one */
      [[-1330,'#7A4A2A'],[-1262,'#6B5A45'],[-1194,'#7A4A2A']].forEach(w=>{const o=mk('g',Object.assign({transform:'translate('+w[0]+' 594)'},THIN),g);Rr(0,-30,62,24,w[1],o);Li(21,-30,21,-6,o,{'stroke-width':1});Li(41,-30,41,-6,o,{'stroke-width':1});Ci(13,-4,5,INK,o);Ci(49,-4,5,INK,o);});})();
    (function(){const g=mk('g',Object.assign({transform:'translate(-640 598)'},OUT),floorG);Rr(-40,-58,80,58,BRICK,g);Rr(-8,-30,16,30,SLATE,g);Rr(-48,-104,96,46,CARD,g);
      const w=mk('g',{stroke:INK,'stroke-width':1.4},g);for(let i=0;i<6;i++)Rr(-43+i*14.6,-98,13,26,i%3===1?WARM:GLASS,w);P('M-56 -104 L-38 -130 L38 -130 L56 -104 Z',SLATE,g);Li(0,-130,0,-142,g);Ci(0,-144,3,RED,g,{'stroke-width':1.4});
      Li(40,-58,74,0,g,{'stroke-width':3});Li(40,-72,74,-14,g,{'stroke-width':1.8});})();
    Rr(-30,548,1340,40,STONE,floorG);Li(-30,548,1310,548,floorG,{stroke:INK,'stroke-width':2});
    /* beside the line on the way in: the telegraph and a fence, which stop where the yard begins */
    if(opt.arrive)tiler(poleG,1300,1,g=>{const w=mk('g',{stroke:INK,'stroke-width':1.3,fill:'none',opacity:.7},g);
      for(let i=0;i<4;i++){const x=90+i*325;Li(x,RAIL-6,x,RAIL-150,g,{stroke:'#5A4632','stroke-width':5,'stroke-linecap':'round'});Li(x-16,RAIL-140,x+16,RAIL-140,g,{stroke:'#5A4632','stroke-width':4});Li(x-12,RAIL-128,x+12,RAIL-128,g,{stroke:'#5A4632','stroke-width':3.4});
        [[-14,-140],[14,-140],[-10,-128]].forEach(o=>P('M'+(x+o[0])+' '+(RAIL+o[1])+' q162 22 325 0','none',w));}
      const f=mk('g',{stroke:'#7A6248','stroke-width':3,'stroke-linecap':'round'},g);Li(0,RAIL-22,1300,RAIL-22,f);Li(0,RAIL-12,1300,RAIL-12,f);for(let x=20;x<1300;x+=52)Li(x,RAIL-28,x,RAIL-4,f);});
    /* the throat: a second line runs in beside ours as far as the platform ramp; two signals; the far platform, open to the sky at its end */
    P('M-1760 '+(RAIL-2)+' L-1500 '+(RAIL-24)+' L-440 '+(RAIL-24)+' L-440 '+(RAIL-2)+' Z','#8E887A',backL);P('M-1760 '+RAIL+' L-1500 '+(RAIL-21)+' L-452 '+(RAIL-21),'none',backL,{stroke:IRON,'stroke-width':3});
    [-1250,-590].forEach((x,i)=>{const g=mk('g',{transform:'translate('+x+' '+RAIL+')'},backL);Li(0,-2,0,-150,g,{stroke:IRON,'stroke-width':5,'stroke-linecap':'round'});Li(0,-96,14,-96,g,{stroke:IRON,'stroke-width':3});Li(14,-96,14,-150,g,{stroke:IRON,'stroke-width':3});
      Rr(-11,-206,22,58,INK,g,{rx:7});P('M-13 -206 Q0 -220 13 -206 Z',INK,g);const glow=Ci(0,-166,13,AMBER,g,{opacity:.35}), a=Ci(0,-166,6,AMBER,g), b=Ci(0,-186,6,i?'#3A3B37':AMBER,g);signals.push({x,a,b,glow,two:!i,red:false});});
    P('M-500 '+RAIL+' L-420 '+(RAIL-52)+' L1310 '+(RAIL-52)+' L1310 '+RAIL+' Z',STONED,backL);Rr(-420,RAIL-52,1730,5,'#F2D24A',backL);P('M-500 '+RAIL+' L-420 '+(RAIL-52)+' L1310 '+(RAIL-52),'none',backL,{stroke:INK,'stroke-width':1.6});
    [-370,-190].forEach(x=>{Li(x,RAIL-52,x,RAIL-172,backL,{stroke:IRON,'stroke-width':4});Rr(x-3,RAIL-176,30,7,IRON,backL,{rx:2});Rr(x+5,RAIL-169,20,3,WARM,backL);});
    /* people on the far platform: cases, backpacks, a coffee, a phone */
    const people=[], r=rng(29), COATS=['#2B3A55','#6B2D3E','#35584A',TEAL,TERRA,OCHRE,'#4A453C','#7A4E8A'], SKIN=['#E9C9A8','#C99A6B','#8A5A3A','#F0D5B8'];
    function person(x,i){const p=mk('g',{},peopleG), c=COATS[i%COATS.length], kind=i%4;
      Rr(-5.5,-9,4.6,18,INK,p);Rr(.9,-9,4.6,18,INK,p);Rr(-8,-36,16,29,c,p,{rx:5,stroke:INK,'stroke-width':1.8});Ci(0,-44,6.4,SKIN[i%SKIN.length],p,{stroke:INK,'stroke-width':1.6});P('M-6.4 -45 Q-5 -53 1 -52 Q7 -51 6.4 -44 Q2 -48 -6.4 -45 Z',INK,p);
      if(kind===0){Rr(12,-16,15,24,RED,p,{rx:2,stroke:INK,'stroke-width':1.8});Li(19.5,-16,19.5,-30,p,{stroke:INK,'stroke-width':2});Li(15,-30,24,-30,p,{stroke:INK,'stroke-width':2});}
      else if(kind===1){Rr(-14,-35,8,20,OCHRE,p,{rx:3,stroke:INK,'stroke-width':1.6});}
      else if(kind===2){Rr(8,-27,6,9,CARD,p,{stroke:INK,'stroke-width':1.4});}
      else{Rr(7,-30,4,8,INK,p);}
      people.push({g:p,x,y:RAIL-58,ph:r()*6,arm:null});return p;}
    (opt.people||[70,150,290,356,470,610,690,820,905,1090]).forEach((x,i)=>person(x,i));
    /* the line, the buffers, the near platform */
    Rr(0,RAIL-2,1280,30,'#8E887A',bedG);const sl=mk('g',{fill:'#5A5144'},bedG);for(let x=-20;x<1320;x+=26)Rr(x,RAIL+3,12,6,null,sl);Rr(0,RAIL,1280,3.4,IRON,bedG);
    (function(){const g=mk('g',OUT,frontL);Rr(1236,RAIL-30,12,30,IRON,g);Rr(1226,RAIL-34,30,10,RED,g);Li(1248,RAIL,1272,RAIL-26,g,{'stroke-width':4});})();
    const trainG=mk('g',{}), smoke=R.smoke(svg);
    if(opt.arrive){foreG=mk('g',{});Rr(0,RAIL+28,1280,100,GRASSD,foreG);
      tiler(foreG,1700,1.5,g=>{const r=rng(91);for(let i=0;i<26;i++){const x=r()*1700,y=674+r()*40;P('M'+x+' '+y+' l-5 -12 M'+x+' '+y+' l0 -15 M'+x+' '+y+' l6 -11','none',g,{stroke:'#8A9A6A','stroke-width':2.4,'stroke-linecap':'round'});}
        for(let i=0;i<5;i++){const x=r()*1700;Ci(x,722,30,'#8FA36B',g);Ci(x+34,728,24,'#7E9B5B',g);}});}
    const nearG=mk('g',{});
    P('M-300 '+(RAIL+28)+' L1400 '+(RAIL+28)+' L1400 720 L-372 720 Z',STONE,nearG);Rr(-300,RAIL+28,1700,6,'#F2D24A',nearG);P('M-372 720 L-300 '+(RAIL+28)+' L1400 '+(RAIL+28),'none',nearG,{stroke:INK,'stroke-width':2});
    const tac=mk('g',{fill:STONED},nearG);for(let x=-296;x<1390;x+=16)Ci(x,RAIL+44,2.6,null,tac);
    /* pigeons on the near platform */
    const birds=[];for(let i=0;i<7;i++){const g=mk('g',{},nearG);mk('ellipse',{cx:0,cy:-6,rx:9,ry:6,fill:'#8C8E96',stroke:INK,'stroke-width':1.5},g);Ci(8,-12,4.2,'#6E7079',g,{stroke:INK,'stroke-width':1.4});P('M12 -12 l5 1.5 l-5 1.5 Z',OCHRE,g);P('M-8 -7 l-9 -3 l3 6 Z','#6E7079',g,{stroke:INK,'stroke-width':1.2});
      const wing=P('M-4 -8 Q2 -22 10 -8 Z','#A9ABB3',g,{stroke:INK,'stroke-width':1.3,opacity:0});birds.push({g,wing,hx:160+i*150+r()*60,hy:RAIL+52+r()*8,x:0,y:0,ph:r()*6,fly:0,went:false,face:r()<.5?1:-1});}
    const confG=mk('g',{}), conf=[];

    /* what is left of the run slides every layer to the right by its own pace; whatever cannot be seen is switched off */
    let left=-1;
    function lay(rem){if(rem===left)return;left=rem;const tr=(g,f)=>g.setAttribute('transform','translate('+(rem*f).toFixed(1)+' 0)'), vis=(g,on)=>{if(g)g.setAttribute('display',on?'inline':'none');};
      tr(wallG,F_WALL);tr(floorG,F_FLOOR);tr(peopleG,F_FLOOR);tr(backL,1);tr(frontL,1);tr(nearG,F_NEAR);
      vis(wallG,rem<2600);vis(floorG,rem<3300);vis(peopleG,rem<1500);vis(backL,rem<3100);vis(frontL,rem<90);vis(nearG,rem<1560);
      if(!opt.arrive)return;const cam=RUN-rem, out=rem>0;vis(backG,out);vis(foreG,out);vis(poleG,rem>1900);sl.setAttribute('transform','translate('+(-(cam%26)).toFixed(1)+' 0)');
      if(!out)return;tiles.forEach(t=>t.g.setAttribute('transform','translate('+(-((cam*t.factor)%t.W)).toFixed(1)+' 0)'));
      tr(farG,F_FAR);tr(townG,F_TOWN);vis(farG,rem<3700);vis(townG,rem<3300);poleClipR.setAttribute('width',Math.max(0,rem-1900).toFixed(0));}

    /* the departures board (the awards slide's own HTML): held up out of sight, let down on a damped spring so it lands
       with a little weight, a slight dip and a settle; hurry() brings it down at once for a press that will not wait */
    const board=opt.arrive?slide.querySelector('.board'):null, bd={y:0,v:0,to:0,w:2.6,z:.8};let lowerAt=0;
    const drop=()=>board?board.offsetTop+board.offsetHeight+40:0;
    function setBoard(y){bd.y=y;board.style.transform=y?'translateY('+y.toFixed(1)+'px)':'';}
    function snapBoard(up){if(!board)return;lowerAt=0;bd.v=0;bd.to=up?-drop():0;setBoard(bd.to);}
    function hurry(){if(!board||(bd.to===0&&bd.y===0))return 0;if(mode==='idle'){snapBoard(false);return 0;}
      lowerAt=0;bd.to=0;bd.w=8;bd.z=.9;wake();return 220+480*Math.min(1,Math.abs(bd.y)/drop());}
    if(board)snapBoard(true);

    /* the train: the Module 1 locomotive and the room's carriages, blinds up */
    const loco=R.loco(trainG);loco.g.setAttribute('transform','translate('+(-R.LOCO_LEN)+' 0)');
    let cars=[], s=1, off=-(FRONT+400), cam=RUN, vel=0, mode='idle', T=0, chuff=0, lazy=0, hiss=0, whistle=0, stackT=0;
    function makeTrain(){cars.forEach(c=>c.g.remove());cars=[];for(let i=0;i<hands;i++){const c=R.carriage(trainG,{livery:i});c.raise(1);c.g.setAttribute('transform','translate('+(-R.LOCO_LEN-(i+1)*R.PITCH)+' 0)');cars.push(c);}
      s=Math.min(1,1170/(R.LOCO_LEN+hands*R.PITCH+10));}
    function arrive(){makeTrain();T=0;cam=0;off=offAt(0);mode='arriving';lowerAt=0;hiss=0;smoke.clear();if(stacks)stacks.clear();
      birds.forEach(b=>{b.fly=0;b.went=false;});signals.forEach(g=>{g.red=false;g.a.setAttribute('fill',AMBER);g.b.setAttribute('fill',g.two?AMBER:'#3A3B37');g.glow.setAttribute('fill',AMBER);});
      if(board){bd.to=-drop();bd.w=8;bd.z=.9;}lay(RUN);wake();}
    function stand(){makeTrain();off=0;cam=RUN;mode='standing';lay(0);wake();}
    clk.addEventListener('click',arrive);

    let raf=0,lastT=0,started=false;
    function wake(){if(!raf)raf=requestAnimationFrame(frame);}
    function frame(now){
      raf=0;if(!slide.classList.contains('active')){lastT=0;return;}
      const dt=lastT?Math.min(.05,(now-lastT)/1000):0;lastT=now;let moved=0;
      if(mode==='arriving'){T+=dt;const c=camAt(T),o=offAt(T);moved=(c+o)-(cam+off);cam=c;off=o;lay(RUN-cam);
        birds.forEach((b,i)=>{if(!b.went&&T>13.6+i*.12){b.went=true;b.fly=now;}});
        signals.forEach(g=>{if(!g.red&&g.x+RUN-cam<FRONT+off-R.LOCO_LEN*s){g.red=true;g.a.setAttribute('fill',RED);g.b.setAttribute('fill','#3A3B37');g.glow.setAttribute('fill',RED);}});
        if(now-stackT>520){stackT=now;[[-84,372],[-36,398]].forEach(c=>stacks.puff(c[0],c[1],{r:3,grow:5,vy:-9,vx:7,max:4.5,op:.75,fill:'#D6D2BF'}));}stacks.step(dt,0);
        clouds.forEach(c=>{c.x+=(c.v-moved/(dt||1)*.03)*dt;if(c.x<-140)c.x=1400;c.g.setAttribute('transform','translate('+c.x.toFixed(1)+' '+c.y.toFixed(1)+') scale('+c.s.toFixed(2)+')');});
        if(T>=REST){mode='standing';hiss=now;lowerAt=now+700;}}
      if(lowerAt&&now>=lowerAt){lowerAt=0;bd.to=0;bd.w=2.6;bd.z=.8;}
      if(board&&(bd.y!==bd.to||bd.v)){bd.v+=(-bd.w*bd.w*(bd.y-bd.to)-2*bd.z*bd.w*bd.v)*dt;let y=bd.y+bd.v*dt;if(Math.abs(y-bd.to)<.3&&Math.abs(bd.v)<4){y=bd.to;bd.v=0;}setBoard(y);}
      vel=dt?moved/dt:0;
      if(moved){loco.roll(moved/s);cars.forEach(c=>c.roll(moved/s));}
      const bob=vel>30?Math.sin(now/90)*.5:0;
      trainG.setAttribute('transform','translate('+(FRONT+off).toFixed(1)+' '+(RAIL+bob).toFixed(1)+') scale('+s.toFixed(3)+')');
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
    /* the first time the slide is reached: the arrival, unless an award is already showing (the slide was reached backwards
       from the podium, or by #30.4), when the train is simply standing there and the board is down */
    function begin(){started=true;ready.then(()=>{if(opt.arrive&&!slide.querySelector('.awin.shown'))arrive();else{stand();snapBoard(false);}});}
    lay(opt.arrive?RUN:0);                                /* the country waits for the train; the podium's station simply stands */
    new MutationObserver(()=>{if(!slide.classList.contains('active'))return;if(!started)begin();wake();}).observe(slide,{attributes:true,attributeFilter:['class']});
    if(slide.classList.contains('active'))begin();
    return {arrive,burst,hurry};
  }

  const a=document.getElementById('termA'), b=document.getElementById('termB');
  const awards=a?build(a,{arrive:true}):null;
  const pod=b?build(b,{arrive:false,people:[40,92,150,196,1086,1132,1180,1236]}):null;   /* the crowd stands clear of the podium */
  window.podiumGold=function(el,on){if(on&&pod)pod.burst();};

  /* the departures board: a row's letters flap round to what it says (once the board is down to be read) */
  const GLYPH='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function flap(el,delay){if(el.dataset.final===undefined)el.dataset.final=el.textContent;el.dataset.flapping='1';const t0=performance.now()+delay;
    (function step(now){const final=el.dataset.final, k=(now-t0)/(700+final.length*14);if(k<0){el.textContent=final.replace(/\S/g,' ');requestAnimationFrame(step);return;}
      if(k>=1){el.textContent=final;delete el.dataset.flapping;return;}
      const fixed=Math.floor(final.length*k);let s=final.slice(0,fixed);for(let i=fixed;i<final.length;i++)s+=/\s/.test(final[i])?final[i]:GLYPH[(Math.random()*26)|0];el.textContent=s;requestAnimationFrame(step);})(performance.now());}
  window.awFlip=function(el,on){if(!on)return;const wait=awards?awards.hurry():0;[['.at',0],['.an',260],['.aw2',480]].forEach(([q,d])=>{const e=el.querySelector(q);if(e)flap(e,wait+d);});};
})();
