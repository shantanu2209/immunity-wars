/**
 * THE NAVIGATION HOST: the stack's state, the one floating close, the phone's back gesture, and
 * the hook a component uses to put a layer on the stack (docs/for-P2.7.md §9 rulings 8 and 9,
 * §10 piece 1).
 *
 * WHY THIS LIVES IN `ui` AND NOT IN `app`, where the piece 1 proposal put it. The dev shell mounts
 * the same PlayScreen as the app, and its cards and inspect sheet must close too; `ui` cannot
 * import `app`, so a stack in `app` would have left the dev shell's cards with no close at all.
 * The pure model is `stack.ts`; the history sync is `history.ts`; this file wires them to React.
 *
 * EVERY CLOSE GOES THROUGH `nav.close()`. The floating button calls it, the back gesture calls it,
 * and a layer's own close function is reached only through it, so there is one order and one rule.
 * A component that hides its layer by other means (picking a cell from the inspect sheet closes
 * the sheet) simply stops registering it, and the stack follows.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';

import { t } from '../i18n';
import { createHistorySync, type HistorySync } from './history';
import {
  closeLabel,
  closeLayer,
  currentScreen,
  depthOf,
  openLayer,
  popTop,
  pushScreen,
  replaceScreen,
  stackOf,
  topEntry,
  type CloseLabel,
  type NavStack,
} from './stack';

/**
 * Space a scrolling surface keeps free at its bottom so its last line is never under the floating
 * button. In rem, so it grows with the text size exactly as the button does; a px reserve would be
 * outgrown at 200% text, which the Gate 1 audit's occlusion check measures.
 */
export const FLOAT_RESERVE = '5.5rem';

/** What a component needs to put a layer on the stack. Stable for the life of the host. */
export interface NavLayerApi {
  openLayer: (id: string, floating: boolean, close: () => void) => void;
  closeLayer: (id: string) => void;
}

export interface Nav<S> extends NavLayerApi {
  stack: NavStack<S>;
  /** The screen being shown. */
  screen: S;
  /** Opens a screen one level down. */
  push: (screen: S) => void;
  /** Replaces the current screen at the same level (a sibling). */
  replace: (screen: S) => void;
  /** Starts again from a new base: a new game, the title, the result. */
  reset: (base: S) => void;
  /** Closes one level: the top screen, or the top layer through its own close. */
  close: () => void;
  /** True when there is a level above the base to close. */
  canClose: () => boolean;
  /** The floating button's label, or null when it is not shown. */
  label: CloseLabel | null;
}

const NavContext = createContext<NavLayerApi | null>(null);

export function useNav<S>(base: S, isMain: (screen: S) => boolean): Nav<S> {
  const [stack, setStack] = useState<NavStack<S>>(() => stackOf(base));
  // The stack is read synchronously by close(), which the back gesture can call several times in
  // one event; state alone would give every call the same stale stack.
  const ref = useRef<NavStack<S>>(stack);
  const closers = useRef(new Map<string, () => void>());

  const update = useCallback((f: (s: NavStack<S>) => NavStack<S>): void => {
    const next = f(ref.current);
    if (next === ref.current) return;
    ref.current = next;
    setStack(next);
  }, []);

  const api = useMemo(
    () => ({
      push: (screen: S): void => update((s) => pushScreen(s, screen)),
      replace: (screen: S): void => update((s) => replaceScreen(s, screen)),
      reset: (next: S): void => {
        closers.current.clear();
        update(() => stackOf(next));
      },
      openLayer: (id: string, floating: boolean, close: () => void): void => {
        closers.current.set(id, close);
        update((s) => openLayer(s, id, floating));
      },
      closeLayer: (id: string): void => {
        closers.current.delete(id);
        update((s) => closeLayer(s, id));
      },
      close: (): void => {
        const top = topEntry(ref.current);
        if (top === undefined || depthOf(ref.current) === 0) return;
        if (top.kind === 'layer') {
          const fn = closers.current.get(top.id);
          closers.current.delete(top.id);
          update((s) => closeLayer(s, top.id));
          fn?.();
        } else {
          update(popTop);
        }
      },
      canClose: (): boolean => depthOf(ref.current) > 0,
    }),
    [update],
  );

  return {
    ...api,
    stack,
    screen: currentScreen(stack),
    label: closeLabel(stack, isMain),
  };
}

/** Puts a layer on the stack while `open` is true, through the host the component sits under. */
export function useNavLayer(id: string, open: boolean, close: () => void, floating = true): void {
  useNavLayerWith(useContext(NavContext), id, open, close, floating);
}

/** The same, for the shell, which owns the host and so sits above its context. */
export function useNavLayerWith(
  api: NavLayerApi | null,
  id: string,
  open: boolean,
  close: () => void,
  floating = true,
): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (api === null || !open) return undefined;
    api.openLayer(id, floating, () => closeRef.current());
    return () => api.closeLayer(id);
  }, [api, id, open, floating]);
}

export function NavHost<S>({
  nav,
  baseGuard,
  onBaseBack,
  children,
}: {
  nav: Nav<S>;
  /**
   * Whether the back gesture at this base screen is caught rather than leaving the app. True for
   * Play, where APP_FLOW ruling 1 says back opens the pause menu; false for the Title, where it
   * leaves as any site does.
   */
  baseGuard?: (screen: S) => boolean;
  /** What the caught gesture does at the base: open the pause menu. */
  onBaseBack?: () => void;
  children: ReactNode;
}): ReactElement {
  const syncRef = useRef<HistorySync | null>(null);
  const navRef = useRef(nav);
  navRef.current = nav;
  const baseBackRef = useRef(onBaseBack);
  baseBackRef.current = onBaseBack;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    syncRef.current = createHistorySync(window.history);
    const onPop = (e: PopStateEvent): void => {
      const back = syncRef.current?.onPop(e.state) ?? 0;
      for (let i = 0; i < back; i += 1) {
        if (navRef.current.canClose()) navRef.current.close();
        else baseBackRef.current?.();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const first = nav.stack.entries[0];
  const guarded = first?.kind === 'screen' && baseGuard !== undefined && baseGuard(first.screen);
  const target = depthOf(nav.stack) + (guarded ? 1 : 0);
  useEffect(() => {
    syncRef.current?.sync(target);
  }, [target, nav.stack]);

  const layerApi = useMemo<NavLayerApi>(
    () => ({ openLayer: nav.openLayer, closeLayer: nav.closeLayer }),
    [nav.openLayer, nav.closeLayer],
  );

  return (
    <NavContext.Provider value={layerApi}>
      {children}
      {/* While the floating close shows, the page underneath can still scroll (the inspect sheet
          is not modal), so the document gets room at its end: without it the last lines of the
          game's page scroll under the button. The audit's occlusion check is what says so. */}
      {nav.label !== null ? (
        <div aria-hidden="true" data-nav-spacer="" style={{ height: FLOAT_RESERVE }} />
      ) : null}
      {nav.label !== null ? <FloatingClose label={nav.label} onClose={nav.close} /> : null}
    </NavContext.Provider>
  );
}

const FLOAT: CSSProperties = {
  position: 'fixed',
  left: '50%',
  transform: 'translateX(-50%)',
  bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
  width: 'min(92vw, 420px)',
  boxSizing: 'border-box',
  minHeight: 48,
  padding: '10px 16px',
  fontSize: '1rem',
  fontWeight: 700,
  color: '#2E2A28',
  background: '#FFFDF9',
  border: '2px solid #8E6E53',
  borderRadius: 999,
  boxShadow: '0 4px 16px rgba(46,42,40,0.25)',
  cursor: 'pointer',
  // Above the cards (40) and the dialogs (30); a dialog on top hides the button altogether.
  zIndex: 50,
};

/** The one close (ruling 8): at the bottom of the screen, present throughout, never at the end of
 *  a scroll. Its word follows the stack (ruling 9). */
export function FloatingClose({
  label,
  onClose,
}: {
  label: CloseLabel;
  onClose: () => void;
}): ReactElement {
  return (
    <button style={FLOAT} onClick={onClose} data-nav-close={label}>
      {t(label === 'back' ? 'nav.back' : 'nav.close')}
    </button>
  );
}
