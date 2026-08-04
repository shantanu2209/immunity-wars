/* =========================================================================
   MOBILE HOME (Stage 2) — the new phone overview, driven by LIVE engine state.
   Replaces the old region-zoom overview for PLAYERS. Tapping a landmark opens
   the EXISTING zoomed panel (openLanePanel/openBranchPanel/openBloodstream),
   where real actions already route through the server. The body stays a clean
   map: organs/hub/entries + threat halos only — controllables live on the right
   rail, pathogens on the left rail, readouts in the bottom drawers.
   ========================================================================= */

const MB = {
  ORGAN_POS:{brain:[50,9],lungs:[42,29],heart:[58,33],liver:[16,53],spleen:[84,53],kidneys:[50,60],marrow:[50,73]},
  HUB:[50,45],
  ENTRIES:[{k:"nose",g:"mucosal",x:61,y:15},{k:"gut",g:"mucosal",x:38,y:57},{k:"contact",g:"mucosal",x:11,y:40},
           {k:"blood",g:"blood",x:88,y:41},{k:"wound",g:"skin",x:26,y:85},{k:"bite",g:"skin",x:74,y:85}],
  OCOL:{brain:"#c084fc",lungs:"#7dd3fc",heart:"#fb7185",liver:"#fbbf24",spleen:"#f472b6",kidneys:"#2dd4bf",marrow:"#fb923c"},
  ONAME:{brain:"Brain",lungs:"Lungs",heart:"Heart",liver:"Liver",spleen:"Spleen",kidneys:"Kidneys",marrow:"Bone Marrow"},
  TG:{mucosal:"#f0a5c0",skin:"#c8a37a",blood:"#e6394b"},
  FAMCOL:{ENV:"#ef4444",NAK:"#f97316",EXB:"#9bb02f",ICB:"#14b8a6",TOX:"#84cc16",EUK:"#e879f9",X:"#fbbf24"},
  FAMK:["ENV","NAK","EXB","ICB","TOX","EUK"],
  RANK:{green:0,amber:1,red:2},
};

/* ---- threat: how close is a pathogen to doing harm ---- */
function mbSpeed(iv){ return (typeof FAST_DISEASE!=="undefined" && FAST_DISEASE[iv.disease]) || 1; }
function mbThreatOf(iv){
  if(iv.zone==="hub") return "amber";                       // in the blood, about to pick an organ
  const s=mbSpeed(iv), step=iv.step==null?9:iv.step;         // step counts DOWN to the target (organ or hub)
  if(step<=s) return "red";                                  // reaches its target next turn
  if(step<=2*s) return "amber";
  return "green";
}
function mbLandmarkThreat(){
  const m={};
  (U.invaders||[]).forEach(iv=>{
    const t=mbThreatOf(iv);
    let key=null;
    if(iv.zone==="hub") key="hub";
    else if(iv.zone==="route") key="entry:"+iv.lane;
    else if(iv.zone==="branch") key="organ:"+iv.organ;
    if(key && (!m[key] || MB.RANK[t]>MB.RANK[m[key]])) m[key]=t;
  });
  return m;
}
function mbThreatClass(map,key){ return map[key] ? "t-"+map[key] : ""; }

/* ---- my AP budget (per-player in multiplayer) ---- */
function mbMyAP(){ return U.multiplayer ? ((U.apBudget&&U.apBudget[me.pid])||0) : (U.ap||0); }

/* ---- the single contextual phase control (captain acts; others see it greyed) ---- */
function mbPhaseButton(){
  if(U.phase==="infection" && !U.drawn) return {label:"Draw the infection →", act:"draw"};
  if(U.phase==="infection" && U.drawn)  return {label:"Begin command →", act:"beginCommand"};
  if(U.phase==="allocation")            return {status:"Captain is allocating Action Points…"};
  if(U.phase==="command")               return {label:"End the turn →", act:"endCommand"};
  return {status:"Resolving…"};
}

/* ---- distinct pathogens, most-urgent first ---- */
function mbPathogens(){
  const by={};
  (U.invaders||[]).forEach(iv=>{
    const t=mbThreatOf(iv);
    const a=(by[iv.disease]=by[iv.disease]||{dz:iv.disease,type:iv.type,fam:(typeof famOf==="function"?famOf(iv):"?"),n:0,threat:"green",loc:iv,step:99});
    a.n++;
    if(MB.RANK[t]>MB.RANK[a.threat]){ a.threat=t; a.loc=iv; }
    a.step=Math.min(a.step, iv.step==null?99:iv.step);
  });
  return Object.values(by).sort((x,y)=> MB.RANK[y.threat]-MB.RANK[x.threat] || x.step-y.step);
}
function mbWhere(iv){
  if(iv.zone==="hub") return "Bloodstream";
  if(iv.zone==="route") return (ROUTES[iv.lane]?ROUTES[iv.lane].name:iv.lane)+" "+iv.step;
  return (ORGANS[iv.organ]?ORGANS[iv.organ].name:iv.organ)+" "+iv.step;
}
/* open the zoomed panel for a location */
function mbOpenLoc(iv){
  if(iv.zone==="hub") return openBloodstream(null,true);
  if(iv.zone==="route") return openLanePanel("route", iv.lane, null, true);
  return openBranchPanel(iv.organ, null, true);
}

/* ---- my controllables (only the seats I own) ---- */
function mbMyControllables(){
  const out=[];
  (typeof CELL_KEYS!=="undefined"?CELL_KEYS:[]).forEach(ck=>{
    if(!ownsSeat(ck) || !U.cells[ck]) return;
    const c=U.cells[ck]; const spent=((ck==="neutrophil"||ck==="eosinophil")&&c&&!c.alive);
    // a crisis event can knock a cell OFFLINE entirely (neutropenia / lymphopenia)
    const sup=(U.suppress&&((ck==="neutrophil"&&U.suppress.neutrophil>0)||(ck==="tcell"&&U.suppress.tcell>0)));
    out.push({kind:"cell",key:ck,name:UM[ck].n,glyph:UM[ck].g,dead:(spent||sup),offline:!!sup,cell:c});
  });
  (U.organList||[]).forEach(o=>{ if(!ownsSeat("res_"+o)) return;
    out.push({kind:"res",key:o,name:(ORGANS[o]?ORGANS[o].name:o)+" resident",glyph:(UM.macrophage?UM.macrophage.g:"M"),dead:false,organ:o});
  });
  return out;
}
function mbSelectControllable(c){
  if(c.kind==="cell"){
    const cell=U.cells[c.key];
    if(cell.zone==="route") return openLanePanel("route", cell.lane, c.key);
    if(cell.zone==="branch") return openBranchPanel(cell.organ, c.key);
    return openBloodstream(c.key);
  } else {
    return openBranchPanel(c.organ, null, false);
  }
}

/* ---- MAIN RENDER ---- */
function renderMobileHome(){ try{ setTimeout(()=>{ if(typeof showEventAlert==="function") showEventAlert(); },0); }catch(e){}
  const thr=mbLandmarkThreat();
  const pb=mbPhaseButton();
  const inWin=U.turn<=U.maxTurn;

  // body markers
  const organs=Object.keys(MB.ORGAN_POS).map(o=>{
    const [x,y]=MB.ORGAN_POS[o], tc=mbThreatClass(thr,"organ:"+o), rec=o==="kidneys"?" recessed":"";
    const art=(typeof ART!=="undefined"&&ART.organ&&ART.organ[o])?`<img src="${ART.organ[o]}" alt="">`:MB.ONAME[o][0];
    return `<button class="mmk mmorgan${rec} ${tc}" id="mk-organ-${o}" style="left:${x}%;top:${y}%;--oc:${MB.OCOL[o]}"
      onclick="openBranchPanel('${o}',null,true)" aria-label="${MB.ONAME[o]}">${art}</button>`;
  }).join("");
  const hub=`<button class="mmk mmhub ${mbThreatClass(thr,"hub")}" id="mk-hub" style="left:${MB.HUB[0]}%;top:${MB.HUB[1]}%"
      onclick="openBloodstream(null,true)" aria-label="Bloodstream"><span class="mmcore"></span></button>`;
  const entries=MB.ENTRIES.map(e=>{
    const tc=mbThreatClass(thr,"entry:"+e.k);
    return `<button class="mmk mmentry ${tc}" id="mk-entry-${e.k}" style="left:${e.x}%;top:${e.y}%;--ec:${MB.TG[e.g]}"
      onclick="openLanePanel('route','${e.k}',null,true)" aria-label="${e.k} entry"><span class="mmdot"></span></button>`;
  }).join("");

  // left rail — pathogens
  const paths=mbPathogens();
  const lpips=paths.map((p,i)=>{
    const _pa=(typeof ART!=="undefined"&&ART.path)?((p.novel&&ART.path.novel)?ART.path.novel:ART.path[p.type]):null;
    const art=_pa?`<img src="${_pa}" alt="">`:"?";
    return `<button class="lpip t-${p.threat}" onclick="mbShowPath(${i})" aria-label="${p.dz}">${art}</button>`;
  }).join("");

  // right rail — my controllables
  const ctrls=mbMyControllables();
  const rtoks=ctrls.map((c,i)=>{
    const art=(c.kind==="cell"&&typeof ART!=="undefined"&&ART.cell&&ART.cell[c.key])?`<img src="${ART.cell[c.key]}" alt="">`:c.glyph;
    const st=c.dead?"spent":"ready";
    return `<button class="ctok ${c.dead?'spent':''}" onclick="mbSelCtrl(${i})" aria-label="${c.name}">${art}<span class="sdot ${st}"></span></button>`;
  }).join("");

  // bottom — AP + micro-arsenal + log tick
  const ab=U.ab||{}, myap=mbMyAP();
  const threatFams=new Set(paths.map(p=>p.fam));
  const arsenal=MB.FAMK.map(f=>{
    const have=(ab[f]||0)>0, hot=threatFams.has(f), col=MB.FAMCOL[f];
    return `<div class="ac" id="mb-ac-${f}" style="background:${have?col:'transparent'};color:${have?'#0c0710':col};border-color:${hot?col:'transparent'}">${f}<span class="n">${ab[f]||0}</span></div>`;
  }).join("");
  const apPips=Array.from({length:Math.max(myap,1)}).map((_,i)=>`<i class="${i<myap?'on':''}"></i>`).join("");
  const lastLog=(U.log&&U.log[0])?("T"+U.log[0].t+" "+String(U.log[0].msg).replace(/<[^>]+>/g,'')):"…";

  const urgent=paths.find(p=>p.threat==="red");
  const alert=urgent?`<div class="mbAlert">⚠ ${urgent.dz} — ${mbWhere(urgent.loc)}</div>`:"";

  const _cap = (typeof iAmCaptain==="function") && iAmCaptain();
  const phaseCtl = pb.act
    ? (_cap
        ? `<button class="mbPhase" onclick="act({action:'${pb.act}'})">${pb.label}</button>`
        : `<button class="mbPhase disabled" onclick="flashMsg('Only the captain can do this')">${pb.label}</button>`)
    : `<div class="mbPhase wait">${pb.status}</div>`;

  document.getElementById("app").innerHTML = `
    <div class="mbPlay">
      <div class="mbTop">
        <div class="mbStatus">
          <span class="turn">T${U.turn}<small>/${inWin?U.maxTurn:U.maxTurn+15}</small></span>
          <span class="phase">${(U.phase||"").replace(/^./,c=>c.toUpperCase())}</span>
          <span class="ob ${inWin?'':'mop'}">${inWin?'OUTBREAK':'MOP-UP'}</span>
        </div>
        ${phaseCtl}
      </div>
      ${alert}
      <div class="mbMid">
        <div class="lrail"><div class="rlabel">Threats</div>${lpips||'<div class="rl0">—</div>'}<div class="lcount">${paths.length}</div></div>
        <div class="mmstage"><div class="mmbox">
          <img class="mmbody" src="body.png" alt="Body">
          ${organs}${hub}${entries}
        </div></div>
        <div class="rrail"><div class="rlabel">Yours</div>${rtoks||'<div class="rl0">—</div>'}</div>
      </div>
      <div class="mbBottom">
        <div class="ap">AP<span class="pips">${apPips}</span></div>
        <button class="arsenal" onclick="mbDrawer('adaptive')">${arsenal}</button>
        <button class="logtick" onclick="mbDrawer('log')">${lastLog}</button>
      </div>
    </div>`;
}

/* ---- interactions the mobile home adds ---- */
function mbShowPath(i){
  const p=mbPathogens()[i]; if(!p) return;
  mbOpenLoc(p.loc);                                  // open its zoomed panel
  const el=document.getElementById(
    p.loc.zone==="hub" ? "mk-hub" : "mk-"+(p.loc.zone==="route"?"entry-"+p.loc.lane:"organ-"+p.loc.organ));
  if(el){ el.classList.remove("mmflash"); void el.offsetWidth; el.classList.add("mmflash"); setTimeout(()=>el.classList.remove("mmflash"),1500); }
}
function mbSelCtrl(i){ const c=mbMyControllables()[i]; if(!c) return;
  if(c.offline){
    const why = c.key==="neutrophil"
      ? "Neutrophil OFFLINE — neutropenia has crashed your neutrophil count. It can't act for "+U.suppress.neutrophil+" more turn(s)."
      : "Killer T-Cell OFFLINE — lymphopenia has crashed your lymphocyte count. It can't act for "+U.suppress.tcell+" more turn(s).";
    flashMsg(why); return;
  }
  if(c.dead){
    const who = c.key==="eosinophil" ? "Eosinophil" : "Neutrophil";
    const rn = c.cell && c.cell.regenAt;
    flashMsg(`The ${who} is spent — it's regenerating${rn?` (ready on turn ${rn})`:""} and can't act yet.`);
    return;
  }
  mbSelectControllable(c);
}
function mbDrawer(name){
  let ov=document.getElementById("mbDrawer");
  if(!ov){ ov=document.createElement("div"); ov.id="mbDrawer"; document.body.appendChild(ov); }
  ov.className="mbDrawerOv on";
  ov.innerHTML=`<div class="mbScrim" onclick="mbCloseDrawer()"></div><div class="mbSheet">${name==="adaptive"?mbAdaptive():mbLog()}</div>`;
}
function mbCloseDrawer(){ const ov=document.getElementById("mbDrawer"); if(ov) ov.remove(); }
function mbAdaptive(){
  const ab=U.ab||{}, C0=U.antibodyCap||5;
  const cells=MB.FAMK.map(f=>{
    const have=ab[f]||0, c=C0, col=MB.FAMCOL[f];
    const pips=Array.from({length:Math.max(c,1)}).map((_,i)=>`<i style="${i<have?'background:'+col:''}"></i>`).join("");
    return `<div class="abcell" style="color:${col}"><div class="at">${f}</div><div class="apips">${pips}</div></div>`;
  }).join("");
  const seen=Object.keys(U.seen||{}).filter(d=>!((U.memory||{})[d]));
  const vax=seen.map(d=>{ const put=(U.vaccine||{})[d]||0, C=(typeof VACCINE_COST!=="undefined"?VACCINE_COST:5);
    return `<div class="vrow"><div class="vn">${d}</div><div class="vbar"><div style="width:${Math.round(100*put/C)}%"></div></div><div class="vp">${put}/${C}</div></div>`;}).join("");
  const imm=Object.keys(U.memory||{}).map(d=>`<span class="chip">✔ ${d}</span>`).join("");
  return `<div class="phead">Adaptive response<button class="x" onclick="mbCloseDrawer()">×</button></div>
    <div class="pbody"><div class="dsub">Antibody arsenal</div><div class="abgrid">${cells}</div>
    ${vax?`<div class="dsub">Vaccine development</div>${vax}`:''}
    ${imm?`<div class="dsub">Immune — memory waiting</div><div class="vimm">${imm}</div>`:''}</div>`;
}
function mbLog(){
  const rows=(U.log||[]).slice(0,20).map(l=>`<div class="logrow ${l.kind||''}"><b class="tt">T${l.t}</b>${l.msg}</div>`).join("");
  return `<div class="phead">Event log<button class="x" onclick="mbCloseDrawer()">×</button></div><div class="pbody">${rows}</div>`;
}

/* ---- systemic-antibody target picker (neutralise / tag / memory / antivenom) ----
   The B-Cell's antibodies reach ANY lane, but a modal lane panel only shows one lane's
   invaders — so a target in another lane was unreachable (the "stuck after neutralise" bug).
   This lists every valid target across the whole body and lets you tap one. */
function mbPickTarget(mode){
  const label = {neutralise:"Neutralise",tag:"Tag / coat",memory:"Memory kill",antivenom:"Antivenom"}[mode]||"Choose target";
  const targets = (U.invaders||[]).filter(iv=>{ try{ return targetable(iv); }catch(e){ return false; } });
  let ov=document.getElementById("mbTargetOv");
  if(!ov){ ov=document.createElement("div"); ov.id="mbTargetOv"; document.body.appendChild(ov); }
  ov.className="mbDrawerOv on";
  const place = iv => iv.zone==="hub" ? "bloodstream"
      : iv.zone==="route" ? ((MB.ENAME&&MB.ENAME[iv.lane])||iv.lane)+" route"
      : ((MB.ONAME&&MB.ONAME[iv.organ])||iv.organ);
  const rows = targets.length
    ? targets.map(iv=>`<button class="mbTargetRow" onclick="mbHitTarget('${iv.id}')">
        <span class="mbtName">${ue(iv.disease)}</span>
        <span class="mbtMeta">${ue(iv.type)} · ${ue(place(iv))}</span></button>`).join("")
    : `<div class="mbtEmpty">No valid target for ${label} right now — you need a matching antibody and the pathogen must be reachable.</div>`;
  ov.innerHTML=`<div class="mbScrim" onclick="mbCloseTarget()"></div><div class="mbSheet">
    <div class="phead">${label} — tap a target<button class="x" onclick="mbCloseTarget()">×</button></div>
    <div class="pbody">${rows}</div></div>`;
}
function mbHitTarget(id){ const iv=(U.invaders||[]).find(x=>x.id===id); mbCloseTarget(); if(iv && typeof hit==="function") hit(iv); }
function mbCloseTarget(){ const o=document.getElementById("mbTargetOv"); if(o) o.className="mbDrawerOv"; if(typeof sel==="object") sel.mode=null; }
