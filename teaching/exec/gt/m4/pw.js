/* Price Wars, run by Ryan in person (29 Sep 2026, his design). Aura's teams
   sit in the room and Buco's in the hall; each week he goes team to team,
   asks for the price and taps it on his phone (m4/desk/), and tells each
   team what its rival posted by tapping Reveal in front of it. The teams'
   phones (m4/price/) only display: the week's payoff matrix, their own
   price once Ryan has tapped it, the rival's once he has revealed it, and
   the running revenue. Teams tap nothing. Before weeks 3 and 5 comes a
   meeting round of its own: Ryan walks it team to team, asking whether they
   want to meet and who would go, and taps the answer and the rep's name.

   RYAN MOVES THE GAME ON, never the phones (his corrections, 29 Sep 2026):
   a team's phone stays on its week, showing its price and, once he has told
   it, the rival's, until he moves that team on (Move A1 to week 2, at the
   team) or everyone at once from the board. The stages: week 1, week 2, the
   meeting round, week 3, week 4, the stop for the news, the meeting round,
   week 5, week 6, the end. A team's stage is the later of its own and the
   room's.

   Everything is one append-only log of lines in the gt-poll room
   m4-results (the room the results slide and the Poll Desk already know),
   each beginning "pw|". Lines only ever add or overwrite (the last line for
   a thing wins), so a line sent twice or late changes nothing, and the desk
   and every phone rebuild the same game from the same lines:
     pw|g|N           the game starts, with N junctions, in week 1 (desk)
     pw|st|w2         Ryan moves everyone on: w1–w6, m3 and m5 (the meeting
                      rounds), stop (after week 4, for the news), end
     pw|ts|a3|w2      Ryan moves one team on
     pw|p|a3|2|h      Aura at junction 3 posted £1.50 in week 2 (c = £1.40)
     pw|t|a3|2        Aura at junction 3 has been told its rival's week 2
     pw|q|a3|3|y|Sam  Aura at junction 3 wants to meet before week 3, and sends Sam (n = no)
     pw|mc|3|1,3      the meeting round before week 3 closes; junctions 1 and 3 met
     pw|j|a3|<phone>|Ana,Ben  a phone joined Aura, junction 3, and said who is on the team (phones)
   The results slide still reads its own "r|…" lines, which the desk writes
   once all six weeks are in, and an "rm|…" line naming each meeting's reps. Scoring is the deck's, in thousands of pounds. */
(function(){
const PW={};
PW.API='https://gt-poll.rlamare.workers.dev';
PW.ROOM='m4-results'+(()=>{const r=(new URLSearchParams(location.search).get('room')||'').replace(/[^a-z0-9-]/g,'');return r?'-'+r:'';})();
PW.NAME={a:'Aura Fuels',b:'Buco’s Petrol'};
PW.SHORT={a:'Aura',b:'Buco’s'};
PW.PRICE={h:'£1.50',c:'£1.40'};
PW.GATES=[3,5];   /* a meeting round comes before each of these weeks */
PW.STAGES=['w1','w2','m3','w3','w4','stop','m5','w5','w6','end'];
PW.idx=s=>PW.STAGES.indexOf(s);
/* what Ryan's buttons do from each stage (the board's moves everyone) */
PW.NEXT={w1:['w2','Move everyone to week 2'],w2:['m3','Move everyone to the meeting round'],m3:['w3','Open week 3'],
  w3:['w4','Move everyone to week 4'],w4:['stop','Stop everyone for the news'],stop:['m5','The news is out'],
  m5:['w5','Open week 5'],w5:['w6','Move everyone to week 6'],w6:['end','End the game']};

/* the deck's scoring: an ordinary week 12/12, 18 against 2, 9/9; week 3 doubles;
   from week 5 the FuelWatch rules (undercutting alone pays 72, week 6 no longer doubles) */
PW.rev=(w,m,t)=>w>=5?(m==='c'&&t==='h'?72:m==='h'&&t==='c'?2:m==='h'?12:9):(m===t?(m==='h'?12:9):(m==='c'?18:2))*(w===3?2:1);
/* the week's matrix, rows Aura, columns Buco's, each cell [Aura, Buco's] */
PW.matrix=w=>[['h','h'],['h','c'],['c','h'],['c','c']].map(([a,b])=>[PW.rev(w,a,b),PW.rev(w,b,a)]);
PW.tagOf=w=>w===3?'Pays double':w>=5?'FuelWatch rules':'';

PW.parse=function(lines){
  const G={nj:0,stage:'',tstage:{},price:{},told:{},ans:{},rep:{},mc:{},news:false,joins:{},members:{}};
  const by={};   /* each phone's latest join: a phone that picks again moves */
  lines.forEach(line=>{
    const f=String(line).split('|');if(f[0]!=='pw')return;
    const team=/^[ab][1-6]$/.test(f[2]||'')?f[2]:null, w=+f[3];
    switch(f[1]){
      case 'g':if(/^[1-6]$/.test(f[2])){G.nj=+f[2];G.stage='w1';}break;
      case 'st':if(PW.STAGES.includes(f[2])){G.stage=f[2];if(PW.idx(f[2])>=PW.idx('m5'))G.news=true;}break;
      case 'ts':if(team&&PW.STAGES.includes(f[3])&&PW.idx(f[3])>PW.idx(G.tstage[team]||'w1'))G.tstage[team]=f[3];break;
      case 'p':if(team&&w>=1&&w<=6&&/^[hc]$/.test(f[4]))(G.price[team]=G.price[team]||[])[w]=f[4];break;
      case 't':if(team&&w>=1&&w<=6)(G.told[team]=G.told[team]||[])[w]=true;break;
      case 'q':if(team&&(w===3||w===5)&&/^[yn]$/.test(f[4])){(G.ans[team]=G.ans[team]||{})[w]=f[4];(G.rep[team]=G.rep[team]||{})[w]=f[4]==='y'?(f[5]||'').trim():'';}break;
      case 'mc':{const g=+f[2];if(g===3||g===5)G.mc[g]=(f[3]||'').split(',').filter(x=>/^[1-6]$/.test(x)).map(Number);break;}
      case 'j':if(team)by[f[3]||('old'+Math.random())]={team,names:(f[4]||'').split(',').map(n=>n.trim()).filter(Boolean)};break;
    }
  });
  Object.values(by).forEach(({team,names})=>{
    G.joins[team]=(G.joins[team]||0)+1;
    const m=G.members[team]=G.members[team]||[];
    names.forEach(n=>{if(!m.some(x=>x.toLowerCase()===n.toLowerCase()))m.push(n);});
  });
  return G;
};
PW.teams=G=>{const T=[];['a','b'].forEach(s=>{for(let j=1;j<=G.nj;j++)T.push(s+j);});return T;};
PW.rival=t=>(t[0]==='a'?'b':'a')+t.slice(1);
PW.p=(G,t,w)=>(G.price[t]||[])[w]||null;
PW.isTold=(G,t,w)=>!!(G.told[t]||[])[w];
PW.allIn=(G,w)=>G.nj>0&&PW.teams(G).every(t=>PW.p(G,t,w));
/* a team's stage: the later of its own move and the room's */
PW.stageOf=(G,t)=>{const a=G.tstage[t]||'', b=G.stage||'w1';return PW.idx(a)>PW.idx(b)?a:b;};
PW.weekOf=(G,t)=>{const s=PW.stageOf(G,t);return /^w[1-6]$/.test(s)?+s[1]:0;};
/* the room: the stage of the team furthest behind */
PW.minStage=G=>PW.teams(G).reduce((m,t)=>{const s=PW.stageOf(G,t);return m===null||PW.idx(s)<PW.idx(m)?s:m;},null)||G.stage||'w1';
PW.week=G=>{const s=PW.minStage(G);return /^w[1-6]$/.test(s)?+s[1]:0;};
PW.inRound=(G,t,g)=>PW.stageOf(G,t)==='m'+g;
PW.meets=(G,g,j)=>(G.ans['a'+j]||{})[g]==='y'&&(G.ans['b'+j]||{})[g]==='y';
PW.ans=(G,t,g)=>(G.ans[t]||{})[g]||null;
PW.rep=(G,t,g)=>(G.rep[t]||{})[g]||'';
/* a team whose rival has said no is not asked: one no settles the junction */
PW.settled=(G,t,g)=>!!PW.ans(G,t,g)||PW.ans(G,PW.rival(t),g)==='n';
PW.clean=n=>String(n||'').replace(/[|,\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,30);
/* what a team has earned: only the weeks it has been told */
PW.earned=(G,t)=>{let s=0;for(let w=1;w<=6;w++)if(PW.isTold(G,t,w)&&PW.p(G,t,w)&&PW.p(G,PW.rival(t),w))s+=PW.rev(w,PW.p(G,t,w),PW.p(G,PW.rival(t),w));return s;};
/* the first week this team has not yet been told, and whether Ryan can reveal it now */
PW.nextReveal=(G,t)=>{for(let w=1;w<=6;w++){if(PW.isTold(G,t,w))continue;return PW.p(G,t,w)&&PW.p(G,PW.rival(t),w)?w:0;}return 0;};
PW.over=G=>G.nj>0&&PW.teams(G).every(t=>PW.stageOf(G,t)==='end');

PW.voter=function(){let v=null;try{v=localStorage.getItem('gt-voter');if(!v){v=([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));localStorage.setItem('gt-voter',v);}}catch(_){v='v'+Math.random().toString(36).slice(2,12)+Date.now().toString(36);}return v;};
PW.entries=()=>fetch(PW.API+'/p/'+PW.ROOM+'/entries',{cache:'no-store'}).then(r=>{if(!r.ok)throw 0;return r.json();}).then(d=>d.entries||[]);
PW.say=(v,t)=>fetch(PW.API+'/p/'+PW.ROOM+'/say',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({v,t})}).then(r=>{if(!r.ok)throw r.status;return true;});

/* the matrix as HTML, this team's numbers in its own colour */
PW.matrixHTML=function(w,mine){
  const M=PW.matrix(w), c=(i)=>'<td class="c"><span class="a'+(mine==='a'?' me':'')+'">'+M[i][0]+'</span><span class="s">,</span><span class="b'+(mine==='b'?' me':'')+'">'+M[i][1]+'</span></td>';
  return '<table class="pm"><tr><th></th><th></th><th class="ax b" colspan="2">Buco&rsquo;s</th></tr>'+
    '<tr><th></th><th></th><th>&pound;1.50</th><th>&pound;1.40</th></tr>'+
    '<tr><th class="ax a" rowspan="2">Aura</th><th>&pound;1.50</th>'+c(0)+c(1)+'</tr>'+
    '<tr><th>&pound;1.40</th>'+c(2)+c(3)+'</tr></table>';
};
window.PW=PW;
})();
