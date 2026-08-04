/* Regression suite for the 23-07-2026 playtest feedback (12 items + capture findings). */
const G=require("./v2_engine.js"); const fs=require("fs");
const P=[],F=[]; const ck=(n,c)=>(c?P:F).push(n);
const mk=o=>Object.assign({id:"x"+Math.random().toString(36).slice(2),tagged:false,hp:1,maxhp:1,zone:"hub",step:0,stage:null,age:0,embed:0},o);
const UI=fs.readFileSync("v2_ui.html","utf8");

// 1 — brain lane is 4 marches, not 5
ck("1 brain = 4 marches", G.branchLen("brain")===3 && G.branchLen("lungs")===3);
ck("1 board draws 3 brain nodes", /"brain":\{"1":[^}]*\},"2":[^}]*\},"3":[^}]*\}\}/.test(UI));

// 4 — strike must NOT damage the organ; degranulate must
function strikeRun(action){
  const g=G.newGame({difficulty:"normal"}); g.phase="command"; g.ap=5;
  g.cells.eosinophil={alive:true,zone:"branch",organ:"lungs",step:1,lane:null};
  g.invaders=[mk({type:"worm",disease:"Roundworm",zone:"branch",organ:"lungs",step:1,tagged:true,hp:3,maxhp:3})];
  const before=g.organs.lungs.hp;
  G.applyAction(g,{action,cell:"eosinophil",invaderId:g.invaders[0].id});
  return before-g.organs.lungs.hp;
}
ck("4 strike leaves the organ alone", strikeRun("strike")===0);
ck("4 degranulate still burns the organ", strikeRun("degranulate")===1);

// 6 — worms never multiply (only bacteria divide)
{ const g=G.newGame({difficulty:"hard"}); g.phase="command";
  g.invaders=[mk({type:"worm",disease:"Tapeworm",zone:"branch",organ:"lungs",step:1,hp:3,maxhp:3})];
  for(let t=0;t<12;t++) G.applyAction(g,{action:"endCommand"});
  ck("6 worms do not multiply", g.invaders.filter(i=>i.disease==="Tapeworm").length===1); }

// 7 — NET eligibility is authoritative and excludes toxin/venom/worm/parasite
{ const g=G.newGame({difficulty:"normal"});
  g.cells.neutrophil={alive:true,zone:"route",lane:"gut",step:3,organ:null};
  const at=o=>mk(Object.assign({zone:"route",lane:"gut",step:3},o));
  g.invaders=[at({type:"toxin",disease:"Botulism"}),at({type:"venom",disease:"Snake venom"}),
              at({type:"worm",disease:"Tapeworm",hp:3,maxhp:3}),at({type:"parasite",disease:"Giardia",hp:2,maxhp:2}),
              at({type:"bacteria",disease:"Cholera"}),at({type:"fungus",disease:"Candida",hp:2,maxhp:2})];
  const t=G.netTargets(g).map(x=>x.type).sort();
  ck("7 netTargets = bacteria+fungus only", JSON.stringify(t)===JSON.stringify(["bacteria","fungus"]));
  ck("7 UI net buttons use netTargets", (UI.match(/netTargets\(U\)/g)||[]).length>=3); }

// 8 — Pathogen X has its own icon and every surface prefers it
{ const s=fs.readFileSync("art_data.js","utf8");
  ck("8 ART.path.novel exists", /"novel":\s*"data:image\/svg\+xml/.test(s));
  ck("8 board uses pathArt()", /function pathArt\(/.test(UI));
  ck("8 spectator prefers novel art", /a\.novel&&ART\.path\.novel/.test(fs.readFileSync("spec.js","utf8")));
  ck("8 mobile prefers novel art", /p\.novel&&ART\.path\.novel/.test(fs.readFileSync("client_mobile.js","utf8"))); }

// 9 — event alert exists and is driven by the engine banner
ck("9 event alert present + hooked into draw", /function showEventAlert\(/.test(UI) && /showEventAlert\(\); \}/.test(UI));

// 10 — resident description no longer claims auto-engulf; 'prime' action is gone from the UI
ck("10 no 'Auto-eats' claim", !/Auto-eats/.test(UI));
ck("10 no dead prime action in UI", !/action:'prime'|action:"prime"/.test(UI));
ck("10 stale dev footer gone", !/Experimental sandbox/.test(UI));
ck("10 liver effect text not the old '3 → 2'", !/Antibody cap 3 → 2/.test(fs.readFileSync("v2_engine.js","utf8")));

// 11 — venom can never be neutralised by antibodies (UI predicate agrees with the engine)
{ const g=G.newGame({difficulty:"normal"}); g.ab.TOX=9;
  ck("11 canNeutralise(venom) false", G.canNeutralise(g,mk({type:"venom",disease:"Snake venom"}))===false);
  g.phase="command"; g.ap=5; g.invaders=[mk({id:"v1",type:"venom",disease:"Snake venom"})];
  ck("11 neutralise venom rejected", !G.applyAction(g,{action:"neutralise",invaderId:"v1"}).ok); }

// 12 — strike is Monocyte + Eosinophil only, in engine AND both UI paths
{ const g=G.newGame({difficulty:"normal"}); g.phase="command"; g.ap=5; g.flags.nkCell=true;
  g.cells.nk={zone:"branch",organ:"lungs",step:1,lane:null};
  g.invaders=[mk({id:"w1",type:"worm",disease:"Roundworm",zone:"branch",organ:"lungs",step:1,tagged:true,hp:3,maxhp:3})];
  ck("12 NK cannot strike", !G.applyAction(g,{action:"strike",cell:"nk",invaderId:"w1"}).ok);
  ck("12 no UI path offers strike to neutrophil/nk",
     !/\["macrophage","neutrophil","nk","eosinophil"\]\.includes\(ck\)/.test(UI)); }

// capture: Pathogen X must never become a hidden virus
{ let hid=false;
  for(let i=0;i<250 && !hid;i++){ const g=G.newGame({difficulty:"hard"}); g.phase="command";
    g.invaders=[mk({type:"virus",disease:"Pathogen X",novel:true,zone:"route",lane:"nose",step:4})];
    G.applyAction(g,{action:"endCommand"});
    if(g.invaders.some(iv=>iv.novel&&iv.type==="hidden")) hid=true; }
  ck("capture Pathogen X never turns hidden", !hid); }

// capture: malaria staging — sporozoite travels, liver stage hides
{ const g=G.newGame({difficulty:"hard"}); g.ab.EUK=3; g.cells.tcell={zone:"hub",step:0,lane:null,organ:null};
  const sp=mk({type:"malaria",disease:"Transfusion malaria",stage:"sporozoite",zone:"route",lane:"blood",step:3});
  g.invaders=[sp];
  ck("capture sporozoite not snipeable", !G.snipeTargets(g).some(x=>x.id===sp.id));
  ck("capture sporozoite is antibody-reachable", G.canNeutralise(g,sp)===true);
  const lv=mk({type:"malaria",disease:"Malaria",stage:"liver",zone:"branch",organ:"liver",step:0,embed:2});
  g.invaders=[lv];
  ck("capture liver stage IS snipeable", G.snipeTargets(g).some(x=>x.id===lv.id));
  ck("capture liver stage not antibody-reachable", G.canNeutralise(g,lv)===false); }

// capture: residents actually work (the 'Unknown action' bug)
{ const g=G.newGame({difficulty:"normal"}); g.phase="command"; g.ap=3;
  g.residents.lungs={organ:"lungs",step:0,ate:false};
  g.invaders=[mk({id:"b9",type:"bacteria",disease:"Pneumonia",zone:"branch",organ:"lungs",step:0,tagged:true})];
  const before=g.ap; const r=G.applyAction(g,{action:"resengulf",organ:"lungs",invaderId:"b9"});
  ck("capture resident engulf works", r.ok===true);
  ck("capture resident engulf is free", g.ap===before);
  ck("capture resident engulf once per turn", !G.applyAction(g,{action:"resengulf",organ:"lungs"}).ok); }

// item 2/3 — back navigation + refresh rejoin
{ const sh=fs.readFileSync("client_shell.js","utf8"), rd=fs.readFileSync("client_render.js","utf8"), sv=fs.readFileSync("server.js","utf8");
  ck("2 back handler exists", /function goBackToMode\(/.test(sh));
  ck("2 back button on gate/lobby/host", (rd.match(/\$\{_back\}/g)||[]).length===3);
  ck("2 server resetRoom is table-display only", /case "resetRoom"[\s\S]{0,200}member\.spectator/.test(sv));
  ck("3 refresh with a saved name rejoins", /IS_JOINING \? \(me\.name \? "lobby" : "gate"\)/.test(sh)); }


// ---- follow-up round: SC's two questions ----

// Q1 — worms never multiply, but MULTIPLE worms can spawn; and co-infection must obey worm placement
{ const g=G.newGame({difficulty:"normal"});
  g.deck=[{dz:"Hookworm",type:"worm",lane:"wound"}];
  G.applyEvent(g,"coInfection");
  const w=g.invaders[g.invaders.length-1];
  ck("Q1 co-infection worm burrows to an organ (not a route)", w.zone==="branch" && !!w.organ);
  ck("Q1 co-infection worm has correct HP", w.hp===3 && w.maxhp===3);
  const g2=G.newGame({difficulty:"normal"}); g2.deck=[{dz:"Cholera",type:"bacteria",lane:"gut"}];
  G.applyEvent(g2,"coInfection");
  const b2=g2.invaders[g2.invaders.length-1];
  ck("Q1 co-infection non-worm still enters at its route with HP", b2.zone==="route" && b2.hp===1); }

// no worm may ever sit on a route, and none may target an organ outside its tropism
{ let strays=0, offTropism=0;
  for(let run=0; run<250; run++){
    const g=G.newGame({difficulty:"hard"}); g.phase="infection"; g.drawn=null;
    for(let t=0;t<10;t++){ G.applyAction(g,{action:"draw"}); G.applyAction(g,{action:"beginCommand"}); G.applyAction(g,{action:"endCommand"}); }
    g.invaders.filter(i=>i.type==="worm").forEach(w=>{
      if(w.zone!=="branch" || !w.organ) strays++;
      const tr=G.TROPISM[w.disease];
      if(Array.isArray(tr) && w.organ && !tr.includes(w.organ)) offTropism++;
    });
  }
  ck("Q1 no worm ever strays onto a route", strays===0);
  ck("Q1 no worm ever lodges outside its tropism", offTropism===0); }

// Q2 — a helper standing with the B-cell does NOT boost until it has been primed by antigen presentation
{ const g=G.newGame({difficulty:"hard"});
  const b0=G.productionBreakdown(g,"ENV");
  ck("Q2 turn 1: helper present but unprimed -> rate 1", b0.net===1);
  ck("Q2 turn 1: breakdown says why", b0.effects.some(e=>/NOT yet primed/.test(e.label) && e.delta===0));
  g.presentations=1;
  const b1=G.productionBreakdown(g,"ENV");
  ck("Q2 after first antigen presented -> rate 2", b1.net===2);
  ck("Q2 boost now attributed to licensing", b1.effects.some(e=>/licensing/.test(e.label) && e.delta===1)); }

console.log("\n=== 23-07 FEEDBACK REGRESSION ===");
P.forEach(x=>console.log("  [pass] "+x)); F.forEach(x=>console.log("  [FAIL] "+x));
console.log("\n"+P.length+" passed, "+F.length+" failed.");
process.exit(F.length?1:0);
