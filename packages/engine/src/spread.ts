/**
 * B5 — resolveSpread: the whole turn resolution.
 *
 * Sixteen phases in a fixed order, and the order is itself a rule. Bacteria divide BEFORE the
 * march, so a copy born this turn marches this turn. Worms lodge before organ damage is applied,
 * which is what stops a worm both lodging and dealing an arrival hit in the same turn.
 *
 * Two things that look like details and are not:
 *
 *   - `snap()` pushes an animation frame containing a full viewState. Some snaps are
 *     UNCONDITIONAL inside their guard — the toxin snap fires whenever toxins are enabled, even
 *     when nothing was emitted — so the frame COUNT is part of the compared result at level 3.
 *   - RNG draw order across phases is load-bearing the same way newGame's field order was.
 *     Hard-mode division pushes the guaranteed copy BEFORE rolling the d6 for a second.
 */

import { LYMPH_STEP, ORGANS, RESIDENT_NAME } from './data/board.js';
import { RARE } from './data/events.js';
import { FAM_KEYS } from './data/families.js';
import { TOXIN_MAKERS } from './data/invaders.js';
import {
  BURST_ON,
  GRACE_CLEAR,
  HEAL_AFTER,
  INFECT_ON,
  MALARIA_LIVER_TURNS,
  SPACE_CAP,
  TOXIN_AFTER,
  WORM_DAMAGE_EVERY,
} from './data/tuning.js';
import { fireTurnStart, pushLog, rollOrgan } from './construct.js';
import { branchLen, clone, d6, famOf, lymphPartners, uid } from './primitives.js';
import {
  damaged,
  divideOn,
  invSpeed,
  kidneyLeak,
  marrowBroken,
  neutrophilReadyTurn,
} from './queries.js';
import { viewState } from './view.js';
import type { GameState, Invader } from './state.js';
import type { OrganKey, RouteKey } from './types.js';

export interface Frame {
  label: string;
  dice: unknown;
  view: unknown;
}

interface Die {
  label: string;
  face: number;
  hit: boolean;
  full?: boolean;
}

/* ------------------------------------------------------------------ *
 * rare events
 * ------------------------------------------------------------------ */

/** Max ONE per game, armed with 50% probability at newGame, fired by something the player did. */
export function fireRare(g: GameState, key: string, _extra?: unknown): boolean {
  if (!g.flags.rareEvents || !g.rare.armed || g.rare.fired) return false;
  g.rare.fired = key;
  const e = RARE[key];
  if (!e) return false;
  g.rareBanner = { key, name: e.name, why: e.why, firedTurn: g.turn };
  switch (key) {
    case 'malariaRelapse':
      g.invaders.push({
        id: uid(),
        type: 'malaria',
        stage: 'liver',
        zone: 'branch',
        organ: 'liver',
        lane: 'bite',
        step: 0,
        tagged: false,
        disease: 'Malaria (relapse)',
        hp: 1,
        maxhp: 1,
        age: 0,
        embed: MALARIA_LIVER_TURNS,
      } as Invader);
      break;
    case 'dengueADE': {
      const d = g.invaders.find((x) => /Dengue/.test(x.disease));
      if (d) {
        d.ade = true;
        d.disease = 'Dengue (ADE)';
      }
      break;
    }
    case 'tbReactivation':
      g.invaders.push({
        id: uid(),
        type: 'bacteria',
        zone: 'branch',
        organ: 'lungs',
        lane: 'nose',
        step: branchLen('lungs'),
        tagged: false,
        disease: 'Tuberculosis (reactivated)',
        hp: 1,
        maxhp: 1,
        age: 0,
        embed: 0,
      } as Invader);
      break;
    case 'shingles':
      g.invaders.push({
        id: uid(),
        type: 'hidden',
        zone: 'route',
        lane: 'nose',
        organ: null,
        step: 2,
        tagged: false,
        disease: 'Shingles',
        hp: 1,
        maxhp: 1,
        age: 0,
        embed: 0,
      } as Invader);
      break;
    case 'postFluPneumonia':
      g.invaders.push({
        id: uid(),
        type: 'bacteria',
        zone: 'branch',
        organ: 'lungs',
        lane: 'nose',
        step: 1,
        tagged: false,
        disease: 'Pneumococcal pneumonia',
        hp: 1,
        maxhp: 1,
        age: 0,
        embed: 0,
      } as Invader);
      break;
    case 'rheumaticFever': {
      const h = g.organs.heart;
      if (h) {
        h.hp = Math.max(0, h.hp - 1);
        h.clear = 0;
      }
      break;
    }
    case 'cytokineStorm': {
      const live = g.organList.filter((o) => (g.organs[o]?.hp ?? 0) > 0);
      const o = live[Math.floor(Math.random() * live.length)];
      if (o) {
        const org = g.organs[o];
        if (org) {
          org.hp = Math.max(0, org.hp - 1);
          org.clear = 0;
          if (g.rareBanner) g.rareBanner.why += ` The ${ORGANS[o].name} took the damage.`;
        }
      }
      break;
    }
    default:
      break;
  }
  pushLog(g, `<b>★ ${e.name}</b> — ${e.why}`, 'bad');
  return true;
}

/** Order matters: the FIRST matching trigger fires, and only one rare event ever fires. */
export function checkRareTriggers(g: GameState): void {
  if (!g.flags.rareEvents || !g.rare.armed || g.rare.fired) return;
  const seen = g.rare.seen;
  // cytokine storm: you killed a lot in one turn — the response itself burns you
  if (g.rare.killedThisTurn >= 4) {
    fireRare(g, 'cytokineStorm');
    return;
  }
  // rheumatic fever: you killed Strep (cellulitis) with ANTIBODIES
  if (seen.strepKilledByAntibody) {
    fireRare(g, 'rheumaticFever');
    return;
  }
  // dengue ADE: dengue beaten before, and dengue is back
  if (seen.dengueKilled && g.invaders.some((x) => /Dengue/.test(x.disease) && !x.ade)) {
    fireRare(g, 'dengueADE');
    return;
  }
  // malaria relapse: malaria once reached the liver, and it is long gone
  if (g.rare.malariaLiver && g.turn >= 8 && !g.invaders.some((x) => x.type === 'malaria')) {
    fireRare(g, 'malariaRelapse');
    return;
  }
  // post-flu pneumonia: influenza reached the lungs
  if (seen.fluInLungs) {
    fireRare(g, 'postFluPneumonia');
    return;
  }
  // shingles: chickenpox was beaten
  if (seen.chickenpoxKilled && g.turn >= 6) {
    fireRare(g, 'shingles');
    return;
  }
  // TB reactivation: TB beaten, and the body is now weakened
  if (seen.tbKilled && (!g.cells.neutrophil?.alive || (g.organs.marrow && damaged(g, 'marrow')))) {
    fireRare(g, 'tbReactivation');
    return;
  }
}

/* ------------------------------------------------------------------ *
 * the turn
 * ------------------------------------------------------------------ */

export function resolveSpread(g: GameState): Frame[] {
  g.phase = 'spread';
  const frames: Frame[] = [];
  const snap = (label: string, dice?: unknown): void => {
    frames.push({ label, dice: dice || null, view: viewState(g) });
  };

  // EARLY CLEARANCE — if the onslaught window has closed and the board is already clear, the
  // body has won before this turn's spread even runs.
  if (g.turn > g.maxTurn && g.everInfected && g.invaders.length === 0) {
    g.won = true;
    pushLog(g, `Every infection faced and the body is completely clear — you win!`, 'good');
    snap('Victory');
    return frames;
  }

  // 0) COMPLEMENT — blood proteins continuously coat bacteria in the bloodstream (free).
  if (g.flags.complement) {
    const b = g.invaders.find((iv) => iv.type === 'bacteria' && !iv.tagged && iv.zone === 'hub');
    if (b) {
      b.tagged = true;
      pushLog(
        g,
        `<b>Complement</b> coated ${b.disease} in the bloodstream — a phagocyte can now eat it.`,
        'good',
      );
      snap('Complement');
    }
  }

  // 1) BACTERIA DIVIDE. Coated bacteria never divide (opsonised — flagged for destruction), so
  //    TAG EARLY. A single tissue space saturates at SPACE_CAP: real growth is density-limited.
  const dOn = divideOn(g);
  const untagged = g.invaders.filter((iv) => iv.type === 'bacteria' && !iv.tagged);
  if (untagged.length) {
    const dice: Die[] = [];
    const born: Invader[] = [];
    const fullSpaces = new Set<string>();
    const spaceKey = (iv: Invader): string =>
      `${iv.zone}:${iv.lane || ''}:${iv.organ || ''}:${iv.step}`;
    const count: Record<string, number> = {};
    g.invaders
      .filter((x) => x.type === 'bacteria')
      .forEach((x) => {
        const k = spaceKey(x);
        count[k] = (count[k] || 0) + 1;
      });
    untagged.forEach((iv) => {
      const k = spaceKey(iv);
      const room = (): boolean => (count[k] || 0) < SPACE_CAP;
      if (!room()) {
        dice.push({ label: iv.disease, face: 0, hit: false, full: true });
        fullSpaces.add(k);
        return;
      }
      if (g.difficulty === 'hard') {
        // Guaranteed copy FIRST, then the roll for a second. That order is the RNG contract.
        born.push({ ...clone(iv), id: uid() });
        count[k] = (count[k] || 0) + 1;
        const r = d6();
        const triple = r <= 3;
        dice.push({ label: iv.disease, face: r, hit: true });
        if (triple && room()) {
          born.push({ ...clone(iv), id: uid() });
          count[k] = (count[k] || 0) + 1;
        }
      } else {
        const r = d6();
        const hit = r <= dOn;
        dice.push({ label: iv.disease, face: r, hit });
        if (hit) {
          born.push({ ...clone(iv), id: uid() });
          count[k] = (count[k] || 0) + 1;
        }
      }
    });
    if (born.length) {
      g.invaders.push(...born);
      pushLog(g, `Bacteria <b>divided</b>: ${born.length} new.`, 'bad');
    }
    if (fullSpaces.size) {
      pushLog(
        g,
        `${fullSpaces.size} crowded spot(s) stopped growing — a single tissue space holds at most <b>${SPACE_CAP}</b> bacteria. <i>Real bacterial growth is density-limited. Note the cap is per SPOT, so the same disease can still build up on several spots at once.</i>`,
      );
    }
    snap('Bacteria divide', dice);
  }

  // 2) LYTIC CYCLE. `pre` is snapshotted BEFORE any bursting, so copies created this turn do not
  //    themselves roll to hide in the same turn.
  //
  //    The spread is currently DEFENSIVE rather than load-bearing: replacing it with a plain
  //    alias diverges on zero games, because the only mutation to g.invaders in between is a
  //    REASSIGNMENT (g.invaders = g.invaders.filter(...)), which breaks the alias anyway. It
  //    becomes load-bearing the moment anything in this phase mutates the array in place, so
  //    it stays. Verified by injecting the alias and finding no divergence.
  const pre = [...g.invaders];
  const hid = pre.filter((iv) => iv.type === 'hidden');
  if (hid.length) {
    const dice: Die[] = [];
    const burst = new Set<string>();
    const nv: Invader[] = [];
    let anyEuk = false;
    hid.forEach((iv) => {
      const r = d6();
      const hit = r <= BURST_ON;
      dice.push({ label: iv.disease, face: r, hit });
      if (hit) {
        burst.add(iv.id);
        // A bursting cell releases whatever was living INSIDE it. Toxoplasmosis and Chagas are
        // PROTOZOA, so the cell spills tachyzoites / trypomastigotes — parasites, not viruses,
        // and they come out damaged from rupturing the cell.
        const euk = famOf(iv) === 'EUK';
        if (euk) anyEuk = true;
        for (let k = 0; k < 2; k += 1) {
          const copy = { ...clone(iv), id: uid(), type: euk ? 'parasite' : 'virus' } as Invader;
          if (euk) {
            copy.hp = 1;
            copy.maxhp = 2;
          }
          nv.push(copy);
        }
      }
    });
    if (burst.size) {
      g.invaders = g.invaders.filter((x) => !burst.has(x.id));
      g.invaders.push(...nv);
      pushLog(
        g,
        `${burst.size} cell(s) <b>burst</b> — ${nv.length} new ${anyEuk ? 'organism(s) spilled out' : 'viruses'}!`,
        'bad',
      );
    }
    snap('Cells burst', dice);
  }
  const freeV = pre.filter((iv) => iv.type === 'virus' && g.invaders.some((x) => x.id === iv.id));
  if (freeV.length) {
    const dice: Die[] = [];
    let n = 0;
    freeV.forEach((iv) => {
      // Pathogen X never converts to a hidden virus: that would let a Killer T-Cell snipe it and
      // skip the clonal-selection story the card exists to teach.
      if (iv.novel) return;
      const r = d6();
      const hit = r <= INFECT_ON;
      dice.push({ label: iv.disease, face: r, hit });
      if (hit) {
        const t = g.invaders.find((x) => x.id === iv.id);
        if (t) {
          t.type = 'hidden';
          n += 1;
        }
      }
    });
    if (n) {
      pushLog(
        g,
        `${n} virus(es) <b>hid inside a cell</b> — antibodies can no longer touch them. The Killer T-Cell (never misses) or the NK Cell (d6 3+) must kill the infected cell.`,
        'bad',
      );
    }
    snap('Viruses hide', dice);
  }

  // 2b) TOXIN EMISSION. NOTE the snap is unconditional inside the flag guard: a frame is pushed
  //     every turn toxins are enabled, emitted or not. Frame count is compared.
  if (g.flags.toxins) {
    g.invaders
      .filter((iv) => iv.type === 'bacteria' && !iv.tagged && TOXIN_MAKERS[iv.disease])
      .forEach((iv) => {
        iv.age = (iv.age || 0) + 1;
        if ((iv.age || 0) >= TOXIN_AFTER && !iv.emitted) {
          iv.emitted = true;
          // The filter above is `TOXIN_MAKERS[iv.disease]` truthy, so this cannot miss.
          const tname = TOXIN_MAKERS[iv.disease] ?? '';
          g.invaders.push({
            id: uid(),
            type: 'toxin',
            zone: iv.zone,
            lane: iv.lane,
            organ: iv.organ,
            step: iv.step,
            tagged: false,
            disease: tname,
            hp: 1,
            maxhp: 1,
            stage: null,
            age: 0,
          } as Invader);
          pushLog(
            g,
            `The ${iv.disease} you left alive has started releasing <b>${tname}</b>! A toxin is not alive — only antibodies can neutralise it.`,
            'bad',
          );
        }
      });
    snap('Toxin released');
  }

  // 2c) MALARIA — hiding inside liver cells, then bursting into the blood.
  if (g.flags.malaria) {
    const burst: Invader[] = [];
    g.invaders
      .filter((iv) => iv.type === 'malaria' && iv.stage === 'liver' && (iv.embed ?? 0) > 0)
      .forEach((iv) => {
        iv.embed = (iv.embed ?? 0) - 1;
        if ((iv.embed ?? 0) <= 0) burst.push(iv);
      });
    burst.forEach((iv) => {
      g.invaders = g.invaders.filter((x) => x.id !== iv.id);
      for (let k = 0; k < 3; k += 1) {
        g.invaders.push({
          id: uid(),
          type: 'malaria',
          stage: 'blood',
          zone: 'hub',
          lane: iv.lane,
          organ: null,
          step: 0,
          tagged: false,
          disease: 'Malaria (blood)',
          hp: 1,
          maxhp: 1,
          age: 0,
          embed: 0,
        } as Invader);
      }
      pushLog(
        g,
        `<b>Malaria burst out of the liver</b> — 3 blood-stage parasites are now in the bloodstream. NOW antibodies work on them.`,
        'bad',
      );
    });
    if (burst.length) snap('Malaria bursts');
  }

  // 2d) CHRONIC WORM DAMAGE — every lodged worm chews its organ on a countdown.
  {
    const bites: Invader[] = [];
    g.invaders
      .filter((iv) => iv.type === 'worm' && iv.lodged)
      .forEach((iv) => {
        iv.wormClock = (iv.wormClock || WORM_DAMAGE_EVERY) - 1;
        if ((iv.wormClock ?? 0) <= 0) {
          iv.wormClock = WORM_DAMAGE_EVERY;
          const org = iv.organ ? g.organs[iv.organ] : undefined;
          if (org) {
            org.hp = Math.max(0, org.hp - 1);
            org.clear = 0;
            g.stats.organHits += 1;
            bites.push(iv);
            if (org.hp === 0 && !org.failed) {
              org.failed = true;
              g.stats.failures.push(iv.organ as OrganKey);
            }
          }
        }
      });
    bites.forEach((iv) => {
      const org = g.organs[iv.organ as string];
      pushLog(
        g,
        `<b>${iv.disease}</b> is still feeding in your ${ORGANS[iv.organ as OrganKey].name} — integrity ${org?.hp}/${org?.max}. Kill it to stop the bleeding.`,
        'bad',
      );
    });
    if (bites.length) snap('Worms feed');
  }

  // 2e) LYMPHATIC SPREAD (HARD ONLY) — pathogens use the lymph system the way your cells do.
  //     NOTE this filter has no TYPE clause. Worms are safe from it only because makeInvader
  //     always places them on a branch — docs/FINDINGS.md #14, pinned in invariants.test.ts.
  if (g.difficulty === 'hard') {
    const hoppers = g.invaders.filter(
      (iv) =>
        iv.zone === 'route' &&
        iv.step === LYMPH_STEP &&
        !iv.tagged &&
        !iv.lodged &&
        iv.type !== 'malaria' &&
        iv.lane &&
        lymphPartners(iv.lane).length,
    );
    const seeded: Invader[] = [];
    hoppers.forEach((iv) => {
      if (d6() <= 2) {
        const partners = lymphPartners(iv.lane as RouteKey);
        const to = partners[Math.floor(Math.random() * partners.length)];
        seeded.push({ ...clone(iv), id: uid(), lane: to, step: LYMPH_STEP } as Invader);
      }
    });
    if (seeded.length) {
      g.invaders.push(...seeded);
      pushLog(
        g,
        `<b>Lymphatic spread!</b> ${seeded.length} infection(s) travelled through the lymph system into a neighbouring region. The lymphatics are not only your highway — germs ride them too.`,
        'bad',
      );
      snap('Lymphatic spread');
    }
  }

  // 3) MARCH — route -> hub -> (roll organ) -> branch -> organ. Fever can freeze it.
  const arrivals: Invader[] = [];
  if (g.fx && g.fx.skipMarch) {
    pushLog(g, `Fever holds the invaders — no advance this turn.`, 'good');
    snap('Fever');
  } else {
    g.invaders.forEach((iv) => {
      if (iv.type === 'malaria' && iv.stage === 'liver' && (iv.embed ?? 0) > 0) return;
      if (iv.lodged) return; // a lodged worm stays put and does chronic damage instead
      iv.justEnteredHub = false; // clear the arrival flag — this turn it may leave the blood
      const steps = invSpeed(g, iv);
      for (let k = 0; k < steps; k += 1) {
        if (arrivals.includes(iv)) break;
        if (iv.zone === 'route') {
          iv.step -= 1;
          if (iv.step <= 0) {
            iv.zone = 'hub';
            iv.step = 0;
            // ENTERING the bloodstream ends movement this turn — the hub is a real stop where
            // circulating defenders (and complement) get their shot. Without this a fast
            // pathogen would pass straight through the blood into an organ, untargetable.
            iv.justEnteredHub = true;
            break;
          }
        } else if (iv.zone === 'hub') {
          const o = rollOrgan(g, iv);
          iv.zone = 'branch';
          iv.organ = o;
          iv.step = branchLen(o);
          pushLog(
            g,
            `<b>${iv.disease}</b> left the bloodstream toward the <b>${ORGANS[o].name}</b>.`,
            'bad',
          );
        } else if (iv.zone === 'branch') {
          iv.step -= 1;
          if (iv.step <= 0) {
            arrivals.push(iv);
            break;
          }
        }
      }
    });
  }
  snap('The march');

  const tally = (iv: Invader): string =>
    iv.type === 'bacteria' ? (iv.tagged ? 'bacteriaTagged' : 'bacteriaUntagged') : iv.type;

  // FINDINGS.md #3: `arrivals` is initialised with four keys but indexed by raw invader type, so
  // worm/toxin/venom/fungus/malaria/parasite create NaN here. Reproduced deliberately — the
  // addition below is `undefined + 1` for those, exactly as legacy's `++` is.
  arrivals.forEach((iv) => {
    const k = tally(iv);
    // FIXED — docs/FINDINGS.md #3. Was `undefined + 1` -> NaN for every non-bacterial type,
    // because `arrivals` is initialised with only four keys while `tally` returns the raw
    // invader type. Ported bug-for-bug through B1-B7 and corrected here, on its own, once
    // equivalence had been proven.
    g.stats.arrivals[k] = (g.stats.arrivals[k] ?? 0) + 1;
  });

  // 4) Resident macrophages are player-controlled and no longer engulf automatically.

  // 4b) MALARIA reaching the LIVER hides INSIDE liver cells instead of damaging it.
  if (g.flags.malaria) {
    arrivals
      .filter((iv) => iv.type === 'malaria' && iv.stage === 'sporozoite' && iv.organ !== 'liver')
      .forEach((iv) => {
        iv.stage = 'blood'; // never reached the liver — merozoites in the blood now
        pushLog(
          g,
          `<b>${iv.disease}</b> is now circulating in the blood. Antibodies and the Monocyte can reach it.`,
          'bad',
        );
      });
    const embed = arrivals.filter(
      (iv) =>
        iv.type === 'malaria' &&
        (iv.stage === 'liver' || iv.stage === 'sporozoite') &&
        iv.organ === 'liver',
    );
    embed.forEach((iv) => {
      iv.stage = 'liver';
      iv.embed = MALARIA_LIVER_TURNS;
      iv.step = 0;
      const i = arrivals.indexOf(iv);
      if (i >= 0) arrivals.splice(i, 1);
      g.rare.malariaLiver = true;
      pushLog(
        g,
        `<b>Malaria slipped inside your liver cells.</b> Antibodies cannot touch it in there — only the Killer T-Cell or the NK Cell can. It will burst out in ${MALARIA_LIVER_TURNS} turns.`,
        'bad',
      );
    });
    if (embed.length) snap('Malaria hides in the liver');
  }

  // 4c) KALA-AZAR — it does not damage the organ; it INFECTS the organ's macrophage.
  if (g.flags.specials) {
    const hide = arrivals.filter(
      (iv) =>
        iv.hidesInMac && iv.organ && g.residents[iv.organ] && !g.residents[iv.organ]?.infectedBy,
    );
    hide.forEach((iv) => {
      const r = g.residents[iv.organ as string];
      if (!r) return;
      r.infectedBy = iv.id;
      iv.step = 0;
      iv.inMac = true;
      const i = arrivals.indexOf(iv);
      if (i >= 0) arrivals.splice(i, 1);
      pushLog(
        g,
        `<b>${iv.disease} has moved INSIDE your ${RESIDENT_NAME[iv.organ as OrganKey]}.</b> Your own defender cell is now the parasite's house — it can no longer eat anything. Kill the parasite to free it.`,
        'bad',
      );
    });
    if (hide.length) snap('Kala-azar hides inside a macrophage');
  }

  // 4d) WORMS LODGE — a worm does not hit and vanish. It embeds and causes SLOW, CHRONIC damage
  //     for as long as it is left alive, which is what parasitic worms really do.
  const wormLodge = arrivals.filter((iv) => iv.type === 'worm');
  wormLodge.forEach((iv) => {
    iv.lodged = true;
    iv.step = 0;
    iv.wormClock = WORM_DAMAGE_EVERY; // grace: the first chronic bite is a full clock away
    const i = arrivals.indexOf(iv);
    if (i >= 0) arrivals.splice(i, 1); // remove from the one-time-hit list
    const org = g.organs[iv.organ as string];
    if (org) {
      org.clear = 0;
      pushLog(
        g,
        `<b>${iv.disease} has lodged in your ${ORGANS[iv.organ as OrganKey].name}.</b> A worm does not pass through — it settles in and feeds, chewing the organ a little more every few turns until you kill it. You have a short while before it starts to bite. Coat it, then the Eosinophil strikes — or Degranulates for the kill.`,
        'bad',
      );
    }
  });
  if (wormLodge.length) snap('Worms lodge in the tissue');

  // 5) ORGAN DAMAGE
  arrivals.forEach((iv) => {
    const k = tally(iv);
    // FIXED alongside `arrivals` above — docs/FINDINGS.md #3.
    g.stats.gotThrough[k] = (g.stats.gotThrough[k] ?? 0) + 1;
    const org = g.organs[iv.organ as string];
    if (!org) return;
    org.hp = Math.max(0, org.hp - 1);
    org.clear = 0;
    g.stats.organHits += 1;
    g.invaders = g.invaders.filter((x) => x.id !== iv.id);
    if (/Influenza/.test(iv.disease) && iv.organ === 'lungs') g.rare.seen.fluInLungs = true;
    if (iv.amnesia && g.flags.specials && g.presentations > 0) {
      g.presentations = 0;
      pushLog(
        g,
        `<b>IMMUNE AMNESIA.</b> Measles has wiped out your immune memory — every antigen you had learned is GONE. Antibody production drops back to the beginning. This really happens.`,
        'bad',
      );
    }
    pushLog(
      g,
      `<b>${iv.disease}</b> infected the <b>${ORGANS[iv.organ as OrganKey].name}</b> — integrity ${org.hp}/${org.max}.`,
      'bad',
    );
    if (org.hp === 0 && !org.failed) {
      org.failed = true;
      g.stats.failures.push(iv.organ as OrganKey);
    }
  });
  if (arrivals.length) snap('Organ damage');

  // 6) LOSS — any organ failed.
  const failed = g.organList.find((o) => (g.organs[o]?.hp ?? 1) <= 0);
  if (failed) {
    g.lost = { organ: failed, turn: g.turn, disease: null };
    pushLog(g, `<b>${ORGANS[failed].name} failure.</b> The body has fallen.`, 'bad');
    snap('Organ failure');
    return frames;
  }

  // 7) WIN / LOSS on the clearance model. No auto-win at turn N: after the onslaught window
  //    closes no new infections arrive, and you WIN only once the body is completely clear.
  //    Backstop: not clear by turn N + GRACE_CLEAR and the immune system is exhausted.
  if (g.turn > g.maxTurn && g.everInfected) {
    if (g.invaders.length === 0) {
      g.won = true;
      pushLog(g, `Every infection faced and the body is completely clear — you win!`, 'good');
      snap('Victory');
      return frames;
    }
    if (g.turn >= g.maxTurn + GRACE_CLEAR) {
      g.lost = { organ: null, turn: g.turn, disease: null, reason: 'attrition' };
      pushLog(
        g,
        `The body could not be cleared of infection in time — the immune system is exhausted. Defeat.`,
        'bad',
      );
      snap('Defeat');
      return frames;
    }
  }

  // 8) END-OF-TURN UPKEEP
  if (kidneyLeak(g)) {
    const pools = [...FAM_KEYS, 'X'].filter((f) => (g.ab[f] ?? 0) > 0);
    if (pools.length) {
      const f = pools.sort((a, b) => (g.ab[b] ?? 0) - (g.ab[a] ?? 0))[0] as string;
      // `pools` was filtered on (g.ab[f] ?? 0) > 0, so this pool is present and positive. Read
      // it rather than re-index and hope.
      const leaked = g.ab[f] ?? 0;
      g.ab[f] = leaked - 1;
      pushLog(g, `Damaged kidneys leaked a <b>${f}</b> antibody into the urine.`, 'bad');
    }
  }

  // Organ convalescence. On HARD, lost integrity is PERMANENT — an organ never regrows hit
  // points. What DOES lift, after a few clear turns, is the FUNCTIONAL penalty, as the tissue
  // compensates. On Normal/Training the organ can also regrow integrity.
  const regrows = g.difficulty !== 'hard';
  g.organList.forEach((o) => {
    const org = g.organs[o];
    if (!org) return;
    const dirty = g.invaders.some((iv) => iv.zone === 'branch' && iv.organ === o);
    if (dirty) {
      org.clear = 0;
      org.compensated = false;
      return;
    }
    org.clear = (org.clear || 0) + 1;
    if (regrows && org.hp < org.max && org.clear >= HEAL_AFTER) {
      org.hp += 1;
      org.clear = 0;
      pushLog(
        g,
        `The <b>${ORGANS[o].name}</b> recovered — integrity ${org.hp}/${org.max}.`,
        'good',
      );
    } else if (!regrows && org.hp < org.max && !org.compensated && org.clear >= HEAL_AFTER) {
      org.compensated = true; // the damage stays, but the body adapts around it
      pushLog(
        g,
        `The <b>${ORGANS[o].name}</b> is scarred (integrity stays ${org.hp}/${org.max}) but the body has <b>compensated</b> — its penalty no longer applies.`,
        'good',
      );
    }
  });

  const next = g.turn + 1;
  const eo = g.cells.eosinophil;
  if (eo && !eo.alive && next >= (eo.regenAt as number)) {
    Object.assign(eo, {
      alive: true,
      regenAt: null,
      zone: 'hub',
      lane: null,
      organ: null,
      step: 0,
    });
    pushLog(g, `<b>Eosinophil</b> regenerated — new granules loaded.`, 'good');
  }
  const n = g.cells.neutrophil;
  if (n && !n.alive && !marrowBroken(g) && next >= (neutrophilReadyTurn(g) as number)) {
    Object.assign(n, { alive: true, regenAt: null, zone: 'hub', lane: null, organ: null, step: 0 });
    pushLog(g, `<b>Neutrophil</b> regenerated from the bone marrow.`, 'good');
  }

  if (g.fx) {
    if (g.suppress.neutrophil > 0) g.suppress.neutrophil -= 1;
    if (g.suppress.tcell > 0) g.suppress.tcell -= 1;
    if (g.fx.capTurns > 0) g.fx.capTurns -= 1;
    g.fx.noProduce = false;
    g.fx.apMod = 0;
    g.fx.skipMarch = false;
  }

  checkRareTriggers(g);
  g.rare.killedThisTurn = 0;
  g.turn = next;
  g.phase = 'infection';
  g.drawn = null;
  g.drawnList = [];
  if (g.cells.macrophage) g.cells.macrophage.freeEngulf = true;

  // A one-shot rare event has already done its damage. Clear the banner after a couple of turns
  // so it does not linger implying an ongoing effect that has actually ended.
  if (g.rareBanner && g.rareBanner.firedTurn != null && g.turn - g.rareBanner.firedTurn >= 2) {
    g.rareBanner = null;
  }
  if (g.cells.helper) g.cells.helper.usedThisTurn = false;
  g.free = {};
  g.wormsThisTurn = 0;
  for (const o in g.residents) {
    const r = g.residents[o];
    if (r) r.ate = false; // each resident may engulf once (free) per turn
  }
  fireTurnStart(g);
  snap('Next turn');
  return frames;
}
