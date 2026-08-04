const { JSDOM } = require("jsdom");
const G = require("./v2_engine.js");
const fs = require("fs");

// real game driven into the allocation phase, with real threats
const g=G.newGame({difficulty:"normal",multiplayer:true,captain:"P1",players:["P1","P2"],
  owner:{macrophage:"P1",tcell:"P1",bcell:"P2",res_lungs:"P2"}});
g.invaders=[
  {id:1,zone:"branch",organ:"lungs",step:1,type:"bacteria",disease:"Tuberculosis"},
  {id:2,zone:"route",lane:"gut",step:2,type:"bacteria",disease:"Cholera"},
];
g.phase="infection"; g.drawn={dz:"Tuberculosis"};
G.applyAction(g,{action:"beginCommand",pid:"P1"});                       // -> allocation
G.applyAction(g,{action:"allocateAP",pid:"P1",toPid:"P2",amount:2});      // give P2 two
const U=G.viewState(g);

const dom=new JSDOM('<!doctype html><body><div id="app"></div><div id="netlayer"></div></body>',{runScripts:"dangerously",pretendToBeVisual:true});
const w=dom.window, d=w.document;
Object.assign(w,{
  U, me:{pid:"P1"},
  members:[{pid:"P1",name:"Cap",color:"#c084fc"},{pid:"P2",name:"Diya",color:"#a3e635"}],
  group:[{from:"Diya",fromPid:"P2",color:"#a3e635",text:"I need 2 AP for the T-Cell",mentions:[]}],
  sysLog:[], iAmCaptain:()=>true,
  ART:{organ:{},path:{},cell:{}},
  UM:{macrophage:{n:"Monocyte",g:"M"},neutrophil:{n:"Neutrophil",g:"N"},bcell:{n:"B-Cell",g:"B"},tcell:{n:"Killer T-Cell",g:"T"},helper:{n:"Helper T",g:"H"},nk:{n:"NK",g:"K"},eosinophil:{n:"Eosinophil",g:"E"}},
  ORGANS:G.ORGANS, ROUTES:G.ROUTES, famOf:G.famOf, FAST_DISEASE:G.FAST_DISEASE, CELL_KEYS:G.CELL_KEYS, VACCINE_COST:G.VACCINE_COST,
  allocateAP:()=>{}, returnAP:()=>{}, confirmAllocation:()=>{}, askGame:()=>{}, toggleFAQ:()=>{}, onChatInput:()=>{},
});
[["client_mobile.js"],["client_render.js"]].forEach(([f])=>{ const s=d.createElement("script"); s.textContent=fs.readFileSync(f,"utf8"); d.body.appendChild(s); });

const paint=()=>{ d.getElementById("netlayer").innerHTML=w.allocationUI(); w.renderChat(); };
const $=s=>d.querySelector(s), $$=s=>[...d.querySelectorAll(s)];
const P=[],F=[]; const ck=(n,c)=>(c?P:F).push(n);
let err=null; try{ paint(); }catch(e){ err=e; }
ck("allocationUI renders without error", !err); if(err) console.log("  ERROR:",err.message);
ck("situation-room header present", /Situation room/.test(($(".allocHead")||{}).textContent||""));
ck("shared threat picture shows chips", $$(".threatChips .tchip").length>=2);
ck("threats colour-coded (a red one present)", !!$(".tchip.t-red"));
ck("a distribution row per player (2)", $$(".allocDist .allocrow").length===2);
ck("rows show each player's seats", /Monocyte|Killer T-Cell/.test(($(".allocrow .seats")||{}).textContent||"") || $$(".allocrow .seats").length===2);
ck("AP values reflect real budgets (P2 has 2)", /2/.test([...$$(".allocrow .apval")].map(e=>e.textContent).join(" ")));
ck("captain sees +1/+3 give buttons", /\+1/.test($(".allocDist").textContent)&&/\+3/.test($(".allocDist").textContent));
ck("captain sees Confirm plan", /Confirm plan/.test($(".allocDist").textContent));
ck("chat is embedded and PERMANENT (composer present)", !!$(".allocChat #chatIn")&&!!$(".allocChat #chatBody"));
ck("chat shows a teammate message", /need 2 AP/.test(($(".allocChat #chatBody")||{}).textContent||""));
// player (non-captain) view
w.iAmCaptain=()=>false; w.me.pid="P2"; paint();
ck("non-captain sees waiting note, no confirm", /Waiting for/.test($(".allocDist").textContent)&&!/Confirm plan/.test($(".allocDist").textContent));
ck("non-captain with AP sees 'give back'", /give 1 back/.test($(".allocDist").textContent));
console.log("\n=== ALLOCATION SITUATION-ROOM ===");
P.forEach(x=>console.log("  [pass] "+x));
if(F.length){ console.log("\n  FAILURES:"); F.forEach(x=>console.log("  [FAIL] "+x)); }
console.log("\n"+P.length+" passed, "+F.length+" failed.");
process.exit(F.length?1:0);
