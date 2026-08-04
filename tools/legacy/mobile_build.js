// Builds the Stage-1 mobile-overview look-prototype: body silhouette + 7 organs
// (anatomically placed, gently spaced) + 6 entry points (coloured by tissue group).
// Standalone, phone-sized, self-contained (silhouette + organ art embedded as base64).
const fs = require("fs");

const bodyB64 = fs.readFileSync("body_crop.png").toString("base64");
const bodyURI = "data:image/png;base64," + bodyB64;

// pull the organ art data-URIs out of art_data.js
const artSrc = fs.readFileSync("art_data.js", "utf8");
const ART = eval("(" + artSrc.match(/const ART\s*=\s*({[\s\S]*})\s*;?\s*$/)[1] + ")");
const organArt = ART.organ;

// organ palette + display names
const OCOL = { brain:"#c084fc", lungs:"#7dd3fc", heart:"#fb7185", liver:"#fbbf24", spleen:"#f472b6", kidneys:"#2dd4bf", marrow:"#fb923c" };
const ONAME = { brain:"Brain", lungs:"Lungs", heart:"Heart", liver:"Liver", spleen:"Spleen", kidneys:"Kidneys", marrow:"Bone Marrow" };

// anatomical placement on the silhouette (x%, y%) — front view, person's-right = viewer-left
const ORGAN_POS = {
  brain:   [50,  9],
  lungs:   [42, 29],   // upper chest, left of centre
  heart:   [58, 33],   // upper chest, right of centre (person's left — correct side)
  liver:   [16, 53],   // moved OUT to the left margin (still the correct side)
  spleen:  [84, 53],   // moved OUT to the right margin (still the correct side)
  kidneys: [50, 60],   // posterior — low-central, rendered recessed
  marrow:  [50, 73],   // pelvis
};

// entry points (x%, y%) coloured by tissue group (matches the game's route grouping)
const RGCOL = { mucosal:"#f0a5c0", skin:"#c8a37a", blood:"#e6394b" };
const ENTRIES = [
  { key:"nose",    label:"Nose",    grp:"mucosal", x:61, y:15 },
  { key:"gut",     label:"Gut",     grp:"mucosal", x:38, y:57 },
  { key:"contact", label:"Contact", grp:"mucosal", x:11, y:40 },
  { key:"blood",   label:"Blood",   grp:"blood",   x:88, y:41 },
  { key:"wound",   label:"Wound",   grp:"skin",    x:26, y:85 },
  { key:"bite",    label:"Bite",    grp:"skin",    x:74, y:85 },
];

const organsHTML = Object.keys(ORGAN_POS).map(o=>{
  const [x,y]=ORGAN_POS[o], col=OCOL[o], recessed = o==="kidneys";
  return `<button class="organ${recessed?' recessed':''}" style="left:${x}%;top:${y}%;--oc:${col}"
     data-kind="organ" data-name="${ONAME[o]}" aria-label="${ONAME[o]}">
     <img src="${organArt[o]}" alt="">
     <span class="oLbl">${ONAME[o]}</span></button>`;
}).join("\n");

const entriesHTML = ENTRIES.map(e=>{
  const col=RGCOL[e.grp];
  return `<button class="entry" style="left:${e.x}%;top:${e.y}%;--ec:${col}"
     data-kind="entry" data-name="${e.label}" data-grp="${e.grp}" aria-label="Entry: ${e.label}">
     <span class="eDot"></span><span class="eLbl">${e.label}</span></button>`;
}).join("\n");

// the bloodstream HUB — the transit centre where every germ crosses (not an organ; styled apart)
const hubHTML = `<button class="hub" style="left:50%;top:45%" data-kind="hub" data-name="Bloodstream" aria-label="Bloodstream hub">
     <span class="core"></span><span class="hLbl">Bloodstream</span></button>`;

const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Immunity Wars — mobile board (overview)</title>
<style>
  :root{--bg:#0c0710;--panel:#150d1b;--line:rgba(255,255,255,.12);--faint:#9a86ad;--txt:#f2e9f7}
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;background:radial-gradient(120% 90% at 50% 0%, #1a1022 0%, var(--bg) 60%);color:var(--txt);
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
  .phone{max-width:430px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;padding:10px 12px}
  .top{display:flex;align-items:center;gap:8px;flex:0 0 auto}
  .top .h{font-weight:800;font-size:15px;display:flex;align-items:center;gap:7px}
  .top .h .hb{color:#fb7185;font-size:17px}
  .top .tag{font-size:10.5px;color:var(--faint);border:1px solid var(--line);border-radius:999px;padding:2px 8px;margin-left:auto}
  .stageWrap{flex:1 1 auto;display:flex;align-items:center;justify-content:center;min-height:0;padding:6px 0;overflow:hidden}
  /* stage is sized by the silhouette IMAGE itself — no height:100%/aspect-ratio/dvh chain to break */
  .stage{position:relative;width:min(92vw, 37vh);margin:0 auto;line-height:0}
  .stage .body{display:block;width:100%;height:auto;
    filter:drop-shadow(0 0 18px rgba(125,211,252,.12))}
  .organ,.entry{position:absolute;transform:translate(-50%,-50%);border:0;background:transparent;
    cursor:pointer;padding:0;display:flex;flex-direction:column;align-items:center;gap:2px;z-index:5}
  .organ img{width:36px;height:36px;border-radius:50%;background:rgba(10,6,14,.65);
    border:2px solid var(--oc);box-shadow:0 0 10px -5px var(--oc);object-fit:contain;padding:4px}
  .organ.recessed img{opacity:.72;border-style:dashed}
  .organ .oLbl{font-size:10px;font-weight:700;color:var(--oc);text-shadow:0 1px 3px #000;white-space:nowrap}
  .entry{z-index:6}
  .entry .eDot{width:18px;height:18px;border-radius:50%;border:2px dashed var(--ec);
    background:radial-gradient(circle,var(--ec) 0%,transparent 72%);box-shadow:0 0 10px -2px var(--ec)}
  .entry .eLbl{font-size:9.5px;font-weight:800;letter-spacing:.04em;color:var(--ec);text-transform:uppercase;
    text-shadow:0 1px 3px #000;white-space:nowrap;margin-top:1px}
  .organ:active img,.entry:active .eDot{transform:scale(1.12)}
  .sel img{outline:2px solid #fff;outline-offset:2px}
  .sel .eDot{outline:2px solid #fff;outline-offset:2px}
  .legend{flex:0 0 auto;display:flex;gap:12px;justify-content:center;font-size:10.5px;color:var(--faint);padding-top:4px}
  .legend b{color:var(--txt);font-weight:700}
  .legend .sw{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px;vertical-align:-1px}
  .foot{flex:0 0 auto;text-align:center;font-size:10.5px;color:var(--faint);padding:8px 4px 4px;line-height:1.45}
  .toast{position:fixed;left:50%;bottom:16px;transform:translateX(-50%) translateY(20px);opacity:0;
    background:rgba(12,7,16,.96);border:1px solid var(--line);border-radius:11px;padding:9px 14px;font-size:12.5px;
    max-width:88%;text-align:center;transition:.25s;pointer-events:none;z-index:40}
  .toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
  .hub{position:absolute;transform:translate(-50%,-50%);border:0;background:transparent;cursor:pointer;padding:0;
    display:flex;flex-direction:column;align-items:center;gap:3px;z-index:7}
  .hub .core{width:50px;height:50px;border-radius:50%;position:relative;
    background:radial-gradient(circle, rgba(230,57,75,.5) 0%, rgba(230,57,75,.14) 52%, transparent 70%);
    border:2px solid #e6394b;box-shadow:0 0 16px -3px #e6394b, inset 0 0 12px -5px #e6394b}
  .hub .core::before{content:"";position:absolute;inset:-7px;border:1.5px dashed rgba(230,57,75,.55);border-radius:50%}
  .hub .core::after{content:"";position:absolute;inset:17px;border-radius:50%;background:#e6394b;box-shadow:0 0 10px -1px #e6394b}
  .hub .hLbl{font-size:10px;font-weight:800;color:#ff8a9a;text-shadow:0 1px 3px #000;letter-spacing:.03em;white-space:nowrap}
  .sel .core{outline:2px solid #fff;outline-offset:3px}
  @media(prefers-reduced-motion:no-preference){
    .hub .core::before{animation:hubpulse 2.3s ease-in-out infinite}
    @keyframes hubpulse{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.16);opacity:.18}}
  }
</style>
</head>
<body>
<div class="phone">
  <div class="top">
    <div class="h"><span class="hb">&#9829;</span> Immunity Wars</div>
    <span class="tag">mobile board &middot; overview</span>
  </div>

  <div class="stageWrap"><div class="stage" id="stage">
    <img class="body" src="${bodyURI}" alt="Body silhouette">
    ${organsHTML}
    ${hubHTML}
    ${entriesHTML}
  </div></div>

  <div class="legend">
    <span><span class="sw" style="background:#f0a5c0"></span>Mucosal</span>
    <span><span class="sw" style="background:#c8a37a"></span>Skin</span>
    <span><span class="sw" style="background:#e6394b"></span>Blood</span>
    <span>&middot; dashed = entry point</span>
  </div>
  <div class="foot"><b>Stage 1 — the map only.</b> Tap an organ (&rarr; its branch) or an entry point (&rarr; its lane).
    Controllables and body/organ state come in Stage 2 and 3.</div>
</div>

<div class="toast" id="toast"></div>
<script>
  const toast=document.getElementById("toast"); let tmr;
  function say(msg){ toast.textContent=msg; toast.classList.add("on"); clearTimeout(tmr); tmr=setTimeout(()=>toast.classList.remove("on"),1900); }
  let selEl=null;
  document.getElementById("stage").addEventListener("click", e=>{
    const b=e.target.closest("button"); if(!b) return;
    if(selEl) selEl.classList.remove("sel"); selEl=b; b.classList.add("sel");
    const name=b.dataset.name, kind=b.dataset.kind;
    say(kind==="organ" ? name+" — would zoom to the "+name+" branch"
       : kind==="hub" ? "Bloodstream — would zoom to the hub where every germ crosses"
       : name+" entry — would zoom to the "+name+" lane");
  });
</script>
</body></html>`;

fs.writeFileSync("mobile_overview.html", html);
console.log("wrote mobile_overview.html (" + (html.length/1024).toFixed(0) + " KB)");
