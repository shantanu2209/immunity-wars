/**
 * Game state shapes.
 *
 * These describe the state legacy actually builds, field for field. Construction is B3's job;
 * B2 only needs to read it.
 *
 * Two deliberate looseness decisions, both forced by legacy behaviour rather than convenience:
 *
 *   1. Fields that legacy adds LATER (lodged, inMac, compensated, …) are optional. Legacy adds
 *      them by assignment partway through a game, so a state without them is a real state.
 *   2. Fields the existing legacy test suites omit are optional too. Three of those suites, and
 *      the server's capture tool, build invaders by hand as
 *      `{id, zone, organ, step, type, disease}` with no tagged/hp/age. The engine tolerates
 *      that today, so the port must as well. See docs/TASK_B_PLAN.md §2.
 *
 * Types are erased at runtime, so neither choice changes behaviour — but getting them wrong
 * would make the port's own call sites lie about what can be absent, which is exactly what
 * B7 has to reason about honestly.
 */

import type {
  AbPoolKey,
  CellKey,
  Difficulty,
  Flags,
  InvaderType,
  OrganKey,
  RouteKey,
} from './types.js';

export type Zone = 'route' | 'hub' | 'branch';

/** Malaria is the one pathogen with a staged lifecycle. */
export type MalariaStage = 'sporozoite' | 'liver' | 'blood';

export type Phase = 'infection' | 'allocation' | 'command' | 'spread';

/**
 * Anything on the board that is not yours.
 *
 * `step` counts DOWN toward the hub on a route, and DOWN toward the organ on a branch, so
 * step 0 on a branch means "at the organ itself".
 */
export interface Invader {
  id: string;
  type: InvaderType;
  lane?: RouteKey | null;
  organ?: OrganKey | null;
  tagged?: boolean;
  disease: string;
  hp?: number;
  maxhp?: number;
  stage?: MalariaStage | null;
  age?: number;
  embed?: number;
  killsHelper?: boolean;
  hidesInMac?: boolean;
  blocksLymph?: boolean;
  amnesia?: boolean;
  drain?: number;
  variant?: boolean;
  forced?: OrganKey | null;
  novel?: boolean;
  zone: Zone;
  step: number;

  /** A worm that has settled into tissue. It stops marching and does chronic damage instead. */
  lodged?: boolean;
  wormClock?: number;
  /** Kala-azar living inside a resident macrophage. */
  inMac?: boolean;
  /** Dengue antibody-dependent enhancement: your own antibodies are helping it in. */
  ade?: boolean;
  /** Set at draw time when this disease is already in memory. */
  remembered?: boolean;
  /** A toxin-making bacterium has already released its toxin. */
  emitted?: boolean;
  /** Entering the bloodstream ends movement for the turn; it rolls for an organ later. */
  justEnteredHub?: boolean;
}

/** One of your seven cells. B-Cell is stationary; the rest move. */
export interface Cell {
  zone: Zone;
  lane: RouteKey | null;
  organ: OrganKey | null;
  step: number;
  /** Monocyte: the first engulf each turn is free. */
  freeEngulf?: boolean;
  /** Neutrophil and Eosinophil are spent after their big move and regenerate. */
  alive?: boolean;
  regenAt?: number | null;
  spentAt?: number | null;
  usedThisTurn?: boolean;
}

/** A tissue-resident macrophage. It never leaves its own organ branch. */
export interface Resident {
  organ: OrganKey;
  step: number;
  ate: boolean;
  /** Kala-azar has moved in. The resident cannot eat until the parasite is killed. */
  infectedBy?: string | null;
}

export interface Organ {
  key: OrganKey;
  hp: number;
  max: number;
  clear: number;
  failed: boolean;
  /** Hard only: integrity never regrows, but the functional penalty can lift. */
  compensated?: boolean;
}

export interface Fx {
  capTurns: number;
  noProduce: boolean;
  apMod: number;
  skipMarch: boolean;
}

export interface Suppress {
  neutrophil: number;
  tcell: number;
}

export interface RareState {
  armed: boolean;
  fired: string | null;
  seen: Record<string, boolean>;
  malariaLiver: boolean;
  killedThisTurn: number;
}

/**
 * Counters. Deliberately Record<string, number> rather than a closed shape.
 *
 * `arrivals` and `gotThrough` are initialised with four keys but indexed by raw invader type,
 * so `arrivals.worm` and friends are created as NaN on first use. That is docs/FINDINGS.md #3,
 * it is reproduced on purpose, and a closed type here would have quietly hidden it.
 */
export interface Stats {
  killedTrunk: number;
  killedBranch: number;
  organHits: number;
  failures: OrganKey[];
  arrivals: Record<string, number>;
  residentAte: number;
  gotThrough: Record<string, number>;
}

export interface LossRecord {
  organ: OrganKey | null;
  turn: number;
  disease: string | null;
  reason?: string;
}

export interface LogEntry {
  t: number;
  msg: string;
  kind: string;
}

export interface Banner {
  key: string;
  name: string;
  bad?: boolean;
  why: string;
}

export interface Warning {
  key: string;
  name: string;
  text?: string;
}

export interface RareBanner {
  key: string;
  name: string;
  why: string;
  firedTurn: number;
}

/** A snapshot pushed before each undoable action. */
export interface UndoSnapshot {
  inv: Invader[];
  cells: Record<string, Cell>;
  residents: Record<string, Resident>;
  ap: number;
  antibodies: number;
  ab: Record<string, number>;
  made: Record<string, number>;
  memory: Record<string, boolean>;
  vaccine: Record<string, number>;
  clone: number;
  cloneFound: boolean;
  presentations: number;
  free: Record<string, number>;
  organs: Record<string, Organ>;
  log: LogEntry[];
}

export interface GameState {
  phase: Phase;
  turn: number;
  difficulty: Difficulty;
  apMax: number;
  ap: number;
  maxTurn: number;
  flags: Flags;
  organList: readonly OrganKey[];
  organs: Record<string, Organ>;
  cells: Record<string, Cell>;
  events: Record<number, string>;
  banner: Banner | null;
  warning: Warning | null;
  fx: Fx;
  wormsSpawned: number;
  wormsThisTurn: number;
  suppress: Suppress;
  undo: UndoSnapshot[];
  residents: Record<string, Resident>;
  presentations: number;
  complement: number;
  antivenom: number;
  avOrder: number;
  ab: Record<string, number>;
  made: Record<string, number>;
  memory: Record<string, boolean>;
  vaccine: Record<string, number>;
  seen: Record<string, boolean>;
  clone: number;
  cloneFound: boolean;
  novelSeen: boolean;
  rare: RareState;
  free: Record<string, number>;
  antibodies: number;
  invaders: Invader[];
  deck: { dz: string; type: InvaderType; lane: RouteKey }[];
  discard: { dz: string; type: InvaderType; lane: RouteKey }[];
  drawn: unknown;
  log: LogEntry[];
  won: boolean;
  lost: LossRecord | null;
  science: boolean;
  stats: Stats;
  multiplayer: boolean;
  players: string[];
  captain: string | null;
  owner: Record<string, string>;
  apBudget: Record<string, number>;
  apPool: number;

  /* Added during play rather than at construction. */
  novelTurn?: number;
  drawnList?: unknown[];
  rareBanner?: RareBanner | null;
  lastRoll?: { cell: string; face: number; hit: boolean };
  /** Whose AP budget the current action draws from (multiplayer). */
  _actingPid?: string | null;
}

/** A destination returned by moveDestinations. */
export interface MoveDestination {
  zone: Zone;
  lane?: RouteKey;
  organ?: OrganKey;
  step?: number;
  /** Marks a destination reached through the lymphatic crossing. */
  lymph?: boolean;
}

/** Anything with a board position: a cell, an invader, a bare coordinate. */
export interface Placed {
  zone: Zone;
  lane?: RouteKey | null;
  organ?: OrganKey | null;
  step?: number;
}

/** One line of the production-rate explanation the UI shows on demand. */
export interface ProductionEffect {
  label: string;
  delta: number;
  kind: 'boost' | 'penalty';
}

export interface ProductionBreakdown {
  net: number;
  base: number;
  effects: ProductionEffect[];
  capRate: number;
  capped: boolean;
  blocked: string | null;
  storage: { have: number; cap: number; baseCap: number; capReasons: string[] };
  boosted: boolean;
  reduced: boolean;
}

export type { AbPoolKey, CellKey, OrganKey, RouteKey };
