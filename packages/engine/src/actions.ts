/**
 * B4 — applyAction: the whole action space.
 *
 * ERROR STRINGS ARE FROZEN. They are player-facing text, they are part of the compared result
 * at level 3 of the equivalence contract, and Task C is what extracts them into i18n
 * catalogues. Nothing here is reworded, re-punctuated or spell-corrected during Task B — if a
 * string looks wrong, it gets reported, not fixed.
 *
 * Ported in four splits, each with its own checkpoint:
 *   B4a  phase machine + multiplayer allocation
 *   B4b  movement + the B-cell
 *   B4c  combat
 *   B4d  residents
 */

import { LYMPH_GROUP, LYMPH_STEP, ORGANS, RESIDENT_NAME, ROUTES } from './data/board.js';
import { DECK_MASTER } from './data/deck.js';
import { FAM_KEYS } from './data/families.js';
import {
  ANTIVENOM_ORDER,
  CLONE_COST,
  EOSINOPHIL_REGEN,
  NEUTROPHIL_REGEN,
  NK_HITS,
  REINFECT_PC,
  VACCINE_COST,
  AFFINITY_AT,
} from './data/tuning.js';
import { apNow, hasFree, spend, spendAP } from './ap.js';
import { makeInvader, noteWorm, pushLog, respectWormCap } from './construct.js';
import { cname, killInvader, hurtInvader, placeName, present } from './effects.js';
import { d6, famOf, shuffle } from './primitives.js';
import {
  antivenomTargets,
  apFor,
  attackable,
  canProduceFam,
  capFam,
  lymphBlocked,
  macrophageEatable,
  memoryHit,
  moveDestinations,
  netTargets,
  nkTargets,
  rateForFam,
  residentEatable,
  spawnCount,
  samePlace,
  snipeTargets,
} from './queries.js';
import { branchLen, lymphPartners } from './primitives.js';
import { pushUndo, undo, viewState } from './view.js';
import { resolveSpread } from './spread.js';
import type { AbPoolKey, Action, ActionResult, GameState } from './state.js';
import type { Card } from './types.js';
import type { CellKey, OrganKey, RouteKey } from './types.js';

const ok = (): ActionResult => ({ ok: true });
const err = (m: string): ActionResult => ({ ok: false, error: m });

const UNDOABLE = new Set([
  'move',
  'recall',
  'hop',
  'produce',
  'neutralise',
  'tag',
  'engulf',
  'snipe',
  'net',
  'nkkill',
  'resmove',
  'resengulf',
]);

export function applyAction(g: GameState, a: Action): ActionResult {
  if (g.won || g.lost) return err('Game over.');
  g._actingPid = (a.pid as string) || null;
  if (a.action === 'undo') return undo(g) as ActionResult;

  /* ---------------- B4a: multiplayer allocation ---------------- */
  if (g.multiplayer) {
    if (a.action === 'allocateAP') {
      if (g.phase !== 'allocation') return err('Allocation is only during the allocation phase.');
      if (a.pid !== g.captain) return err('Only the captain allocates Action Points.');
      const to = a.toPid as string;
      const amt = Math.max(0, (a.amount as number) | 0);
      if (!g.players || !g.players.includes(to)) return err('Unknown player.');
      const pool = g.apBudget[g.captain as string] || 0; // unallocated AP sits with the captain
      if (amt > pool) return err('Not enough unallocated AP.');
      g.apBudget[g.captain as string] = pool - amt;
      g.apBudget[to] = (g.apBudget[to] || 0) + amt;
      return ok();
    }
    if (a.action === 'returnAP') {
      if (g.phase !== 'allocation')
        return err('You can only return AP during the allocation phase.');
      const from = a.pid as string;
      const amt = Math.max(0, (a.amount as number) | 0);
      const fromBudget = g.apBudget[from];
      if ((fromBudget || 0) < amt) return err("You don't have that much AP to return.");
      if (from === g.captain) return err("The captain's AP is already the unallocated pool.");
      // THIS LOOKUP GENUINELY MISSES, and the miss is a bug being preserved.
      //
      // returnAP does not validate that `from` is a player — allocateAP does, but this does
      // not. So an unknown or stale pid reaches here with fromBudget === undefined. The guard
      // above passes whenever amt === 0, because (undefined || 0) < 0 is false, and legacy then
      // evaluates `undefined - 0` and writes NaN into the budget map.
      //
      // Verified against legacy: returnAP{pid:'ghost', amount:0} yields apBudget.ghost === NaN.
      // Reproduced deliberately — docs/FINDINGS.md #20. Written as an explicit NaN rather than
      // left as an accident of arithmetic, so the next reader sees it is intended-as-ported.
      g.apBudget[from] = fromBudget === undefined ? NaN : fromBudget - amt;
      g.apBudget[g.captain as string] = (g.apBudget[g.captain as string] || 0) + amt;
      return ok();
    }
    if (a.action === 'confirmAllocation') {
      if (g.phase !== 'allocation') return err('Not in the allocation phase.');
      if (a.pid !== g.captain) return err('Only the captain can confirm allocation.');
      g.phase = 'command'; // leftover AP stays with the captain, usable on the captain's own seats
      pushLog(
        g,
        `<b>Captain confirmed the plan.</b> Each player may now spend their allocated Action Points.`,
        'big',
      );
      return ok();
    }
  }

  if (g.phase === 'command' && UNDOABLE.has(a.action)) pushUndo(g);
  if (a.action === 'beginCommand') g.undo = [];

  /* ---------------- B4a: the phase machine ---------------- */
  switch (a.action) {
    case 'draw':
      return actionDraw(g, a);
    case 'beginCommand': {
      if (g.multiplayer && a.pid !== g.captain)
        return err('Only the captain begins the command phase.');
      if (g.phase !== 'infection' || !g.drawn) return err('Draw first.');
      const pool = apFor(g);
      if (g.multiplayer) {
        // The whole pool starts in the captain's budget; the captain hands it out, players may
        // return some, then the captain confirms -> command.
        g.phase = 'allocation';
        g.apBudget = {};
        g.players.forEach((pid) => {
          g.apBudget[pid] = 0;
        });
        g.apBudget[g.captain as string] = pool;
        g.apPool = pool;
        pushLog(
          g,
          `<b>Allocation phase.</b> Captain has ${pool} Action Point${pool === 1 ? '' : 's'} to distribute for this turn.`,
          'big',
        );
        return ok();
      }
      g.phase = 'command';
      g.ap = pool;
      return ok();
    }
    case 'endCommand': {
      if (g.multiplayer && a.pid !== g.captain) return err('Only the captain ends the turn.');
      if (g.phase !== 'command') return err('Not in command.');
      return { ok: true, frames: resolveSpread(g) };
    }
    default:
      break;
  }

  if (g.phase !== 'command') return err('Wait for command phase.');

  const ck = a.cell as CellKey | undefined;
  if (g.suppress) {
    if ((ck === 'neutrophil' || a.action === 'net') && g.suppress.neutrophil > 0) {
      return err('Neutrophil is offline (neutropenia).');
    }
    if ((ck === 'tcell' || a.action === 'snipe') && g.suppress.tcell > 0) {
      return err('Killer T-Cell is offline (lymphopenia).');
    }
  }

  const freeNow =
    a.action === 'engulf' &&
    g.cells.macrophage?.freeEngulf &&
    macrophageEatable(g).some((x) => x.id === a.invaderId);
  const resFree =
    a.action === 'resengulf' &&
    g.residents[a.organ as string] &&
    !g.residents[a.organ as string]?.ate;
  if (apNow(g) <= 0 && !freeNow && !resFree && !hasFree(g, ck)) return err('No Action Points.');

  switch (a.action) {
    /* ---------------- B4b: movement and the B-cell ---------------- */
    case 'move': {
      if (ck === 'bcell') return err('B-Cell is stationary.');
      if (ck === 'neutrophil' && !g.cells.neutrophil?.alive) {
        return err(
          'The Neutrophil is spent — it is regenerating in the bone marrow and cannot act yet.',
        );
      }
      if (ck === 'eosinophil' && !g.cells.eosinophil?.alive) {
        return err('The Eosinophil is spent — it degranulated and is regenerating.');
      }
      const d = moveDestinations(g, ck as CellKey).find(
        (x) =>
          x.zone === a.zone &&
          (a.zone === 'hub'
            ? true
            : a.zone === 'route'
              ? x.lane === a.lane && x.step === a.step
              : x.organ === a.organ && x.step === a.step),
      );
      if (!d) return err('Illegal move.');
      const c = g.cells[ck as string];
      if (!c) return err('Illegal move.');
      c.zone = d.zone;
      c.lane = (d.lane as RouteKey) || null;
      c.organ = (d.organ as OrganKey) || null;
      c.step = d.step || 0;
      spend(g, ck);
      pushLog(g, `<b>${cname(ck as string)}</b> moved to ${placeName(d)}.`);
      return ok();
    }
    case 'hop': {
      // LYMPHATIC SYSTEM — slide to a paired route, keeping your depth.
      if (!g.flags.lymph) return err('Lymphatics are off.');
      if (lymphBlocked(g)) {
        return err(
          'The lymphatic vessels are BLOCKED by filarial worms — nothing can pass. (This is what causes elephantiasis.)',
        );
      }
      if (ck === 'bcell') return err('B-Cell is stationary.');
      const c = g.cells[ck as string];
      if (!c) return err('B-Cell is stationary.');
      if (c.zone === 'route' && c.lane && !LYMPH_GROUP[c.lane]) {
        return err(
          'The Blood route has NO lymphatic link — a needle goes straight into the bloodstream, bypassing the tissues entirely. That is exactly why it is so dangerous.',
        );
      }
      if (c.zone !== 'route' || c.step !== LYMPH_STEP) {
        return err(`The lymphatic crossing is at step ${LYMPH_STEP} of a route.`);
      }
      const opts = lymphPartners(c.lane as RouteKey);
      const to = a.lane && opts.includes(a.lane as RouteKey) ? (a.lane as RouteKey) : opts[0];
      if (!to) return err('No lymphatic link from this route.');
      const from = c.lane as RouteKey;
      c.lane = to;
      spend(g, ck);
      pushLog(
        g,
        `<b>${cname(ck as string)}</b> took the lymphatic shortcut ${ROUTES[from].name} → ${ROUTES[to].name}.`,
      );
      return ok();
    }
    case 'recall': {
      if (ck === 'bcell') return err('B-Cell is stationary.');
      if (ck === 'neutrophil' && !g.cells.neutrophil?.alive) {
        return err('The Neutrophil is regenerating and cannot act yet.');
      }
      if (ck === 'eosinophil' && !g.cells.eosinophil?.alive) {
        return err('The Eosinophil is regenerating and cannot act yet.');
      }
      const c = g.cells[ck as string];
      if (!c) return err('B-Cell is stationary.');
      if (c.zone === 'hub') return err('Already at the bloodstream hub.');
      c.zone = 'hub';
      c.lane = null;
      c.organ = null;
      c.step = 0;
      spend(g, ck);
      pushLog(g, `<b>${cname(ck as string)}</b> recalled to the bloodstream.`);
      return ok();
    }
    case 'produce': {
      if (g.fx && g.fx.noProduce)
        return err('No antibodies can be made this turn (immunosuppression).');
      const f = a.family as AbPoolKey;
      if (!f || (!FAM_KEYS.includes(f as never) && f !== 'X')) {
        return err('Choose which antigen class to make antibodies against.');
      }
      if (!canProduceFam(g, f)) {
        return err(
          'You have not found the matching B-cell clone for this new antigen yet. Use CLONAL SELECTION first.',
        );
      }
      const cap = capFam(g, f);
      if ((g.ab[f] ?? 0) >= cap) return err(`Your ${f} antibody store is full (${cap}).`);
      const made = Math.min(rateForFam(g, f), cap - (g.ab[f] ?? 0));
      g.ab[f] = (g.ab[f] ?? 0) + made;
      g.made[f] = (g.made[f] ?? 0) + 1;
      spend(g, 'bcell');
      let msg = `<b>B-Cell</b> produced ${made} <b>${f}</b> antibod${made === 1 ? 'y' : 'ies'} (${g.ab[f]}/${cap}).`;
      if (g.made[f] === AFFINITY_AT) {
        msg += ` <b>AFFINITY MATURATION</b> — repeated practice against ${f} has improved your antibodies. You now make one extra per action.`;
      }
      pushLog(g, msg, 'good');
      return ok();
    }
    case 'clonalSelection': {
      // Find the ONE B-cell clone that fits a brand-new antigen.
      if (!g.novelSeen) return err('There is no unknown antigen to search for.');
      if (g.cloneFound) return err('You have already found the clone.');
      if (apNow(g) < 1) return err('No Action Points.');
      spendAP(g, g._actingPid, 1);
      g.clone += 1;
      if (g.clone >= CLONE_COST) {
        g.cloneFound = true;
        pushLog(
          g,
          `<b>CLONAL SELECTION COMPLETE.</b> Out of millions of B-cells, you found the ONE whose receptor fits this new antigen — and cloned it. You can now make antibodies against the unknown pathogen. <i>This search is exactly why the first response to a new germ takes days.</i>`,
          'good',
        );
      } else {
        pushLog(
          g,
          `B-Cells searching for a matching clone… ${g.clone}/${CLONE_COST}. Your body is sifting millions of random receptors for one that fits.`,
        );
      }
      return ok();
    }
    case 'vaccinate': {
      const dz = a.disease as string;
      if (g.difficulty === 'training') {
        return err(
          'On Training, immunity comes from SURVIVING an infection — beat a disease and your body remembers it. Vaccines come into play on Normal and Hard.',
        );
      }
      if (!dz) return err('Pick a disease to develop a vaccine against.');
      if (!g.seen[dz])
        return err('You cannot vaccinate against something your body has never seen.');
      if (g.memory[dz]) return err('You are already immune to that.');
      const put = Math.max(1, Math.min((a.ap as number) || 1, apNow(g)));
      if (apNow(g) < 1) return err('No Action Points.');
      spendAP(g, g._actingPid, put);
      g.vaccine[dz] = (g.vaccine[dz] || 0) + put;
      if (g.vaccine[dz] >= VACCINE_COST) {
        g.memory[dz] = true;
        pushLog(
          g,
          `<b>VACCINE COMPLETE — ${dz}.</b> You now have memory cells for it WITHOUT ever having been ill. If it appears, your response will be immediate. <i>This is what a vaccine actually is: memory without the disease.</i>`,
          'good',
        );
      } else {
        pushLog(g, `Vaccine development — ${dz}: ${g.vaccine[dz]}/${VACCINE_COST} AP invested.`);
      }
      return ok();
    }

    /* ---------------- B4c: combat ---------------- */
    case 'neutralise': {
      const iv = g.invaders.find((x) => x.id === a.invaderId);
      if (!iv) return err('No target.');
      if (iv.type === 'venom') {
        return err(
          "Antibodies can't neutralise venom — it acts far too fast for your B-cells to respond. You need ANTIVENOM (a dose you have, or one you order).",
        );
      }
      if (iv.ade) {
        return err(
          'Your antibodies do not neutralise this dengue serotype — they HELP it into your cells (ADE). Use the Monocyte, Neutrophil or NK Cell.',
        );
      }
      const ok2 =
        iv.type === 'virus' ||
        iv.type === 'toxin' ||
        (iv.type === 'malaria' && (iv.stage === 'blood' || iv.stage === 'sporozoite'));
      if (!ok2) return err('Antibodies cannot neutralise that.');
      if (iv.type === 'malaria' && iv.stage === 'liver') {
        return err('It is hiding inside liver cells — antibodies cannot reach it.');
      }
      if (iv.inMac) {
        return err(
          'It is living INSIDE your own macrophage — antibodies cannot reach inside your cells. A Killer T-Cell must activate the infected cell to destroy it.',
        );
      }
      const f = famOf(iv);
      if (f === 'X' && !g.cloneFound) {
        return err(
          'This antigen is BRAND NEW — no antibody you own fits it. Run CLONAL SELECTION to find the matching B-cell clone.',
        );
      }
      const held = g.ab[f] ?? 0;
      if (held < 1) {
        return err(
          `You have no ${f} antibodies. Antibodies are SPECIFIC — an antibody for another class will not fit ${iv.disease}.`,
        );
      }
      const apCost = iv.type === 'toxin' ? 2 : 1; // antitoxin is harder work
      // Captured BEFORE killInvader plants a fresh memory cell.
      const wasRemembered = memoryHit(g, iv.disease);
      if (!wasRemembered && apNow(g) < apCost) {
        return err(`Neutralising a toxin takes ${apCost} Action Points.`);
      }
      if (iv.variant && d6() <= 3) {
        // NOTE: unreachable in play — the only variant card is a parasite, which `ok2` already
        // rejected above. docs/FINDINGS.md #4. Ported exactly, including that this branch
        // spends AP even for a remembered pathogen, where the success path below would not.
        g.ab[f] = held - 1;
        spendAP(g, g._actingPid, apCost);
        pushLog(
          g,
          `<b>${iv.disease}</b> changed its coat — your antibody no longer fits. (Antigenic variation: this is why it has no vaccine.)`,
          'bad',
        );
        return ok();
      }
      g.ab[f] = held - 1;
      killInvader(g, iv, 'antibody');
      if (wasRemembered) {
        pushLog(
          g,
          `Memory antibodies destroyed ${iv.disease} instantly — no Action Point spent.`,
          'good',
        );
      } else {
        spendAP(g, g._actingPid, apCost);
      }
      pushLog(
        g,
        `<b>${f}</b> antibody <b>neutralised</b> ${iv.disease}${apCost > 1 ? ` (${apCost} AP)` : ''}.`,
        'good',
      );
      return ok();
    }
    case 'antivenom': {
      // PASSIVE IMMUNITY — antibodies made in horses. Instant, borrowed, limited.
      const iv = antivenomTargets(g).find((x) => x.id === a.invaderId);
      if (!iv) return err('No venom in the body.');
      if (g.antivenom <= 0) return err('No antivenom left.');
      if (apNow(g) < 3) return err('Antivenom costs 3 AP.');
      g.antivenom -= 1;
      spendAP(g, g._actingPid, 3);
      killInvader(g, iv, 'antivenom');
      pushLog(
        g,
        `<b>Antivenom</b> given — ${iv.disease} neutralised instantly. These are borrowed antibodies (made in horses): fast, but they do not last and your body learns nothing. ${g.antivenom} dose(s) left.`,
        'good',
      );
      return ok();
    }
    case 'orderAntivenom': {
      // Getting antivenom to the patient in time is a real problem in rural India.
      const put = Math.max(1, Math.min((a.ap as number) || 1, apNow(g)));
      if (apNow(g) < 1) return err('No Action Points.');
      spendAP(g, g._actingPid, put);
      g.avOrder = (g.avOrder || 0) + put;
      if (g.avOrder >= ANTIVENOM_ORDER) {
        g.avOrder = 0;
        g.antivenom += 1;
        pushLog(
          g,
          `<b>Antivenom delivered</b> — one more vial (${g.antivenom} in stock). Your body cannot make this: it is antibodies raised in horses, and it has to be <i>brought to you</i>. Antivenom shortages are a real and deadly problem in rural India.`,
          'good',
        );
      } else {
        pushLog(g, `Ordering antivenom… ${g.avOrder}/${ANTIVENOM_ORDER} AP.`);
      }
      return ok();
    }
    case 'strike': {
      const iv = g.invaders.find((x) => x.id === a.invaderId);
      if (!iv || !(iv.type === 'worm' || iv.type === 'parasite')) {
        return err(
          'Strike is for worms and protozoan parasites — the EUK targets too big to simply engulf.',
        );
      }
      if (ck === 'eosinophil' && !g.cells.eosinophil?.alive) {
        return err('The Eosinophil is spent — it degranulated and is regenerating.');
      }
      if (!iv.tagged)
        return err('Coat it with an antibody first — cells cannot grip an uncoated parasite.');
      const c = g.cells[ck as string];
      if (!c || !samePlace(iv, c)) return err('Move onto the target first.');
      if (!['macrophage', 'eosinophil'].includes(ck as string)) {
        return err(
          'Only the Eosinophil (2 damage) and the Monocyte (1 damage) can strike a worm or parasite from the outside — the Neutrophil and NK Cell cannot.',
        );
      }
      const dmg = ck === 'eosinophil' ? 2 : 1; // the eosinophil is the specialist
      const died = hurtInvader(g, iv, dmg, ck as string);
      // A targeted strike releases only a few granules — it does NOT wound the organ. Only a
      // full DEGRANULATION dumps enough toxic payload to scorch the surrounding tissue.
      spend(g, ck);
      pushLog(
        g,
        died
          ? `<b>${cname(ck as string)}</b> killed the ${iv.disease}.`
          : `<b>${cname(ck as string)}</b> struck the ${iv.disease} for ${dmg} — ${iv.hp}/${iv.maxhp} left.`,
        died ? 'good' : '',
      );
      return ok();
    }
    case 'degranulate': {
      const iv = g.invaders.find((x) => x.id === a.invaderId);
      if (!iv || !(iv.type === 'worm' || iv.type === 'parasite')) {
        return err('Degranulate is for a worm or parasite.');
      }
      const e = g.cells.eosinophil;
      if (!e || !e.alive) return err('The Eosinophil already degranulated — it is regenerating.');
      if (!iv.tagged) return err('Coat it with an antibody first.');
      if (!samePlace(iv, e)) return err('Move the Eosinophil onto the target first.');
      if (apNow(g) < 2)
        return err("Degranulate takes 2 Action Points — it's the eosinophil's whole payload.");
      const died = hurtInvader(g, iv, 3, 'eosinophil'); // 3 kills even a 3-HP worm in one turn
      if (iv.zone === 'branch' && iv.organ && g.organs[iv.organ]) {
        const org = g.organs[iv.organ];
        if (org) {
          org.hp = Math.max(0, org.hp - 1);
          org.clear = 0;
          pushLog(
            g,
            `The granule blast also burned the <b>${ORGANS[iv.organ].name}</b> — integrity ${org.hp}/${org.max}.`,
            'bad',
          );
        }
      }
      e.alive = false;
      e.regenAt = g.turn + EOSINOPHIL_REGEN;
      e.zone = 'hub';
      e.lane = null;
      e.organ = null;
      e.step = 0;
      spendAP(g, g._actingPid, 2);
      pushLog(
        g,
        `<b>Eosinophil DEGRANULATED</b> — a full toxic payload for 3 damage (2 AP). ${died ? `The ${iv.disease} is destroyed.` : `${iv.disease} at ${iv.hp}/${iv.maxhp}.`} The cell is spent and regenerates on turn ${e.regenAt}. <i>This is how eosinophils really kill worms — and why parasites cause tissue damage.</i>`,
        'good',
      );
      return ok();
    }
    case 'tag': {
      const iv = g.invaders.find((x) => x.id === a.invaderId);
      if (
        !iv ||
        iv.tagged ||
        !(iv.type === 'bacteria' || iv.type === 'worm' || iv.type === 'parasite')
      ) {
        return err('Pick an untagged bacterium, worm or parasite.');
      }
      if (!attackable(iv)) return err('Cannot reach it in the bloodstream.');
      if (iv.inMac)
        return err('It is hiding INSIDE your own macrophage — an antibody cannot get in there.');
      const f = famOf(iv);
      if (f === 'X' && !g.cloneFound) {
        return err('Brand-new antigen — no antibody fits it yet. Run CLONAL SELECTION first.');
      }
      const heldForTag = g.ab[f] ?? 0;
      if (heldForTag <= 0) {
        return err(
          `You have no ${f} antibodies. Antibodies are SPECIFIC — the wrong class will not stick to ${iv.disease}.`,
        );
      }
      g.ab[f] = heldForTag - 1;
      iv.tagged = true;
      if (memoryHit(g, iv.disease)) {
        pushLog(g, `Memory antibodies coated ${iv.disease} instantly — free.`, 'good');
      } else {
        spend(g, 'bcell');
      }
      pushLog(
        g,
        iv.type === 'worm'
          ? `Antibodies <b>coated</b> the ${iv.disease}. Cells can now grip it — the Eosinophil hits hardest.`
          : `Antibody <b>tagged</b> ${iv.disease}.`,
        'good',
      );
      return ok();
    }
    case 'engulf': {
      const iv = macrophageEatable(g).find((x) => x.id === a.invaderId);
      if (!iv) return err('Nothing edible here.');
      let died = true;
      if (iv.type === 'fungus' || iv.type === 'parasite')
        died = hurtInvader(g, iv, 1, 'macrophage');
      else killInvader(g, iv, 'macrophage');
      present(g, 1);
      const m = g.cells.macrophage;
      if (m && m.freeEngulf) m.freeEngulf = false;
      else spend(g, 'macrophage');
      pushLog(
        g,
        died
          ? `<b>Monocyte</b> engulfed ${iv.disease}.`
          : `<b>Monocyte</b> chipped the ${iv.disease} — ${iv.hp}/${iv.maxhp} left. Fungi are tough; a Neutrophil NET kills them outright.`,
        'good',
      );
      return ok();
    }
    case 'memoryKill': {
      const iv = g.invaders.find((x) => x.id === a.invaderId);
      if (!iv) return err('No such pathogen.');
      if (!iv.remembered)
        return err(
          'Your body has no memory of this one yet — you must beat it the hard way first.',
        );
      if (!attackable(iv)) return err('Cannot reach it in the bloodstream yet.');
      // Hard: the secondary response is fast but still costs 1 AP. Training/Normal: free.
      if (g.difficulty === 'hard') {
        if (apNow(g) < 1) return err('Need 1 Action Point for the memory response on Hard.');
        spendAP(g, g._actingPid, 1);
      }
      killInvader(g, iv, 'memory');
      pushLog(
        g,
        `<b>Memory response</b> destroyed ${iv.disease} — recognised and cleared at once.${g.difficulty === 'hard' ? ' (1 AP)' : ' (free)'}`,
        'good',
      );
      return ok();
    }
    case 'snipe': {
      const iv = snipeTargets(g).find((x) => x.id === a.invaderId);
      if (!iv) return err('No hidden virus in range.');
      killInvader(g, iv, 'tcell');
      spend(g, 'tcell');
      pushLog(g, `<b>Killer T-Cell</b> sniped hidden ${iv.disease}.`, 'good');
      return ok();
    }
    case 'net': {
      const n = g.cells.neutrophil;
      if (!n || !n.alive) return err('Neutrophil regenerating.');
      if (n.zone === 'hub') return err('Move onto a swarm first.');
      const here = netTargets(g);
      if (!here.length) {
        return err(
          'Nothing here a NET can catch — a NET holds living microbes, but toxins and venom are not alive, and worms and protozoa are far too big.',
        );
      }
      here.forEach((iv) => killInvader(g, iv, 'net'));
      present(g, 1);
      n.alive = false;
      n.spentAt = g.turn;
      n.regenAt = g.turn + NEUTROPHIL_REGEN;
      n.zone = 'hub';
      n.lane = null;
      n.organ = null;
      n.step = 0;
      spend(g, 'neutrophil');
      pushLog(g, `<b>Neutrophil NET</b> cleared ${here.length} invader(s) — spent.`, 'good');
      return ok();
    }
    case 'activate':
      return err(
        'The Helper T-Cell works by contact, not orders — stand it WITH the B-Cell or Killer T-Cell.',
      );
    case 'nkkill': {
      // NK CELL — innate: fast and needs no antigen, but NOT precise (d6 >= NK_HITS).
      if (!g.flags.nkCell) return err('NK Cell is not in play.');
      const iv = nkTargets(g).find((x) => x.id === a.invaderId);
      if (!iv) return err('No infected cell within NK range.');
      const roll = d6();
      spend(g, 'nk');
      g.lastRoll = { cell: 'nk', face: roll, hit: roll >= NK_HITS };
      if (roll >= NK_HITS) {
        killInvader(g, iv, 'nk');
        present(g, 1);
        pushLog(
          g,
          `<b>NK Cell</b> rolled ${roll} — destroyed the infected cell holding ${iv.disease}. Innate: no antigen needed.`,
          'good',
        );
      } else {
        pushLog(
          g,
          `<b>NK Cell</b> rolled ${roll} — missed. Innate killing is fast but imprecise; the Killer T-Cell never misses.`,
          'bad',
        );
      }
      return ok();
    }

    /* ---------------- B4d: residents ---------------- */
    case 'resmove': {
      // A resident patrols ITS OWN branch and never leaves the organ.
      if (!g.flags.residentMove) return err('Residents cannot move.');
      const r = g.residents[a.organ as string];
      if (!r) return err('No such organ.');
      const L = branchLen(a.organ as OrganKey);
      const ns = a.step as number;
      if (ns < 0 || ns > L) return err("Outside this organ's tissue.");
      if (Math.abs(ns - r.step) !== 1) return err('A resident moves one step at a time.');
      r.step = ns;
      spend(g, `res_${a.organ as string}`);
      pushLog(
        g,
        `The <b>${RESIDENT_NAME[a.organ as OrganKey] || 'resident macrophage'}</b> moved to ${ORGANS[a.organ as OrganKey].name} ${ns === 0 ? 'tissue' : `branch ${ns}`}.`,
      );
      return ok();
    }
    case 'resengulf': {
      // The resident engulfs one germ where it stands — FREE, once per turn.
      const r = g.residents[a.organ as string];
      if (!r) return err('No such organ.');
      if (r.infectedBy) {
        return err(
          "This resident has a parasite living inside it — it can't eat anything until you kill the parasite.",
        );
      }
      if (r.ate)
        return err(
          `The ${RESIDENT_NAME[a.organ as OrganKey] || 'resident'} has already engulfed this turn.`,
        );
      const list = residentEatable(g, a.organ as OrganKey);
      const iv = list.find((x) => x.id === a.invaderId) || list[0];
      if (!iv)
        return err(
          'Nothing to engulf where it stands — move it onto a virus or a tagged bacterium first.',
        );
      killInvader(g, iv, 'resident');
      present(g, 1);
      r.ate = true; // free
      pushLog(
        g,
        `<b>${RESIDENT_NAME[a.organ as OrganKey]}</b> engulfed ${iv.disease} in the ${ORGANS[a.organ as OrganKey].name}.`,
        'good',
      );
      return ok();
    }
    default:
      break;
  }
  return err('Unknown action.');
}

/* ------------------------------------------------------------------ *
 * draw — B4a, but long enough to deserve its own function
 * ------------------------------------------------------------------ */

function actionDraw(g: GameState, a: Action): ActionResult {
  if (g.multiplayer && a.pid !== g.captain)
    return err('Only the captain draws the next infection.');
  if (g.phase !== 'infection' || g.drawn) return err('Not ready to draw.');

  let nSpawn = spawnCount(g);
  if (g.turn > g.maxTurn) nSpawn = 0; // after the onslaught window, no NEW infections arrive

  // POST-WINDOW: if the body is already clear that is a win right now. Otherwise mark the draw
  // done with a sentinel so the player can still enter command phase and mop up.
  if (nSpawn === 0 && g.turn > g.maxTurn) {
    if (g.everInfected && g.invaders.length === 0) {
      g.won = true;
      pushLog(g, `Every infection faced and the body is completely clear — you win!`, 'good');
      return { ok: true, frames: [{ label: 'Victory', dice: null, view: viewState(g) }] };
    }
    g.drawn = { dz: '(mop-up)', __sentinel: true };
    g.drawnList = [];
    return ok();
  }

  g.drawnList = [];

  // The novel pathogen breaks in on its scheduled turn, on top of the normal spawns.
  if (g.flags.tierB && g.novelTurn === g.turn && !g.novelSeen) {
    const c = DECK_MASTER.find((x) => x.novel);
    if (c) {
      const nv = makeInvader(g, c);
      nv.novel = true;
      g.invaders.push(nv);
      g.novelSeen = true;
      g.seen[c.dz] = true;
      g.drawn = c;
      pushLog(
        g,
        `<b>⚠ A PATHOGEN NOBODY HAS EVER SEEN.</b> Your antibodies do not fit it — not one of them. Your innate cells (Monocyte, Neutrophil, NK) still work and must hold the line, while your B-Cells search millions of receptors for the ONE clone that matches. <i>This is what a new pandemic feels like from inside a body.</i>`,
        'bad',
      );
    }
  }

  for (let k = 0; k < nSpawn; k += 1) {
    let c: Card | null | undefined;
    const known = Object.keys(g.seen);
    if (g.turn <= g.maxTurn && known.length && Math.random() < REINFECT_PC) {
      const pool = known.filter((dz) => dz !== 'Pathogen X');
      if (pool.length) {
        const dz = pool[Math.floor(Math.random() * pool.length)];
        c = DECK_MASTER.find((x) => x.dz === dz) || null;
      }
    }
    if (!c) {
      if (!g.deck.length) g.deck = shuffle(g.discard.splice(0));
      c = g.deck.pop() as unknown as Card | undefined;
      if (c) g.discard.push(c as never);
    }
    c = respectWormCap(g, c ?? undefined); // at most 1 worm a turn, 2 a game
    if (!c) continue; // capped and nothing else to send: a quiet slot

    const iv = makeInvader(g, c);
    if (iv.type === 'worm') noteWorm(g);
    const entryMsg =
      c.type === 'worm'
        ? `<b>${c.dz}</b> entered via the ${ROUTES[c.lane].name} and is burrowing into the ${ORGANS[iv.organ as OrganKey].name}. Coat it, then the Eosinophil strikes.`
        : `Infection: <b>${c.dz}</b> entered via the ${ROUTES[c.lane].name}.`;
    g.invaders.push(iv);
    g.everInfected = true;
    if (k === 0) g.drawn = c;
    g.drawnList?.push(c);
    g.seen[c.dz] = true;
    if (c.novel) {
      g.novelSeen = true;
      iv.novel = true;
    }
    pushLog(g, entryMsg, 'big');

    // SECONDARY RESPONSE — memory is DISEASE-SPECIFIC. It does not fill the shared class pool
    // (that would let you spend it on any pathogen of the class). Instead it marks THIS
    // pathogen as one your body already knows how to destroy.
    if (memoryHit(g, c.dz)) {
      iv.remembered = true;
      const costTxt =
        g.difficulty === 'hard'
          ? 'Destroying it costs just <b>1 Action Point</b> and no antibody — the fast secondary response.'
          : 'Destroying it is <b>free</b> — memory cells handle it at once.';
      pushLog(
        g,
        `<b>MEMORY RESPONSE.</b> Your body has met ${c.dz} before, so memory cells recognise it instantly. ${costTxt} <i>This is why you only get chickenpox once — and it works only on ${c.dz}, not on other germs of the same type.</i>`,
        'good',
      );
    }
  }

  // Every slot may have been skipped by the worm cap — the turn must still be playable.
  if (!g.drawn) g.drawn = { dz: '(no new infection)', __sentinel: true };
  return ok();
}

export { viewState };
