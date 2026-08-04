const { JSDOM } = require("jsdom");
const fs = require("fs");
const dom=new JSDOM('<!doctype html><body><div id="app"></div></body>',{runScripts:"dangerously",pretendToBeVisual:true});
const w=dom.window, d=w.document;
Object.assign(w,{ connected:true, chooseMode:()=>{}, switchToDisplay:()=>{} });
const s=d.createElement("script"); s.textContent=fs.readFileSync("client_render.js","utf8"); d.body.appendChild(s);
const $=x=>d.querySelector(x), $$=x=>[...d.querySelectorAll(x)];
const P=[],F=[]; const ck=(n,c)=>(c?P:F).push(n);
let err=null; try{ w.renderModeScreen(); }catch(e){ err=e; }
ck("renderModeScreen runs", !err); if(err) console.log("  ERROR:",err.message);
ck("two mode options", $$(".modeOpt").length===2);
ck("Multiplayer + Single player titles", /Multiplayer/.test(d.body.textContent)&&/Single player/.test(d.body.textContent));
ck("multiplayer routes via chooseMode('multi')", /chooseMode\('multi'\)/.test(d.body.innerHTML));
ck("single-player routes via chooseMode('solo')", /chooseMode\('solo'\)/.test(d.body.innerHTML));
ck("table-display link present", /switchToDisplay\(\)/.test(d.body.innerHTML));
console.log("\n=== MODE SCREEN ==="); P.forEach(x=>console.log("  [pass] "+x));
if(F.length){ console.log("\n  FAILURES:"); F.forEach(x=>console.log("  [FAIL] "+x)); }
console.log("\n"+P.length+" passed, "+F.length+" failed.");
process.exit(F.length?1:0);
