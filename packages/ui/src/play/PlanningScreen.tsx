/**
 * THE PLANNING SCREEN (P2.5 item 12): the body from the outside, between the draw's reveal and the
 * command phase. It answers "what is happening to the body" where the board answers "what can I
 * reach". View-only: its one action is the dock's next step, which begins command (or, under Phase
 * 3's allocation, confirms the plan).
 *
 * LAID OUT FOR THE PHONE BY PIECE 4 (docs/for-P2.7.md §17, ruled 13 September 2026). The page holds
 * the figure, and what the page used to stack under it lives where the main screen keeps the same
 * kinds of thing. The dock (built by the play screen): the Action Points for the turn to come, the
 * figure's hint or which cells are out, Pathogens and What happened as two slots, and Command your
 * cells. A drawer: the pathogen summary, opened from its slot or at a place by a tap on the figure.
 *
 * Blocks, in the ruled order (P2_5_PROGRESS.md, "Item 12"):
 *   a — the silhouette with organs and HP, at its frame's own width (`AnatomyView`).
 *   b — the pathogen summary, now the Pathogens drawer (`PathogenList`): counts by type, then one
 *       row per board token group with its DEPTH in colour and in words (green entry lane, amber
 *       bloodstream, red organ lane); tap a row to expand its pathogens, tap a pathogen for its card.
 *   c — the cells: a FACT, not a roster (`spentCellsLine`), said in the dock's message line in place
 *       of the figure's hint; the cell cards open from the inspect sheet.
 *   d — the Phase 3 allocation slot: designed in, rendered only when the view carries an
 *       allocation phase, which single-player never does.
 *
 * Dumb by design: `planningModel` decided everything; every string is the catalogue's.
 */
import type { CSSProperties, ReactElement } from 'react';
import { useState } from 'react';

import type { Unavailable } from '../board/Board';
import { t } from '../i18n';
import { cellDisplayName, typeDisplayName } from '../names';
import { CardIcon } from '../panels/CardIcon';
import { organEffect, unavailableText } from '../panels/InspectSheet';
import { invaderNowLine } from '../panels/invaderNow';
import { AnatomyView } from './AnatomyView';
import {
  DEPTH_LABEL,
  placeName,
  type AllocationSlot,
  type Depth,
  type PlanningGroup,
  type PlanningModel,
} from './planning';

export interface PlanningCell {
  key: string;
  unavailable: Unavailable | null;
}

/** Depth colours — each ≥5.9:1 on the paper, and each paired with its word, never colour alone. */
const DEPTH_COLOUR: Record<Depth, string> = {
  entry: '#2F6B4A',
  blood: '#7A5600',
  organ: '#B03A2E',
};

const TITLE: CSSProperties = {
  fontSize: '0.75rem',
  color: '#78665D',
  fontWeight: 700,
  marginBottom: 2,
};
const PANEL: CSSProperties = {
  marginTop: 6,
  padding: '6px 8px',
  border: '1.5px solid #C48377',
  borderRadius: 10,
  background: '#FFFDF9',
  fontSize: '0.8125rem',
};
const ROW_BUTTON: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  // Wraps at 200% text (Gate 1's zoom audit, 6 September 2026): the depth label could not
  // shrink and a long place text pushed it 6 px past a 180 px viewport.
  flexWrap: 'wrap',
  gap: 8,
  minHeight: 44,
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderTop: '1px solid #EADFD5',
  cursor: 'pointer',
  textAlign: 'left',
  font: 'inherit',
  padding: '4px 0',
};
/** The card icon's button (for-P2.7.md §14, ruling 5): 44px square, in place of "Card". */
const CARD_BUTTON: CSSProperties = {
  minHeight: 44,
  width: 44,
  minWidth: 44,
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#8E6E53',
  borderRadius: 8,
  border: '1.5px solid #B03A2E',
  background: '#FFFDF9',
  cursor: 'pointer',
};

function GroupRow({
  group,
  open,
  disabled,
  onToggle,
  onPathogenCard,
}: {
  group: PlanningGroup;
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onPathogenCard: (invaderId: string) => void;
}): ReactElement {
  const colour = DEPTH_COLOUR[group.depth];
  return (
    <div data-planning-group={group.key} data-depth={group.depth}>
      <button
        style={{ ...ROW_BUTTON, borderLeft: `6px solid ${colour}`, paddingLeft: 8 }}
        disabled={disabled}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span style={{ position: 'relative', flex: '0 0 auto', width: 36, height: 36 }}>
          <img
            src={`/art/path-${group.novel ? 'virus' : group.type}@3x.webp`}
            width={36}
            height={36}
            alt=""
            style={group.novel ? { filter: 'brightness(0.2)' } : undefined}
          />
          {group.count >= 2 ? (
            <span
              data-count={group.count}
              style={{
                position: 'absolute',
                right: -6,
                top: -6,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                background: '#2E2A28',
                color: '#FFFDF9',
                fontSize: '0.6875rem',
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: '18px',
              }}
            >
              {group.count}
            </span>
          ) : null}
        </span>
        <span style={{ flex: '1 1 auto', minWidth: 0 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>
            {group.novel ? t('inspect.unknown') : typeDisplayName(group.type)}
            {group.count >= 2 ? (
              <span style={{ color: '#78665D', fontWeight: 400 }}>
                {' '}
                {t('planning.times', { n: group.count })}
              </span>
            ) : null}
          </span>
          {group.coated ? (
            <span style={{ color: '#7A5600', fontWeight: 700 }}>
              {' '}
              {t('inspect.sep')} {t('inspect.coated')}
            </span>
          ) : null}
          {group.hiddenIn ? (
            <span style={{ color: '#7A5600', fontWeight: 700 }}>
              {' '}
              {t('inspect.sep')} {t('planning.hidden')}
            </span>
          ) : null}
          <span style={{ display: 'block', color: '#4A423E' }}>{group.where}</span>
        </span>
        <span style={{ color: colour, fontWeight: 700, fontSize: '0.75rem', flex: '0 0 auto' }}>
          {t(DEPTH_LABEL[group.depth])}
        </span>
      </button>
      {open
        ? group.members.map((iv) => (
            <div
              key={iv.id}
              data-planning-member={iv.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 44,
                paddingLeft: 22,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.875rem', flex: '1 1 auto' }}>
                {iv.novel ? t('inspect.unknown') : iv.disease}
                <span style={{ color: '#78665D' }}>
                  {' '}
                  {t('inspect.hp')} {[iv.hp, iv.maxhp].join('/')}
                </span>
                {invaderNowLine(iv) !== null ? (
                  <span style={{ display: 'block', fontSize: '0.8125rem', color: '#7A5600' }}>
                    {invaderNowLine(iv)}
                  </span>
                ) : null}
              </span>
              {!iv.novel ? (
                <button
                  style={CARD_BUTTON}
                  aria-label={t('card.about', { name: iv.disease })}
                  disabled={disabled}
                  onClick={() => onPathogenCard(iv.id)}
                >
                  <CardIcon />
                </button>
              ) : null}
            </div>
          ))
        : null}
    </div>
  );
}

/** BLOCK D — Phase 3's allocation, read from the view; no controls until Phase 3 builds them. */
function AllocationBlock({ slot }: { slot: AllocationSlot }): ReactElement {
  return (
    <section data-block="allocation" style={PANEL}>
      <div style={TITLE}>{t('planning.allocation')}</div>
      <div>{t('planning.pool', { n: slot.pool })}</div>
      <div style={{ color: '#78665D' }}>{t('planning.allocationNote')}</div>
      {slot.budgets.map((b) => (
        <div key={b.pid} style={{ minHeight: 28, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: b.pid === slot.captain ? 700 : 400 }}>{b.pid}</span>
          <span>{t('inspect.sep')}</span>
          <span>
            {b.ap} {t('commandBar.ap')}
          </span>
        </div>
      ))}
    </section>
  );
}

/**
 * BLOCK C — which cells are out, and why when there is a why (the engine's `regenBreakdown`), as one
 * line for the dock's message; null when every cell is ready.
 */
export function spentCellsLine(
  cells: readonly PlanningCell[],
  why: Readonly<Record<string, string>> = {},
): string | null {
  const out = cells.filter((c) => c.unavailable !== null);
  if (out.length === 0) return null;
  return out
    .map((c) =>
      [
        `${cellDisplayName(c.key)} ${t('inspect.sep')} ${c.unavailable ? unavailableText(c.unavailable) : ''}`,
        why[c.key],
      ]
        .filter((x) => x !== undefined)
        .join(`. `),
    )
    .join(` ${t('inspect.sep')} `);
}

/**
 * BLOCK B — THE PATHOGENS DRAWER's content (piece 4, §17). With a place in focus, which a tap on the
 * figure gives it (choice 3), the rows are that place's, under a line saying so, with the organ's
 * damage effect when it has one and a way to show them all. Closing the drawer clears the place;
 * that is the shell's to do, because the drawer's close is on the navigation stack.
 */
export function PathogenList({
  model,
  focus,
  disabled = false,
  onShowAll,
  onPathogenCard,
}: {
  model: PlanningModel;
  focus: string | null;
  disabled?: boolean;
  onShowAll: () => void;
  onPathogenCard: (invaderId: string) => void;
}): ReactElement {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (k: string): void => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const rows = focus === null ? model.groups : model.groups.filter((grp) => grp.place === focus);
  // A DAMAGED ORGAN's "When damaged" column, one tap from its pips (6 September 2026): the planning
  // screen's half of the home that let the permanent organ-damage chip leave the strip; the inspect
  // sheet's organ row is the other.
  const organ =
    focus === null ? undefined : model.places.find((p) => p.place === focus && p.kind === 'organ');
  const effect = focus === null ? null : organEffect(focus);
  return (
    <section data-block="pathogens" style={{ fontSize: '0.8125rem', padding: '0 4px' }}>
      {focus !== null ? (
        <div
          data-planning-showing={focus}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 4,
          }}
        >
          <span style={{ fontWeight: 700, color: '#2E2A28' }}>
            {t('planning.showing', { place: placeName(focus) })}
          </span>
          {organ?.hp && organ.hp.hp < organ.hp.max && effect !== null ? (
            <span data-planning-organ-effect={focus} style={{ color: '#B03A2E' }}>
              {t('effects.organEffect', { effect })}
            </span>
          ) : null}
          <button
            data-planning-show-all="1"
            style={{
              ...CARD_BUTTON,
              width: 'auto',
              padding: '0 10px',
              // In rem, so the words grow with the text size: a button does not inherit the page's
              // size, and the audit's 200% passes found this one fixed at 13.3px (for-P2.7.md §18).
              fontSize: '0.8125rem',
              border: '1.5px solid #8E6E53',
            }}
            onClick={onShowAll}
          >
            {t('planning.showAll')}
          </button>
        </div>
      ) : null}
      <div style={TITLE}>{t('planning.pathogens')}</div>
      {model.total === 0 ? (
        <div style={{ color: '#78665D' }}>{t('planning.noPathogens')}</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            {model.byType.map((c) => (
              <span
                key={c.type}
                data-type-count={c.type}
                data-n={c.count}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '1.5px solid #8E6E53',
                  borderRadius: 8,
                  padding: '2px 8px',
                  minHeight: 28,
                }}
              >
                {c.art ? <img src={`/art/${c.art}@3x.webp`} width={20} height={20} alt="" /> : null}
                <span>{c.novel ? t('inspect.unknown') : typeDisplayName(c.type)}</span>
                <span style={{ fontWeight: 700 }}>{t('planning.times', { n: c.count })}</span>
              </span>
            ))}
          </div>
          {rows.length === 0 ? (
            <div style={{ color: '#78665D', minHeight: 44, display: 'flex', alignItems: 'center' }}>
              {t('planning.emptyPlace')}
            </div>
          ) : null}
          {rows.map((grp) => (
            <GroupRow
              key={grp.key}
              group={grp}
              open={open[grp.key] === true}
              disabled={disabled}
              onToggle={() => toggle(grp.key)}
              onPathogenCard={onPathogenCard}
            />
          ))}
        </>
      )}
    </section>
  );
}

export function PlanningScreen({
  model,
  focus,
  disabled = false,
  onFigureTap,
}: {
  model: PlanningModel;
  /** The place the Pathogens drawer is showing, ringed on the figure; null when none is. */
  focus: string | null;
  disabled?: boolean;
  /** A tap on (or near) a marker, or on nothing: the shell opens the drawer at a place (§17). */
  onFigureTap: (place: string | null) => void;
}): ReactElement {
  return (
    <div data-screen="planning" style={{ marginTop: 6 }}>
      {/* BLOCK A — the body from the outside: organs with integrity, entries, the bloodstream. */}
      <section
        data-block="anatomy"
        data-planning-focus={focus ?? undefined}
        style={{ ...PANEL, marginTop: 0 }}
      >
        <AnatomyView markers={model.places} focus={focus} disabled={disabled} onTap={onFigureTap} />
      </section>
      {model.allocation ? <AllocationBlock slot={model.allocation} /> : null}
    </div>
  );
}
