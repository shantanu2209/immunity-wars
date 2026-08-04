/* Regression suite for the 27-07-2026 playtest feedback. */
const G=require("./v2_engine.js"); const fs=require("fs");
const P=[],F=[]; const ck=(n,c)=>(c?P:F).push(n);
const UI=fs.readFileSync("v2_ui.html","utf8");

// ---- WORM CAPS: max 1 per turn, max 2 per game, all difficulties ----
for(const diff of ["training","normal","hard"]){
  let worstGame=0, worstTurn=0;
  for(let r=0;r<200;r++){
    const g=G.newGame({difficulty:diff}); g.phase="infection"; g.drawn=null;
    for(let t=0;t<30;t++){
      G.applyAction(g,{action:"draw"});      worstTurn=Math.max(worstTurn,g.wormsThisTurn||0);
      G.applyAction(g,{action:"beginCommand"}); worstTurn=Math.max(worstTurn,g.wormsThisTurn||0);
      G.applyAction(g,{action:"endCommand"});   worstTurn=Math.max(worstTurn,g.wormsThisTurn||0);
    }
    worstGame=Math.max(worstGame,g.wormsSpawned||0);
  }
  ck("worms: "+diff+" never exceeds 2 per game (saw "+worstGame+")", worstGame<=2);
  ck("worms: "+diff+" never exceeds 1 per turn (saw "+worstTurn+")", worstTurn<=1);
}
// a worm past the cap is REPLACED, not dropped — infection pressure is unchanged
{ const g=G.newGame({difficulty:"hard"}); g.wormsSpawned=2;
  const c=G.respectWormCap(g,{dz:"Hookworm",type:"worm",lane:"wound"});
  ck("worm past the cap is swapped for a non-worm card", c && c.type!=="worm"); }
{ const g=G.newGame({difficulty:"hard"});
  const c=G.respectWormCap(g,{dz:"Hookworm",type:"worm",lane:"wound"});
  ck("a worm under the cap passes through untouched", c.dz==="Hookworm"); }
// co-infection cannot smuggle in an extra worm
{ let over=false;
  for(let i=0;i<200;i++){ const g=G.newGame({difficulty:"hard"}); g.wormsSpawned=2;
    g.deck=[{dz:"Hookworm",type:"worm",lane:"wound"},{dz:"Cholera",type:"bacteria",lane:"gut"}];
    G.applyEvent(g,"coInfection");
    if((g.wormsSpawned||0)>2 || g.invaders.some(iv=>iv.type==="worm")) over=true; }
  ck("co-infection respects the worm cap", !over); }
// the Force tool deliberately bypasses the caps (testing)
{ const g=G.newGame({difficulty:"hard"}); g.wormsSpawned=2;
  const iv=G.forceInjectCard(g,"Hookworm");
  ck("Force still injects a worm past the cap (testing tool)", !!iv && iv.type==="worm"); }

// ---- BURST releases the organism's own form ----
function burst(dz){
  for(let i=0;i<500;i++){
    const g=G.newGame({difficulty:"normal"}); g.phase="command";
    g.invaders=[G.makeInvader(g,{dz,type:"hidden",lane:"gut"})];
    G.applyAction(g,{action:"endCommand"});
    const c=g.invaders.filter(x=>x.disease===dz && x.type!=="hidden");
    if(c.length) return c[0];
  }
  return null;
}
{ const t=burst("Toxoplasmosis"), ch=burst("Chagas disease"), v=burst("Chickenpox");
  ck("Toxoplasmosis bursts into a PARASITE, not a virus", t && t.type==="parasite");
  ck("released protozoa are weakened (hp 1 of 2)", t && t.hp===1 && t.maxhp===2);
  ck("Chagas disease also bursts into a parasite", ch && ch.type==="parasite");
  ck("a real virus still bursts into viruses", v && v.type==="virus"); }
// no EUK organism should ever carry a virus type again
{ let bad=null;
  for(let r=0;r<150 && !bad;r++){
    const g=G.newGame({difficulty:"hard"}); g.phase="infection"; g.drawn=null;
    for(let t=0;t<25;t++){ G.applyAction(g,{action:"draw"}); G.applyAction(g,{action:"beginCommand"}); G.applyAction(g,{action:"endCommand"});
      const b=g.invaders.find(iv=>(iv.type==="virus"||iv.type==="hidden") && G.famOf(iv)==="EUK" && iv.type==="virus");
      if(b){ bad=b; break; } } }
  ck("no EUK pathogen is ever typed 'virus'", !bad); }

// ---- TEXT: fungi cannot be coated ----
ck("fungus advice no longer says 'Coat it'", !/fungus:   "Coat it, then engulf/.test(UI));
ck("fungus advice says it CANNOT be coated", /It CANNOT be coated/.test(UI));
ck("hidden advice notes protozoa hide in cells too", /Toxoplasmosis and Chagas disease are PROTOZOA/.test(UI));
{ const g=G.newGame({difficulty:"normal"}); g.ab.EUK=5;
  ck("engine still refuses to coat a fungus",
     G.canTag(g,{id:"f",type:"fungus",disease:"Ringworm",zone:"hub",step:0,tagged:false,hp:2,maxhp:2})===false); }

// ---- helper-licensing notes are surfaced ----
ck("UI explains an unprimed helper on the eosinophil", /not yet primed/.test(UI) && /\+1 step/.test(UI));
ck("UI explains the Th17 neutrophil speed-up", /IL-17 → G-CSF|G-CSF/.test(UI));

// ---- toxins: unchanged, and the rules are what we told the user ----
{ const g=G.newGame({difficulty:"normal"});
  const mk=o=>Object.assign({id:"b"+Math.random(),type:"bacteria",zone:"route",lane:"wound",step:3,tagged:false,hp:1,maxhp:1,age:0,embed:0,stage:null},o);
  g.phase="command";
  const free=mk({id:"tetFree",disease:"Tetanus"}), coated=mk({id:"tetCoat",disease:"Tetanus",tagged:true});
  g.invaders=[free,coated];
  for(let t=0;t<6;t++){ G.applyAction(g,{action:"endCommand"}); G.applyAction(g,{action:"draw"}); G.applyAction(g,{action:"beginCommand"}); }
  const f2=g.invaders.find(iv=>iv.id==="tetFree"), c2=g.invaders.find(iv=>iv.id==="tetCoat");
  ck("an UNTAGGED toxin-maker releases a toxin", !!f2 && f2.emitted===true);
  ck("a COATED toxin-maker never releases one", !!c2 && !c2.emitted);
  ck("coating also freezes the toxin countdown", !!c2 && (c2.age||0)===0); }


// ---- the case SC asked about: co-infection worm + a drawn worm in the SAME turn ----
{ let worstTurn=0, worstGame=0, both=0;
  for(let r=0;r<300;r++){
    const g=G.newGame({difficulty:"hard"}); g.phase="infection"; g.drawn=null;
    for(let t=0;t<20;t++){
      if(g.won||g.lost) break;
      const b0=g.wormsSpawned||0;
      G.applyEvent(g,"coInfection");           // force the event on this very turn
      const b1=g.wormsSpawned||0;
      G.applyAction(g,{action:"draw"});
      const b2=g.wormsSpawned||0;
      if(b1>b0 && b2>b1) both++;               // event AND draw both produced a worm
      worstTurn=Math.max(worstTurn,g.wormsThisTurn||0);
      G.applyAction(g,{action:"beginCommand"}); G.applyAction(g,{action:"endCommand"});
    }
    worstGame=Math.max(worstGame,g.wormsSpawned||0);
  }
  ck("co-infection + draw never both make a worm in one turn", both===0);
  ck("co-infection pressure still respects 1 worm/turn", worstTurn<=1);
  ck("co-infection pressure still respects 2 worms/game", worstGame<=2); }

// ---- absolute worst case: a deck of NOTHING BUT worms ----
{ let worstTurn=0, worstGame=0, liveStall=0;
  for(let r=0;r<200;r++){
    const g=G.newGame({difficulty:"hard"});
    g.deck=Array.from({length:60},(_,i)=>({dz:["Hookworm","Tapeworm","Roundworm","Whipworm"][i%4],type:"worm",lane:"wound"}));
    g.discard=[]; g.phase="infection"; g.drawn=null;
    for(let t=0;t<12;t++){
      if(g.won||g.lost) break;
      G.applyEvent(g,"coInfection");
      G.applyAction(g,{action:"draw"});
      const bc=G.applyAction(g,{action:"beginCommand"});
      if(!bc.ok && !g.won && !g.lost) liveStall++;
      worstTurn=Math.max(worstTurn,g.wormsThisTurn||0);
      G.applyAction(g,{action:"endCommand"});
    }
    worstGame=Math.max(worstGame,g.wormsSpawned||0);
  }
  ck("all-worm deck: still never 2 worms in a turn", worstTurn<=1);
  ck("all-worm deck: still never 3 worms in a game", worstGame<=2);
  ck("all-worm deck: the turn never stalls", liveStall===0); }
{ const g=G.newGame({difficulty:"hard"}); g.wormsSpawned=2;
  g.deck=[{dz:"Hookworm",type:"worm",lane:"wound"}]; g.discard=[];
  ck("no non-worm anywhere -> spawn nothing rather than break the cap",
     G.respectWormCap(g,{dz:"Tapeworm",type:"worm",lane:"gut"})===null); }

console.log("\n=== 27-07 FEEDBACK REGRESSION ===");
P.forEach(x=>console.log("  [pass] "+x)); F.forEach(x=>console.log("  [FAIL] "+x));
console.log("\n"+P.length+" passed, "+F.length+" failed.");
process.exit(F.length?1:0);
