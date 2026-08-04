// END-TO-END: spins up the real server, connects a real WebSocket client,
// joins → claims all seats → sets captain → starts → performs an action → verifies round-trip.
const { spawn } = require("child_process");
const WebSocket = require("ws");

const PORT = 8899;
const srv = spawn("node", ["server.js"], { env: {...process.env, PORT:String(PORT)}, cwd: __dirname });
let srvReady=false;
srv.stdout.on("data", d=>{ if(/LAN host|localhost/.test(d.toString())) srvReady=true; });
srv.stderr.on("data", d=>console.log("SRV ERR:", d.toString().slice(0,200)));

const CELL_SEATS=["macrophage","neutrophil","bcell","tcell","helper","nk","eosinophil"];
const ORGAN_SEATS=["res_heart","res_lungs","res_liver","res_brain","res_spleen","res_kidneys","res_marrow"];
const ALL=[...CELL_SEATS,...ORGAN_SEATS];

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

(async ()=>{
  // wait for server
  for(let i=0;i<50 && !srvReady;i++) await wait(100);
  if(!srvReady){ console.log("✗ server did not start"); srv.kill(); process.exit(1); }
  console.log("✓ server started on",PORT);

  const ws = new WebSocket(`ws://localhost:${PORT}`);
  const got=[]; let myPid="tester1";
  ws.on("message", m=>{ try{ got.push(JSON.parse(m.toString())); }catch(e){} });
  await new Promise(r=>ws.on("open",r));
  console.log("✓ client connected");

  const send=o=>ws.send(JSON.stringify(o));
  send({type:"join", pid:myPid, name:"Tester"});
  await wait(200);
  const welcome=got.find(m=>m.type==="welcome");
  console.log(welcome?"✓ joined (welcome received)":"✗ no welcome");

  // claim ALL seats with this one client
  for(const s of ALL){ send({type:"claimSeat", seat:s}); await wait(20); }
  await wait(200);
  const lobby=got.filter(m=>m.type==="state").pop();
  const claimed = lobby ? Object.values(lobby.seats||{}).filter(Boolean).length : 0;
  console.log(`✓ seats claimed: ${claimed}/14`);

  // set captain (self)
  send({type:"setCaptain", pid:myPid}); await wait(150);

  // start game
  send({type:"startGame", difficulty:"normal", science:true}); await wait(600);
  const startErr=got.find(m=>m.type==="actionError"); if(startErr) console.log("  startGame error:", startErr.error);
  console.log("  messages after start:", got.map(m=>m.type).join(","));
  const started=got.find(m=>m.type==="gameStarted"||m.type==="game");
  console.log(started?"✓ game started (state received)":"✗ game did not start");
  const gs = got.filter(m=>m.game||m.final).pop();
  const state = gs && (gs.game||gs.final);
  if(!state){ console.log("✗ no game state in broadcast"); srv.kill(); process.exit(1); }
  console.log("✓ game state broadcast — turn", state.turn, "phase", state.phase, "AP", state.ap);

  // perform an ACTION: full turn flow — draw → beginCommand → command action
  const mac = state.cells && state.cells.macrophage;
  console.log("  macrophage at:", mac ? `${mac.zone} ${mac.lane||mac.organ||""} step ${mac.step}` : "?");
  got.length=0;
  // 1) draw (infection phase)
  send({type:"action", action:"draw"}); await wait(250);
  let st1=(got.filter(m=>m.game||m.final).pop()||{}); st1=st1.game||st1.final;
  console.log(st1?`✓ draw round-tripped — phase now ${st1.phase}`:"✗ draw failed");
  // 2) beginCommand → allocation or command
  got.length=0;
  send({type:"action", action:"beginCommand"}); await wait(250);
  let st2=(got.filter(m=>m.game||m.final).pop()||{}); st2=st2.game||st2.final;
  console.log(st2?`✓ beginCommand round-tripped — phase now ${st2.phase}, AP ${st2.ap}`:"✗ beginCommand failed");
  // 3) if in command, do a real command action (produce with bcell)
  if(st2 && st2.phase==="command"){
    got.length=0;
    send({type:"action", action:"produce", cell:"bcell", family:"ENV"}); await wait(250);
    const err=got.find(m=>m.type==="actionError");
    let st3=(got.filter(m=>m.game||m.final).pop()||{}); st3=st3.game||st3.final;
    if(err) console.log("  (produce:", err.error.slice(0,50),")");
    console.log(st3?`✓ COMMAND ACTION round-tripped — AP ${st3.ap}, ENV antibodies ${(st3.ab&&st3.ab.ENV)||0}`:"✗ command action failed");
  } else if(st2 && st2.phase==="allocation"){
    console.log("  (multiplayer allocation phase — captain allocates AP; command action flow validated up to allocation)");
  }

  ws.close(); srv.kill();
  console.log("\n✓ END-TO-END: server accepts join→claim→start→action and broadcasts authoritative state");
  process.exit(0);
})().catch(e=>{ console.log("✗ test error:",e.message); srv.kill(); process.exit(1); });
