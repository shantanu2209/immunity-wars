/**
 * THE BOARD AS A LIST (screen reader support, its third part; ruled 25 November 2026,
 * docs/LOOK_PLAN.md §34 and §39).
 *
 * The board is pictures, and a tap on it is read by where the finger lands, so a screen reader
 * could name what is on it and could not play on it: there was no place to press, and a cell's
 * moves glowed on steps that are not buttons. Beside the board, and not seen, the same board is
 * now a list a screen reader reads and presses:
 *
 *   - WHAT STANDS ON THE BOARD: one button for each place with something on it, saying the place
 *     and what stands there, the way the step's own sheet does. Pressed, it opens that sheet, as a
 *     tap on the step does; the sheet's rows are the pathogens' cards and the cells to take in hand.
 *   - WHERE IT CAN GO: while a piece is in hand, one button for each step it may move to or hop to
 *     along the lymph, the steps that glow. Pressed, it moves there, as a tap on the glowing step
 *     does. An attack is already a row of the piece's own card, named with its target.
 *
 * Dumb by design: it decides nothing. Every press goes through the board's own tap path, so what
 * it may do is exactly what a finger may.
 *
 * Not seen, so not measured as seen: it carries `data-spoken-only`, which the Gate 1 audit skips.
 * Held on the built app by `pnpm sr:walk`, which plays a move through it. Controls: pnpm
 * ci:selftest sr-walk-a-cell-moves-by-the-list, sr-walk-the-board-is-a-list.
 */
import type { ReactElement } from 'react';

import type { ViewState } from '@immunity-wars/session';

import {
  buildNodeModel,
  type BoardTap,
  type BoardTarget,
  type Located,
  type ReadyTurn,
} from '../board/Board';
import { tokenPos } from '../board/geometry';
import { t } from '../i18n';
import { SPOKEN_ONLY } from '../kit/spoken';
import { cellDisplayName, diseaseDisplayName, residentDisplayName } from '../names';
import { whereText } from './planning';

interface Place {
  key: string;
  where: string;
  what: string[];
}

const keyOf = (loc: Located): string | null => {
  const pos = tokenPos(loc);
  return pos ? `${String(pos.x)}:${String(pos.y)}` : null;
};

export function BoardList({
  view,
  readyTurn,
  targets,
  onTap,
}: {
  view: ViewState;
  readyTurn?: ReadyTurn;
  targets: readonly BoardTarget[];
  onTap: (hit: BoardTap) => void;
}): ReactElement {
  const nodes = buildNodeModel(view, readyTurn);
  const places = new Map<string, Place>();
  const add = (loc: Located, name: string): void => {
    const key = keyOf(loc);
    if (key === null) return;
    const place = places.get(key) ?? { key, where: whereText(loc), what: [] };
    place.what.push(name);
    places.set(key, place);
  };
  for (const iv of (view['invaders'] as (Located & Record<string, unknown>)[] | undefined) ?? []) {
    add(
      iv,
      iv['novel'] === true ? t('inspect.unknown') : diseaseDisplayName(String(iv['disease'])),
    );
  }
  for (const [cell, c] of Object.entries(
    (view['cells'] as Record<string, Located> | undefined) ?? {},
  )) {
    add(c, cellDisplayName(cell));
  }
  for (const [organ, r] of Object.entries(
    (view['residents'] as Record<string, { step?: unknown }> | undefined) ?? {},
  )) {
    add({ zone: 'branch', organ, step: r.step }, residentDisplayName(organ));
  }
  const moves = targets.filter((tg) => tg.kind === 'move' || tg.kind === 'hop');
  return (
    <div data-board-list="" data-spoken-only="" style={SPOKEN_ONLY}>
      {moves.length > 0 ? (
        <div role="group" aria-label={t('board.movesLabel')} data-board-moves="">
          {moves.map((tg) => (
            <button
              key={tg.key}
              type="button"
              data-board-move={tg.key}
              onClick={() => onTap({ kind: 'target', target: tg })}
            >
              {t(tg.kind === 'hop' ? 'board.hopTo' : 'board.moveTo', {
                where: whereText(tg.located ?? {}),
              })}
            </button>
          ))}
        </div>
      ) : null}
      <div role="group" aria-label={t('board.placesLabel')} data-board-places="">
        {[...places.values()].map((p) => (
          <button
            key={p.key}
            type="button"
            data-board-place={p.key}
            onClick={() => {
              const node = nodes.get(p.key);
              if (node) onTap({ kind: 'node', node: node.inspect });
            }}
          >
            {t('board.place', { where: p.where, what: p.what.join(', ') })}
          </button>
        ))}
      </div>
    </div>
  );
}
