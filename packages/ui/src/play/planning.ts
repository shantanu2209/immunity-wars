/**
 * THE PLANNING SCREEN'S MODEL (P2.5 item 12, blocks b and d) — everything the screen shows,
 * computed from the view and nothing else, so it is tested on recorded states the way every
 * other UI decision here is (`tests/session/src/planning.test.ts`).
 *
 * WHEN: after the draw and its reveal, before the command phase — the view's phase is
 * `infection` with a card drawn (a mop-up sentinel counts: the body still needs a plan) —
 * and, designed in for Phase 3, the engine's `allocation` phase, where the captain hands out
 * the pool before anyone commands. The screen is view-only; its one action is the bottom
 * button, which sends the phase transition the engine expects next (`beginCommand`, or
 * `confirmAllocation` under allocation). The test applies that to the engine, so the button
 * obeys the standing rule like every other offer: what is shown is what is accepted.
 *
 * DEPTH: an invader is in an ENTRY lane (a route, step ≥ 1), in the BLOODSTREAM (the hub —
 * a route at step 0 resolves there too, as the board draws it), or in an ORGAN lane (a
 * branch). Three colours and the word beside each, because the screen's question is "what
 * is happening to the body": green is still outside, amber is circulating, red is at an
 * organ's door or inside it.
 *
 * STACKING AS THE BOARD: the rows are the board's own node model — one row per type group
 * per node, with the same coat and hidden-inside splits — so a row here IS a token there.
 */
import { ORGANS, ROUTES } from '@immunity-wars/content';
import type { SessionView } from '@immunity-wars/session';

import { buildNodeModel, type InspectInvader, type Located } from '../board/Board';
import { t } from '../i18n';

export type Depth = 'entry' | 'blood' | 'organ';

export interface PlanningGroup {
  key: string;
  /** Invader type, or `novel` for the masked unknown pathogen. */
  type: string;
  novel: boolean;
  coated: boolean;
  hiddenIn: 'liver' | 'macrophage' | null;
  count: number;
  depth: Depth;
  /** The lane or organ key the group stands in, or `blood`. */
  place: string;
  step: number;
  /** Where, in words: "Nose lane, step 3" · "In the bloodstream" · "Liver branch, step 2". */
  where: string;
  art: string | null;
  members: InspectInvader[];
}

export interface TypeCount {
  type: string;
  novel: boolean;
  count: number;
  art: string | null;
}

/** Phase 3's allocation, as the view carries it — read here so the slot is designed in. */
export interface AllocationSlot {
  pool: number;
  captain: string | null;
  budgets: { pid: string; ap: number }[];
}

export interface PlanningModel {
  /** The planning moment is now: show the screen. */
  active: boolean;
  mode: 'plan' | 'allocate';
  /** The Action Points the coming command phase starts with — the engine's `apMax`. */
  apNext: number;
  /** Invaders in the body, and how many of them the rows account for (equal, by test). */
  total: number;
  placed: number;
  byType: TypeCount[];
  /** Deepest first: organ lanes, then the bloodstream, then the entry lanes. */
  groups: PlanningGroup[];
  button: { label: string; params: Record<string, unknown> };
  allocation: AllocationSlot | null;
}

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const organName = (o: string): string =>
  String((ORGANS as Record<string, { name?: unknown }>)[o]?.name ?? o);
const routeName = (lane: string): string =>
  String((ROUTES as Record<string, { name?: unknown }>)[lane]?.name ?? lane);

export function depthOf(loc: Located): Depth {
  if (loc.zone === 'branch') return 'organ';
  if (loc.zone === 'route' && typeof loc.step === 'number' && loc.step >= 1) return 'entry';
  return 'blood';
}

export const DEPTH_ORDER: Record<Depth, number> = { organ: 0, blood: 1, entry: 2 };
export const DEPTH_LABEL: Record<Depth, string> = {
  entry: 'planning.depthEntry',
  blood: 'planning.depthBlood',
  organ: 'planning.depthOrgan',
};

function placeOf(loc: Located): string {
  if (loc.zone === 'branch' && typeof loc.organ === 'string') return loc.organ;
  if (depthOf(loc) === 'entry' && typeof loc.lane === 'string') return loc.lane;
  return 'blood';
}

export function whereText(loc: Located): string {
  const step = typeof loc.step === 'number' ? loc.step : 0;
  if (loc.zone === 'branch' && typeof loc.organ === 'string') {
    const organ = organName(loc.organ);
    return step < 1
      ? t('planning.whereOrgan', { organ })
      : t('planning.whereBranch', { organ, step });
  }
  if (depthOf(loc) === 'entry' && typeof loc.lane === 'string') {
    return t('planning.whereRoute', { lane: routeName(loc.lane), step });
  }
  return t('planning.whereBlood');
}

interface Invaderish extends Located {
  id?: unknown;
  type?: unknown;
  novel?: unknown;
}

export function planningModel(view: SessionView): PlanningModel {
  const g = view.game;
  const phase = String(g['phase']);
  const mode: PlanningModel['mode'] = phase === 'allocation' ? 'allocate' : 'plan';
  const drawn = g['drawn'];
  const active =
    mode === 'allocate' || (phase === 'infection' && drawn !== null && drawn !== undefined);

  const invaders = (g['invaders'] as Invaderish[] | undefined) ?? [];
  const byId = new Map<string, Invaderish>();
  for (const iv of invaders) byId.set(String(iv.id ?? ''), iv);

  const counts = new Map<string, TypeCount>();
  for (const iv of invaders) {
    const novel = iv.novel === true;
    const type = novel ? 'novel' : String(iv.type ?? '?');
    const c = counts.get(type) ?? { type, novel, count: 0, art: novel ? null : `path-${type}` };
    c.count += 1;
    counts.set(type, c);
  }
  const byType = [...counts.values()].sort(
    (a, b) => b.count - a.count || a.type.localeCompare(b.type),
  );

  const groups: PlanningGroup[] = [];
  for (const node of buildNodeModel(g, view.queries.readyTurn).values()) {
    for (const tok of node.display) {
      if (tok.kind !== 'invader') continue;
      const ids = new Set(tok.ids ?? []);
      const members = node.inspect.invaders.filter((iv) => ids.has(iv.id));
      const first = members[0];
      if (!first) continue;
      const loc: Located = byId.get(first.id) ?? {};
      groups.push({
        key: tok.key,
        type: first.novel ? 'novel' : first.type,
        novel: first.novel,
        coated: tok.coated === true,
        hiddenIn: tok.hiddenIn ?? null,
        count: members.length,
        depth: depthOf(loc),
        place: placeOf(loc),
        step: typeof loc.step === 'number' ? loc.step : 0,
        where: whereText(loc),
        art: tok.art,
        members,
      });
    }
  }
  groups.sort(
    (a, b) =>
      DEPTH_ORDER[a.depth] - DEPTH_ORDER[b.depth] ||
      a.place.localeCompare(b.place) ||
      a.step - b.step ||
      a.type.localeCompare(b.type),
  );

  const total = invaders.length;
  const placed = groups.reduce((s, x) => s + x.count, 0);
  const button =
    mode === 'allocate'
      ? { label: t('planning.confirm'), params: { action: 'confirmAllocation' } }
      : { label: t('play.beginCommand'), params: { action: 'beginCommand' } };

  let allocation: AllocationSlot | null = null;
  if (mode === 'allocate') {
    const players = (g['players'] as unknown[] | undefined) ?? [];
    const budget = (g['apBudget'] as Record<string, unknown> | undefined) ?? {};
    allocation = {
      pool: num(g['apPool']),
      captain: typeof g['captain'] === 'string' ? g['captain'] : null,
      budgets: players.map((p) => ({ pid: String(p), ap: num(budget[String(p)]) })),
    };
  }

  return {
    active,
    mode,
    apNext: num(g['apMax']),
    total,
    placed,
    byType,
    groups,
    button,
    allocation,
  };
}
