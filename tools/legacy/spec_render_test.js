const { JSDOM } = require("jsdom");
const G = require("./v2_engine.js");
const fs = require("fs");
const g=G.newGame({difficulty:"normal",multiplayer:true,captain:"P1",players:["P1"]});
g.invaders=[
  {id:1,zone:"branch",organ:"lungs",step:1,type:"bacteria",disease:"Tuberculosis"},
  {id:2,zone:"hub",type:"virus",disease:"Influenza"},
];
g.phase="command"; g.turn=7; g.ap=3; if(g.organs.lungs) g.organs.lungs.hp=1;
const U=G.viewState(g);
const dom=new JSDOM('<!doctype html><body><div id="app"></div></body>',{runScripts:"dangerously",pretendToBeVisual:true});
const w=dom.window,d=w.document;
Object.assign(w,{
  U, buildBody:()=>{}, drawOrgans:()=>{}, tokens:()=>{}, ue:s=>String(s), abPanel:()=>"", newG:()=>{}, draw:()=>{},
  CELL_KEYS:G.CELL_KEYS, FAMILIES:G.FAMILIES, FAMILY:G.FAMILY, ORGANS:G.ORGANS, ROUTES:G.ROUTES,
  UI_:{virus:{g:"V"},bacteria:{g:"B"},toxin:{g:"T"},venom:{g:"Y"},fungus:{g:"F"},worm:{g:"W"},malaria:{g:"P"},parasite:{g:"Z"},hidden:{g:"H"}},
  UM:{macrophage:{n:"Monocyte",g:"M"},neutrophil:{n:"Neutrophil",g:"N"},bcell:{n:"B-Cell",g:"B"},tcell:{n:"Killer T-Cell",g:"T"},helper:{n:"Helper T",g:"H"},nk:{n:"NK",g:"K"},eosinophil:{n:"Eosinophil",g:"E"}},
});
const s=d.createElement("script"); s.textContent=fs.readFileSync("spec.js","utf8"); d.body.appendChild(s);
const $=x=>d.querySelector(x);
const P=[],F=[]; const ck=(n,c)=>(c?P:F).push(n);
let err=null;
try{ w.specShell(); w.specDraw(); }catch(e){ err=e; }
ck("specShell + specDraw run without error", !err); if(err) console.log("  ERROR:",err.message,"\n",(err.stack||"").split("\n")[1]);
ck("landscape layout built (gutters + centred body + log)", !!$("#specLeft")&&!!$("#specRight")&&!!$("#bodyInner")&&!!$("#specLog")&&!!$("#specStatus"));
ck("status strip shows the turn", /7/.test(($("#specStatus")||{}).textContent||""));
ck("left gutter shows the threats (from live invaders)", /Tuberculosis|Influenza/.test(($("#specLeft")||{}).textContent||"")||/Tuberculosis|Influenza/.test(d.body.textContent));
ck("a gutter shows the seat roster (cell names)", /Monocyte|Killer T-Cell|B-Cell/.test(d.body.textContent));
ck("passive: title marks it a spectator board", /spectator|everyone plays on phones/i.test(d.body.textContent));
console.log("\n=== SPECTATOR BOARD (live state) ===");
P.forEach(x=>console.log("  [pass] "+x));
if(F.length){ console.log("\n  FAILURES:"); F.forEach(x=>console.log("  [FAIL] "+x)); }
console.log("\n"+P.length+" passed, "+F.length+" failed.");
process.exit(F.length?1:0);
