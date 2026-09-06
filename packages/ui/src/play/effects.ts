/**
 * THE EFFECTS IN FORCE (S25 items 5 and 7, ruled 4 September 2026; SWEPT 6 September 2026) —
 * chips for a strip at the top of the play surface, each saying what is happening and for how
 * long.
 *
 * WHAT SURVIVES THE SWEEP, and the rule it applied (Shantanu, 6 September 2026: "do not show a
 * cause as a banner; show the effect where the number appears, and let the player drill into
 * the number"): a chip stays only for something happening NOW that counts down or ends by the
 * player's action — this turn's crisis effects with the event's name and why, the two- and
 * three-turn effects counting down, next turn's forecast, a memory response ready, a rare
 * event for the one turn after it fired, and the arrival window's closing (ruled a banner, not
 * a dialog). Every permanent or indefinite STATE came out: organ damage (the pips are the
 * surface; "When damaged" lives one tap in), the lymphatics blocked (the selected cell's line
 * says why there is no shortcut), HIV (the Helper's own chip and line, where the Helper is
 * described), the Helper primed or unprimed (the production breakdown lists it), an infected
 * resident (its own dimmed chip and reason), and the AP modifiers (the AP figure now drills
 * into its terms, the engine's `apBreakdown`). The record is in for-P2.5.md.
 *
 * Pure: a function of the view. Legality is not decided here; this is state made visible.
 */
import { GRACE_CLEAR, ORGANS } from '@immunity-wars/content';
import type { SessionView, ViewState } from '@immunity-wars/session';

import { t } from '../i18n';

export interface EffectChip {
  id: string;
  /** bad = a penalty in force; good = a boost; info = a state to know. */
  kind: 'bad' | 'good' | 'info';
  text: string;
  /** Localised duration, or null when the text already says it. */
  duration: string | null;
  /** A muted second line: the event's own why, or the forecast's tell. */
  detail?: string | null;
  /** The crisis event this chip carries (its name), when the banner folded into it. */
  event?: string;
}

/**
 * WHICH CHIPS AN EVENT'S BANNER IS ALREADY SAYING (S25 second pass, 5 September 2026: two
 * banners both about antibody shortage). The engine sets the event's `fx` AND its banner in the
 * same draw, so the strip showed the effect chip and the banner chip for one event. One
 * effect, one chip: the banner folds into the chip its event produced — the event's name
 * becomes the chip's text and its `why` the detail — and the banner chip is shown only for an
 * event with no chip of its own (co-infection, passive antibodies, and since the 6 September
 * sweep fatigue and surge, whose AP change is read off the AP figure's own breakdown). Fever
 * folds into the one effect it still has a chip for, the march skipped. Map from the engine's
 * `applyEvent` (construct.ts).
 */
const EVENT_CHIPS: Readonly<Record<string, readonly string[]>> = {
  immunosuppression: ['noProduce'],
  neutropenia: ['neutrophilOffline'],
  lymphopenia: ['tcellOffline'],
  antibodyShortage: ['capTurns'],
  fever: ['skipMarch'],
};

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const turnsLeft = (n: number): string =>
  n === 1 ? t('effects.oneTurnLeft') : t('effects.turnsLeft', { n });

export function effectChips(view: SessionView): EffectChip[] {
  const g = view.game;
  const out: EffectChip[] = [];
  const fx = view.queries.effects;

  // Item 7: the arrival window closed — the deadline from the view and content. A banner, not
  // a dialog (ruled 6 September 2026): it changes the goal, not what the player can do now.
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

  // A memory response ready: a pathogen the body remembers is in the body. Happening now and
  // ended by the player's action; the board's ring says the same, and nothing else does (the
  // body panel's duplicate line came out in the 6 September sweep).
  const remembered = [
    ...new Set(
      ((g['invaders'] as { remembered?: unknown; disease?: unknown }[] | undefined) ?? [])
        .filter((iv) => iv.remembered === true)
        .map((iv) => String(iv.disease ?? '')),
    ),
  ];
  if (remembered.length > 0)
    out.push({
      id: 'memoryReady',
      kind: 'good',
      text: t('effects.memoryReady', { list: remembered.join(', ') }),
      duration: null,
      detail:
        g['difficulty'] === 'hard' ? t('effects.memoryReadyHard') : t('effects.memoryReadyFree'),
    });

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
      // The event's own chip(s) say it: name on the chip, why beneath, no second banner. When
      // the effect's own text already opens with the event's name ("Immunosuppression: no
      // antibodies can be made") the name is not doubled in front of it — found 6 September
      // 2026 by the reveal's crisis test, which read "Immunosuppression · Immunosuppression: …".
      for (const c of carriers) {
        c.event = banner.name;
        if (!c.text.startsWith(banner.name))
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
        event: banner.name,
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
  // A rare event fires at the END of a spread, so the turn it belongs to is the one after
  // `firedTurn`. It is a chip for that one turn (the sweep's rule: happening now), and the log
  // keeps it for the game — see `rareLogLine`.
  const rare = g['rareBanner'] as { name?: unknown; why?: unknown; firedTurn?: unknown } | null;
  if (rare && typeof rare.name === 'string' && turn - num(rare.firedTurn) <= 1)
    out.push({
      id: 'rare',
      kind: 'bad',
      text: rare.name,
      duration: null,
      detail: typeof rare.why === 'string' && rare.why.trim() !== '' ? rare.why : null,
    });

  return out;
}

/**
 * THE RARE EVENT'S LOG LINE (found by the 6 September sweep): the engine's `fireRare` sets the
 * banner and writes NO log line, so once its chip retires the event has no trace. Kartik's why
 * for a rare event is his best teaching text, so the UI authors one entry for the log from
 * the content's own words, dated to the turn it fired. Null when no rare event has fired.
 */
export function rareLogLine(g: ViewState): { t: number; text: string; kind: string } | null {
  const rare = g['rareBanner'] as { name?: unknown; why?: unknown; firedTurn?: unknown } | null;
  if (!rare || typeof rare.name !== 'string') return null;
  const why = typeof rare.why === 'string' && rare.why.trim() !== '' ? ` ${rare.why}` : '';
  return {
    t: num(rare.firedTurn),
    text: `${t('log.rareEvent', { name: rare.name })}${why}`,
    kind: 'bad',
  };
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

/**
 * THE ACTION POINT FIGURE'S DRILL-IN (6 September 2026): the engine's `apBreakdown` terms as
 * localised lines, in the engine's order, ending with the total. Nothing is computed here —
 * each line names a term and its signed delta; the sum is the engine's, asserted on the corpus.
 * The crisis term is named after this turn's event when the view carries the banner.
 */
export function apTermLines(view: SessionView): { text: string; delta: number }[] {
  const g = view.game;
  const banner = g['banner'] as { name?: unknown } | null;
  const organName = (o: string): string =>
    String((ORGANS as Record<string, { name?: unknown } | undefined>)[o]?.name ?? o);
  return view.queries.ap.terms.map((term) => {
    switch (term.kind) {
      case 'base':
        return { text: t('ap.base', { n: term.delta }), delta: term.delta };
      case 'drain':
        return { text: t('ap.drain', { disease: term.disease ?? '' }), delta: term.delta };
      case 'organ':
        return { text: t('ap.organ', { organ: organName(term.organ ?? '') }), delta: term.delta };
      case 'event':
        return {
          text:
            banner && typeof banner.name === 'string'
              ? t('ap.eventNamed', { name: banner.name })
              : t('ap.event'),
          delta: term.delta,
        };
      case 'floor':
        return { text: t('ap.floor'), delta: term.delta };
      default:
        return { text: t('ap.event'), delta: term.delta };
    }
  });
}
