/* =========================================================================
   THE IMMUNITY WARS — LAN host (authoritative game + player identity)
   One host runs this. It holds the ONE true copy of the lobby and the game,
   applies each player's action (only for the controllables they own), and fans
   the result out to every device. Players reconnect by a persistent id.

   Now driving the FULL v2 engine: 7 cells + 7 organ stations = 14 seats, a
   captain who allocates shared Action Points each turn, ownership enforcement,
   and a two-stream chat (game log + group chat with @mentions).
   ========================================================================= */
const http = require("http");
const fs   = require("fs");
const path = require("path");
const os   = require("os");
const { WebSocketServer } = require("ws");
const QRCode = require("qrcode");
const G = require("./v2_engine.js");   // the modern engine (was game.js)

const PORT   = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");
const MAX_PLAYERS = 12;

const CELL_SEATS  = ["macrophage","neutrophil","bcell","tcell","helper","nk","eosinophil"];
const ORGAN_SEATS = ["res_heart","res_lungs","res_liver","res_brain","res_spleen","res_kidneys","res_marrow"];
const SEATS = [...CELL_SEATS, ...ORGAN_SEATS];
const SEAT_META = {
  macrophage:{name:"Monocyte",      role:"mobile phagocyte", glyph:"M", team:"innate",   kind:"cell"},
  neutrophil:{name:"Neutrophil",    role:"first responder",  glyph:"N", team:"innate",   kind:"cell"},
  bcell:     {name:"B-Cell",        role:"antibody factory", glyph:"B", team:"adaptive", kind:"cell"},
  tcell:     {name:"Killer T-Cell", role:"sniper",           glyph:"T", team:"adaptive", kind:"cell"},
  helper:    {name:"Helper T-Cell", role:"commander",        glyph:"H", team:"adaptive", kind:"cell"},
  nk:        {name:"NK Cell",       role:"natural killer",   glyph:"K", team:"innate",   kind:"cell"},
  eosinophil:{name:"Eosinophil",    role:"anti-parasite",    glyph:"E", team:"innate",   kind:"cell"},
  res_heart:  {name:"Heart resident",    role:"organ defender", glyph:"H", team:"resident", kind:"organ", organ:"heart"},
  res_lungs:  {name:"Lung resident",     role:"organ defender", glyph:"L", team:"resident", kind:"organ", organ:"lungs"},
  res_liver:  {name:"Kupffer (liver)",   role:"organ defender", glyph:"K", team:"resident", kind:"organ", organ:"liver"},
  res_brain:  {name:"Microglia (brain)", role:"organ defender", glyph:"B", team:"resident", kind:"organ", organ:"brain"},
  res_spleen: {name:"Spleen resident",   role:"organ defender", glyph:"S", team:"resident", kind:"organ", organ:"spleen"},
  res_kidneys:{name:"Kidney resident",   role:"organ defender", glyph:"Y", team:"resident", kind:"organ", organ:"kidneys"},
  res_marrow: {name:"Marrow resident",   role:"organ defender", glyph:"W", team:"resident", kind:"organ", organ:"marrow"},
};
const COLORS = ["#8b7cf6","#38bdf8","#f472b6","#a3e635","#fb923c","#22d3ee","#e879f9","#facc15","#4ade80","#f87171","#60a5fa","#c084fc"];
const GRACE_MS = 25000;

const ANTIBODY_ACTIONS = new Set(["neutralise","tag","memoryKill","antivenom","orderAntivenom"]);
const BCELL_ACTIONS    = new Set(["produce","clonalSelection","vaccinate"]);
const CELL_BOUND = { engulf:"macrophage", snipe:"tcell", nkkill:"nk", net:"neutrophil" };
function seatNeededFor(msg){
  const a = msg.action;
  if(a==="draw"||a==="beginCommand"||a==="endCommand") return null;
  if(a==="allocateAP"||a==="returnAP"||a==="confirmAllocation") return null;   // captain-gated in engine
  if(ANTIBODY_ACTIONS.has(a) || BCELL_ACTIONS.has(a)) return "bcell";          // antibodies belong to the B-Cell
  if(CELL_BOUND[a]) return CELL_BOUND[a];
  if(a==="move"||a==="recall"||a==="strike"||a==="degranulate") return msg.cell;
  if(a==="resengulf"||a==="prime"||a==="resmove"||a==="activate") return msg.organ ? ("res_"+msg.organ) : null;
  return null;
}

const room = {
  name:"Immunity Wars — Table 1",
  mode:"lobby",
  members:new Map(),
  seats:Object.fromEntries(SEATS.map(s=>[s,null])),
  captain:null,
  chat:[],
  game:null,
  actionLog:[],       // rolling log of the last N actions: {action, before, after, ok, error}
  actionSeq:0,
};

const ACTION_LOG_N = 5;   // how many recent actions to keep for the debug/capture tool

// clone a game state for the log, dropping the (redundant, bulky) undo history
function safeClone(g){
  if(!g) return null;
  try{ const c=JSON.parse(JSON.stringify(g)); if(c) c.undo="(omitted — see action log)"; return c; }
  catch(_){ return null; }
}
// record one applied action with the state immediately before and after it
function logAction(action, member, before, res){
  room.actionLog.push({
    seq:++room.actionSeq,
    at:new Date().toISOString(),
    by:{ pid:member.pid, name:member.name },
    action,                                     // the action object as sent
    ok:!!res.ok,
    error:res.ok ? null : (res.error||null),
    before,                                     // state immediately BEFORE the action
    after:res.ok ? safeClone(room.game) : null, // state immediately AFTER (null if rejected)
  });
  room.actionLog = room.actionLog.slice(-ACTION_LOG_N);
}

function lanIPs(){
  const out=[], nets=os.networkInterfaces();
  for(const k of Object.keys(nets)) for(const ni of nets[k]||[]) if(ni.family==="IPv4"&&!ni.internal) out.push(ni.address);
  const score=ip=>ip.startsWith("192.168.")?3:ip.startsWith("10.")?2:ip.startsWith("172.")?1:0;
  return out.sort((a,b)=>score(b)-score(a));
}

const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".ico":"image/x-icon",".json":"application/json"};
const server=http.createServer((req,res)=>{
  let p=req.url.split("?")[0]; if(p==="/") p="/index.html";
  if(p==="/lan-info"){
    const ips=lanIPs(), primary=ips[0]||"localhost", url=`http://${primary}:${PORT}`, joinUrl=url+"/?join=1";
    QRCode.toDataURL(joinUrl,{margin:1,width:260},(e,qr)=>{ res.writeHead(200,{"Content-Type":"application/json"});
      res.end(JSON.stringify({primary,url,joinUrl,qr:e?null:qr,all:ips,port:PORT})); }); return;
  }
  const safe=path.normalize(p).replace(/^(\.\.[/\\])+/,"");
  fs.readFile(path.join(PUBLIC,safe),(e,data)=>{ if(e){res.writeHead(404);res.end("Not found");return;}
    res.writeHead(200,{"Content-Type":MIME[path.extname(safe).toLowerCase()]||"application/octet-stream"}); res.end(data); });
});

const wss=new WebSocketServer({server});
const send=(ws,o)=>{ if(ws.readyState===1) ws.send(JSON.stringify(o)); };
const broadcast=o=>{ const m=JSON.stringify(o); wss.clients.forEach(c=>{ if(c.readyState===1) c.send(m); }); };

const memberList=()=>[...room.members.values()].filter(m=>!m.spectator).map(m=>({pid:m.pid,name:m.name,color:m.color,avatar:m.avatar,seats:[...m.seats],connected:m.connected,captain:m.pid===room.captain}));
const spectatorCount=()=>[...room.members.values()].filter(m=>m.spectator&&m.connected).length;
const playerPids=()=>[...room.members.values()].filter(m=>!m.spectator).map(m=>m.pid);
const playerCount=()=>[...room.members.values()].filter(m=>!m.spectator).length;
const allSeatsClaimed=()=>SEATS.every(s=>room.seats[s]);
function ensureCaptain(){
  if(room.captain && room.members.has(room.captain) && !room.members.get(room.captain).spectator) return;
  const first=[...room.members.values()].find(m=>!m.spectator&&m.connected) || [...room.members.values()].find(m=>!m.spectator);
  room.captain = first ? first.pid : null;
}
function lobbyState(){
  ensureCaptain();
  return { type:"state", mode:room.mode, room:room.name, seatOrder:SEATS, seatMeta:SEAT_META,
    seats:room.seats, members:memberList(), allClaimed:allSeatsClaimed(), captain:room.captain, maxPlayers:MAX_PLAYERS, spectators:spectatorCount() };
}
function gameMsg(extra){
  return Object.assign({ type:"game", game:G.viewState(room.game), seats:room.seats, seatMeta:SEAT_META,
    members:memberList(), captain:room.captain }, extra||{});
}
function pushChat(e){ const x={kind:"group",...e,t:Date.now()}; room.chat.push(x); if(room.chat.length>200)room.chat.shift(); broadcast({type:"chat",message:x}); }
function pushSys(text){ broadcast({type:"sys",message:{kind:"sys",text,t:Date.now()}}); }
function pruneDisconnected(){ for(const m of [...room.members.values()]) if(!m.connected){ m.seats.forEach(s=>{ if(room.seats[s]===m.pid) room.seats[s]=null; }); room.members.delete(m.pid); } ensureCaptain(); }

wss.on("connection",ws=>{
  ws.on("message",buf=>{
    let msg; try{ msg=JSON.parse(buf.toString()); }catch{ return; }

    if(msg.type==="join"){
      const pid=String(msg.pid||"").slice(0,40) || ("p"+Math.random().toString(36).slice(2));
      ws.pid=pid;
      let member=room.members.get(pid), reconnect=false;
      if(member){ reconnect=true; if(member._grace){ clearTimeout(member._grace); member._grace=null; } member.connected=true; }
      else {
        const asSpectator = !!msg.spectator;   // the host/table display joins as a spectator
        if(!asSpectator && playerCount()>=MAX_PLAYERS){ send(ws,{type:"joinRejected",error:`This table is full (max ${MAX_PLAYERS} players).`}); return; }
        member={pid,name:null,color:COLORS[playerCount()%COLORS.length],avatar:"S",seats:new Set(),connected:true,_grace:null,spectator:asSpectator};
        room.members.set(pid,member);
      }
      if(msg.name) member.name=String(msg.name).slice(0,16).trim()||member.name;
      if(msg.color&&COLORS.includes(msg.color)) member.color=msg.color;
      if(msg.avatar) member.avatar=String(msg.avatar).slice(0,8);
      if(!member.name) member.name="Player";
      ensureCaptain();
      send(ws,{type:"welcome",pid,color:member.color,palette:COLORS,captain:room.captain,spectator:!!member.spectator});
      send(ws,{type:"chatHistory",messages:room.chat.slice(-50)});
      broadcast(lobbyState());
      if(room.mode==="playing") send(ws,gameMsg());
      pushSys(`${member.name} ${reconnect?"reconnected":"joined"}`);
      return;
    }

    const member=ws.pid?room.members.get(ws.pid):null;
    if(!member) return;

    switch(msg.type){
      case "rename":{
        if(msg.name) member.name=String(msg.name).slice(0,16).trim()||member.name;
        if(msg.color&&COLORS.includes(msg.color)) member.color=msg.color;
        if(msg.avatar) member.avatar=String(msg.avatar).slice(0,8);
        broadcast(lobbyState()); if(room.mode==="playing") broadcast(gameMsg()); break;
      }
      case "claimSeat":{
        if(member.spectator)break;   // the table display never claims controllables
        if(room.mode!=="lobby"||!SEATS.includes(msg.seat))break;
        if(room.seats[msg.seat]&&room.seats[msg.seat]!==member.pid)break;
        room.seats[msg.seat]=member.pid; member.seats.add(msg.seat); broadcast(lobbyState()); break;
      }
      case "releaseSeat":{
        if(room.mode!=="lobby")break;
        if(room.seats[msg.seat]===member.pid){ room.seats[msg.seat]=null; member.seats.delete(msg.seat); broadcast(lobbyState()); }
        break;
      }
      case "setCaptain":{
        if(room.mode!=="lobby")break;
        if(room.members.has(msg.pid)){ room.captain=msg.pid; broadcast(lobbyState()); pushSys(`${room.members.get(msg.pid).name} is now the captain`); }
        break;
      }
      case "chat":{
        const t=String(msg.text||"").slice(0,300).trim(); if(!t) break;
        const mentions=Array.isArray(msg.mentions)?msg.mentions.filter(p=>room.members.has(p)).slice(0,12):[];
        pushChat({from:member.name,fromPid:member.pid,color:member.color,text:t,mentions}); break;
      }
      case "ask":{
        send(ws,{type:"askReply",question:String(msg.question||"").slice(0,500),
          answer:"The in-game assistant isn't available in local play. It will be enabled on the hosted version of Immunity Wars. For now, see the FAQ, or ask your teammates in group chat."});
        break;
      }
      case "startGame":{
        if(member.spectator)break;
        if(room.mode!=="lobby")break;
        if(!allSeatsClaimed()){ send(ws,{type:"actionError",error:`All ${SEATS.length} controllables must be claimed before you can start.`}); break; }
        ensureCaptain();
        if(!room.captain){ send(ws,{type:"actionError",error:"Choose a captain before starting."}); break; }
        pruneDisconnected();
        room.game=G.newGame({
          difficulty:msg.difficulty, science:msg.science!==false,
          multiplayer:true, players:playerPids(), captain:room.captain, owner:{...room.seats},
        });
        room.mode="playing";
        room.actionLog=[]; room.actionSeq=0;
        broadcast(gameMsg({type:"gameStarted"}));
        pushSys(`Game started — ${room.members.get(room.captain).name} is captain.`);
        break;
      }
      case "action":{
        if(member.spectator){ send(ws,{type:"actionError",error:"The table display can't take actions — play from a phone."}); break; }
        if(room.mode!=="playing"||!room.game)break;
        const need=seatNeededFor(msg);
        if(need && room.seats[need]!==member.pid){
          send(ws,{type:"actionError",error:`That's the ${SEAT_META[need]?SEAT_META[need].name:need} — you can only command what you've claimed.`}); break;
        }
        const action=Object.assign({}, msg, {pid:member.pid});
        const before=safeClone(room.game);
        const res=G.applyAction(room.game,action);
        logAction(action, member, before, res);
        if(!res.ok){ send(ws,{type:"actionError",error:res.error}); break; }
        if(msg.action==="endCommand"){
          broadcast({type:"spread",frames:res.frames,final:G.viewState(room.game),seats:room.seats,seatMeta:SEAT_META,members:memberList(),captain:room.captain});
        } else {
          broadcast(gameMsg());
        }
        break;
      }
      case "capture":{
        // DEBUG TOOL: write the FULL server game state (not just viewState) as timestamped
        // JSON into a captures/ folder on the host, then confirm back. Any player may do this.
        if(room.mode!=="playing"||!room.game){ send(ws,{type:"captured",ok:false,error:"No game in progress to capture."}); break; }
        try{
          const dir=path.join(__dirname,"captures");
          if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
          const stamp=new Date().toISOString().replace(/[:.]/g,"-");
          const file=`capture_T${room.game.turn}_${stamp}.json`;
          const snapshot={
            capturedAt:new Date().toISOString(),
            capturedBy:{pid:member.pid,name:member.name,seats:[...member.seats]},
            description:String(msg.note||"").slice(0,8000),
            turn:room.game.turn, phase:room.game.phase, difficulty:room.game.difficulty,
            captain:room.captain, seats:room.seats,
            members:[...room.members.values()].map(m=>({pid:m.pid,name:m.name,seats:[...m.seats],spectator:!!m.spectator})),
            recentActions:room.actionLog||[],       // last N actions, each with the state BEFORE and AFTER
            currentState:safeClone(room.game),       // full current state (undo omitted — it's in the action log)
          };
          let jsonStr;
          try{ jsonStr=JSON.stringify(snapshot,null,2); }
          catch(_){ jsonStr=JSON.stringify(Object.assign({},snapshot,{currentState:null,recentActions:"(serialization failed)"}),null,2); }
          fs.writeFileSync(path.join(dir,file), jsonStr);
          send(ws,{type:"captured",ok:true,file});
          pushSys(`${member.name} captured the game state \u2192 captures/${file}`);
        }catch(e){
          send(ws,{type:"captured",ok:false,error:String((e&&e.message)||e)});
        }
        break;
      }
      case "directorUndo":{
        // laptop/table-display debug tool: roll back the last action on the authoritative game
        if(room.mode!=="playing"||!room.game){ send(ws,{type:"actionError",error:"No game in progress."}); break; }
        const before=safeClone(room.game);
        const res=G.applyAction(room.game,{action:"undo"});
        logAction({action:"undo",director:true}, member, before, res);
        if(!res.ok){ send(ws,{type:"actionError",error:res.error||"Nothing to undo."}); break; }
        broadcast(gameMsg());
        pushSys(`${member.name} (table display) undid the last action`);
        break;
      }
      case "directorForce":{
        // laptop/table-display testing tool: inject a scenario into the authoritative game, then broadcast
        if(room.mode!=="playing"||!room.game){ send(ws,{type:"actionError",error:"No game in progress."}); break; }
        const g=room.game; let label=msg.value;
        try{
          if(msg.kind==="type"){ const iv=G.forceInjectType(g,msg.value); label=iv?iv.disease:msg.value; }
          else if(msg.kind==="card"){ const iv=G.forceInjectCard(g,msg.value); if(!iv){ send(ws,{type:"actionError",error:"Card not found: "+msg.value}); break; } label=iv.disease; }
          else if(msg.kind==="crisis"){ G.applyEvent(g,msg.value); label=(G.EVENTS[msg.value]&&G.EVENTS[msg.value].name)||msg.value; }
          else if(msg.kind==="rare"){ g.rare=g.rare||{}; g.rare.armed=true; g.rare.fired=null; G.fireRare(g,msg.value); label=(G.RARE[msg.value]&&G.RARE[msg.value].name)||msg.value; }
          else { send(ws,{type:"actionError",error:"Unknown force kind."}); break; }
        }catch(e){ send(ws,{type:"actionError",error:"Force failed: "+String((e&&e.message)||e)}); break; }
        broadcast(gameMsg());
        pushSys(`${member.name} (table display) forced: ${label}`);
        break;
      }
      case "resetRoom":{
        // TABLE DISPLAY ONLY: wipe the table back to a fresh lobby — no seats, no captain, no game.
        // Used by the laptop's Back button so a wrong turn never traps anyone.
        if(!member.spectator){ send(ws,{type:"actionError",error:"Only the table display can reset the table."}); break; }
        room.mode="lobby"; room.game=null;
        SEATS.forEach(s=>{ room.seats[s]=null; });
        room.members.forEach(m=>{ m.seats.clear(); });
        room.captain=null; ensureCaptain();
        broadcast(lobbyState());
        pushSys(`The table was reset — all seats cleared.`);
        break;
      }
      case "leaveRoom":{
        // one PLAYER steps away: release just their own seats, leave everyone else untouched
        member.seats.forEach(s=>{ if(room.seats[s]===member.pid) room.seats[s]=null; });
        member.seats.clear();
        room.members.delete(member.pid);
        ensureCaptain(); broadcast(lobbyState());
        pushSys(`${member.name} left the table`);
        break;
      }
      case "backToLobby":{
        room.mode="lobby"; room.game=null; pruneDisconnected(); broadcast(lobbyState());
        pushSys(`${member.name} returned everyone to the lobby`); break;
      }
    }
  });

  ws.on("close",()=>{
    const member=ws.pid?room.members.get(ws.pid):null; if(!member) return;
    member.connected=false;
    broadcast(lobbyState()); if(room.mode==="playing") broadcast(gameMsg());
    pushSys(`${member.name} disconnected`);
    if(room.mode==="lobby"){
      member._grace=setTimeout(()=>{
        if(!member.connected){ member.seats.forEach(s=>{ if(room.seats[s]===member.pid) room.seats[s]=null; }); room.members.delete(member.pid); ensureCaptain(); broadcast(lobbyState()); }
      }, GRACE_MS);
    }
  });
});

server.listen(PORT,()=>{
  const ips=lanIPs(), line="─".repeat(54);
  console.log(`\n${line}\n  THE IMMUNITY WARS · LAN host · networked game\n${line}`);
  console.log(`\n  On THIS computer (the host):   http://localhost:${PORT}`);
  if(ips.length){ console.log("\n  On OTHER devices (same Wi-Fi), open, or scan the QR:");
    ips.forEach(ip=>console.log(`      http://${ip}:${PORT}`)); }
  else console.log("\n  ⚠  No Wi-Fi/LAN address found — connect to a network first.");
  console.log("\n  Stop with Ctrl+C.\n");
});
