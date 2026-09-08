/**
 * THE CRASH SCREEN — what a player sees when something in the app throws.
 *
 * Built to `docs/for-P2.6-errors.md`, ruled in full by Shantanu on 8 September 2026. The two
 * rulings that shape every line of this file:
 *
 * ============================================================================================
 * RULING 1 — IT RELOADS. IT DOES NOT RECOVER IN PLACE.
 * ============================================================================================
 *
 * A React tree that threw during render is in an UNDEFINED state: the session may be mid-action,
 * a burst timer may still be scheduled, the view may be half-applied. The autosave, by contrast,
 * is CURRENT — `LocalSession` writes it on every accepted action and awaits the write, so a crash
 * loses at most the action that was being applied, never a turn.
 *
 * So every exit here is a reload. Trading a defined state for an undefined one to save a page
 * load is how a crash becomes a corruption.
 *
 * ============================================================================================
 * RULING 2 — IT NEVER WRITES TO STORAGE. NOT UNDER ANY BUTTON.
 * ============================================================================================
 *
 * This component takes NO storage handle and NO save callback, and that is deliberate rather
 * than incidental: it is the shape of the file that enforces the ruling, not a comment asking
 * someone not to. A crashed render is exactly when the in-memory game is least trustworthy and
 * the autosave is still good.
 *
 * **The failure this rules out is a crash screen that helpfully saves, and overwrites forty good
 * turns with whatever was in memory when the tree threw.** Shantanu: helpfulness that reads as
 * care and does damage. There is no delete button either, for the same reason — a save that
 * failed to LOAD may be fine and the loader may be what broke.
 *
 * Reading the save to report it is fine, and the shell does that read; this screen is told the
 * answer.
 *
 * ============================================================================================
 * RULING 3 — THE FOUR CASES AS WORDED, AND THE TECHNICAL DETAILS LINE IS IN, COLLAPSED
 * ============================================================================================
 *
 * The deciding reason is not developer convenience: **the only bug channel this project has is a
 * person telling us.** The game has been shown at a showcase and is going into classrooms, and
 * there is no network, no form and no address by design. A collapsed line a player can read out
 * is the difference between "it broke" and something actionable.
 *
 * It stays collapsed because an exception message is noise to a 13-year-old and to a teacher,
 * and it is never the first thing said.
 *
 * Case A names the turn, because "your game is saved" is a claim and a number is evidence the
 * player can check when they land back in it.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';

/**
 * What the shell found when it read the autosave, and nothing else. Deliberately not a session,
 * not a storage handle, not a save callback — see ruling 2.
 *
 *   `playing`   a save exists and a game was under way
 *   `safe`      a save exists; the crash was on Title, Help, the library or About
 *   `none`      no save at all
 *   `unreadable` a save exists but could not be read
 */
export type CrashCase = 'playing' | 'safe' | 'none' | 'unreadable';

const BTN: CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 48,
  fontSize: '1rem',
  borderRadius: 10,
  border: '2px solid #8E6E53',
  background: '#FFFDF9',
  cursor: 'pointer',
  marginTop: 12,
  padding: '8px 14px',
};
const P: CSSProperties = {
  fontSize: '0.9375rem',
  lineHeight: 1.45,
  color: '#2E2A28',
  margin: '10px 0',
};

export function CrashScreen({
  which,
  turn,
  detail,
  onContinue,
  onTitle,
  onNewGame,
}: {
  which: CrashCase;
  /** Only read in the `playing` case; the screen names it as evidence. */
  turn: number | null;
  /** The error's message and stack, for the collapsed line. Never shown by default. */
  detail: string;
  /** Reload and resume. Present only in the `playing` case. */
  onContinue: () => void;
  /** Reload to the title. Always present: no screen without an exit (Gate 1). */
  onTitle: () => void;
  /** Reload into a new game. Present only when the save could not be read. */
  onNewGame: () => void;
}): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: '48px 16px' }} data-crash={which}>
      <h1 style={{ fontSize: '1.5rem', color: '#B03A2E' }}>{t('crash.title')}</h1>

      {which === 'playing' ? (
        <p style={P}>
          {t('crash.saved')} {t('crash.resumeAt')} {turn ?? 1}
          {t('help.stop')}
        </p>
      ) : null}
      {which === 'safe' ? <p style={P}>{t('crash.safe')}</p> : null}
      {which === 'none' ? <p style={P}>{t('crash.none')}</p> : null}
      {which === 'unreadable' ? <p style={P}>{t('crash.unreadable')}</p> : null}

      {which === 'playing' ? (
        <button
          style={{ ...BTN, borderColor: '#B03A2E' }}
          onClick={onContinue}
          data-crash-continue=""
        >
          {t('crash.continue')}
        </button>
      ) : null}
      {which === 'unreadable' ? (
        <button style={BTN} onClick={onNewGame}>
          {t('crash.newGame')}
        </button>
      ) : null}
      <button style={{ ...BTN, borderColor: '#C48377' }} onClick={onTitle}>
        {t('crash.title.back')}
      </button>

      <button
        style={{ ...BTN, minHeight: 44, fontSize: '0.8125rem', color: '#78665D' }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-crash-details=""
      >
        {open ? t('crash.hideDetails') : t('crash.showDetails')}
      </button>
      {open ? (
        <pre
          style={{
            ...P,
            fontSize: '0.75rem',
            whiteSpace: 'pre-wrap',
            overflowX: 'auto',
            background: '#F6F1EC',
            border: '1px solid #C9BBAE',
            borderRadius: 8,
            padding: 10,
          }}
          data-crash-detail-text=""
        >
          {detail}
        </pre>
      ) : null}
    </div>
  );
}
