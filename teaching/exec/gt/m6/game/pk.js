/* pk.js — the penalty kick, shared by the Module 6 phone pages and the
   deck. One goal, one keeper, one ball, drawn once here so the solo game,
   the pairs shootout and the "shoot against me" slide all animate the
   same scene.

   Three things every device must agree on live here too:
     PK.h01 / PK.RATE / PK.goal   the hash draw that decides a kick (a copy
                                  also lives in /go/scores.js — keep them
                                  identical)
     PK.soloDive                  the solo keeper: reads the kicker's own
                                  history and leans the way they lean
     PK.rateAt                    the "shoot against me" odds, shaded by
                                  where the keeper chose to stand

   Sides are always the KICKER's left and right, which is also screen
   left and right (the scene looks at the goal from behind the ball). */
window.PK=(function(){
  const RATE={ll:58,lr:95,rl:93,rr:70};
  function h01(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;}
  const goal=(key,n,kick,dive)=>h01(key+'|'+n+'|'+kick+'|'+dive)<RATE[kick+dive]/100;

  /* ---- the solo keeper --------------------------------------------
     It remembers every kick you have taken. Two things it watches: how
     often you go left overall, and what you did last time you were in
     this spot (same side, same result). With nothing to go on it dives
     left about 42% of the time, the real keepers' mix. The more it is
     sure of you, the harder it leans — up to nine dives in ten. The dive
     itself is a hash of your name, the kick number and your history, so
     the deck can replay the whole game from your kicks alone. */
  function readKicker(hist){
    const n=hist.length;
    if(n<2)return 0.42;
    let left=0;hist.forEach(h=>{if(h.kick==='l')left++;});
    const overall=(left+1)/(n+2);
    const last=hist[n-1];
    let same=0,ctx=0;
    for(let i=0;i<n-1;i++){
      if(hist[i].kick===last.kick&&hist[i].goal===last.goal){ctx++;if(hist[i+1].kick==='l')same++;}
    }
    if(!ctx)return overall;
    const cond=(same+overall)/(ctx+1), w=ctx===1?0.5:0.7;
    return (1-w)*overall+w*cond;
  }
  const normName=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ');
  function soloDive(name,n,hist){
    const pLeft=readKicker(hist);
    let q=0.5+1.6*(pLeft-0.5);
    q=Math.max(0.08,Math.min(0.92,q));
    const seq=hist.map(h=>h.kick).join('');
    return h01('solo|'+normName(name)+'|'+n+'|'+seq)<q?'l':'r';
  }
  /* one kick: the keeper's dive and whether the ball went in */
  function soloStep(name,n,hist,kick){
    const dive=soloDive(name,n,hist);
    return {n,kick,dive,goal:goal('solo|'+normName(name),n,kick,dive)};
  }
  /* play a whole solo game from the kick sequence alone */
  function soloReplay(name,kicks){
    const hist=[];
    kicks.forEach((kick,i)=>{hist.push(soloStep(name,i+1,hist,kick));});
    return hist;
  }

  /* ---- shoot against me: the keeper picks a spot first --------------
     pos runs -1 (a full step to the kicker's left) to +1. Standing toward
     a side makes a dive to that side stronger and a dive to the other
     side weaker; a dive the wrong way barely matters either way. */
  function rateAt(kick,dive,pos){
    pos=Math.max(-1,Math.min(1,pos||0));
    const toward=kick==='l'?-pos:pos;
    let g=RATE[kick+dive];
    if(kick===dive)g-=25*toward; else g+=4*toward;
    return Math.max(25,Math.min(99,Math.round(g)));
  }
  const goalAt=(key,n,kick,dive,pos)=>h01(key+'|'+n+'|'+kick+'|'+dive)<rateAt(kick,dive,pos)/100;

  /* ---- kits ----------------------------------------------------------
     Plain colours and plain names; no crests. c1 is the shirt, c2 the
     shorts. The keeper of a same-kit pair wears the second colour. */
  const KITS=[
    {g:'Premier League',t:[
      ['arsenal','Arsenal','#EF0107','#FFFFFF'],['astonvilla','Aston Villa','#670E36','#95BFE5'],
      ['chelsea','Chelsea','#034694','#FFFFFF'],['everton','Everton','#003399','#FFFFFF'],
      ['liverpool','Liverpool','#C8102E','#C8102E'],['mancity','Manchester City','#6CABDD','#FFFFFF'],
      ['manutd','Manchester United','#DA291C','#FFFFFF'],['newcastle','Newcastle United','#241F20','#241F20'],
      ['tottenham','Tottenham Hotspur','#FFFFFF','#132257'],['westham','West Ham United','#7A263A','#1BB1E7']]},
    {g:'Scotland and Europe',t:[
      ['celtic','Celtic','#16973B','#FFFFFF'],['rangers','Rangers','#0033A0','#FFFFFF'],
      ['realmadrid','Real Madrid','#FFFFFF','#FFFFFF'],['barcelona','Barcelona','#A50044','#004D98'],
      ['atletico','Atlético Madrid','#CE3524','#262E62'],['bayern','Bayern Munich','#DC052D','#DC052D'],
      ['dortmund','Borussia Dortmund','#FDE100','#000000'],['psg','Paris Saint-Germain','#004170','#004170'],
      ['juventus','Juventus','#000000','#FFFFFF'],['acmilan','AC Milan','#FB090B','#FFFFFF'],
      ['inter','Inter Milan','#010E80','#000000'],['ajax','Ajax','#FFFFFF','#FFFFFF'],
      ['benfica','Benfica','#E30613','#FFFFFF'],['porto','Porto','#0033A0','#0033A0']]},
    {g:'National teams',t:[
      ['england','England','#FFFFFF','#0B2265'],['scotland','Scotland','#0B2265','#FFFFFF'],
      ['wales','Wales','#D30731','#D30731'],['ireland','Ireland','#169B62','#FFFFFF'],
      ['france','France','#0055A4','#FFFFFF'],['germany','Germany','#FFFFFF','#000000'],
      ['spain','Spain','#AA151B','#0B2265'],['italy','Italy','#0066B3','#FFFFFF'],
      ['netherlands','Netherlands','#F36C21','#FFFFFF'],['portugal','Portugal','#DA291C','#046A38'],
      ['brazil','Brazil','#FFDC00','#0033A0'],['argentina','Argentina','#75AADB','#000000'],
      ['usa','United States','#FFFFFF','#0B2265'],['belgium','Belgium','#E30613','#000000']]},
    {g:'No team, just a colour',t:[
      ['red','Red','#CE1E32','#CE1E32'],['blue','Blue','#37658A','#37658A'],['green','Green','#26713D','#26713D'],
      ['yellow','Yellow','#C9A227','#C9A227'],['black','Black','#1B1C19','#1B1C19'],['white','White','#FFFFFF','#FFFFFF']]}
  ];
  const KIT_BY_ID={};
  KITS.forEach(g=>g.t.forEach(t=>{KIT_BY_ID[t[0]]={id:t[0],name:t[1],c1:t[2],c2:t[3]};}));
  const DEFAULT_KICKER={id:'teal',name:'',c1:'#59949C',c2:'#59949C'};
  const DEFAULT_KEEPER={id:'keeper',name:'',c1:'#C4673D',c2:'#C4673D'};
  function kit(id){return KIT_BY_ID[id]||null;}
  /* a keeper facing a kicker in the same kit wears the other colour */
  function keeperKit(keeper,kicker){
    keeper=keeper||DEFAULT_KEEPER;
    if(kicker&&keeper.c1.toLowerCase()===kicker.c1.toLowerCase()){
      const alt=keeper.c2.toLowerCase()!==keeper.c1.toLowerCase()?keeper.c2:'#C9A227';
      return {id:keeper.id,name:keeper.name,c1:alt,c2:keeper.c1};
    }
    return keeper;
  }

  /* ---- the scene ---------------------------------------------------- */
  const NS='http://www.w3.org/2000/svg';
  const GOAL_L=40, GOAL_R=420, BAR=40, LINE=200, CX=230;
  function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;}
  function player(parent,x,y,role){
    /* a pictogram in the Module 1 style: head, torso, two legs; keeper's
       arms out, kicker's leg back */
    const g=el('g',{transform:'translate('+x+' '+y+')'},parent);
    g.dataset.x=x;g.dataset.y=y;
    const outline={stroke:'#1B1C19','stroke-width':'2.5','stroke-linejoin':'round'};
    if(role==='keeper'){
      el('path',Object.assign({class:'arms',d:'M4 40 L-24 20 M44 40 L72 20',fill:'none','stroke-width':'10','stroke-linecap':'round'},{stroke:'#000'}),g);
    }
    el('circle',Object.assign({class:'head',cx:24,cy:14,r:13},outline),g);
    el('path',Object.assign({class:'shirt',d:'M2 40 Q24 30 46 40 L40 84 L8 84 Z'},outline),g);
    el('rect',Object.assign({class:'shorts',x:9,y:84,width:11,height:30},outline),g);
    if(role==='keeper')el('rect',Object.assign({class:'shorts',x:28,y:84,width:11,height:30},outline),g);
    else el('path',Object.assign({class:'shorts leg',d:'M28 84 L52 110',fill:'none','stroke-width':'11','stroke-linecap':'round'},{stroke:'#000'}),g);
    return g;
  }
  function paint(g,k){
    g.querySelectorAll('.shirt').forEach(e=>e.setAttribute('fill',k.c1));
    g.querySelectorAll('rect.shorts').forEach(e=>e.setAttribute('fill',k.c2));
    g.querySelectorAll('.leg').forEach(e=>e.setAttribute('stroke',k.c2));
    g.querySelectorAll('.arms').forEach(e=>e.setAttribute('stroke',k.c1));
    g.querySelectorAll('.head').forEach(e=>e.setAttribute('fill','#1B1C19'));
  }
  const ease=t=>t<0.5?2*t*t:-1+(4-2*t)*t;
  function tween(ms,fn){
    return new Promise(res=>{
      const t0=performance.now();
      (function step(now){const t=Math.min(1,(now-t0)/ms);fn(t);if(t<1)requestAnimationFrame(step);else res();})(t0);
    });
  }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  /* Scene(container, {labels:true}) draws into the container (an
     element that can hold an svg). Methods:
       kits(kicker, keeper)   paint the two players (kit objects or null)
       stand(pos)             put the keeper a step to a side (-1..1)
       kick({kick,dive,goal,pos}) -> Promise, plays the kick
       reset()                everyone back to their marks */
  /* the three zones of the live game: a keeper standing at |pos| > ZONE
     is committed to that side; nearer the middle he is in the centre */
  const ZONE=0.33;
  const zoneOf=p=>p<-ZONE?'l':(p>ZONE?'r':'c');
  function Scene(container,opts){
    opts=opts||{};
    const svg=el('svg',{viewBox:'0 0 460 340',role:'img','aria-label':'A goal seen from the penalty spot: the keeper on the line, the kicker at the ball'});
    svg.style.width='100%';svg.style.height='auto';svg.style.display='block';svg.style.overflow='visible';
    container.appendChild(svg);
    /* net */
    const net=el('g',{stroke:'#1B1C19','stroke-width':'1.4',opacity:'.28',class:'net'},svg);
    let d='';for(let x=60;x<=400;x+=20)d+='M'+x+' 40V200';for(let y=60;y<=180;y+=20)d+='M40 '+y+'H420';
    el('path',{d,fill:'none'},net);
    el('path',{d:'M40 40 L40 200 M420 40 L420 200 M40 40 L420 40',fill:'none',stroke:'#1B1C19','stroke-width':'8','stroke-linecap':'round'},svg);
    el('line',{x1:20,y1:200,x2:440,y2:200,stroke:'#1B1C19','stroke-width':'4'},svg);
    if(opts.labels!==false){
      const lab={'font-family':'Jost, sans-serif','font-weight':'700','font-size':'15','letter-spacing':'1.5',fill:'#CE1E32','text-anchor':'middle'};
      el('text',Object.assign({x:70,y:26},lab),svg).textContent='LEFT';
      el('text',Object.assign({x:392,y:26},lab),svg).textContent='RIGHT';
    }
    /* zone dividers for the live game */
    if(opts.zones){
      const zg=el('g',{stroke:'#CE1E32','stroke-width':'2.5','stroke-dasharray':'8 8',opacity:'.55'},svg);
      el('line',{x1:CX-40,y1:BAR,x2:CX-40,y2:LINE},zg);
      el('line',{x1:CX+40,y1:BAR,x2:CX+40,y2:LINE},zg);
    }
    /* the keeper's standing spot, shown only when someone moves it */
    const spot=el('line',{x1:CX,y1:198,x2:CX,y2:202,stroke:'#CE1E32','stroke-width':'6','stroke-linecap':'round',opacity:'0'},svg);
    const keeper=player(svg,206,86,'keeper');
    const kicker=player(svg,196,214,'kicker');
    const ball=el('circle',{cx:262,cy:326,r:11,fill:'#F0EAD9',stroke:'#1B1C19','stroke-width':'3.5'},svg);
    const flash=el('text',{x:CX,y:130,'text-anchor':'middle','font-family':'League Spartan, Jost, sans-serif','font-weight':'900','font-size':'64',fill:'#CE1E32',opacity:'0','paint-order':'stroke',stroke:'#F0EAD9','stroke-width':'8'},svg);
    let pos=0, busy=false, kk=DEFAULT_KICKER, kp=DEFAULT_KEEPER;
    paint(kicker,kk);paint(keeper,kp);
    function place(){
      const kx=206+pos*120;
      keeper.setAttribute('transform','translate('+kx+' 86)');
      spot.setAttribute('x1',kx+24);spot.setAttribute('x2',kx+24);
      spot.setAttribute('opacity',Math.abs(pos)>0.02?'1':'0');
    }
    function reset(){
      busy=false;
      kicker.setAttribute('transform','translate(196 214)');
      ball.setAttribute('cx',262);ball.setAttribute('cy',326);ball.setAttribute('r',11);ball.setAttribute('opacity','1');
      flash.setAttribute('opacity','0');
      net.setAttribute('transform','');
      place();
    }
    function kits(kicKit,keepKit){
      kk=kicKit||DEFAULT_KICKER;
      kp=keeperKit(keepKit||DEFAULT_KEEPER,kk);
      paint(kicker,kk);paint(keeper,kp);
    }
    function stand(p){pos=Math.max(-1,Math.min(1,p||0));place();}
    /* ball flight: quadratic curve from the spot to a target, dipping
       under an apex so it reads as a shot rather than a slide */
    function flight(tx,ty,ms,shrink){
      const x0=262,y0=326,ax=(x0+tx)/2,ay=Math.min(y0,ty)-60;
      return tween(ms,t=>{
        const u=t, x=(1-u)*(1-u)*x0+2*(1-u)*u*ax+u*u*tx, y=(1-u)*(1-u)*y0+2*(1-u)*u*ay+u*u*ty;
        ball.setAttribute('cx',x);ball.setAttribute('cy',y);ball.setAttribute('r',11-(shrink?4*u:0));
      });
    }
    /* the live game: the keeper is already where he chose to be (o.pos is
       where he stood as the kick was taken, o.pos1 where he ended up); he
       slides between the two and lunges toward his zone, or stays put in
       the centre. A zone on the kick's side is a save, anything else a goal. */
    async function kickLive(o){
      const side=o.kick==='l'?-1:1, zone=o.dive, dside=zone==='l'?-1:(zone==='r'?1:0);
      kicker.setAttribute('transform','translate(150 224)');
      await tween(420,t=>{const u=ease(t);kicker.setAttribute('transform','translate('+(150+46*u)+' '+(224-10*u)+')');});
      kicker.setAttribute('transform','translate(196 214) rotate(-10 220 300)');
      const kx0=206+o.pos*120, kx1=206+(o.pos1===undefined?o.pos:o.pos1)*120;
      const slide=tween(520,t=>{
        const u=ease(t), x=kx0+(kx1-kx0)*u;
        keeper.setAttribute('transform','translate('+(x+dside*30*u)+' '+(86+(dside?22*u:0))+') rotate('+(dside*44*u)+' 24 114)');
      });
      let flightP;
      if(o.goal){
        const tx=side<0?86:374, ty=118;
        flightP=flight(tx,ty,560,true).then(()=>{
          net.setAttribute('transform','translate('+(side*3)+' 0)');
          return tween(180,t=>{net.setAttribute('transform','translate('+(side*3*(1-t))+' 0)');});
        });
      }else{
        const tx=kx1+24+dside*66, ty=118;
        flightP=flight(tx,ty,540,true).then(()=>tween(260,t=>{ball.setAttribute('cy',118+70*t*t);ball.setAttribute('cx',tx-dside*18*t);}));
      }
      await Promise.all([slide,flightP]);
      kicker.setAttribute('transform','translate(196 214)');
      pos=o.pos1===undefined?o.pos:o.pos1;
      flash.textContent=o.goal?'GOAL':'SAVED';
      flash.setAttribute('font-size','64');
      await tween(220,t=>flash.setAttribute('opacity',t));
    }
    async function kick(o){
      if(busy)return;busy=true;
      reset();busy=true;
      if(o.live){try{await kickLive(o);}finally{busy=false;}return;}
      const side=o.kick==='l'?-1:1, dside=o.dive==='l'?-1:1;
      const sameWay=o.kick===o.dive;
      /* run-up */
      kicker.setAttribute('transform','translate(150 224)');
      await tween(420,t=>{const u=ease(t);kicker.setAttribute('transform','translate('+(150+46*u)+' '+(224-10*u)+')');});
      kicker.setAttribute('transform','translate(196 214) rotate(-10 220 300)');
      /* the dive starts as the ball leaves the foot */
      const kx0=206+pos*120;
      const reach=sameWay?(o.goal?78:118):118;
      const dive=tween(520,t=>{
        const u=ease(t);
        keeper.setAttribute('transform','translate('+(kx0+dside*reach*u)+' '+(86+26*u)+') rotate('+(dside*62*u)+' 24 114)');
      });
      let flightP;
      if(o.goal){
        /* into the corner (a shade higher when the keeper went the right way and still missed it) */
        const tx=side<0?86:374, ty=sameWay?96:128;
        flightP=flight(tx,ty,560,true).then(()=>{
          net.setAttribute('transform','translate('+(side*3)+' 0)');
          return tween(180,t=>{net.setAttribute('transform','translate('+(side*3*(1-t))+' 0)');});
        });
      }else if(sameWay){
        /* into the gloves: the ball meets the keeper's reaching hand */
        const tx=kx0+24+dside*(reach+40), ty=118;
        flightP=flight(tx,ty,540,true).then(()=>tween(260,t=>{ball.setAttribute('cy',118+70*t*t);ball.setAttribute('cx',tx-dside*18*t);}));
      }else{
        /* the keeper went the wrong way and the ball still stayed out: off the post */
        const px=side<0?GOAL_L:GOAL_R;
        flightP=flight(px,120,540,true).then(()=>tween(300,t=>{ball.setAttribute('cx',px-side*(120*t));ball.setAttribute('cy',120+120*t*t);}));
      }
      await Promise.all([dive,flightP]);
      kicker.setAttribute('transform','translate(196 214)');
      flash.textContent=o.goal?'GOAL':(sameWay?'SAVED':'OFF THE POST');
      flash.setAttribute('font-size',o.goal?'64':'48');
      await tween(220,t=>flash.setAttribute('opacity',t));
      busy=false;
    }
    /* a word across the goal, outside a kick (the live game's KICK TAKEN) */
    function flashText(t){flash.textContent=t;flash.setAttribute('font-size','48');flash.setAttribute('opacity','1');}
    reset();
    return {svg,kits,stand,kick,reset,flashText,get pos(){return pos;}};
  }

  return {RATE,h01,goal,readKicker,soloDive,soloStep,soloReplay,rateAt,goalAt,ZONE,zoneOf,KITS,kit,keeperKit,Scene,wait};
})();
