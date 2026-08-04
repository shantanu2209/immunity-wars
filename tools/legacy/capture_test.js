const { spawn } = require("child_process");
const WebSocket = require("ws");
const fs = require("fs"), path = require("path");
const PORT = 8903, capDir = path.join(__dirname, "captures");
const srv = spawn("node", ["server.js"], { env:{...process.env, PORT:String(PORT)}, cwd:__dirname });
let ready=false; srv.stdout.on("data",d=>{ if(/LAN host|localhost/.test(d.toString())) ready=true; });
srv.stderr.on("data",d=>process.stderr.write(d));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  for(let i=0;i<50 && !ready;i++) await wait(100);
  if(!ready){ console.log("no server"); srv.kill(); process.exit(1); }
  const ws=new WebSocket(`ws://localhost:${PORT}`); const got=[];
  await new Promise(res=>ws.on("open",res));
  ws.on("message",d=>{ try{got.push(JSON.parse(d));}catch(e){} });
  const send=o=>ws.send(JSON.stringify(o));
  const pid="cap-"+Math.random().toString(36).slice(2,7);
  send({type:"join",pid,name:"Tester"}); await wait(250);
  const st=[...got].reverse().find(m=>m.type==="state");
  for(const s of (st?st.seatOrder:[])){ send({type:"claimSeat",seat:s}); await wait(10); }
  send({type:"setCaptain",pid}); await wait(120);
  send({type:"startGame",difficulty:"normal"}); await wait(400);
  send({type:"action",action:"draw"}); await wait(150);              // ok
  send({type:"action",action:"beginCommand"}); await wait(150);      // ok -> allocation
  send({type:"action",action:"confirmAllocation"}); await wait(150); // ok -> command
  send({type:"action",action:"draw"}); await wait(150);              // FAIL (not infection phase)
  const DESC="After confirmAllocation the Neutrophil budget read 0, expected 2. Repro: allocate 2 to Neutrophil, confirm.";
  send({type:"capture",note:DESC}); await wait(500);
  const cap=[...got].reverse().find(m=>m.type==="captured");
  const file=cap&&cap.file?path.join(capDir,cap.file):null;
  let j=null; if(file&&fs.existsSync(file)){ try{ j=JSON.parse(fs.readFileSync(file,"utf8")); }catch(e){} }
  const log=(j&&j.recentActions)||[];
  const beginEntry=log.find(e=>e.action&&e.action.action==="beginCommand");
  const failEntry =log.slice().reverse().find(e=>e.action&&e.action.action==="draw"&&e.ok===false);
  const okEntry   =log.find(e=>e.ok===true&&e.before&&e.after);
  const P=[],F=[]; const ck=(n,c)=>(c?P:F).push(n);
  ck("server confirmed capture", !!(cap&&cap.ok===true));
  ck("recentActions log present", Array.isArray(log)&&log.length>=3);
  ck("each entry has action+before+after+ok", log.every(e=>"action"in e&&"before"in e&&"after"in e&&"ok"in e));
  ck("beginCommand shows state change (infection->allocation)", !!(beginEntry&&beginEntry.before.phase==="infection"&&beginEntry.after.phase==="allocation"));
  ck("successful action has before AND after", !!okEntry);
  ck("FAILED action logged with reason + null after", !!(failEntry&&failEntry.ok===false&&failEntry.error&&failEntry.after===null));
  ck("long description saved", j&&j.description===DESC);
  ck("full currentState included", !!(j&&j.currentState&&j.currentState.cells&&Array.isArray(j.currentState.invaders)));
  console.log("\n=== CAPTURE TOOL (action before/after) ===");
  P.forEach(x=>console.log("  [pass] "+x));
  if(F.length){ console.log("\n  FAILURES:"); F.forEach(x=>console.log("  [FAIL] "+x)); }
  console.log("\n"+P.length+" passed, "+F.length+" failed.  actions logged: "+log.length);
  ws.close(); srv.kill(); process.exit(F.length?1:0);
})();
