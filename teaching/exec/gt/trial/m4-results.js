/* Robots for Module 4's results slide, What happened at each junction
   (21 Sep 2026). Each robot is one team's phone at the end of Price Wars:
   it plays six weeks against the other station at its junction and then
   does the one thing the real phone does, Send to the screen (one /say
   line to the gt-poll room, r|station|junction|mine|theirs|met).

     node teaching/exec/gt/trial/m4-results.js [suffix] [junctions] [seconds between sends]

   suffix     the rehearsal room: "robots" sends to m4-results-robots, which
              the deck reads at m4/?room=robots#6. Pass "LIVE" to send to the
              real room m4-results (then reset it from the Poll Desk).
   junctions  how many, default 6
   seconds    the gap between phones, default 0; try 2 to watch the rows land

   Each team plays a plain rule (hold, cut, tit for tat, grudger, hold until
   the news, or a coin), asks to meet or not, and a junction that met mostly
   keeps its word in the week after. Every run is different. */
const API='https://gt-poll.rlamare.workers.dev';
const [suf='robots',nJ='6',gap='0']=process.argv.slice(2);
const ROOM=suf==='LIVE'?'m4-results':'m4-results-'+suf.replace(/[^a-z0-9-]/g,'');
const RULES={
  hold:()=> 'h',
  cut:()=> 'c',
  tft:(w,them)=>w===1?'h':them[w-2],
  grudger:(w,them)=>them.includes('c')?'c':'h',
  news:(w)=>w>=5?'c':'h',
  coin:()=>Math.random()<.5?'h':'c',
};
const pick=a=>a[Math.floor(Math.random()*a.length)];
function junction(){
  const ra=pick(Object.keys(RULES)), rb=pick(Object.keys(RULES)), a=[], b=[], met=[false,false];
  for(let w=1;w<=6;w++){
    let kept=false;
    if(w===3||w===5){const askA=Math.random()<.7, askB=Math.random()<.7;
      if(askA&&askB){met[w===3?0:1]=true;kept=true;}}
    let ma=RULES[ra](w,b), mb=RULES[rb](w,a);
    if(kept){if(Math.random()<.75)ma='h';if(Math.random()<.75)mb='h';}   /* a promise, mostly kept */
    a.push(ma);b.push(mb);
  }
  return {a:a.join(''),b:b.join(''),met:met.map(m=>m?'y':'n').join(''),ra,rb};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function say(v,t){
  const r=await fetch(API+'/p/'+ROOM+'/say',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({v,t})});
  return r.ok;
}
(async()=>{
  const run=Date.now().toString(36);
  console.log('room',ROOM);
  for(let j=1;j<=+nJ;j++){
    const g=junction();
    for(const s of ['a','b']){
      const t=['r',s,j,s==='a'?g.a:g.b,s==='a'?g.b:g.a,g.met].join('|');
      const ok=await say('robot-'+run+'-'+s+j,t);
      console.log(ok?'sent':'FAILED',t,'('+(s==='a'?g.ra:g.rb)+')');
      if(+gap)await sleep(+gap*1000);
    }
  }
  console.log(suf==='LIVE'?'Open m4/#6. Reset m4-results from the Poll Desk afterwards.':'Open m4/?room='+suf+'#6');
})();
