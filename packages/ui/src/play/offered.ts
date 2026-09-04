/**
 * OFFERED ACTIONS — the one place the UI decides what is legal, and it only READS the view.
 *
 * The standing rule (Shantanu, 4 September 2026): offer only legal targets from the view's
 * queries, so rejections are rare because illegal options are not offered. This module is the
 * whole of that rule in code. Nothing else in `packages/ui` decides whether an action may be
 * sent; components render what this returns and dispatch what it prepared.
 *
 * TWO SOURCES, designed at CP1 so CP4 does not rebuild it (COMMAND_SURFACE_PLAN §3.3):
 *   - `cell`: the selected cell's offers — its legal moves and the attacks its queries answer.
 *   - `body`: offers that belong to the body, not a cell, shown while NOTHING is selected —
 *     the memory response on a remembered pathogen, an antivenom dose on a venom (CP4). Empty
 *     until then; the code path exists and the shell renders it identically.
 *
 * TWO SHAPES:
 *   - `board`: positioned targets — a MOVE at a node, or an ATTACK on an invader. Several
 *     offers may point at one invader (the Eosinophil can strike OR degranulate); the shell
 *     acts directly when one offer is on the tapped pathogen and opens the sheet's precise
 *     rows when there are more.
 *   - `buttons`: offers with no position, or where the engine picks the target itself (`net`
 *     nets the whole swarm the Neutrophil stands on). `place: 'panel'` sends a button to a
 *     panel instead of the bar — `produce` lives on the antibody panel's family rows.
 *
 * `reason` is the always-answers rule's other half, held to CP1's standard: it names what the
 * cell CANNOT do here even when it can still move or produce — the test is whether the answer
 * helps, not whether an answer exists.
 *
 * Every offer carries the exact `params` the shell sends; a spanning test in the session suite
 * (`offered.test.ts`) replays recorded games and requires the engine to ACCEPT every offer
 * this module makes, with a deliberate over-offer as its negative control.
 */
import { LYMPH_GROUP, LYMPH_STEP, ROUTES, ROUTE_KEYS } from '@immunity-wars/content';
import type { SessionView, ViewState } from '@immunity-wars/session';

import type { Located } from '../board/Board';
import { t } from '../i18n';
import { residentDisplayName } from '../names';

/**
 * THE ONE MIRRORED RULE (FINDINGS #52): neutralising a toxin costs 2 AP, and the 2 is a
 * literal in `packages/engine/src/actions.ts`, not a content constant. Mirrored here so the
 * offer is withheld at 1 AP, and pinned by `tests/session/src/neutralise-cost.test.ts`, which
 * drives the engine directly: reject at NEUTRALISE_TOXIN_AP - 1, accept at NEUTRALISE_TOXIN_AP.
 * A WORKAROUND, not a design — Phase 3 moves the number to content and deletes this.
 */
export const NEUTRALISE_TOXIN_AP = 2;

export type OfferSource = 'cell' | 'body';

/**
 * The repositioning actions — the session's undo MOVE_CLASS, seen from the offer side. The
 * reason line is about ATTACKS: a cell that can only move, recall or patrol still gets told
 * what it cannot do here, so these do not count as "something was offered".
 */
const MOVE_LIKE: ReadonlySet<string> = new Set(['move', 'hop', 'recall', 'resmove']);

export interface BoardOffer {
  id: string;
  /**
   * `move` at a node; `hop` at the partner crossing of a lymph link (a move in every rule,
   * drawn in lymph blue because the board already teaches lymph in blue — ruling 3, CP3);
   * `attack` on an invader.
   */
  kind: 'move' | 'hop' | 'attack';
  action: string;
  /** The acting cell, or null for a body-level or RESIDENT offer. */
  cell: string | null;
  /** The acting resident's organ (CP3) — residents are keyed by organ, not by cell. */
  organ?: string;
  /** MOVE: where. */
  located?: Located;
  /** ATTACK: whom. */
  invaderId?: string;
  /** Localised, e.g. "Snipe Influenza". */
  label: string;
  /** Localised cost hint, e.g. "2 AP", or null when it costs the usual. */
  cost: string | null;
  /** Exactly what `sendAction` receives. */
  params: Record<string, unknown>;
}

export interface ButtonOffer {
  id: string;
  action: string;
  cell: string | null;
  organ?: string;
  label: string;
  params: Record<string, unknown>;
  /** Where the shell shows it: the command bar (default) or a panel. */
  place?: 'bar' | 'panel';
  /** For panel buttons: which family row. */
  family?: string;
}

export interface Offered {
  source: OfferSource;
  board: BoardOffer[];
  buttons: ButtonOffer[];
  /** Set when a cell is selected and no ATTACK is offered — muted beside a move/produce hint. */
  reason: string | null;
}

interface Invaderish {
  id?: unknown;
  disease?: unknown;
  type?: unknown;
  remembered?: unknown;
  novel?: unknown;
}

const EMPTY_CELL: Offered = { source: 'cell', board: [], buttons: [], reason: null };

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const ids = (xs: unknown): { id: string; disease: string }[] =>
  Array.isArray(xs)
    ? (xs as Invaderish[]).map((iv) => ({
        id: String(iv.id ?? ''),
        disease: String(iv.disease ?? ''),
      }))
    : [];

/** The engine's generic gate before any board action: AP left, or a free action for this cell. */
function canAct(g: ViewState, cell: string): boolean {
  const free = g['free'] as Record<string, unknown> | undefined;
  return num(g['ap']) > 0 || num(free?.[cell]) > 0;
}

function isSuppressed(g: ViewState, cell: string): boolean {
  const sup = g['suppress'] as Record<string, unknown> | undefined;
  return (cell === 'neutrophil' || cell === 'tcell') && num(sup?.[cell]) > 0;
}

function isSpent(g: ViewState, cell: string): boolean {
  const cells = g['cells'] as Record<string, { alive?: unknown }> | undefined;
  return cells?.[cell]?.alive === false;
}

/** Body-level offers while nothing is selected. CP1–2: none. CP4 adds memoryKill and antivenom. */
export function bodyOffers(_view: SessionView): Offered {
  return { source: 'body', board: [], buttons: [], reason: null };
}

/** Which antibody families the B-cell may produce right now, with the reason it may not. */
export function producibleFamilies(view: SessionView): {
  family: string;
  ok: boolean;
  why: 'blocked' | 'full' | 'clone' | null;
}[] {
  const g = view.game;
  const ab = (g['ab'] as Record<string, unknown> | undefined) ?? {};
  const caps = (view.queries.perFamily['capFam'] ?? {}) as Record<string, unknown>;
  const invaders = (g['invaders'] as Invaderish[] | undefined) ?? [];
  const out: { family: string; ok: boolean; why: 'blocked' | 'full' | 'clone' | null }[] = [];
  for (const [family, p] of Object.entries(view.queries.production)) {
    let why: 'blocked' | 'full' | 'clone' | null = null;
    if (p.blocked) why = 'blocked';
    else if (num(ab[family]) >= num(caps[family])) why = 'full';
    else if (
      family === 'X' &&
      !(g['cloneFound'] === true && invaders.some((iv) => iv.novel === true))
    )
      why = 'clone';
    out.push({ family, ok: why === null, why });
  }
  return out;
}

export function offeredActions(view: SessionView): Offered {
  const g = view.game;
  const cell = view.selection.cell;
  const resident = view.selection.resident;
  if (!cell && !resident) return bodyOffers(view);
  if (String(g['phase']) !== 'command') return { ...EMPTY_CELL, reason: t('selection.notCommand') };
  if (resident) return residentOffers(view, resident);
  if (!cell) return bodyOffers(view);
  if (isSpent(g, cell)) return { ...EMPTY_CELL, reason: t('selection.spent') };
  if (isSuppressed(g, cell)) return { ...EMPTY_CELL, reason: t('selection.offline') };

  const board: BoardOffer[] = [];
  const buttons: ButtonOffer[] = [];
  const state = view.queries.state;
  const perCell = view.queries.perCell;
  const ap = num(g['ap']);
  const act = canAct(g, cell);

  // MOVES — selection-scoped, already computed for exactly this cell.
  if (act) {
    for (const d of (view.scoped.moveDestinations ?? []) as Located[]) {
      board.push({
        id: `move:${String(d.zone)}:${String(d.lane ?? d.organ ?? '')}:${String(d.step ?? '')}`,
        kind: 'move',
        action: 'move',
        cell,
        located: d,
        label: t('action.move'),
        cost: null,
        params: { action: 'move', cell, zone: d.zone, lane: d.lane, organ: d.organ, step: d.step },
      });
    }

    // REPOSITIONING BEYOND MOVE (CP3). Both are engine gates read off the view: the B-cell is
    // stationary for both; recall needs the cell off the hub; hop needs lymphatics on and
    // unblocked, and the cell standing AT the crossing of a route that has a lymph link.
    const cells = g['cells'] as Record<string, Record<string, unknown>> | undefined;
    const c = cells?.[cell];
    if (cell !== 'bcell' && c) {
      if (c['zone'] !== 'hub') {
        buttons.push({
          id: 'recall',
          action: 'recall',
          cell,
          label: t('action.recall'),
          params: { action: 'recall', cell },
        });
      }
      const flags = g['flags'] as Record<string, unknown> | undefined;
      const lane = typeof c['lane'] === 'string' ? c['lane'] : null;
      if (
        flags?.['lymph'] === true &&
        state['lymphBlocked'] !== true &&
        c['zone'] === 'route' &&
        c['step'] === LYMPH_STEP &&
        lane !== null
      ) {
        for (const partner of lymphPartners(lane)) {
          board.push({
            id: `hop:${partner}`,
            kind: 'hop',
            action: 'hop',
            cell,
            located: { zone: 'route', lane: partner, step: LYMPH_STEP },
            label: `${t('action.hop')} ${routeName(partner)}`,
            cost: null,
            // The lane is passed explicitly: the engine falls back to its first partner
            // otherwise, and a ring on the Gut must not land the cell on the Contact route.
            params: { action: 'hop', cell, lane: partner },
          });
        }
      }
    }
  }

  const attack = (
    action: string,
    targets: { id: string; disease: string }[],
    cost: string | null,
  ): void => {
    for (const iv of targets) {
      board.push({
        id: `${action}:${iv.id}`,
        kind: 'attack',
        action,
        cell,
        invaderId: iv.id,
        label: `${t(`action.${action}`)} ${iv.disease}`,
        cost,
        params: { action, cell, invaderId: iv.id },
      });
    }
  };

  if (act) {
    switch (cell) {
      case 'macrophage':
        attack('engulf', ids(state['macrophageEatable']), null);
        attack('strike', ids(perCell['wormStrikeable']?.[cell]), null);
        break;
      case 'neutrophil':
        if (ids(state['netTargets']).length > 0) {
          buttons.push({
            id: 'net',
            action: 'net',
            cell,
            label: t('action.net'),
            params: { action: 'net', cell },
          });
        }
        break;
      case 'tcell':
        attack('snipe', ids(state['snipeTargets']), null);
        break;
      case 'nk': {
        const flags = g['flags'] as Record<string, unknown> | undefined;
        if (flags?.['nkCell'] === true) attack('nkkill', ids(state['nkTargets']), null);
        break;
      }
      case 'eosinophil': {
        const targets = ids(perCell['wormStrikeable']?.[cell]);
        attack('strike', targets, null);
        // Degranulate is gated on AP alone — the engine checks apNow < 2 before free actions.
        if (ap >= 2) attack('degranulate', targets, `2 ${t('commandBar.ap')}`);
        break;
      }
      case 'bcell': {
        // ANTIBODIES act at a distance: the B-cell never moves, its store reaches any
        // attackable pathogen. canTag / canNeutralise already include the store check.
        const invaders = (g['invaders'] as Invaderish[] | undefined) ?? [];
        const canTag = (view.queries.perInvader['canTag'] ?? []) as unknown[];
        const canNeut = (view.queries.perInvader['canNeutralise'] ?? []) as unknown[];
        const memory = (g['memory'] as Record<string, unknown> | undefined) ?? {};
        invaders.forEach((iv, i) => {
          const target = { id: String(iv.id ?? ''), disease: String(iv.disease ?? '') };
          if (canTag[i] === true) attack('tag', [target], null);
          if (canNeut[i] === true) {
            const toxin = iv.type === 'toxin';
            const remembered = iv.remembered === true || memory[target.disease] === true;
            const cost = toxin ? NEUTRALISE_TOXIN_AP : 1;
            // The engine waives the AP cost for a remembered pathogen (memory response).
            if (remembered || ap >= cost) {
              attack(
                'neutralise',
                [target],
                toxin && !remembered ? `${cost} ${t('commandBar.ap')}` : null,
              );
            }
          }
        });
        for (const f of producibleFamilies(view)) {
          if (!f.ok) continue;
          buttons.push({
            id: `produce:${f.family}`,
            action: 'produce',
            cell,
            label: `${t('action.produce')} ${f.family}`,
            params: { action: 'produce', family: f.family },
            place: 'panel',
            family: f.family,
          });
        }
        break;
      }
      default:
        break;
    }
  }

  // The reason names what the cell CANNOT do here even when it can still move or produce.
  // The shell shows it muted beside a hint and red when nothing at all is offered.
  const canAttack =
    board.some((o) => o.kind === 'attack') ||
    buttons.some((b) => b.place !== 'panel' && !MOVE_LIKE.has(b.action));
  return {
    source: 'cell',
    board,
    buttons,
    reason: canAttack ? null : noActionReason(view, cell, act),
  };
}

/**
 * The routes a cell at the lymph crossing can slide to — the engine's `lymphPartners`,
 * re-derived here from the CONTENT tables alone (same group, not this lane, long enough to
 * have a crossing). `ui` may read content; it may not call the engine. The offered ⊆
 * accepted harness is what keeps the two derivations agreeing.
 */
export function lymphPartners(lane: string): string[] {
  const group = (LYMPH_GROUP as Record<string, string | null>)[lane];
  if (!group) return [];
  return (ROUTE_KEYS as readonly string[]).filter((l) => {
    const route = (ROUTES as Record<string, { len: number } | undefined>)[l];
    return (
      l !== lane &&
      (LYMPH_GROUP as Record<string, string | null>)[l] === group &&
      route !== undefined &&
      route.len >= LYMPH_STEP
    );
  });
}

const routeName = (lane: string): string =>
  String((ROUTES as Record<string, { name?: string } | undefined>)[lane]?.name ?? lane);

/**
 * A RESIDENT MACROPHAGE'S OFFERS (CP3) — the one extension to the selection model. A resident
 * is keyed by its organ; it patrols its own branch one step at a time (`resmove`, 1 AP, a
 * move) and engulfs where it stands (`resengulf`, free, once per turn, a commit). Both gates
 * are read off the view, in the engine's order.
 *
 * Two rulings (Shantanu, 4 September 2026) shape this function:
 *   - `resengulf` is offered as ATTACK RINGS, one per eatable pathogen, because the engine
 *     honours a supplied `invaderId` and only falls back to the first — so the choice is real
 *     here in a way it is not for `net`, and the same action keeps one interaction shape
 *     whichever macrophage performs it.
 *   - An INFECTED resident may still patrol. The engine accepts `resmove` for it and refuses
 *     only `resengulf`; the legacy UI blocked both, which made it a second rules source. The
 *     parasite line shows muted beside the patrol rings.
 */
function residentOffers(view: SessionView, organ: string): Offered {
  const g = view.game;
  const residents = g['residents'] as Record<string, Record<string, unknown>> | undefined;
  const r = residents?.[organ];
  if (!r) return { ...EMPTY_CELL, reason: t('selection.nothing') };
  const name = residentDisplayName(organ);
  const flags = g['flags'] as Record<string, unknown> | undefined;
  const perOrgan = view.queries.perOrgan;
  const ap = num(g['ap']);
  const step = num(r['step']);
  const infected = r['infectedBy'] !== null && r['infectedBy'] !== undefined;
  const ate = r['ate'] === true;
  const canPatrol = flags?.['residentMove'] === true;
  const board: BoardOffer[] = [];

  // PATROL — residents never hold a free-action key, so the engine's gate is AP alone.
  if (canPatrol && ap > 0) {
    const L = num(perOrgan['branchLen']?.[organ]);
    for (const s of [step - 1, step + 1]) {
      if (s < 0 || s > L) continue;
      board.push({
        id: `resmove:${organ}:${String(s)}`,
        kind: 'move',
        action: 'resmove',
        cell: null,
        organ,
        located: { zone: 'branch', organ, step: s },
        label: t('action.patrol'),
        cost: null,
        params: { action: 'resmove', organ, step: s },
      });
    }
  }

  // ENGULF — free, so no AP gate; the engine refuses an infected or already-fed resident.
  if (!infected && !ate) {
    for (const iv of ids(perOrgan['residentEatable']?.[organ])) {
      board.push({
        id: `resengulf:${organ}:${iv.id}`,
        kind: 'attack',
        action: 'resengulf',
        cell: null,
        organ,
        invaderId: iv.id,
        label: `${t('action.engulf')} ${iv.disease}`,
        cost: null,
        params: { action: 'resengulf', organ, invaderId: iv.id },
      });
    }
  }

  // THE REASON, in the engine's own gate order, then what stops the patrol. The step-0 line
  // is the one that earns its place: FINDINGS #5 measured that a resident at its organ can
  // never eat anything, and the bot never worked that out — so the interface says it.
  let reason: string | null = null;
  if (!board.some((o) => o.kind === 'attack')) {
    if (infected) reason = t('selection.residentInfected', { name });
    else if (ate) reason = t('selection.residentAte', { name });
    else if (!canPatrol) reason = t('selection.residentsCannotMove');
    else if (ap <= 0) reason = t('selection.noAp');
    else if (step === 0) reason = t('selection.residentAtOrgan', { name });
    else reason = t('selection.residentNothingHere', { name });
  }
  return { source: 'cell', board, buttons: [], reason };
}

/** Why no attack is offered — per-cell first, after the generic gates. */
function noActionReason(view: SessionView, cell: string, act: boolean): string {
  if (!act) return t('selection.noAp');
  switch (cell) {
    case 'neutrophil':
      return t('selection.notOnSwarm');
    case 'tcell':
      return t('selection.noHiddenInRange');
    case 'nk':
      return t('selection.noInfectedCellInRange');
    case 'eosinophil':
      return t('selection.nothingCoatedHere');
    case 'macrophage':
      return t('selection.nothingToEngulfHere');
    case 'helper':
      return t('selection.helperContact');
    case 'bcell': {
      const fams = producibleFamilies(view);
      if (fams.length > 0 && fams.every((f) => f.why === 'blocked'))
        return t('selection.productionBlocked');
      if (fams.length > 0 && fams.every((f) => f.why === 'full')) return t('selection.storesFull');
      return t('selection.noMatchingAntibody');
    }
    default:
      return t('selection.nothing');
  }
}
