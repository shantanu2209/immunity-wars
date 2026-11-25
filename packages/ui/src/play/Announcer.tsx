/**
 * WHAT HAPPENS IS SAID (screen reader support, its second part; ruled 25 November 2026,
 * docs/LOOK_PLAN.md §34 and §38).
 *
 * A sighted player watches a move land, a coat snap on, each beat of the spread play out on the
 * board. A player with a screen reader is told nothing of it: the board is pictures, and the log
 * that says it in words is in the messages, which nobody opens after every tap. So what happens is
 * said, in the ordinary way a page says something that changed: a region that is not seen, which a
 * screen reader reads aloud when its words change, politely, after what it is already saying.
 *
 *   - EACH BEAT OF THE SPREAD, as it is shown: its name, the words the eye reads above the board.
 *   - WHAT AN ACTION DID: the log's new lines, oldest first, in the words the messages show them in.
 *   - NOTHING when the screen opens, a game resumed or new: what is already in the log was not just
 *     done. And nothing of the spread's own lines when it ends: its beats were said as they played.
 *
 * A refusal is already said: the passing message that gives it is a region of its own (`Toast`).
 *
 * Dumb by design: it decides nothing. The words are the catalogue's, through the same renderers the
 * screens use, so they are said in the language the player chose.
 *
 * Held on the built app by `pnpm sr:walk`. Controls: pnpm ci:selftest
 * sr-walk-what-an-action-did-is-said, sr-walk-the-spread-is-said.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';

import type { ViewState } from '@immunity-wars/session';

import { engineLogText, engineText } from '../engineText';
import { SPOKEN_ONLY } from '../kit/spoken';
import { richRuns, type LogLine } from '../panels/LogPanel';
import { logLinesOf } from './effects';
import { useFrame, type FrameStore } from './frameStore';

const same = (a: LogLine | undefined, b: LogLine | undefined): boolean =>
  a !== undefined && b !== undefined && a.t === b.t && a.msg === b.msg && a.kind === b.kind;

/**
 * The lines `now` has that `before` did not, oldest first. The engine's log is newest first and
 * kept to a length, so what is new is what stands before the lines `before` began with. Found by
 * the first few of them together, since one line alone (a move logged twice) can repeat. When none
 * of `before` is left in `now`, more happened than the log keeps; the newest three are said.
 */
export function newLines(before: readonly LogLine[], now: readonly LogLine[]): LogLine[] {
  if (before.length === 0) return now.slice(0, 3).reverse();
  const probe = before.slice(0, Math.min(3, before.length));
  for (let k = 0; k + probe.length <= now.length; k += 1) {
    if (probe.every((line, i) => same(line, now[k + i]))) return now.slice(0, k).reverse();
  }
  return now.slice(0, 3).reverse();
}

/** A log line as it is said: the words the messages show, without their emphasis marks. */
export const spokenLine = (line: LogLine): string =>
  richRuns(engineLogText(line.msg).text)
    .map((run) => run.text)
    .join('');

export function Announcer({
  store,
  game,
  playing,
}: {
  store: FrameStore;
  game: ViewState;
  playing: boolean;
}): ReactElement {
  const frame = useFrame(store);
  // What is said, and how many times something has been: the count makes a new element of the
  // same words, so that a beat said twice in a row (The march, turn after turn) is said again.
  const [said, setSaid] = useState<{ text: string; n: number }>({ text: '', n: 0 });
  const say = (text: string): void => {
    if (text !== '') setSaid((s) => ({ text, n: s.n + 1 }));
  };

  // EACH BEAT OF THE SPREAD, as it is shown.
  const beat = frame === null ? null : `${String(frame.n)}\u0000${frame.label}`;
  useEffect(() => {
    if (frame !== null) say(engineText(frame.label));
  }, [beat]);

  // WHAT AN ACTION DID: the log's new lines, once the screen has a view to compare with.
  const seen = useRef<LogLine[] | null>(null);
  const wasPlaying = useRef(playing);
  useEffect(() => {
    const lines = logLinesOf(game);
    const before = seen.current;
    const spreadEnded = wasPlaying.current && !playing;
    wasPlaying.current = playing;
    if (playing) return;
    seen.current = lines;
    if (before === null || spreadEnded) return;
    const fresh = newLines(before, lines);
    if (fresh.length > 0) say(fresh.map(spokenLine).join(' '));
  }, [game, playing]);

  return (
    <div data-announce="" role="status" aria-live="polite" aria-atomic="true" style={SPOKEN_ONLY}>
      <span key={said.n}>{said.text}</span>
    </div>
  );
}
