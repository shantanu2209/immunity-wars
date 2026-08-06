/**
 * Core key and shape types for the rules engine.
 *
 * TASK C1 — the CONTENT-SHAPED types moved to @immunity-wars/content. A type describing what
 * exists in the world (organs, routes, cards, families, events, difficulty) is content; a type
 * describing what is happening in a game stays here and in state.ts.
 *
 * They are re-exported below so the engine's own public type surface is unchanged. Nothing that
 * imported `OrganKey` from the engine has to move, and index.ts still publishes the same names.
 *
 * The one type that did NOT move is AbPoolKey, and the reason is the cut line itself: the six
 * antigen classes are content, but the NOVEL pool 'X' is a mechanic — there is no such class of
 * pathogen, only a game rule about a germ the body has not met. See docs/FINDINGS.md #13.
 */

export type {
  Card,
  CellKey,
  Difficulty,
  DifficultyDef,
  EventDef,
  FamilyDef,
  FamilyKey,
  Flags,
  InvaderType,
  OrganDef,
  OrganKey,
  OrganKind,
  RareDef,
  RouteDef,
  RouteKey,
} from '@immunity-wars/content';

import type { FamilyKey } from '@immunity-wars/content';

/** The antibody pools a game tracks: the six real classes plus the novel-antigen pool. */
export type AbPoolKey = FamilyKey | 'X';
