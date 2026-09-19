/**
 * THE CELL CARD (P2.5 item 12, block c) — the pathogen card's shape for the player's own
 * pieces. Every field is CONTENT: `CELL_CARDS[cell]` (role, home, best against, deficiency,
 * an optional fact — one entry per cell key, Kartik's science, a missing field rendering
 * nothing), `UM[cell]` for the name and its one-line tag. The ~7 labels here are `ui.json`.
 *
 * "Right now" is the one line about THIS cell rather than the cell type: spent or offline,
 * and when it is back — the same line the piece strip and the inspect sheet show.
 */
import { CELL_CARDS, NK_HITS, SPEED, UM } from '@immunity-wars/content';
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';
import { FLOAT_RESERVE } from '../nav/NavHost';
import { cellDisplayName } from '../names';

export interface CellCardSubject {
  cell: string;
  /** Spent / offline and its return, already localised — or null. */
  now: string | null;
}

interface Fields {
  role?: string;
  home?: string;
  bestAgainst?: string;
  deficiency?: string;
  fact?: string;
}

const LABEL: CSSProperties = { fontSize: '0.75rem', color: '#78665D', fontWeight: 700 };

export function CellCard({ subject }: { subject: CellCardSubject }): ReactElement {
  const { cell } = subject;
  const card = (CELL_CARDS as Record<string, Fields | undefined>)[cell] ?? {};
  const tag = (UM as Record<string, { r?: string } | undefined>)[cell]?.r;
  const speed = (SPEED as Record<string, number | undefined>)[cell] ?? null;
  const fields = [
    ['cellCard.role', card.role],
    ['cellCard.home', card.home],
    ['cellCard.bestAgainst', card.bestAgainst],
    ['cellCard.deficiency', card.deficiency],
  ] as const;
  const filled = fields.some(([, text]) => text) || Boolean(card.fact);

  return (
    <div
      role="dialog"
      aria-label={t('cellCard.title')}
      style={{
        // A FULL WINDOW, as the pathogen card is (Shantanu, 20 September 2026).
        position: 'fixed',
        inset: 0,
        background: '#FFFDF9',
        overflowY: 'auto',
        zIndex: 40,
        padding: `14px 14px ${FLOAT_RESERVE}`,
        boxSizing: 'border-box',
      }}
    >
      <div
        data-cell-card-open={cell}
        style={{ maxWidth: 560, margin: '0 auto', fontSize: '0.875rem', color: '#2E2A28' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={`/art/cell-${cell}@3x.webp`} width={48} height={48} alt="" />
          <div style={{ flex: '1 1 auto' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8E6E53' }}>
              {cellDisplayName(cell)}
            </div>
            {tag ? <div style={{ fontSize: '0.8125rem', color: '#78665D' }}>{tag}</div> : null}
          </div>
        </div>
        {subject.now !== null ? (
          <div style={{ marginTop: 8 }}>
            <div style={LABEL}>{t('card.nowLabel')}</div>
            <div style={{ color: '#7A5600', fontWeight: 700 }}>{subject.now}</div>
          </div>
        ) : null}
        {fields.map(([key, text]) =>
          text ? (
            <div key={key} style={{ marginTop: 8 }}>
              <div style={LABEL}>{t(key)}</div>
              <div>{text}</div>
            </div>
          ) : null,
        )}
        {speed !== null ? (
          // HOW FAR IT MOVES, and the NK Cell's odds (piece 5, §19): they were said beside the
          // selected cell until the middle kept only what a turn needs. The numbers are content's.
          <div data-cell-card-speed={speed} style={{ marginTop: 8 }}>
            <div style={LABEL}>{t('cellCard.speed')}</div>
            <div>{speed}</div>
          </div>
        ) : null}
        {cell === 'nk' ? (
          <div style={{ marginTop: 8 }}>
            <div style={LABEL}>{t('cellCard.dice')}</div>
            <div>{t('actions.hitsOn', { n: NK_HITS })}</div>
          </div>
        ) : null}
        {card.fact ? (
          <div style={{ marginTop: 8, fontStyle: 'italic', color: '#78665D' }}>{card.fact}</div>
        ) : null}
        {!filled ? (
          <div style={{ marginTop: 8, color: '#78665D' }}>{t('cellCard.empty')}</div>
        ) : null}
      </div>
    </div>
  );
}
