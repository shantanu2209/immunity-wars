/* ===== SPECTATOR MODE — passive projected board (layered over the intact v2 UI) =====
   Reuses the real board renderer (buildBody/drawOrgans/tokens) verbatim and the real
   engine. Replaces ONLY the app shell (landscape gutters) and the side chrome (passive
   readouts). All interactivity is disabled via pointer-events in spec.css. */

const SPECTATOR = true;

/* ---- landscape app shell ---- */
function specShell(){
  document.getElementById("app").innerHTML = `
    <div class="specTop">
      <div class="specTitle"><span class="specHeart">&#9829;</span> Immunity Wars
        <span class="specSub">spectator board &middot; everyone plays on phones</span></div>
      <div class="specStatus" id="specStatus"></div>
    </div>
    <div class="specBanner" id="specBanner"></div>
    <div class="specStage">
      <div class="specGutter" id="specLeft"></div>
      <div class="specBody"><div class="body"><div class="bodyInner" id="bodyInner"></div></div></div>
      <div class="specGutter" id="specRight"></div>
    </div>
    <div class="specLog" id="specLog"></div>`;
}

/* ---- top status strip ---- */
function specStatus(){
  const el=document.getElementById("specStatus"); if(!el) return;
  const inWin = U.turn<=U.maxTurn;
  const cap = inWin ? U.maxTurn : U.maxTurn+15;
  const apMax = U.apMax||U.ap||0;
  const pips = Array.from({length:apMax}).map((_,i)=>`<i class="${i<U.ap?'on':''}"></i>`).join("");
  const ph = U.phase==="command" ? "Command"
           : U.phase==="infection" ? (U.turn>U.maxTurn?"Mop-up":"Infection")
           : "Spread";
  el.innerHTML =
    `<div class="stChip">Turn <b>${U.turn}</b><span>/ ${cap}</span></div>`+
    `<div class="stChip">${ph} phase</div>`+
    `<div class="stChip">AP <span class="pips">${pips}</span></div>`+
    `<div class="stChip ${inWin?'bad':'good'}">${inWin?'OUTBREAK':'MOP-UP'}</div>`;
}

/* ---- crisis / warning banner ---- */
function specBanner(){
  const el=document.getElementById("specBanner"); if(!el) return;
  let h="";
  if(U.banner) h+=`<div class="crisis ${U.banner.bad?'bad':'good'}"><div class="ic">${U.banner.bad?'⚠️':'✚'}</div><div><div class="ct">${ue(U.banner.name)}</div><div class="cs">${ue(U.banner.why||"")}</div></div></div>`;
  if(U.warning) h+=`<div class="crisis warn"><div class="ic">⏳</div><div><div class="ct">Brewing: ${ue(U.warning.name)}</div><div class="cs">${ue(U.warning.text||"")}</div></div></div>`;
  el.innerHTML=h;
}

/* ---- LEFT gutter: threats + arsenal ---- */
function threatReadout(){
  const active={};
  (U.invaders||[]).forEach(iv=>{
    const a=(active[iv.disease]=active[iv.disease]||{dz:iv.disease,type:iv.type,n:0,where:new Set()});
    a.n++;
    a.where.add(iv.zone==="hub"?"blood":(iv.zone==="route"?(ROUTES[iv.lane]?ROUTES[iv.lane].name:iv.lane):(ORGANS[iv.organ]?ORGANS[iv.organ].name:"organ")));
  });
  const list=Object.values(active);
  if(!list.length) return `<div class="specEmpty">No pathogens in the body — the outbreak is contained.</div>`;
  return `<div class="threatList">`+list.map(a=>{
    const fam=a.dz==="Pathogen X"?"X":(FAMILY[a.dz]||"?");
    const col=fam==="X"?"#fbbf24":(FAMILIES[fam]?FAMILIES[fam].col:"#8a7186");
    const _art=(typeof ART!=="undefined"&&ART.path)
      ? ((a.novel&&ART.path.novel)?ART.path.novel:ART.path[a.type]) : null;
    const g=_art ? `<img src="${_art}" alt="${a.novel?'unknown pathogen':a.type}"/>`
                 : (UI_[a.type]||{g:"?"}).g;
    return `<div class="threat" style="border-left-color:${col}">
      <div class="tIcon" style="color:${col};border-color:${col}">${g}</div>
      <div class="tMid">
        <div class="tName">${ue(a.dz)}${a.n>1?` <span class="tCnt">×${a.n}</span>`:""}</div>
        <div class="tMeta"><span class="famchip" style="color:${col};border-color:${col}">${fam}</span> ${[...a.where].join(", ")}</div>
      </div></div>`;
  }).join("")+`</div>`;
}
function metersHTML(){
  return `<div class="specMeters">
    <div class="meter">🔬 <b>${U.presentations||0}</b> antigens presented</div>
    <div class="meter">💉 <b>${U.antivenom||0}</b> antivenom vials</div>
  </div>`;
}

/* ---- RIGHT gutter: seat roster + vaccine/immunity ---- */
function seatRoster(){
  const keys=CELL_KEYS.filter(ck=>!((ck==="helper"&&!U.flags.helperT)||(ck==="nk"&&!U.flags.nkCell)));
  const rows=keys.map(ck=>{
    const c=U.cells[ck];
    const place = c.zone==="hub" ? "Bloodstream"
      : c.zone==="route" ? (ROUTES[c.lane]?ROUTES[c.lane].name:c.lane)+" "+c.step
      : (ORGANS[c.organ]?ORGANS[c.organ].name:"organ")+" "+c.step;
    const cart=(typeof ART!=="undefined"&&ART.cell&&ART.cell[ck])
      ? `<img src="${ART.cell[ck]}" alt="${ck}"/>`
      : UM[ck].g;
    return `<div class="seat">
      <div class="sIcon" style="background:var(--c-${ck})">${cart}</div>
      <div class="sMid"><div class="sName">${UM[ck].n}</div><div class="sMeta">${place}</div></div>
      <div class="sOwner">seat open</div></div>`;
  }).join("");
  return `<div class="seatList">${rows}</div>
    <div class="seatNote">In multiplayer each seat is a player on their phone. Preview shows the seven cell seats; organ residents add seven more.</div>`;
}
function vaccineReadout(){
  const seen=Object.keys(U.seen||{}).filter(dz=>!((U.memory||{})[dz]));
  const immune=Object.keys(U.memory||{});
  const rows=seen.map(dz=>{
    const put=(U.vaccine||{})[dz]||0, pct=Math.round(100*put/VACCINE_COST);
    return `<div class="vrow"><div class="vn">${ue(dz)}</div><div class="vbar"><div style="width:${pct}%"></div></div><div class="vp">${put}/${VACCINE_COST}</div></div>`;
  }).join("");
  const immHTML = immune.length
    ? `<div class="vImmHdr">Immune — memory cells waiting</div><div class="vImm">${immune.map(dz=>`<span class="chip">✔ ${ue(dz)}</span>`).join("")}</div>`
    : "";
  if(!rows && !immHTML) return `<div class="specEmpty">No vaccine candidates yet — nothing has been captured and presented.</div>`;
  return `${rows?`<div class="vList">${rows}</div>`:`<div class="specEmpty">No candidates in development.</div>`}${immHTML}`;
}

/* ---- log ticker ---- */
function specLog(){
  const el=document.getElementById("specLog"); if(!el) return;
  const rows=(U.log||[]).slice(0,12).map(l=>`<span class="specLn ${l.kind||""}"><b>T${l.t}</b>${l.msg}</span>`).join("");
  el.innerHTML=`<div class="specLogRow">${rows||'<span class="specLn">The game begins…</span>'}</div>`;
}

/* ---- gutters composer ---- */
function specPanel(title, bodyHTML, grow){
  return `<div class="specPanel${grow?" grow":""}"><div class="ph">${title}</div><div class="pbody">${bodyHTML}</div></div>`;
}
function specGutters(){
  const L=document.getElementById("specLeft"), R=document.getElementById("specRight");
  if(L) L.innerHTML =
    specPanel("Threats in the body", threatReadout(), true) +
    specPanel("Antibody arsenal", `<div class="abgrid">${abPanel()}</div>${metersHTML()}`, false);
  if(R) R.innerHTML =
    specPanel("Who controls what", seatRoster(), true) +
    specPanel("Vaccine &amp; immunity", vaccineReadout(), false);
}

/* ---- the spectator draw: real board + passive chrome ---- */
function specDraw(){
  if(!U) return;
  buildBody(); drawOrgans(); tokens();
  specStatus(); specBanner(); specGutters(); specLog();
}

/* ---- keep the portrait body sized to fit the screen height ---- */
function fitBody(){
  const host=document.querySelector(".specBody"); const b=host&&host.querySelector(".body");
  if(!host||!b) return;
  const h=host.clientHeight;
  b.style.height=h+"px";
  b.style.width=(h*660/930)+"px";
}

/* ---- seed a representative mid-game state so the board reads as a real game ---- */
function seedDemo(){
  try{
    ["Influenza","Cholera","Tuberculosis","Snake venom","Malaria"].forEach(dz=>{ try{ forceCard(dz); }catch(e){} });
    const iv=U.invaders;
    const orgs=U.organList||[];
    // redistribute so germs sit at varied depths, in the blood, and near organs
    if(iv[0]){ iv[0].zone="route"; iv[0].step=Math.max(1,(ROUTES[iv[0].lane]?ROUTES[iv[0].lane].len:5)-2); }
    if(iv[1]){ iv[1].zone="hub"; iv[1].organ=null; }
    if(iv[2]&&orgs.length){ const o=orgs.includes("lungs")?"lungs":orgs[0]; iv[2].zone="branch"; iv[2].organ=o; iv[2].step=1; iv[2].lane=null; }
    if(iv[3]){ iv[3].zone="route"; iv[3].step=3; }
    if(iv[4]&&orgs.length){ const o=orgs.includes("liver")?"liver":orgs[Math.min(1,orgs.length-1)]; iv[4].zone="branch"; iv[4].organ=o; iv[4].step=0; iv[4].lane=null; }

    // arsenal: a partial adaptive response already built up
    U.ab   = Object.assign({ENV:0,NAK:0,EXB:0,ICB:0,TOX:0,EUK:0}, U.ab, {ENV:3,EXB:2,TOX:1});
    U.made = Object.assign({}, U.made, {ENV:4,EXB:2,TOX:1});
    U.presentations = 6;
    U.antivenom = 1;

    // vaccine lab: one in progress, one already immune (not currently in the body)
    U.seen    = Object.assign({}, U.seen, {Influenza:true, Cholera:true});
    U.vaccine = Object.assign({}, U.vaccine, {Influenza:2});
    U.memory  = Object.assign({}, U.memory, {Measles:true});

    // organ damage for visible stakes — one critical, one merely wounded (distinct organs)
    const critO = orgs.includes("lungs") ? "lungs" : orgs[0];
    const woundO = orgs.find(o=>o!==critO);
    if(U.organs[critO]) U.organs[critO].hp=1;
    if(woundO && U.organs[woundO] && U.organs[woundO].max>1) U.organs[woundO].hp=U.organs[woundO].max-1;

    // a few representative log lines so the ticker reads as a game in progress
    U.log = [
      {t:7, kind:"",    msg:"Kupffer cell engulfed a tagged bacterium."},
      {t:6, kind:"good",msg:"B-Cell produced ENV antibodies (+3)."},
      {t:6, kind:"",    msg:"Neutrophil moved to the Lungs branch."},
      {t:5, kind:"bad", msg:"Influenza reached the bloodstream."},
      {t:5, kind:"",    msg:"Antigen presented — vaccine research advanced."},
    ].concat(U.log||[]);

    // defenders out on patrol, not all stacked at the hub
    const place=(ck,z,lane,organ,step)=>{ const c=U.cells[ck]; if(!c) return; c.zone=z; c.lane=lane||null; c.organ=organ||null; c.step=step||0; };
    place("macrophage","route","gut",null,2);
    if(U.cells.neutrophil&&U.cells.neutrophil.alive!==false) place("neutrophil","branch",null,orgs.includes("lungs")?"lungs":orgs[0],1);
    place("tcell","route","nose",null,3);

    // a brewing crisis to show the banner
    U.warning = {name:"Cytokine storm", text:"Too many cells are swarming one site — friendly fire is building."};

    // clock / phase
    U.turn=7; U.phase="command"; U.ap=3;
  }catch(e){ /* demo seed is best-effort */ }
}

/* ---- boot spectator mode (replaces the base bootstrap) ---- */
function specBoot(){
  window.draw = specDraw;   // every redraw now goes through the spectator path
  specShell();              // build the landscape layout (creates #bodyInner)
  newG();                   // fresh game (calls draw()=specDraw)
  seedDemo();               // enrich it
  fitBody(); specDraw();
  requestAnimationFrame(fitBody);           // re-fit once layout settles
  window.addEventListener("load", fitBody);
  window.addEventListener("resize", fitBody);
}
