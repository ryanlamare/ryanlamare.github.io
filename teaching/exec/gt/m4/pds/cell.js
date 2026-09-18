/* Module 4's closing exercise, the shared half: what a cell is. Loaded by the
   deck (the prison wall on The room's dilemmas and How would you get out of
   yours?), by the phone page (so a phone builds its own cell and watches it
   escape) and mirrored by trial/m4.js. Nothing here touches the DOM.

   Ryan's picture (18 Sep 2026): a prisoner's dilemma is a cell. Two prisoners,
   the teal and the terracotta of the interrogation-room slide, walk into a
   cell as a dilemma lands and the door shuts. The collective and individual
   actions are chalked on the wall, the payoff matrix is the chalk drawing.
   The second touch plays each cell's escape: make it repeat is a tunnel dug a
   little at a time; bring in an enforcer is the warden's key turning and the
   door swinging; change the payoffs is the bars sawn through; no way out is
   the door staying shut. Cells still shut at the end are the dilemmas the
   room is stuck in.

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
  /* what the wall says once a cell has played its escape */
  const ESCAPED={r:'Tunnelled out',e:'Let out by the warden',p:'Sawed through the bars',n:'Still inside'};
  /* the same, said to the phone's owner */
  const ESCAPED_YOU={r:'You tunnelled out',e:'The warden let you out',p:'You sawed through the bars',n:'You are still inside'};
  /* the model, Ryan's case (16 Sep): the no-poach agreement, the first cell on the wall, never counted with the room's */
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

  /* ---- the drawing ---- */
  const WALL='#2A2825', MORTAR='#3B3833', FLOOR='#3E3630', CHALK='#E9E2D2', BAR='#D9C5AD', EARTH='#5B4636', HOLE='#0E0D0C', BRASS='#C9A227', TEAL='#59949C', TERRA='#C4673D';
  const FIG='<circle cx="40" cy="20" r="14"/><path d="M17 46 Q40 36 63 46 L55 92 L25 92 Z"/><rect x="26" y="92" width="12" height="36"/><rect x="42" y="92" width="12" height="36"/>';
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const cut=(t,n)=>{t=String(t||'');return t.length>n?t.slice(0,n-1).trim()+'…':t;};

  /* o.big      the opened cell (520×300, the door on the left, room for chalk on the right)
     o.parts    which parts exist yet: {a,b,hold,defect,bars} (the phone builds it answer by answer)
     o.in       which of those animate in now (the rest are already there)
     o.late     the bars slam after the prisoners have walked in (a landing on the deck)
     o.esc      r|e|p|n|m: the escape to play; o.done: show its end state with nothing moving
     o.names    write the two sides under the prisoners (the opened cell) */
  function svg(o){
    o=o||{};const P=Object.assign({a:true,b:true,hold:true,defect:true,bars:true},o.parts||{}), I=o.in||{};
    const cls=(name,on)=>name+(on?' in':'');
    const part=(name,on,inner)=>on?'<g class="'+name+'">'+inner+'</g>':'';
    if(o.big)return bigSVG(o,P,I,cls,part);
    /* the small cell: 200×100, bars across the front, the door on the right */
    let h='<svg class="cellsvg" viewBox="0 0 200 100" aria-hidden="true">';
    h+='<rect width="200" height="100" fill="'+WALL+'"/>';
    h+='<g stroke="'+MORTAR+'" stroke-width="1.2" fill="none"><path d="M0 24 H200 M0 48 H200 M0 72 H200"/><path d="M34 0 V24 M96 0 V24 M150 0 V24 M18 24 V48 M70 24 V48 M120 24 V48 M172 24 V48 M50 48 V72 M104 48 V72 M160 48 V72"/></g>';
    h+='<rect y="86" width="200" height="14" fill="'+FLOOR+'"/>';
    h+='<rect x="150" y="9" width="30" height="20" fill="'+BAR+'" opacity=".28"/><path d="M160 9 V29 M170 9 V29" stroke="'+WALL+'" stroke-width="2.5"/>';
    /* the chalk: two lines of writing, then the matrix */
    h+=part(cls('chalk chalk1',I.hold),P.hold,'<path d="M16 22 h56 M16 30 h40" stroke="'+CHALK+'" stroke-width="2.2" stroke-linecap="round" opacity=".75" fill="none"/>');
    h+=part(cls('chalk chalk2',I.defect),P.defect,'<path d="M16 42 h48 M16 50 h30" stroke="'+CHALK+'" stroke-width="2.2" stroke-linecap="round" opacity=".75" fill="none"/>'+
      '<g stroke="'+CHALK+'" stroke-width="1.6" fill="none" opacity=".8"><rect x="120" y="38" width="62" height="40"/><path d="M151 38 V78 M120 58 H182"/></g>'+
      '<rect x="122" y="40" width="27" height="16" fill="none" stroke="#8CCB9B" stroke-width="2"/><rect x="153" y="60" width="27" height="16" fill="none" stroke="#FF7A7A" stroke-width="2"/>');
    h+='<g class="tally" stroke="'+CHALK+'" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0"><path d="M92 64 v10 M97 64 v10 M102 64 v10 M107 64 v10 M89 73 L110 65"/></g>';
    h+='<ellipse class="tunnel" cx="60" cy="92" rx="26" ry="6" fill="'+HOLE+'"/><path class="mound" d="M92 92 q14 -14 30 0 z" fill="'+EARTH+'"/>';
    h+=part(cls('fig figA',I.a),P.a,'<g transform="translate(26,32) scale(.4)" fill="'+TEAL+'">'+FIG+'</g>');
    h+=part(cls('fig figB',I.b),P.b,'<g transform="translate(66,32) scale(.4)" fill="'+TERRA+'">'+FIG+'</g>');
    if(P.bars){
      h+='<g class="'+cls('bars',I.bars)+(o.late?' late':'')+'" stroke="'+BAR+'" stroke-width="4" fill="none" stroke-linecap="round">';
      h+='<path d="M6 -2 V102 M92 -2 V102 M6 16 H92 M6 72 H92"/>';
      h+='<path d="M27.5 -2 V34 M27.5 66 V102 M49 -2 V34 M49 66 V102 M70.5 -2 V102"/><path class="cut" d="M27.5 34 V66 M49 34 V66"/>';
      h+='<g class="door"><path d="M113 -2 V102 M135 -2 V102 M157 -2 V102 M179 -2 V102 M113 16 H179 M113 72 H179"/></g>';
      h+='<path d="M197 -2 V102" stroke-width="6"/><circle cx="190" cy="52" r="6" fill="'+BAR+'" stroke="none"/><circle cx="190" cy="51" r="1.8" fill="'+WALL+'" stroke="none"/><path d="M190 52 v3" stroke="'+WALL+'" stroke-width="1.6"/>';
      h+='</g>';
      h+='<g class="saw" fill="none"><path d="M18 50 H58" stroke="'+BAR+'" stroke-width="5"/><path d="M20 53 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4" stroke="'+BAR+'" stroke-width="1.8"/><path d="M58 50 h8 v-7 h-4" stroke="'+EARTH+'" stroke-width="5" stroke-linecap="round"/></g>';
      h+='<g class="key" fill="none" stroke="'+BRASS+'" stroke-width="2.6"><circle cx="190" cy="52" r="4.5"/><path d="M190 56.5 v11 h5 v-3.5 h-5"/></g>';
    }
    return h+'</svg>';
  }
  function bigSVG(o,P,I,cls,part){
    let h='<svg class="cellsvg" viewBox="0 0 520 300" aria-hidden="true">';
    h+='<rect width="520" height="300" fill="'+WALL+'"/>';
    h+='<g stroke="'+MORTAR+'" stroke-width="1.6" fill="none"><path d="M0 60 H520 M0 120 H520 M0 180 H520 M0 240 H520"/><path d="M160 0 V60 M300 0 V60 M440 0 V60 M120 60 V120 M240 60 V120 M380 60 V120 M170 120 V180 M330 120 V180 M470 120 V180 M130 180 V240 M270 180 V240 M410 180 V240"/></g>';
    h+='<rect y="276" width="520" height="24" fill="'+FLOOR+'"/>';
    h+='<rect x="430" y="22" width="60" height="40" fill="'+BAR+'" opacity=".28"/><path d="M450 22 V62 M470 22 V62" stroke="'+WALL+'" stroke-width="4"/>';
    h+='<g class="tally" stroke="'+CHALK+'" stroke-width="3" stroke-linecap="round" fill="none" opacity="0"><path d="M440 216 v22 M452 216 v22 M464 216 v22 M476 216 v22 M434 236 L482 218"/></g>';
    h+='<ellipse class="tunnel" cx="230" cy="284" rx="70" ry="13" fill="'+HOLE+'"/><path class="mound" d="M330 284 q34 -34 72 0 z" fill="'+EARTH+'"/>';
    h+=part(cls('fig figA',I.a),P.a,'<g transform="translate(130,150) scale(.95)" fill="'+TEAL+'">'+FIG+'</g>');
    h+=part(cls('fig figB',I.b),P.b,'<g transform="translate(300,150) scale(.95)" fill="'+TERRA+'">'+FIG+'</g>');
    if(o.names){
      h+='<text x="168" y="293" text-anchor="middle" font-family="Jost,sans-serif" font-weight="700" font-size="13" letter-spacing="1" fill="'+TEAL+'">'+esc(cut(o.names[0],16).toUpperCase())+'</text>';
      h+='<text x="338" y="293" text-anchor="middle" font-family="Jost,sans-serif" font-weight="700" font-size="13" letter-spacing="1" fill="'+TERRA+'">'+esc(cut(o.names[1],16).toUpperCase())+'</text>';
    }
    if(P.bars){
      h+='<g class="'+cls('bars',I.bars)+(o.late?' late':'')+'" stroke="'+BAR+'" stroke-width="7" fill="none" stroke-linecap="round">';
      h+='<g class="door"><path d="M14 -4 V304 M34 -4 V110 M34 190 V304 M54 -4 V110 M54 190 V304 M74 -4 V304 M14 40 H74 M14 236 H74"/><path class="cut" d="M34 110 V190 M54 110 V190"/></g>';
      h+='<path d="M100 -4 V304" stroke-width="11"/><circle cx="100" cy="150" r="11" fill="'+BAR+'" stroke="none"/><circle cx="100" cy="148" r="3.2" fill="'+WALL+'" stroke="none"/><path d="M100 150 v6" stroke="'+WALL+'" stroke-width="3"/>';
      h+='</g>';
      h+='<g class="saw" fill="none"><path d="M20 150 H70" stroke="'+BAR+'" stroke-width="8"/><path d="M22 155 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6" stroke="'+BAR+'" stroke-width="3"/><path d="M70 150 h12 v-12 h-6" stroke="'+EARTH+'" stroke-width="8" stroke-linecap="round"/></g>';
      h+='<g class="key" fill="none" stroke="'+BRASS+'" stroke-width="4.5"><circle cx="100" cy="150" r="8"/><path d="M100 158 v20 h9 v-6 h-9"/></g>';
    }
    return h+'</svg>';
  }

  /* the animations, shared by the deck and the phone. Every moving part is an
     SVG group moved by a CSS transform with transform-box:fill-box, so the
     same rules work at any size. --out is which way the prisoners leave
     (right in the small cell, left in the big one, the door's side) and --d
     staggers a wall of escapes. */
  const CSS=[
    '.jc{--out:160%;--step:60%;--d:0s}.jc.big{--out:-260%;--step:-120%}',
    '.jc svg.cellsvg{display:block;width:100%;height:100%}',
    '.jc .fig,.jc .bars,.jc .door,.jc .chalk,.jc .tunnel,.jc .mound,.jc .key,.jc .saw,.jc .cut,.jc .tally{transform-box:fill-box}',
    '.jc .fig{transform-origin:center bottom}',
    '.jc .fig.in{animation:jwalk .9s ease-out both}.jc .figB.in{animation-delay:.25s}',
    '@keyframes jwalk{from{transform:translateX(-140%);opacity:0}to{transform:none;opacity:1}}',
    '.jc .chalk.in{animation:jchalk .7s ease-out both}',
    '@keyframes jchalk{from{opacity:0}to{opacity:1}}',
    '.jc .bars{transform-origin:center top}.jc .bars.in{animation:jslam .3s cubic-bezier(.7,0,1,1) both}.jc .bars.in.late{animation-delay:1.25s}',
    '@keyframes jslam{from{transform:translateY(-104%)}to{transform:none}}',
    /* r: the tunnel, dug a little at a time */
    '.jc .tunnel,.jc .mound{transform-origin:center bottom;opacity:0}',
    '.jc.esc-r .tunnel,.jc.esc-r .mound{animation:jdig 2.4s steps(4,end) both;animation-delay:var(--d)}',
    '@keyframes jdig{from{transform:scale(0);opacity:1}to{transform:none;opacity:1}}',
    '.jc.esc-r .fig{animation:jdown .9s ease-in both;animation-delay:calc(2.5s + var(--d))}',
    '@keyframes jdown{to{transform:translateY(34%) scale(.25);opacity:0}}',
    /* e: the warden's key turns, the door swings */
    '.jc .key{transform-origin:center;opacity:0}',
    '.jc.esc-e .key{animation:jturn 1s ease-in-out both;animation-delay:calc(.3s + var(--d))}',
    '@keyframes jturn{from{opacity:1;transform:rotate(0)}to{opacity:1;transform:rotate(90deg)}}',
    '.jc .door{transform-origin:left center}',
    '.jc.esc-e .door{animation:jopen .9s ease-out both;animation-delay:calc(1.4s + var(--d))}',
    '@keyframes jopen{to{transform:scaleX(.08)}}',
    '.jc.esc-e .fig{animation:jout 1s ease-in both;animation-delay:calc(2.3s + var(--d))}',
    '@keyframes jout{to{transform:translateX(var(--out));opacity:0}}',
    /* p: the bars are sawn through */
    '.jc .saw{opacity:0}',
    '.jc.esc-p .saw{animation:jsaw 2s ease-in-out both;animation-delay:calc(.2s + var(--d))}',
    '@keyframes jsaw{0%{opacity:1;transform:translateX(0)}20%{transform:translateX(-16%)}40%{transform:translateX(0)}60%{transform:translateX(-16%)}80%{transform:translateX(0)}95%{opacity:1}100%{opacity:0;transform:translateX(0)}}',
    '.jc.esc-p .cut{animation:jcut .2s both;animation-delay:calc(2.2s + var(--d))}',
    '@keyframes jcut{to{opacity:0}}',
    '.jc.esc-p .fig{animation:jthrough 1s ease-in both;animation-delay:calc(2.4s + var(--d))}',
    '@keyframes jthrough{to{transform:translateX(var(--out)) scale(1.1);opacity:0}}',
    /* n: no way out, the door stays shut */
    '.jc .tally{opacity:0}',
    '.jc.esc-n .fig{animation:jsit .8s ease-out both;animation-delay:var(--d)}',
    '@keyframes jsit{to{transform:translateY(6%) scale(1,.94)}}',
    '.jc.esc-n .tally{animation:jchalk .6s both;animation-delay:calc(.8s + var(--d))}',
    /* m: the model. They walked out by agreement, and the warden marched them back in */
    '.jc.esc-m .door{animation:jmdoor 3.4s ease-in-out both;animation-delay:var(--d)}',
    '@keyframes jmdoor{0%{transform:none}25%{transform:scaleX(.08)}60%{transform:scaleX(.08)}70%{transform:none}100%{transform:none}}',
    '.jc.esc-m .fig{animation:jmfig 3.4s ease-in-out both;animation-delay:var(--d)}',
    '@keyframes jmfig{0%{transform:none}35%{transform:translateX(var(--step))}55%{transform:translateX(var(--step))}68%{transform:none}100%{transform:none}}',
    '.jc.esc-m .key{animation:jmkey 3.4s both;animation-delay:var(--d)}',
    '@keyframes jmkey{0%,72%{opacity:0;transform:rotate(0)}80%{opacity:1;transform:rotate(0)}100%{opacity:1;transform:rotate(90deg)}}',
    /* done: the end state, nothing moving */
    '.jc.done *{animation:none!important}',
    '.jc.done.esc-r .tunnel,.jc.done.esc-r .mound{opacity:1;transform:none}.jc.done.esc-r .fig{opacity:0}',
    '.jc.done.esc-e .key{opacity:1;transform:rotate(90deg)}.jc.done.esc-e .door{transform:scaleX(.08)}.jc.done.esc-e .fig{opacity:0}',
    '.jc.done.esc-p .cut{opacity:0}.jc.done.esc-p .fig{opacity:0}',
    '.jc.done.esc-n .fig{transform:translateY(6%) scale(1,.94)}.jc.done.esc-n .tally{opacity:1}',
    '.jc.done.esc-m .key{opacity:1;transform:rotate(90deg)}'
  ].join('\n');

  root.M4_CELL={ROUTES,ESCAPED,ESCAPED_YOU,MODEL,MODEL_OUT,parse,routesOpen,svg,CSS,cut};
})(typeof window!=='undefined'?window:globalThis);
