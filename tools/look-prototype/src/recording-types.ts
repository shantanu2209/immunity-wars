/**
 * The shape of the recorded turn. Written by record.ts from the real engine, read by all three
 * ways of drawing, so they are given exactly the same thing to draw.
 */
export type CellKey =
  'macrophage' | 'neutrophil' | 'bcell' | 'tcell' | 'helper' | 'nk' | 'eosinophil';

export interface Place {
  zone: 'hub' | 'route' | 'branch';
  lane: string | null;
  organ: string | null;
  step: number;
}

export interface InvaderShot {
  id: string;
  type: string;
  tagged: boolean;
  at: Place;
}

export interface Shot {
  turn: number;
  maxTurn: number;
  ap: number;
  apMax: number;
  cells: Record<CellKey, Place>;
  /** How far each organ's resident macrophage stands from its organ: 0 is at the organ. */
  residents: Record<string, number>;
  invaders: InvaderShot[];
  organs: Record<string, { hp: number; max: number }>;
}

export interface Die {
  label: string;
  face: number;
  hit: boolean;
}

export interface Beat {
  /** What produced this picture of the game. */
  kind: 'start' | 'select' | 'move' | 'engulf' | 'spread' | 'draw';
  /** The engine's own line for a spread frame; empty for a player's action. */
  label: string;
  dice: Die[];
  /** The selected cell and where it may go, for the beats in which a player is choosing. */
  selected: CellKey | null;
  moves: Place[];
  shot: Shot;
}

export interface Recording {
  source: string;
  seed: number;
  rulesVersion: string;
  words: {
    cells: Record<CellKey, string>;
    roles: Record<CellKey, string>;
    turn: string;
    endTurn: string;
    move: string;
    engulf: string;
    undo: string;
  };
  beats: Beat[];
}
