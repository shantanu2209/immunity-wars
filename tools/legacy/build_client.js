const fs=require("fs");

// 1) v2 engine (strip module.exports)
let engine = fs.readFileSync("v2_engine.js","utf8").replace(/module\.exports\s*=\s*\{[\s\S]*?\};\s*$/,"").trimEnd();
// 1b) art data (base64 icons) — injected where the /*__ART__*/ marker sits in the board script
let artData = fs.existsSync("art_data.js") ? fs.readFileSync("art_data.js","utf8").trim() : "";

// 2) v2 UI: extract <style> and the BOARD SCRIPT (the second <script>), minus its local newG/act/spread
//    which we override. We keep all render functions.
const ui = fs.readFileSync("v2_ui.html","utf8");
const style = ui.match(/<style>([\s\S]*?)<\/style>/)[1];
const scripts = [...ui.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
// scripts[0] is the engine-injection marker script; scripts[1] is the big board UI script
let board = scripts[1];

// Neutralize the board's LOCAL authority. These three functions have known exact bodies in v2_ui.html;
// match them precisely (brace-counting) rather than with greedy regex that can eat later functions.
function stripFn(src, sig, replacement){
  const start=src.indexOf(sig);
  if(start<0){ console.warn("  ! could not find "+sig); return src; }
  let i=src.indexOf("{", start);
  let depth=0;
  for(; i<src.length; i++){
    if(src[i]==="{") depth++;
    else if(src[i]==="}"){ depth--; if(depth===0){ i++; break; } }
  }
  return src.slice(0,start) + (replacement||("/* removed: "+sig.trim()+" */\n")) + src.slice(i);
}
// newG: keep a safe stub (end-game buttons reference it) → return to lobby if the shell is ready
board = stripFn(board, "function newG(){", "function newG(){ if(typeof backToLobby==='function') backToLobby(); }\n");
// act: provided by client shell — remove definition (shell defines global act)
board = stripFn(board, "function act(o){", "/* act() provided by client shell */\n");
// spread: provided by client shell (runSpread) — remove; keep a stub in case of stray calls
board = stripFn(board, "async function spread(frames){", "function spread(){}\n");
// remove the board's auto-start call at load (the shell drives the screen flow)
board = board.replace(/\nnewG\(\);\s*$/, "\n/* auto-start removed — shell drives the flow */\n");
// inject the art data where the marker sits
board = board.replace("/*__ART__*/", artData);

// 3) client overrides
const shell  = fs.readFileSync("client_shell.js","utf8");
const renderC= fs.readFileSync("client_render.js","utf8");
const sideC  = fs.readFileSync("client_side.js","utf8");
const netcss = fs.readFileSync("client.css","utf8");
const mobcss = fs.existsSync("client_mobile.css") ? fs.readFileSync("client_mobile.css","utf8") : "";
const mobile = fs.existsSync("client_mobile.js") ? fs.readFileSync("client_mobile.js","utf8") : "";
const speccss = fs.existsSync("spec_scoped.css") ? fs.readFileSync("spec_scoped.css","utf8") : "";
const specjs  = fs.existsSync("spec.js") ? fs.readFileSync("spec.js","utf8") : "";

const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>The Immunity Wars — LAN</title>
<style>
${style}
${netcss}
${mobcss}
${speccss}
</style>
</head>
<body>
<div id="app"></div>
<div id="netlayer"></div>
<div id="flash" class="flash"></div>
<script>
/* ---- v2 engine (client-side, for render helpers only; server is authority) ---- */
${engine}
</script>
<script>
/* ---- v2 board renderer (render functions; local authority removed) ---- */
${board}
</script>
<script>
/* ---- client shell: networking, lobby, allocation, chat ---- */
${shell}
</script>
<script>
/* ---- client render: gate/lobby/allocation/chat/FAQ ---- */
${renderC}
</script>
<script>
/* ---- owner-restricted control panels + network-aware phase ---- */
${sideC}
</script>
<script>
/* ---- NEW mobile home (Stage 2): live-state play overview for players ---- */
${mobile}
</script>
<script>
/* ---- spectator layer (table display): landscape gutters + passive readouts, driven by live U ---- */
${specjs}
</script>
</body></html>`;

fs.writeFileSync("public/index.html", html);
if(fs.existsSync("body_crop.png")) fs.copyFileSync("body_crop.png","public/body.png");
if(fs.existsSync("immunity-wars-v2.html")) fs.copyFileSync("immunity-wars-v2.html","public/solo.html");
console.log("✓ built public/index.html ("+(html.length/1024|0)+" KB)");
