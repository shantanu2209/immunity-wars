/**
 * The shapes of the content itself — organs, routes, cards, families, events, difficulty.
 *
 * TASK C1. These moved here from packages/engine/src/types.ts, because a set of organs is
 * content, not a rule. The engine re-exports them so its own public type surface is unchanged.
 *
 * The cut line: a type describing WHAT EXISTS IN THE WORLD lives here. A type describing WHAT
 * IS HAPPENING IN A GAME — GameState, Invader, Cell, Organ, Zone — stays in the engine. So
 * `FamilyKey` (the six antigen classes are content) is here, while `AbPoolKey`
 * (`FamilyKey | 'X'`, the pools a game tracks) stays in the engine: the novel-antigen pool is a
 * mechanic, not a class of pathogen.
 *
 * Kept boring on purpose (CLAUDE.md: "no clever generics"). Every union is closed against the
 * legacy tables, and tests/equivalence/src/data.test.ts proves the tables still cover exactly
 * these keys — so adding a disease or an organ without updating the types is a compile error
 * rather than a runtime surprise.
 */

export type OrganKey = 'heart' | 'lungs' | 'liver' | 'marrow' | 'brain' | 'spleen' | 'kidneys';

/** "vital" = the body dies if it fails. "defence" = damaging it weakens the immune system. */
export type OrganKind = 'vital' | 'defence';

export interface OrganDef {
  readonly name: string;
  readonly kind: OrganKind;
  readonly integrity: number;
  readonly branch: number;
  readonly effect: string;
  readonly bio: string;
}

export type RouteKey = 'nose' | 'gut' | 'contact' | 'wound' | 'bite' | 'blood';

export interface RouteDef {
  readonly name: string;
  readonly len: number;
}

export type Difficulty = 'training' | 'normal' | 'hard';

export interface DifficultyDef {
  readonly ap: number;
  readonly turns: number;
  readonly spawn: string;
}

export type CellKey =
  'macrophage' | 'neutrophil' | 'bcell' | 'tcell' | 'helper' | 'nk' | 'eosinophil';

/**
 * How an invader behaves mechanically. Distinct from its antigen class (FamilyKey), which is
 * what antibodies are specific to — a fungus and a worm are both EUK but play very differently.
 */
export type InvaderType =
  'virus' | 'hidden' | 'bacteria' | 'toxin' | 'venom' | 'fungus' | 'worm' | 'malaria' | 'parasite';

/** The six antigen classes antibodies are specific to. */
export type FamilyKey = 'ENV' | 'NAK' | 'EXB' | 'ICB' | 'TOX' | 'EUK';

export interface FamilyDef {
  readonly name: string;
  readonly short: string;
  readonly col: string;
  readonly bio: string;
}

/**
 * A card in the infection deck. Everything past `lane` is an optional special behaviour.
 *
 * EVERY OPTIONAL FLAG IS `?:`, AND MUST STAY THAT WAY. When these become Zod schemas in C2,
 * `.optional()` is required and `.default(false)` is banned. A default would MATERIALISE the
 * key — `novel: false` on every card that does not carry it — which is precisely the failure
 * mode of docs/FINDINGS.md #13: the novel pathogen quietly becomes an ordinary EXB bacterium
 * and the clonal-selection lesson stops being taught. The C0 probe measured that all 97 cards
 * survive a JSON round trip with exactly their own key set; a default is what would break it.
 */
export interface Card {
  readonly dz: string;
  readonly type: InvaderType;
  readonly lane: RouteKey;
  readonly amnesia?: boolean;
  readonly hidesInMac?: boolean;
  readonly variant?: boolean;
  readonly blocksLymph?: boolean;
  readonly forced?: OrganKey;
  readonly drain?: number;
  readonly killsHelper?: boolean;
  readonly needsHepB?: boolean;
  readonly novel?: boolean;
}

export interface EventDef {
  readonly bad?: boolean;
  readonly name: string;
  readonly why: string;
  /** What the player is warned about a turn ahead. Good events have no tell. */
  readonly tell?: string;
}

export interface RareDef {
  readonly name: string;
  readonly why: string;
}

/**
 * Feature toggles merged into every game.
 *
 * These are CONFIGURATION rather than content, and sit here because legacy publishes FLAGS as a
 * table and the port is contracted to reproduce it. Seven entries are never read by the engine
 * — see docs/FINDINGS.md #8 — and are kept because they are part of the state shape viewState()
 * exposes. Pruning them is Phase 2 work, once a UI exists that would read them.
 */
/* ================================================================== *
 * TASK C3 — board geometry, regions, disease text, labels
 *
 * Extracted from tools/legacy/v2_ui.html. These describe how the board is DRAWN and how
 * diseases and cells are LABELLED — presentation content, not rules. The engine does not
 * import any of it; Phase 2's SVG board and card sheets do.
 * ================================================================== */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The seven zoom targets: six entry lanes plus the core. Not the same set as OrganKey. */
export type RegionKey = 'nose' | 'gut' | 'contact' | 'wound' | 'bite' | 'blood' | 'core';

export interface Region {
  readonly cx: number;
  readonly cy: number;
  readonly scale: number;
}

export interface RegionBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** d=discovered · c=causes · w=found · p=prevent · r=treat */
export interface DiseaseInfo {
  readonly d: string;
  readonly c: string;
  readonly w: string;
  readonly p: string;
  readonly r: string;
}

/**
 * The card's stat block: four 1–5 ratings and a rarity label.
 *
 * A fixed-length tuple rather than an array, because the positions are meaningful and a
 * five-element array of mixed types is exactly the shape that rots into guesswork.
 */
export type DiseaseStats = readonly [
  contagious: number,
  severity: number,
  spread: number,
  persistence: number,
  rarity: 'Common' | 'Rare' | 'Legendary',
];

/** n=name · r=role blurb · g=glyph */
export interface CellLabel {
  readonly n: string;
  readonly r: string;
  readonly g: string;
}

/** n=name · c=CSS colour variable · g=glyph */
export interface InvaderLabel {
  readonly n: string;
  readonly c: string;
  readonly g: string;
}

export interface Flags {
  readonly organs: boolean;
  readonly residents: boolean;
  readonly residentMove: boolean;
  readonly primeResident: boolean;
  readonly lymph: boolean;
  readonly crisisEvents: boolean;
  readonly heartOrgan: boolean;
  readonly dendritic: boolean;
  readonly helperT: boolean;
  readonly nkCell: boolean;
  readonly complement: boolean;
  readonly toxins: boolean;
  readonly fungus: boolean;
  readonly worms: boolean;
  readonly malaria: boolean;
  readonly eosinophil: boolean;
  readonly rareEvents: boolean;
  readonly specials: boolean;
  readonly tierB: boolean;
}
