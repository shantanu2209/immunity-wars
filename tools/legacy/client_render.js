/* ============================================================================
   CLIENT RENDER — gate, lobby (14 seats + captain), allocation phase, chat, FAQ.
   These layer on top of the v2 board renderer (draw()).
   ============================================================================ */

const APP = ()=>document.getElementById("app");
const esc = s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- HOST / TABLE-DISPLAY screen (the laptop) ---------- */
let _lanInfo=null, _lanFetchAt=0;
function fetchLanInfo(cb){
  const now=Date.now();
  if(_lanInfo && now-_lanFetchAt<8000){ cb(_lanInfo); return; }
  fetch("/lan-info").then(r=>r.json()).then(info=>{ _lanInfo=info; _lanFetchAt=now; cb(info); }).catch(()=>cb(null));
}
function renderHostScreen(){
  const _back = `<button class="backBtn" onclick="confirmBack('Go back to the chooser? This RESETS the table — all seats, the captain and any game in progress will be cleared.')">← Back</button>`;
  if(typeof document!=="undefined") document.body.classList.remove("spectator");
  // during play, the host shows the spectator board instead of the lobby display
  if(lobby && lobby.mode!=="lobby" && U){ /* handled by render() → game */ }
  const claimed = lobby ? Object.values(lobby.seats).filter(Boolean).length : 0;
  const total = lobby ? (lobby.seatOrder||[]).length : 14;
  const roster = lobby ? (lobby.members||[]).map(m=>`
    <div class="hroster" style="border-color:${m.color}55">
      <span class="dot" style="background:${m.color}"></span>
      <span class="hrn">${esc(m.name)}${m.pid===lobby.captain?' <span class="capt">★</span>':''}</span>
      <span class="hrs">${m.seats.length} seat${m.seats.length===1?"":"s"}</span>
    </div>`).join("") : "";

  APP().innerHTML = `
  <div class="hostscreen">
    ${_back}
    <div class="hostbrand">THE IMMUNITY WARS <span class="hostsub">· table display</span></div>
    <div class="hostgrid">
      <div class="qrcol">
        <div class="qrcard">
          <div class="qrtitle">Scan to join the game</div>
          <div id="qrbox" class="qrbox"><div class="dim">loading QR…</div></div>
          <div class="qrurl" id="qrurl">finding this computer's address…</div>
          <div class="qrhint">Everyone must be on the same Wi-Fi. Point your phone camera at the code, then tap the link.</div>
        </div>
      </div>
      <div class="statuscol">
        <div class="hostpanel">
          <div class="hosttl">Players joined</div>
          <div class="hrosterwrap">${roster||'<div class="dim">No one has joined yet. Scan the code to be first.</div>'}</div>
        </div>
        <div class="hostpanel">
          <div class="hosttl">Seats claimed</div>
          <div class="seatbar"><div class="seatfill" style="width:${total?Math.round(claimed/total*100):0}%"></div></div>
          <div class="seatcount"><b>${claimed}</b> of ${total} controllables claimed</div>
          <div class="dim" style="margin-top:8px">${claimed>=total?(lobby&&lobby.captain?"Ready — the captain can start from their device.":"All claimed — choose a captain on a player device."):"The game starts once all "+total+" are claimed and a captain is chosen."}</div>
        </div>
        <div class="dim hostfoot">This screen is the shared board — it can't play. ${IS_LOCALHOST?'<a href="#" onclick="switchToPlayer();return false">Join as a player on this device instead →</a>':''}</div>
      </div>
    </div>
    <div id="flash" class="flash"></div>
  </div>`;

  fetchLanInfo(info=>{
    const box=document.getElementById("qrbox"), url=document.getElementById("qrurl");
    if(!box) return;
    if(info && info.qr){ box.innerHTML=`<img src="${info.qr}" alt="Join QR code" />`; }
    else { box.innerHTML='<div class="dim">QR unavailable — type the address below on your phone.</div>'; }
    if(url) url.textContent = info ? (info.joinUrl||info.url) : `http://<this-computer-ip>:3000/?join=1`;
  });
}

/* ---------- GATE (name + colour) ---------- */
function renderModeScreen(){
  APP().innerHTML = `
  <div class="gate">
    <div class="gatecard modecard">
      <div class="brand">THE IMMUNITY WARS</div>
      <div class="tagline">A cooperative game of the immune system.</div>
      <div class="modeOpts">
        <button class="modeOpt" onclick="chooseMode('multi')">
          <div class="moTitle">Multiplayer</div>
          <div class="moDesc">Play together — each person on their phone, a laptop or TV as the shared board. Claim your cells, pick a captain, defend the body.</div>
          <div class="moGo">Set up a table →</div>
        </button>
        <button class="modeOpt" onclick="chooseMode('solo')">
          <div class="moTitle">Single player</div>
          <div class="moDesc">Play solo on this laptop with the full board and mouse. Best on a big screen.</div>
          <div class="moGo">Play solo →</div>
        </button>
      </div>
      <div class="conn ${connected?'ok':'bad'}">${connected?"connected to host":"connecting to host…"}</div>
    </div>
    <div id="flash" class="flash"></div>
  </div>`;
}

function renderGate(){
  const _back = `<button class="backBtn" onclick="goBackToMode()" title="Return to the Single / Multiplayer chooser">← Back</button>`;
  const palette = ["#8b7cf6","#38bdf8","#f472b6","#a3e635","#fb923c","#22d3ee","#e879f9","#facc15","#4ade80","#f87171","#60a5fa","#c084fc"];
  APP().innerHTML = `
  <div class="gate">
    ${_back}
    <div class="gatecard">
      <div class="brand">THE IMMUNITY WARS</div>
      <div class="tagline">Defend the body — together. One team, one shared pool of energy, many cells.</div>
      <label class="lab">Your name</label>
      <input id="nameIn" class="inp" maxlength="16" placeholder="e.g. Kartik" value="${esc(me.name)}" onkeydown="if(event.key==='Enter')doJoin()">
      <label class="lab" style="margin-top:12px">Your colour</label>
      <div class="swatches">${palette.map(c=>`<button class="sw ${c===me.color?'on':''}" style="background:${c}" onclick="pickColor('${c}')"></button>`).join("")}</div>
      <button class="bigbtn" onclick="doJoin()">Join the table →</button>
      <div class="conn ${connected?'ok':'bad'}">${connected?"connected to host":"connecting to host…"}</div>
      <div class="dim" style="text-align:center;margin-top:10px;font-size:11px"><a href="#" onclick="switchToDisplay();return false" style="color:#8b7cf6">Use this device as the table display instead →</a></div>
    </div>
    <div id="flash" class="flash"></div>
  </div>`;
}

/* ---------- LOBBY (14 seats + captain + start) ---------- */
function seatCard(seat){
  const meta=(lobby.seatMeta||{})[seat]||{name:seat,kind:"cell"};
  const owner=lobby.seats[seat];
  const ownerMem=(lobby.members||[]).find(m=>m.pid===owner);
  const mine=owner===me.pid;
  const isCap=owner && owner===lobby.captain;
  return `<div class="seat ${owner?'taken':''} ${mine?'mine':''} ${meta.kind==='organ'?'organ':''}">
    <div class="seathd"><span class="sg">${meta.glyph||"?"}</span><div><div class="sn">${esc(meta.name)}</div><div class="sr">${esc(meta.role||"")}</div></div></div>
    ${owner
      ? `<div class="owner" style="color:${ownerMem?ownerMem.color:'#aaa'}">${esc(ownerMem?ownerMem.name:'—')}${isCap?' <span class="capt">★ captain</span>':''} ${mine?`<button class="mini" onclick="release('${seat}')">release</button>`:''}</div>`
      : `<button class="claimbtn" onclick="claim('${seat}')">claim</button>`}
  </div>`;
}
function renderLobby(){
  const _back = `<button class="backBtn" onclick="confirmBack('Leave the table and go back? Your seats will be released.')">← Back</button>`;
  if(!lobby || !lobby.seatOrder){ APP().innerHTML='<div class="waiting">Joining the table…</div>'; return; }
  const cells=(lobby.seatOrder||[]).filter(s=>(lobby.seatMeta[s]||{}).kind!=="organ");
  const organs=(lobby.seatOrder||[]).filter(s=>(lobby.seatMeta[s]||{}).kind==="organ");
  const claimedCount=Object.values(lobby.seats).filter(Boolean).length;
  const roster=(lobby.members||[]).map(m=>{
    const isCap=m.pid===lobby.captain;
    const canNominate = !isCap;
    return `<div class="rosteritem" style="border-color:${m.color}55">
      <span class="dot" style="background:${m.color}"></span>
      <span class="rn">${esc(m.name)}${m.pid===me.pid?" (you)":""}</span>
      ${isCap?'<span class="capt">★ captain</span>':(canNominate?`<button class="mini" onclick="nominateCaptain('${m.pid}')">make captain</button>`:"")}
      <span class="rseats">${m.seats.length} seat${m.seats.length===1?"":"s"}</span>
    </div>`;
  }).join("");

  APP().innerHTML = `
  <div class="lobby">
    ${_back}
    <div class="lobbyhead">
      <div class="brand sm">THE IMMUNITY WARS</div>
      <div class="sub">Claim your controllables. The game starts when all ${(lobby.seatOrder||[]).length} are claimed and a captain is chosen.</div>
    </div>
    <div class="lobbygrid">
      <div class="seatscol">
        <div class="secttl">Immune cells <span class="cnt">${cells.filter(s=>lobby.seats[s]).length}/${cells.length}</span></div>
        <div class="seatwrap">${cells.map(seatCard).join("")}</div>
        <div class="secttl" style="margin-top:14px">Organ stations <span class="cnt">${organs.filter(s=>lobby.seats[s]).length}/${organs.length}</span></div>
        <div class="seatwrap">${organs.map(seatCard).join("")}</div>
      </div>
      <div class="sidecol">
        <div class="panel">
          <div class="secttl">Players <span class="cnt">${(lobby.members||[]).length}/${lobby.maxPlayers||12}</span></div>
          <div class="roster">${roster||'<div class="dim">waiting for players…</div>'}</div>
        </div>
        <div class="panel">
          <div class="secttl">Difficulty</div>
          ${iAmCaptain()
            ? `<div class="diffrow">${["training","normal","hard"].map(d=>`<button class="diffbtn ${cfg.difficulty===d?'on':''}" onclick="cfg.difficulty='${d}';renderLobby()">${d}</button>`).join("")}</div>
               <div class="dim" style="font-size:10.5px;margin-top:5px">You're the captain — your choice sets the difficulty for the whole team.</div>`
            : `<div class="dim">The captain chooses the difficulty for everyone.</div>`}
        </div>
        <button class="bigbtn ${(lobby.allClaimed&&lobby.captain)?'':'disabled'}" ${(lobby.allClaimed&&lobby.captain)?'':'disabled'} onclick="startGame()">
          ${lobby.allClaimed?(lobby.captain?"Start the game →":"Choose a captain first"):`Claim all seats to start (${claimedCount}/${(lobby.seatOrder||[]).length})`}
        </button>
        ${chatPanel()}
      </div>
    </div>
    <div id="flash" class="flash"></div>
  </div>`;
  renderChat();
}

/* ---------- CHAT (group + system, with @mention picker) ---------- */
function chatPanel(){
  return `<div class="panel chatpanel">
    <div class="chattabs">
      <button id="tabGroup" class="chattab on" onclick="switchChat('group')">Team chat</button>
      <button id="tabSys" class="chattab" onclick="switchChat('sys')">Game log</button>
    </div>
    <div id="chatBody" class="chatbody"></div>
    <div class="chatinput">
      <div id="mentionPicker" class="mentionpicker" style="display:none"></div>
      <input id="chatIn" class="inp sm" placeholder="Message the team…  (use @ to mention)" autocomplete="off"
        oninput="onChatInput()" onkeydown="if(event.key==='Enter')sendChat()">
      <button class="mini go" onclick="sendChat()">send</button>
    </div>
  </div>`;
}
let chatTab="group";
function switchChat(t){ chatTab=t;
  const g=document.getElementById("tabGroup"), s=document.getElementById("tabSys");
  if(g)g.classList.toggle("on",t==="group"); if(s)s.classList.toggle("on",t==="sys");
  renderChat();
}
function renderChat(){
  const body=document.getElementById("chatBody"); if(!body) return;
  if(chatTab==="sys"){
    body.innerHTML = sysLog.map(m=>`<div class="sysmsg">${esc(m.text)}</div>`).join("") || '<div class="dim">No game events yet.</div>';
  } else {
    body.innerHTML = group.map(m=>{
      const mine=m.fromPid===me.pid;
      const mentionsMe = m.mentions && m.mentions.includes(me.pid);
      let text=esc(m.text);
      (members||[]).forEach(mem=>{ text=text.replace(new RegExp("@"+mem.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"ig"),`<span class="mention">@${esc(mem.name)}</span>`); });
      return `<div class="cmsg ${mine?'mine':''} ${mentionsMe?'tome':''}">
        <span class="cfrom" style="color:${m.color||'#ccc'}">${esc(m.from)}</span> ${text}</div>`;
    }).join("") || '<div class="dim">Say hello to your team.</div>';
  }
  body.scrollTop=body.scrollHeight;
}
function onChatInput(){
  const el=document.getElementById("chatIn"); if(!el) return;
  const v=el.value; const at=v.lastIndexOf("@");
  if(at>=0 && (at===v.length-1 || /^\w*$/.test(v.slice(at+1)))){
    const frag=v.slice(at+1).toLowerCase();
    const matches=(members||[]).filter(m=>m.pid!==me.pid && m.name.toLowerCase().startsWith(frag));
    showMentionPicker(matches, at);
  } else hideMentionPicker();
}
function showMentionPicker(matches, at){
  const p=document.getElementById("mentionPicker"); if(!p) return;
  if(!matches.length){ hideMentionPicker(); return; }
  p.innerHTML=matches.map(m=>`<div class="mpick" onclick="pickMention('${esc(m.name)}',${at})"><span class="dot" style="background:${m.color}"></span>${esc(m.name)}</div>`).join("");
  p.style.display="block";
}
function pickMention(name, at){
  const el=document.getElementById("chatIn");
  el.value = el.value.slice(0,at) + "@"+name+" ";
  hideMentionPicker(); el.focus();
}
function hideMentionPicker(){ const p=document.getElementById("mentionPicker"); if(p) p.style.display="none"; }

/* ---------- ALLOCATION + CAPTAIN OVERLAYS (during game) ---------- */
function renderNetOverlays(){
  // captain badge + allocation banner injected into the board's top area
  const host=document.getElementById("netlayer") || (()=>{ const d=document.createElement("div"); d.id="netlayer"; document.body.appendChild(d); return d; })();
  let html="";

  // the table display is a passive board — no allocation controls, no chat composer
  if(typeof iAmSpectator!=="undefined" && iAmSpectator){
    if(U && U.phase==="allocation") html += `<div class="specBanner">Allocation — the captain is distributing Action Points…</div>`;
    html += `<div class="dirtools" title="Laptop-only tools for testing and bug reports">
      <button onclick="openForcePanel()">🧪 Force</button>
      <button onclick="doDirectorUndo()">↶ Undo</button>
      <button onclick="openCaptureModal()">📸 Capture</button>
    </div>`;
    html += captureModalHTML();
    html += forcePanelHTML();
    host.innerHTML = html;
    return;
  }

  if(U && U.phase==="allocation"){
    // the situation room has its own permanent, prominent chat — don't also render the FAB chat
    // (that would duplicate #chatBody / #chatIn). Ask/FAQ stay available inside the room's chat.
    host.innerHTML = html + allocationUI();
    renderChat();
    return;
  }
  // team chat always available as a side drawer toggle
  html += `<button class="chatFab" onclick="toggleChatDrawer()">💬</button>
    <div id="chatDrawer" class="chatDrawer">${chatPanel()}
      <div class="askbox"><input id="askIn" class="inp sm" placeholder="Ask the game a question…" onkeydown="if(event.key==='Enter')askGame()"><button class="mini" onclick="askGame()">ask</button></div>
      <div id="askReply" class="askreply"></div>
      <button class="mini faqbtn" onclick="toggleFAQ()">FAQ</button>
    </div>
    <div id="faqModal" class="faqModal" style="display:none">${faqHTML()}</div>`;

  host.innerHTML=html;
  renderChat();
}

function captureModalHTML(){
  return `<div id="captureModal" class="captureModal" style="display:none">
    <div class="capBox">
      <div class="capTitle">📸 Capture game state</div>
      <div class="capHint">Saves this turn + the previous turn as one file on this laptop (<code>captures/</code>).
        Describe what went wrong or what you expected — this note is saved with it.</div>
      <textarea id="captureNote" class="capNote" placeholder="What happened? What did you expect? Which seat / pathogen / organ? (You can write as much as you need.)"></textarea>
      <div class="capBtns">
        <button class="mini" onclick="closeCaptureModal()">Cancel</button>
        <button class="mini pri" onclick="doCapture()">Save capture</button>
      </div>
    </div>
  </div>`;
}

/* ---- spectator FORCE panel (testing only). Mirrors the single-player force panel, but every
   click travels to the server, which injects into the authoritative game and broadcasts. ---- */
function forcePanelHTML(){
  const btn=(kind,val,label)=>`<button class="fbtn" onclick="doDirectorForce('${kind}','${String(val).replace(/'/g,"\\'")}')">${label||val}</button>`;
  const types=[["virus","Virus"],["hidden","Hidden virus"],["bacteria","Bacteria"],["toxin","Toxin"],["venom","Venom"],["fungus","Fungus"],["worm","Worm"],["malaria","Malaria"],["parasite","Parasite"]];
  const named=["HIV","Kala-azar","Filariasis","Measles","Giardia","Sleeping sickness","Amoebiasis","Diphtheria","Botulism","Tapeworm"];
  const spawn=types.map(([t,n])=>btn("type",t,n)).join("");
  const spawnNamed=named.map(n=>btn("card",n)).join("");
  const cri=(typeof EVENTS!=="undefined"?Object.keys(EVENTS):[]).map(k=>btn("crisis",k,EVENTS[k].name)).join("");
  const rare=(typeof RARE!=="undefined"?Object.keys(RARE):[]).map(k=>btn("rare",k,RARE[k].name)).join("");
  return `<div id="forcePanel" class="forcePanel" style="display:none">
    <div class="fpBox">
      <div class="fpTitle">🧪 Force panel <span class="fpSub">· testing only · injects into the live game</span>
        <button class="fpX" onclick="closeForcePanel()">×</button></div>
      <div class="fpLbl">Spawn by type</div><div class="fgrid">${spawn}</div>
      <div class="fpLbl">Spawn a special card</div><div class="fgrid">${spawnNamed}</div>
      <div class="fpLbl">Fire a crisis event</div><div class="fgrid">${cri}</div>
      <div class="fpLbl">Fire a rare event</div><div class="fgrid">${rare}</div>
    </div>
  </div>`;
}
function openForcePanel(){ const p=document.getElementById("forcePanel"); if(p) p.style.display="flex"; }
function closeForcePanel(){ const p=document.getElementById("forcePanel"); if(p) p.style.display="none"; }


function allocSeatLabel(seat){
  if(seat.indexOf("res_")===0){ const o=seat.slice(4); return (typeof ORGANS!=="undefined"&&ORGANS[o]?ORGANS[o].name:o); }
  return (typeof UM!=="undefined"&&UM[seat]?UM[seat].n:seat);
}
function allocationUI(){
  const pool = U.apBudget && U.apBudget[U.captain] ? U.apBudget[U.captain] : 0;
  const total = U.apPool||0;
  const capName = (members.find(m=>m.pid===U.captain)||{}).name || "Captain";
  const cap = iAmCaptain();

  // --- the shared situation: this turn's threats (same source as the mobile home) ---
  const paths = (typeof mbPathogens==="function") ? mbPathogens() : [];
  const chips = paths.map(p=>{
    const where=(typeof mbWhere==="function")?mbWhere(p.loc):"";
    const tag=p.threat==="red"?"imminent":(p.threat==="amber"?"building":"quiet");
    return `<span class="tchip t-${p.threat}"><b>${esc(p.dz)}</b> · ${esc(where)} · ${tag}${p.n>1?" ×"+p.n:""}</span>`;
  }).join("");
  const situation = chips
    ? `<div class="asub">This turn's threats — plan against these</div><div class="threatChips">${chips}</div>`
    : `<div class="asub">This turn's threats</div><div class="threatChips"><span class="tchip">No active threats — a calm turn to build up.</span></div>`;

  // --- AP distribution ---
  const rows = (U.players||[]).map(pid=>{
    const mem=members.find(m=>m.pid===pid)||{name:pid,color:"#ccc"};
    const has=U.apBudget[pid]||0, isCap=pid===U.captain;
    const seats=Object.keys(U.owner||{}).filter(s=>U.owner[s]===pid).map(allocSeatLabel);
    const seatTxt = seats.length ? seats.join(", ") : "no seats";
    const give = cap && !isCap ? `<button class="mini" onclick="allocateAP('${pid}',1)">+1</button>
                                  <button class="mini" onclick="allocateAP('${pid}',3)">+3</button>` : "";
    const back = (pid===me.pid && !isCap && has>0) ? `<button class="mini" onclick="returnAP(1)">give 1 back</button>` : "";
    return `<div class="allocrow">
      <span class="dot" style="background:${mem.color}"></span>
      <span class="an">${esc(mem.name)}${isCap?' ★':''}${pid===me.pid?' (you)':''}<em class="seats">${esc(seatTxt)}</em></span>
      <span class="apval">${has}<small>AP</small></span>${give}${back}
    </div>`;
  }).join("");

  const distFoot = cap
    ? `<button class="bigbtn sm" onclick="confirmAllocation()">Confirm plan → begin turn</button>
       <div class="allocnote">AP you don't hand out stays with you — spendable only on your own controllables.</div>`
    : `<div class="allocwait">Waiting for <b>${esc(capName)}</b> to confirm the plan…</div>`;

  return `<div class="allocOverlay">
    <div class="allocRoom">
      <div class="allocHead">🩺 Situation room · Turn ${U.turn} — plan the response together</div>
      <div class="allocThreats">${situation}</div>
      <div class="allocDist">
        <div class="asub">Action Points · pool <b>${pool}</b> of ${total} unallocated</div>
        <div class="allocrows">${rows}</div>
        ${distFoot}
      </div>
      <div class="allocChat">
        <div class="asub">Team chat — talk it through</div>
        ${chatPanel()}
      </div>
    </div>
  </div>`;
}

function toggleChatDrawer(){ const d=document.getElementById("chatDrawer"); if(d) d.classList.toggle("open"); renderChat(); }
function showAskReply(ans){ const r=document.getElementById("askReply"); if(r) r.innerHTML=`<div class="areply">${esc(ans)}</div>`; }
function toggleFAQ(){ const f=document.getElementById("faqModal"); if(f) f.style.display = f.style.display==="none"?"block":"none"; }

/* ---------- FAQ (static) ---------- */
function faqHTML(){
  const items=[
    ["How do you win?","New infections arrive until the outbreak window ends (turn 15/20/30 by difficulty). After that, no new infections come — you win by clearing the body of every pathogen. If you can't clear it within 15 more turns, or any organ hits 0 integrity, you lose."],
    ["What is the captain's job?","Each turn the whole team shares one pool of Action Points. The captain distributes that pool among the players. You discuss the plan, the captain hands out AP, players spend it on their own cells. Any AP the captain doesn't hand out stays with the captain — usable only on their own controllables."],
    ["Why can't I control every cell?","You only command the controllables you claimed. This forces real cooperation — like a real immune system, no single cell wins alone."],
    ["What do antibodies do, and who controls them?","The B-Cell makes antibodies (by class: ENV, EUK, EXB, NAK, ICB, TOX). Antibodies neutralise viruses/toxins and coat (tag) bacteria and parasites so phagocytes can grip them. Whoever owns the B-Cell controls all antibody actions."],
    ["What's the difference between the cells?","Monocyte engulfs; Neutrophil NETs a swarm (then regenerates); B-Cell makes antibodies; Killer T snipes hidden/infected cells; Helper T boosts the B-Cell; NK kills infected cells up close; Eosinophil strikes worms and parasites (and can degranulate for a big hit)."],
    ["Why did a fast pathogen reach an organ so quickly?","Some diseases are medical emergencies (Meningitis, Cholera, Gas gangrene, Plague, Ebola, sepsis). They move faster — the ⚡ FAST badge marks them. Answer them the turn they appear."],
    ["What happens when bacteria aren't tagged?","Untagged bacteria divide every turn — on Hard they're guaranteed to double. Coat (tag) them early or a swarm overwhelms you."],
    ["What is the bloodstream hub?","The central heart. Every pathogen pauses there for one turn before heading to an organ — it's the chokepoint where your circulating cells get a clean shot."],
  ];
  return `<div class="faqCard">
    <div class="faqtl">Frequently asked questions <button class="mini x" onclick="toggleFAQ()">close</button></div>
    ${items.map(([q,a])=>`<div class="faqitem"><div class="faqq">${esc(q)}</div><div class="faqa">${esc(a)}</div></div>`).join("")}
  </div>`;
}
