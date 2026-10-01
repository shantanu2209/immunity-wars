/**
 * THE RECORDED TURN. Drives the real engine from one recorded game state and writes down every
 * picture of the game it produces: the player's two moves and an engulf, the spread that follows
 * the end of the turn, and the next turn's arrivals.
 *
 * Why a recording and not a live engine: the three ways of drawing must be given exactly the same
 * thing to draw, and the engine rolls dice through the global Math.random
 * (docs/FINDINGS.md #40), so three live games would be three different turns. The engine's own
 * cost is not what L2 measures; it was measured at P2.3 and the engine has not changed since.
 *
 * Math.random is replaced here by a seeded generator, for this process only, so the recording
 * is the same every time it is made. The seed is chosen (see PICK below), and that choice is a
 * selection, not a sample: it is the first seed whose turn shows only pathogens the Clay set has
 * models for. A spread with a worm or a toxin in it has no picture yet.
 *
 *   pnpm --filter @immunity-wars/look-prototype record            # write src/recording.json
 *   pnpm --filter @immunity-wars/look-prototype record -- --scan  # list what each seed gives
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RULES_VERSION, UI_I18N_EN, UM } from '@immunity-wars/content';
import { applyAction, macrophageEatable, moveDestinations, viewState } from '@immunity-wars/engine';
import type { GameState } from '@immunity-wars/engine';
import { migrateSavedGame } from '@immunity-wars/session-core';

import type {
  Beat,
  CellKey,
  Die,
  InvaderShot,
  Place,
  Recording,
  Shot,
} from './src/recording-types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'src', 'recording.json');

/** The pathogen types the Clay set has a model for. */
const MODELLED = new Set(['bacteria', 'fungus', 'virus']);
const CELL_KEYS: CellKey[] = [
  'macrophage',
  'neutrophil',
  'bcell',
  'tcell',
  'helper',
  'nk',
  'eosinophil',
];

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const place = (p: { zone: string; lane?: unknown; organ?: unknown; step?: unknown }): Place => ({
  zone: p.zone as Place['zone'],
  lane: typeof p.lane === 'string' ? p.lane : null,
  organ: typeof p.organ === 'string' ? p.organ : null,
  step: typeof p.step === 'number' ? p.step : 0,
});

function shotOf(view: Record<string, unknown>): Shot {
  const cells = view['cells'] as Record<CellKey, Parameters<typeof place>[0]>;
  const residents = view['residents'] as Record<string, { step: number }>;
  const invaders = view['invaders'] as Array<Record<string, unknown>>;
  const organs = view['organs'] as Record<string, { hp: number; max: number }>;
  return {
    turn: view['turn'] as number,
    maxTurn: view['maxTurn'] as number,
    ap: view['ap'] as number,
    apMax: view['apMax'] as number,
    cells: Object.fromEntries(CELL_KEYS.map((k) => [k, place(cells[k])])) as Record<CellKey, Place>,
    residents: Object.fromEntries(Object.entries(residents).map(([o, r]) => [o, r.step])),
    invaders: invaders.map((v): InvaderShot => ({
      id: String(v['id']),
      type: String(v['type']),
      tagged: v['tagged'] === true,
      at: place(v as Parameters<typeof place>[0]),
    })),
    organs: Object.fromEntries(
      Object.entries(organs).map(([o, s]) => [o, { hp: s.hp, max: s.max }]),
    ),
  };
}

type Script = 'turn' | 'crowd';
const FIXTURES: Record<Script, string> = { turn: 'state-45.json', crowd: 'state-19.json' };

function record(script: Script, seed: number): { beats: Beat[]; problems: string[] } {
  const g = JSON.parse(readFileSync(join(HERE, 'fixture', FIXTURES[script]), 'utf8')) as GameState;
  // The state was saved before the engine change queue of 30 September 2026; carry it forward
  // exactly as the app does for an old save.
  migrateSavedGame(g as unknown as Record<string, unknown>);
  const beats: Beat[] = [];
  const problems: string[] = [];
  const cell: CellKey = 'macrophage';
  const push = (
    kind: Beat['kind'],
    label = '',
    dice: Die[] = [],
    selected: CellKey | null = null,
  ) => {
    beats.push({
      kind,
      label,
      dice,
      selected,
      moves: selected ? moveDestinations(g, selected).map(place) : [],
      shot: shotOf(viewState(g) as unknown as Record<string, unknown>),
    });
  };
  const must = (what: string, r: { ok: boolean; error?: string }) => {
    if (!r.ok) problems.push(`${what}: ${r.error ?? 'refused'}`);
    return r.ok;
  };

  const realRandom = Math.random;
  Math.random = seeded(seed);
  try {
    push('start');
    if (script === 'turn') push('select', '', [], cell);
    // Walk the Monocyte to the coated bacterium, one space at a time, and engulf it.
    for (let i = 0; i < 4 && script === 'turn'; i += 1) {
      const eat = macrophageEatable(g)[0];
      if (eat) {
        must('engulf', applyAction(g, { action: 'engulf', cell, invaderId: eat.id }));
        push('engulf', '', [], cell);
        break;
      }
      const here = g.cells[cell];
      const next = here
        ? moveDestinations(g, cell).find(
            (d) => d.zone === 'route' && d.lane === here.lane && (d.step ?? 0) > here.step,
          )
        : undefined;
      if (!next) {
        problems.push('no way forward for the Monocyte');
        break;
      }
      must('move', applyAction(g, { action: 'move', cell, ...next }));
      push('move', '', [], cell);
    }
    const end = applyAction(g, { action: 'endCommand' });
    must('endCommand', end);
    for (const f of (end.frames ?? []) as Array<{
      label: string;
      dice: unknown;
      view: Record<string, unknown>;
    }>) {
      const dice = Array.isArray(f.dice)
        ? (f.dice as Die[]).map((d) => ({
            label: String(d.label),
            face: Number(d.face),
            hit: d.hit === true,
          }))
        : [];
      beats.push({
        kind: 'spread',
        label: f.label,
        dice,
        selected: null,
        moves: [],
        shot: shotOf(f.view),
      });
    }
    must('draw', applyAction(g, { action: 'draw' }));
    push('draw');
  } finally {
    Math.random = realRandom;
  }
  for (const b of beats)
    for (const v of b.shot.invaders)
      if (!MODELLED.has(v.type)) problems.push(`no model for a ${v.type}`);
  return { beats, problems: [...new Set(problems)] };
}

const describe = (beats: Beat[]): string =>
  beats
    .map((b) => `${b.kind}${b.label ? `[${b.label}]` : ''}:${b.shot.invaders.length} invaders`)
    .join(' | ');

const SCRIPTS: Script[] = ['turn', 'crowd'];
const SOURCES: Record<Script, string> = {
  turn: 'fixture/state-45.json: a recorded Easy game at turn 8. The Monocyte walks to a coated bacterium and engulfs it, the turn ends, the spread runs, the next arrivals are drawn.',
  crowd:
    'fixture/state-19.json: a recorded Hard game at turn 7 with 42 pathogens on the board. The turn ends at once, the spread runs, the next arrivals are drawn.',
};

if (process.argv.includes('--scan')) {
  for (const script of SCRIPTS)
    for (let seed = 1; seed <= 12; seed += 1) {
      const r = record(script, seed);
      console.log(
        `${script} seed ${String(seed).padStart(2)} ${r.problems.length ? `REFUSED (${r.problems.join('; ')})` : 'ok'}  ${describe(r.beats)}`,
      );
    }
} else {
  const ui = UI_I18N_EN as Record<string, string>;
  const word = (key: string): string => {
    const w = ui[key];
    if (w === undefined) throw new Error(`the catalogue has no ${key}`);
    return w;
  };
  const um = UM as Record<CellKey, { n: string; r: string }>;
  const out = {} as Record<Script, Recording>;
  for (const script of SCRIPTS) {
    // PICK: the first seed whose whole turn can be drawn with the models that exist.
    let picked: { seed: number; beats: Beat[] } | null = null;
    for (let seed = 1; seed <= 400 && !picked; seed += 1) {
      const r = record(script, seed);
      if (r.problems.length === 0) picked = { seed, beats: r.beats };
    }
    if (!picked) throw new Error(`${script}: no seed in 1..400 gives a turn the Clay set can draw`);
    out[script] = {
      source: SOURCES[script],
      seed: picked.seed,
      rulesVersion: String(RULES_VERSION),
      words: {
        cells: Object.fromEntries(CELL_KEYS.map((k) => [k, um[k].n])) as Record<CellKey, string>,
        roles: Object.fromEntries(CELL_KEYS.map((k) => [k, um[k].r])) as Record<CellKey, string>,
        turn: word('play.turn'),
        endTurn: word('play.endCommand'),
        move: word('action.move'),
        engulf: word('action.engulf'),
        undo: word('dock.undo'),
      },
      beats: picked.beats,
    };
    console.log(`${script}: seed ${picked.seed}, ${picked.beats.length} beats`);
    console.log(`  ${describe(picked.beats)}`);
  }
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`wrote ${OUT}`);
}
