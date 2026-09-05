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
}

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
    out.push({
      id: `organ:${o}`,
      kind: 'permanent',
      text: t('effects.organDamaged', { organ: def?.name ?? o, effect: def?.effect ?? '' }),
      duration: t('effects.permanent'),
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
  const banner = g['banner'] as { name?: unknown; bad?: unknown; why?: unknown } | null;
  if (banner && typeof banner.name === 'string')
    out.push({
      id: 'banner',
      kind: banner.bad === true ? 'bad' : 'good',
      text: `${banner.name}${typeof banner.why === 'string' ? ` — ${banner.why}` : ''}`,
      duration: null,
    });
  const warning = g['warning'] as { name?: unknown; text?: unknown } | null;
  if (warning && typeof warning.name === 'string')
    out.push({
      id: 'forecast',
      kind: 'info',
      text: t('effects.forecast', {
        name: warning.name,
        text: typeof warning.text === 'string' ? warning.text : '',
      }),
      duration: null,
    });
  const rare = g['rareBanner'] as { name?: unknown; why?: unknown } | null;
  if (rare && typeof rare.name === 'string')
    out.push({
      id: 'rare',
      kind: 'bad',
      text: `${rare.name}${typeof rare.why === 'string' ? ` — ${rare.why}` : ''}`,
      duration: null,
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
