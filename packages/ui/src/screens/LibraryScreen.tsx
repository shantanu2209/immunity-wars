/**
 * THE DISEASE LIBRARY (docs/APP_FLOW.md §4's Title slot; docs/for-P2.6.md PROPOSAL 3 and the
 * five rulings of 8 September 2026).
 *
 * An index over the deck, GROUPED BY TYPE in the order How to play's section 6 uses, so the
 * library's shape is Help's and the card's: each group's header carries the type's "beat it"
 * line from the content pack, read once per group rather than once per disease. Alphabetical
 * within a group. A name filter narrows every group as you type; nine chips jump to a group
 * without the keyboard, because the whole index is more than six phone screens. Each row: the
 * name, the antigen class as a badge in the class's own colour, the target organs. Tap a row
 * for the existing pathogen card, which opens over the index so the index keeps its place.
 *
 * The records that are not deck cards (the pack's DERIVED table) sit indented under the parent
 * they arise from. Every one has a parent: the one that had none, Diphtheria toxin, is released
 * by the Diphtheria bacterium since queue Q15 (FINDINGS #23). Pathogen X has no entry, and the index says so in one line
 * (Shantanu's ruling: it teaches the mechanic in passing, and a player who counts will wonder).
 *
 * The rulebook's fifteen "why it works this way" boxes are their own section: Kartik's text,
 * pinned to the rulebook document by the content package's test, under labels of this
 * screen's own, each linking to its How to play section.
 *
 * ⚠️ **Corrected 8 September 2026.** This read *"None of the boxes is about a disease, so none
 * sits on a card"*, and **four of them are**: worms, toxin-makers, malaria and Pathogen X each
 * explain a mechanic that belongs to particular diseases rather than to a cell or to the board.
 * The claim was written while building the why section and was never checked against the boxes.
 * Shantanu ruled the link in on the same reasoning it should have had: a card answering "what is
 * this" should reach "why does the game model it that way", which is why the boxes are in the
 * library at all. `whyForDisease` is that link, and it is DERIVED from the pack rather than
 * assigned by hand — see its own comment for why that distinction matters here.
 *
 * Nothing here is game logic: every list is a read of the content pack.
 */
import {
  BEAT_BY_TYPE,
  DECK_MASTER,
  DERIVED,
  FAMILIES,
  FAMILY,
  INV_HP,
  NOVEL_ANTIGENS,
  TOXIN_MAKERS,
  WHY,
} from '@immunity-wars/content';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';

import { classOf, pieceFor } from '../board/clay';
import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { COLOUR, RADIUS, SHADOW, TOUCH, TYPE } from '../kit/tokens';
import { typeDisplayName } from '../names';
import { PathogenCard } from '../panels/PathogenCard';

import { BODY as P, CARD, FIELD, ITEM, LEAD, PAGE, ROW as ROW_BTN, SECTION, TITLE } from './chrome';
import type { HelpSectionKey } from './HelpScreen';

export type LibraryView =
  { kind: 'index' } | { kind: 'card'; disease: string } | { kind: 'why'; entry: string | null };

/**
 * A way to jump down the page: a well pressed into the table, as the play screen's tiles are. It
 * goes somewhere on this page and opens nothing, so it is not a standing button.
 */
const CHIP: CSSProperties = {
  minHeight: TOUCH.min,
  padding: '0.3em 0.9em',
  border: 0,
  borderRadius: RADIUS.pill,
  background: COLOUR.well,
  boxShadow: SHADOW.sunk,
  color: COLOUR.onDark,
  fontFamily: TYPE.family,
  ...TYPE.body,
  fontWeight: 800,
  cursor: 'pointer',
};
/** A disease's row: its picture, its name, and its antigen class pushed to the end. */
const ROW: CSSProperties = {
  ...ROW_BTN,
  marginTop: 6,
  gap: 10,
  padding: '0.3em 0.8em',
  // At 200% page zoom a row is 164 px: the class goes under the name, and a long name may break,
  // or the row is wider than the page (the audit's finding on this screen's first run in Clay).
  flexWrap: 'wrap',
};
const MUTED: CSSProperties = { ...LEAD, margin: 0 };
const INPUT: CSSProperties = { ...FIELD, marginTop: 12 };

/** The Clay piece that stands for a disease on the board, small, beside its name. */
function RowArt({ disease, type }: { disease: string; type: string }): ReactElement {
  const { piece } = pieceFor(type, classOf(disease, false), false);
  return (
    <img
      alt=""
      aria-hidden="true"
      loading="lazy"
      // As a card shows it, at an angle: the board's own picture is mostly its shadow at this size.
      src={`/art/clay/card/${piece}@1x.webp`}
      srcSet={`/art/clay/card/${piece}@1x.webp 1x, /art/clay/card/${piece}@2x.webp 2x, /art/clay/card/${piece}@3x.webp 3x`}
      style={{ width: 40, height: 40, flex: '0 0 auto', margin: '-2px 0' }}
    />
  );
}

interface Entry {
  disease: string;
  type: string;
  /** For a derived record: the parent it arises from. Null for a deck card. */
  from: string | null;
}

/** The index: every deck card that is not the masked novel pathogen, by type in the pack's
 *  order, alphabetical within; a card's derived records follow it, indented. */
function buildIndex(): { type: string; entries: Entry[] }[] {
  const cards = DECK_MASTER.filter((c) => c.novel !== true);
  const derived = Object.entries(DERIVED);
  const byType = new Map<string, Entry[]>();
  for (const ty of Object.keys(INV_HP)) byType.set(ty, []);
  const push = (e: Entry): void => {
    const list = byType.get(e.type);
    if (list) list.push(e);
    else byType.set(e.type, [e]);
  };
  const sorted = [...cards].sort((a, b) => a.dz.localeCompare(b.dz));
  for (const c of sorted) {
    push({ disease: c.dz, type: c.type, from: null });
    for (const [dz, d] of derived) {
      if (d.from === c.dz) push({ disease: dz, type: c.type, from: c.dz });
    }
  }
  return [...byType.entries()].map(([type, entries]) => ({ type, entries }));
}

function classBadge(disease: string): ReactElement | null {
  const cls = (FAMILY as Record<string, string | undefined>)[disease];
  const fam = cls
    ? (FAMILIES as Record<string, { short?: string; col?: string } | undefined>)[cls]
    : undefined;
  if (!cls || !fam) return null;
  // The class colour is a mark beside the code, not the code's background: the pack's six
  // class colours sit between 2.4:1 and 3.7:1 against the app's cream, and the audit's first
  // run over this screen flagged 212 badges of cream text on them. The code carries the
  // meaning in dark text; the colour is the content pack's, the one the pieces of that class wear,
  // kept as a dot for recognition (stage L5: as the antibody panel marks a class).
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: '0.75rem',
        fontWeight: 900,
        color: COLOUR.ink,
        flex: '0 0 auto',
      }}
      data-library-class={cls}
    >
      <span
        aria-hidden="true"
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: fam.col ?? COLOUR.inkSoft,
          boxShadow: `0 0 0 1.5px ${COLOUR.ink}`,
        }}
      />
      {fam.short ?? cls}
    </span>
  );
}

/**
 * THE WHY BOXES THAT ARE ABOUT THIS DISEASE, in the order they appear in the why section.
 *
 * **Derived from the content pack, never assigned by hand, and that is the whole point.** The
 * boxes are Kartik's science; saying "this box explains this disease" is a claim about the
 * biology, and a hand-written table of 106 diseases against 15 boxes would be 106 such claims
 * that nobody checked. So a box is offered only where the pack ALREADY says the disease has that
 * mechanic, which makes each link a restatement of existing data rather than a new assertion.
 *
 * Four boxes qualify, and the rest are silent by design rather than by omission:
 *
 *   worms        every deck card of type `worm`
 *   toxinMakers  the three diseases in `TOXIN_MAKERS`, and the toxins they release
 *   malaria      every record of type `malaria`, deck or derived
 *   pathogenX    whatever the pack calls novel (`NOVEL_ANTIGENS`), rather than a name typed
 *                here; today that is Pathogen X, which has no library row and so reaches this
 *                only from play
 *
 * The other eleven are about a cell, the board or the immune response in general. A card for a
 * virus therefore shows no link, and that is the honest answer: the boxes that bear on it are
 * about the Helper, the B-Cell and the window, not about it.
 */
export function whyForDisease(disease: string, type: string): readonly string[] {
  const keys: string[] = [];
  if (type === 'worm') keys.push('worms');
  if (type === 'toxin' || disease in TOXIN_MAKERS) keys.push('toxinMakers');
  if (type === 'malaria') keys.push('malaria');
  if (NOVEL_ANTIGENS.has(disease)) keys.push('pathogenX');
  // Order the result the way the why section lists them, so following two links reads top to
  // bottom rather than in whatever order the tests above happen to fire.
  const order = WHY.map((w) => w.key);
  return keys.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** The type a disease record is grouped and carded under: its deck card's, or its derived
 *  record's. */
export function libraryType(disease: string): string {
  const card = DECK_MASTER.find((c) => c.dz === disease);
  if (card) return card.type;
  return (DERIVED as Record<string, { type: string } | undefined>)[disease]?.type ?? 'virus';
}

export function LibraryScreen({
  view,
  onView,
  onHelp,
}: {
  view: LibraryView;
  /**
   * Opens a view one level down: a card over the index, or the why page. Closing is the floating
   * close's, so a why page opened from a card closes back to that card (docs/for-P2.7.md §9,
   * ruling 9); it used to close to the index.
   */
  onView: (view: LibraryView) => void;
  /** Open a How to play section (the why entries' link back). */
  onHelp: (section: HelpSectionKey) => void;
}): ReactElement {
  const [query, setQuery] = useState('');
  const groups = useMemo(buildIndex, []);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const whyRefs = useRef<Record<string, HTMLElement | null>>({});
  // Opened from a Help link: bring the named entry into view once it exists.
  const entry = view.kind === 'why' ? view.entry : null;
  useEffect(() => {
    if (entry) whyRefs.current[entry]?.scrollIntoView({ block: 'start' });
  }, [entry]);

  if (view.kind === 'why') {
    return (
      <div style={PAGE} data-screen="library-why">
        <h1 style={TITLE}>{t('library.why.title')}</h1>
        <p style={MUTED}>{t('library.why.lead')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {WHY.map((w) => (
            <button
              key={w.key}
              style={CHIP}
              onClick={() => whyRefs.current[w.key]?.scrollIntoView({ block: 'start' })}
            >
              {t(`library.why.${w.key}.title`)}
            </button>
          ))}
        </div>
        {WHY.map((w) => (
          <section
            key={w.key}
            ref={(el) => {
              whyRefs.current[w.key] = el;
            }}
            style={{ ...CARD, marginTop: 14 }}
            data-library-why={w.key}
          >
            <h2 style={SECTION}>{t(`library.why.${w.key}.title`)}</h2>
            <p style={P}>{w.text}</p>
            <KitButton
              style={{
                ...ROW_BTN,
                marginTop: 4,
                minHeight: TOUCH.min,
                ...TYPE.body,
                fontWeight: 800,
              }}
              onPress={() => onHelp(w.help)}
              data-library-in-help={w.key}
            >
              {t('library.why.inHelp', { section: t(`help.${w.help}.title`) })}
            </KitButton>
          </section>
        ))}
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = groups
    .map((g) => ({
      type: g.type,
      entries: q ? g.entries.filter((e) => e.disease.toLowerCase().includes(q)) : g.entries,
    }))
    .filter((g) => g.entries.length > 0);
  const total = groups.reduce((n, g) => n + g.entries.length, 0);

  return (
    <div style={PAGE} data-screen="library">
      <h1 style={TITLE}>{t('library.title')}</h1>
      <p style={MUTED}>
        {t('library.lead')} {t('library.count', { n: total })}
      </p>
      <input
        type="search"
        style={INPUT}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('library.filter')}
        aria-label={t('library.filter')}
        data-library-filter=""
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {groups.map((g) => (
          <button
            key={g.type}
            style={CHIP}
            onClick={() => sectionRefs.current[g.type]?.scrollIntoView({ block: 'start' })}
            data-library-chip={g.type}
          >
            {typeDisplayName(g.type)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p style={{ ...LEAD, marginTop: 14, color: COLOUR.onDark }}>{t('library.filterNone')}</p>
      ) : null}
      {filtered.map((g) => (
        <section
          key={g.type}
          ref={(el) => {
            sectionRefs.current[g.type] = el;
          }}
          style={{ marginTop: 22 }}
          data-library-section={g.type}
        >
          <h2 style={ITEM}>{typeDisplayName(g.type)}</h2>
          <p style={{ ...MUTED, margin: '4px 0 6px' }}>
            {(BEAT_BY_TYPE as Record<string, string | undefined>)[g.type] ?? ''}
          </p>
          {g.entries.map((e) => (
            <KitButton
              key={e.disease}
              style={{
                ...ROW,
                marginLeft: e.from !== null ? 18 : 0,
                width: e.from !== null ? 'calc(100% - 18px)' : '100%',
              }}
              onPress={() => onView({ kind: 'card', disease: e.disease })}
              data-library-row={e.disease}
            >
              {/* ONE SHAPE FOR EVERY ROW (item 5, 19 September 2026): the name, then the class
                  pushed to the end. The organs, the parent it arises from and "nothing produces
                  it" are in the card this row opens. Its piece stands beside its name since
                  stage L5: the picture a player has seen on the board. */}
              <RowArt disease={e.disease} type={e.type} />
              <span style={{ flex: '1 1 4rem', minWidth: 0, overflowWrap: 'anywhere' }}>
                {e.disease}
              </span>
              {classBadge(e.disease)}
            </KitButton>
          ))}
        </section>
      ))}
      <div style={{ ...CARD, marginTop: 22 }}>
        <p style={{ ...P, margin: 0 }} data-library-x="">
          {t('library.pathogenX')}
        </p>
      </div>
      <KitButton style={ROW_BTN} onPress={() => onView({ kind: 'why', entry: null })}>
        {t('library.whyLink')}
      </KitButton>
      {view.kind === 'card' ? (
        <PathogenCard
          subject={{
            disease: view.disease,
            type: libraryType(view.disease),
            remembered: false,
            now: null,
          }}
          whyBoxes={whyForDisease(view.disease, libraryType(view.disease))}
          onWhy={(entry) => onView({ kind: 'why', entry })}
        />
      ) : null}
    </div>
  );
}
