/**
 * The inspect sheet — the PRECISE half of the touch pattern set at P2.5 piece 1: the board
 * is coarse pointing, and every consequential control here is a ≥44px row, which is how a
 * 20px token satisfies Gate 1's target rule. Moved into `ui` at piece 2 as the first player
 * component: all text renders through the catalogue (t()), under the negative-controlled
 * hardcoded-string check.
 *
 * CP1: when the shell has offers on the invaders shown here (an Eosinophil that can strike
 * OR degranulate the same worm), each invader row carries its offers as buttons — the sheet
 * is where a choice between attacks is made, because a 20px pathogen token cannot present two.
 */
import { ORGANS } from '@immunity-wars/content';
import type { CSSProperties, ReactElement } from 'react';

import type { InspectInfo, Unavailable } from '../board/Board';

/** The organ's kind from the rules pack: `vital` or `defence` (a miss renders loudly through t()). */
const organKind = (organ: string): string =>
  String((ORGANS as Record<string, { kind?: unknown } | undefined>)[organ]?.kind ?? organ);

/** The organ's "when damaged" column from the rules pack, or null when it has none. */
export const organEffect = (organ: string): string | null => {
  const e = (ORGANS as Record<string, { effect?: unknown } | undefined>)[organ]?.effect;
  return typeof e === 'string' && e.trim() !== '' ? e : null;
};
import { pieceFor } from '../board/clay';
import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { COLOUR } from '../kit/tokens';
import { CardIcon } from './CardIcon';
import { SAY, SMALL, TONE, pieceArt } from './onCard';
import {
  cellDisplayName as cellName,
  organDisplayName,
  residentDisplayName,
  typeDisplayName as typeName,
} from '../names';

const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minHeight: 44,
};

/** The card icon's button (for-P2.7.md §14, ruling 5): 44px square, narrower than "Card" was. */
const ICON_BTN: CSSProperties = { width: 44, minHeight: 44, padding: 0, flex: '0 0 auto' };

/** A piece's picture in a row of the sheet: the base under one of the body's own, the piece on it. */
const PICTURE: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};
function Pic({
  name,
  own,
  dim = false,
}: {
  name: string;
  own: boolean;
  dim?: boolean;
}): ReactElement {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        width: 40,
        height: 40,
        flex: '0 0 auto',
        ...(dim ? { opacity: 0.45, filter: 'grayscale(1)' } : {}),
      }}
    >
      {own ? <img alt="" src={pieceArt('base')} style={PICTURE} /> : null}
      <img alt="" src={pieceArt(name)} style={PICTURE} />
    </span>
  );
}

/** A row that selects what stands in it: nothing but its words and picture, until it is chosen. */
const pick = (chosen: boolean): CSSProperties => ({
  ...ROW,
  ...SAY.body,
  minWidth: 0,
  padding: '0 6px',
  borderRadius: 12,
  border: 'none',
  background: chosen ? COLOUR.mintSoft : 'transparent',
  boxShadow: chosen ? `inset 0 0 0 2px ${COLOUR.mintEdge}` : undefined,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
});

export interface InvaderOffer {
  id: string;
  label: string;
}

/**
 * "Spent, back in 2 turns": the words for a dimmed cell, all through the catalogue, the join
 * included. The join was a literal dash written here until piece 4, outside every catalogue check
 * (FINDINGS #74).
 */
export function unavailableText(u: Unavailable): string {
  if (u.kind === 'hiv') return t('inspect.hiv');
  if (u.kind === 'infected') return t('inspect.infected');
  const what = t(u.kind === 'spent' ? 'inspect.spent' : 'inspect.offline');
  if (u.backIn === null) return what;
  const when =
    u.backIn <= 0
      ? t('inspect.backNow')
      : u.backIn === 1
        ? t('inspect.backInOne')
        : t('inspect.backIn', { n: u.backIn });
  return t('inspect.unavailableWhen', { what, when });
}

export function InspectSheet({
  info,
  selectedCell,
  disabled = false,
  offers = {},
  onOffer,
  onSelectCell,
  onSelectResident,
  selectedResident = null,
  onCard,
  onCellCard,
}: {
  /** Opens the pathogen card for an invader (never offered for a novel one). */
  onCard?: (invaderId: string) => void;
  /** Opens the cell card for a cell standing here (item 12's cards, re-homed here). */
  onCellCard?: (cell: string) => void;
  info: InspectInfo;
  selectedCell?: string | null;
  disabled?: boolean;
  /** Offers by invader id — prepared by the shell from `offered.ts`. */
  offers?: Record<string, InvaderOffer[]>;
  onOffer?: (offerId: string) => void;
  onSelectCell?: (cell: string) => void;
  /** CP3: the resident row selects the organ's resident, exactly like a cell row. */
  onSelectResident?: (organ: string) => void;
  selectedResident?: string | null;
}): ReactElement {
  return (
    // IN THE MIDDLE, not over the board (piece 5, docs/for-P2.7.md §19): what stands on a tapped node
    // shows below the play area, so the board stays in view, and the floating close returns to the
    // actions.
    <div data-inspect-sheet="" data-middle-view="node" style={SAY.body}>
      {info.invaders.map((iv, i) => (
        <div key={`iv-${String(i)}`} style={{ ...ROW, flexWrap: 'wrap' }}>
          {/* The same picture the board draws it with: its kind, in its antigen class's colour. */}
          <Pic name={pieceFor(iv.type, iv.cls, iv.coated).piece} own={false} />
          <span style={{ flex: '1 1 auto' }}>
            {iv.novel ? t('inspect.unknown') : iv.disease}
            <span style={{ color: COLOUR.inkSoft }}>
              {' '}
              {iv.novel ? null : typeName(iv.type)} {t('inspect.hp')} {[iv.hp, iv.maxhp].join('/')}
            </span>
            {iv.coated ? (
              // The badge is a symbol nobody has been taught; the precise surface says the word.
              <span style={{ color: TONE.note, fontWeight: 800 }}>
                {' '}
                {t('inspect.sep')} {t('inspect.coated')}
              </span>
            ) : null}
            {/* What this pathogen is doing right now (a malaria stage, hiding inside a cell) is the
                card's "Right now" since piece 5 (§19): one tap to the card, no line in between. */}
          </span>
          {!iv.novel && onCard ? (
            // THE CARD's entry point: the sheet is "tell me about this" with ≥44px rows, and a
            // novel pathogen gets no card — it is masked everywhere as unknown.
            <KitButton
              style={ICON_BTN}
              aria-label={t('card.about', { name: iv.disease })}
              disabled={disabled}
              onPress={() => onCard(iv.id)}
              data-sheet-card={iv.id}
            >
              <CardIcon />
            </KitButton>
          ) : null}
          {(offers[iv.id] ?? []).map((o) => (
            <KitButton
              key={o.id}
              kind="go"
              style={SMALL}
              disabled={disabled || !onOffer}
              onPress={() => onOffer?.(o.id)}
            >
              {o.label}
            </KitButton>
          ))}
        </div>
      ))}
      {info.cells.map((ck) => (
        // Wraps like the invader rows above, so at a 180px layout (200% page zoom) the Card button
        // drops under the cell instead of past the screen's edge (FINDINGS #72).
        <div key={`cell-${ck}`} style={{ ...ROW, width: '100%', flexWrap: 'wrap' }}>
          <button
            data-sheet-cell={ck}
            onClick={() => onSelectCell?.(ck)}
            disabled={disabled || !onSelectCell}
            style={{ ...pick(selectedCell === ck), flex: '1 1 auto' }}
          >
            <Pic name={ck} own dim={info.unavailable[ck] !== undefined} />
            <span>
              {cellName(ck)}
              {info.unavailable[ck] ? (
                <span style={{ color: COLOUR.inkSoft }}>
                  {' '}
                  {t('inspect.sep')} {unavailableText(info.unavailable[ck])}
                </span>
              ) : null}
            </span>
          </button>
          {onCellCard ? (
            <KitButton
              data-cell-card={ck}
              style={ICON_BTN}
              aria-label={t('card.about', { name: cellName(ck) })}
              disabled={disabled}
              onPress={() => onCellCard(ck)}
            >
              <CardIcon />
            </KitButton>
          ) : null}
        </div>
      ))}
      {info.resident !== null ? (
        // The resident's REAL name, then "resident of the Liver" — the sheet is where a
        // resident and the Monocyte on one node are told apart, as two ≥44px rows.
        <button
          onClick={() => {
            if (info.resident !== null) onSelectResident?.(info.resident);
          }}
          disabled={disabled || !onSelectResident}
          style={{ ...pick(selectedResident === info.resident), width: '100%' }}
        >
          <Pic name="macrophage" own />
          <span>
            {residentDisplayName(info.resident)}
            <span style={{ color: COLOUR.inkSoft }}>
              {' '}
              {t('resident.of', { organ: organDisplayName(info.resident) })}
            </span>
          </span>
        </button>
      ) : null}
      {info.organ !== null ? (
        // THE ORGAN'S OWN ROW at its step-0 node (6 September 2026): its integrity, and when it
        // is damaged the rulebook's "When damaged" column — the home one tap from the pips
        // that let the permanent organ-damage chip leave the strip. The column is content, a
        // table cell rendered as a labelled value, never spliced into a sentence.
        <div data-sheet-organ={info.organ.key} style={{ ...ROW, flexWrap: 'wrap' }}>
          <span>
            {t('inspect.organ', {
              organ: organDisplayName(info.organ.key),
              // THE ORGAN'S KIND (strings 45 and 46, ruled IN 6 September 2026): the rulebook's
              // own words, "vital organ" or "defence organ", from the rules pack. It carries no
              // rule (the engine never reads it) so it cannot drift; a miss renders loudly.
              kind: t(`organ.${organKind(info.organ.key)}`),
              hp: info.organ.hp,
              max: info.organ.max,
            })}
            {info.organ.hp < info.organ.max && organEffect(info.organ.key) !== null ? (
              <span style={{ display: 'block', fontSize: '0.8125rem', color: TONE.bad }}>
                {t('effects.organEffect', { effect: organEffect(info.organ.key) ?? '' })}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}
