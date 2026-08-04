const G=require("./v2_engine.js");
const P=[],F=[]; const ck=(n,c)=>(c?P:F).push(n);
const mk=(o)=>Object.assign({id:"x"+Math.random(),tagged:false,hp:1,maxhp:1,zone:"hub",step:0,stage:null,age:0,embed:0},o);

// A: storage cap 5/4/3
ck("A storage cap 5/4/3", G.capFam(G.newGame({difficulty:"training"}),"ENV")===5 && G.capFam(G.newGame({difficulty:"normal"}),"ENV")===4 && G.capFam(G.newGame({difficulty:"hard"}),"ENV")===3);

// B: snipe reach training 3, normal/hard 2
function reach(diff){ const g=G.newGame({difficulty:diff}); g.phase="command"; g.cells.tcell={zone:"hub",step:0,lane:null,organ:null};
  const o=g.organList[0]; let m=0; for(let s=0;s<=6;s++){ g.invaders=[mk({type:"hidden",disease:"HIV",zone:"branch",organ:o,step:s})]; if(G.snipeTargets(g).some(x=>x.id===g.invaders[0].id)) m=s; } return m; }
ck("B snipe reach 3/2/2", reach("training")===3 && reach("normal")===2 && reach("hard")===2);

// C: memory source
let gt=G.newGame({difficulty:"training"}); gt.phase="command"; gt.ap=6; gt.ab.ENV=3; gt.invaders=[mk({type:"virus",disease:"Measles"})];
G.applyAction(gt,{action:"neutralise",invaderId:gt.invaders[0].id});
ck("C training natural memory on defeat", !!gt.memory["Measles"]);
let gn=G.newGame({difficulty:"normal"}); gn.phase="command"; gn.ap=6; gn.ab.ENV=3; gn.invaders=[mk({type:"virus",disease:"Measles"})];
G.applyAction(gn,{action:"neutralise",invaderId:gn.invaders[0].id});
ck("C normal NO natural memory", !gn.memory["Measles"]);
let gv=G.newGame({difficulty:"training"}); gv.phase="command"; gv.ap=6; gv.seen["Measles"]=true;
ck("C vaccinate blocked on training", !G.applyAction(gv,{action:"vaccinate",disease:"Measles",ap:5}).ok);
let gv2=G.newGame({difficulty:"normal"}); gv2.phase="command"; gv2.ap=6; gv2.seen["Measles"]=true;
G.applyAction(gv2,{action:"vaccinate",disease:"Measles",ap:5});
ck("C vaccinate grants memory on normal", !!gv2.memory["Measles"]);

// D: production graded
let gh=G.newGame({difficulty:"hard"}); gh.flags.dendritic=true; gh.presentations=20; gh.cells.helper.zone="branch"; gh.cells.helper.organ=gh.organList[0]; gh.cells.helper.step=2;
ck("D hard base stays 1 (no presentation boost, no helper)", G.rateForFam(gh,"ENV")===1);
let gtr=G.newGame({difficulty:"training"}); gtr.flags.dendritic=true; gtr.presentations=20; gtr.made.ENV=10; gtr.cells.helper.zone="branch"; gtr.cells.helper.organ=gtr.organList[0]; gtr.cells.helper.step=2;
ck("D training affinity adds +1", G.rateForFam(gtr,"ENV")>G.rateForFam(gtr,"TOX"));
let gno=G.newGame({difficulty:"normal"}); gno.flags.dendritic=true; gno.presentations=20; gno.made.ENV=10; gno.cells.helper.zone="branch"; gno.cells.helper.organ=gno.organList[0]; gno.cells.helper.step=2;
ck("D normal affinity does NOT add", G.rateForFam(gno,"ENV")===G.rateForFam(gno,"TOX"));

// E: productionBreakdown net + effects + penalties
let ge=G.newGame({difficulty:"normal"}); ge.flags.dendritic=true; ge.presentations=3; ge.cells.helper.zone="branch"; ge.cells.helper.organ=ge.organList[0]; ge.cells.helper.step=3;
let b=G.productionBreakdown(ge,"ENV");
ck("E base case: net==base, not boosted/reduced", b.net===b.base && !b.boosted && !b.reduced);
ge.cells.helper.zone="hub"; ge.cells.helper.organ=null; ge.cells.helper.step=0;   // co-locate with bcell (hub)
b=G.productionBreakdown(ge,"ENV");
ck("E helper contact -> boosted with a +1 effect", b.boosted && b.effects.some(e=>e.delta===1&&/Helper/.test(e.label)));
let gbk=G.newGame({difficulty:"normal"}); gbk.flags.dendritic=true; gbk.presentations=3; gbk.fx={noProduce:true};
b=G.productionBreakdown(gbk,"ENV");
ck("E noProduce -> net 0, reduced, reason", b.net===0 && b.reduced && /shut down/.test(b.blocked));

console.log("\n=== BATCH 3 (memory + production rework) ==="); P.forEach(x=>console.log("  [pass] "+x)); F.forEach(x=>console.log("  [FAIL] "+x));
console.log("\n"+P.length+" passed, "+F.length+" failed."); process.exit(F.length?1:0);
