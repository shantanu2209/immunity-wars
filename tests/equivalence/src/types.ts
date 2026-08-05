/**
 * Minimal structural types for the legacy engine.
 *
 * These describe only what the RIG needs to touch — the bot reads a handful of fields to
 * decide a move, and the comparator treats everything else as opaque JSON. This is
 * deliberately NOT an attempt to type the game state properly; that is Task B3's job, done
 * against the real engine rather than guessed at from the outside.
 */

export interface Invader {
  id: string;
  type: string;
  disease: string;
  zone: string;
  step: number;
  tagged?: boolean;
  hp?: number;
  stage?: string | null;
  lane?: string | null;
  organ?: string | null;
  novel?: boolean;
  inMac?: boolean;
  lodged?: boolean;
  remembered?: boolean;
  maxhp?: number;
  embed?: number;
  age?: number;
  ade?: boolean;
  killsHelper?: boolean;
  blocksLymph?: boolean;
  hidesInMac?: boolean;
  wormClock?: number;
  drain?: number;
}

export interface Cell {
  zone: string;
  lane: string | null;
  organ: string | null;
  step: number;
  alive?: boolean;
  freeEngulf?: boolean;
}

export interface MoveDestination {
  zone: string;
  lane?: string;
  organ?: string;
  step?: number;
}

export interface Organ {
  key?: string;
  hp: number;
  max: number;
  clear: number;
  failed?: boolean;
  compensated?: boolean;
}

export interface Resident {
  organ: string;
  step: number;
  ate: boolean;
  infectedBy?: string | null;
}

export interface GameState {
  phase: string;
  turn: number;
  ap: number;
  difficulty: string;
  won: boolean;
  lost: unknown;
  invaders: Invader[];
  cells: Record<string, Cell>;
  organList: string[];
  ab: Record<string, number>;
  seen: Record<string, boolean>;
  memory: Record<string, boolean>;
  free?: Record<string, number>;
  novelSeen: boolean;
  cloneFound: boolean;
  organs: Record<string, Organ>;
  residents: Record<string, Resident>;
  suppress: { neutrophil: number; tcell: number };
  fx: { capTurns: number; noProduce: boolean; apMod: number; skipMarch: boolean };
  presentations: number;
  made: Record<string, number>;
  wormsSpawned: number;
  wormsThisTurn: number;
  antivenom: number;
  maxTurn: number;
  everInfected?: boolean;
  flags: Record<string, boolean>;
  log: { t: number; msg: string; kind: string }[];
  rare: {
    armed: boolean;
    fired: string | null;
    seen: Record<string, boolean>;
    malariaLiver: boolean;
    killedThisTurn: number;
  };
  [key: string]: unknown;
}

/**
 * An action as handed to applyAction. The index signature is honest: the legacy engine reads
 * a different set of fields per action kind and validates none of them up front.
 */
export interface Action {
  action: string;
  [key: string]: unknown;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  frames?: unknown[];
}

/** The 67-export surface, narrowed to what the rig calls. */
export interface Engine {
  newGame(cfg: Record<string, unknown>): GameState;
  setKnobs(k: Record<string, unknown>): void;
  applyAction(g: GameState, a: Action): ActionResult;
  viewState(g: GameState): unknown;
  simulate(difficulty: string, n: number, flags?: unknown): Record<string, unknown>;

  distToOrgan(g: GameState, iv: Invader): number;
  macrophageEatable(g: GameState): Invader[];
  residentEatable(g: GameState, organ: string): Invader[];
  nkTargets(g: GameState): Invader[];
  snipeTargets(g: GameState): Invader[];
  netTargets(g: GameState): Invader[];
  wormStrikeable(g: GameState, cellKey: string): Invader[];
  antivenomTargets(g: GameState): Invader[];
  moveDestinations(g: GameState, cellKey: string): MoveDestination[];
  attackable(iv: Invader): boolean;
  helperLicensed(g: GameState): boolean;
  capFam(g: GameState, family: string): number;
  famOf(iv: Invader): string;
  branchLen(organ: string): number;
  makeInvader(g: GameState, card: Record<string, unknown>): Invader;
  respectWormCap(g: GameState, card: unknown): unknown;
  forceInjectCard(g: GameState, dz: string): Invader | null;
  forceInjectType(g: GameState, type: string): Invader;
  applyEvent(g: GameState, key: string): void;
  fireRare(g: GameState, key: string): boolean;
  resolveSpread(g: GameState): unknown[];
  pushUndo(g: GameState): void;
  undo(g: GameState): unknown;
  DECK_MASTER: { dz: string; type: string; lane: string }[];

  [key: string]: unknown;
}
