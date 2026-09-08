/**
 * THE ERROR BOUNDARY, and the two listeners beside it that make it more than half a net.
 *
 * Built to `docs/for-P2.6-errors.md` §2.1, ruled 8 September 2026.
 *
 * ============================================================================================
 * WHY THE LISTENERS ARE NOT OPTIONAL
 * ============================================================================================
 *
 * A React error boundary catches errors thrown during RENDER, in lifecycle methods, and in
 * constructors of the tree below it. It does **not** catch errors in event handlers, in
 * `setTimeout` callbacks, or in promise rejections.
 *
 * **That is most of this app's real failure surface.** Every action goes through an `onClick`;
 * the spread walks its frames on a timer; `sendAction` is async. A boundary alone would sit
 * there catching nothing, look like it worked because it had never fired, and let the exact
 * crashes it exists for through to a white screen. So `error` and `unhandledrejection` on the
 * window route into the same state.
 *
 * ============================================================================================
 * A BOUNDARY THAT HAS NEVER FIRED IS NOT KNOWN TO WORK
 * ============================================================================================
 *
 * The standing rule, and it applies to this more than to most things, because the thing being
 * tested is the behaviour of the app at its least predictable moment. Three ways it is exercised
 * rather than assumed:
 *
 *   - `crashForTesting()` throws from a render, reaching `getDerivedStateFromError`.
 *   - the dev shell's deliberate-throw controls reach the handler and the rejection path.
 *   - the Gate 1 audit walks the resulting screen in all four cases.
 *
 * ============================================================================================
 * IT HOLDS NO SESSION AND NO STORAGE
 * ============================================================================================
 *
 * Ruling 2: nothing under this component may write. It takes a `render` callback and hands it
 * the error; what that renders is the shell's business, and the shell passes a `CrashScreen`
 * that also has no storage handle. Both are shaped so the ruling cannot be violated by someone
 * later adding a helpful button.
 */
import { Component, type ErrorInfo, type ReactElement, type ReactNode } from 'react';

/** Everything the crash screen is given about what happened. Message and stack only. */
export interface CrashDetail {
  readonly message: string;
  readonly stack: string;
  /** Where it came from, so a report can say. Not shown as a category to the player. */
  readonly source: 'render' | 'event' | 'promise';
}

const describe = (source: CrashDetail['source'], err: unknown): CrashDetail => {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack ?? '', source };
  }
  // A thrown non-Error (a string, an object) is rare and is exactly the case where a naive
  // `err.message` would produce "undefined" and lose the only clue there was.
  let text: string;
  try {
    text = typeof err === 'string' ? err : JSON.stringify(err);
  } catch {
    text = Object.prototype.toString.call(err);
  }
  return { message: text, stack: '', source };
};

interface Props {
  readonly children: ReactNode;
  readonly render: (detail: CrashDetail) => ReactElement;
  /** Called once when a crash is first caught, so the shell can read the save. Must not write. */
  readonly onCrash?: (detail: CrashDetail) => void;
}

interface State {
  readonly detail: CrashDetail | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { detail: null };

  static getDerivedStateFromError(err: unknown): State {
    return { detail: describe('render', err) };
  }

  override componentDidCatch(err: unknown, info: ErrorInfo): void {
    // The component stack is the most useful half of a React crash report and is not on the
    // Error, so it is appended rather than dropped.
    const base = describe('render', err);
    const detail: CrashDetail = {
      ...base,
      stack: `${base.stack}\n${info.componentStack ?? ''}`.trim(),
    };
    this.setState({ detail });
    this.props.onCrash?.(detail);
  }

  override componentDidMount(): void {
    window.addEventListener('error', this.onWindowError);
    window.addEventListener('unhandledrejection', this.onRejection);
  }

  override componentWillUnmount(): void {
    window.removeEventListener('error', this.onWindowError);
    window.removeEventListener('unhandledrejection', this.onRejection);
  }

  private readonly take = (detail: CrashDetail): void => {
    // FIRST ONE WINS. A crash often cascades — a broken render throws again on the next tick —
    // and the first error is the one that explains the others.
    if (this.state.detail) return;
    this.setState({ detail });
    this.props.onCrash?.(detail);
  };

  private readonly onWindowError = (e: ErrorEvent): void => {
    this.take(describe('event', e.error ?? e.message));
  };

  private readonly onRejection = (e: PromiseRejectionEvent): void => {
    this.take(describe('promise', e.reason));
  };

  override render(): ReactNode {
    const { detail } = this.state;
    return detail ? this.props.render(detail) : this.props.children;
  }
}

/** A component that throws when rendered. The boundary's own control; dev shell only. */
export function CrashForTesting(): ReactElement {
  throw new Error('deliberate crash, for the error boundary control');
}
