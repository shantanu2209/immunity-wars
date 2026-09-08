/**
 * The string inventory's line-numbering note, which used to be a hand-typed sentence INSIDE the
 * generated document and is now computed by the generator.
 *
 * The trap it came from is `FINDINGS.md` #65: a hand edit inside a generated file is deleted by
 * the next regeneration, silently, and nothing catches it because nothing knows the edit was
 * there. This one survived from 6 September to 8 September only because nobody regenerated.
 *
 * Moving a sentence into a generator is not by itself an improvement — a computed wrong number
 * is worse than a hand-typed right one. What makes it an improvement is that the offset is
 * CHECKED against the file before it is printed, and the checking is what these tests are about.
 *
 * ONE THING THE FIRST DRAFT OF THIS FILE GOT WRONG, kept because it is the awkward part.
 * `blocks.join(...)` starts the joined source at the character immediately after `<script>`, so
 * **joined line 1 is the remainder of the tag's own line**, which is usually empty, and the first
 * line of actual code is joined line 2. The helper below builds its inputs so that the two
 * readings are consistent by construction, because building them by hand is exactly how the
 * off-by-one got in.
 *
 * The real input cannot be a control here: `tools/legacy/` is read-only by hard rule, so a
 * control that mutated `v2_ui.html` to make the mapping fail is not available even temporarily.
 * These use synthetic documents of the same shape instead.
 */

import { describe, expect, it } from 'vitest';

import { lineOffset } from '../string-inventory.js';

/**
 * A document with `head` lines before the tag, then `body` inside the script — and the joined
 * source the parser would be given for it. Joined line 1 is the empty remainder of the tag line,
 * so the expected offset is always `head`.
 */
const scriptDoc = (
  head: number,
  body: string[],
  attrs = '',
): { html: string; joined: string[] } => ({
  html: [
    ...Array.from({ length: head }, (_, i) => `line ${i + 1} of the head`),
    `<script${attrs}>`,
    ...body,
    '</script>',
  ].join('\n'),
  joined: ['', ...body],
});

describe('lineOffset', () => {
  it('finds the offset from the head of the file, and it is the number to ADD', () => {
    const { html, joined } = scriptDoc(3, ['const a = 1;', 'const b = 2;', 'const c = 3;']);
    const offset = lineOffset(html, joined, [1, 2, 3, 4]);
    expect(offset).toBe(3);
    // The property that matters to a reader of the document: shown + offset is the real line.
    const real = html.split('\n');
    expect(real[2 + (offset as number) - 1]).toBe('const a = 1;');
  });

  it('handles a script tag with attributes, since the real file has them', () => {
    const { html, joined } = scriptDoc(2, ['const a = 1;'], ' type="module" defer');
    expect(lineOffset(html, joined, [1, 2])).toBe(2);
  });

  it('CONTROL: returns null when the joined lines do NOT sit at that offset', () => {
    // The shape a second script block can produce: a single offset does not reproduce every
    // line. This is the case the note must not print a number for, and it is the whole reason
    // the offset is checked rather than derived and trusted.
    const { html } = scriptDoc(3, ['const a = 1;', 'const b = 2;']);
    expect(lineOffset(html, ['', 'const a = 1;', 'SOMETHING ELSE ENTIRELY'], [1, 2, 3])).toBeNull();
  });

  it('CONTROL: checks EVERY line it is given, not just the first', () => {
    const { html } = scriptDoc(3, ['const a = 1;', 'const b = 2;']);
    const wrongLast = ['', 'const a = 1;', 'NOT THE SAME'];
    // Lines 1 and 2 agree, so a check that sampled only the start would pass here.
    expect(lineOffset(html, wrongLast, [1, 2])).toBe(3);
    expect(lineOffset(html, wrongLast, [1, 2, 3])).toBeNull();
  });

  it('CONTROL: returns null past the end of the file rather than reading undefined as a match', () => {
    const { html, joined } = scriptDoc(3, ['const a = 1;']);
    expect(lineOffset(html, joined, [1, 900])).toBeNull();
  });

  it('CONTROL: returns null when there is no script at all', () => {
    expect(lineOffset('<html><body>nothing here</body></html>', ['x'], [1])).toBeNull();
  });

  it('compares trimmed, because the two readings can differ in leading whitespace', () => {
    const { html } = scriptDoc(2, ['    const a = 1;']);
    expect(lineOffset(html, ['', 'const a = 1;'], [1, 2])).toBe(2);
  });
});
