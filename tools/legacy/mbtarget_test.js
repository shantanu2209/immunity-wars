const { JSDOM } = require("jsdom");
const fs=require("fs");
const dom=new JSDOM('<!doctype html><body><div id="app"></div></body>',{runScripts:"dangerously",pretendToBeVisual:true});
const w=dom.window,d=w.document;
// live-ish state: two invaders, only one is a valid neutralise target
w.U={ invaders:[
  {id:"v1",disease:"Influenza",type:"virus",zone:"route",lane:"nose",step:2},
  {id:"b1",disease:"Pneumonia",type:"bacteria",zone:"branch",organ:"lungs",step:1},
]};
w.sel={mode:"neutralise",kind:"cell",key:"bcell"};
w.ue=s=>String(s);
w.MB={ONAME:{lungs:"Lungs"},ENAME:{nose:"Nose"}};
let hitWith=null; w.hit=iv=>{ hitWith=iv.id; };
w.targetable=iv=>iv.id==="v1";   // only the virus is neutralisable right now
const s=d.createElement("script"); s.textContent=fs.readFileSync("client_mobile.js","utf8"); d.body.appendChild(s);
const $=x=>d.querySelector(x), $$=x=>[...d.querySelectorAll(x)];
const P=[],F=[]; const ck=(n,c)=>(c?P:F).push(n);
w.mbPickTarget("neutralise");
ck("picker renders only VALID targets", $$(".mbTargetRow").length===1);
ck("picker names the valid target", /Influenza/.test(d.body.textContent) && !/Pneumonia/.test(($(".mbTargetRow")||{}).textContent||"Pneumonia-absent"));
ck("target row is wired to mbHitTarget", /mbHitTarget\('v1'\)/.test(d.body.innerHTML));
w.mbHitTarget("v1");
ck("tapping a target calls hit() with that invader", hitWith==="v1");
ck("picker clears after a hit", ($("#mbTargetOv")||{}).className!=="mbDrawerOv on");
// empty case
w.targetable=()=>false; w.mbPickTarget("tag");
ck("empty picker shows a helpful reason", /No valid target/.test(d.body.textContent));
console.log("\n=== MOBILE TARGET PICKER (item 2) ===");
P.forEach(x=>console.log("  [pass] "+x)); F.forEach(x=>console.log("  [FAIL] "+x));
console.log("\n"+P.length+" passed, "+F.length+" failed.");
process.exit(F.length?1:0);
