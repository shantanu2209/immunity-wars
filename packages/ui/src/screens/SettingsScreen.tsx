/**
 * SETTINGS (docs/APP_FLOW.md §4's Title slot, and the pause menu's; docs/for-P2.6.md,
 * PROPOSAL 2 and the rulings on it, 6 September 2026).
 *
 * A list of rows in two groups, rendered from the ROWS table below so that adding a row is one
 * entry and no row is special-cased in the layout. The first set is deliberately small:
 *
 *   Reading   Language — a choice whose options are the catalogue's locales. ONE today, so the
 *             row shows the value as text and no control: a control with one option would be
 *             a control that does nothing, which Gate 1 forbids. The second locale makes it a
 *             control by itself. Text size — PR 2 of this piece, with the scaling mechanism and
 *             the audit's third pass; it touches every screen and lands alone (ruling 2).
 *   Progress  Delete saved game — the label is the smaller true claim (ruling 1): the row
 *             clears the autosave and nothing else, because nothing else persists. Disabled,
 *             with the reason shown, when there is no save or when the save is the game being
 *             played (deleting it mid-game would only be re-created by the next action).
 *
 * The screen holds no preference itself: the shell owns the store (packages/app,
 * `settings.ts`) and passes values and handlers down, the same division as the autosave.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { COLOUR, TYPE } from '../kit/tokens';
import { useNavLayer } from '../nav/NavHost';

import { BODY, CARD, DIALOG, GROUP, NOTE, PAGE, SCRIM, STACK, TITLE } from './chrome';

/**
 * A row, on its group's card (stage L5): what it is on the left, its value or its choices on the
 * right, and the two on a line each when they do not fit one. Rows after the first are parted by
 * space, not by a rule: a hairline on cream would be one more colour to measure and says nothing.
 */
const ROW: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  minHeight: 48,
  padding: '6px 0',
};

/** Why the delete row cannot act right now; null when it can. */
export type DeleteSaveBlock = 'none' | 'inPlay' | null;

/** The choice rows the shell knows how to store; a new choice row is a new member here. */
export type ChoiceRow = 'textSize' | 'language' | 'sound';

/** A row of the settings table: a choice among options, or an action with a confirm. */
type Row =
  | {
      kind: 'choice';
      key: ChoiceRow;
      labelKey: string;
      options: readonly string[];
      value: string;
    }
  | {
      kind: 'action';
      key: string;
      labelKey: string;
      /** Why the row is disabled, or null when it can be used. */
      blockedKey: string | null;
      /** The confirm's three strings and what it does. Generalised on 9 September 2026, when
       *  the hints row became the SECOND action row: the first was written straight into the
       *  renderer, which is exactly the shape the rows table exists to avoid. */
      confirmKey: string;
      confirmYesKey: string;
      onAct: () => void;
    };

interface Group {
  labelKey: string;
  rows: readonly Row[];
}

export function SettingsScreen({
  textSize,
  textSizes,
  language,
  languages,
  sound,
  sounds,
  onChoose,
  deleteSaveBlock,
  onDeleteSave,
  hintsSeenAny,
  onResetHints,
}: {
  /** The text size in force and the sizes offered (percentages of the browser default). */
  textSize: string;
  textSizes: readonly string[];
  /** The active locale code, and every locale the catalogue offers (one today). */
  language: string;
  languages: readonly string[];
  /**
   * Sound and touch, on or off (stage L5; ruled at L3: on by default, with a mute here). One switch
   * for the sounds and the buzz together.
   */
  sound: string;
  sounds: readonly string[];
  /** A choice made on a row; never called for a row with one option (it renders no control). */
  onChoose: (row: ChoiceRow, value: string) => void;
  /** Why the delete row is disabled, or null when a save exists and is not being played. */
  deleteSaveBlock: DeleteSaveBlock;
  onDeleteSave: () => void;
  /** True when this device has seen at least one hint; the row is disabled otherwise. */
  hintsSeenAny: boolean;
  /**
   * Shows the first-game guidance again, or NULL WHEN THERE IS NONE TO SHOW, and then the row is
   * not drawn. From stage L4 the coach and the hints are off until the guided game replaces them
   * (docs/LOOK_PLAN.md §14, ruling 2), and a row that says they will appear again would say
   * something false (docs/FINDINGS.md #111).
   */
  onResetHints: (() => void) | null;
}): ReactElement {
  const [confirming, setConfirming] = useState<string | null>(null);
  // The confirm is a dialog on the navigation stack: the back gesture cancels it, and the floating
  // close stays hidden while it is up, because a dialog is answered by its own buttons.
  useNavLayer('settings-confirm', confirming !== null, () => setConfirming(null), false);

  const groups: readonly Group[] = [
    {
      labelKey: 'settings.groupReading',
      rows: [
        {
          kind: 'choice',
          key: 'textSize',
          labelKey: 'settings.textSize',
          options: textSizes,
          value: textSize,
        },
        {
          kind: 'choice',
          key: 'language',
          labelKey: 'settings.language',
          options: languages,
          value: language,
        },
      ],
    },
    {
      labelKey: 'settings.groupSound',
      rows: [
        {
          kind: 'choice',
          key: 'sound',
          labelKey: 'settings.sound',
          options: sounds,
          value: sound,
        },
      ],
    },
    {
      labelKey: 'settings.groupProgress',
      rows: [
        {
          kind: 'action',
          key: 'deleteSave',
          labelKey: 'settings.deleteSave',
          blockedKey:
            deleteSaveBlock === 'inPlay'
              ? 'settings.deleteSaveInPlay'
              : deleteSaveBlock === 'none'
                ? 'settings.deleteSaveNone'
                : null,
          confirmKey: 'settings.deleteSaveConfirm',
          confirmYesKey: 'settings.deleteSaveDo',
          onAct: onDeleteSave,
        },
        ...(onResetHints === null
          ? []
          : [
              {
                kind: 'action' as const,
                key: 'resetHints',
                labelKey: 'settings.hintsShow',
                blockedKey: hintsSeenAny ? null : 'settings.hintsReason',
                confirmKey: 'settings.hintsConfirmBody',
                confirmYesKey: 'settings.hintsConfirmYes',
                onAct: onResetHints,
              },
            ]),
      ],
    },
  ];

  const renderRow = (row: Row): ReactElement => {
    if (row.kind === 'choice') {
      // One option is a value, not a choice: text, no control (see the header).
      const single = row.options.length <= 1;
      return (
        <div key={row.key} style={ROW} data-settings-row={row.key}>
          <span style={{ ...TYPE.action, color: COLOUR.ink }}>{t(row.labelKey)}</span>
          {single ? (
            <span style={{ ...TYPE.body, color: COLOUR.inkSoft }}>
              {t(`${row.labelKey}.${row.value}`)}
            </span>
          ) : (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {row.options.map((o) => (
                // The one in force is pressed in and ringed: told by its shape, not only its colour.
                <KitButton
                  key={o}
                  style={{ width: 'auto', flex: '1 0 auto' }}
                  selected={o === row.value}
                  aria-pressed={o === row.value}
                  data-settings-option={o}
                  onPress={() => onChoose(row.key, o)}
                >
                  {t(`${row.labelKey}.${o}`)}
                </KitButton>
              ))}
            </span>
          )}
        </div>
      );
    }
    const blocked = row.blockedKey !== null;
    return (
      <div key={row.key} style={{ ...ROW, display: 'block' }} data-settings-row={row.key}>
        <KitButton unavailable={blocked} onPress={() => setConfirming(row.key)}>
          {t(row.labelKey)}
        </KitButton>
        {row.blockedKey ? <p style={NOTE}>{t(row.blockedKey)}</p> : null}
      </div>
    );
  };

  /** The row the confirm belongs to. Both action rows use the same dialog with their own words. */
  const confirmRow = groups
    .flatMap((g) => g.rows)
    .find(
      (r): r is Extract<Row, { kind: 'action' }> => r.kind === 'action' && r.key === confirming,
    );

  return (
    <div style={PAGE} data-screen="settings">
      <h1 style={TITLE}>{t('settings.title')}</h1>
      {groups.map((g) => (
        <section key={g.labelKey}>
          <h2 style={GROUP}>{t(g.labelKey)}</h2>
          <div style={{ ...CARD, marginTop: 6 }}>{g.rows.map(renderRow)}</div>
        </section>
      ))}
      {confirming ? (
        <div style={SCRIM}>
          <div style={DIALOG}>
            <p style={{ ...BODY, marginTop: 0 }}>{t(confirmRow?.confirmKey ?? '')}</p>
            <KitButton
              kind="main"
              style={STACK}
              onPress={() => {
                setConfirming(null);
                confirmRow?.onAct();
              }}
              data-settings-confirm=""
            >
              {t(confirmRow?.confirmYesKey ?? '')}
            </KitButton>
            <KitButton style={STACK} onPress={() => setConfirming(null)}>
              {t('settings.deleteSaveKeep')}
            </KitButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
