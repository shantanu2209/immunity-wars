/**
 * THE BURST'S CURRENT FRAME AS AN EXTERNAL STORE (the full-UI re-measure, 6 September 2026).
 *
 * The frame used to be React state on the play screen, so every frame of a spread re-rendered
 * the WHOLE screen: the effects strip, the command bar with its rows, the piece grid, the
 * antibody, body and log panels — none of which change during a burst, because they all read
 * the authoritative view, which is held until the burst drains. Measured on the full UI at 6×
 * CPU throttling: 59.7ms per frame at p50 against the 32ms row (the board alone was 19.7ms at
 * P2.3). So the frame lives here, and only the three things that show it subscribe: the board
 * with its narration, the log panel, and the shell's controls line. The screen's own React
 * state changes twice per burst (playing on, playing off), not once per frame.
 *
 * This changes nothing about what is mounted and nothing about the flight: the same
 * components render the same views; fewer of them are asked to on each frame.
 */
import { useSyncExternalStore } from 'react';

import type { ViewState } from '@immunity-wars/session';

export interface Frame {
  view: ViewState;
  label: string;
  n: number;
  of: number;
  dice: unknown;
}

export interface FrameStore {
  get: () => Frame | null;
  set: (frame: Frame | null) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createFrameStore(): FrameStore {
  let frame: Frame | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => frame,
    set: (f) => {
      frame = f;
      for (const l of listeners) l();
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

/** The current frame, re-rendering only the caller when it changes. */
export function useFrame(store: FrameStore): Frame | null {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
