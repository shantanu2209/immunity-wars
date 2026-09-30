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
  /** The queue's number for it, `Q1` to `Q10`. */
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
];
