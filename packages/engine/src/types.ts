/**
 * Core key and shape types for the rules engine.
 *
 * Kept boring on purpose (CLAUDE.md: "no clever generics"). These are the vocabulary the rest
 * of the engine is written in, so they need to be obvious at a glance rather than expressive.
 *
 * Every union here is closed against the legacy tables, and data.test.ts proves the tables
 * still cover exactly these keys — so adding a disease or an organ to content without
 * updating the types is a compile error rather than a runtime surprise.
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

/** The six antigen classes antibodies are specific to. "X" is the novel antigen, not a class. */
export type FamilyKey = 'ENV' | 'NAK' | 'EXB' | 'ICB' | 'TOX' | 'EUK';

/** The antibody pools a game tracks: the six real classes plus the novel-antigen pool. */
export type AbPoolKey = FamilyKey | 'X';

export interface FamilyDef {
  readonly name: string;
  readonly short: string;
  readonly col: string;
  readonly bio: string;
}

/** A card in the infection deck. Everything past `lane` is an optional special behaviour. */
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
 * Seven of these are never read by the engine — see docs/FINDINGS.md #8. They are kept
 * because they are part of the state shape that viewState() exposes, and the port is
 * contracted to reproduce that shape exactly.
 */
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
