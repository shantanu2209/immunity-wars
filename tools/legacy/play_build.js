const fs = require("fs");

// ---- assets ----
const bodyURI = "data:image/png;base64," + fs.readFileSync("body_crop.png").toString("base64");
const ART = eval("(" + fs.readFileSync("art_data.js","utf8").match(/const ART\s*=\s*({[\s\S]*})\s*;?\s*$/)[1] + ")");
const css = fs.readFileSync("play.css","utf8");
const js  = fs.readFileSync("play.js","utf8");

// ---- palette ----
const FAMCOL={ENV:"#ef4444",NAK:"#f97316",EXB:"#9bb02f",ICB:"#14b8a6",TOX:"#84cc16",EUK:"#e879f9"};
const OCOL={brain:"#c084fc",lungs:"#7dd3fc",heart:"#fb7185",liver:"#fbbf24",spleen:"#f472b6",kidneys:"#2dd4bf",marrow:"#fb923c"};
const CCOL={macrophage:"#8b7cf6",neutrophil:"#38bdf8",bcell:"#f472b6",tcell:"#a3e635",helper:"#facc15",nk:"#f97316",eosinophil:"#fb7185"};
const TG={mucosal:"#f0a5c0",skin:"#c8a37a",blood:"#e6394b"};
const FAM_KEYS=["ENV","NAK","EXB","ICB","TOX","EUK"];
const ONAME={brain:"Brain",lungs:"Lungs",heart:"Heart",liver:"Liver",spleen:"Spleen",kidneys:"Kidneys",marrow:"Bone Marrow"};

// ---- body geometry (from the overview) ----
const ORGAN_POS={brain:[50,9],lungs:[42,29],heart:[58,33],liver:[16,53],spleen:[84,53],kidneys:[50,60],marrow:[50,73]};
const HUB=[50,45];
const ENTRIES=[{key:"nose",grp:"mucosal",x:61,y:15},{key:"gut",grp:"mucosal",x:38,y:57},
 {key:"contact",grp:"mucosal",x:11,y:40},{key:"blood",grp:"blood",x:88,y:41},
 {key:"wound",grp:"skin",x:26,y:85},{key:"bite",grp:"skin",x:74,y:85}];

// ---- DEMO game state (curated for the look-prototype) ----
const PATH=[
 {id:"p1",dz:"Malaria",      type:"malaria", fam:"EUK", where:"Liver \u2014 inside the organ",    loc:"organ:liver", threat:"red",   steps:0, beat:"Eosinophil, or antibodies once coated (EUK). It's inside the liver \u2014 hard to reach."},
 {id:"p2",dz:"Tuberculosis", type:"hidden",  fam:"ICB", where:"Lungs \u2014 1 step from the organ", loc:"organ:lungs", threat:"red",   steps:1, beat:"Killer T-Cell \u2014 it hides inside cells, so antibodies can't reach it."},
 {id:"p3",dz:"Cholera",      type:"bacteria",fam:"EXB", where:"Gut \u2014 1 step from the blood",   loc:"entry:gut",   threat:"red",   steps:1, beat:"Tag it (EXB), then engulf. It divides if ignored."},
 {id:"p4",dz:"Snake venom",  type:"venom",   fam:"TOX", where:"Bite lane \u2014 step 3",           loc:"entry:bite",  threat:"amber", steps:3, beat:"Antivenom / antitoxin (TOX). No cell can eat a toxin."},
 {id:"p5",dz:"Influenza",    type:"virus",   fam:"ENV", where:"Bloodstream",                       loc:"hub",         threat:"amber", steps:2, beat:"Antibody neutralises it (ENV), or the Monocyte engulfs it."},
];
const CELLS=[
 {key:"macrophage",name:"Monocyte",     status:"ready", loc:"Gut 2"},
 {key:"tcell",     name:"Killer T-Cell",status:"ready", loc:"Lungs 1"},
 {key:"bcell",     name:"B-Cell",       status:"acted", loc:"Blood"},
 {key:"neutrophil",name:"Neutrophil",   status:"spent", loc:"regen \u00b7 T9"},
];
const AB={ENV:3,NAK:0,EXB:2,ICB:0,TOX:1,EUK:0};
const CAP={ENV:5,NAK:4,EXB:5,ICB:4,TOX:4,EUK:4};
const threatened=new Set(PATH.map(p=>p.fam));
const VAX=[{dz:"Influenza",put:2,cost:5},{dz:"Cholera",put:0,cost:5}];
const IMMUNE=["Measles"];
const LOG=[
 {t:7,kind:"bad", msg:"<b>Malaria</b> has reached the Liver."},
 {t:7,kind:"",    msg:"Kupffer cell engulfed a tagged bacterium."},
 {t:6,kind:"good",msg:"B-Cell produced <b>ENV</b> antibodies (+3)."},
 {t:6,kind:"",    msg:"Killer T-Cell moved to the Lungs."},
 {t:5,kind:"bad", msg:"<b>Cholera</b> entered via the Gut."},
];
const AP_HAVE=3, AP_MAX=5;
const TURN=7, MAXTURN=18;

// ---- derive per-landmark threat for halos (red beats amber) ----
const rank={green:0,amber:1,red:2};
const landmark={};
PATH.forEach(p=>{ const k=p.loc; if(!landmark[k]||rank[p.threat]>rank[landmark[k]]) landmark[k]=p.threat; });
const threatClass=key => landmark[key] ? "t-"+landmark[key] : "";

// ---- render: body markers ----
const organsHTML = Object.keys(ORGAN_POS).map(o=>{
  const [x,y]=ORGAN_POS[o], tc=threatClass("organ:"+o), rec = o==="kidneys"?" recessed":"";
  return `<button class="mk organ${rec} ${tc}" id="mk-organ-${o}" style="left:${x}%;top:${y}%;--oc:${OCOL[o]}" aria-label="${ONAME[o]}"><img src="${ART.organ[o]}" alt=""></button>`;
}).join("\n");
const hubHTML = `<button class="mk hub ${threatClass("hub")}" id="mk-hub" style="left:${HUB[0]}%;top:${HUB[1]}%" aria-label="Bloodstream"><span class="core"></span></button>`;
const entriesHTML = ENTRIES.map(e=>{
  const tc=threatClass("entry:"+e.key);
  return `<button class="mk entry ${tc}" id="mk-entry-${e.key}" style="left:${e.x}%;top:${e.y}%;--ec:${TG[e.grp]}" aria-label="${e.key} entry"><span class="dot"></span></button>`;
}).join("\n");

// ---- render: left rail (pathogen pips, urgent first) ----
const sorted=[...PATH].sort((a,b)=>a.steps-b.steps || rank[b.threat]-rank[a.threat]);
const lpips = sorted.map(p=>`<button class="lpip t-${p.threat}" onclick="openPathList('${p.id}')" aria-label="${p.dz}"><img src="${ART.path[p.type]}" alt=""></button>`).join("\n");

// ---- render: right rail (your controllables) ----
const ctoks = CELLS.map(c=>`<button class="ctok ${c.status==='spent'?'spent':''}" onclick="selCell(this,'${c.name}','${c.status}')" aria-label="${c.name}">
   <img src="${ART.cell[c.key]}" alt=""><span class="cn">${c.name.split(' ')[0]}</span><span class="sdot ${c.status}"></span></button>`).join("\n");

// ---- render: bottom micro-arsenal ----
const arsenal = FAM_KEYS.map(f=>{
  const have=(AB[f]||0)>0, thr=threatened.has(f), col=FAMCOL[f];
  const bg=have?col:"transparent", fg=have?"#0c0710":col, bd=thr?col:"transparent";
  return `<div class="ac" id="ac-${f}" style="background:${bg};color:${fg};border-color:${bd}">${f}<span class="n">${AB[f]||0}</span></div>`;
}).join("");

// ---- render: pathogen list rows + cards ----
const prows = sorted.map(p=>{
  const col=FAMCOL[p.fam];
  const stTxt = p.steps===0?"NOW":(p.steps+" step"+(p.steps>1?"s":""));
  const stCol = p.threat==="red"?"#ff3b47":(p.threat==="amber"?"#f0a020":"#2dd47a");
  return `<button class="prow" data-id="${p.id}" data-loc="${p.loc}" data-fam="${p.fam}" style="border-left-color:${stCol}" onclick="selectPath('${p.id}')">
     <img src="${ART.path[p.type]}" alt="">
     <div class="pm"><div class="pn">${p.dz}</div><div class="pw">${p.where}</div></div>
     <span class="fam" style="color:${col};border-color:${col}">${p.fam}</span>
     <span class="st" style="color:${stCol}">${stTxt}</span></button>`;
}).join("\n");
const pcards = sorted.map(p=>{
  const col=FAMCOL[p.fam];
  return `<div class="pcard" id="card-${p.id}" style="display:none">
     <div class="ct"><img src="${ART.path[p.type]}" style="width:26px;height:26px" alt=""> ${p.dz}
       <span class="cfam" style="color:${col};border-color:${col};margin-left:auto">${p.fam}</span></div>
     <div class="row"><b>Where:</b> ${p.where}</div>
     <div class="row"><b>Beat it:</b> ${p.beat}</div></div>`;
}).join("\n");

// ---- render: adaptive drawer (arsenal + vaccine/immunity) ----
const abFull = FAM_KEYS.map(f=>{
  const have=AB[f]||0, cap=CAP[f], col=FAMCOL[f], hot=threatened.has(f);
  const pips=Array.from({length:cap}).map((_,i)=>`<i style="${i<have?`background:${col}`:''}"></i>`).join("");
  return `<div class="abcell ${hot?'hot':''}" style="color:${col}">
     <div class="at">${f}</div><div class="aname">${have} held${hot?' \u00b7 threatened':''}</div><div class="apips">${pips}</div></div>`;
}).join("");
const vrows = VAX.map(v=>{
  const pct=Math.round(100*v.put/v.cost);
  return `<div class="vrow"><div class="vn">${v.dz}</div><div class="vbar"><div style="width:${pct}%"></div></div><div class="vp">${v.put}/${v.cost}</div></div>`;
}).join("");
const immChips = IMMUNE.map(d=>`<span class="chip">\u2714 ${d}</span>`).join("");

// ---- render: log drawer ----
const logRows = LOG.map(l=>`<div class="logrow ${l.kind}"><b class="tt">T${l.t}</b>${l.msg}</div>`).join("");
const logTick = `<b>T${LOG[0].t}</b> ${LOG[0].msg.replace(/<[^>]+>/g,'')}`;

// ---- assemble ----
const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Immunity Wars \u2014 play screen</title>
<style>
${css}
.prow.rsel{background:rgba(255,255,255,.06)}
</style></head>
<body>
<div class="play">

  <div class="top">
    <div class="topRow">
      <div class="tstatus">
        <span class="turn">T${TURN}<small>/${MAXTURN}</small></span>
        <span class="phase">Command</span>
        <span class="ob">OUTBREAK</span>
      </div>
      <button class="phasebtn" id="phasebtn" onclick="phaseAct()">End command &rarr;</button>
    </div>
    <div class="alert">&#9888; Malaria has reached the Liver &middot; Cholera 1 step from the blood</div>
  </div>

  <div class="mid">
    <div class="lrail">
      <div class="rlabel">Threats</div>
      ${lpips}
      <div class="lcount">${PATH.length}</div>
    </div>

    <div class="stage"><div class="bodybox">
      <img class="body" src="${bodyURI}" alt="Body">
      ${organsHTML}
      ${hubHTML}
      ${entriesHTML}
    </div></div>

    <div class="rrail">
      <div class="rlabel">Yours</div>
      ${ctoks}
    </div>
  </div>

  <div class="bottom">
    <div class="ap">AP<span class="pips">${Array.from({length:AP_MAX}).map((_,i)=>`<i class="${i<AP_HAVE?'on':''}"></i>`).join("")}</span></div>
    <button class="arsenal" onclick="openDrawer('adaptive')" aria-label="Adaptive response">${arsenal}</button>
    <button class="logtick" onclick="openDrawer('log')">${logTick}</button>
  </div>

  <button class="chatBubble" onclick="openChat()" aria-label="Team chat">&#128172;<span class="badge" id="chatBadge">2</span></button>

  <!-- overlays -->
  <div class="ovl">
    <div class="scrim" id="scrim"></div>

    <div class="lpanel" id="lpanel">
      <div class="phead">Threats in the body (${PATH.length})<button class="x" onclick="closeAll()">&times;</button></div>
      <div class="pbody">
        ${prows}
        ${pcards}
      </div>
    </div>

    <div class="sheet" id="drawer-adaptive">
      <div class="phead">Adaptive response<button class="x" onclick="closeAll()">&times;</button></div>
      <div class="pbody">
        <div class="dsub">Antibody arsenal \u2014 one pool per antigen class</div>
        <div class="abgrid">${abFull}</div>
        <div class="dsub">Vaccine development</div>
        ${vrows||'<div style="color:#9a86ad;font-size:12px">No candidates yet.</div>'}
        <div class="dsub">Immune \u2014 memory cells waiting</div>
        <div class="vimm">${immChips||'<span style="color:#9a86ad;font-size:12px">None yet.</span>'}</div>
      </div>
    </div>

    <div class="sheet" id="drawer-log">
      <div class="phead">Event log<button class="x" onclick="closeAll()">&times;</button></div>
      <div class="pbody">${logRows}</div>
    </div>

    <div class="sheet" id="chatSheet">
      <div class="phead">Team chat<button class="x" onclick="closeAll()">&times;</button></div>
      <div class="pbody" id="chatLog">
        <div class="msg"><div class="who" style="color:#38bdf8">Aarav</div><div class="b">TB is about to hit the lungs \u2014 someone with a T-Cell?</div></div>
        <div class="msg"><div class="who" style="color:#a3e635">Diya</div><div class="b">On it. Captain, can I get 2 AP?</div></div>
      </div>
      <div class="chatIn"><input id="chatInput" placeholder="Message the team\u2026"><button onclick="sendChat()">Send</button></div>
    </div>
  </div>

  <div class="roleToggleWrap" style="position:absolute;left:10px;bottom:66px;z-index:30">
    <button class="roleToggle" id="roleLabel" onclick="toggleRole()">You: Captain</button>
  </div>

  <div class="toast" id="toast"></div>
</div>
<script>
${js}
</script>
</body></html>`;

fs.writeFileSync("play_screen.html", html);
console.log("wrote play_screen.html (" + (html.length/1024).toFixed(0) + " KB)");
