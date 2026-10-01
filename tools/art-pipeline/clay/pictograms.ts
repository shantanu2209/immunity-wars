/**
 * THE PICTOGRAMS on the board's coins: the seven organs, the six ways in, and the mark on a
 * pathogen nobody has identified yet. Drawn in code at stage L1 of docs/LOOK_PLAN.md, one colour
 * each, in a box of about 68 units round 0,0. FILL is the pictogram itself; LINE is a detail cut
 * out of it, so the coin shows through.
 *
 * They are used twice, and both uses read this one file:
 *   `pnpm art:clay --pictograms`  writes each as a white-on-clear PNG under clay/_png/tex/, which
 *                                 clay/pieces.py lays on a coin as a decal;
 *   the contrast gate             uses the same shape as a mask, to measure the pictogram's colour
 *                                 and the coin's separately in the finished render.
 *
 * Moved here from the L2 prototype's own pictograms at stage L4: the prototype is
 * removed at the end of L4, and the play screen's coins are made from these.
 */
import sharp from 'sharp';

export const ORGAN: Record<string, string> = {
  brain:
    '<path d="M-4 -24 C-18 -28 -30 -18 -28 -6 C-34 2 -28 14 -16 14 C-12 20 -2 20 2 15 C10 20 22 16 22 8 C32 4 32 -10 24 -14 C24 -24 10 -30 -4 -24 Z" fill="FILL"/><path d="M-4 -24 C-2 -12 -12 -8 -6 2 M-28 -6 C-20 -8 -16 -2 -18 4 M24 -14 C16 -14 12 -8 16 -2 M2 15 C4 8 -2 6 2 0" fill="none" stroke="LINE" stroke-width="2.6" stroke-linecap="round"/><path d="M6 16 C8 24 6 28 4 31" fill="none" stroke="FILL" stroke-width="6" stroke-linecap="round"/>',
  lungs:
    '<path d="M0 -30 V-8 M0 -10 C-4 -6 -8 -6 -10 -2 M0 -10 C4 -6 8 -6 10 -2" fill="none" stroke="FILL" stroke-width="5" stroke-linecap="round"/><path d="M-7 -6 C-24 -18 -34 6 -31 22 C-30 30 -18 28 -9 22 C-5 19 -6 4 -7 -6 Z" fill="FILL"/><path d="M7 -6 C24 -18 34 6 31 22 C30 30 18 28 9 22 C5 19 6 4 7 -6 Z" fill="FILL"/>',
  heart:
    '<path d="M0 29 C-40 5 -33 -25 -15 -25 C-6 -25 -1 -19 0 -12 C1 -19 6 -25 15 -25 C33 -25 40 5 0 29 Z" fill="FILL"/><path d="M-20 -8 C-19 -14 -15 -17 -11 -17" fill="none" stroke="LINE" stroke-width="3" stroke-linecap="round"/>',
  liver:
    '<path d="M-34 -6 C-32 -24 14 -26 32 -14 C40 -8 36 2 24 6 C10 10 2 14 -8 20 C-22 28 -36 14 -34 -6 Z" fill="FILL"/><path d="M-2 -22 C0 -8 -4 6 -8 20" fill="none" stroke="LINE" stroke-width="2.4" stroke-linecap="round"/>',
  spleen:
    '<path d="M-6 -30 C18 -32 28 -6 18 20 C12 34 -12 32 -14 16 C-15 8 -4 6 -6 -4 C-8 -14 -22 -22 -6 -30 Z" fill="FILL"/><path d="M4 -18 C12 -8 12 6 6 18" fill="none" stroke="LINE" stroke-width="2.4" stroke-linecap="round"/>',
  kidneys:
    '<path d="M-14 -24 C-32 -24 -36 14 -18 24 C-8 28 -4 16 -8 8 C-12 2 -6 -6 -6 -14 C-6 -20 -8 -24 -14 -24 Z" fill="FILL"/><path d="M14 -24 C32 -24 36 14 18 24 C8 28 4 16 8 8 C12 2 6 -6 6 -14 C6 -20 8 -24 14 -24 Z" fill="FILL"/><path d="M-8 4 C-2 8 -2 20 -2 30 M8 4 C2 8 2 20 2 30" fill="none" stroke="FILL" stroke-width="3.4" stroke-linecap="round"/>',
  marrow:
    '<g transform="rotate(-42)"><path d="M-22 -7 H22 V7 H-22 Z" fill="FILL"/><circle cx="-25" cy="-8" r="9" fill="FILL"/><circle cx="-25" cy="8" r="9" fill="FILL"/><circle cx="25" cy="-8" r="9" fill="FILL"/><circle cx="25" cy="8" r="9" fill="FILL"/><path d="M-16 0 H16" stroke="LINE" stroke-width="5" stroke-linecap="round"/></g>',
};
export const ENTRY: Record<string, string> = {
  nose: '<path d="M4 -28 C2 -10 -16 6 -18 16 C-19 24 -8 26 -2 21 C2 26 14 24 14 14 L14 -28 Z" fill="FILL"/><circle cx="-6" cy="17" r="3" fill="LINE"/>',
  gut: '<path d="M-12 -30 H0 C0 -20 28 -20 28 4 C28 24 4 30 -12 24 C-22 20 -30 22 -30 30 H-30 C-34 16 -26 8 -16 10 C-6 12 8 12 8 0 C8 -12 -12 -8 -12 -30 Z" fill="FILL"/>',
  contact:
    '<path d="M-16 -2 H16 V16 C16 26 8 30 0 30 C-8 30 -16 26 -16 16 Z" fill="FILL"/><path d="M-12 -2 V-22 M-4 -4 V-28 M4 -4 V-28 M12 -2 V-22 M-17 10 L-26 0" fill="none" stroke="FILL" stroke-width="7" stroke-linecap="round"/>',
  wound:
    '<g transform="rotate(-32)"><path d="M-30 -2 Q0 -14 30 -2 Q0 10 -30 -2 Z" fill="FILL"/><path d="M-34 -2 H-30 M30 -2 H34" stroke="FILL" stroke-width="3" stroke-linecap="round"/></g><path d="M8 12 C13 19 15 22 15 25 A7 7 0 1 1 1 25 C1 22 3 19 8 12 Z" fill="FILL"/><path d="M-12 20 C-9 24 -8 26 -8 28 A4.4 4.4 0 1 1 -16.8 28 C-16.8 26 -15 24 -12 20 Z" fill="FILL"/>',
  bite: '<ellipse cx="2" cy="6" rx="6" ry="17" fill="FILL" transform="rotate(20 2 6)"/><circle cx="-6" cy="-12" r="5.5" fill="FILL"/><path d="M-8 -16 L-18 -30" stroke="FILL" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="14" cy="-8" rx="15" ry="6" fill="FILL" opacity=".55" transform="rotate(-28 14 -8)"/><ellipse cx="-14" cy="2" rx="14" ry="5.5" fill="FILL" opacity=".55" transform="rotate(28 -14 2)"/><path d="M2 2 L18 14 L22 26 M-2 6 L-16 16 L-18 28 M4 12 L14 26" fill="none" stroke="FILL" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  blood:
    '<path d="M0 -30 C14 -10 22 2 22 12 A22 22 0 1 1 -22 12 C-22 2 -14 -10 0 -30 Z" fill="FILL"/><path d="M-10 14 A11 11 0 0 0 0 24" fill="none" stroke="LINE" stroke-width="3" stroke-linecap="round"/>',
};
/** A question mark, drawn as a path so that no typeface is needed to make it. */
export const MARK: Record<string, string> = {
  unknown:
    '<path d="M-13 -12 C-13 -30 15 -30 15 -11 C15 2 1 0 1 13" fill="none" stroke="FILL" stroke-width="9" stroke-linecap="round"/><circle cx="1" cy="27" r="5.6" fill="FILL"/>',
};

export const PICTOGRAMS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(ORGAN).map(([k, v]) => [`organ-${k}`, v])),
  ...Object.fromEntries(Object.entries(ENTRY).map(([k, v]) => [`entry-${k}`, v])),
  ...MARK,
};

/** The pictogram as a square PNG, white where it is and clear where it is not. */
export async function pictogramPng(name: string, px: number): Promise<Buffer> {
  const svg = PICTOGRAMS[name];
  if (!svg) throw new Error(`no pictogram named ${name}`);
  // FILL is painted white and LINE is painted as a hole, through a mask.
  const shape = svg.replace(/\bFILL\b/g, 'white').replace(/\bLINE\b/g, 'black');
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-40 -40 80 80"><defs><mask id="m"><rect x="-40" y="-40" width="80" height="80" fill="black"/>${shape}</mask></defs><rect x="-40" y="-40" width="80" height="80" fill="white" mask="url(#m)"/></svg>`;
  return sharp(Buffer.from(doc)).png().toBuffer();
}
