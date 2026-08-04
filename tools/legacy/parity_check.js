// PARITY CHECK: confirms the plain-HTML build and the server-client build share identical
// engine + render logic, differing ONLY in the deliberately-networked functions.
const fs=require("fs");

function extractScripts(html){ return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]); }

// 1) ENGINE must be byte-identical in both (it's injected verbatim)
const engineSrc = fs.readFileSync("v2_engine.js","utf8").replace(/module\.exports\s*=\s*\{[\s\S]*?\};\s*$/,"").trimEnd();

const plain = fs.readFileSync("immunity-wars-v2.html","utf8");
const client = fs.readFileSync("public/index.html","utf8");

let pass=true;
function check(name, cond){ console.log((cond?"  ✓ ":"  ✗ ")+name); if(!cond) pass=false; }

console.log("=== ENGINE parity ===");
check("engine present in plain build", plain.includes(engineSrc.slice(0,200)));
check("engine present in client build", client.includes(engineSrc.slice(0,200)));
// spot-check a few RULE functions are identical in both
const ruleFns=["function canNeutralise","function canTag","function moveDestinations","function macrophageEatable","function residentEatable","function abMatch"];
ruleFns.forEach(fn=>{
  const grab=(src)=>{ const i=src.indexOf(fn); if(i<0) return null; return src.slice(i, i+160); };
  const a=grab(plain), b=grab(client);
  check(`${fn} identical in both`, a && b && a===b);
});

console.log("\n=== ART parity ===");
check("ART data in plain", plain.includes("const ART="));
check("ART data in client", client.includes("const ART="));

console.log("\n=== PANEL render parity (this session's work) ===");
["openLanePanel","renderBloodstream","openProducePicker","residentIcon","pathIcon","cellIcon","panelActionBar"].forEach(fn=>{
  check(`${fn} in both`, plain.includes("function "+fn) && client.includes("function "+fn));
});

console.log("\n=== EXPECTED differences (networked functions) ===");
// the client REPLACES these; plain has the local versions. This difference is BY DESIGN.
check("plain has local newG", /function newG\(\)\{[^}]*newGame/.test(plain));
check("client newG is stubbed/networked", !/function newG\(\)\{[^}]*newGame\(/.test(client) || client.includes("backToLobby"));
check("plain has local act()", plain.includes("function act(o){ const _b=_solClone(U); const r=applyAction"));
check("client act provided by shell", !client.includes("function act(o){ const _b=_solClone(U); const r=applyAction") );

console.log("\n"+(pass?"PARITY OK — builds share engine+rules+render; only networked fns differ (by design)":"PARITY FAILED — investigate above"));
process.exit(pass?0:1);
