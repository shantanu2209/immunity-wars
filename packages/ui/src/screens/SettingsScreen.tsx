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

const BTN: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 48,
  fontSize: '0.9375rem',
  borderRadius: 10,
  border: '2px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
  marginTop: 10,
  padding: '8px 14px',
};

const ROW: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  minHeight: 48,
  padding: '8px 0',
  borderBottom: '1px solid #E5D9CF',
};

/** Why the delete row cannot act right now; null when it can. */
export type DeleteSaveBlock = 'none' | 'inPlay' | null;

/** A row of the settings table: a choice among options, or an action with a confirm. */
type Row =
  | { kind: 'choice'; key: string; labelKey: string; options: readonly string[]; value: string }
  | { kind: 'action'; key: string; labelKey: string };

interface Group {
  labelKey: string;
  rows: readonly Row[];
}

export function SettingsScreen({
  language,
  languages,
  onLanguage,
  deleteSaveBlock,
  onDeleteSave,
  onBack,
}: {
  /** The active locale code, and every locale the catalogue offers (one today). */
  language: string;
  languages: readonly string[];
  /** Chosen from the row's options; never called while there is only one. */
  onLanguage: (locale: string) => void;
  /** Why the delete row is disabled, or null when a save exists and is not being played. */
  deleteSaveBlock: DeleteSaveBlock;
  onDeleteSave: () => void;
  onBack: () => void;
}): ReactElement {
  const [confirming, setConfirming] = useState(false);

  const groups: readonly Group[] = [
    {
      labelKey: 'settings.groupReading',
      rows: [
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
      labelKey: 'settings.groupProgress',
      rows: [{ kind: 'action', key: 'deleteSave', labelKey: 'settings.deleteSave' }],
    },
  ];

  const renderRow = (row: Row): ReactElement => {
    if (row.kind === 'choice') {
      // One option is a value, not a choice: text, no control (see the header).
      const single = row.options.length <= 1;
      return (
        <div key={row.key} style={ROW} data-settings-row={row.key}>
          <span style={{ fontSize: '0.9375rem', color: '#2E2A28' }}>{t(row.labelKey)}</span>
          {single ? (
            <span style={{ fontSize: '0.9375rem', color: '#78665D' }}>
              {t(`${row.labelKey}.${row.value}`)}
            </span>
          ) : (
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {row.options.map((o) => (
                <button
                  key={o}
                  style={{
                    ...BTN,
                    width: 'auto',
                    marginTop: 0,
                    borderColor: o === row.value ? '#DE7800' : '#8E6E53',
                  }}
                  aria-pressed={o === row.value}
                  onClick={() => onLanguage(o)}
                >
                  {t(`${row.labelKey}.${o}`)}
                </button>
              ))}
            </span>
          )}
        </div>
      );
    }
    const blocked = deleteSaveBlock !== null;
    return (
      <div key={row.key} style={{ ...ROW, display: 'block' }} data-settings-row={row.key}>
        <button
          style={{ ...BTN, marginTop: 0, borderColor: blocked ? '#94847A' : '#B03A2E' }}
          disabled={blocked}
          onClick={() => setConfirming(true)}
        >
          {t(row.labelKey)}
        </button>
        {blocked ? (
          <p style={{ fontSize: '0.8125rem', color: '#78665D', margin: '6px 0 0' }}>
            {t(
              deleteSaveBlock === 'inPlay'
                ? 'settings.deleteSaveInPlay'
                : 'settings.deleteSaveNone',
            )}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '32px 16px' }} data-screen="settings">
      <h2 style={{ fontSize: '1.375rem', color: '#2E2A28' }}>{t('settings.title')}</h2>
      {groups.map((g) => (
        <section key={g.labelKey} style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: '0.875rem', color: '#78665D', margin: '0 0 4px' }}>
            {t(g.labelKey)}
          </h3>
          {g.rows.map(renderRow)}
        </section>
      ))}
      <button style={{ ...BTN, textAlign: 'center', borderColor: '#C48377' }} onClick={onBack}>
        {t('settings.back')}
      </button>
      {confirming ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(46,42,40,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
          }}
        >
          <div
            style={{
              width: 'min(88vw, 360px)',
              background: '#FFFDF9',
              border: '2px solid #B03A2E',
              borderRadius: 12,
              padding: 16,
              boxSizing: 'border-box',
            }}
          >
            <p style={{ fontSize: '0.9375rem' }}>{t('settings.deleteSaveConfirm')}</p>
            <button
              style={{ ...BTN, textAlign: 'center', borderColor: '#B03A2E' }}
              onClick={() => {
                setConfirming(false);
                onDeleteSave();
              }}
            >
              {t('settings.deleteSaveDo')}
            </button>
            <button style={{ ...BTN, textAlign: 'center' }} onClick={() => setConfirming(false)}>
              {t('settings.deleteSaveKeep')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
