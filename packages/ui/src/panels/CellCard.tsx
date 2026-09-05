/**
 * THE CELL CARD (P2.5 item 12, block c) — the pathogen card's shape for the player's own
 * pieces. Every field is CONTENT: `CELL_CARDS[cell]` (role, home, best against, deficiency,
 * an optional fact — one entry per cell key, Kartik's science, a missing field rendering
 * nothing), `UM[cell]` for the name and its one-line tag. The ~7 labels here are `ui.json`.
 *
 * "Right now" is the one line about THIS cell rather than the cell type: spent or offline,
 * and when it is back — the same line the piece strip and the inspect sheet show.
 */
import { CELL_CARDS, UM } from '@immunity-wars/content';
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';
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

const LABEL: CSSProperties = { fontSize: 12, color: '#7C6A61', fontWeight: 700 };
const CLOSE: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 44,
  fontSize: 16,
  borderRadius: 10,
  border: '2px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
};

export function CellCard({
  subject,
  onClose,
}: {
  subject: CellCardSubject;
  onClose: () => void;
}): ReactElement {
  const { cell } = subject;
  const card = (CELL_CARDS as Record<string, Fields | undefined>)[cell] ?? {};
  const tag = (UM as Record<string, { r?: string } | undefined>)[cell]?.r;
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
        position: 'fixed',
        inset: 0,
        background: 'rgba(46,42,40,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
      }}
    >
      <div
        data-cell-card-open={cell}
        style={{
          width: 'min(92vw, 420px)',
          maxHeight: '88vh',
          overflowY: 'auto',
          background: '#FFFDF9',
          border: '2px solid #8E6E53',
          borderRadius: 12,
          padding: 14,
          fontSize: 14,
          color: '#2E2A28',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={`/art/cell-${cell}@3x.webp`} width={48} height={48} alt="" />
          <div style={{ flex: '1 1 auto' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#8E6E53' }}>
              {cellDisplayName(cell)}
            </div>
            {tag ? <div style={{ fontSize: 13, color: '#7C6A61' }}>{tag}</div> : null}
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
        {card.fact ? (
          <div style={{ marginTop: 8, fontStyle: 'italic', color: '#7C6A61' }}>{card.fact}</div>
        ) : null}
        {!filled ? (
          <div style={{ marginTop: 8, color: '#7C6A61' }}>{t('cellCard.empty')}</div>
        ) : null}
        <button style={{ ...CLOSE, marginTop: 12 }} onClick={onClose}>
          {t('card.close')}
        </button>
      </div>
    </div>
  );
}
