/**
 * A LAYER THAT IS ALL THERE IS, FOR A SCREEN READER TOO (screen reader support, ruled 25 November
 * 2026; docs/LOOK_PLAN.md §34 and §36).
 *
 * A dialog, the menu, a card and the messages each cover the screen, and a finger cannot reach what
 * is behind them. A screen reader does not go by what covers what: it reads the page's elements in
 * their order, so behind the game's menu it went on reading the board, the tiles and End turn, and
 * could press them. Nothing told its user that a dialog had opened at all.
 *
 * So a layer that is modal to the eye is made modal to everything, while it is up:
 *
 *   - everything that is not the layer, or on the way up from it, is made INERT: not read, not
 *     focused, not pressed. The browser does this, and takes it out of what a screen reader is told;
 *   - focus is moved to the layer, which is what makes a screen reader announce it by its name, and
 *     is put back where it was when the layer goes;
 *   - the one close that floats over every layer (`FloatingClose`) is kept, by its own mark: it is
 *     the layer's way out and stands outside it.
 *
 * The layer itself says what it is: `role="dialog"`, `aria-modal`, and a name.
 *
 * Held on the built app by `pnpm sr:walk`, which reads Chrome's own accessibility tree with each
 * layer open. Control: pnpm ci:selftest sr-walk-a-layer-hides-what-is-behind.
 */
import { useEffect, type RefObject } from 'react';

/** The mark of something that stays reachable beside a modal layer: the floating close. */
export const MODAL_KEEP = 'data-modal-keep';

/** The attributes a modal layer's own element carries, with the name it is announced by. */
export const modalProps = (
  label: string,
): { role: 'dialog'; 'aria-modal': true; 'aria-label': string; tabIndex: -1 } => ({
  role: 'dialog',
  'aria-modal': true,
  'aria-label': label,
  tabIndex: -1,
});

/**
 * While `active`, everything outside the element is inert and focus is in it. Call it from the
 * layer's own component, with a ref on the element that carries `modalProps`.
 */
export function useModal(ref: RefObject<HTMLElement | null>, active = true): void {
  useEffect(() => {
    const layer = ref.current;
    if (!active || !layer || typeof document === 'undefined') return undefined;
    const made: HTMLElement[] = [];
    let node: HTMLElement = layer;
    while (node.parentElement && node !== document.body) {
      for (const beside of Array.from(node.parentElement.children)) {
        if (beside === node || !(beside instanceof HTMLElement)) continue;
        // What is already inert is some other layer's doing, and stays that layer's to undo.
        if (beside.inert || beside.hasAttribute(MODAL_KEEP)) continue;
        beside.inert = true;
        made.push(beside);
      }
      node = node.parentElement;
    }
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    layer.focus({ preventScroll: true });
    return () => {
      for (const el of made) el.inert = false;
      if (before?.isConnected === true) before.focus({ preventScroll: true });
    };
  }, [ref, active]);
}
