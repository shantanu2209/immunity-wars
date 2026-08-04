/* ============================================================================
   OWNER-RESTRICTED CONTROL PANELS — client override of the board's side().
   Everyone sees the board, tokens, organs, pathogen cards and the log. But the
   CONTROL PANELS (a cell's card + its action buttons, an organ station's actions,
   the antibody deployment block) render only for the seats this player owns.
   ============================================================================ */
(function(){
  // keep a reference to nothing — we fully replace side() below, reusing global helpers/consts
  // that the board script defines (CELL_KEYS, UM, ORGANS, OCOL, btns, abPanel, vaccinePanel, etc.)

  window.side = function side(){
    const owned = (typeof mySeats==="function") ? mySeats() : CELL_KEYS.slice().concat(U.organList.map(o=>"res_"+o));
    const ownsCell = ck => !U.multiplayer || owned.includes(ck);
    const ownsOrgan = o => !U.multiplayer || owned.includes("res_"+o);
    const ownsBcell = () => ownsCell("bcell");

    // ---- CELLS (only mine) ----
    const cellList = CELL_KEYS
      .filter(ck=>!((ck==="helper"&&!U.flags.helperT)||(ck==="nk"&&!U.flags.nkCell)))
      .filter(ownsCell);
    const cells = cellList.map(ck=>{
      const c=U.cells[ck], dead=((ck==="neutrophil"||ck==="eosinophil")&&!c.alive), s=(sel.kind==="cell"&&sel.key===ck);
      const aura=(ck==="bcell"||ck==="tcell")&&helperWith(U,ck);
      return `<div class="cc ${s?'sl span2':''} ${dead?'off':''}" onclick="${dead?'':`sel=(sel.kind==='cell'&&sel.key==='${ck}')?{kind:null,key:null,mode:null}:{kind:'cell',key:'${ck}',mode:null};draw()`}">
        <div class="tp"><div class="gl" style="background:var(--c-${ck})">${UM[ck].g}</div>
          <div><div class="nm">${UM[ck].n}${aura?' <span style="color:var(--c-helper)">✦</span>':''}</div><div class="rl">${UM[ck].r}</div></div>
          <div class="ps">${dead?`T${c.regenAt}`:placeTxt(c)}</div></div>
        ${s&&U.phase==="command"&&!busy&&!dead?`<div class="acts">${btns(ck)}</div>`:''}</div>`;
    }).join("");

    // ---- ORGAN STATIONS (only mine) ----
    const organList = U.organList.filter(ownsOrgan);
    const organCards = organList.map(o=>{
      const st=U.organs[o], M=ORGANS[o], r=U.residents[o], col=OCOL(o);
      const picked=(sel.kind==="organ"&&sel.key===o), hurt=st.hp<st.max, crit=st.hp<=1;
      const hc2=hpClass(st.hp,st.max);
      const bars=Array.from({length:st.max}).map((_,i)=>`<i class="${i<st.hp?hc2:'x'}"></i>`).join("");
      const canPrime=residentEatable(U,o).length>0;
      const rPicked=(sel.kind==="res"&&sel.key===o);
      const acts = (picked||rPicked)&&U.phase==="command"&&!busy ? `<div class="acts">
          <button class="bt sm ${rPicked&&sel.mode==='resmove'?'pri':''}" ${U.ap<=0?'disabled':''} onclick="event.stopPropagation();sel={kind:'res',key:'${o}',mode:null};setMode('resmove')">Patrol ${RNAME[o]}</button>
          <button class="bt sm ${rPicked&&sel.mode==='prime'?'pri':''}" ${(U.ap<=0||!canPrime)?'disabled':''} onclick="event.stopPropagation();sel={kind:'res',key:'${o}',mode:null};setMode('prime')">Engulf here</button>
        </div><div class="hnt" style="margin-top:5px">${RNAME[o]} · at ${r.step===0?"the organ":"branch "+r.step}. Auto-eats one virus or <b>tagged</b> bacterium free each turn. Never leaves this organ.</div>` : "";
      return `<div class="oc ${(picked||rPicked)?'sl span2':''} ${crit?'crit':hurt?'hurt':''}" style="border-left:3px solid ${col}"
          onclick="sel=(sel.kind==='organ'&&sel.key==='${o}')?{kind:null,key:null,mode:null}:{kind:'organ',key:'${o}',mode:null};draw()">
        <div class="tp"><div class="oglyph" style="color:${col};border-color:${col}">${RGLYPH[o]}</div>
          <div style="flex:1"><div class="nm" style="color:${col}">${M.name}</div>
            <div class="rl">${M.kind==="defence"?"defence organ":"vital organ"}</div></div>
          <div class="hp">${bars}</div></div>${acts}</div>`;
    }).join("");

    // ---- PATHOGEN CARDS (everyone sees) — reuse the original builder if present ----
    const card = (typeof buildPathogenCards==="function") ? buildPathogenCards() : pathogenCardsInline();

    // ---- ANTIBODY BLOCK (only the B-Cell owner) ----
    let abBlock="";
    if(ownsBcell()){
      const ag=U.presentations;
      const remembered=(U.invaders||[]).filter(iv=>iv.remembered && attackable(iv));
      const memBtn = remembered.length ? `<div class="avorder" style="border-color:var(--good)">
            <span class="hnt" style="flex:1">⚡ <b style="color:var(--good)">Memory response ready</b> — ${remembered.length} known pathogen${remembered.length>1?"s":""}. ${U.difficulty==="hard"?"Destroy each for 1 AP.":"Destroy each free."}</span>
            <button class="bt sm ${sel.mode==='memory'?'pri':''}" ${(U.phase!=="command"||busy||(U.difficulty==="hard"&&U.ap<1))?'disabled':''} onclick="setMode('memory')">Memory kill</button>
          </div>` : "";
      abBlock=`<div class="glass" style="padding:10px">
          <div class="lbl">Antibodies — one pool per antigen class ${sel.mode==="produce"?'<b style="color:var(--antibody)">· pick a class to make</b>':''}</div>
          ${memBtn}
          <div class="abgrid">${abPanel()}</div>
          <div class="meters">
            <div class="meter ag">🔬 <span class="mono">${ag}</span> antigens</div>
            <div class="meter av">💉 <span class="mono">${U.antivenom}</span> antivenom · 3 AP</div>
          </div>
          <div class="avorder">
            <span class="hnt" style="flex:1">Order antivenom. ${(U.avOrder||0)>0?`<b style="color:var(--good)">${U.avOrder}/${ANTIVENOM_ORDER} AP</b>`:`${ANTIVENOM_ORDER} AP for +1`}</span>
            <button class="bt sm" ${(U.phase!=="command"||U.ap<1||busy)?'disabled':''} onclick="act({action:'orderAntivenom',ap:1})">+1 AP</button>
            <button class="bt sm" ${(U.phase!=="command"||U.ap<2||busy)?'disabled':''} onclick="act({action:'orderAntivenom',ap:2})">+2</button>
          </div></div>`;
    }

    // ---- CELL BLOCK ----
    // The table display (spectator) owns nothing and shows NO control column — just a clean board.
    const isDisplay = (typeof iAmSpectator!=="undefined" && iAmSpectator);
    const cellBlock = isDisplay ? "" : (cellList.length||organList.length ? `<div class="glass" style="padding:10px">
        ${cellList.length?`<div class="lbl" style="margin-bottom:6px">Your cells · ${cellList.length}</div><div class="cp">${cells}</div>`:''}
        ${organList.length?`<div class="ctlsep"><span>Your organ stations · ${organList.length}</span></div><div class="cp cp-org">${organCards}</div>`:''}
      </div>` : `<div class="glass" style="padding:10px"><div class="hnt">You don't command any cells or organs — watch the board and guide your team in chat.</div></div>`);

    // ---- VACCINE (B-Cell owner) + LOG (everyone) ----
    const vacc = (!isDisplay && ownsBcell() && typeof vaccinePanel==="function") ? vaccinePanel() : "";
    const log=`<div class="lgb">${U.log.map(l=>`<div class="ln ${l.kind}"><span class="tt">T${l.t}</span>${l.msg}</div>`).join("")}</div>`;

    const el=document.getElementById("side");
    if(el) el.innerHTML = card + cellBlock + (isDisplay?"":abBlock) + vacc + log;
  };

  // Fallback pathogen-card builder if the original didn't expose one (it inlines it in side()).
  // We rebuild the compact strip + open card so everyone still sees pathogens.
  function pathogenCardsInline(){
    const active={};
    U.invaders.forEach(iv=>{ (active[iv.disease]=active[iv.disease]||{dz:iv.disease,type:iv.type,n:0,where:[]}).n++;
      active[iv.disease].where.push(iv.zone==="hub"?"blood":(iv.zone==="route"?ROUTES[iv.lane].name:ORGANS[iv.organ].name)); });
    const list=Object.values(active);
    let card="";
    if(U.phase==="infection"&&!U.drawn){
      // only the captain can draw (phase action); others see a waiting note
      card=`<div class="ca"><div class="lbl" style="text-align:center">Infection deck · ${typeof deckLeft==="function"?deckLeft():""}</div>
        ${iAmCaptain()
          ? `<div class="deck" onclick="act({action:'draw'})"><div><div class="dna">🧬</div><div class="t">Tap to draw</div></div></div>`
          : `<div class="deck dim"><div><div class="dna">🧬</div><div class="t">Captain draws…</div></div></div>`}
        </div>`;
    }
    if(list.length){
      const chips=list.map(a=>{
        const col=UI_[a.type].c;
        const fam=a.dz==="Pathogen X"?"X":(FAMILY[a.dz]||"?");
        const fcol=fam==="X"?"#fbbf24":(FAMILIES[fam]?FAMILIES[fam].col:"#888");
        const on=openCard===a.dz;
        const mem=!!(U.memory&&U.memory[a.dz]);
        const fast=FAST_DISEASE[a.dz];
        return `<div class="pchip ${on?'on':''}" style="border-color:${on?col:'var(--line2)'}"
            onclick="openCard=openCard==='${a.dz.replace(/'/g,"")}'?null:'${a.dz.replace(/'/g,"")}';draw()">
          <span class="pdot" style="background:${col}">${UI_[a.type].g}</span>
          <span class="pnm">${ue(a.dz)}</span>${a.n>1?`<span class="pn">×${a.n}</span>`:''}
          <span class="pfam" style="color:${fcol};border-color:${fcol}">${fam}</span>
          ${fast?`<span class="fasttag mini">⚡${fast===3?"×3":"×2"}</span>`:''}
          ${mem?'<span class="pmem">✔</span>':''}</div>`;
      }).join("");
      card+=`<div class="ca"><div class="stackHdr"><b>${list.length}</b> pathogen${list.length===1?"":"s"} in the body</div>
        <div class="stack">${chips}</div>
        ${U._dice&&U._dice.length?`<div class="dice">${U._dice.map(x=>`<div class="di ${x.hit?'h':''}">${x.face}</div>`).join("")}</div>`:''}</div>`;
    }
    return card;
  }
})();

/* ============================================================================
   PHASE BANNER — network-aware. Phase actions (draw / beginCommand / endCommand)
   are the captain's. The allocation phase shows a dedicated banner. Everyone else
   sees a waiting note. Crisis banners still show to all.
   ============================================================================ */
(function(){
  const origPhase = window.phase;
  window.phase = function phase(){
    if(!U || !U.multiplayer){ return origPhase(); }
    const el=document.getElementById("phb"); if(!el) return;
    let h="";
    const cap = iAmCaptain();
    if(busy){
      h=`<div class="phb"><div class="dt"></div><div><div class="pt">Spread</div><div class="ps">Dividing · bursting · marching…</div></div></div>`;
    } else if(U.phase==="infection"){
      const mopUp=U.turn>U.maxTurn;
      const label=mopUp?"🧹 Begin mop-up →":"🧬 Draw the next infection →";
      const sub=U.drawn?"Threat placed.":(mopUp?"Outbreak over — clear the body.":"A dice roll decides how many break in.");
      const btn = U.drawn
        ? (cap?`<button class="bt pri" onclick="act({action:'beginCommand'})">Begin allocation →</button>`:`<span class="hnt">Captain is starting the turn…</span>`)
        : (cap?`<button class="bt pri" onclick="act({action:'draw'})">${label}</button>`:`<span class="hnt">Captain draws the infection…</span>`);
      h=`<div class="phb"><div class="dt"></div><div><div class="pt">${mopUp?"Mop-up":"Infection"}</div><div class="ps">${sub}</div></div><div class="gw"></div>${btn}</div>`;
    } else if(U.phase==="allocation"){
      const myAP = (U.apBudget&&U.apBudget[me.pid])||0;
      h=`<div class="phb alloc"><div class="dt"></div><div><div class="pt">Allocation</div><div class="ps">${cap?"Distribute Action Points, then confirm.":"Captain is allocating AP. You have <b>"+myAP+" AP</b> so far."}</div></div></div>`;
    } else if(U.phase==="command"){
      const pips=Array.from({length:Math.max(U.apMax,U.ap)}).map((_,i)=>`<div class="pip ${i<U.ap?'on':''}"></div>`).join("");
      const endBtn = cap?`<button class="bt pri" onclick="act({action:'endCommand'})">End turn →</button>`:`<span class="hnt">Captain ends the turn</span>`;
      h=`<div class="phb"><div class="dt"></div><div><div class="pt">Command · your AP</div><div class="ps">You have <b>${U.ap} AP</b>.${sel.mode?` <b>${sel.mode}</b> · <span onclick="sel.mode=null;draw()" style="text-decoration:underline;cursor:pointer">cancel</span>`:''}</div></div>
        <div class="gw"></div><div class="pips">${pips}</div>${endBtn}</div>`;
    }
    // crisis banners (shared) — reuse original logic by calling it into a temp, then splice.
    let cb="";
    if(U.banner) cb+=`<div class="crisis ${U.banner.bad?'bad':'good'}"><div class="ic">${U.banner.bad?'⚠️':'✚'}</div><div><div class="ct">${ue(U.banner.name)}</div><div class="cs">${ue(U.banner.why)}</div></div></div>`;
    if(U.rareBanner) cb+=`<div class="crisis rare"><div class="ic">★</div><div><div class="ct">${ue(U.rareBanner.name)}</div><div class="cs">${ue(U.rareBanner.why)}</div></div></div>`;
    if(U.novelSeen && !U.cloneFound) cb+=`<div class="crisis rare"><div class="ic">⚠</div><div><div class="ct">Pathogen X</div><div class="cs">No antibody fits. Innate cells hold while the B-Cell runs clonal selection. <b>${U.clone}/${CLONE_COST} AP.</b></div></div></div>`;
    el.innerHTML=cb+h;
  };
})();
