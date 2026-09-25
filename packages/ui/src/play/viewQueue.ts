/**
 * WHAT ARRIVES WHILE A SPREAD PLAYS (P3.7 piece D, FINDINGS #89).
 *
 * The play screen shows a spread frame by frame, and holds back the views that arrive meanwhile so
 * the panels do not change under the animation. Alone, exactly one view arrives during a spread: the
 * one the spread ended in. So the screen kept one, the latest, and checked the spread's last frame
 * against it (the renderer's half of `burst-tail-authoritative`).
 *
 * PLAYED TOGETHER, OTHERS KEEP PLAYING. The captain taps through the spread and draws the next card
 * while another player's device is still animating, so a second view arrives before that spread
 * ends. Keeping only the latest did two wrong things, measured in a three-player game on Hard:
 *
 * - **the check failed** on every such spread, comparing the spread's last frame with the NEXT
 *   turn's draw: a check that fires on a correct game is a broken instrument;
 * - **the views in between were never shown**, so the screen went from before the spread straight
 *   to the next draw, and worked out that draw's arrivals against the state before the spread:
 *   whatever the spread itself had made counted as having just arrived.
 *
 * So every view is kept, in order, and shown one at a time once the frames are done; and each
 * spread's last frame is checked against THE VIEW THAT SPREAD ENDED IN, which is the first to arrive
 * after it (the room sends a spread and its view together, and nothing comes between them).
 *
 * Pure, and tested on the orders a table produces before the screen uses it (`viewQueue.test.ts`).
 */
import type { SessionView, ViewState } from '@immunity-wars/session';

export interface Frame {
  readonly view: ViewState;
  readonly label: string;
  readonly dice?: unknown;
}

export interface QueuedFrame extends Frame {
  /**
   * On a spread's last frame, once its view has arrived: that view, which the frame must equal,
   * and how many frames the spread had. Absent on every other frame.
   */
  tail?: { readonly view: ViewState; readonly size: number };
}

export class ViewQueue {
  private readonly frames: QueuedFrame[] = [];
  private readonly views: SessionView[] = [];
  /** The last frame of the spread whose own view has not arrived yet. */
  private closing: { frame: QueuedFrame; size: number } | null = null;

  /** A spread arrived: its frames join the queue, and the next view to arrive is the one it ended in. */
  burst(frames: readonly Frame[]): void {
    const queued: QueuedFrame[] = frames.map((f) => ({ ...f }));
    this.frames.push(...queued);
    const last = queued.at(-1);
    this.closing = last ? { frame: last, size: queued.length } : null;
  }

  /**
   * A view arrived. True when it can be shown at once: nothing is playing and nothing is waiting.
   * Otherwise it waits its turn behind everything that arrived before it.
   */
  view(v: SessionView, playing: boolean): boolean {
    if (this.closing !== null) {
      this.closing.frame.tail = { view: v.game, size: this.closing.size };
      this.closing = null;
    }
    if (!playing && this.frames.length === 0 && this.views.length === 0) return true;
    this.views.push(v);
    return false;
  }

  nextFrame(): QueuedFrame | undefined {
    return this.frames.shift();
  }

  get framesLeft(): number {
    return this.frames.length;
  }

  /** The next view waiting, and only once every frame before it has been shown. */
  nextView(): SessionView | undefined {
    return this.frames.length > 0 ? undefined : this.views.shift();
  }
}
