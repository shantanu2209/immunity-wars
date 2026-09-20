/**
 * THE PLANNING SCREEN (P2.5 item 12): the body from the outside, between the draw's reveal and the
 * command phase. It answers "what is happening to the body" where the board answers "what can I
 * reach". View-only: its one action is the frame's advance button, which begins command (or, under
 * Phase 3's allocation, confirms the plan).
 *
 * IN THE FRAME (piece 5 of the play screen, docs/for-P2.7.md §19, ruled 19 and 20 September 2026):
 * the figure fills the play area, at the same height the board has in command, with no box around
 * it; the pathogens in the body are listed in the middle below it (`PathogenList`), no longer in a
 * drawer (piece 4's, now superseded). A tap on a place filters the list to it; a tap anywhere else
 * on the body shows them all again.
 *
 * Blocks, in the ruled order (P2_5_PROGRESS.md, "Item 12"):
 *   a — the silhouette with organs and HP (`AnatomyView`).
 *   b — the pathogen summary (`PathogenList`): one row per board token group, deepest first, with
 *       its DEPTH in colour and in words (green entry lane, amber bloodstream, red organ lane). A row
 *       of one pathogen opens its card in one tap; a row of several opens to list them.
 *   c — the cells: a FACT, not a roster (`spentCellsLine`), said above the list when a cell is out.
 *   d — the Phase 3 allocation slot (`AllocationBlock`): designed in, rendered only when the view
 *       carries an allocation phase, which single-player never does.
 *
 * Dumb by design: `planningModel` decided everything; every string is the catalogue's.
 */
import type { CSSProperties, ReactElement } from 'react';
import { Fragment, useState } from 'react';

import type { Unavailable } from '../board/Board';
import { t } from '../i18n';
import { cellDisplayName, typeDisplayName } from '../names';
import { CardIcon } from '../panels/CardIcon';
import { organEffect, unavailableText } from '../panels/InspectSheet';
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
  // ONE TAP TO THE CARD (§19): a row of one pathogen is that pathogen, named, and a tap opens its
  // card; a row of several opens to list them, each with its card. A lone unknown pathogen has no
  // card, so its row is not a button at all (a control that does nothing fails Gate 1).
  const only = group.members.length === 1 ? group.members[0] : undefined;
  const opensCard = only !== undefined && !only.novel;
  const style: CSSProperties = { ...ROW_BUTTON, borderLeft: `6px solid ${colour}`, paddingLeft: 8 };
  const content = (
    <>
      <span style={{ position: 'relative', flex: '0 0 auto', width: 24, height: 24 }}>
        <img
          src={`/art/path-${group.novel ? 'virus' : group.type}@3x.webp`}
          width={24}
          height={24}
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
        <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
          {only !== undefined && !only.novel
            ? only.disease
            : group.novel
              ? t('inspect.unknown')
              : typeDisplayName(group.type)}
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
        <span style={{ color: '#4A423E' }}>
          {' '}
          {t('inspect.sep')}{' '}
          {only !== undefined && !only.novel
            ? `${typeDisplayName(group.type)} ${t('inspect.sep')} ${group.where}`
            : group.where}
        </span>
      </span>
      <span style={{ color: colour, fontWeight: 700, fontSize: '0.75rem', flex: '0 0 auto' }}>
        {t(DEPTH_LABEL[group.depth])}
      </span>
      {opensCard ? (
        <span style={{ color: '#8E6E53', flex: '0 0 auto', display: 'inline-flex' }}>
          <CardIcon />
        </span>
      ) : null}
    </>
  );
  return (
    <div data-planning-group={group.key} data-depth={group.depth}>
      {only !== undefined && only.novel ? (
        <div style={{ ...style, cursor: 'default' }}>{content}</div>
      ) : (
        <button
          style={style}
          disabled={disabled}
          data-opens-card={opensCard ? only.id : undefined}
          aria-expanded={only === undefined ? open : undefined}
          onClick={opensCard ? () => onPathogenCard(only.id) : onToggle}
        >
          {content}
        </button>
      )}
      {only === undefined && open
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
export function AllocationBlock({ slot }: { slot: AllocationSlot }): ReactElement {
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
 * line above the list; null when every cell is ready.
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
 * ONE ROW PER PLACE (§21 D, measured): the list is the places that have something in them, and a
 * tap opens one to its pathogens. Before this, every group had its own row and the list reached
 * 765px against a 176px middle by turn 7 — the screen a player must read to plan, three times
 * taller than the space it has. A place is where the player is already thinking ("what is coming
 * up the Gut?") and it is the same unit the figure's own taps use, so the two agree.
 */
function PlaceRow({
  place,
  groups,
  open,
  disabled,
  onToggle,
  onPathogenCard,
}: {
  place: string;
  groups: readonly PlanningGroup[];
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onPathogenCard: (invaderId: string) => void;
}): ReactElement {
  const first = groups[0];
  if (first === undefined) return <Fragment />;
  const count = groups.reduce((n, g) => n + g.count, 0);
  const colour = DEPTH_COLOUR[first.depth];
  return (
    <div data-planning-place={place} data-count={count}>
      <button
        style={{ ...ROW_BUTTON, borderLeft: `6px solid ${colour}`, paddingLeft: 8 }}
        disabled={disabled}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span style={{ flex: '1 1 auto', minWidth: 0, fontWeight: 700, fontSize: '0.8125rem' }}>
          {placeName(place)}
        </span>
        <span style={{ color: '#78665D' }}>{t('planning.herePathogens', { n: count })}</span>
        <span style={{ color: colour, fontWeight: 700, fontSize: '0.75rem', flex: '0 0 auto' }}>
          {t(DEPTH_LABEL[first.depth])}
        </span>
      </button>
      {open
        ? groups.map((grp) => (
            <GroupRow
              key={grp.key}
              group={grp}
              open
              disabled={disabled}
              onToggle={() => undefined}
              onPathogenCard={onPathogenCard}
            />
          ))
        : null}
    </div>
  );
}

/**
 * BLOCK B — THE PATHOGENS IN THE BODY, in the middle below the figure (§19). Deepest first, so on a
 * short screen what scrolls out of sight is the least urgent. With a place in focus (a tap on the
 * figure) the rows are that place's, under a line saying so, with the organ's damage effect when it
 * has one; a tap anywhere else on the body clears it, so there is no Show all button.
 */
export function PathogenList({
  model,
  focus,
  disabled = false,
  onPathogenCard,
}: {
  model: PlanningModel;
  focus: string | null;
  disabled?: boolean;
  onPathogenCard: (invaderId: string) => void;
}): ReactElement {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (k: string): void => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const rows = focus === null ? model.groups : model.groups.filter((grp) => grp.place === focus);
  // A DAMAGED ORGAN's "When damaged" column, one tap from its pips (6 September 2026): the planning
  // screen's half of the home that let the permanent organ-damage chip leave the strip; the inspect
  // sheet's organ row is the other.
  // The rows gathered by place, deepest first, which is the order the model already carries.
  const places: [string, PlanningGroup[]][] = [];
  for (const grp of rows) {
    const found = places.find(([p]) => p === grp.place);
    if (found) found[1].push(grp);
    else places.push([grp.place, [grp]]);
  }
  const organ =
    focus === null ? undefined : model.places.find((p) => p.place === focus && p.kind === 'organ');
  const effect = focus === null ? null : organEffect(focus);
  return (
    <section data-block="pathogens" style={{ fontSize: '0.8125rem' }}>
      {focus !== null ? (
        <div data-planning-showing={focus} style={{ marginBottom: 2 }}>
          <span style={{ fontWeight: 700, color: '#2E2A28' }}>
            {t('planning.showing', { place: placeName(focus) })}
          </span>
          {organ?.hp && organ.hp.hp < organ.hp.max && effect !== null ? (
            <span data-planning-organ-effect={focus} style={{ color: '#B03A2E' }}>
              {' '}
              {t('inspect.sep')} {t('effects.organEffect', { effect })}
            </span>
          ) : null}
          <span style={{ display: 'block', color: '#78665D' }}>{t('planning.tapBodyForAll')}</span>
        </div>
      ) : null}
      {model.total === 0 ? (
        <div style={{ color: '#78665D' }}>{t('planning.noPathogens')}</div>
      ) : rows.length === 0 ? (
        <div style={{ color: '#78665D', minHeight: 44, display: 'flex', alignItems: 'center' }}>
          {t('planning.emptyPlace')}
        </div>
      ) : (
        places.map(([place, groups]) => (
          <PlaceRow
            key={place}
            place={place}
            groups={groups}
            // A place tapped on the figure is the one place shown, and it is open: the player has
            // already said which place they mean.
            open={focus !== null || open[place] === true}
            disabled={disabled}
            onToggle={() => toggle(place)}
            onPathogenCard={onPathogenCard}
          />
        ))
      )}
    </section>
  );
}

/**
 * BLOCK A — the body from the outside, filling the play area at the board's height, with no box
 * (§19). A tap on a place filters the list below; a tap on nothing clears it.
 */
export function PlanningScreen({
  model,
  focus,
  disabled = false,
  onFigureTap,
}: {
  model: PlanningModel;
  /** The place the list is filtered to, ringed on the figure; null when none is. */
  focus: string | null;
  disabled?: boolean;
  onFigureTap: (place: string | null) => void;
}): ReactElement {
  return (
    <div
      data-screen="planning"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      // THE PLAY AREA'S EMPTY SIDES count as "elsewhere" too: the figure is narrower than the area,
      // and a tap beside it left the list filtered (the audit's tap, §19). The figure's own taps
      // are its business, so a tap inside the SVG is left to it.
      onClick={(e) => {
        if (disabled || (e.target as Element).closest('svg') !== null) return;
        onFigureTap(null);
      }}
    >
      <div
        data-block="anatomy"
        data-planning-focus={focus ?? undefined}
        style={{ height: '100%', display: 'flex', justifyContent: 'center' }}
      >
        <AnatomyView markers={model.places} focus={focus} disabled={disabled} onTap={onFigureTap} />
      </div>
    </div>
  );
}
