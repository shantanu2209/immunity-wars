/**
 * THE EFFECTS IN FORCE (S25 items 5 and 7, ruled 4 September 2026) — every persistent effect
 * the engine tracks that a player could not see, as chips for a strip at the top of the play
 * surface, each saying what it is doing and for how long. The sweep that produced this list
 * is in for-P2.5.md ("Item 5"): crisis effects with their durations (the session's `effects`
 * summary of the `fx` the view drops), cells offline, organ damage (permanent — the organ's
 * own effect text from content), the lymphatics blocked, HIV, the Helper T unprimed, a
 * parasite inside a resident, next turn's forecast, a rare event's banner, and the arrival
 * window closed with the deadline to clear the body (item 7's banner — the numbers come from
 * the view and content, never a difficulty's literals).
 *
 * Pure: a function of the view. Legality is not decided here; this is state made visible.
 */
import { GRACE_CLEAR, ORGANS } from '@immunity-wars/content';
import type { SessionView, ViewState } from '@immunity-wars/session';

import { t } from '../i18n';
import { residentDisplayName } from '../names';

export interface EffectChip {
  id: string;
  /** bad = a penalty in force; good = a boost; info = a state to know; permanent = organ damage. */
  kind: 'bad' | 'good' | 'info' | 'permanent';
  text: string;
  /** Localised duration, or null when the text already says it. */
  duration: string | null;
  /** A muted second line: the event's own why, or an organ's "when damaged" column. */
  detail?: string | null;
}

/**
 * WHICH CHIPS AN EVENT'S BANNER IS ALREADY SAYING (S25 second pass, 5 September 2026: two
 * banners both about antibody shortage). The engine sets the event's `fx` AND its banner in the
 * same draw, so the strip showed the effect chip and the banner chip for one event. One
 * effect, one chip: the banner folds into the chip its event produced — the event's name
 * becomes the chip's text and its `why` the detail — and the banner chip is shown only for an
 * event with no chip of its own (co-infection, passive antibodies). Fever is the one event
 * with two effects, and it keeps two chips because they are two effects: the invaders slowed
 * (good) and an Action Point lost (bad). Map from the engine's `applyEvent` (construct.ts).
 */
const EVENT_CHIPS: Readonly<Record<string, readonly string[]>> = {
  immunosuppression: ['noProduce'],
  neutropenia: ['neutrophilOffline'],
  lymphopenia: ['tcellOffline'],
  antibodyShortage: ['capTurns'],
  fatigue: ['apDown'],
  surge: ['apUp'],
  fever: ['skipMarch', 'apDown'],
};

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const turnsLeft = (n: number): string =>
  n === 1 ? t('effects.oneTurnLeft') : t('effects.turnsLeft', { n });

export function effectChips(view: SessionView): EffectChip[] {
  const g = view.game;
  const out: EffectChip[] = [];
  const fx = view.queries.effects;
  const state = view.queries.state;

  // Item 7: the arrival window closed — the deadline from the view and content.
  const turn = num(g['turn']);
  const maxTurn = num(g['maxTurn']);
  if (maxTurn > 0 && turn > maxTurn) {
    out.push({
      id: 'window',
      kind: 'info',
      text: t('effects.windowClosed', { last: maxTurn + GRACE_CLEAR }),
      duration: null,
    });
  }

  // Crisis effects in force (the session's summary of fx).
  if (fx.noProduce)
    out.push({
      id: 'noProduce',
      kind: 'bad',
      text: t('effects.noProduce'),
      duration: t('effects.thisTurn'),
    });
  if (fx.capTurns > 0)
    out.push({
      id: 'capTurns',
      kind: 'bad',
      text: t('effects.capTurns'),
      duration: turnsLeft(fx.capTurns),
    });
  if (fx.apMod < 0)
    out.push({
      id: 'apDown',
      kind: 'bad',
      text: t('effects.apDown', { n: -fx.apMod }),
      duration: t('effects.thisTurn'),
    });
  if (fx.apMod > 0)
    out.push({
      id: 'apUp',
      kind: 'good',
      text: t('effects.apUp', { n: fx.apMod }),
      duration: t('effects.thisTurn'),
    });
  if (fx.skipMarch)
    out.push({
      id: 'skipMarch',
      kind: 'good',
      text: t('effects.skipMarch'),
      duration: t('effects.thisTurn'),
    });

  // Cells offline.
  const sup = (g['suppress'] as Record<string, unknown> | undefined) ?? {};
  if (num(sup['neutrophil']) > 0)
    out.push({
      id: 'neutrophilOffline',
      kind: 'bad',
      text: t('effects.neutrophilOffline'),
      duration: turnsLeft(num(sup['neutrophil'])),
    });
  if (num(sup['tcell']) > 0)
    out.push({
      id: 'tcellOffline',
      kind: 'bad',
      text: t('effects.tcellOffline'),
      duration: turnsLeft(num(sup['tcell'])),
    });

  // Organ damage — permanent, with the organ's own effect text (content). Hard's compensated
  // marrow lifts the functional penalty, and the engine reads `compensated` for that.
  const organs = (g['organs'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  for (const [o, organ] of Object.entries(organs)) {
    if (num(organ['hp']) >= num(organ['max'])) continue;
    if (g['difficulty'] === 'hard' && organ['compensated'] === true) continue;
    const def = (ORGANS as Record<string, { name?: string; effect?: string } | undefined>)[o];
    // The organ's `effect` is the rulebook's "when damaged" COLUMN — a table cell, not a
    // clause ("None — but fragile & slow to defend"), so it is rendered as a labelled value,
    // never spliced into a sentence that assumed a clause (S25 second pass: "Brain damaged —
    // None — but…" did not parse). The class is recorded in for-P2.5.md.
    out.push({
      id: `organ:${o}`,
      kind: 'permanent',
      text: t('effects.organDamaged', { organ: def?.name ?? o }),
      duration: t('effects.permanent'),
      detail: def?.effect ? t('effects.organEffect', { effect: def.effect }) : null,
    });
  }

  // Whole-body states the queries answer.
  if (state['lymphBlocked'] === true)
    out.push({ id: 'lymphBlocked', kind: 'bad', text: t('effects.lymphBlocked'), duration: null });
  if (state['hivActive'] === true)
    out.push({ id: 'hiv', kind: 'bad', text: t('effects.hiv'), duration: null });
  const flags = (g['flags'] as Record<string, unknown> | undefined) ?? {};
  if (flags['helperT'] === true && flags['dendritic'] === true && num(g['presentations']) === 0)
    out.push({
      id: 'helperUnprimed',
      kind: 'info',
      text: t('effects.helperUnprimed'),
      duration: null,
    });

  // A parasite inside a resident.
  const residents = (g['residents'] as Record<string, Record<string, unknown>> | undefined) ?? {};
  for (const [o, r] of Object.entries(residents)) {
    if (r['infectedBy'] !== null && r['infectedBy'] !== undefined) {
      out.push({
        id: `resident:${o}`,
        kind: 'bad',
        text: t('effects.residentInfected', { name: residentDisplayName(o) }),
        duration: null,
      });
    }
  }

  // This turn's crisis event, next turn's forecast, a rare event — the content's own words.
  const banner = g['banner'] as {
    key?: unknown;
    name?: unknown;
    bad?: unknown;
    why?: unknown;
  } | null;
  if (banner && typeof banner.name === 'string') {
    const folded = EVENT_CHIPS[typeof banner.key === 'string' ? banner.key : ''] ?? [];
    const why = typeof banner.why === 'string' ? banner.why : null;
    const carriers = out.filter((c) => folded.includes(c.id));
    if (carriers.length > 0) {
      // The event's own chip(s) say it: name on the chip, why beneath, no second banner.
      for (const c of carriers) {
        c.text = `${banner.name} ${t('inspect.sep')} ${c.text}`;
        c.detail = why;
      }
    } else {
      out.push({
        id: 'banner',
        kind: banner.bad === true ? 'bad' : 'good',
        text: banner.name,
        duration: null,
        detail: why,
      });
    }
  }
  const warning = g['warning'] as { name?: unknown; text?: unknown } | null;
  if (warning && typeof warning.name === 'string') {
    // The same class as the organ column: `tell` is empty for three events, and a template
    // that assumed it would be filled would print a dangling dash. Only bad events forecast,
    // and every bad event has a tell today — the guard is for the shape, not today's data.
    const text =
      typeof warning.text === 'string' && warning.text.trim() !== '' ? warning.text : null;
    out.push({
      id: 'forecast',
      kind: 'info',
      text: t('effects.forecast', { name: warning.name }),
      duration: null,
      detail: text,
    });
  }
  const rare = g['rareBanner'] as { name?: unknown; why?: unknown } | null;
  if (rare && typeof rare.name === 'string')
    out.push({
      id: 'rare',
      kind: 'bad',
      text: rare.name,
      duration: null,
      detail: typeof rare.why === 'string' && rare.why.trim() !== '' ? rare.why : null,
    });

  return out;
}

/** The turn line for the shell: "Turn 3 of 15" inside the arrival window, the countdown after. */
export function turnLine(g: ViewState): string {
  const turn = num(g['turn']);
  const maxTurn = num(g['maxTurn']);
  if (maxTurn > 0 && turn > maxTurn) {
    return t('play.turnClear', { n: turn, k: maxTurn + GRACE_CLEAR - turn });
  }
  return t('play.turnOf', { n: turn, max: maxTurn });
}
