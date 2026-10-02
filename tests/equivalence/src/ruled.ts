/**
 * THE ORIGINAL ENGINE, AS RULED: the second implementation of every rule change the engine change
 * queue ruled (`docs/ENGINE_CHANGE_QUEUE.md`; the method ruled by Shantanu on 30 September 2026).
 *
 * The equivalence corpus proves the port against `tools/legacy/v2_engine.js`, action for action. A
 * deliberate rule change breaks that agreement by design, and the tempting repair, a snapshot of the
 * port taken after the change, is a test that compares the port with itself and cannot fail. So each
 * ruled change is made TWICE, independently: once in `packages/engine`, and once here, as an edit to
 * the original's source that the rig applies in memory (the original file is never touched, as
 * CLAUDE.md requires). The corpus then compares the port with the original AS RULED, and two
 * implementations written apart that agree over the corpus are evidence; one agreeing with itself is
 * none.
 *
 * Each edit must match the original EXACTLY ONCE, applied in order, or the rig refuses: an edit that
 * no longer matches would leave the oracle silently the original, and every ruled change would then
 * show as a port defect, or worse, a missing one would pass.
 *
 * Q7 has NO entry here, on purpose: it moves numbers into content without changing play or any
 * table the original publishes, so the port must still agree with the original as it is. Q3 has one
 * although it changes no play either, because it adds a row to `TROPISM`, a table the original
 * publishes and the rig pins byte for byte.
 */
export interface RuledChange {
  /** The queue's number for it, `Q1` to `Q13`. */
  readonly queue: string;
  /** What the edit does, in words, for a report that names it. */
  readonly name: string;
  readonly find: string;
  readonly replace: string;
}

export const RULED: readonly RuledChange[] = [
  {
    // Kartik, 5 September 2026: generalist on purpose, declared rather than a lookup miss. It changes
    // no play: both engines already treat "any" exactly as a missing entry (v2_engine.js rollOrgan,
    // `if(list==="any" || !list)`; construct.ts the same).
    queue: 'Q3',
    name: "Pathogen X's tropism declared as any",
    find: '"Tuberculosis (reactivated)":["lungs"],"Pneumococcal pneumonia":["lungs"],\n};',
    replace:
      '"Tuberculosis (reactivated)":["lungs"],"Pneumococcal pneumonia":["lungs"],\n"Pathogen X":"any",\n};',
  },
  {
    // Shantanu, 6 September 2026: set from a config flag, copied into the view, read nowhere, in
    // either engine. Removed from the game's state and its view.
    queue: 'Q10',
    name: 'the inert science field removed from the state',
    find: 'log:[], won:false, lost:null, science:cfg.science!==false,',
    replace: 'log:[], won:false, lost:null,',
  },
  {
    queue: 'Q10',
    name: 'the inert science field removed from the view',
    find: 'won:g.won, lost:g.lost, science:g.science };',
    replace: 'won:g.won, lost:g.lost };',
  },
  // Q2 (Kartik, 5 September 2026; FINDINGS #29): the Helper T-Cell's free-action slot removed. Nothing
  // ever granted one, and every one of the Helper's effects was enumerated and none reads it
  // (ENGINE_CHANGE_QUEUE.md, Q2). Eight places in the original, as in the port.
  {
    queue: 'Q2',
    name: 'the free-action slot removed from the new game',
    find: '    free:{},               // free actions granted by the Helper T-Cell this turn\n',
    replace: '',
  },
  {
    queue: 'Q2',
    name: 'spend takes no free action, and hasFree is gone',
    find: 'function spend(g,ck){ if(ck && g.free && g.free[ck]>0){ g.free[ck]--; return; } spendAP(g, g._actingPid, 1); }\nfunction hasFree(g,ck){ return !!(g.free && g.free[ck]>0); }',
    replace: 'function spend(g,ck){ spendAP(g, g._actingPid, 1); }',
  },
  {
    queue: 'Q2',
    name: 'canAct asks about Action Points alone',
    find: 'function canAct(g,ck){ return apNow(g)>0 || hasFree(g,ck); }',
    replace: 'function canAct(g,ck){ return apNow(g)>0; }',
  },
  {
    queue: 'Q2',
    name: 'the undo snapshot holds no free actions',
    find: 'presentations:g.presentations, free:clone(g.free||{})',
    replace: 'presentations:g.presentations',
  },
  {
    queue: 'Q2',
    name: 'undo restores no free actions',
    find: ' g.presentations=u.presentations; g.free=u.free;',
    replace: ' g.presentations=u.presentations;',
  },
  {
    queue: 'Q2',
    name: 'the no-points gate asks about Action Points alone',
    find: 'if(apNow(g)<=0 && !freeNow && !resFree && !hasFree(g,ck)) return err("No Action Points.");',
    replace: 'if(apNow(g)<=0 && !freeNow && !resFree) return err("No Action Points.");',
  },
  {
    queue: 'Q2',
    name: 'the turn resets no free actions',
    find: 'g.cells.helper.usedThisTurn=false; g.free={}; g.wormsThisTurn=0;',
    replace: 'g.cells.helper.usedThisTurn=false; g.wormsThisTurn=0;',
  },
  {
    queue: 'Q2',
    name: 'the view carries no free actions',
    find: '    free:clone(g.free||{}), flags:clone(g.flags),',
    replace: '    flags:clone(g.flags),',
  },
  // Q5 (FINDINGS #56): the invader id counter into the game's state. The original kept it in its
  // module and reset it in newGame; each of its twelve uses now takes the game. Order matters where
  // one find is a prefix of another: the longer ones go first.
  {
    queue: 'Q5',
    name: 'the id counter is the game’s',
    find: 'let _uid=0; const uid=()=>"i"+(++_uid);',
    replace: 'const uid=(g)=>"i"+(++g.idCounter);',
  },
  {
    queue: 'Q5',
    name: 'newGame no longer resets a module counter',
    find: 'function newGame(cfg){\n  _uid=0;\n',
    replace: 'function newGame(cfg){\n',
  },
  {
    queue: 'Q5',
    name: 'a new game starts its counter at 0',
    find: 'log:[], won:false, lost:null,',
    replace: 'log:[], won:false, lost:null, idCounter:0,',
  },
  {
    queue: 'Q5',
    name: 'uid(g): the liver-stage malaria',
    find: 'g.invaders.push({id:uid(),type:"malaria",stage:"liver",',
    replace: 'g.invaders.push({id:uid(g),type:"malaria",stage:"liver",',
  },
  {
    queue: 'Q5',
    name: 'uid(g): the lung bacteria on its branch',
    find: 'g.invaders.push({id:uid(),type:"bacteria",zone:"branch",organ:"lungs",lane:"nose",step:branchLen("lungs"),',
    replace:
      'g.invaders.push({id:uid(g),type:"bacteria",zone:"branch",organ:"lungs",lane:"nose",step:branchLen("lungs"),',
  },
  {
    queue: 'Q5',
    name: 'uid(g): the hidden route',
    find: 'g.invaders.push({id:uid(),type:"hidden",',
    replace: 'g.invaders.push({id:uid(g),type:"hidden",',
  },
  {
    queue: 'Q5',
    name: 'uid(g): the lung bacteria at step 1',
    find: 'g.invaders.push({id:uid(),type:"bacteria",zone:"branch",organ:"lungs",lane:"nose",step:1,',
    replace:
      'g.invaders.push({id:uid(g),type:"bacteria",zone:"branch",organ:"lungs",lane:"nose",step:1,',
  },
  {
    queue: 'Q5',
    name: 'uid(g): makeInvader',
    find: 'const iv={id:uid(),type:c.type,',
    replace: 'const iv={id:uid(g),type:c.type,',
  },
  {
    queue: 'Q5',
    name: 'uid(g): a tripled copy',
    find: 'if(triple && room()){ born.push({...clone(iv),id:uid()});',
    replace: 'if(triple && room()){ born.push({...clone(iv),id:uid(g)});',
  },
  {
    queue: 'Q5',
    name: 'uid(g): a hit copy',
    find: 'if(hit){ born.push({...clone(iv),id:uid()});',
    replace: 'if(hit){ born.push({...clone(iv),id:uid(g)});',
  },
  {
    queue: 'Q5',
    name: 'uid(g): the guaranteed copy',
    find: 'born.push({...clone(iv),id:uid()});',
    replace: 'born.push({...clone(iv),id:uid(g)});',
  },
  {
    queue: 'Q5',
    name: 'uid(g): a burst copy',
    find: 'const copy={...clone(iv), id:uid(),',
    replace: 'const copy={...clone(iv), id:uid(g),',
  },
  {
    queue: 'Q5',
    name: 'uid(g): a released toxin',
    find: 'g.invaders.push({id:uid(),type:"toxin",',
    replace: 'g.invaders.push({id:uid(g),type:"toxin",',
  },
  {
    queue: 'Q5',
    name: 'uid(g): the blood-stage malaria',
    find: 'g.invaders.push({id:uid(),type:"malaria",stage:"blood",',
    replace: 'g.invaders.push({id:uid(g),type:"malaria",stage:"blood",',
  },
  {
    queue: 'Q5',
    name: 'uid(g): a lymphatic seed',
    find: 'seeded.push({...clone(iv),id:uid(),',
    replace: 'seeded.push({...clone(iv),id:uid(g),',
  },
  {
    // Kartik, 5 September 2026 (FINDINGS #55): antivenom is passive immunity, so a kill by it grants
    // no memory. The original granted memory for any kill on Training, and its own antivenom log
    // line said the body learns nothing.
    queue: 'Q4',
    name: 'an antivenom kill grants no memory',
    find: 'if(g.difficulty==="training" && g.memory && !g.memory[iv.disease] && !g.invaders.some(x=>x.disease===iv.disease)){',
    replace:
      'if(g.difficulty==="training" && by!=="antivenom" && g.memory && !g.memory[iv.disease] && !g.invaders.some(x=>x.disease===iv.disease)){',
  },
  {
    // Shantanu, 5 September 2026, at the S25 pass (FINDINGS #57): the granule burn is where the fight
    // is. The original keyed it to the target being anywhere on a branch.
    queue: 'Q9',
    name: 'degranulate burns the organ only at branch step 0',
    find: 'if(iv.zone==="branch" && g.organs[iv.organ]){',
    replace: 'if(iv.zone==="branch" && iv.step===0 && g.organs[iv.organ]){',
  },
  // Q1 (Kartik, 5 September 2026, option (a); FINDINGS #4): antibodies may attempt a trypanosome, so
  // the antigenic-variation roll the original carried, unreachable, can fire. Its only `variant` card
  // is Sleeping sickness, a parasite, which both of the original's antibody checks turned away.
  {
    queue: 'Q1',
    name: 'canNeutralise accepts a variant parasite',
    find: 'const kind = iv.type==="virus"||iv.type==="toxin"||(iv.type==="malaria"&&(iv.stage==="blood"||iv.stage==="sporozoite"));',
    replace:
      'const kind = iv.type==="virus"||iv.type==="toxin"||(iv.type==="malaria"&&(iv.stage==="blood"||iv.stage==="sporozoite"))||(iv.type==="parasite"&&!!iv.variant);',
  },
  {
    queue: 'Q1',
    name: 'neutralise accepts a variant parasite',
    find: 'const ok2 = iv.type==="virus" || iv.type==="toxin" || (iv.type==="malaria"&&(iv.stage==="blood"||iv.stage==="sporozoite"));',
    replace:
      'const ok2 = iv.type==="virus" || iv.type==="toxin" || (iv.type==="malaria"&&(iv.stage==="blood"||iv.stage==="sporozoite")) || (iv.type==="parasite"&&!!iv.variant);',
  },
  // Q6 (Kartik, 5 September 2026; FINDINGS #5): a resident's Recall, a new action, returning it to its
  // organ box in one move for one Action Point, undoable like a move. Written into the original as
  // its own case, in its own style, beside the resident's other two.
  {
    queue: 'Q6',
    name: 'resrecall is undoable, like resmove',
    find: '"nkkill","resmove","resengulf"]);',
    replace: '"nkkill","resmove","resrecall","resengulf"]);',
  },
  {
    queue: 'Q6',
    name: 'resrecall: a resident back to its organ box',
    find: '    case "resengulf": {  // the resident engulfs one germ where it stands — FREE, once per turn\n',
    replace:
      '    case "resrecall": {  // a resident returns to its organ box in one move (queue Q6)\n      if(!g.flags.residentMove) return err("Residents cannot move.");\n      const r=g.residents[a.organ]; if(!r) return err("No such organ.");\n      if(r.infectedBy) return err("This resident has a parasite living inside it, so it cannot move until you kill the parasite.");\n      if(r.step===0) return err("The resident is already in its organ.");\n      r.step=0; spend(g,"res_"+a.organ);\n      pushLog(g,`The <b>${RESIDENT_NAME[a.organ]||"resident macrophage"}</b> returned to the ${ORGANS[a.organ].name}.`); return ok(); }\n    case "resengulf": {  // the resident engulfs one germ where it stands — FREE, once per turn\n',
  },
  // Q11 (Shantanu, 30 September 2026, on FINDINGS #55's second question: "do whatever is
  // scientifically accurate"): a venom is never remembered. No vaccine against one, and no memory
  // response to one, whatever memory an older game carries.
  {
    queue: 'Q11',
    name: 'vaccinate refuses a venom',
    find: 'if(!g.seen[dz]) return err("You cannot vaccinate against something your body has never seen.");',
    replace:
      'if(!g.seen[dz]) return err("You cannot vaccinate against something your body has never seen.");\n      if((DECK_MASTER.find(x=>x.dz===dz)||{}).type==="venom") return err("There is no vaccine against venom: it acts in minutes, and even a remembered response takes days. Only antivenom works.");',
  },
  {
    queue: 'Q11',
    name: 'no memory response to a venom',
    find: 'if(memoryHit(g,c.dz)){',
    replace: 'if(memoryHit(g,c.dz) && c.type!=="venom"){',
  },
  // Q12, RULED AFTER THE QUEUE RAN, AND IT CHANGES NO PLAY. Shantanu, 1 October 2026
  // (docs/LOOK_PLAN.md §1, ruling 5: "Training is renamed Easy"), and "Now" on 2 October: the word
  // changes on the screens, in the printed texts and in the engine's own messages. The engine says
  // this difficulty's name to a player in exactly one message, the refusal of a vaccine on that
  // difficulty. The difficulty's KEY stays `training`, in both engines. docs/DEVIATIONS.md #12.
  {
    queue: 'Q12',
    name: 'the gentlest difficulty is called Easy in the one message that names it',
    find: 'return err("On Training, immunity comes from SURVIVING an infection',
    replace: 'return err("On Easy, immunity comes from SURVIVING an infection',
  },
  // Q13, FOR THE GUIDED GAME, AND IT CHANGES NO GAME THAT IS NOT HANDED IT. Shantanu, 2 October 2026
  // (docs/LOOK_PLAN.md §18 and §19): the guided game scripts everything, so a game may be handed its
  // first turns, the diseases that arrive on each, by name. On a written turn the draw places exactly
  // those: no die for how many, none for a disease met before, the deck untouched, the worm cap
  // swapping nothing. The draw that places the last of them removes the field, and the game is an
  // ordinary one from there. Five places in the original, as in the port. docs/DEVIATIONS.md #13.
  {
    queue: 'Q13',
    name: 'a new game may be handed its first turns, written, and refuses a name no card carries',
    find: '  pushLog(g,`Game start · ',
    replace:
      "  if(cfg.written){ g.written=cfg.written.map(turn=>turn.map(dz=>{ if(!DECK_MASTER.some(c=>c.dz===dz)) throw new Error('newGame: no card is named \"'+dz+'\"'); return dz; })); }\n  pushLog(g,`Game start · ",
  },
  {
    queue: 'Q13',
    name: 'a written turn brings as many as are written, and rolls no die for it',
    find: '      let nSpawn=spawnCount(g);',
    replace:
      '      const written=g.written?g.written[g.turn-1]:undefined;\n      let nSpawn=written?written.length:spawnCount(g);',
  },
  {
    queue: 'Q13',
    name: 'a written turn rolls no die for a disease met before',
    find: '        const known=Object.keys(g.seen);',
    replace: '        const known=written?[]:Object.keys(g.seen);',
  },
  {
    queue: 'Q13',
    name: 'a written turn takes its card by name and leaves the deck alone',
    find: '        if(!c){ if(!g.deck.length) g.deck=shuffle(g.discard.splice(0));\n          c=g.deck.pop(); g.discard.push(c); }\n        c=respectWormCap(g, c);',
    replace:
      '        if(written) c=DECK_MASTER.find(x=>x.dz===written[k]);\n        if(!c){ if(!g.deck.length) g.deck=shuffle(g.discard.splice(0));\n          c=g.deck.pop(); g.discard.push(c); }\n        if(!written) c=respectWormCap(g, c);',
  },
  {
    queue: 'Q13',
    name: 'the draw that places the last written turn removes the field',
    find: '      if(!g.drawn) g.drawn={dz:"(no new infection)",__sentinel:true};',
    replace:
      '      if(written && g.written && g.turn>=g.written.length) delete g.written;\n      if(!g.drawn) g.drawn={dz:"(no new infection)",__sentinel:true};',
  },
];
