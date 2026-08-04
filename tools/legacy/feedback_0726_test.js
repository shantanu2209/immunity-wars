/* Regression suite for the 26-07-2026 playtest feedback (items 1-5 + capture T15). */
const G=require("./v2_engine.js"); const fs=require("fs");
const P=[],F=[]; const ck=(n,c)=>(c?P:F).push(n);
const UI=fs.readFileSync("v2_ui.html","utf8"), MOB=fs.readFileSync("client_mobile.js","utf8");

// 1 — the TOX antibody card must not claim to cover venom
ck("1 TOX card no longer titled 'TOXin / venom'", !/TOXin \/ venom/.test(UI));
ck("1 TOX card no longer lists Snake venom as a target", !/eg:\["Diphtheria","Botulism","Snake venom"/.test(UI));
ck("1 TOX card says venom needs ANTIVENOM", /Venom is NOT covered/.test(UI));
{ const g=G.newGame({difficulty:"normal"}); g.ab.TOX=9;
  ck("1 engine still refuses to neutralise venom",
     G.canNeutralise(g,{id:"v",type:"venom",disease:"Snake venom",zone:"hub",step:0,tagged:false,hp:1,maxhp:1})===false); }

// 2a — Th2 help: +1 eosinophil step while co-located with a PRIMED helper; brain still clamps
function reach(withHelper, primed, organ){
  const g=G.newGame({difficulty:"normal"}); g.presentations=primed?3:0;
  const o=organ||"lungs";
  g.cells.eosinophil={alive:true,zone:"branch",organ:o,step:2,lane:null};
  g.cells.helper = withHelper ? {zone:"branch",organ:o,step:2,lane:null,usedThisTurn:false}
                              : {zone:"hub",organ:null,step:0,lane:null,usedThisTurn:false};
  const d=G.moveDestinations(g,"eosinophil").filter(x=>x.zone==="branch"&&x.organ===o);
  return Math.max(0,...d.map(x=>Math.abs(x.step-2)));
}
ck("2a eosinophil alone = 1 step", reach(false,true)===1);
ck("2a primed helper on the same spot = 2 steps", reach(true,true)===2);
ck("2a UNPRIMED helper gives nothing", reach(true,false)===1);
ck("2a blood-brain barrier still clamps to 1", reach(true,true,"brain")===1);

// 2b — Th17 help: neutrophil regen 4 -> 2 while a primed helper is in the blood
function regen(helperInBlood){
  const g=G.newGame({difficulty:"normal"}); g.presentations=3; g.phase="command"; g.ap=5;
  g.cells.neutrophil={alive:true,zone:"route",lane:"gut",step:3,organ:null,regenAt:null};
  g.cells.helper = helperInBlood ? {zone:"hub",organ:null,step:0,lane:null,usedThisTurn:false}
                                 : {zone:"branch",organ:"lungs",step:1,lane:null,usedThisTurn:false};
  const at=o=>Object.assign({id:"i"+Math.random(),zone:"route",lane:"gut",step:3,tagged:false,hp:1,maxhp:1,age:0,embed:0},o);
  g.invaders=[at({type:"bacteria",disease:"Cholera"}),at({type:"bacteria",disease:"Typhoid"})];
  if(!G.applyAction(g,{action:"net",cell:"neutrophil"}).ok) return "netfail";
  const spent=g.turn;
  for(let i=0;i<12;i++){ G.applyAction(g,{action:"endCommand"}); G.applyAction(g,{action:"draw"}); G.applyAction(g,{action:"beginCommand"});
    if(g.cells.neutrophil.alive) return g.turn-spent; }
  return "never";
}
ck("2b regen without help = 4 turns", regen(false)===4);
ck("2b regen with a primed helper in the blood = 2 turns", regen(true)===2);
{ const g=G.newGame({difficulty:"normal"}); g.presentations=0;
  g.cells.helper={zone:"hub",organ:null,step:0,lane:null,usedThisTurn:false};
  ck("2b an UNPRIMED helper does not speed regen", G.helperInBlood(g)===false); }

// 3 — a suppressed cell must be unselectable in both UIs
ck("3 board has a cellOffline() gate", /function cellOffline\(/.test(UI));
ck("3 board blocks selecting an offline cell", (UI.match(/const off=cellOffline\(cell\)/g)||[]).length===2);
ck("3 board offers no actions for an offline cell", /if\(_off\) return `<div class="hnt"/.test(UI));
ck("3 mobile marks suppressed cells offline", /offline:!!sup/.test(MOB));
ck("3 mobile explains the block on tap", /OFFLINE — neutropenia/.test(MOB));
{ const g=G.newGame({difficulty:"normal"}); g.phase="command"; g.ap=5;
  G.applyEvent(g,"neutropenia");
  ck("3 engine still refuses a suppressed neutrophil",
     !G.applyAction(g,{action:"move",cell:"neutrophil",zone:"route",lane:"gut",step:5}).ok); }

// 4 — acute-phase surge = +2 AP this turn, and it says so
{ const g=G.newGame({difficulty:"normal"}); const base=G.viewState(g).apMax;
  G.applyEvent(g,"surge");
  ck("4 surge = +2 AP", G.viewState(g).apMax===base+2);
  ck("4 surge banner states the effect", /\+2 Action Points this turn/.test(G.viewState(g).banner.why)); }

// 5 — capture T15: neutralising a toxin DID cost 2 AP; the bar just didn't show it
{ const g=G.newGame({difficulty:"normal"}); g.phase="command"; g.ab.TOX=2;
  G.applyEvent(g,"surge"); g.ap=G.viewState(g).apMax;
  const before=g.ap;
  g.invaders=[{id:"t1",type:"toxin",disease:"Anthrax",zone:"route",lane:"wound",step:5,tagged:false,hp:1,maxhp:1,age:0,embed:0,stage:null}];
  const r=G.applyAction(g,{action:"neutralise",invaderId:"t1"});
  ck("5 toxin neutralise succeeds during a surge", r.ok);
  ck("5 it costs 2 AP even at 7 AP ("+before+" -> "+g.ap+")", g.ap===before-2); }
ck("5 AP bar now shows a number, not just pips", /class="apNum/.test(UI));
ck("5 AP bar marks event-bonus pips", /i>=baseAP\?'bonus':''/.test(UI));

console.log("\n=== 26-07 FEEDBACK REGRESSION ===");
P.forEach(x=>console.log("  [pass] "+x)); F.forEach(x=>console.log("  [FAIL] "+x));
console.log("\n"+P.length+" passed, "+F.length+" failed.");
process.exit(F.length?1:0);
