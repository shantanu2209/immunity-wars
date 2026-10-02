/**
 * A CLAY PIECE, as a picture on the page (ruled 1 October 2026: the board is drawn as pictures on
 * the page, docs/LOOK_PLAN.md §12). The pictures are Blender's, built and gated by the art
 * pipeline (tools/art-pipeline/clay.ts) and served at `/art/clay/<view>/<name>@Nx.webp`.
 *
 * TWO VIEWS. `board` is the piece seen from straight above, lit as the board is; `card` is the
 * piece seen at an angle, for a card or a title.
 *
 * THE BASE. One of your own cells always stands on a base, a cream rim round a dark well, and an
 * invader never does (§13, ruling 2): it is what tells friend from foe, because colour cannot.
 * It is a separate picture under the cell, so the cell can hop while its base stays put.
 *
 * `label` is the piece's name for a reader that cannot see the picture; the caller takes it from
 * the catalogue. A piece that is only decoration beside its own written name passes `label=""`.
 */
import type { CSSProperties, ReactElement } from 'react';

export type KitPieceView = 'board' | 'card';

/** Your seven cells, as the pipeline names their pictures. An invader is named by its kind and its antigen class, as in `virus-ENV`. */
export const CLAY_CELLS = [
  'macrophage',
  'neutrophil',
  'bcell',
  'tcell',
  'helper',
  'nk',
  'eosinophil',
] as const;
export type ClayCell = (typeof CLAY_CELLS)[number];

const src = (art: string, view: KitPieceView, name: string, scale: 1 | 2 | 3): string =>
  `${art}clay/${view}/${name}@${scale}x.webp`;
const srcSet = (art: string, view: KitPieceView, name: string): string =>
  ([1, 2, 3] as const).map((s) => `${src(art, view, name, s)} ${s}x`).join(', ');

export function KitPiece({
  name,
  view = 'board',
  size,
  onBase = false,
  label,
  art = '/art/',
  style,
}: {
  name: string;
  view?: KitPieceView;
  /** The picture's width and height in CSS px. On the board a picture is 90 board units wide. */
  size: number;
  /** Stand it on a base. Board view only: a card shows the piece alone. */
  onBase?: boolean;
  label: string;
  /** Where the app serves its art from. */
  art?: string;
  style?: CSSProperties;
}): ReactElement {
  const layer: CSSProperties = { position: 'absolute', left: 0, top: 0, width: size, height: size };
  return (
    <span
      style={{ position: 'relative', display: 'inline-block', width: size, height: size, ...style }}
    >
      {onBase && view === 'board' ? (
        <img
          alt=""
          src={src(art, 'board', 'base', 1)}
          srcSet={srcSet(art, 'board', 'base')}
          style={layer}
        />
      ) : null}
      <img
        alt={label}
        src={src(art, view, name, 1)}
        srcSet={srcSet(art, view, name)}
        style={layer}
      />
    </span>
  );
}
