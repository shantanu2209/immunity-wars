/**
 * THE PLANNING SCREEN (P2.5 item 12) — the body from the outside, between the draw's reveal
 * and the command phase. It answers "what is happening to the body" where the board answers
 * "what can I reach". View-only: its one action is the bottom button, which begins command
 * (or, under Phase 3's allocation, confirms the plan).
 *
 * Blocks, in the ruled order (P2_5_PROGRESS.md, "Item 12"):
 *   a — the silhouette with organs and HP: lands with step 4, after the entry-lane ruling.
 *       The slot is the top of this component.
 *   b — the pathogen summary: counts by type, then one row per board token group with its
 *       DEPTH in colour and in words (green entry lane, amber bloodstream, red organ lane);
 *       tap a row to expand its pathogens, tap a pathogen for its card.
 *   c — the cells: a FACT beside the AP line (which are spent, and when they are back), not a
 *       roster — removed at the S25 second pass; the cell cards open from the inspect sheet.
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
import { unavailableText } from '../panels/InspectSheet';
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

const TITLE: CSSProperties = { fontSize: 12, color: '#7C6A61', fontWeight: 700, marginBottom: 2 };
const PANEL: CSSProperties = {
  marginTop: 6,
  padding: '6px 8px',
  border: '1.5px solid #C8877B',
  borderRadius: 10,
  background: '#FFFDF9',
  fontSize: 13,
};
const ROW_BUTTON: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
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
const CARD_BUTTON: CSSProperties = {
  minHeight: 44,
  padding: '0 12px',
  fontSize: 14,
  borderRadius: 8,
  border: '1.5px solid #B03A2E',
  background: '#FFFDF9',
  cursor: 'pointer',
};
const BIG: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 48,
  fontSize: 16,
  fontWeight: 700,
  borderRadius: 10,
  border: '2px solid #B03A2E',
  background: '#FFFDF9',
  cursor: 'pointer',
  marginTop: 10,
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
                fontSize: 11,
                fontWeight: 700,
                textAlign: 'center',
                lineHeight: '18px',
              }}
            >
              {group.count}
            </span>
          ) : null}
        </span>
        <span style={{ flex: '1 1 auto' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>
            {group.novel ? t('inspect.unknown') : typeDisplayName(group.type)}
            {group.count >= 2 ? (
              <span style={{ color: '#7C6A61', fontWeight: 400 }}>
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
        <span style={{ color: colour, fontWeight: 700, fontSize: 12, flex: '0 0 auto' }}>
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
              <span style={{ fontSize: 14, flex: '1 1 auto' }}>
                {iv.novel ? t('inspect.unknown') : iv.disease}
                <span style={{ color: '#7C6A61' }}>
                  {' '}
                  {t('inspect.hp')} {[iv.hp, iv.maxhp].join('/')}
                </span>
                {invaderNowLine(iv) !== null ? (
                  <span style={{ display: 'block', fontSize: 13, color: '#7A5600' }}>
                    {invaderNowLine(iv)}
                  </span>
                ) : null}
              </span>
              {!iv.novel ? (
                <button
                  style={CARD_BUTTON}
                  disabled={disabled}
                  onClick={() => onPathogenCard(iv.id)}
                >
                  {t('inspect.card')}
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
      <div style={{ color: '#7C6A61' }}>{t('planning.allocationNote')}</div>
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

export function PlanningScreen({
  model,
  cells,
  disabled = false,
  onCommand,
  onPathogenCard,
}: {
  model: PlanningModel;
  cells: PlanningCell[];
  disabled?: boolean;
  /** Sends the model's button params — `beginCommand`, or `confirmAllocation` under allocation. */
  onCommand: (params: Record<string, unknown>) => void;
  onPathogenCard: (invaderId: string) => void;
}): ReactElement {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (k: string): void => setOpen((o) => ({ ...o, [k]: !o[k] }));
  // BLOCK A's expand-a-lane: the figure's focused place filters the rows; tap-again clears.
  const [focus, setFocus] = useState<string | null>(null);
  const rows = focus === null ? model.groups : model.groups.filter((grp) => grp.place === focus);
  return (
    <div data-screen="planning" style={{ marginTop: 6 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#2E2A28' }}>{t('planning.title')}</div>
      <div style={{ fontSize: 13, color: '#7C6A61' }}>
        {t('planning.apNext', { n: model.apNext })}
      </div>
      {/* THE CELLS AS A FACT, not a roster (S25 second pass, 5 September 2026): the planning
          screen is about the body and the threats; which cells are spent belongs beside the
          AP line, and the cell cards open from the inspect sheet. */}
      {cells.some((c) => c.unavailable !== null) ? (
        <div data-planning-cell-facts="1" style={{ fontSize: 13, color: '#7A5600' }}>
          {cells
            .filter((c) => c.unavailable !== null)
            .map(
              (c) =>
                `${cellDisplayName(c.key)} ${t('inspect.sep')} ${c.unavailable ? unavailableText(c.unavailable) : ''}`,
            )
            .join(` ${t('inspect.sep')} `)}
        </div>
      ) : null}
      {/* BLOCK A — the body from the outside: organs with integrity, entries, the bloodstream. */}
      <section data-block="anatomy" data-planning-focus={focus ?? undefined} style={PANEL}>
        <AnatomyView
          markers={model.places}
          focus={focus}
          disabled={disabled}
          onTap={(place) => setFocus((f) => (place === null || place === f ? null : place))}
        />
        <div style={{ fontSize: 12, color: '#7C6A61', textAlign: 'center' }}>
          {focus === null ? (
            t('planning.figureHint')
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, color: '#2E2A28' }}>
                {t('planning.showing', { place: placeName(focus) })}
              </span>
              <button
                data-planning-show-all="1"
                style={{ ...CARD_BUTTON, border: '1.5px solid #8E6E53' }}
                onClick={() => setFocus(null)}
              >
                {t('planning.showAll')}
              </button>
            </span>
          )}
        </div>
      </section>
      <section data-block="pathogens" style={PANEL}>
        <div style={TITLE}>{t('planning.pathogens')}</div>
        {model.total === 0 ? (
          <div style={{ color: '#7C6A61' }}>{t('planning.noPathogens')}</div>
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
                  {c.art ? (
                    <img src={`/art/${c.art}@3x.webp`} width={20} height={20} alt="" />
                  ) : null}
                  <span>{c.novel ? t('inspect.unknown') : typeDisplayName(c.type)}</span>
                  <span style={{ fontWeight: 700 }}>{t('planning.times', { n: c.count })}</span>
                </span>
              ))}
            </div>
            {rows.length === 0 ? (
              <div
                style={{ color: '#7C6A61', minHeight: 44, display: 'flex', alignItems: 'center' }}
              >
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
      {model.allocation ? <AllocationBlock slot={model.allocation} /> : null}
      <button
        data-planning-button={model.mode}
        style={BIG}
        disabled={disabled}
        onClick={() => onCommand(model.button.params)}
      >
        {model.button.label}
      </button>
    </div>
  );
}
