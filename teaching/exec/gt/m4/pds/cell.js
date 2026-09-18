/* Module 4's closing exercise, the shared half: the wire, the words, and the
   prisoners. Loaded by the deck (with block.js, the cell block), by the phone
   page and mirrored by trial/m4.js. Nothing here touches the DOM.

   Ryan's picture (18 Sep 2026, second version the same evening): a prison.
   Every dilemma is a pair of prisoners in stripes who step off the bus, walk
   up to an empty cell and are locked in; a click opens the cell large with
   the dilemma chalked on the wall. On the second touch, in the walk, each
   cell plays its escape large (a tunnel dug a little at a time, the warden's
   key turning and the door swinging, the bars sawn through, or the door
   staying shut) and then the pair breaks out of the block: up through the
   ground outside the wall, out through the gate, or down a rope from the
   gallery. Whoever is still in a cell at the end is the room's stuck
   dilemmas.

   The room is m4-pds (?room=<x> suffixes it). Each phone sends one line per
   card, because the Worker keeps 200 characters a line:

     1‖your side‖the other side‖name   the name since the exercise went solo
                                       (18 Sep); a line from a group phone
                                       before that has no name and still draws
     2‖the collective action
     3‖the individual action
     5‖r|e|p|n                         the way out, once the deck has posted
                                       ::routes into the room
     (4‖ was the horizon, cut by Ryan on 16 Sep; ignored if an old phone sends it)

   The latest line of each number wins, so a re-send corrects. All wording
   here is Claude's, for veto. */
(function(root){
  const ROUTES={r:['Make it repeat','Turn a one-off into a relationship with no known end'],
                e:['Bring in an enforcer','A contract, a regulator, a boss: someone who makes defecting cost'],
                p:['Change the payoffs','Make the collective action pay more, or defecting pay less'],
                n:['There is no way out','It stays a dilemma, and the best you can do is not defect first']};
  /* what the tally says once a cell has played its escape */
  const ESCAPED={r:'Tunnelled out',e:'Let out by the warden',p:'Sawed through the bars',n:'Still inside'};
  /* the same, said to the phone's owner */
  const ESCAPED_YOU={r:'You tunnelled out',e:'The warden let you out',p:'You sawed through the bars',n:'You are still inside'};
  /* the model, Ryan's case (16 Sep): the no-poach agreement, cell 1 on the block, never counted with the room's */
  const MODEL={v:'model',model:true,name:'',a:'Apple',b:'Google',hold:'Don’t poach the rival’s talent',defect:'Poach talent from the rival',rt:'m'};
  const MODEL_OUT='They formed a cartel, and the DOJ punished them.'; /* Ryan's line, 16 Sep */

  function parse(entries){
    const by=new Map();
    (entries||[]).forEach(e=>{const m=/^([1-5])‖([\s\S]*)$/.exec(String(e.t||''));if(!m)return;
      if(!by.has(e.v))by.set(e.v,{v:e.v,name:'',a:'',b:'',hold:'',defect:'',rt:''});
      const g=by.get(e.v), t=m[2].trim();
      if(m[1]==='1'){const p=t.split('‖');g.a=(p[0]||'').trim();g.b=(p[1]||'').trim();g.name=(p[2]||'').trim();}
      else if(m[1]==='2')g.hold=t;else if(m[1]==='3')g.defect=t;
      else if(m[1]==='5'){if(ROUTES[t])g.rt=t;}});
    return [...by.values()].filter(g=>g.a&&g.b&&g.hold&&g.defect);
  }
  const routesOpen=entries=>(entries||[]).some(e=>e.t==='::routes');

  /* ---- the prisoner: an Isotype figure in black and white stripes, 80 wide by 128 tall in its own units.
     One spec, built two ways: as markup for the opened cell, as nodes for the block. ---- */
  const INK='#1B1C19', PAPER='#E9E2D2';
  const WALL='#2A2825', MORTAR='#3B3833', FLOOR='#3E3630', CHALK='#E9E2D2', BAR='#D9C5AD', EARTH='#5B4636', HOLE='#0E0D0C', BRASS='#C9A227', TEAL='#59949C', TERRA='#C4673D';
  /* the body is a trapezoid from 17..63 at y 46 to 25..55 at y 92; a band at height y runs between its edges */
  const bx=(y,side)=>side<0?17+(y-46)*(8/46):63-(y-46)*(8/46);
  const band=(y0,y1)=>[[bx(y0,-1),y0],[bx(y0,1),y0],[bx(y1,1),y1],[bx(y1,-1),y1]].map(p=>p.map(n=>+n.toFixed(1)).join(',')).join(' ');
  const SPEC=[
    ['rect',{x:27,y:2,width:26,height:9,rx:2,fill:PAPER,stroke:INK,'stroke-width':2}],
    ['rect',{x:27,y:5,width:26,height:3,fill:INK}],
    ['circle',{cx:40,cy:22,r:13,fill:INK}],
    ['path',{d:'M17 46 Q40 36 63 46 L55 92 L25 92 Z',fill:PAPER,stroke:INK,'stroke-width':2,'stroke-linejoin':'round'}],
    ['polygon',{points:band(50,57),fill:INK}],['polygon',{points:band(64,71),fill:INK}],['polygon',{points:band(78,85),fill:INK}],
    ['rect',{x:26,y:92,width:12,height:36,fill:PAPER,stroke:INK,'stroke-width':2}],['rect',{x:42,y:92,width:12,height:36,fill:PAPER,stroke:INK,'stroke-width':2}],
    ['rect',{x:26,y:99,width:12,height:6,fill:INK}],['rect',{x:42,y:99,width:12,height:6,fill:INK}],
    ['rect',{x:26,y:113,width:12,height:6,fill:INK}],['rect',{x:42,y:113,width:12,height:6,fill:INK}]
  ];
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const cut=(t,n)=>{t=String(t||'');return t.length>n?t.slice(0,n-1).trim()+'…':t;};
  const prisonerSVG=()=>SPEC.map(([tag,at])=>'<'+tag+' '+Object.keys(at).map(k=>k+'="'+at[k]+'"').join(' ')+'/>').join('');
  function prisonerNodes(parent){
    const NS='http://www.w3.org/2000/svg';
    SPEC.forEach(([tag,at])=>{const e=document.createElementNS(NS,tag);for(const k in at)e.setAttribute(k,at[k]);parent.appendChild(e);});
  }

  /* ---- the opened cell, 520×300: the wall up close, the door on the left, the pair with their sides under them.
     o.esc r|e|p|n|m plays the escape (CSS below); the chalk is HTML beside it, in the deck. ---- */
  function bigSVG(o){
    o=o||{};
    let h='<svg class="cellsvg" viewBox="0 0 520 300" aria-hidden="true">';
    h+='<rect width="520" height="300" fill="'+WALL+'"/>';
    h+='<g stroke="'+MORTAR+'" stroke-width="1.6" fill="none"><path d="M0 60 H520 M0 120 H520 M0 180 H520 M0 240 H520"/><path d="M160 0 V60 M300 0 V60 M440 0 V60 M120 60 V120 M240 60 V120 M380 60 V120 M170 120 V180 M330 120 V180 M470 120 V180 M130 180 V240 M270 180 V240 M410 180 V240"/></g>';
    h+='<rect y="276" width="520" height="24" fill="'+FLOOR+'"/>';
    h+='<rect x="430" y="22" width="60" height="40" fill="'+BAR+'" opacity=".28"/><path d="M450 22 V62 M470 22 V62" stroke="'+WALL+'" stroke-width="4"/>';
    h+='<g class="tally" stroke="'+CHALK+'" stroke-width="3" stroke-linecap="round" fill="none" opacity="0"><path d="M440 216 v22 M452 216 v22 M464 216 v22 M476 216 v22 M434 236 L482 218"/></g>';
    h+='<ellipse class="tunnel" cx="230" cy="284" rx="70" ry="13" fill="'+HOLE+'"/><path class="mound" d="M330 284 q34 -34 72 0 z" fill="'+EARTH+'"/>';
    h+='<g class="fig figA"><g transform="translate(130,150) scale(.95)">'+prisonerSVG()+'</g></g>';
    h+='<g class="fig figB"><g transform="translate(300,150) scale(.95)">'+prisonerSVG()+'</g></g>';
    if(o.names){
      h+='<text x="168" y="293" text-anchor="middle" font-family="Jost,sans-serif" font-weight="700" font-size="13" letter-spacing="1" fill="'+TEAL+'">'+esc(cut(o.names[0],16).toUpperCase())+'</text>';
      h+='<text x="338" y="293" text-anchor="middle" font-family="Jost,sans-serif" font-weight="700" font-size="13" letter-spacing="1" fill="'+TERRA+'">'+esc(cut(o.names[1],16).toUpperCase())+'</text>';
    }
    h+='<g class="bars" stroke="'+BAR+'" stroke-width="7" fill="none" stroke-linecap="round">';
    h+='<g class="door"><path d="M14 -4 V304 M34 -4 V110 M34 190 V304 M54 -4 V110 M54 190 V304 M74 -4 V304 M14 40 H74 M14 236 H74"/><path class="cut" d="M34 110 V190 M54 110 V190"/></g>';
    h+='<path d="M100 -4 V304" stroke-width="11"/><circle cx="100" cy="150" r="11" fill="'+BAR+'" stroke="none"/><circle cx="100" cy="148" r="3.2" fill="'+WALL+'" stroke="none"/><path d="M100 150 v6" stroke="'+WALL+'" stroke-width="3"/>';
    h+='</g>';
    h+='<g class="saw" fill="none"><path d="M20 150 H70" stroke="'+BAR+'" stroke-width="8"/><path d="M22 155 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6" stroke="'+BAR+'" stroke-width="3"/><path d="M70 150 h12 v-12 h-6" stroke="'+EARTH+'" stroke-width="8" stroke-linecap="round"/></g>';
    h+='<g class="key" fill="none" stroke="'+BRASS+'" stroke-width="4.5"><circle cx="100" cy="150" r="8"/><path d="M100 158 v20 h9 v-6 h-9"/></g>';
    return h+'</svg>';
  }

  /* the escapes in the opened cell, as CSS on .jc.esc-<route>; every moving part is an SVG group with
     transform-box:fill-box so the rules hold at any size; the door is on the left, so out is leftward */
  const CSS=[
    '.jc svg.cellsvg{display:block;width:100%;height:100%}',
    '.jc .fig,.jc .bars,.jc .door,.jc .tunnel,.jc .mound,.jc .key,.jc .saw,.jc .cut,.jc .tally{transform-box:fill-box}',
    '.jc .fig{transform-origin:center bottom}',
    /* r: the tunnel, dug a little at a time */
    '.jc .tunnel,.jc .mound{transform-origin:center bottom;opacity:0}',
    '.jc.esc-r .tunnel,.jc.esc-r .mound{animation:jdig 2.4s steps(4,end) both}',
    '@keyframes jdig{from{transform:scale(0);opacity:1}to{transform:none;opacity:1}}',
    '.jc.esc-r .fig{animation:jdown .9s 2.5s ease-in both}',
    '@keyframes jdown{to{transform:translateY(34%) scale(.25);opacity:0}}',
    /* e: the warden's key turns, the door swings */
    '.jc .key{transform-origin:center;opacity:0}',
    '.jc.esc-e .key{animation:jturn 1s .3s ease-in-out both}',
    '@keyframes jturn{from{opacity:1;transform:rotate(0)}to{opacity:1;transform:rotate(90deg)}}',
    '.jc .door{transform-origin:left center}',
    '.jc.esc-e .door{animation:jopen .9s 1.4s ease-out both}',
    '@keyframes jopen{to{transform:scaleX(.08)}}',
    '.jc.esc-e .fig{animation:jout 1s 2.3s ease-in both}',
    '@keyframes jout{to{transform:translateX(-260%);opacity:0}}',
    /* p: the bars are sawn through */
    '.jc .saw{opacity:0}',
    '.jc.esc-p .saw{animation:jsaw 2s .2s ease-in-out both}',
    '@keyframes jsaw{0%{opacity:1;transform:translateX(0)}20%{transform:translateX(-16%)}40%{transform:translateX(0)}60%{transform:translateX(-16%)}80%{transform:translateX(0)}95%{opacity:1}100%{opacity:0;transform:translateX(0)}}',
    '.jc.esc-p .cut{animation:jcut .2s 2.2s both}',
    '@keyframes jcut{to{opacity:0}}',
    '.jc.esc-p .fig{animation:jthrough 1s 2.4s ease-in both}',
    '@keyframes jthrough{to{transform:translateX(-260%) scale(1.1);opacity:0}}',
    /* n: no way out, the door stays shut */
    '.jc .tally{opacity:0}',
    '.jc.esc-n .fig{animation:jsit .8s ease-out both}',
    '@keyframes jsit{to{transform:translateY(6%) scale(1,.94)}}',
    '.jc.esc-n .tally{animation:jchalk .6s .8s both}',
    '@keyframes jchalk{from{opacity:0}to{opacity:1}}',
    /* m: the model. They walked out by agreement, and the warden marched them back in */
    '.jc.esc-m .door{animation:jmdoor 3.4s ease-in-out both}',
    '@keyframes jmdoor{0%{transform:none}25%{transform:scaleX(.08)}60%{transform:scaleX(.08)}70%{transform:none}100%{transform:none}}',
    '.jc.esc-m .fig{animation:jmfig 3.4s ease-in-out both}',
    '@keyframes jmfig{0%{transform:none}35%{transform:translateX(-120%)}55%{transform:translateX(-120%)}68%{transform:none}100%{transform:none}}',
    '.jc.esc-m .key{animation:jmkey 3.4s both}',
    '@keyframes jmkey{0%,72%{opacity:0;transform:rotate(0)}80%{opacity:1;transform:rotate(0)}100%{opacity:1;transform:rotate(90deg)}}'
  ].join('\n');
  /* how long each opened-cell escape runs, so the walk knows when the pair can break out of the block */
  const ESC_MS={r:3500,e:3400,p:3500,n:1600,m:3500};

  root.M4_CELL={ROUTES,ESCAPED,ESCAPED_YOU,MODEL,MODEL_OUT,parse,routesOpen,bigSVG,prisonerSVG,prisonerNodes,CSS,ESC_MS,cut};
})(typeof window!=='undefined'?window:globalThis);
