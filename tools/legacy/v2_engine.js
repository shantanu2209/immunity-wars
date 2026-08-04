/* =========================================================================
   THE IMMUNITY WARS — ORGAN TOPOLOGY ENGINE (experimental, headless-first)

   Board:  entry route (3-4 steps) -> BLOODSTREAM HUB -> organ branch (3-4) -> ORGAN
   Tropism: each disease can infect only certain organs. The organ is rolled
            AT THE HUB, independently per invader — so a divided swarm fans out.
   Organs:  integrity 3 (brain 2). Reaching an organ = -1 integrity.
            Organ at 0 = organ failure = loss. Organs heal after clear turns.
   Resident macrophages: alveolar / Kupffer / microglia — a stationary last
            line at each organ; eats ONE arriving eligible invader per turn.
   ========================================================================= */

const shuffle = a => { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const clone = o => JSON.parse(JSON.stringify(o));
let _uid=0; const uid=()=>"i"+(++_uid);
const d6=()=>1+Math.floor(Math.random()*6);
const cap1=s=>s? s[0].toUpperCase()+s.slice(1) : s;

/* ---------------- ORGANS ---------------- */
/* kind: "vital" = you die if it fails, but immunity unaffected
         "defence" = damaging it weakens your immune system              */
const ORGANS = {
  heart:   { name:"Heart",       kind:"vital",   integrity:3, branch:2, effect:"-1 Action Point (weak pump)", bio:"The heart itself can be infected — Staph on the valves (endocarditis), Lyme carditis, viral myocarditis. Germs only passing through the bloodstream do NOT infect it; only germs that target heart tissue do." },
  lungs:   { name:"Lungs",       kind:"vital",   integrity:3, branch:3, effect:"-1 Action Point",              bio:"Damaged lungs mean poor gas exchange — the whole body weakens." },
  liver:   { name:"Liver",       kind:"defence", integrity:3, branch:3, effect:"Antibody storage capped at 2 per class",   bio:"The liver makes many defence proteins; damage it and antibody supply falls." },
  marrow:  { name:"Bone Marrow", kind:"defence", integrity:3, branch:3, effect:"Neutrophil cannot regenerate", bio:"All immune cells are made in the marrow." },
  brain:   { name:"Brain",       kind:"vital",   integrity:2, branch:3, effect:"None — but fragile & slow to defend", bio:"Immune privilege: the blood-brain barrier keeps immune cells out, so it is hard to defend and cannot take much damage." },
  spleen:  { name:"Spleen",      kind:"defence", integrity:3, branch:3, effect:"Bacteria divide on 1–3",       bio:"The spleen filters encapsulated bacteria from the blood — without it, bacterial infection runs wild." },
  kidneys: { name:"Kidneys",     kind:"vital",   integrity:3, branch:3, effect:"Lose 1 antibody each turn",    bio:"Damaged kidneys leak antibodies into the urine — a real cause of secondary immunodeficiency." },
};
// All difficulties use the SAME full body — 7 organs — so the physical board is identical at every
// level (only AP, spawn rate and division scale with difficulty). We measured that organ/lane count
// barely affects win-rate, and a uniform board is far easier to print and to port to cardboard.
const ALL_ORGANS = ["heart","lungs","liver","marrow","brain","spleen","kidneys"];
const ORGAN_SETS = {
  training: ALL_ORGANS,
  normal:   ALL_ORGANS,
  hard:     ALL_ORGANS,
};

/* ---------------- ROUTES ---------------- */
/* Bite goes straight into the bloodstream (a mosquito injects) — shorter route. */
const ROUTES = { nose:{name:"Nose",len:5},   gut:{name:"Gut",len:5},     contact:{name:"Contact",len:5},
                 wound:{name:"Wound",len:5}, bite:{name:"Bite",len:5},
                 blood:{name:"Blood",len:3} };   // BLOOD is SHORT: a needle bypasses the tissue barrier entirely  // uniform: totals land at 8-10 marches
const ROUTE_KEYS = ["nose","gut","contact","wound","bite","blood"];
// LYMPH GROUPS (not pairs). Mucosal surfaces share defences — the common mucosal immune system (MALT).
// Skin routes share regional drainage. BLOOD has NO lymphatic link: a needle goes straight in,
// bypassing the tissues — which is exactly why it is the most dangerous way to be infected.
const LYMPH_GROUP = { nose:"mucosal", gut:"mucosal", contact:"mucosal", wound:"skin", bite:"skin", blood:null };
function lymphPartners(lane){ const g=LYMPH_GROUP[lane]; if(!g) return [];
  return ROUTE_KEYS.filter(l=>l!==lane && LYMPH_GROUP[l]===g && ROUTES[l].len>=LYMPH_STEP); }
const PAIR = { nose:"gut", gut:"nose", bite:"wound", wound:"bite" };
const LYMPH_STEP = 3;   // the lymphatic crossing point on each route (mid-route)

/* ---------------- TROPISM ---------------- */
/* Which organs each disease can actually infect. "any" = generalist. */


// special flags: killsHelper (HIV) · hidesInMac (kala-azar) · blocksLymph (filariasis)
//                amnesia (measles) · drain (giardia) · variant (sleeping sickness) · forced (organ)
const DECK_MASTER=[
// ---------------- NOSE / airway ----------------
{dz:"Influenza",type:"virus",lane:"nose"},
{dz:"Common cold",type:"virus",lane:"nose"},
{dz:"COVID-19",type:"virus",lane:"nose"},
{dz:"RSV",type:"virus",lane:"nose"},
{dz:"Measles",type:"virus",lane:"nose",amnesia:true},
{dz:"Mumps",type:"virus",lane:"nose"},
{dz:"Rubella",type:"virus",lane:"nose"},
{dz:"Smallpox",type:"virus",lane:"nose"},
{dz:"Nipah",type:"virus",lane:"nose"},
{dz:"Hand-foot-and-mouth",type:"virus",lane:"nose"},
{dz:"Chickenpox",type:"hidden",lane:"nose"},
{dz:"Glandular fever",type:"hidden",lane:"nose"},
{dz:"Cytomegalovirus",type:"hidden",lane:"nose"},
{dz:"Tuberculosis",type:"bacteria",lane:"nose"},
{dz:"Whooping cough",type:"bacteria",lane:"nose"},
{dz:"Meningitis",type:"bacteria",lane:"nose"},
{dz:"Pneumonia",type:"bacteria",lane:"nose"},
{dz:"Strep throat",type:"bacteria",lane:"nose"},
{dz:"Leprosy",type:"bacteria",lane:"nose"},
{dz:"Legionnaires' disease",type:"bacteria",lane:"nose"},
{dz:"Diphtheria",type:"toxin",lane:"nose"},
{dz:"Mucormycosis",type:"fungus",lane:"nose"},
{dz:"Aspergillosis",type:"fungus",lane:"nose"},
{dz:"Cryptococcus",type:"fungus",lane:"nose"},
{dz:"Pneumocystis pneumonia",type:"fungus",lane:"nose"},
// ---------------- BITE / vector ----------------
{dz:"Dengue",type:"virus",lane:"bite"},
{dz:"Chikungunya",type:"virus",lane:"bite"},
{dz:"Japanese encephalitis",type:"virus",lane:"bite"},
{dz:"Yellow fever",type:"virus",lane:"bite"},
{dz:"Zika",type:"virus",lane:"bite"},
{dz:"West Nile fever",type:"virus",lane:"bite"},
{dz:"Rabies",type:"hidden",lane:"bite"},



{dz:"Chagas disease",type:"hidden",lane:"bite"},
{dz:"Lyme disease",type:"bacteria",lane:"bite"},
{dz:"Plague",type:"bacteria",lane:"bite"},
{dz:"Scrub typhus",type:"bacteria",lane:"bite"},
{dz:"Malaria",type:"malaria",lane:"bite"},
{dz:"Kala-azar",type:"parasite",lane:"bite",hidesInMac:true},
{dz:"Sleeping sickness",type:"parasite",lane:"bite",variant:true},
{dz:"Filariasis",type:"worm",lane:"bite",blocksLymph:true},
{dz:"Snake venom",type:"venom",lane:"bite"},
{dz:"Russell's viper venom",type:"venom",lane:"bite"},
{dz:"Red scorpion sting",type:"venom",lane:"bite"},
// ---------------- WOUND / skin break ----------------
{dz:"Tetanus",type:"bacteria",lane:"wound"},
{dz:"MRSA",type:"bacteria",lane:"wound"},
{dz:"Cellulitis",type:"bacteria",lane:"wound"},
{dz:"Leptospirosis",type:"bacteria",lane:"wound"},
{dz:"Gas gangrene",type:"bacteria",lane:"wound"},

{dz:"Brucellosis",type:"bacteria",lane:"wound"},
{dz:"Cold sore",type:"hidden",lane:"wound"},

{dz:"Ebola",type:"virus",lane:"wound"},
{dz:"Anthrax",type:"toxin",lane:"wound"},
{dz:"Hookworm",type:"worm",lane:"wound"},
{dz:"Schistosomiasis",type:"worm",lane:"wound"},
{dz:"Guinea worm",type:"worm",lane:"wound"},
{dz:"Histoplasmosis",type:"fungus",lane:"wound"},
// ---------------- GUT / ingestion ----------------
{dz:"Typhoid",type:"bacteria",lane:"gut"},
{dz:"Cholera",type:"bacteria",lane:"gut"},
{dz:"Dysentery",type:"bacteria",lane:"gut"},
{dz:"Food poisoning",type:"bacteria",lane:"gut"},
{dz:"Listeria",type:"bacteria",lane:"gut"},
{dz:"Stomach ulcer (H. pylori)",type:"bacteria",lane:"gut"},
{dz:"Rotavirus",type:"virus",lane:"gut"},
{dz:"Hepatitis A",type:"virus",lane:"gut"},
{dz:"Hepatitis E",type:"virus",lane:"gut"},
{dz:"Norovirus",type:"virus",lane:"gut"},
{dz:"Polio",type:"virus",lane:"gut"},
{dz:"Botulism",type:"toxin",lane:"gut"},
{dz:"Shiga toxin (E. coli O157)",type:"toxin",lane:"gut"},
{dz:"Roundworm",type:"worm",lane:"gut"},
{dz:"Tapeworm",type:"worm",lane:"gut"},
{dz:"Whipworm",type:"worm",lane:"gut"},
{dz:"Amoebiasis",type:"parasite",lane:"gut",forced:"liver"},
{dz:"Giardia",type:"parasite",lane:"gut",drain:1},
{dz:"Toxoplasmosis",type:"hidden",lane:"gut"},
{dz:"Candida",type:"fungus",lane:"gut"},
// ---------------- SEXUAL / genital & oral mucosa ----------------
{dz:"HIV",type:"hidden",lane:"contact",killsHelper:true},
{dz:"Syphilis",type:"bacteria",lane:"contact"},
{dz:"Human papillomavirus",type:"hidden",lane:"contact"},
{dz:"Gonorrhoea",type:"bacteria",lane:"contact"},
{dz:"Chlamydia",type:"bacteria",lane:"contact"},
{dz:"Genital herpes",type:"hidden",lane:"contact"},
{dz:"Trichomoniasis",type:"parasite",lane:"contact"},
// --- contact that is NOT sexual: skin-to-skin, hands, shared cloth ---
{dz:"Scabies",type:"parasite",lane:"contact"},
{dz:"Ringworm",type:"fungus",lane:"contact"},
{dz:"Impetigo",type:"bacteria",lane:"contact"},
{dz:"Trachoma",type:"bacteria",lane:"contact"},
{dz:"Conjunctivitis",type:"virus",lane:"contact"},
{dz:"Molluscum contagiosum",type:"virus",lane:"contact"},
// ---------------- BLOOD / needle, transfusion, drip ----------------
{dz:"Hepatitis B",type:"hidden",lane:"blood"},
{dz:"Hepatitis C",type:"hidden",lane:"blood"},
{dz:"Hepatitis D",type:"hidden",lane:"blood",needsHepB:true},
{dz:"Transfusion malaria",type:"malaria",lane:"blood"},
{dz:"Catheter sepsis",type:"fungus",lane:"blood"},
{dz:"Cannula infection",type:"bacteria",lane:"blood"},
{dz:"Endocarditis",type:"bacteria",lane:"blood"},
// ---------------- THE NOVEL PATHOGEN ----------------
// A germ your body has NEVER met. No antibody you own fits it. Your innate cells still work —
// they buy time while the B-Cells search millions of receptors for the one clone that fits.
{dz:"Pathogen X",type:"virus",lane:"nose",novel:true},
];

const TROPISM={
// nose
"Influenza":["lungs"],"Common cold":["lungs"],"COVID-19":["lungs","heart"],"RSV":["lungs"],
"Measles":["lungs","brain"],"Mumps":["brain","spleen"],"Rubella":["lungs","heart"],
"Smallpox":["lungs","liver"],"Nipah":["brain","lungs"],"Hand-foot-and-mouth":["lungs","heart"],
"Chickenpox":["lungs","brain"],"Glandular fever":["spleen","liver"],"Cytomegalovirus":["liver","lungs"],
"Tuberculosis":["lungs"],"Whooping cough":["lungs"],"Meningitis":["brain"],"Pneumonia":["lungs"],
"Strep throat":["heart","kidneys"],"Leprosy":["brain"],"Legionnaires' disease":["lungs"],
"Diphtheria":["heart"],"Mucormycosis":["brain","lungs"],"Aspergillosis":["lungs"],
"Cryptococcus":["brain"],"Pneumocystis pneumonia":["lungs"],
// bite
"Dengue":["liver","marrow"],"Chikungunya":["liver","heart"],"Japanese encephalitis":["brain"],
"Yellow fever":["liver","kidneys"],"Zika":["brain"],"West Nile fever":["brain"],
"Rabies":["brain"],"HIV":["marrow","spleen"],"Hepatitis B":["liver"],"Hepatitis C":["liver"],
"Chagas disease":["heart"],"Lyme disease":["brain","heart"],"Plague":["lungs","spleen"],
"Scrub typhus":["lungs","brain"],"Malaria":["liver"],"Malaria (blood)":["spleen","brain"],
"Kala-azar":["spleen","marrow"],"Sleeping sickness":["brain"],"Filariasis":["marrow","spleen"],
"Snake venom":["heart","kidneys"],"Russell's viper venom":["kidneys"],"Red scorpion sting":["heart","lungs"],
// wound
"Tetanus":["brain"],"MRSA":"any","Cellulitis":["marrow","heart"],"Leptospirosis":["kidneys","liver"],
"Gas gangrene":["kidneys","liver"],"Syphilis":["brain","heart"],"Brucellosis":["spleen","liver"],
"Cold sore":["brain"],"Human papillomavirus":["liver"],"Ebola":["liver","spleen"],
"Anthrax":["lungs"],"Hookworm":["marrow"],"Schistosomiasis":["liver","spleen"],
"Guinea worm":["marrow"],"Histoplasmosis":["lungs","spleen"],
// gut
"Typhoid":["liver","spleen"],"Cholera":["kidneys"],"Dysentery":["kidneys"],"Food poisoning":["kidneys"],
"Listeria":["brain"],"Stomach ulcer (H. pylori)":["liver"],"Rotavirus":["kidneys"],
"Hepatitis A":["liver"],"Hepatitis E":["liver"],"Norovirus":["kidneys"],"Polio":["brain"],
"Botulism":["brain"],"Shiga toxin (E. coli O157)":["kidneys"],
"Roundworm":["lungs","liver"],"Tapeworm":["brain"],"Whipworm":["marrow"],
"Amoebiasis":["liver"],"Giardia":["liver"],"Toxoplasmosis":["brain"],"Candida":"any",
// sexual route
"Gonorrhoea":["kidneys","heart"],"Chlamydia":["kidneys"],"Genital herpes":["brain"],
"Trichomoniasis":["kidneys"],
// blood route
"Hepatitis D":["liver"],"Transfusion malaria":["liver"],"Catheter sepsis":"any",
"Scabies":["marrow"],"Ringworm":["lungs"],"Impetigo":["heart","kidneys"],
"Trachoma":["brain"],"Conjunctivitis":["lungs"],"Molluscum contagiosum":["lungs"],
"Endocarditis":["heart"],
"Cannula infection":["heart","marrow"],
// dynamic (toxins emitted by bacteria, rare events)
"Tetanus toxin":["brain"],"Cholera toxin":["kidneys"],"Clostridial toxin":["kidneys","liver"],
"Diphtheria toxin":["heart"],
"Shingles":["brain"],"Dengue (ADE)":["liver","marrow"],"Malaria (relapse)":["liver"],
"Tuberculosis (reactivated)":["lungs"],"Pneumococcal pneumonia":["lungs"],
};

const CELL_KEYS=["macrophage","neutrophil","bcell","tcell","helper","nk","eosinophil"];
const SPEED={macrophage:1,neutrophil:2,bcell:1,tcell:1,helper:1,nk:2,eosinophil:1};
const NK_RANGE=1;   // NK kills infected cells up close, no antigen needed (innate)
const NK_HITS=3;    // ...but innate killing is imprecise: succeeds on a d6 of 3+ (Killer T-Cell never misses)
const DIFF={ training:{ap:6,turns:15,spawn:"dice"}, normal:{ap:5,turns:20,spawn:"dice"}, hard:{ap:4,turns:30,spawn:"dice"} };
const ANTIBODY_RATE=2, ANTIBODY_CAP=4;
const INFECT_ON=2, BURST_ON=2, SNIPE_RANGE=3, NEUTROPHIL_REGEN=4, EOSINOPHIL_REGEN=4;
const NEUTROPHIL_REGEN_HELPED=2;
/* WORM CAPS (playtest 27-07): worms lodge AT an organ and only the Eosinophil can shift them, so a
   pile-up is unwinnable. At most ONE worm may arrive in a turn, and at most TWO in a whole game.
   A worm drawn past either cap is swapped for a non-worm card, so total infection pressure is
   unchanged — only the mix. The Force tool bypasses these caps on purpose (it is a testing tool). */
const WORM_MAX_PER_GAME=2, WORM_MAX_PER_TURN=1;   // a primed Helper T-cell circulating in the BLOOD drives granulopoiesis
const WORM_DAMAGE_EVERY=3;   // a lodged worm chews the organ for -1 integrity every N turns (chronic disease)
const HEAL_AFTER=2;   // clear turns on a branch before an organ heals +1
const GRACE_CLEAR=15;   // after the spawn window, this many turns to fully clear the body or you lose
const SPACE_CAP=8;      // max bacteria that can pack into one tissue space (density-limited growth)
let SPAWN=1;          // infection cards drawn per turn (experiment knob)
let SPAWN_MODE=null;   // null = use the difficulty's own schedule; else override (testing)
const EVENTS={
  immunosuppression:{bad:true,name:"Immunosuppression",why:"Stress or malnutrition blunts the response.",tell:"No antibodies can be made next turn."},
  neutropenia:{bad:true,name:"Neutropenia",why:"Neutrophil count crashes.",tell:"The Neutrophil goes offline for 2 turns."},
  lymphopenia:{bad:true,name:"Lymphopenia",why:"A virus is destroying lymphocytes.",tell:"The Killer T-Cell goes offline for 2 turns."},
  antibodyShortage:{bad:true,name:"Antibody shortage",why:"Plasma cells can't keep up.",tell:"Antibody store capped at 2 for 3 turns."},
  fatigue:{bad:true,name:"Fatigue",why:"The whole body is exhausted: <b>1 fewer Action Point this turn only</b>.",tell:"1 fewer Action Point next turn."},
  coInfection:{bad:true,name:"Co-infection",why:"A second germ slips in while you're busy.",tell:"An extra invader breaks in next turn."},
  surge:{bad:false,name:"Acute-phase surge",why:"Inflammation floods the tissue with defenders: <b>+2 Action Points this turn only</b>. (Acute-phase proteins and a burst of cells released from the marrow.)"},
  passiveAntibodies:{bad:false,name:"Passive antibodies",why:"A booster tops up your antibodies."},
  fever:{bad:false,name:"Fever",why:"Raised temperature slows the invaders (at an energy cost)."},
};
const BAD_POOL=["immunosuppression","neutropenia","lymphopenia","antibodyShortage","fatigue","coInfection"];
const GOOD_POOL=["surge","passiveAntibodies","fever"];
function scheduleEvents(g){
  const T=g.maxTurn, raw=[Math.round(T*0.25),Math.round(T*0.5),Math.round(T*0.75)], slots=[];
  raw.forEach(t=>{ t=Math.max(2,Math.min(T-1,t)); while(slots.includes(t)) t++; slots.push(t); });
  const picks=shuffle([...shuffle(BAD_POOL.slice()).slice(0,2), ...shuffle(GOOD_POOL.slice()).slice(0,1)]);
  slots.forEach((t,i)=>{ g.events[t]=picks[i]; });
}
function fireTurnStart(g){
  g.banner=null; g.warning=null;
  if(!g.flags.crisisEvents) return;
  const here=g.events[g.turn]; if(here) applyEvent(g,here);
  const nx=g.events[g.turn+1];
  if(nx && EVENTS[nx].bad) g.warning={key:nx,name:EVENTS[nx].name,text:EVENTS[nx].tell};
}
function applyEvent(g,key){
  const e=EVENTS[key]; g.banner={key,name:e.name,bad:e.bad,why:e.why};
  switch(key){
    case "immunosuppression": g.fx.noProduce=true; break;
    case "neutropenia": g.suppress.neutrophil=2; Object.assign(g.cells.neutrophil,{zone:"hub",lane:null,organ:null,step:0}); break;
    case "lymphopenia": g.suppress.tcell=2; Object.assign(g.cells.tcell,{zone:"hub",lane:null,organ:null,step:0}); break;
    case "antibodyShortage": g.fx.capTurns=3; FAM_KEYS.concat(["X"]).forEach(f=>{ if(g.ab[f]>2) g.ab[f]=2; }); break;
    case "fatigue": g.fx.apMod=(g.fx.apMod||0)-1; break;
    case "coInfection": { if(!g.deck.length) g.deck=shuffle(g.discard.splice(0)); let c=g.deck.pop(); g.discard.push(c);
      c=respectWormCap(g,c);                          // the co-infection cannot smuggle in an extra worm
      if(!c){ pushLog(g,"A co-infection threatened, but nothing new took hold.",""); break; }
      const iv=makeInvader(g,c); g.invaders.push(iv); g.everInfected=true; g.seen[c.dz]=true;
      if(iv.type==="worm") noteWorm(g);
      if(c.novel){ g.novelSeen=true; iv.novel=true; }
      pushLog(g,`Co-infection: an extra <b>${c.dz}</b> broke in${iv.zone==="branch"?` and is burrowing into the ${ORGANS[iv.organ].name}`:""}.`,"bad"); break; }
    case "surge": g.fx.apMod=(g.fx.apMod||0)+2; break;
    case "passiveAntibodies": FAM_KEYS.forEach(f=>{ g.ab[f]=capFam(g,f); }); break;   // a booster tops up every class
    case "fever": g.fx.skipMarch=true; g.fx.apMod=(g.fx.apMod||0)-1; break;
  }
  pushLog(g,`<b>${e.bad?"⚠ ":"✚ "}${e.name}</b> — ${e.why}`, e.bad?"bad":"good");
}
/* ============ RARE EVENTS — max ONE per game, 50% chance, fired by something YOU did ============ */
const RARE={
  malariaRelapse:{ name:"Malaria relapse", why:"A dormant hypnozoite of P. vivax woke up in your liver — months later, from nothing. This is why vivax malaria needs a second drug to clear the liver." },
  dengueADE:{ name:"Dengue — antibody-dependent enhancement", why:"Your dengue antibodies from last time do NOT neutralise this serotype — they HELP it into your cells. Your own immune memory is being used against you. This is why the second dengue infection is the dangerous one." },
  tbReactivation:{ name:"TB reactivation", why:"Latent TB woke up while your defences were down. A quarter of the world carries TB silently." },
  shingles:{ name:"Shingles", why:"The chickenpox virus never left — it hid in your nerves for years and has re-emerged." },
  postFluPneumonia:{ name:"Post-influenza pneumonia", why:"Flu stripped your airway lining and bacteria moved in. This is what killed most victims of the 1918 pandemic — not the flu itself." },
  rheumaticFever:{ name:"Rheumatic fever", why:"MOLECULAR MIMICRY: your anti-Strep antibodies cannot tell the difference between the bacterium and your own heart valve — so they are attacking your heart. A leading cause of heart disease in Indian children." },
  cytokineStorm:{ name:"Cytokine storm", why:"Your immune response went into overdrive and the inflammation itself burned an organ. This is what killed young, healthy people in COVID and in 1918 — the response, not the germ." },
};
function fireRare(g,key,extra){
  if(!g.flags.rareEvents || !g.rare.armed || g.rare.fired) return false;
  g.rare.fired=key; const e=RARE[key];
  g.rareBanner={key,name:e.name,why:e.why,firedTurn:g.turn};
  switch(key){
    case "malariaRelapse": {
      g.invaders.push({id:uid(),type:"malaria",stage:"liver",zone:"branch",organ:"liver",lane:"bite",
        step:0,tagged:false,disease:"Malaria (relapse)",hp:1,maxhp:1,age:0,embed:MALARIA_LIVER_TURNS});
      break; }
    case "dengueADE": {
      const d=g.invaders.find(x=>/Dengue/.test(x.disease));
      if(d){ d.ade=true; d.disease="Dengue (ADE)"; }
      break; }
    case "tbReactivation": {
      g.invaders.push({id:uid(),type:"bacteria",zone:"branch",organ:"lungs",lane:"nose",step:branchLen("lungs"),
        tagged:false,disease:"Tuberculosis (reactivated)",hp:1,maxhp:1,age:0,embed:0});
      break; }
    case "shingles": {
      g.invaders.push({id:uid(),type:"hidden",zone:"route",lane:"nose",organ:null,step:2,
        tagged:false,disease:"Shingles",hp:1,maxhp:1,age:0,embed:0});
      break; }
    case "postFluPneumonia": {
      g.invaders.push({id:uid(),type:"bacteria",zone:"branch",organ:"lungs",lane:"nose",step:1,
        tagged:false,disease:"Pneumococcal pneumonia",hp:1,maxhp:1,age:0,embed:0});
      break; }
    case "rheumaticFever": {
      if(g.organs.heart){ const h=g.organs.heart; h.hp=Math.max(0,h.hp-1); h.clear=0; }
      break; }
    case "cytokineStorm": {
      const live=g.organList.filter(o=>g.organs[o].hp>0);
      const o=live[Math.floor(Math.random()*live.length)];
      if(o){ const org=g.organs[o]; org.hp=Math.max(0,org.hp-1); org.clear=0; g.rareBanner.why+=` The ${ORGANS[o].name} took the damage.`; }
      break; }
  }
  pushLog(g,`<b>★ ${e.name}</b> — ${e.why}`,"bad");
  return true;
}
function checkRareTriggers(g){
  if(!g.flags.rareEvents || !g.rare.armed || g.rare.fired) return;
  const seen=g.rare.seen;
  // cytokine storm: you killed a lot in one turn — the response itself burns you
  if(g.rare.killedThisTurn>=4) return void fireRare(g,"cytokineStorm");
  // rheumatic fever: you killed Strep (cellulitis) with ANTIBODIES
  if(seen.strepKilledByAntibody) return void fireRare(g,"rheumaticFever");
  // dengue ADE: dengue beaten before, and dengue is back
  if(seen.dengueKilled && g.invaders.some(x=>/Dengue/.test(x.disease) && !x.ade)) return void fireRare(g,"dengueADE");
  // malaria relapse: malaria once reached the liver, and it is long gone
  if(g.rare.malariaLiver && g.turn>=8 && !g.invaders.some(x=>x.type==="malaria")) return void fireRare(g,"malariaRelapse");
  // post-flu pneumonia: influenza reached the lungs
  if(seen.fluInLungs) return void fireRare(g,"postFluPneumonia");
  // shingles: chickenpox was beaten
  if(seen.chickenpoxKilled && g.turn>=6) return void fireRare(g,"shingles");
  // TB reactivation: TB beaten, and the body is now weakened
  if(seen.tbKilled && (!g.cells.neutrophil.alive || (g.organs.marrow&&damaged(g,"marrow")))) return void fireRare(g,"tbReactivation");
}
const SPAWN_TABLE={   // d6 -> how many infections break in this turn
  training:[1,1,1,1,1,2],   // avg 1.17
  normal:  [1,1,1,1,2,2],   // avg 1.33
  hard:    [1,1,1,2,2,3],   // avg 1.67
};
function spawnCount(g){
  if(!SPAWN_MODE){ const t=SPAWN_TABLE[g.difficulty]||SPAWN_TABLE.normal; return t[d6()-1]; }
  const mode = SPAWN_MODE;
  switch(mode){
    case "flat2": return 2;
    case "every3": return (g.turn%3===0)?2:1;      // a surge every 3rd turn
    case "every2": return (g.turn%2===0)?2:1;      // a surge every other turn
    case "ramp":   return (g.turn > Math.floor(g.maxTurn/2))?2:1;  // infection escalates
    default: return 1;
  }
}
let HUB_SAFE=false;   // if true, invaders in the bloodstream hub cannot be attacked (only in tissue)
function setKnobs(k){ if(k.spawn!==undefined)SPAWN=k.spawn; if(k.spawnMode!==undefined)SPAWN_MODE=k.spawnMode; if(k.organs!==undefined)ORGAN_OVERRIDE=k.organs; if(k.ap!==undefined)AP_OVERRIDE=k.ap; if(k.hubSafe!==undefined)HUB_SAFE=k.hubSafe; if(k.heal!==undefined)HEALV=k.heal; }
const FLAGS={ organs:true, residents:true, residentMove:true, primeResident:true, lymph:true, crisisEvents:true,
  heartOrgan:true, dendritic:true, helperT:true, nkCell:true, complement:true,
  toxins:true, fungus:true, worms:true, malaria:true, eosinophil:true, rareEvents:true, specials:true, tierB:true };

/* ===================== TIER A: new pathogen types =====================
   toxin/venom : NOT ALIVE. Cannot be engulfed/NETted/sniped. Antibody only. Speed 2.
   fungus      : HP 2. Macrophage chips it; a NET kills it outright. OPPORTUNISTIC —
                 moves at speed 2 while your Neutrophil is dead or your marrow is damaged.
   worm        : HP 3. Too big to engulf. Must be antibody-COATED, then attacked from outside.
                 Eosinophil does 2, other cells 1. Eosinophil damages the ORGAN it fights in.
   malaria     : full lifecycle — bite -> forced to LIVER -> hides inside liver cells
                 (antibodies useless) -> bursts into blood-stage parasites -> spleen/brain.
   ===================================================================== */
/* ===================== ANTIGEN CLASSES (Tier B) =====================
   Real antibodies are specific to ONE antigen. Tracking 81 separate pools is
   unplayable, so the game groups pathogens into 6 ANTIGEN CLASSES that share
   structural targets. This is a deliberate, declared simplification — and it is
   the honest one to make: the classes below are how immunologists actually
   divide the problem, because each class needs a DIFFERENT kind of defence.
   ==================================================================== */
const FAMILIES={
  ENV:{name:"Enveloped virus", short:"ENV", col:"#ef4444",
       bio:"Wrapped in a stolen piece of your own cell membrane, studded with spike proteins. Antibodies target the spikes."},
  NAK:{name:"Naked virus", short:"NAK", col:"#f97316",
       bio:"No envelope — a bare protein shell. Tough, survives on surfaces, and antibodies must grip the capsid itself."},
  EXB:{name:"Extracellular bacterium", short:"EXB", col:"#9bb02f",
       bio:"Lives outside your cells, often behind a slimy capsule. Antibodies opsonise it so phagocytes can grip it."},
  ICB:{name:"Intracellular bacterium", short:"ICB", col:"#14b8a6",
       bio:"Hides INSIDE your cells, where antibodies struggle to follow. This is why TB is so hard to kill."},
  TOX:{name:"Toxin (antitoxin)", short:"TOX", col:"#84cc16",
       bio:"Not alive at all. Cannot be eaten. Antibodies (antitoxin) are the ONLY defence."},
  EUK:{name:"Eukaryotic parasite", short:"EUK", col:"#e879f9",
       bio:"Fungi, worms and protozoa — complex cells like ours, so they are hard to target without harming yourself."},
};
const FAM_KEYS=["ENV","NAK","EXB","ICB","TOX","EUK"];

const FAMILY={
// --- enveloped viruses ---
"Influenza":"ENV","COVID-19":"ENV","RSV":"ENV","Measles":"ENV","Mumps":"ENV","Rubella":"ENV",
"Smallpox":"ENV","Nipah":"ENV","Chickenpox":"ENV","Glandular fever":"ENV","Cytomegalovirus":"ENV",
"Dengue":"ENV","Chikungunya":"ENV","Japanese encephalitis":"ENV","Yellow fever":"ENV","Zika":"ENV",
"West Nile fever":"ENV","Rabies":"ENV","HIV":"ENV","Hepatitis B":"ENV","Hepatitis C":"ENV",
"Cold sore":"ENV","Ebola":"ENV","Shingles":"ENV","Dengue (ADE)":"ENV",
// --- naked (non-enveloped) viruses ---
"Common cold":"NAK","Hand-foot-and-mouth":"NAK","Human papillomavirus":"NAK",
"Rotavirus":"NAK","Hepatitis A":"NAK","Hepatitis E":"NAK","Norovirus":"NAK","Polio":"NAK",
// --- extracellular bacteria ---
"Whooping cough":"EXB","Meningitis":"EXB","Pneumonia":"EXB","Strep throat":"EXB",
"Lyme disease":"EXB","Plague":"EXB","Tetanus":"EXB","MRSA":"EXB","Cellulitis":"EXB",
"Leptospirosis":"EXB","Gas gangrene":"EXB","Syphilis":"EXB","Typhoid":"EXB","Cholera":"EXB",
"Food poisoning":"EXB","Stomach ulcer (H. pylori)":"EXB","Pneumococcal pneumonia":"EXB",
// --- intracellular bacteria ---
"Tuberculosis":"ICB","Leprosy":"ICB","Legionnaires' disease":"ICB","Scrub typhus":"ICB",
"Brucellosis":"ICB","Dysentery":"ICB","Listeria":"ICB","Tuberculosis (reactivated)":"ICB",
// --- toxins & venoms ---
"Diphtheria":"TOX","Anthrax":"TOX","Botulism":"TOX","Shiga toxin (E. coli O157)":"TOX",
"Snake venom":"TOX","Russell's viper venom":"TOX","Red scorpion sting":"TOX",
"Tetanus toxin":"TOX","Cholera toxin":"TOX","Clostridial toxin":"TOX","Diphtheria toxin":"TOX",
// --- eukaryotic parasites (fungi, worms, protozoa) ---
"Mucormycosis":"EUK","Aspergillosis":"EUK","Cryptococcus":"EUK","Pneumocystis pneumonia":"EUK",
"Candida":"EUK","Histoplasmosis":"EUK",
"Malaria":"EUK","Malaria (blood)":"EUK","Malaria (relapse)":"EUK","Kala-azar":"EUK",
"Sleeping sickness":"EUK","Chagas disease":"EUK","Amoebiasis":"EUK","Giardia":"EUK","Toxoplasmosis":"EUK",
"Roundworm":"EUK","Hookworm":"EUK","Tapeworm":"EUK","Whipworm":"EUK","Filariasis":"EUK",
"Schistosomiasis":"EUK","Guinea worm":"EUK",
"Gonorrhoea":"EXB","Chlamydia":"ICB","Genital herpes":"ENV","Trichomoniasis":"EUK",
"Hepatitis D":"ENV","Transfusion malaria":"EUK","Catheter sepsis":"EUK","Cannula infection":"EXB",
"Scabies":"EUK","Ringworm":"EUK","Impetigo":"EXB","Trachoma":"ICB","Conjunctivitis":"NAK",
"Molluscum contagiosum":"ENV","Endocarditis":"EXB",
};

/* ===================== TIER B: the LEARNING immune system ===================== */
const AB_CAP_FAM_BY_DIFF = { training:5, normal:4, hard:3 };   // antibodies you can stockpile PER antigen class
const AB_CAP_FAM   = 3;   // legacy fallback (see capFam)
const VACCINE_COST = 5;   // total Action Points to develop a vaccine — invest at your own pace
const CLONE_COST   = 3;   // AP to find the matching B-cell clone for a NOVEL antigen
const MEMORY_BOOST = 3;   // antibodies granted INSTANTLY when a remembered pathogen returns
const AFFINITY_AT  = 4;   // produce this many times against one class -> antibodies improve
const REINFECT_PC  = 0.25;// chance a new infection is one you have already met
function famOf(iv){ return iv.novel ? "X" : (FAMILY[iv.disease] || "EXB"); }

const INV_HP   = { virus:1, hidden:1, bacteria:1, toxin:1, venom:1, fungus:2, worm:3, malaria:1, parasite:2 };
const INV_SPEED= { virus:1, hidden:1, bacteria:1, toxin:2, venom:2, fungus:1, worm:1, malaria:1, parasite:1 };
// EMERGENCY pathogens — famously fulminant real diseases that race toward the body. Speed by NAME
// overrides the type default, at every difficulty. This teaches that some infections are true
// medical emergencies you must answer the turn they appear, not "get to eventually".
const FAST_DISEASE = {
  "Meningitis":3,      // bacterial meningitis — the most time-critical infection in medicine (hours)
  "Gas gangrene":3,    // Clostridium perfringens — tissue destruction spreads visibly by the hour
  "Cholera":2,         // Vibrio cholerae — litres of fluid lost in hours
  "Plague":2,          // Yersinia pestis — pneumonic plague kills in 1-2 days
  "Ebola":2,           // haemorrhagic fever — overwhelms the body in days
  "Catheter sepsis":2, // a bloodstream infection races once it is in the blood
  "Endocarditis":2,    // infection seeded on a heart valve — every hour raises mortality
  // Anthrax is a toxin and is already speed 2.
};
const NOT_ALIVE= new Set(["toxin","venom"]);          // cannot be eaten, netted, sniped
const TOXIN_MAKERS = { "Tetanus":"Tetanus toxin", "Cholera":"Cholera toxin", "Gas gangrene":"Clostridial toxin" };
const TOXIN_AFTER = 3;      // an untagged toxin-making bacterium emits a toxin after this many turns
const MALARIA_LIVER_TURNS = 3;   // hypnozoite/schizont time inside liver cells before it bursts
const ANTIVENOM_CHARGES = 2;
const ANTIVENOM_ORDER = 4;   // AP to procure ONE more vial. Antivenom is a SUPPLY problem, not an immunity one.
const PRESENT_TIER=[0,1,4];   // legacy — kept for reference
// antigens needed to reach +2 / +3 per Produce, by difficulty. Higher = slower to ramp.
const PRESENT_TIER_BY_DIFF = {
  training:[0, 1, 3],    // ramps fast — a gentle learning curve
  normal:  [0, 3, 7],    // moderate
  hard:    [0, 5, 12],   // slow: you must EARN a high production rate over many turns
};
// the absolute ceiling on antibodies-per-Produce, by difficulty (affinity + helper can still add within this)
const RATE_CAP_BY_DIFF = { training:3, normal:3, hard:2 };   // max antibodies made per 1 AP. Hard: nothing exceeds 2.

/* ---------------- positions ----------------
   route:  {zone:"route",  lane, step}   step counts DOWN to 1, then hub
   hub:    {zone:"hub"}
   branch: {zone:"branch", organ, step}  step counts DOWN to 1, then the organ
   ------------------------------------------- */
let ORGAN_OVERRIDE=null; let AP_OVERRIDE=null;
function organsFor(diff){ return ORGAN_OVERRIDE || ORGAN_SETS[diff] || ORGAN_SETS.normal; }
function branchLen(o){ return ORGANS[o].branch; }

/* how many marches until this invader reaches an organ (for AI + threat sort) */
function distToOrgan(g, iv){
  if(iv.zone==="branch") return iv.step;
  const worst = Math.min(...g.organList.map(branchLen));
  if(iv.zone==="hub") return 1 + worst;
  return iv.step + 1 + worst;
}

/* pick an organ at the hub, honouring tropism + which organs are in play */
function rollOrgan(g, iv){
  if(iv.forced && g.organs[iv.forced]) return iv.forced;   // amoebiasis always makes a LIVER abscess
  let list = TROPISM[iv.disease];
  if(list==="any" || !list) list = g.organList.slice();
  else list = list.filter(o=>g.organList.includes(o));
  if(!list.length) list = g.organList.slice();   // its true target isn't in play at this difficulty
  // hepatic portal vein: anything from the gut drains through the liver first
  if(iv.lane==="gut" && list.includes("liver")) return "liver";
  return list[Math.floor(Math.random()*list.length)];
}

/* Build a new invader from a card and PLACE it (worms burrow toward their organ by difficulty;
   everything else enters at its route). Shared by the infection draw and the Force tool so a
   forced worm behaves exactly like a real one. */
/* --- worm caps: may another worm arrive right now? --- */
function wormAllowed(g){
  return (g.wormsSpawned||0) < WORM_MAX_PER_GAME && (g.wormsThisTurn||0) < WORM_MAX_PER_TURN;
}
function noteWorm(g){ g.wormsSpawned=(g.wormsSpawned||0)+1; g.wormsThisTurn=(g.wormsThisTurn||0)+1; }
/* Take a drawn card and, if it is a worm we are not allowed to spawn, swap it for the next
   non-worm card in the deck. Returns the card actually used (never null). */
function respectWormCap(g, c){
  if(!c || c.type!=="worm" || wormAllowed(g)) return c;
  // Pull the first NON-worm out of the deck (searching the whole deck, not just the top).
  let i=g.deck.findIndex(x=>x.type!=="worm");
  if(i>=0){ const alt=g.deck.splice(i,1)[0]; g.discard.push(alt); return alt; }
  // Deck exhausted of non-worms: reshuffle the discard and look once more.
  if(g.discard.length){
    g.deck=shuffle(g.discard.splice(0));
    i=g.deck.findIndex(x=>x.type!=="worm");
    if(i>=0){ const alt=g.deck.splice(i,1)[0]; g.discard.push(alt); return alt; }
  }
  return null;   // no non-worm card exists at all: spawn NOTHING. The cap is never broken.
}
function makeInvader(g, c){
  const iv={id:uid(),type:c.type, lane:c.lane, organ:null, tagged:false, disease:c.dz,
            hp:(INV_HP[c.type]||1), maxhp:(INV_HP[c.type]||1), stage:(c.type==="malaria"?"sporozoite":null), age:0, embed:0,
            killsHelper:!!c.killsHelper, hidesInMac:!!c.hidesInMac, blocksLymph:!!c.blocksLymph,
            amnesia:!!c.amnesia, drain:c.drain||0, variant:!!c.variant, forced:c.forced||null,
            novel:!!c.novel};
  if(c.type==="worm"){
    const targ=rollOrgan(g,iv); const L=branchLen(targ);
    const step = g.difficulty==="hard" ? 0 : g.difficulty==="normal" ? Math.max(1,Math.floor(L/2)) : L;
    iv.zone="branch"; iv.organ=targ; iv.step=step;
    if(step===0){ iv.lodged=true; iv.wormClock=WORM_DAMAGE_EVERY; }
  } else {
    iv.zone="route"; iv.step=ROUTES[c.lane].len;
  }
  return iv;
}

/* Force helpers (testing tool). Inject a pathogen by type or by exact card, placed like a real draw. */
function forceInjectType(g, type){
  const card = g.deck.slice().reverse().find(c=>c.type===type)
            || DECK_MASTER.find(c=>c.type===type)
            || {dz:type, type, lane:"bite"};
  const iv=makeInvader(g, card); g.invaders.push(iv); g.everInfected=true; g.seen[card.dz]=true;
  if(card.novel){ g.novelSeen=true; iv.novel=true; }
  pushLog(g,`🧪 Forced <b>${card.dz}</b> into play (testing).`,"big");
  return iv;
}
function forceInjectCard(g, dz){
  const card = (g.deck||[]).find(c=>c.dz===dz) || DECK_MASTER.find(c=>c.dz===dz);
  if(!card) return null;
  const iv=makeInvader(g, card); g.invaders.push(iv); g.everInfected=true; g.seen[card.dz]=true;
  if(card.novel){ g.novelSeen=true; iv.novel=true; }
  pushLog(g,`🧪 Forced <b>${dz}</b> into play (testing).`,"big");
  return iv;
}

function newGame(cfg){
  _uid=0;
  const diff = DIFF[cfg.difficulty]? cfg.difficulty : "normal";
  const organList = organsFor(diff);
  const organs={};
  organList.forEach(o=>{ organs[o]={ key:o, hp:ORGANS[o].integrity, max:ORGANS[o].integrity, clear:0, failed:false }; });
  const g={
    phase:"infection", turn:1, difficulty:diff, apMax:(AP_OVERRIDE||DIFF[diff].ap), ap:(AP_OVERRIDE||DIFF[diff].ap), maxTurn:DIFF[diff].turns,
    flags:Object.assign({},FLAGS,cfg.flags||{}),
    organList, organs,
    cells:{
      macrophage:{zone:"hub",lane:null,organ:null,step:0,freeEngulf:true},
      neutrophil:{zone:"hub",lane:null,organ:null,step:0,alive:true,regenAt:null},
      bcell:{zone:"hub",lane:null,organ:null,step:0},
      tcell:{zone:"hub",lane:null,organ:null,step:0},
      helper:{zone:"hub",lane:null,organ:null,step:0,usedThisTurn:false},
      nk:{zone:"hub",lane:null,organ:null,step:0},
      eosinophil:{zone:"hub",lane:null,organ:null,step:0,alive:true,regenAt:null},   // the anti-parasite specialist
    },
    events:{}, banner:null, warning:null,
    fx:{ capTurns:0, noProduce:false, apMod:0, skipMarch:false },
    wormsSpawned:0, wormsThisTurn:0,   // worm-cap bookkeeping
    suppress:{ neutrophil:0, tcell:0 },
    undo:[],
    residents:{},          // one per organ: patrols ITS OWN branch, never leaves
    presentations:0,       // antigens shown to the adaptive system (dendritic cells / phagocytes)
    complement:0,          // blood proteins: auto-opsonise a bacterium in the bloodstream each turn
    antivenom:(diff==="training"?2:diff==="normal"?1:0),   // supply is scarcer on harder modes — you must order more
    avOrder:0,           // AP invested in procuring another vial
    // TIER B — antibodies are SPECIFIC. One pool per antigen class.
    ab:{ENV:0,NAK:0,EXB:0,ICB:0,TOX:0,EUK:0,X:0},
    made:{ENV:0,NAK:0,EXB:0,ICB:0,TOX:0,EUK:0,X:0},   // produce-count per class -> affinity maturation
    memory:{},        // disease -> true (beaten it, or vaccinated against it)
    vaccine:{},       // disease -> AP invested so far
    seen:{},          // disease -> true (it has appeared at least once)
    clone:0,          // AP invested in finding the clone for the NOVEL antigen
    cloneFound:false,
    novelSeen:false,
    rare:{ armed:Math.random()<0.5, fired:null, seen:{}, malariaLiver:false, killedThisTurn:0 },
    free:{},               // free actions granted by the Helper T-Cell this turn
    antibodies:0, invaders:[],
    deck:shuffle(DECK_MASTER.filter(c=>!c.novel).map(c=>({...c}))), discard:[], drawn:null,   // the novel pathogen is injected, never drawn
    log:[], won:false, lost:null, science:cfg.science!==false,
    stats:{ killedTrunk:0, killedBranch:0, organHits:0, failures:[], arrivals:{virus:0,hidden:0,bacteriaTagged:0,bacteriaUntagged:0}, residentAte:0, gotThrough:{virus:0,hidden:0,bacteriaTagged:0,bacteriaUntagged:0} },
    // MULTIPLAYER (server) fields — inert in single-device HTML play (multiplayer stays false)
    multiplayer: !!cfg.multiplayer,
    players: cfg.players || [],       // list of member pids
    captain: cfg.captain || null,     // the AP captain
    owner: cfg.owner || {},           // { seatKey: pid } — 14 seats
    apBudget: {},                     // per-player AP budget during a turn
    apPool: 0,                        // the turn's total AP (for the UI)
  };
  organList.forEach(o=>{ g.residents[o]={ organ:o, step:0, ate:false }; });  // step 0 = at the organ itself
  if(g.flags.crisisEvents){ scheduleEvents(g); fireTurnStart(g); }
  // THE NOVEL PATHOGEN — guaranteed on Hard, likely on Normal, uncommon in Training
  if(g.flags.tierB){
    const chance = diff==="hard" ? 1.0 : diff==="normal" ? 0.6 : 0.2;
    if(Math.random()<chance){
      const turn = 2 + Math.floor(Math.random()*Math.max(1, Math.floor(g.maxTurn*0.5)));
      g.novelTurn = turn;   // it will break in on this turn
    }
  }
  pushLog(g,`Game start · ${DIFF[diff].ap} AP · ${organList.length} organs. New infections arrive until turn ${g.maxTurn}; then clear the body of every pathogen to win (by turn ${g.maxTurn+GRACE_CLEAR} or the body is lost).`,"big");
  return g;
}
function pushLog(g,msg,kind){ g.log.unshift({t:g.turn,msg,kind:kind||""}); if(g.log.length>60)g.log.pop(); }

/* ---------------- organ effects (read live off organ damage) ---------------- */
const damaged = (g,o) => { const x=g.organs[o]; if(!(x && x.hp < x.max)) return false;
  if(g.difficulty==="hard" && x.compensated) return false;   // scarred but compensated: functional penalty lifted
  return true; };
/* Th17 HELP: a primed Helper T-cell circulating in the BLOOD signals the marrow (IL-17 -> G-CSF)
   to step up granulopoiesis, so a spent Neutrophil comes back sooner. Re-checked every turn, so
   parking the Helper in the bloodstream speeds up a Neutrophil that is ALREADY regenerating. */
function helperInBlood(g){
  if(hivActive(g)) return false;
  if(!helperLicensed(g)) return false;
  return g.cells.helper.zone==="hub";
}
function neutrophilReadyTurn(g){
  const n=g.cells.neutrophil;
  if(n.alive) return null;
  const wait = helperInBlood(g) ? NEUTROPHIL_REGEN_HELPED : NEUTROPHIL_REGEN;
  return (n.spentAt!=null) ? n.spentAt+wait : n.regenAt;
}
function apFor(g){
  let ap=(AP_OVERRIDE||g.apMax);
  // Giardia: it blocks absorption. You eat, but you starve — so you have less energy to spend.
  if(g.flags.specials) ap -= g.invaders.reduce((n,iv)=>n+(iv.drain||0),0);
  if(g.organs.lungs && damaged(g,"lungs")) ap-=1;
  if(g.organs.heart && damaged(g,"heart")) ap-=1;
  if(g.fx) ap+=(g.fx.apMod||0);
  return Math.max(1,ap);
}
function capFam(g,f){ let c=(AB_CAP_FAM_BY_DIFF[g.difficulty]||AB_CAP_FAM); if(g.organs.liver && damaged(g,"liver")) c=Math.min(c,2); if(g.fx && g.fx.capTurns>0) c=Math.min(c,2); return c; }
function abTotal(g){ return FAM_KEYS.concat(["X"]).reduce((n,f)=>n+(g.ab[f]||0),0); }
function hasAb(g,iv){ const f=famOf(iv); return (g.ab[f]||0)>0; }
function rateForFam(g,f){ let r=rateFor(g);
  if(g.difficulty==="training" && (g.made[f]||0)>=AFFINITY_AT) r+=1;   // affinity maturation: Training only
  return r; }
/* Explain the per-class production rate: the net number AND every effect that built it,
   so the UI can show a net value with a boost/penalty cue and reveal the breakdown on demand. */
function productionBreakdown(g,f){
  const effects=[];
  let base;
  if(!g.flags.dendritic){ base=ANTIBODY_RATE; }
  else if(g.difficulty==="hard"){ base=1; }
  else { const p=g.presentations; const tier=PRESENT_TIER_BY_DIFF[g.difficulty]||PRESENT_TIER_BY_DIFF.normal;
         base = p>=tier[2]?3 : p>=tier[1]?2 : 1; }
  let r=base;
  if(helperWith(g,"bcell")){ r+=1; effects.push({label:"Helper T-cell licensing", delta:+1, kind:"boost"}); }
  else if(g.flags.helperT && !hivActive(g) && samePlace(g.cells.helper,g.cells.bcell) && !helperLicensed(g)){
    // The helper is standing with the B-cell but has not been activated yet. A naive helper T-cell
    // can only license a B-cell AFTER a dendritic cell has presented it an antigen — real T-cell priming.
    effects.push({label:"Helper T-cell present but NOT yet primed — no antigen has been presented to it yet", delta:0, kind:"penalty"});
  }
  const capRate = RATE_CAP_BY_DIFF[g.difficulty]||RATE_CAP_BY_DIFF.normal;
  let capped=false;
  if(r>capRate){ effects.push({label:`Rate ceiling (${capRate}/action on this mode)`, delta:capRate-r, kind:"penalty"}); r=capRate; capped=true; }
  if(g.difficulty==="training" && (g.made[f]||0)>=AFFINITY_AT){ r+=1; effects.push({label:"Affinity maturation", delta:+1, kind:"boost"}); }
  let blocked=null;
  if(g.fx && g.fx.noProduce){ blocked="Production is shut down this turn"; }
  // storage cap + any reduction
  const have=g.ab[f]||0, scap=capFam(g,f), baseCap=(AB_CAP_FAM_BY_DIFF[g.difficulty]||AB_CAP_FAM);
  const capReasons=[];
  if(scap<baseCap){ if(g.organs.liver && damaged(g,"liver")) capReasons.push("liver damaged"); if(g.fx&&g.fx.capTurns>0) capReasons.push("a temporary effect"); }
  const net = blocked?0:r;
  return { net, base, effects, capRate, capped, blocked,
           storage:{have, cap:scap, baseCap, capReasons},
           boosted: net>base, reduced: (net<base) || !!blocked };
}
function canProduceFam(g,f){ if(f==="X") return g.cloneFound && g.invaders.some(iv=>iv.novel); return true; }
function memoryHit(g,dz){ return !!g.memory[dz]; }
function capFor(g){ let c=(g.organs.liver && damaged(g,"liver")) ? 2 : ANTIBODY_CAP; if(g.fx && g.fx.capTurns>0) c=Math.min(c,2); return c; }
function helperLicensed(g){ return g.flags.helperT && (!g.flags.dendritic || g.presentations>0); }
function helperWith(g,ck){
  if(hivActive(g)) return false;   // HIV has destroyed your helper T-cells — no licensing at all
  if(!helperLicensed(g)) return false;
  return samePlace(g.cells.helper, g.cells[ck]); }
function rateFor(g){ let base;
  if(!g.flags.dendritic) base=ANTIBODY_RATE;
  else if(g.difficulty==="hard") base=1;   // HARD: antigen presentation does NOT raise output — only the helper-T boost does
  else {
    const p=g.presentations;
    // On TRAINING/NORMAL, antigen presentation ramps antibody output over time.
    const tier = PRESENT_TIER_BY_DIFF[g.difficulty] || PRESENT_TIER_BY_DIFF.normal;
    base = p>=tier[2] ? 3 : p>=tier[1] ? 2 : 1;
  }
  if(helperWith(g,"bcell")) base+=1;    // helper T-cells boost antibody output (contact licensing) — ALL difficulties
  const capRate = RATE_CAP_BY_DIFF[g.difficulty] || RATE_CAP_BY_DIFF.normal;
  return Math.min(base, capRate); }
function present(g,n){ if(!g.flags.dendritic) return; g.presentations+=(n||1); }
function divideOn(g){
  // base threshold on a d6: Training ≤2 (≈33%), Normal ≤3 (50%). Hard handled separately (guaranteed).
  let base = (g.difficulty==="normal") ? 3 : 2;
  if(g.organs.spleen && damaged(g,"spleen")) base = Math.min(6, base+1);   // spleen gone → filtering fails, division worse
  return base;
}
function marrowBroken(g){ return !!(g.organs.marrow && damaged(g,"marrow")); }
function kidneyLeak(g){ return !!(g.organs.kidneys && damaged(g,"kidneys")); }
function brainSlow(g,cell){ return cell.zone==="branch" && cell.organ==="brain"; } // immune privilege: speed 1 inside the brain

/* ---------------- movement ---------------- */
function moveDestinations(g, ck){
  const c=g.cells[ck]; if(ck==="bcell") return [];
  let sp=SPEED[ck];
  // Th2 HELP: a primed Helper T-cell standing WITH the Eosinophil pours out IL-5, which recruits and
  // activates eosinophils — +1 step, but only while the two are on the same spot.
  if(ck==="eosinophil" && helperWith(g,"eosinophil")) sp+=1;
  if(brainSlow(g,c)) sp=1;   // the blood-brain barrier still overrides everything
  const out=[];
  if(c.zone==="hub"){
    // routes: step 1 is the node nearest the bloodstream
    ROUTE_KEYS.forEach(l=>{ for(let s=1;s<=Math.min(sp,ROUTES[l].len);s++) out.push({zone:"route",lane:l,step:s}); });
    // branches: step L is nearest the bloodstream, step 0 is AT the organ — so leaving the hub means the HIGH steps
    g.organList.forEach(o=>{ const L=branchLen(o);
      for(let k=0;k<sp;k++){ const st=L-k; if(st>=0) out.push({zone:"branch",organ:o,step:st}); } });
  } else if(c.zone==="route"){
    const L=ROUTES[c.lane].len;
    for(let d=-sp;d<=sp;d++){ if(!d) continue; const ns=c.step+d;
      if(ns===0) out.push({zone:"hub"});
      else if(ns>=1 && ns<=L) out.push({zone:"route",lane:c.lane,step:ns}); }
  } else if(c.zone==="branch"){
    const L=branchLen(c.organ);
    for(let d=-sp;d<=sp;d++){ if(!d) continue; const ns=c.step+d;
      if(ns>L) out.push({zone:"hub"});                                   // past the top of the branch = back into the blood
      else if(ns>=0 && ns<=L) out.push({zone:"branch",organ:c.organ,step:ns}); }  // step 0 = standing AT the organ
  }
  // lymphatic crossing: the paired routes are CONNECTED (nose<->gut mucosal, bite<->wound skin).
  // Crossing is not a separate action — it just uses 1 of the cell's movement. So a fast cell
  // (speed 2) can cross to the paired node AND continue up to (sp-1) more steps in that lane.
  if(g.flags.lymph && !lymphBlocked(g) && c.zone==="route" && c.step===LYMPH_STEP){
    lymphPartners(c.lane).forEach(to=>{
      const L=ROUTES[to].len;
      // the crossing itself = 1 step (lands on the paired node)
      out.push({zone:"route",lane:to,step:LYMPH_STEP,lymph:true});
      // remaining movement carries into the destination lane, up to sp-1 further steps either way
      for(let extra=1; extra<=sp-1; extra++){
        [LYMPH_STEP-extra, LYMPH_STEP+extra].forEach(ns=>{
          if(ns>=1 && ns<=L) out.push({zone:"route",lane:to,step:ns,lymph:true});
          if(ns===0) out.push({zone:"hub",lymph:true});   // continued all the way to the bloodstream
        });
      }
    });
  }
  // dedupe hub entries
  const seen=new Set(); return out.filter(d=>{ const k=d.zone+":"+(d.lane||d.organ||"")+":"+(d.step||0); if(seen.has(k))return false; seen.add(k); return true; });
}
const samePlace=(a,b)=> a.zone===b.zone && (a.zone==="hub" || (a.zone==="route"? (a.lane===b.lane && a.step===b.step) : (a.organ===b.organ && a.step===b.step)));
function invadersWith(g, pos){ return g.invaders.filter(iv=>samePlace(iv,pos)); }
function attackable(iv){ return !(HUB_SAFE && iv.zone==="hub"); }

// ---- SHARED RULE QUERIES (single source of truth for every UI) ----
// how many matching-class antibodies you hold for this invader
function abMatch(g, iv){ const f=famOf(iv); if(f==="X" && !g.cloneFound) return 0; return (g.ab && g.ab[f])||0; }
// can the B-Cell's antibodies NEUTRALISE this invader right now?
function canNeutralise(g, iv){
  if(iv.ade) return false;
  if(iv.type==="venom") return false;          // venom acts far too fast for antibodies — ANTIVENOM only
  if(iv.type==="malaria" && iv.stage==="liver") return false;
  if(iv.inMac) return false;
  if(!attackable(iv)) return false;
  const kind = iv.type==="virus"||iv.type==="toxin"||(iv.type==="malaria"&&(iv.stage==="blood"||iv.stage==="sporozoite"));
  return kind && abMatch(g,iv)>=1;
}
// can antibodies TAG/COAT this invader right now?
function canTag(g, iv){
  const kind = (iv.type==="bacteria"||iv.type==="worm"||iv.type==="parasite") && !iv.tagged;
  if(!kind) return false;
  if(iv.inMac) return false;
  if(!attackable(iv)) return false;
  return abMatch(g,iv)>=1;
}
function anyNeutralisable(g){ return (g.invaders||[]).some(iv=>canNeutralise(g,iv)); }
function anyTaggable(g){ return (g.invaders||[]).some(iv=>canTag(g,iv)); }
function macrophageEatable(g){ const m=g.cells.macrophage;
  return invadersWith(g,m).filter(iv=>attackable(iv) && (
    iv.type==="virus" || (iv.type==="bacteria"&&iv.tagged) ||
    (iv.type==="malaria"&&(iv.stage==="blood"||iv.stage==="sporozoite")) ||
    (iv.type==="parasite"&&iv.tagged&&!iv.inMac&&iv.hp<=1) ||   // a protozoan can only be swallowed once struck down to its last HP
    iv.type==="fungus"                                   // chips it (HP 2) — a NET kills it outright
  )); }
const SNIPE_RANGE_BY_DIFF = { training:3, normal:2, hard:2 };   // Killer-T reach shrinks on the harder modes
function snipeTargets(g){ const t=g.cells.tcell;
  const R=(SNIPE_RANGE_BY_DIFF[g.difficulty]||SNIPE_RANGE) + (helperWith(g,"tcell")?1:0);
  return g.invaders.filter(iv=>{ if(!(iv.type==="hidden"||iv.inMac||(iv.type==="malaria"&&iv.stage==="liver"))||!attackable(iv)) return false;
    // From the BLOODSTREAM hub the Killer T can reach into ANY adjacent tissue within range.
    // The hub is distance 0; a germ at route/branch step S is S steps away.
    if(t.zone==="hub"){
      if(iv.zone==="hub") return true;
      if(iv.zone==="route")  return iv.step<=R;     // step counts down to the hub, so step = distance
      if(iv.zone==="branch") return iv.step<=R;
      return false;
    }
    // Otherwise the T-cell and target must share the same tissue, within range.
    if(t.zone!==iv.zone){
      // a T-cell in a route/branch can also snipe into the hub if the hub is within range
      if(iv.zone==="hub") return t.step<=R;
      return false;
    }
    if(t.zone==="route" && iv.lane!==t.lane) return false;
    if(t.zone==="branch" && iv.organ!==t.organ) return false;
    return Math.abs(iv.step-t.step)<=R; }); }

/* ---------------- actions ---------------- */
const ok=()=>({ok:true}); const err=m=>({ok:false,error:m});
/* ---------------- AP: shared pool (single-device) OR per-player budgets (multiplayer) ----------------
   In single-device HTML play, AP is one shared pool: g.ap. In multiplayer, the captain allocates the
   pool into per-player budgets (g.apBudget[pid]) during an ALLOCATION phase; each player then spends
   only their own budget. Any AP the captain leaves unallocated stays in g.apBudget[captainPid].
   The functions below are the single choke points so the rest of the engine is agnostic. */
function apOwnerOf(g, a){
  // which player's budget an action draws from. The server passes a.pid (the acting member).
  return (g.multiplayer && a && a.pid) ? a.pid : null;
}
function apAvail(g, pid){
  if(!g.multiplayer) return g.ap;
  return (g.apBudget && g.apBudget[pid]) ? g.apBudget[pid] : 0;
}
function spendAP(g, pid, n){
  n = n||1;
  if(!g.multiplayer){ g.ap -= n; return; }
  g.apBudget[pid] = Math.max(0, (g.apBudget[pid]||0) - n);
}
function spend(g,ck){ if(ck && g.free && g.free[ck]>0){ g.free[ck]--; return; } spendAP(g, g._actingPid, 1); }
function hasFree(g,ck){ return !!(g.free && g.free[ck]>0); }
function apNow(g){ return g.multiplayer ? apAvail(g, g._actingPid) : g.ap; }   // AP available to the current actor
function canAct(g,ck){ return apNow(g)>0 || hasFree(g,ck); }
function pushUndo(g){
  const snap={ inv:clone(g.invaders), cells:clone(g.cells), residents:clone(g.residents),
    ap:g.ap, antibodies:g.antibodies, ab:clone(g.ab), made:clone(g.made), memory:clone(g.memory), vaccine:clone(g.vaccine), clone:g.clone, cloneFound:g.cloneFound, presentations:g.presentations, free:clone(g.free||{}),
    organs:clone(g.organs), log:clone(g.log) };
  g.undo=g.undo||[]; g.undo.push(snap); if(g.undo.length>60) g.undo.shift();
}
function undo(g){
  if(!g.undo||!g.undo.length) return err("Nothing to undo.");
  const u=g.undo.pop();
  g.invaders=u.inv; g.cells=u.cells; g.residents=u.residents; g.ap=u.ap;
  g.antibodies=u.antibodies; g.ab=u.ab; g.made=u.made; g.memory=u.memory; g.vaccine=u.vaccine; g.clone=u.clone; g.cloneFound=u.cloneFound; g.presentations=u.presentations; g.free=u.free;
  g.organs=u.organs; g.log=u.log;
  return ok();
}
const UNDOABLE=new Set(["move","recall","hop","produce","neutralise","tag","engulf","snipe","net","nkkill","resmove","resengulf"]);
function applyAction(g,a){
  if(g.won||g.lost) return err("Game over.");
  g._actingPid = a.pid || null;   // whose AP budget this action draws from (multiplayer)
  if(a.action==="undo") return undo(g);

  // ---- MULTIPLAYER: allocation-phase actions (captain distributes AP per player) ----
  if(g.multiplayer){
    if(a.action==="allocateAP"){
      if(g.phase!=="allocation") return err("Allocation is only during the allocation phase.");
      if(a.pid!==g.captain) return err("Only the captain allocates Action Points.");
      const to=a.toPid, amt=Math.max(0, a.amount|0);
      if(!g.players || !g.players.includes(to)) return err("Unknown player.");
      const pool=g.apBudget[g.captain]||0;   // unallocated AP sits in the captain's budget
      if(amt>pool) return err("Not enough unallocated AP.");
      g.apBudget[g.captain]=pool-amt;
      g.apBudget[to]=(g.apBudget[to]||0)+amt;
      return ok();
    }
    if(a.action==="returnAP"){
      // any player may hand AP back to the captain's (unallocated) pool during allocation
      if(g.phase!=="allocation") return err("You can only return AP during the allocation phase.");
      const from=a.pid, amt=Math.max(0, a.amount|0);
      if((g.apBudget[from]||0)<amt) return err("You don't have that much AP to return.");
      if(from===g.captain) return err("The captain's AP is already the unallocated pool.");
      g.apBudget[from]-=amt; g.apBudget[g.captain]=(g.apBudget[g.captain]||0)+amt;
      return ok();
    }
    if(a.action==="confirmAllocation"){
      if(g.phase!=="allocation") return err("Not in the allocation phase.");
      if(a.pid!==g.captain) return err("Only the captain can confirm allocation.");
      g.phase="command";   // leftover AP stays in the captain's budget, usable only on the captain's own seats
      pushLog(g,`<b>Captain confirmed the plan.</b> Each player may now spend their allocated Action Points.`,"big");
      return ok();
    }
  }

  if(g.phase==="command" && UNDOABLE.has(a.action)) pushUndo(g);
  if(a.action==="beginCommand") g.undo=[];
  switch(a.action){
    case "draw": {
      if(g.multiplayer && a.pid!==g.captain) return err("Only the captain draws the next infection.");
      if(g.phase!=="infection"||g.drawn) return err("Not ready to draw.");
      let nSpawn=spawnCount(g);
      if(g.turn>g.maxTurn) nSpawn=0;   // after the onslaught window, no NEW infections arrive
      // POST-WINDOW: no spawns. If the body is already clear, that is a win right now. Otherwise mark
      // the draw done (sentinel) so the player can still enter command phase and mop up.
      if(nSpawn===0 && g.turn>g.maxTurn){
        if(g.everInfected && g.invaders.length===0){
          g.won=true; pushLog(g,`Every infection faced and the body is completely clear — you win!`,"good");
          return {ok:true, frames:[{label:"Victory",dice:null,view:viewState(g)}]};
        }
        g.drawn={dz:"(mop-up)",__sentinel:true}; g.drawnList=[];
        return ok();
      }
      g.drawnList=[];
      // the novel pathogen breaks in on its scheduled turn, on top of the normal spawns
      if(g.flags.tierB && g.novelTurn===g.turn && !g.novelSeen){
        const c=DECK_MASTER.find(x=>x.novel);
        if(c){
          const nv=makeInvader(g,c); nv.novel=true; g.invaders.push(nv);
          g.novelSeen=true; g.seen[c.dz]=true; g.drawn=c;
          pushLog(g,`<b>⚠ A PATHOGEN NOBODY HAS EVER SEEN.</b> Your antibodies do not fit it — not one of them. Your innate cells (Monocyte, Neutrophil, NK) still work and must hold the line, while your B-Cells search millions of receptors for the ONE clone that matches. <i>This is what a new pandemic feels like from inside a body.</i>`,"bad");
        }
      }
      // If a fresh infection could no longer reach an organ before the game ends, it breaks
      // straight into the blood instead (bacteraemia / sepsis) — so the endgame still matters.
      for(let k=0;k<nSpawn;k++){
        let c;
        const known=Object.keys(g.seen);
        if(g.turn<=g.maxTurn && known.length && Math.random()<REINFECT_PC){
          const pool=known.filter(dz=>dz!=="Pathogen X");
          if(pool.length){ const dz=pool[Math.floor(Math.random()*pool.length)];
            c=DECK_MASTER.find(x=>x.dz===dz) || null; }
        }
        if(!c){ if(!g.deck.length) g.deck=shuffle(g.discard.splice(0));
          c=g.deck.pop(); g.discard.push(c); }
        c=respectWormCap(g, c);                       // at most 1 worm a turn, 2 a game
        if(!c) continue;                              // capped and nothing else to send: quiet slot
        const iv=makeInvader(g, c);
        if(iv.type==="worm") noteWorm(g);
        const entryMsg = c.type==="worm"
          ? `<b>${c.dz}</b> entered via the ${ROUTES[c.lane].name} and is burrowing into the ${ORGANS[iv.organ].name}. Coat it, then the Eosinophil strikes.`
          : `Infection: <b>${c.dz}</b> entered via the ${ROUTES[c.lane].name}.`;
        g.invaders.push(iv); g.everInfected=true;
        if(k===0) g.drawn=c; g.drawnList.push(c);
        g.seen[c.dz]=true;
        if(c.novel){ g.novelSeen=true; iv.novel=true; }
        pushLog(g,entryMsg,"big");
        // SECONDARY RESPONSE — memory is DISEASE-SPECIFIC. It does not fill the shared class pool
        // (that would let you spend it on any pathogen of the class). Instead it marks THIS pathogen
        // as one your body already knows how to destroy: acting on it is free (Training/Normal) or
        // cheap (Hard). Memory is specific to the disease, exactly as real immunity is.
        if(memoryHit(g,c.dz)){
          iv.remembered=true;
          const costTxt = g.difficulty==="hard"
            ? "Destroying it costs just <b>1 Action Point</b> and no antibody — the fast secondary response."
            : "Destroying it is <b>free</b> — memory cells handle it at once.";
          pushLog(g,`<b>MEMORY RESPONSE.</b> Your body has met ${c.dz} before, so memory cells recognise it instantly. ${costTxt} <i>This is why you only get chickenpox once — and it works only on ${c.dz}, not on other germs of the same type.</i>`,"good");
        }
      }
      // every slot may have been skipped by the worm cap — the turn must still be playable
      if(!g.drawn) g.drawn={dz:"(no new infection)",__sentinel:true};
      return ok(); }
    case "beginCommand": {
      if(g.multiplayer && a.pid!==g.captain) return err("Only the captain begins the command phase.");
      if(g.phase!=="infection"||!g.drawn) return err("Draw first.");
      const pool=apFor(g);
      if(g.multiplayer){
        // enter the ALLOCATION phase: the whole pool starts in the captain's budget; the captain
        // hands it out per player, players may return AP, then the captain confirms → command.
        g.phase="allocation";
        g.apBudget={}; g.players.forEach(pid=>g.apBudget[pid]=0);
        g.apBudget[g.captain]=pool;
        g.apPool=pool;   // remember the turn's total for the UI
        pushLog(g,`<b>Allocation phase.</b> Captain has ${pool} Action Point${pool===1?"":"s"} to distribute for this turn.`,"big");
        return ok();
      }
      g.phase="command"; g.ap=pool; return ok(); }
    case "endCommand": {
      if(g.multiplayer && a.pid!==g.captain) return err("Only the captain ends the turn.");
      if(g.phase!=="command") return err("Not in command."); return {ok:true, frames:resolveSpread(g)}; }
  }
  if(g.phase!=="command") return err("Wait for command phase.");
  const ck=a.cell;
  if(g.suppress){
    if((ck==="neutrophil"||a.action==="net") && g.suppress.neutrophil>0) return err("Neutrophil is offline (neutropenia).");
    if((ck==="tcell"||a.action==="snipe") && g.suppress.tcell>0) return err("Killer T-Cell is offline (lymphopenia).");
  }
  const freeNow = a.action==="engulf" && g.cells.macrophage.freeEngulf && macrophageEatable(g).some(x=>x.id===a.invaderId);
  const resFree = a.action==="resengulf" && g.residents[a.organ] && !g.residents[a.organ].ate;
  if(apNow(g)<=0 && !freeNow && !resFree && !hasFree(g,ck)) return err("No Action Points.");

  switch(a.action){
    case "move": {
      if(ck==="bcell") return err("B-Cell is stationary.");
      if(ck==="neutrophil" && !g.cells.neutrophil.alive) return err("The Neutrophil is spent — it is regenerating in the bone marrow and cannot act yet.");
      if(ck==="eosinophil" && !g.cells.eosinophil.alive) return err("The Eosinophil is spent — it degranulated and is regenerating.");
      const d=moveDestinations(g,ck).find(x=> x.zone===a.zone && (a.zone==="hub" || (a.zone==="route"? (x.lane===a.lane&&x.step===a.step) : (x.organ===a.organ&&x.step===a.step))));
      if(!d) return err("Illegal move.");
      const c=g.cells[ck];
      c.zone=d.zone; c.lane=d.lane||null; c.organ=d.organ||null; c.step=d.step||0;
      spend(g,ck); pushLog(g,`<b>${cname(ck)}</b> moved to ${placeName(d)}.`); return ok(); }
    case "hop": {   // LYMPHATIC SYSTEM — slide to the paired route, keeping your depth
      if(!g.flags.lymph) return err("Lymphatics are off.");
      if(lymphBlocked(g)) return err("The lymphatic vessels are BLOCKED by filarial worms — nothing can pass. (This is what causes elephantiasis.)");
      if(ck==="bcell") return err("B-Cell is stationary.");
      const c=g.cells[ck];
      if(c.zone==="route" && !LYMPH_GROUP[c.lane]) return err("The Blood route has NO lymphatic link — a needle goes straight into the bloodstream, bypassing the tissues entirely. That is exactly why it is so dangerous.");
      if(c.zone!=="route" || c.step!==LYMPH_STEP) return err(`The lymphatic crossing is at step ${LYMPH_STEP} of a route.`);
      const opts=lymphPartners(c.lane);
      const to = (a.lane && opts.includes(a.lane)) ? a.lane : opts[0];
      if(!to) return err("No lymphatic link from this route.");
      const from=c.lane; c.lane=to; spend(g,ck);
      pushLog(g,`<b>${cname(ck)}</b> took the lymphatic shortcut ${ROUTES[from].name} → ${ROUTES[to].name}.`); return ok(); }
    case "recall": {
      if(ck==="bcell") return err("B-Cell is stationary.");
      if(ck==="neutrophil" && !g.cells.neutrophil.alive) return err("The Neutrophil is regenerating and cannot act yet.");
      if(ck==="eosinophil" && !g.cells.eosinophil.alive) return err("The Eosinophil is regenerating and cannot act yet.");
      const c=g.cells[ck]; if(c.zone==="hub") return err("Already at the bloodstream hub.");
      c.zone="hub"; c.lane=null; c.organ=null; c.step=0; spend(g,ck);
      pushLog(g,`<b>${cname(ck)}</b> recalled to the bloodstream.`); return ok(); }
    case "produce": {
      if(g.fx && g.fx.noProduce) return err("No antibodies can be made this turn (immunosuppression).");
      const f=a.family;
      if(!f || (!FAM_KEYS.includes(f) && f!=="X")) return err("Choose which antigen class to make antibodies against.");
      if(!canProduceFam(g,f)) return err("You have not found the matching B-cell clone for this new antigen yet. Use CLONAL SELECTION first.");
      const cap=capFam(g,f);
      if((g.ab[f]||0)>=cap) return err(`Your ${f} antibody store is full (${cap}).`);
      const made=Math.min(rateForFam(g,f), cap-(g.ab[f]||0));
      g.ab[f]=(g.ab[f]||0)+made; g.made[f]=(g.made[f]||0)+1; spend(g,"bcell");
      let msg=`<b>B-Cell</b> produced ${made} <b>${f}</b> antibod${made===1?"y":"ies"} (${g.ab[f]}/${cap}).`;
      if(g.made[f]===AFFINITY_AT) msg+=` <b>AFFINITY MATURATION</b> — repeated practice against ${f} has improved your antibodies. You now make one extra per action.`;
      pushLog(g,msg,"good");
      return ok(); }

    case "clonalSelection": {   // find the ONE B-cell clone that fits a brand-new antigen
      if(!g.novelSeen) return err("There is no unknown antigen to search for.");
      if(g.cloneFound) return err("You have already found the clone.");
      if(apNow(g)<1) return err("No Action Points.");
      spendAP(g,g._actingPid,1); g.clone++;
      if(g.clone>=CLONE_COST){ g.cloneFound=true;
        pushLog(g,`<b>CLONAL SELECTION COMPLETE.</b> Out of millions of B-cells, you found the ONE whose receptor fits this new antigen — and cloned it. You can now make antibodies against the unknown pathogen. <i>This search is exactly why the first response to a new germ takes days.</i>`,"good");
      } else pushLog(g,`B-Cells searching for a matching clone… ${g.clone}/${CLONE_COST}. Your body is sifting millions of random receptors for one that fits.`);
      return ok(); }

    case "vaccinate": {   // invest as much or as little as you like each turn
      const dz=a.disease;
      if(g.difficulty==="training") return err("On Training, immunity comes from SURVIVING an infection — beat a disease and your body remembers it. Vaccines come into play on Normal and Hard.");
      if(!dz) return err("Pick a disease to develop a vaccine against.");
      if(!g.seen[dz]) return err("You cannot vaccinate against something your body has never seen.");
      if(g.memory[dz]) return err("You are already immune to that.");
      const put=Math.max(1, Math.min(a.ap||1, apNow(g)));
      if(apNow(g)<1) return err("No Action Points.");
      spendAP(g,g._actingPid,put); g.vaccine[dz]=(g.vaccine[dz]||0)+put;
      if(g.vaccine[dz]>=VACCINE_COST){
        g.memory[dz]=true;
        pushLog(g,`<b>VACCINE COMPLETE — ${dz}.</b> You now have memory cells for it WITHOUT ever having been ill. If it appears, your response will be immediate. <i>This is what a vaccine actually is: memory without the disease.</i>`,"good");
      } else {
        pushLog(g,`Vaccine development — ${dz}: ${g.vaccine[dz]}/${VACCINE_COST} AP invested.`);
      }
      return ok(); }

    case "neutralise": {
      const iv=g.invaders.find(x=>x.id===a.invaderId); if(!iv) return err("No target.");
      if(iv.type==="venom") return err("Antibodies can't neutralise venom — it acts far too fast for your B-cells to respond. You need ANTIVENOM (a dose you have, or one you order).");
      if(iv.ade) return err("Your antibodies do not neutralise this dengue serotype — they HELP it into your cells (ADE). Use the Monocyte, Neutrophil or NK Cell.");
      const ok2 = iv.type==="virus" || iv.type==="toxin" || (iv.type==="malaria"&&(iv.stage==="blood"||iv.stage==="sporozoite"));
      if(!ok2) return err("Antibodies cannot neutralise that.");
      if(iv.type==="malaria"&&iv.stage==="liver") return err("It is hiding inside liver cells — antibodies cannot reach it.");
      if(iv.inMac) return err("It is living INSIDE your own macrophage — antibodies cannot reach inside your cells. A Killer T-Cell must activate the infected cell to destroy it.");
      const f=famOf(iv);
      if(f==="X" && !g.cloneFound) return err("This antigen is BRAND NEW — no antibody you own fits it. Run CLONAL SELECTION to find the matching B-cell clone.");
      if((g.ab[f]||0)<1) return err(`You have no ${f} antibodies. Antibodies are SPECIFIC — an antibody for another class will not fit ${iv.disease}.`);
      const apCost = iv.type==="toxin" ? 2 : 1;   // neutralising a toxin (antitoxin) is harder — 2 AP
      const wasRemembered = memoryHit(g,iv.disease);   // capture BEFORE killInvader plants a fresh memory cell
      if(!wasRemembered && apNow(g)<apCost) return err(`Neutralising a toxin takes ${apCost} Action Points.`);
      if(iv.variant && d6()<=3){ g.ab[f]--; spendAP(g,g._actingPid,apCost);
        pushLog(g,`<b>${iv.disease}</b> changed its coat — your antibody no longer fits. (Antigenic variation: this is why it has no vaccine.)`,"bad"); return ok(); }
      g.ab[f]-=1; killInvader(g,iv,"antibody");
      if(wasRemembered) pushLog(g,`Memory antibodies destroyed ${iv.disease} instantly — no Action Point spent.`,"good");
      else spendAP(g,g._actingPid,apCost);
      pushLog(g,`<b>${f}</b> antibody <b>neutralised</b> ${iv.disease}${apCost>1?` (${apCost} AP)`:""}.`,"good"); return ok(); }
    case "antivenom": {   // PASSIVE IMMUNITY — antibodies made in horses, injected. Instant, borrowed, limited.
      const iv=antivenomTargets(g).find(x=>x.id===a.invaderId); if(!iv) return err("No venom in the body.");
      if(g.antivenom<=0) return err("No antivenom left.");
      if(apNow(g)<3) return err("Antivenom costs 3 AP.");
      g.antivenom--; spendAP(g,g._actingPid,3); killInvader(g,iv,"antivenom");
      pushLog(g,`<b>Antivenom</b> given — ${iv.disease} neutralised instantly. These are borrowed antibodies (made in horses): fast, but they do not last and your body learns nothing. ${g.antivenom} dose(s) left.`,"good");
      return ok(); }
    case "orderAntivenom": {   // getting antivenom to the patient in time is a real problem in rural India
      const put=Math.max(1, Math.min(a.ap||1, apNow(g)));
      if(apNow(g)<1) return err("No Action Points.");
      spendAP(g,g._actingPid,put); g.avOrder=(g.avOrder||0)+put;
      if(g.avOrder>=ANTIVENOM_ORDER){
        g.avOrder=0; g.antivenom++;
        pushLog(g,`<b>Antivenom delivered</b> — one more vial (${g.antivenom} in stock). Your body cannot make this: it is antibodies raised in horses, and it has to be <i>brought to you</i>. Antivenom shortages are a real and deadly problem in rural India.`,"good");
      } else pushLog(g,`Ordering antivenom… ${g.avOrder}/${ANTIVENOM_ORDER} AP.`);
      return ok(); }

    case "strike": {   // attack a COATED worm or parasite from the outside — too big to swallow
      const iv=g.invaders.find(x=>x.id===a.invaderId);
      if(!iv || !(iv.type==="worm"||iv.type==="parasite")) return err("Strike is for worms and protozoan parasites — the EUK targets too big to simply engulf.");
      if(ck==="eosinophil" && !g.cells.eosinophil.alive) return err("The Eosinophil is spent — it degranulated and is regenerating.");
      if(!iv.tagged) return err("Coat it with an antibody first — cells cannot grip an uncoated parasite.");
      if(!samePlace(iv,g.cells[ck])) return err("Move onto the target first.");
      if(!["macrophage","eosinophil"].includes(ck)) return err("Only the Eosinophil (2 damage) and the Monocyte (1 damage) can strike a worm or parasite from the outside — the Neutrophil and NK Cell cannot.");
      const dmg = ck==="eosinophil" ? 2 : 1;   // the eosinophil is the specialist — double damage
      const died=hurtInvader(g,iv,dmg,ck);
      // A targeted strike releases only a few granules — it does NOT wound the organ.
      // Only a full DEGRANULATION dumps enough toxic payload to scorch the surrounding tissue.
      spend(g,ck);
      pushLog(g, died? `<b>${cname(ck)}</b> killed the ${iv.disease}.` : `<b>${cname(ck)}</b> struck the ${iv.disease} for ${dmg} — ${iv.hp}/${iv.maxhp} left.`, died?"good":"");
      return ok(); }
    case "degranulate": {   // the eosinophil dumps ALL its granules: 3 damage, then it is spent
      const iv=g.invaders.find(x=>x.id===a.invaderId);
      if(!iv || !(iv.type==="worm"||iv.type==="parasite")) return err("Degranulate is for a worm or parasite.");
      const e=g.cells.eosinophil;
      if(!e.alive) return err("The Eosinophil already degranulated — it is regenerating.");
      if(!iv.tagged) return err("Coat it with an antibody first.");
      if(!samePlace(iv,e)) return err("Move the Eosinophil onto the target first.");
      if(apNow(g)<2) return err("Degranulate takes 2 Action Points — it's the eosinophil's whole payload.");
      const died=hurtInvader(g,iv,3,"eosinophil");   // 3 damage kills even a 3-HP worm in one turn
      if(iv.zone==="branch" && g.organs[iv.organ]){
        const org=g.organs[iv.organ]; org.hp=Math.max(0,org.hp-1); org.clear=0;
        pushLog(g,`The granule blast also burned the <b>${ORGANS[iv.organ].name}</b> — integrity ${org.hp}/${org.max}.`,"bad");
      }
      e.alive=false; e.regenAt=g.turn+EOSINOPHIL_REGEN; e.zone="hub"; e.lane=null; e.organ=null; e.step=0;
      spendAP(g,g._actingPid,2);
      pushLog(g, `<b>Eosinophil DEGRANULATED</b> — a full toxic payload for 3 damage (2 AP). ${died?`The ${iv.disease} is destroyed.`:`${iv.disease} at ${iv.hp}/${iv.maxhp}.`} The cell is spent and regenerates on turn ${e.regenAt}. <i>This is how eosinophils really kill worms — and why parasites cause tissue damage.</i>`, "good");
      return ok(); }
    case "tag": {
      const iv=g.invaders.find(x=>x.id===a.invaderId);
      if(!iv || iv.tagged || !(iv.type==="bacteria"||iv.type==="worm"||iv.type==="parasite")) return err("Pick an untagged bacterium, worm or parasite.");
      if(!attackable(iv)) return err("Cannot reach it in the bloodstream.");
      if(iv.inMac) return err("It is hiding INSIDE your own macrophage — an antibody cannot get in there.");
      const f=famOf(iv);
      if(f==="X" && !g.cloneFound) return err("Brand-new antigen — no antibody fits it yet. Run CLONAL SELECTION first.");
      if((g.ab[f]||0)<=0) return err(`You have no ${f} antibodies. Antibodies are SPECIFIC — the wrong class will not stick to ${iv.disease}.`);
      g.ab[f]--; iv.tagged=true;
      if(memoryHit(g,iv.disease)) pushLog(g,`Memory antibodies coated ${iv.disease} instantly — free.`,"good"); else spend(g,"bcell");
      pushLog(g, iv.type==="worm"
        ? `Antibodies <b>coated</b> the ${iv.disease}. Cells can now grip it — the Eosinophil hits hardest.`
        : `Antibody <b>tagged</b> ${iv.disease}.`, "good"); return ok(); }
    case "engulf": {
      const iv=macrophageEatable(g).find(x=>x.id===a.invaderId); if(!iv) return err("Nothing edible here.");
      let died=true;
      if(iv.type==="fungus"||iv.type==="parasite") died=hurtInvader(g,iv,1,"macrophage");
      else killInvader(g,iv,"macrophage");
      present(g,1);
      if(g.cells.macrophage.freeEngulf) g.cells.macrophage.freeEngulf=false; else spend(g,"macrophage");
      pushLog(g, died ? `<b>Monocyte</b> engulfed ${iv.disease}.`
        : `<b>Monocyte</b> chipped the ${iv.disease} — ${iv.hp}/${iv.maxhp} left. Fungi are tough; a Neutrophil NET kills them outright.`, "good");
      return ok(); }
    case "memoryKill": {
      const iv=g.invaders.find(x=>x.id===a.invaderId);
      if(!iv) return err("No such pathogen.");
      if(!iv.remembered) return err("Your body has no memory of this one yet — you must beat it the hard way first.");
      if(!attackable(iv)) return err("Cannot reach it in the bloodstream yet.");
      // Hard: the secondary response is fast but still costs 1 AP. Training/Normal: free.
      if(g.difficulty==="hard"){ if(apNow(g)<1) return err("Need 1 Action Point for the memory response on Hard."); spendAP(g,g._actingPid,1); }
      killInvader(g,iv,"memory");
      pushLog(g,`<b>Memory response</b> destroyed ${iv.disease} — recognised and cleared at once.${g.difficulty==="hard"?" (1 AP)":" (free)"}`,"good");
      return ok(); }
    case "snipe": {
      const iv=snipeTargets(g).find(x=>x.id===a.invaderId); if(!iv) return err("No hidden virus in range.");
      killInvader(g,iv,"tcell"); spend(g,"tcell");
      pushLog(g,`<b>Killer T-Cell</b> sniped hidden ${iv.disease}.`,"good"); return ok(); }
    case "net": {
      const n=g.cells.neutrophil; if(!n.alive) return err("Neutrophil regenerating.");
      if(n.zone==="hub") return err("Move onto a swarm first.");
      const here=netTargets(g);
      if(!here.length) return err("Nothing here a NET can catch — a NET holds living microbes, but toxins and venom are not alive, and worms and protozoa are far too big.");
      here.forEach(iv=>killInvader(g,iv,"net")); present(g,1);
      n.alive=false; n.spentAt=g.turn; n.regenAt=g.turn+NEUTROPHIL_REGEN; n.zone="hub"; n.lane=null; n.organ=null; n.step=0;
      spend(g,"neutrophil"); pushLog(g,`<b>Neutrophil NET</b> cleared ${here.length} invader(s) — spent.`,"good"); return ok(); }
    case "activate": return err("The Helper T-Cell works by contact, not orders — stand it WITH the B-Cell or Killer T-Cell.");
    case "nkkill": {     // NK CELL — innate: fast and needs no antigen, but NOT precise (d6 >= NK_HITS)
      if(!g.flags.nkCell) return err("NK Cell is not in play.");
      const iv=nkTargets(g).find(x=>x.id===a.invaderId); if(!iv) return err("No infected cell within NK range.");
      const roll=d6(); spend(g,"nk"); g.lastRoll={cell:"nk",face:roll,hit:roll>=NK_HITS};
      if(roll>=NK_HITS){ killInvader(g,iv,"nk"); present(g,1);
        pushLog(g,`<b>NK Cell</b> rolled ${roll} — destroyed the infected cell holding ${iv.disease}. Innate: no antigen needed.`,"good"); }
      else pushLog(g,`<b>NK Cell</b> rolled ${roll} — missed. Innate killing is fast but imprecise; the Killer T-Cell never misses.`,"bad");
      return ok(); }
    case "resmove": {    // resident macrophage patrols ITS OWN branch (never leaves the organ)
      if(!g.flags.residentMove) return err("Residents cannot move.");
      const r=g.residents[a.organ]; if(!r) return err("No such organ.");
      const L=branchLen(a.organ), ns=a.step;
      if(ns<0||ns>L) return err("Outside this organ's tissue.");
      if(Math.abs(ns-r.step)!==1) return err("A resident moves one step at a time.");
      r.step=ns; spend(g,"res_"+a.organ);
      pushLog(g,`The <b>${RESIDENT_NAME[a.organ]||"resident macrophage"}</b> moved to ${ORGANS[a.organ].name} ${ns===0?"tissue":"branch "+ns}.`); return ok(); }
    case "resengulf": {  // the resident engulfs one germ where it stands — FREE, once per turn
      const r=g.residents[a.organ]; if(!r) return err("No such organ.");
      if(r.infectedBy) return err("This resident has a parasite living inside it — it can't eat anything until you kill the parasite.");
      if(r.ate) return err(`The ${RESIDENT_NAME[a.organ]||"resident"} has already engulfed this turn.`);
      const list=residentEatable(g,a.organ);
      const iv=list.find(x=>x.id===a.invaderId) || list[0];
      if(!iv) return err("Nothing to engulf where it stands — move it onto a virus or a tagged bacterium first.");
      killInvader(g,iv,"resident"); present(g,1); r.ate=true;   // free
      pushLog(g,`<b>${RESIDENT_NAME[a.organ]}</b> engulfed ${iv.disease} in the ${ORGANS[a.organ].name}.`,"good"); return ok(); }
  }
  return err("Unknown action.");
}
function hivActive(g){ return g.flags.specials && g.invaders.some(iv=>iv.killsHelper && iv.zone!=="route"); }
function lymphBlocked(g){ return g.flags.specials && g.invaders.some(iv=>iv.blocksLymph); }
function macDisabled(g,o){ const r=g.residents[o]; return !!(r && r.infectedBy); }
function invSpeed(g,iv){
  const fast = FAST_DISEASE[iv.disease];   // fulminant emergency diseases move faster at all levels
  if(fast) return fast;
  if(iv.ade) return 2;   // antibody-dependent enhancement: your own antibodies help it in
  if(iv.type==="fungus"){ // OPPORTUNISTIC: fast while the body is weakened
    const weak = !g.cells.neutrophil.alive || (g.organs.marrow && damaged(g,"marrow")) || (g.suppress&&g.suppress.neutrophil>0);
    return weak?2:1; }
  return INV_SPEED[iv.type]||1;
}
function hurtInvader(g,iv,dmg,by){
  iv.hp-=dmg;
  if(iv.hp<=0){ killInvader(g,iv,by); return true; }
  return false;
}
function wormStrikeable(g,ck){ const c=g.cells[ck];
  if(ck==="eosinophil" && !g.cells.eosinophil.alive) return [];
  return g.invaders.filter(iv=> (iv.type==="worm"||iv.type==="parasite") && iv.tagged && samePlace(iv,c)); }
function netTargets(g){ const n=g.cells.neutrophil;
  if(!n || !n.alive || n.zone==="hub") return [];
  // A NET is a sticky web of DNA: it traps living microbes it can physically hold.
  // Toxins/venom aren't alive; worms and protozoa are far too big to be held by one.
  return invadersWith(g,n).filter(attackable).filter(iv=>!NOT_ALIVE.has(iv.type) && iv.type!=="worm" && iv.type!=="parasite");
}
function antivenomTargets(g){ return g.invaders.filter(iv=> iv.type==="venom"); }
const RESIDENT_NAME={heart:"Cardiac macrophage",lungs:"Alveolar macrophage",liver:"Kupffer cell",brain:"Microglia",marrow:"Marrow macrophage",spleen:"Splenic macrophage",kidneys:"Renal macrophage"};
function nkTargets(g){ const n=g.cells.nk;
  return g.invaders.filter(iv=>{ if(!(iv.type==="hidden"||iv.inMac||(iv.type==="malaria"&&iv.stage==="liver"))) return false;
    if(n.zone==="hub"){                              // from the blood, NK reaches its short range into adjacent tissue
      if(iv.zone==="hub") return true;
      if(iv.zone==="route"||iv.zone==="branch") return iv.step<=NK_RANGE;
      return false;
    }
    if(n.zone!==iv.zone){ if(iv.zone==="hub") return n.step<=NK_RANGE; return false; }
    if(n.zone==="route" && iv.lane!==n.lane) return false;
    if(n.zone==="branch" && iv.organ!==n.organ) return false;
    return Math.abs(iv.step-n.step)<=NK_RANGE; }); }
function residentEatable(g,o){ const r=g.residents[o]; if(!r || r.infectedBy) return [];
  return g.invaders.filter(iv=> iv.zone==="branch" && iv.organ===o && iv.step===r.step
    && (iv.type==="virus" || (iv.type==="bacteria"&&iv.tagged) || (iv.type==="malaria"&&(iv.stage==="blood"||iv.stage==="sporozoite"))) ); }
const CNAME={macrophage:"Monocyte",neutrophil:"Neutrophil",bcell:"B-Cell",tcell:"Killer T-Cell",helper:"Helper T-Cell",nk:"NK Cell"};
function cname(ck){ return CNAME[ck]||cap1(ck); }
function placeName(d){ return d.zone==="hub"?"the bloodstream":(d.zone==="route"? `${ROUTES[d.lane].name} ${d.step}` : (d.step===0? `the ${ORGANS[d.organ].name} itself` : `${ORGANS[d.organ].name} branch ${d.step}`)); }
function killInvader(g,iv,by){
  g.invaders=g.invaders.filter(x=>x.id!==iv.id);
  if(iv.hidesInMac && g.residents){
    for(const o in g.residents){ if(g.residents[o].infectedBy===iv.id){ g.residents[o].infectedBy=null;
      const how = (by==="tcell") ? ` The Killer T-Cell did not kill your macrophage — it <b>switched it on</b>. A T-cell signal (interferon-gamma) orders the infected macrophage to destroy what is living inside it.` : "";
      pushLog(g,`The ${RESIDENT_NAME[o]} is FREE again — the parasite inside it is dead.${how}`,"good"); } }
  }
  if(g.rare){
    g.rare.killedThisTurn=(g.rare.killedThisTurn||0)+1;
    const s2=g.rare.seen;
    if(/Cellulitis/.test(iv.disease) && by==="antibody") s2.strepKilledByAntibody=true;
    // BEATING a pathogen leaves memory cells behind — but only on TRAINING. On Normal/Hard,
    // surviving one infection does NOT pre-arm you; immunity must be EARNED with a vaccine.
    if(g.difficulty==="training" && g.memory && !g.memory[iv.disease] && !g.invaders.some(x=>x.disease===iv.disease)){
      g.memory[iv.disease]=true;
      pushLog(g,`<b>${iv.disease} defeated.</b> Memory cells for it now survive in your body — if it ever returns, your response will be immediate.`,"good");
    }
    if(/Dengue/.test(iv.disease)) s2.dengueKilled=true;
    if(/Chickenpox/.test(iv.disease)) s2.chickenpoxKilled=true;
    if(/Tuberculosis/.test(iv.disease)) s2.tbKilled=true;
  }
  if(iv.zone==="branch"){ g.stats.killedBranch++;
    // DENDRITIC CELL: resident sentinel in the tissue picks up the debris and presents the antigen
    if(g.flags.dendritic && by!=="resident") present(g,1);
  } else g.stats.killedTrunk++;   // trunk = route + hub
}

/* ---------------- spread ---------------- */
function resolveSpread(g){
  g.phase="spread"; const frames=[]; const snap=(label,dice)=>frames.push({label,dice:dice||null,view:viewState(g)});

  // EARLY CLEARANCE CHECK — if the onslaught window has closed and the board is already clear,
  // the body has won before this turn's spread even runs.
  if(g.turn>g.maxTurn && g.everInfected && g.invaders.length===0){
    g.won=true; pushLog(g,`Every infection faced and the body is completely clear — you win!`,"good"); snap("Victory"); return frames;
  }

  // 0) COMPLEMENT — blood proteins continuously coat bacteria in the bloodstream (opsonisation, free)
  if(g.flags.complement){
    const b=g.invaders.find(iv=>iv.type==="bacteria" && !iv.tagged && iv.zone==="hub");
    if(b){ b.tagged=true; pushLog(g,`<b>Complement</b> coated ${b.disease} in the bloodstream — a phagocyte can now eat it.`,"good"); snap("Complement"); }
  }

  // 1) BACTERIA DIVIDE — binary fission, scaled by difficulty.
  //    Training : 1→2 on a d6 ≤2  (≈33% chance to add one copy)
  //    Normal   : 1→2 on a d6 ≤3  (50% chance to add one copy)
  //    Hard     : 1→2 GUARANTEED, plus a 50% chance it is a 1→3 split (adds a second copy)
  //    Coated/tagged bacteria never divide (opsonised — flagged for destruction), so TAG EARLY.
  //    DENSITY CAP: a single tissue space saturates — no more than SPACE_CAP bacteria can pack into one
  //    spot. Real bacterial growth is density-limited (nutrients, quorum, local defences). This keeps a
  //    swarm terrifying but finite instead of doubling to infinity.
  const dOn=divideOn(g);
  const untagged=g.invaders.filter(iv=>iv.type==="bacteria"&&!iv.tagged);
  if(untagged.length){ const dice=[],born=[]; const fullSpaces=new Set();
    // count how many bacteria already occupy each space, so we can stop a saturated space multiplying
    const spaceKey=iv=> iv.zone+":"+(iv.lane||"")+":"+(iv.organ||"")+":"+iv.step;
    const count={}; g.invaders.filter(x=>x.type==="bacteria").forEach(x=>{ const k=spaceKey(x); count[k]=(count[k]||0)+1; });
    untagged.forEach(iv=>{
      const k=spaceKey(iv); const room=()=> (count[k]||0) < SPACE_CAP;
      if(!room()){ dice.push({label:iv.disease,face:0,hit:false,full:true}); fullSpaces.add(k); return; }   // this space is saturated
      if(g.difficulty==="hard"){
        born.push({...clone(iv),id:uid()}); count[k]++;                 // guaranteed one copy
        const r=d6(); const triple=r<=3; dice.push({label:iv.disease,face:r,hit:true});
        if(triple && room()){ born.push({...clone(iv),id:uid()}); count[k]++; }   // a second, if room
      } else {
        const r=d6(),hit=r<=dOn; dice.push({label:iv.disease,face:r,hit});
        if(hit){ born.push({...clone(iv),id:uid()}); count[k]++; }
      }
    });
    if(born.length){ g.invaders.push(...born); pushLog(g,`Bacteria <b>divided</b>: ${born.length} new.`,"bad"); }
    if(fullSpaces.size) pushLog(g,`${fullSpaces.size} crowded spot(s) stopped growing — a single tissue space holds at most <b>${SPACE_CAP}</b> bacteria. <i>Real bacterial growth is density-limited. Note the cap is per SPOT, so the same disease can still build up on several spots at once.</i>`);
    snap("Bacteria divide",dice); }

  // 2) lytic cycle
  const pre=[...g.invaders];
  const hid=pre.filter(iv=>iv.type==="hidden");
  if(hid.length){ const dice=[],burst=new Set(),nv=[];
    let anyEuk=false;
    hid.forEach(iv=>{ const r=d6(),hit=r<=BURST_ON; dice.push({label:iv.disease,face:r,hit});
      if(hit){ burst.add(iv.id);
        // A bursting cell releases whatever was living INSIDE it. For a virus that is new virions;
        // but Toxoplasmosis and Chagas disease are PROTOZOA, so the cell spills tachyzoites /
        // trypomastigotes — parasites, not viruses. They come out damaged from rupturing the cell.
        const euk = famOf(iv)==="EUK";
        if(euk) anyEuk=true;
        for(let k=0;k<2;k++){
          const copy={...clone(iv), id:uid(), type: euk?"parasite":"virus"};
          if(euk){ copy.hp=1; copy.maxhp=2; }   // released protozoa are weakened — one strike finishes them
          nv.push(copy);
        } } });
    if(burst.size){ g.invaders=g.invaders.filter(x=>!burst.has(x.id)); g.invaders.push(...nv);
      pushLog(g,`${burst.size} cell(s) <b>burst</b> — ${nv.length} new ${anyEuk?"organism(s) spilled out":"viruses"}!`,"bad"); }
    snap("Cells burst",dice); }
  const freeV=pre.filter(iv=>iv.type==="virus" && g.invaders.some(x=>x.id===iv.id));
  if(freeV.length){ const dice=[]; let n=0;
    freeV.forEach(iv=>{
      // A NOVEL pathogen (Pathogen X) never converts to a hidden virus: that would let a Killer T-Cell
      // snipe it and skip the clonal-selection → X-antibody story the card exists to teach.
      if(iv.novel) return;
      const r=d6(),hit=r<=INFECT_ON; dice.push({label:iv.disease,face:r,hit});
      if(hit){ const t=g.invaders.find(x=>x.id===iv.id); if(t){ t.type="hidden"; n++; } } });
    if(n) pushLog(g,`${n} virus(es) <b>hid inside a cell</b> — antibodies can no longer touch them. The Killer T-Cell (never misses) or the NK Cell (d6 3+) must kill the infected cell.`,"bad");
    snap("Viruses hide",dice); }

  // 2b) TOXIN EMISSION — a toxin-making bacterium left alive starts poisoning you
  if(g.flags.toxins){
    g.invaders.filter(iv=>iv.type==="bacteria" && !iv.tagged && TOXIN_MAKERS[iv.disease]).forEach(iv=>{
      iv.age=(iv.age||0)+1;
      if(iv.age>=TOXIN_AFTER && !iv.emitted){
        iv.emitted=true;
        const tname=TOXIN_MAKERS[iv.disease];
        g.invaders.push({id:uid(),type:"toxin",zone:iv.zone,lane:iv.lane,organ:iv.organ,step:iv.step,
          tagged:false,disease:tname,hp:1,maxhp:1,stage:null,age:0});
        pushLog(g,`The ${iv.disease} you left alive has started releasing <b>${tname}</b>! A toxin is not alive — only antibodies can neutralise it.`,"bad");
      }
    });
    snap("Toxin released");
  }

  // 2c) MALARIA — hiding inside liver cells, then bursting into the blood
  if(g.flags.malaria){
    const burst=[];
    g.invaders.filter(iv=>iv.type==="malaria" && iv.stage==="liver" && iv.embed>0).forEach(iv=>{
      iv.embed--;
      if(iv.embed<=0) burst.push(iv);
    });
    burst.forEach(iv=>{
      g.invaders=g.invaders.filter(x=>x.id!==iv.id);
      for(let k=0;k<3;k++) g.invaders.push({id:uid(),type:"malaria",stage:"blood",zone:"hub",lane:iv.lane,organ:null,step:0,
        tagged:false,disease:"Malaria (blood)",hp:1,maxhp:1,age:0,embed:0});
      pushLog(g,`<b>Malaria burst out of the liver</b> — 3 blood-stage parasites are now in the bloodstream. NOW antibodies work on them.`,"bad");
    });
    if(burst.length) snap("Malaria bursts");
  }

  // 2d) CHRONIC WORM DAMAGE — every lodged worm chews its organ on a countdown
  {
    const bites=[];
    g.invaders.filter(iv=>iv.type==="worm" && iv.lodged).forEach(iv=>{
      iv.wormClock=(iv.wormClock||WORM_DAMAGE_EVERY)-1;
      if(iv.wormClock<=0){ iv.wormClock=WORM_DAMAGE_EVERY;
        const org=g.organs[iv.organ];
        if(org){ org.hp=Math.max(0,org.hp-1); org.clear=0; g.stats.organHits++; bites.push(iv);
          if(org.hp===0 && !org.failed){ org.failed=true; g.stats.failures.push(iv.organ); }
        }
      }
    });
    bites.forEach(iv=>pushLog(g,`<b>${iv.disease}</b> is still feeding in your ${ORGANS[iv.organ].name} — integrity ${g.organs[iv.organ].hp}/${g.organs[iv.organ].max}. Kill it to stop the bleeding.`,"bad"));
    if(bites.length) snap("Worms feed");
  }

  // 2e) LYMPHATIC SPREAD (HARD ONLY) — pathogens use the lymph system the way your cells do.
  //     A pathogen sitting at the lymph crossing has a chance to seed a COPY into the paired route
  //     (mucosal↔mucosal, skin↔skin). This is how real infections (and cancers) spread between regions.
  //     It surprises players who think the lymphatics are theirs alone — but it is exactly true to biology.
  if(g.difficulty==="hard"){
    const hoppers=g.invaders.filter(iv=> iv.zone==="route" && iv.step===LYMPH_STEP && !iv.tagged
                                        && !iv.lodged && iv.type!=="malaria" && lymphPartners(iv.lane).length);
    const seeded=[];
    hoppers.forEach(iv=>{
      if(d6()<=2){   // ~33% chance per eligible pathogen per turn
        const partners=lymphPartners(iv.lane);
        const to=partners[Math.floor(Math.random()*partners.length)];
        seeded.push({...clone(iv),id:uid(),lane:to,step:LYMPH_STEP});
      }
    });
    if(seeded.length){ g.invaders.push(...seeded);
      pushLog(g,`<b>Lymphatic spread!</b> ${seeded.length} infection(s) travelled through the lymph system into a neighbouring region. The lymphatics are not only your highway — germs ride them too.`,"bad");
      snap("Lymphatic spread"); }
  }

  // 3) MARCH — route -> hub -> (roll organ) -> branch -> organ   (Fever can freeze it)
  const arrivals=[];   // invaders that reach an organ this turn
  if(g.fx && g.fx.skipMarch){ pushLog(g,`Fever holds the invaders — no advance this turn.`,"good"); snap("Fever"); }
  else g.invaders.forEach(iv=>{
    if(iv.type==="malaria" && iv.stage==="liver" && iv.embed>0) return;   // embedded in liver cells: it does not march
    if(iv.lodged) return;   // a lodged worm stays put and does chronic damage instead of marching
    const enteredHubLastTurn = iv.justEnteredHub;
    iv.justEnteredHub=false;   // clear the arrival flag — this turn it may leave the blood
    const steps=invSpeed(g,iv);
    for(let k=0;k<steps;k++){
      if(arrivals.includes(iv)) break;
      if(iv.zone==="route"){
        iv.step-=1;
        if(iv.step<=0){ iv.zone="hub"; iv.step=0;
          // ENTERING the bloodstream ends movement this turn — the hub is a real stop where circulating
          // defenders (and complement) get their shot. Without this, a fast pathogen would pass straight
          // through the blood into an organ, untargetable. It rolls for an organ on a LATER turn.
          iv.justEnteredHub=true;
          break;
        }
      } else if(iv.zone==="hub"){
        // The pathogen arrived in the blood on a previous turn (justEnteredHub was set then and cleared
        // at the start of this turn's upkeep). It now rolls for an organ and leaves.
        const o=rollOrgan(g,iv);
        iv.zone="branch"; iv.organ=o; iv.step=branchLen(o);
        pushLog(g,`<b>${iv.disease}</b> left the bloodstream toward the <b>${ORGANS[o].name}</b>.`,"bad");
      } else if(iv.zone==="branch"){
        iv.step-=1;
        if(iv.step<=0){ arrivals.push(iv); break; }
      }
    }
  });
  snap("The march");

  const tally=iv=> iv.type==="bacteria" ? (iv.tagged?"bacteriaTagged":"bacteriaUntagged") : iv.type;
  arrivals.forEach(iv=>{ g.stats.arrivals[tally(iv)]++; });

  // 4) RESIDENT MACROPHAGES are now player-controlled (move for 1 AP each, engulf once free) —
  //    they no longer engulf automatically. See the "resmove" / "resengulf" actions.


  // 4b) MALARIA reaching the LIVER hides INSIDE liver cells instead of damaging it
  if(g.flags.malaria){
    arrivals.filter(iv=>iv.type==="malaria" && iv.stage==="sporozoite" && iv.organ!=="liver")
      .forEach(iv=>{ iv.stage="blood";   // never reached the liver — it is merozoites in the blood now
        pushLog(g,`<b>${iv.disease}</b> is now circulating in the blood. Antibodies and the Monocyte can reach it.`,"bad"); });
    const embed=arrivals.filter(iv=>iv.type==="malaria" && (iv.stage==="liver"||iv.stage==="sporozoite") && iv.organ==="liver");
    embed.forEach(iv=>{
      iv.stage="liver"; iv.embed=MALARIA_LIVER_TURNS; iv.step=0;
      const i=arrivals.indexOf(iv); if(i>=0) arrivals.splice(i,1);
      g.rare.malariaLiver=true;
      pushLog(g,`<b>Malaria slipped inside your liver cells.</b> Antibodies cannot touch it in there — only the Killer T-Cell or the NK Cell can. It will burst out in ${MALARIA_LIVER_TURNS} turns.`,"bad");
    });
    if(embed.length) snap("Malaria hides in the liver");
  }

  // 4c) KALA-AZAR — it does not damage the organ; it INFECTS the organ's macrophage and lives inside it
  if(g.flags.specials){
    const hide=arrivals.filter(iv=>iv.hidesInMac && g.residents[iv.organ] && !g.residents[iv.organ].infectedBy);
    hide.forEach(iv=>{
      const r=g.residents[iv.organ];
      r.infectedBy=iv.id; iv.step=0; iv.inMac=true;
      const i=arrivals.indexOf(iv); if(i>=0) arrivals.splice(i,1);
      pushLog(g,`<b>${iv.disease} has moved INSIDE your ${RESIDENT_NAME[iv.organ]}.</b> Your own defender cell is now the parasite's house — it can no longer eat anything. Kill the parasite to free it.`,"bad");
    });
    if(hide.length) snap("Kala-azar hides inside a macrophage");
  }

  // 4d) WORMS LODGE — a worm does not "hit and vanish" like a virus. It embeds in the tissue and
  //     causes SLOW, CHRONIC damage for as long as it is left alive (this is what parasitic worms
  //     really do — they live in you for months or years). It stops marching and stays put.
  const wormLodge=arrivals.filter(iv=>iv.type==="worm");
  wormLodge.forEach(iv=>{
    iv.lodged=true; iv.step=0; iv.wormClock=WORM_DAMAGE_EVERY;   // grace: first chronic bite is WORM_DAMAGE_EVERY turns away — no immediate damage
    const i=arrivals.indexOf(iv); if(i>=0) arrivals.splice(i,1);   // remove from the one-time-hit list
    const org=g.organs[iv.organ];
    if(org){ org.clear=0;
      pushLog(g,`<b>${iv.disease} has lodged in your ${ORGANS[iv.organ].name}.</b> A worm does not pass through — it settles in and feeds, chewing the organ a little more every few turns until you kill it. You have a short while before it starts to bite. Coat it, then the Eosinophil strikes — or Degranulates for the kill.`,"bad");
    }
  });
  if(wormLodge.length) snap("Worms lodge in the tissue");

  // 5) ORGAN DAMAGE
  arrivals.forEach(iv=>{ g.stats.gotThrough[tally(iv)]++;
    const org=g.organs[iv.organ]; if(!org) return;
    org.hp=Math.max(0,org.hp-1); org.clear=0; g.stats.organHits++;
    g.invaders=g.invaders.filter(x=>x.id!==iv.id);
    if(/Influenza/.test(iv.disease) && iv.organ==="lungs") g.rare.seen.fluInLungs=true;
    if(iv.amnesia && g.flags.specials && g.presentations>0){
      g.presentations=0;
      pushLog(g,`<b>IMMUNE AMNESIA.</b> Measles has wiped out your immune memory — every antigen you had learned is GONE. Antibody production drops back to the beginning. This really happens.`,"bad");
    }
    pushLog(g,`<b>${iv.disease}</b> infected the <b>${ORGANS[iv.organ].name}</b> — integrity ${org.hp}/${org.max}.`,"bad");
    if(org.hp===0 && !org.failed){ org.failed=true; g.stats.failures.push(iv.organ); }
  });
  if(arrivals.length) snap("Organ damage");

  // 6) LOSS — any organ failed
  const failed=g.organList.find(o=>g.organs[o].hp<=0);
  if(failed){ g.lost={organ:failed,turn:g.turn,disease:null};
    pushLog(g,`<b>${ORGANS[failed].name} failure.</b> The body has fallen.`,"bad"); snap("Organ failure"); return frames; }

  // 7) WIN / LOSS on the clearance model. No auto-win at turn N. After the onslaught window closes
  //    (turn > N) no new infections arrive, and you WIN only once the body is completely clear.
  //    Backstop: still not clear by turn N + GRACE_CLEAR = the immune system is exhausted, you LOSE.
  if(g.turn>g.maxTurn && g.everInfected){
    if(g.invaders.length===0){ g.won=true; pushLog(g,`Every infection faced and the body is completely clear — you win!`,"good"); snap("Victory"); return frames; }
    if(g.turn >= g.maxTurn + GRACE_CLEAR){ g.lost={organ:null,turn:g.turn,disease:null,reason:"attrition"};
      pushLog(g,`The body could not be cleared of infection in time — the immune system is exhausted. Defeat.`,"bad"); snap("Defeat"); return frames; }
  }

  // 8) end-of-turn upkeep
  if(kidneyLeak(g)){
    const pools=FAM_KEYS.concat(["X"]).filter(f=>(g.ab[f]||0)>0);
    if(pools.length){ const f=pools.sort((a,b)=>g.ab[b]-g.ab[a])[0]; g.ab[f]--;
      pushLog(g,`Damaged kidneys leaked a <b>${f}</b> antibody into the urine.`,"bad"); }
  }
  // organ convalescence — a branch cleared of invaders recovers.
  // On HARD, lost integrity is PERMANENT — an organ never regrows hit points. What DOES lift, after a
  // few clear turns, is the FUNCTIONAL penalty (the −1 AP, the antibody leak, etc.) as the tissue
  // compensates. On Normal/Training the organ can also regrow integrity, as before.
  const regrows = g.difficulty!=="hard";
  g.organList.forEach(o=>{ const org=g.organs[o];
    const dirty=g.invaders.some(iv=>iv.zone==="branch"&&iv.organ===o);
    if(dirty){ org.clear=0; org.compensated=false; return; }
    org.clear=(org.clear||0)+1;
    if(regrows && org.hp<org.max && org.clear>=HEAL_AFTER){
      org.hp++; org.clear=0;
      pushLog(g,`The <b>${ORGANS[o].name}</b> recovered — integrity ${org.hp}/${org.max}.`,"good");
    } else if(!regrows && org.hp<org.max && !org.compensated && org.clear>=HEAL_AFTER){
      org.compensated=true;   // the damage stays, but the body adapts around it
      pushLog(g,`The <b>${ORGANS[o].name}</b> is scarred (integrity stays ${org.hp}/${org.max}) but the body has <b>compensated</b> — its penalty no longer applies.`,"good");
    }
  });
  const next=g.turn+1;
  if(!g.cells.eosinophil.alive && next>=g.cells.eosinophil.regenAt){
    Object.assign(g.cells.eosinophil,{alive:true,regenAt:null,zone:"hub",lane:null,organ:null,step:0});
    pushLog(g,`<b>Eosinophil</b> regenerated — new granules loaded.`,"good");
  }
  if(!g.cells.neutrophil.alive && !marrowBroken(g) && next>=neutrophilReadyTurn(g)){
    Object.assign(g.cells.neutrophil,{alive:true,regenAt:null,zone:"hub",lane:null,organ:null,step:0});
    pushLog(g,`<b>Neutrophil</b> regenerated from the bone marrow.`,"good");
  }
  if(g.fx){
    if(g.suppress.neutrophil>0) g.suppress.neutrophil--;
    if(g.suppress.tcell>0) g.suppress.tcell--;
    if(g.fx.capTurns>0) g.fx.capTurns--;
    g.fx.noProduce=false; g.fx.apMod=0; g.fx.skipMarch=false;
  }
  checkRareTriggers(g);
  g.rare.killedThisTurn=0;
  g.turn=next; g.phase="infection"; g.drawn=null; g.drawnList=[]; g.cells.macrophage.freeEngulf=true;
  // A one-shot rare event (e.g. cytokine storm) already did its damage. Clear its banner after a
  // couple of turns so it does not linger implying an ongoing effect that has actually ended.
  if(g.rareBanner && g.rareBanner.firedTurn!=null && g.turn - g.rareBanner.firedTurn >= 2) g.rareBanner=null;
  g.cells.helper.usedThisTurn=false; g.free={}; g.wormsThisTurn=0;
  for(const o in g.residents){ g.residents[o].ate=false; }   // each resident may engulf once (free) per turn
  fireTurnStart(g);
  snap("Next turn");
  return frames;
}

function viewState(g){
  return { phase:g.phase, turn:g.turn, maxTurn:g.maxTurn, ap:g.ap, apMax:apFor(g), antibodies:g.antibodies,
    antibodyCap:capFor(g), cells:clone(g.cells), invaders:clone(g.invaders), organs:clone(g.organs),
    organList:g.organList.slice(), drawn:g.drawn?clone(g.drawn):null, deckCount:g.deck.length,
    residents:clone(g.residents), presentations:g.presentations, antibodyRate:rateFor(g),
    free:clone(g.free||{}), flags:clone(g.flags),
    multiplayer:g.multiplayer, players:(g.players||[]).slice(), captain:g.captain,
    owner:clone(g.owner||{}), apBudget:clone(g.apBudget||{}), apPool:g.apPool||0,
    banner:g.banner||null, warning:g.warning||null, suppress:clone(g.suppress||{}),
    rareBanner:g.rareBanner||null, antivenom:g.antivenom, rare:clone(g.rare||{}),
    avOrder:g.avOrder||0,
    ab:clone(g.ab||{}), made:clone(g.made||{}), memory:clone(g.memory||{}), vaccine:clone(g.vaccine||{}),
    seen:clone(g.seen||{}), clone:g.clone, cloneFound:g.cloneFound, novelSeen:g.novelSeen,
    undoDepth:(g.undo||[]).length,
    log:g.log.slice(0,40), difficulty:g.difficulty, won:g.won, lost:g.lost, science:g.science };
}

/* ---------------- reasonable-play bot + simulator ---------------- */
function simulate(difficulty,N,flags){
  let wins=0; const lossTurns=[], failOrgans={}, hits=[];
  let killTrunk=0, killBranch=0, cascade=0;
  for(let i=0;i<N;i++){
    const g=newGame({difficulty,science:false,flags});
    let guard=0;
    while(!g.won&&!g.lost&&guard++<200){
      applyAction(g,{action:"draw"}); applyAction(g,{action:"beginCommand"});
      let s=0;
      while(g.phase==="command"&&s++<60){
        const threats=[...g.invaders].sort((a,b)=>distToOrgan(g,a)-distToOrgan(g,b));
        const th=threats[0];
        // free engulf first (costs nothing)
        if(g.cells.macrophage.freeEngulf){ const e=macrophageEatable(g)[0]; if(e&&applyAction(g,{action:"engulf",cell:"macrophage",invaderId:e.id}).ok) continue; }
        // prime a resident if a germ is standing in its tissue (protects the organ)
        let primed=false;
        for(const o of g.organList){ const e=residentEatable(g,o)[0];
          if(e && applyAction(g,{action:"resengulf",organ:o,invaderId:e.id}).ok){ primed=true; break; } }
        if(primed) continue;
        if(!canAct(g,"nk") && g.ap<=0) break;
        // NK kills an infected cell up close (no antigen needed)
        const nk=nkTargets(g)[0]; if(nk && applyAction(g,{action:"nkkill",cell:"nk",invaderId:nk.id}).ok) continue;
        // Killer T snipes hidden viruses / liver malaria at range
        const sn=snipeTargets(g)[0]; if(sn && applyAction(g,{action:"snipe",cell:"tcell",invaderId:sn.id}).ok) continue;
        // memory: destroy a remembered pathogen for free/cheap
        const mem=g.invaders.find(iv=>iv.remembered && attackable(iv));
        if(mem && applyAction(g,{action:"memoryKill",invaderId:mem.id}).ok) continue;
        // Helper T-Cell: park it WITH the B-Cell (contact-dependent licensing)
        if(helperLicensed(g) && !samePlace(g.cells.helper,g.cells.bcell)){
          const hd=moveDestinations(g,"helper").map(d=>{ const pr={zone:d.zone,lane:d.lane||null,organ:d.organ||null,step:d.step||0};
            return {d,s:placeDist(g,pr,g.cells.bcell)}; }).sort((a,b)=>a.s-b.s);
          if(hd[0] && hd[0].s < placeDist(g,g.cells.helper,g.cells.bcell) && applyAction(g,{action:"move",cell:"helper",...hd[0].d}).ok) continue; }
        // novel antigen: go find the clone
        if(g.novelSeen && !g.cloneFound && g.invaders.some(x=>x.novel)
           && applyAction(g,{action:"clonalSelection"}).ok) continue;
        if(g.novelSeen && g.cloneFound && (g.ab.X||0)<1 && g.invaders.some(x=>x.novel)
           && applyAction(g,{action:"produce",cell:"bcell",family:"X"}).ok) continue;

        // ---- FOLLOW THROUGH: kill things that are already coated/reachable ----
        // a coated bacterium/parasite that a phagocyte is standing on -> engulf it
        {
          let done=false;
          for(const iv of g.invaders){
            if((iv.type==="bacteria"||iv.type==="parasite") && iv.tagged){
              // is a macrophage on it?
              if(samePlace(g.cells.macrophage,iv) && applyAction(g,{action:"engulf",cell:"macrophage",invaderId:iv.id}).ok){ done=true; break; }
            }
          }
          if(done) continue;
        }
        // a coated worm/parasite the eosinophil can reach -> strike (or degranulate a 3-HP worm about to hurt an organ)
        {
          const eo=g.cells.eosinophil;
          if(eo.alive){
            const hit=wormStrikeable(g,"eosinophil")[0];
            if(hit){
              // degranulate if it's a 3-HP worm lodged in / near an organ; else normal strike
              const urgent = hit.type==="worm" && hit.hp>=3 && (hit.zone==="branch"||hit.lodged);
              const act = urgent ? "degranulate" : "strike";
              if(applyAction(g,{action:act,cell:"eosinophil",invaderId:hit.id}).ok) continue;
            }
          }
        }

        // spend a MATCHING antibody on the most urgent threat (neutralise or tag)
        if(th){
          const tf=famOf(th);
          if((g.ab[tf]||0)>0){
            if((th.type==="virus"||th.type==="toxin"||th.type==="venom"||(th.type==="malaria"&&th.stage==="blood"))
               && applyAction(g,{action:"neutralise",invaderId:th.id}).ok) continue;
            if((th.type==="bacteria"||th.type==="worm"||th.type==="parasite") && !th.tagged
               && applyAction(g,{action:"tag",invaderId:th.id}).ok) continue;
          }
        }
        // produce antibodies against whichever class is most present
        {
          const need={};
          g.invaders.forEach(x=>{ if(x.type!=="hidden"&&!x.inMac) { const f=famOf(x); need[f]=(need[f]||0)+1; } });
          const want=Object.keys(need).sort((a,b)=>need[b]-need[a])
                     .find(f=>(g.ab[f]||0)<capFam(g,f) && (f!=="X" || g.cloneFound));
          if(want && applyAction(g,{action:"produce",cell:"bcell",family:want}).ok) continue;
        }
        // VACCINATE — on Normal/Hard this is the ONLY way to earn memory, so invest spare AP into it.
        // Prefer a disease already in the body (likely to recur), else any seen, not-yet-immune one.
        if(g.difficulty!=="training" && apNow(g)>0){
          const here=new Set(g.invaders.map(iv=>iv.disease));
          const cand=Object.keys(g.seen).filter(dz=>!g.memory[dz] && dz!=="Pathogen X")
                     .sort((a,b)=>(here.has(b)?1:0)-(here.has(a)?1:0));
          if(cand[0] && applyAction(g,{action:"vaccinate",disease:cand[0],ap:1}).ok) continue;
        }
        // NET a swarm
        const n=g.cells.neutrophil;
        if(n.alive && n.zone!=="hub" && invadersWith(g,n).length>=2 && applyAction(g,{action:"net",cell:"neutrophil"}).ok) continue;

        // ---- POSITIONING: move the right specialist toward the highest-value target ----
        // Priority: hidden virus (needs T/NK) > lodged worm (needs eosinophil) > coated bacterium/parasite (needs macrophage) > nearest threat
        {
          const hidden = g.invaders.filter(iv=> (iv.type==="hidden"||iv.inMac||(iv.type==="malaria"&&iv.stage==="liver")) && attackable(iv))
                          .sort((a,b)=>distToOrgan(g,a)-distToOrgan(g,b))[0];
          const worm = g.invaders.filter(iv=> (iv.type==="worm"||iv.type==="parasite") && iv.tagged)
                          .sort((a,b)=>distToOrgan(g,a)-distToOrgan(g,b))[0];
          const coated = g.invaders.filter(iv=> (iv.type==="bacteria"||iv.type==="parasite") && iv.tagged)
                          .sort((a,b)=>distToOrgan(g,a)-distToOrgan(g,b))[0];
          let moved=false;
          const goTo=(cell,target)=>{
            if(!target) return false;
            const c=g.cells[cell]; if(samePlace(c,target)) return false;
            const ds=moveDestinations(g,cell).map(d=>{ const pr={zone:d.zone,lane:d.lane||null,organ:d.organ||null,step:d.step||0};
              return {d,s:placeDist(g,pr,target)}; }).sort((a,b)=>a.s-b.s);
            if(ds[0] && ds[0].s < placeDist(g,c,target) && applyAction(g,{action:"move",cell,...ds[0].d}).ok) return true;
            return false;
          };
          // move Killer T (or NK) toward a hidden target it can't yet reach
          if(hidden && !snipeTargets(g).length){ if(goTo("tcell",hidden)){moved=true;} else if(goTo("nk",hidden)){moved=true;} }
          // move eosinophil toward a coated worm/parasite
          if(!moved && worm && !wormStrikeable(g,"eosinophil").length && g.cells.eosinophil.alive){ if(goTo("eosinophil",worm)) moved=true; }
          // move macrophage toward a coated bacterium/parasite to engulf
          if(!moved && coated){ if(goTo("macrophage",coated)) moved=true; }
          // otherwise move macrophage to the nearest threat
          if(!moved && th){ if(goTo("macrophage",th)) moved=true;
            else if(samePlace(g.cells.macrophage,th) && applyAction(g,{action:"engulf",cell:"macrophage",invaderId:th.id}).ok) moved=true; }
          if(moved) continue;
        }
        break;
      }
      applyAction(g,{action:"endCommand"});
    }
    killTrunk+=g.stats.killedTrunk; killBranch+=g.stats.killedBranch; hits.push(g.stats.organHits);
    if(g.won) wins++;
    else if(g.lost){ lossTurns.push(g.lost.turn); failOrgans[g.lost.organ]=(failOrgans[g.lost.organ]||0)+1;
      const dmg=g.organList.filter(o=>g.organs[o].hp<g.organs[o].max).length; if(dmg>=2) cascade++; }
  }
  const kt=killTrunk+killBranch;
  return { N, winRate:wins/N,
    avgLossTurn: lossTurns.length? lossTurns.reduce((a,b)=>a+b,0)/lossTurns.length : null,
    trunkKillPct: kt? killTrunk/kt : 0,
    avgOrganHits: hits.reduce((a,b)=>a+b,0)/N,
    cascadePct: lossTurns.length? cascade/lossTurns.length : 0,
    failOrgans };
}
/* crude distance between two places, for bot pathing */
function placeDist(g,a,b){
  const toHub=p=> p.zone==="hub"?0 : p.step;   // steps from p back to the hub
  if(a.zone===b.zone){
    if(a.zone==="hub") return 0;
    if(a.zone==="route"&&a.lane===b.lane) return Math.abs(a.step-b.step);
    if(a.zone==="branch"&&a.organ===b.organ) return Math.abs(a.step-b.step);
  }
  return toHub(a)+toHub(b);   // must go via the hub
}

module.exports={ setKnobs, newGame, canNeutralise, canTag, anyNeutralisable, anyTaggable, abMatch, attackable, branchLen, macrophageEatable, snipeTargets, canProduceFam, pushUndo, undo, EVENTS, RARE, fireRare, FAMILIES, FAM_KEYS, FAMILY, famOf, capFam, rateForFam, VACCINE_COST, CLONE_COST, ANTIVENOM_ORDER, DECK_MASTER, hivActive, lymphBlocked, macDisabled, INV_HP, INV_SPEED, FAST_DISEASE, NOT_ALIVE, TOXIN_MAKERS, antivenomTargets, netTargets, wormStrikeable, invSpeed, helperWith, helperLicensed, nkTargets, residentEatable, RESIDENT_NAME, rateFor, applyAction, resolveSpread, viewState, simulate, moveDestinations,
  macrophageEatable, snipeTargets, distToOrgan, ORGANS, ORGAN_SETS, ROUTES, TROPISM, DIFF, CELL_KEYS, FLAGS,
  helperInBlood, neutrophilReadyTurn, wormAllowed, respectWormCap, applyEvent, makeInvader, forceInjectType, forceInjectCard, productionBreakdown, rateForFam };
