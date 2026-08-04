const { JSDOM } = require("jsdom");
const fs=require("fs");
const dom=new JSDOM('<!doctype html><body></body>',{runScripts:"dangerously"});
const w=dom.window,d=w.document;
// minimal engine constants the panel reads
w.EVENTS={ fever:{name:"Fever spike",bad:true}, rest:{name:"Good rest",bad:false} };
w.RARE={ sepsis:{name:"Septic shock"}, cytokine:{name:"Cytokine storm"} };
let sent=null; w.wsSend=m=>{ sent=m; }; w.flashMsg=()=>{}; w.closeForcePanel=()=>{ d.getElementById("forcePanel").style.display="none"; };
// pull just the force-panel functions out of client_render.js
let src=fs.readFileSync("client_render.js","utf8");
const grab=n=>{ const i=src.indexOf("function "+n); let depth=0,j=i,started=false;
  for(;j<src.length;j++){ if(src[j]==="{"){depth++;started=true;} else if(src[j]==="}"){depth--; if(started&&depth===0){j++;break;}} }
  return src.slice(i,j); };
w.eval(grab("forcePanelHTML")+"\n"+grab("openForcePanel")+"\n"+grab("closeForcePanel"));
// doDirectorForce lives in client_shell.js
let shell=fs.readFileSync("client_shell.js","utf8");
w.eval(shell.slice(shell.indexOf("function doDirectorForce")).split("\n")[0]);

const P=[],F=[]; const ck=(n,c)=>(c?P:F).push(n);
d.body.innerHTML=w.forcePanelHTML();
const $=x=>d.querySelector(x), $$=x=>[...d.querySelectorAll(x)];
ck("panel renders", !!$("#forcePanel"));
ck("has all four category labels", $$(".fpLbl").length===4);
ck("spawn-by-type includes Worm", /Worm/.test(d.body.textContent));
ck("named cards include Tapeworm", /Tapeworm/.test(d.body.textContent));
ck("crisis events render by name", /Fever spike/.test(d.body.textContent));
ck("rare events render by name", /Septic shock/.test(d.body.textContent));
ck("worm button wired to doDirectorForce type", /doDirectorForce\('type','worm'\)/.test(d.body.innerHTML));
ck("named button wired to card kind", /doDirectorForce\('card','Tapeworm'\)/.test(d.body.innerHTML));
// simulate a click path
w.doDirectorForce("type","worm");
ck("clicking sends a directorForce message to the server", sent && sent.type==="directorForce" && sent.kind==="type" && sent.value==="worm");
w.openForcePanel(); ck("open shows panel", $("#forcePanel").style.display==="flex");
console.log("\n=== SPECTATOR FORCE PANEL ==="); P.forEach(x=>console.log("  [pass] "+x)); F.forEach(x=>console.log("  [FAIL] "+x));
console.log("\n"+P.length+" passed, "+F.length+" failed."); process.exit(F.length?1:0);
