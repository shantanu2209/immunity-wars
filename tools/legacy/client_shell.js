/* ============================================================================
   NETWORKED CLIENT SHELL — gate, lobby (14 seats + captain), allocation phase,
   owner-restricted board, two-stream chat, FAQ. Wraps the v2 board renderer.
   The SERVER is authoritative: act() SENDS to the server; U is set from the
   server's broadcasts. The local engine is included ONLY so the board renderer's
   helper functions (moveDestinations, famOf, attackable, …) work.
   ============================================================================ */

/* ---- identity persisted across refreshes ---- */
function genPid(){ return "p"+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
const me = {
  pid:   localStorage.getItem("iw_pid")   || genPid(),
  name:  localStorage.getItem("iw_name")  || "",
  color: localStorage.getItem("iw_color") || "#8b7cf6",
};
localStorage.setItem("iw_pid", me.pid);

/* ---- host / table-display mode ----
   When opened on the host machine itself (localhost), this device becomes the shared TABLE DISPLAY:
   it shows the join QR and the board, but never claims controllables and can't play. Players join
   from their phones by scanning. A LAN-IP visitor is a normal player. Either default can be overridden. */
const IS_LOCALHOST = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const IS_JOINING = /[?&]join\b/.test(location.search);   // opened via the QR join link → this is a player's phone
let hostMode = localStorage.getItem("iw_display")==="1" && !IS_JOINING;   // true = table display (a persisted choice)

/* ---- shared client state ---- */
let ws=null, connected=false;
// A phone that scanned the QR skips straight to joining; a returning table display resumes; everyone
// else lands on the mode chooser (single vs multiplayer). The mode chooser is therefore laptop-only in
// practice, because phones always arrive through the QR (?join).
let screen = hostMode ? "host" : (IS_JOINING ? (me.name ? "lobby" : "gate") : "mode");   // "mode" | "gate" | "lobby" | "game" | "host"
let lobby=null;                               // {seats, members, seatMeta, seatOrder, captain, allClaimed, maxPlayers}
let members=[];                               // roster during play
let captainPid=null;
let iAmSpectator=false;                        // true if this device is the table display
let specCount=0;                               // how many display screens are connected
let group=[];                                 // group chat messages
let sysLog=[];                                // system messages (join/leave/captain)
let cfg={difficulty:"normal"};
let spreadBusy=false, pendingGame=null;

/* U (game state) and sel come from the v2 board renderer's own globals — declared there. */

/* ---- my seats (ownership) ---- */
function mySeats(){
  const src = (lobby&&lobby.seats) || (U&&U.owner) || {};
  return Object.keys(src).filter(k=>src[k]===me.pid);
}
function ownsSeat(seat){ return mySeats().includes(seat); }
function iAmCaptain(){ return captainPid===me.pid; }

/* ---- WebSocket ---- */
function wsSend(o){ if(ws&&ws.readyState===1) ws.send(JSON.stringify(o)); }
function connect(){
  const proto = location.protocol==="https:"?"wss":"ws";
  ws = new WebSocket(`${proto}://${location.host}`);
  ws.onopen = ()=>{ connected=true;
    // host/display auto-joins as a spectator so it receives board state; players join after entering a name
    if(hostMode) wsSend({type:"join",pid:me.pid,name:"Table display",spectator:true});
    else if((screen==="lobby"||screen==="game")&&me.name) wsSend({type:"join",pid:me.pid,name:me.name,color:me.color});
    // (a refresh mid-game lands here: the server replies with the running game and we jump back in)
    render(); };
  ws.onclose = ()=>{ connected=false; render(); setTimeout(connect,1500); };
  ws.onmessage = ev=>{
    let m; try{ m=JSON.parse(ev.data); }catch{ return; }
    switch(m.type){
      case "welcome": me.pid=m.pid; me.color=m.color; captainPid=m.captain; iAmSpectator=!!m.spectator; localStorage.setItem("iw_pid",me.pid); break;
      case "joinRejected": flashMsg(m.error); screen="gate"; hostMode=false; break;
      case "state":
        lobby={room:m.room,members:m.members,seats:m.seats,seatMeta:m.seatMeta,seatOrder:m.seatOrder,
               captain:m.captain,allClaimed:m.allClaimed,maxPlayers:m.maxPlayers};
        captainPid=m.captain; members=m.members; specCount=m.spectators||0;
        if(m.mode==="lobby"){
          if(screen==="game"){ U=null; }
          if(hostMode){ screen="host"; }
          else if(screen!=="gate" && screen!=="mode") screen="lobby";
        }
        break;
      case "gameStarted": adoptGame(m); if(screen!=="gate") screen="game"; break;
      case "game": if(spreadBusy){ pendingGame=m; } else { adoptGame(m); if(screen!=="gate") screen="game"; } break;
      case "spread": runSpread(m); return;
      case "actionError": flashMsg(m.error); return;
      case "chatHistory": group=m.messages.filter(x=>x.kind!=="sys"); break;
      case "chat": group.push(m.message); if(group.length>200)group.shift(); renderChat(); return;
      case "sys": sysLog.push(m.message); if(sysLog.length>100)sysLog.shift(); renderChat(); return;
      case "askReply": showAskReply(m.answer); return;
      case "captured": flashMsg(m.ok ? ("Saved: captures/"+m.file) : ("Capture failed: "+(m.error||"?"))); return;
    }
    render();
  };
}

function adoptGame(m){
  if(m.seatMeta&&lobby) lobby.seatMeta=m.seatMeta;
  if(m.captain) captainPid=m.captain;
  if(m.members) members=m.members;
  if(m.seats){ if(!lobby) lobby={}; lobby.seats=m.seats; }
  U = m.game;
  // In multiplayer, the board's many `U.ap` checks should reflect THIS player's own budget, not the
  // shared pool. The server sends per-player budgets in U.apBudget; mirror mine into U.ap so every
  // existing button-enable check just works.
  if(U && U.multiplayer){ U.ap = (U.apBudget && U.apBudget[me.pid]!=null) ? U.apBudget[me.pid] : 0; }
  if(typeof sel==="undefined" || !sel) sel={kind:null,key:null,mode:null};
}

/* spread animation: play the frames the server sent, then adopt final state */
function runSpread(m){
  spreadBusy=true; sel={kind:null,key:null,mode:null};
  const frames=m.frames||[]; let i=0;
  const step=()=>{
    if(i<frames.length){ U=frames[i].view; U._dice=frames[i].dice; i++; renderGameSurface(); setTimeout(step, frames[i-1]&&frames[i-1].dice?800:520); }
    else { spreadBusy=false; U=m.final; U._dice=null;
      if(m.seats&&lobby)lobby.seats=m.seats; if(m.members)members=m.members; if(m.captain)captainPid=m.captain;
      renderGameSurface();
      if(pendingGame){ const p=pendingGame; pendingGame=null; adoptGame(p); renderGameSurface(); } }
  };
  renderGameSurface(); step();
}

/* ---- ACTION: send to server (server is authority) ---- */
function act(o){
  if(spreadBusy) return;
  if(typeof Audio2!=="undefined" && Audio2.sfx) Audio2.sfx(o.action);
  wsSend({type:"action", ...o});
}

/* ---- lobby / identity actions ---- */

/* ---- BACK navigation (item 2) ------------------------------------------------
   A wrong choice must never trap you. Going back always lands on a FRESH screen:
   the table display resets the table (seats, captain, game all cleared); a player
   simply releases their own seats and steps away. Laptop surfaces only. */
function goBackToMode(){
  try{
    if(hostMode || iAmSpectator){ wsSend({type:"resetRoom"}); localStorage.removeItem("iw_display"); hostMode=false; }
    else { wsSend({type:"leaveRoom"}); }
  }catch(e){}
  // wipe every local trace so the previous screen comes back clean
  U=null; lobby=null; members=[]; captainPid=null; iAmSpectator=false;
  group=[]; sysLog=[]; cfg={difficulty:"normal"}; pendingGame=null; spreadBusy=false;
  if(typeof sel!=="undefined") sel={kind:null,key:null,mode:null};
  if(typeof lanePanel!=="undefined") lanePanel=null;
  // drop ?join so a refresh doesn't bounce us straight back into joining
  if(/[?&]join\b/.test(location.search)){ location.href=location.pathname; return; }
  screen="mode"; render();
}
function confirmBack(msg){ if(confirm(msg||"Go back? This will reset this screen.")) goBackToMode(); }
function doJoin(){
  const v=document.getElementById("nameIn").value.trim(); if(!v){ document.getElementById("nameIn").focus(); return; }
  me.name=v.slice(0,16); localStorage.setItem("iw_name",me.name);
  wsSend({type:"join",pid:me.pid,name:me.name,color:me.color});
  screen="lobby"; render();
}
function pickColor(c){ me.color=c; localStorage.setItem("iw_color",c); if(screen!=="gate") wsSend({type:"rename",name:me.name,color:c}); render(); }
function claim(s){ wsSend({type:"claimSeat",seat:s}); }
function release(s){ wsSend({type:"releaseSeat",seat:s}); }
function nominateCaptain(pid){ wsSend({type:"setCaptain",pid}); }
function startGame(){ wsSend({type:"startGame",difficulty:cfg.difficulty}); }
function backToLobby(){ wsSend({type:"backToLobby"}); }
function chooseMode(m){
  if(m==="solo"){ location.href="solo.html"; return; }   // single-player = the plain laptop board
  switchToDisplay();   // multiplayer: this screen becomes the shared board (QR + lobby); players join on their phones
}
function openCaptureModal(){ const m=document.getElementById("captureModal"); if(!m) return; m.style.display="flex"; const t=document.getElementById("captureNote"); if(t){ t.value=""; setTimeout(()=>t.focus(),50); } }
function closeCaptureModal(){ const m=document.getElementById("captureModal"); if(m) m.style.display="none"; }
function doDirectorForce(kind,value){ wsSend({type:"directorForce",kind,value}); if(typeof closeForcePanel==="function") closeForcePanel(); flashMsg("Forced: "+value); }
function doDirectorUndo(){ wsSend({type:"directorUndo"}); flashMsg("Undoing last action…"); }
function doCapture(){ const t=document.getElementById("captureNote"); const note=t?t.value:""; wsSend({type:"capture",note}); closeCaptureModal(); flashMsg("Capturing game state…"); }

/* ---- allocation actions (captain / players) ---- */
function allocateAP(toPid,amount){ wsSend({type:"action",action:"allocateAP",toPid,amount}); }
function returnAP(amount){ wsSend({type:"action",action:"returnAP",amount}); }
function confirmAllocation(){ wsSend({type:"action",action:"confirmAllocation"}); }

/* ---- chat ---- */
function sendChat(){
  const el=document.getElementById("chatIn"); if(!el) return;
  const raw=el.value.trim(); if(!raw) return;
  // parse @mentions -> pids
  const mentions=[];
  (members||[]).forEach(mem=>{ if(new RegExp("@"+mem.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i").test(raw)) mentions.push(mem.pid); });
  wsSend({type:"chat",text:raw,mentions});
  el.value=""; hideMentionPicker();
}
function askGame(){
  const el=document.getElementById("askIn"); if(!el) return;
  const q=el.value.trim(); if(!q) return;
  wsSend({type:"ask",question:q}); el.value="";
}

/* ---- small UI helpers ---- */
function flashMsg(t){ const f=document.getElementById("flash"); if(!f)return; f.textContent=t; f.style.opacity="1"; clearTimeout(f._t); f._t=setTimeout(()=>f.style.opacity="0",2600); }

/* ---- top-level render dispatch ---- */
function renderGameSurface(){
  // the table display gets the landscape spectator board; players get the mobile home
  if(typeof iAmSpectator!=="undefined" && iAmSpectator){
    document.body.classList.add("spectator");
    if(typeof specShell==="function"){
      if(!document.getElementById("specLeft")) specShell();   // build the landscape layout once
      specDraw();                                             // board + gutter readouts from live U
      if(typeof fitBody==="function") fitBody();
    } else { draw(); }
  } else {
    document.body.classList.remove("spectator");
    if(typeof renderMobileHome==="function"){ renderMobileHome(); }
    else { draw(); }
  }
}
function render(){
  if(screen==="host") return renderHostScreen();
  if(screen==="mode") return renderModeScreen();
  if(screen==="gate") return renderGate();
  if(screen==="lobby") return renderLobby();
  // game (players see the mobile home; the table display sees the board)
  if(!U){ document.getElementById("app").innerHTML='<div class="waiting">Waiting for the game…</div>'; return; }
  renderGameSurface();
  renderNetOverlays();   // allocation banner, chat, captain badge — layered on top
}

/* switch between table-display and player on the same device (escape hatches) */
function switchToPlayer(){
  hostMode=false; iAmSpectator=false; localStorage.removeItem("iw_display"); localStorage.setItem("iw_forcePlayer","1");
  // drop the spectator connection and rejoin fresh as a player
  screen = me.name ? "lobby" : "gate";
  try{ ws && ws.close(); }catch(e){}
  render();
}
function switchToDisplay(){
  hostMode=true; localStorage.setItem("iw_display","1"); localStorage.removeItem("iw_forcePlayer");
  screen="host";
  try{ ws && ws.close(); }catch(e){}
  render();
}

connect();
window.addEventListener("load", render);
