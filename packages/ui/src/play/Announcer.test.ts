/**
 * WHAT AN ACTION DID, FOUND IN THE LOG (screen reader support, its second part; docs/LOOK_PLAN.md
 * §38). The engine's log is newest first and kept to a length, so the lines an action added are
 * the ones before where the log stood. Found wrong, a screen reader is told an old line again, or
 * nothing. Control: pnpm ci:selftest announcer-finds-what-is-new.
 */
import { describe, expect, it } from 'vitest';

import type { LogLine } from '../panels/LogPanel';
import { newLines, spokenLine } from './Announcer';

const line = (t: number, msg: string): LogLine => ({ t, msg, kind: '' });
const before = [line(1, 'c'), line(1, 'b'), line(1, 'a')];

describe('the lines an action added', () => {
  it('are those before where the log stood, oldest first', () => {
    const now = [line(1, 'e'), line(1, 'd'), ...before];
    expect(
      newLines(before, now).map((l) => l.msg),
      'THE NEW LINES ARE NOT FOUND',
    ).toEqual(['d', 'e']);
  });

  it('are none when nothing was added', () => {
    expect(newLines(before, before), 'THE NEW LINES ARE NOT FOUND').toEqual([]);
  });

  it('are found when the oldest has fallen off the kept length', () => {
    const now = [line(2, 'x'), ...before.slice(0, 2)];
    expect(newLines(before.slice(0, 2), now).map((l) => l.msg)).toEqual(['x']);
  });

  it('are not fooled by a line that repeats: a move logged twice is two lines', () => {
    const was = [line(1, 'moved'), line(1, 'b')];
    const now = [line(1, 'moved'), line(1, 'moved'), line(1, 'b')];
    expect(newLines(was, now).map((l) => l.msg)).toEqual(['moved']);
  });

  it('when nothing of before is left, are the newest three, oldest first', () => {
    const now = [line(9, 'z'), line(9, 'y'), line(9, 'x'), line(9, 'w')];
    expect(newLines(before, now).map((l) => l.msg)).toEqual(['x', 'y', 'z']);
  });

  it('are said without the log’s emphasis marks', () => {
    expect(spokenLine(line(1, 'a <b>bold</b> word'))).not.toContain('<b>');
  });
});
