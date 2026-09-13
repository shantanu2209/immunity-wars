/**
 * THE NAVIGATION STACK (docs/for-P2.7.md §9, rulings 8 and 9; §10, piece 1).
 *
 * Every close or back returns to the level it came from, never straight to the main screen. The
 * app had no stack: the shell remembered only which of two places a page was opened from
 * (`from: 'title' | 'play'`), so a library page opened from Help closed to the library index and
 * then to the title, and Settings opened from the pause menu closed to the game with the menu gone.
 *
 * TWO KINDS OF ENTRY, one ordered list.
 *
 *   screen — a destination the shell renders: Help, the library, Settings. Opening one pushes it,
 *            closing pops it, and the screen below it renders again.
 *   layer  — something a component shows over the current screen: the inspect sheet, a card, the
 *            pause menu, a dialog. The component owns whether it is showing; it registers here so
 *            that the one close, and the phone's back gesture, reach it in the right order.
 *
 * They share one list because they interleave in time. Settings opened from the pause menu is a
 * screen ABOVE a layer, [play, pause, settings], and closing Settings must land on the pause menu.
 *
 * SIBLINGS ARE NOT LEVELS (Shantanu's ruling, 13 September 2026). Help's Next replaces the section
 * in place, so Back from section 6 reached by Next goes to the index, not to section 5; otherwise
 * reading all ten sections would take ten Backs to leave.
 *
 * Pure, so the rule can be tested before it is trusted on a phone (`stack.test.ts`).
 */

export type NavEntry<S> =
  | { readonly kind: 'screen'; readonly screen: S }
  | { readonly kind: 'layer'; readonly id: string; readonly floating: boolean };

export interface NavStack<S> {
  readonly entries: readonly NavEntry<S>[];
}

/** What the floating button says: Back when closing returns to a previous level, Close when it
 *  returns to a main screen. */
export type CloseLabel = 'back' | 'close';

/** A stack holding only its base screen, which can never be closed. */
export function stackOf<S>(base: S): NavStack<S> {
  return { entries: [{ kind: 'screen', screen: base }] };
}

/** Opens a screen one level down. */
export function pushScreen<S>(s: NavStack<S>, screen: S): NavStack<S> {
  return { entries: [...s.entries, { kind: 'screen', screen }] };
}

/** Replaces the current screen at the same level: a sibling, such as Help's Next. */
export function replaceScreen<S>(s: NavStack<S>, screen: S): NavStack<S> {
  const entries = s.entries.slice();
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i]?.kind === 'screen') {
      entries[i] = { kind: 'screen', screen };
      return { entries };
    }
  }
  return s;
}

/** Registers a layer over whatever is on top. Opening one already open changes nothing. */
export function openLayer<S>(s: NavStack<S>, id: string, floating: boolean): NavStack<S> {
  if (s.entries.some((e) => e.kind === 'layer' && e.id === id)) return s;
  return { entries: [...s.entries, { kind: 'layer', id, floating }] };
}

/** Removes a layer wherever it is: a component can hide its layer while a screen sits above it. */
export function closeLayer<S>(s: NavStack<S>, id: string): NavStack<S> {
  const entries = s.entries.filter((e) => !(e.kind === 'layer' && e.id === id));
  return entries.length === s.entries.length ? s : { entries };
}

/** Removes the top entry. The base is never removed: at the base there is nothing to close. */
export function popTop<S>(s: NavStack<S>): NavStack<S> {
  return s.entries.length <= 1 ? s : { entries: s.entries.slice(0, -1) };
}

export function topEntry<S>(s: NavStack<S>): NavEntry<S> | undefined {
  return s.entries[s.entries.length - 1];
}

/** The screen being shown: the topmost screen entry, whatever layers sit over it. */
export function currentScreen<S>(s: NavStack<S>): S {
  for (let i = s.entries.length - 1; i >= 0; i -= 1) {
    const e = s.entries[i];
    if (e?.kind === 'screen') return e.screen;
  }
  // stackOf always starts with a screen and popTop never removes the base, so this is a stack
  // built by hand; it is refused loudly rather than guessed at.
  throw new Error('A navigation stack with no screen in it.');
}

/** Levels above the base: how many closes the stack holds. */
export function depthOf<S>(s: NavStack<S>): number {
  return s.entries.length - 1;
}

/**
 * What the floating button says, or null when it is not shown: at the base there is nothing to
 * close, and a dialog on top is acknowledged by its own button rather than closed.
 */
export function closeLabel<S>(s: NavStack<S>, isMain: (screen: S) => boolean): CloseLabel | null {
  const top = topEntry(s);
  if (top === undefined || s.entries.length <= 1) return null;
  if (top.kind === 'layer' && !top.floating) return null;
  const under = s.entries[s.entries.length - 2];
  return under?.kind === 'screen' && isMain(under.screen) ? 'close' : 'back';
}
