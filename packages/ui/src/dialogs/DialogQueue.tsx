/**
 * THE DIALOG QUEUE — the mechanism, and only the mechanism (docs/APP_FLOW.md ruling 5).
 *
 * Which engine events modalize versus merely log is a per-event decision made later, event by
 * event; this file decides none of them. It provides: a FIFO queue, one dialog visible at a
 * time, dismissed → next. The card reveal (PlayScreen) is the first client.
 *
 * Layering (APP_FLOW ruling 1, back-ordering dialog → sheet → pause → confirm): the dialog is
 * dismissed FIRST, so it renders topmost — above the inspect sheet (10) and the pause sheet
 * (15). While a dialog is up its overlay blocks the surface behind it, which is what makes
 * "the pause can't open over a dialog" true without any coordination code.
 */
import { KitButton } from '../kit/Button';
import { kitCardStyle } from '../kit/Surface';
import { COLOUR, TYPE } from '../kit/tokens';
import { useCallback, useRef, useState, type ReactElement, type ReactNode } from 'react';

export interface QueuedDialog {
  /** Stable id — a dialog enqueued twice with the same id is dropped, not shown twice. */
  id: string;
  title: string;
  body: ReactNode;
  /** The dismiss button's label, catalogue-supplied by the client. */
  dismissLabel: string;
}

export interface DialogQueue {
  current: QueuedDialog | null;
  enqueue: (d: QueuedDialog) => void;
  dismiss: () => void;
  /**
   * Whether a dialog is showing or queued, answered NOW rather than at the next render. A new
   * game's goal dialog is enqueued in an effect, and the draw's effect runs in the same flush: read
   * from `current`, it would see no dialog and draw before the goal was ever shown.
   */
  hasPending: () => boolean;
}

export function useDialogQueue(): DialogQueue {
  const [queue, setQueue] = useState<QueuedDialog[]>([]);
  // Ids ever enqueued — the dedupe guard. A ref, not state: it never affects rendering.
  const seenRef = useRef<Set<string>>(new Set());
  // How many are showing or queued, kept in step synchronously with every enqueue and dismiss.
  const pendingRef = useRef(0);

  const enqueue = useCallback((d: QueuedDialog): void => {
    if (seenRef.current.has(d.id)) return;
    seenRef.current.add(d.id);
    pendingRef.current += 1;
    setQueue((q) => [...q, d]);
  }, []);

  const dismiss = useCallback((): void => {
    pendingRef.current = Math.max(0, pendingRef.current - 1);
    setQueue((q) => q.slice(1));
  }, []);

  const hasPending = useCallback((): boolean => pendingRef.current > 0, []);

  return { current: queue[0] ?? null, enqueue, dismiss, hasPending };
}

export function DialogHost({
  dialog,
  onDismiss,
}: {
  dialog: QueuedDialog | null;
  onDismiss: () => void;
}): ReactElement | null {
  if (!dialog) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 18, 22, 0.66)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
      }}
    >
      <div
        style={{
          width: 'min(92vw, 380px)',
          // Border-box, so the padding stays inside the width: at 200% text (a 180px layout,
          // Gate 1's zoom audit, 6 September 2026) content-box sizing overflowed by 8px.
          boxSizing: 'border-box',
          // A single long word ("Immunosuppression" at 16px bold) is wider than a 180px
          // layout's dialog and pushed it past the viewport at 200% text; break it there.
          overflowWrap: 'anywhere',
          maxHeight: '80vh',
          overflowY: 'auto',
          // A card of the kit's cream, since stage L4 of the look. What it is told is its own body's
          // to draw; its one button is the kit's main one, because acknowledging it is all there is
          // to do.
          ...kitCardStyle,
          padding: '16px 16px 20px',
        }}
      >
        <h3 style={{ ...TYPE.heading, color: COLOUR.ink, margin: '0 0 8px' }}>{dialog.title}</h3>
        {dialog.body}
        <KitButton kind="main" style={{ marginTop: 14 }} onPress={onDismiss} data-dialog-dismiss="">
          {dialog.dismissLabel}
        </KitButton>
      </div>
    </div>
  );
}
