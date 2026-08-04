// END-TO-END: start server, run a game, send directorForce, verify the broadcast state gains the forced pathogen.
const { spawn } = require("child_process");
const WebSocket = require("ws");
const PORT = 8901;
const srv = spawn("node", ["server.js"], { env:{...process.env, PORT:String(PORT)}, cwd:__dirname });
let ready=false; srv.stdout.on("data",d=>{ if(/LAN host|localhost/.test(d.toString())) ready=true; });
const CELL=["macrophage","neutrophil","bcell","tcell","helper","nk","eosinophil"];
const ORG=["res_heart","res_lungs","res_liver","res_brain","res_spleen","res_kidneys","res_marrow"];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  for(let i=0;i<50&&!ready;i++) await wait(100);
  const ws=new WebSocket(`ws://localhost:${PORT}`); const got=[];
  ws.on("message",m=>{try{got.push(JSON.parse(m.toString()));}catch(e){}});
  await new Promise(r=>ws.on("open",r));
  const send=o=>ws.send(JSON.stringify(o));
  send({type:"join",pid:"t1",name:"Tester"}); await wait(150);
  for(const s of [...CELL,...ORG]){ send({type:"claimSeat",seat:s}); await wait(12); }
  await wait(150); send({type:"setCaptain",pid:"t1"}); await wait(120);
  send({type:"startGame",difficulty:"normal",science:true}); await wait(500);
  got.length=0;
  // FORCE a Tapeworm (a worm) via the director tool
  send({type:"directorForce",kind:"card",value:"Tapeworm"}); await wait(250);
  const gs=got.filter(m=>m.game||m.final).pop(); const state=gs&&(gs.game||gs.final);
  const worm = state && (state.invaders||[]).find(iv=>iv.disease==="Tapeworm");
  const P=[],F=[]; const ck=(n,c)=>(c?P:F).push(n);
  ck("server broadcast a new state after force", !!state);
  ck("forced Tapeworm appears in the authoritative state", !!worm);
  ck("forced worm is placed at an organ branch (not the route)", !!worm && worm.zone==="branch");
  // and a bad kind is rejected
  got.length=0; send({type:"directorForce",kind:"bogus",value:"x"}); await wait(150);
  ck("unknown force kind is rejected with an error", got.some(m=>m.type==="actionError"));
  console.log("\n=== DIRECTOR FORCE (server e2e) ==="); P.forEach(x=>console.log("  [pass] "+x)); F.forEach(x=>console.log("  [FAIL] "+x));
  console.log("\n"+P.length+" passed, "+F.length+" failed.");
  ws.close(); srv.kill(); process.exit(F.length?1:0);
})();
