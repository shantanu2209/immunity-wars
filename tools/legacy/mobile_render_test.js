const { JSDOM } = require("jsdom");
const G = require("./v2_engine.js");
const fs = require("fs");

// --- real game + crafted invaders, real viewState ---
const g=G.newGame({difficulty:"normal",multiplayer:true,captain:"P1",players:["P1"],
  owner:{macrophage:"P1",tcell:"P1",res_lungs:"P1"}});
g.invaders=[
  {id:1,zone:"branch",organ:"lungs",step:1,type:"bacteria",disease:"Tuberculosis"},
  {id:2,zone:"branch",organ:"liver",step:0,type:"malaria",disease:"Malaria"},
  {id:3,zone:"route",lane:"gut",step:1,type:"bacteria",disease:"Cholera"},
  {id:4,zone:"route",lane:"bite",step:2,type:"venom",disease:"Snake venom"},
  {id:5,zone:"hub",type:"virus",disease:"Influenza"},
];
g.phase="command";
const U=G.viewState(g);

const dom=new JSDOM('<!doctype html><body><div id="app"></div></body>',{runScripts:"dangerously",pretendToBeVisual:true});
const w=dom.window, d=w.document;
const calls=[];
Object.assign(w,{
  U, me:{pid:"P1"},
  ownsSeat:s=>({macrophage:1,tcell:1,res_lungs:1})[s]===1,
  iAmCaptain:()=>true,
  openBranchPanel:(o)=>calls.push("branch:"+o),
  openLanePanel:(k,key)=>calls.push("lane:"+k+":"+key),
  openBloodstream:()=>calls.push("hub"),
  act:(o)=>calls.push("act:"+o.action),
  ART:{organ:{},path:{},cell:{}},
  UM:{macrophage:{n:"Monocyte",g:"M"},neutrophil:{n:"Neutrophil",g:"N"},bcell:{n:"B-Cell",g:"B"},
      tcell:{n:"Killer T-Cell",g:"T"},helper:{n:"Helper T",g:"H"},nk:{n:"NK",g:"K"},eosinophil:{n:"Eosinophil",g:"E"}},
  ORGANS:G.ORGANS, ROUTES:G.ROUTES, famOf:G.famOf, FAST_DISEASE:G.FAST_DISEASE,
  CELL_KEYS:G.CELL_KEYS, VACCINE_COST:G.VACCINE_COST,
});
const sc=d.createElement("script"); sc.textContent=fs.readFileSync("client_mobile.js","utf8"); d.body.appendChild(sc);

const $=s=>d.querySelector(s), $$=s=>[...d.querySelectorAll(s)];
const P=[],F=[]; const ck=(n,c)=>(c?P:F).push(n);
let err=null;
try{ w.renderMobileHome(); }catch(e){ err=e; }
ck("renderMobileHome runs without error", !err); if(err) console.log("  ERROR:",err.message);
ck("five-zone layout present", !!$(".mbPlay .mbTop")&&!!$(".mbPlay .mbMid .lrail")&&!!$(".mbPlay .mmstage .mmbox")&&!!$(".mbPlay .mbMid .rrail")&&!!$(".mbPlay .mbBottom"));
ck("body silhouette references body.png", ($(".mmbox .mmbody")||{}).getAttribute&&$(".mmbox .mmbody").getAttribute("src")==="body.png");
ck("RED halos on lungs, liver, gut", !!$("#mk-organ-lungs.t-red")&&!!$("#mk-organ-liver.t-red")&&!!$("#mk-entry-gut.t-red"));
ck("AMBER halos on bite + hub", !!$("#mk-entry-bite.t-amber")&&!!$("#mk-hub.t-amber"));
ck("calm organ has no threat class", !$("#mk-organ-brain.t-red")&&!$("#mk-organ-brain.t-amber"));
ck("left rail shows 5 pathogen pips", $$(".lrail .lpip").length===5);
ck("right rail shows only my 3 controllables", $$(".rrail .ctok").length===3);
ck("bottom micro-arsenal has 6 classes", $$(".mbBottom .arsenal .ac").length===6);
ck("captain sees the phase BUTTON (End the turn)", !!$(".mbPhase")&&!$(".mbPhase.wait")&&/End the turn/.test($(".mbPhase").textContent));
// tap wiring
calls.length=0; w.mbShowPath(0); ck("tapping top threat opens its panel (Malaria→liver branch)", calls.includes("branch:liver"));
calls.length=0; w.mbSelCtrl(0); ck("tapping my Monocyte opens the bloodstream (it's at the hub)", calls.includes("hub"));
w.mbDrawer("log"); ck("log drawer opens", !!$("#mbDrawer .logrow")||!!$("#mbDrawer .pbody"));
w.mbDrawer("adaptive"); ck("adaptive drawer shows the arsenal grid", !!$("#mbDrawer .abgrid"));
w.mbCloseDrawer();
// non-captain
w.iAmCaptain=()=>false; w.renderMobileHome();
ck("non-captain sees the phase button GREYED (disabled), not a status line",
   !!$(".mbPhase.disabled") && !$(".mbPhase.wait") && /End the turn/.test(($(".mbPhase.disabled")||{}).textContent||""));
ck("non-captain greyed button warns instead of acting", /Only the captain/.test(($(".mbPhase.disabled")||{}).getAttribute("onclick")||""));
console.log("\n=== MOBILE HOME (live state) ===");
P.forEach(x=>console.log("  [pass] "+x));
if(F.length){ console.log("\n  FAILURES:"); F.forEach(x=>console.log("  [FAIL] "+x)); }
console.log("\n"+P.length+" passed, "+F.length+" failed.");
process.exit(F.length?1:0);
