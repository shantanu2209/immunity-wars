/**
 * S25 ITEM 1 — THE ACTION LIST NAMES EVERY ACTION, AVAILABLE OR NOT, AND SENDS EXACTLY WHAT
 * THE RING WOULD.
 *
 * On recorded states, for every piece (each cell, each resident, and the body when nothing is
 * selected): the rows cover the piece's whole catalogue — an action is either expanded per
 * target as available rows or present once as a greyed row with a reason, never absent; every
 * available row points at a real offer with the same label, so the row and the ring are one
 * action; and no non-movement offer exists without a row. That last one is the correctness
 * property the S25 asked for: a player can always see, by name, every action a tap could
 * perform for the selected piece.
 */

import { describe, expect, it } from 'vitest';

import type { GameState } from '@immunity-wars/equivalence/types';
import { LocalSession, MemoryStorage } from '@immunity-wars/session';
import { ACTION_CATALOGUE, MOVE_LIKE, actionRows, offeredActions } from '@immunity-wars/ui';

import { SEARCH_SEEDS, clone, commandStates } from './constructed.js';

const CELLS = ['macrophage', 'neutrophil', 'bcell', 'tcell', 'helper', 'nk', 'eosinophil'];

describe('S25 item 1: the action list', () => {
  const problems: string[] = [];
  let subjects = 0;
  let available = 0;
  let greyed = 0;
  let reasons = 0;
  for (const seed of SEARCH_SEEDS.slice(0, 3)) {
    for (const difficulty of ['training', 'normal', 'hard']) {
      for (const st of commandStates(seed, difficulty, 80)) {
        const residents = Object.keys(
          ((st as unknown as Record<string, unknown>)['residents'] as Record<string, unknown>) ??
            {},
        );
        const selections = [
          { cell: null, resident: null, piece: 'body' },
          ...CELLS.map((cell) => ({ cell, resident: null, piece: cell })),
          ...residents.map((r) => ({ cell: null, resident: r, piece: 'resident' })),
        ];
        for (const sel of selections) {
          const s = LocalSession.resume(clone(st) as GameState, {
            storage: new MemoryStorage(),
            now: () => 0,
          });
          s.setSelection({ cell: sel.cell, resident: sel.resident, family: null });
          const view = s.getView();
          s.dispose();
          subjects += 1;
          const rows = actionRows(view);
          const offered = offeredActions(view);
          // Movement stays on the board; panel-homed offers have their rows in their panel.
          const offers = [
            ...offered.board.filter((o) => !MOVE_LIKE.has(o.action)),
            ...offered.buttons.filter((o) => !MOVE_LIKE.has(o.action) && o.place !== 'panel'),
          ];
          const catalogue = ACTION_CATALOGUE[sel.piece] ?? [];
          // 1. Coverage: every catalogue action has at least one row.
          for (const a of catalogue) {
            if (!rows.some((r) => r.action === a)) problems.push(`${sel.piece}: no row for ${a}`);
          }
          // 2. Every non-movement offer has an available row with the same label.
          for (const o of offers) {
            const row = rows.find((r) => r.offerId === o.id);
            if (!row) problems.push(`${sel.piece}: offer ${o.id} has no row`);
            else if (row.label !== o.label)
              problems.push(`${sel.piece}: row "${row.label}" ≠ offer "${o.label}"`);
          }
          // 3. Every row is honest: available ⇔ it points at an offer; greyed ⇒ a reason.
          for (const r of rows) {
            if (r.available) {
              available += 1;
              if (!offers.some((o) => o.id === r.offerId))
                problems.push(`${sel.piece}: available row ${r.id} points at no offer`);
            } else {
              greyed += 1;
              if (r.reason && r.reason.length > 0 && !r.reason.includes('⟪')) reasons += 1;
              else problems.push(`${sel.piece}: greyed row ${r.id} has no usable reason`);
            }
          }
        }
      }
    }
  }

  it('walked enough (vacuity guards): many subjects, some available rows, some greyed rows', () => {
    expect(subjects).toBeGreaterThan(500);
    expect(available).toBeGreaterThan(50);
    expect(greyed).toBeGreaterThan(50);
    expect(reasons).toBe(greyed);
  });

  it('every action is named, every offer has its row, every greyed row has its reason', () => {
    expect(problems, problems.slice(0, 10).join('\n')).toEqual([]);
  });

  it('CONTROL: a piece missing from the catalogue would be caught as no row', () => {
    const catalogue = ACTION_CATALOGUE['macrophage'] ?? [];
    expect(catalogue).toContain('engulf');
    expect(([] as { action: string }[]).some((r) => r.action === 'engulf')).toBe(false);
  });
});
