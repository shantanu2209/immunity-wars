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
}

export function useDialogQueue(): DialogQueue {
  const [queue, setQueue] = useState<QueuedDialog[]>([]);
  // Ids ever enqueued — the dedupe guard. A ref, not state: it never affects rendering.
  const seenRef = useRef<Set<string>>(new Set());

  const enqueue = useCallback((d: QueuedDialog): void => {
    if (seenRef.current.has(d.id)) return;
    seenRef.current.add(d.id);
    setQueue((q) => [...q, d]);
  }, []);

  const dismiss = useCallback((): void => {
    setQueue((q) => q.slice(1));
  }, []);

  return { current: queue[0] ?? null, enqueue, dismiss };
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
        background: 'rgba(46,42,40,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
      }}
    >
      <div
        style={{
          width: 'min(88vw, 380px)',
          maxHeight: '80vh',
          overflowY: 'auto',
          background: '#FFFDF9',
          border: '2px solid #B03A2E',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h3 style={{ fontSize: 18, color: '#B03A2E', margin: '0 0 8px' }}>{dialog.title}</h3>
        {dialog.body}
        <button
          style={{
            display: 'block',
            width: '100%',
            minHeight: 44,
            fontSize: 16,
            borderRadius: 10,
            border: '2px solid #8E6E53',
            background: '#FFFDF9',
            cursor: 'pointer',
            marginTop: 12,
          }}
          onClick={onDismiss}
        >
          {dialog.dismissLabel}
        </button>
      </div>
    </div>
  );
}
