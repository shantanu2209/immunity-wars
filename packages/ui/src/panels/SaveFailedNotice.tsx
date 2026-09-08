/**
 * THE STORAGE-FAILURE NOTICE.
 *
 * Shown once, when the session reports that an autosave failed. It is the visible half of the
 * third arm of the subscription union (`SessionNotice`); the session change and this landed as
 * one piece, because a notice has nothing to notice until the signal exists.
 *
 * ============================================================================================
 * ITS WORDING IS CHECKED AGAINST A RULING, NOT JUST WRITTEN
 * ============================================================================================
 *
 * Shantanu, 8 September 2026, ruling 5, declining the startup storage probe: *"What matters is
 * that the notice does not IMPLY a guarantee it cannot make, so check its wording against
 * that."*
 *
 * The guarantee it cannot make is **"your game was saved up to now"**. This notice fires on the
 * FIRST failure the session sees, and the session only tries to save after an accepted action —
 * so a device whose storage never worked produces this notice at the first action, and a device
 * that broke midway produces it then. **The notice cannot tell those apart**, and the wording
 * must therefore not say or suggest which happened.
 *
 * So the text says what is true in both cases and no more: **this game cannot be saved on this
 * device**, present tense, about this game. It does not say "from now on", which would imply
 * earlier turns were safe. It does not say "your progress so far is saved", which is the exact
 * false comfort. It does not say "try again", because there is nothing for the player to do.
 *
 * The honest consequence is stated plainly instead: **if you close the game, it will not be
 * here.** That is true whichever case this is, and it is the only thing the player can act on.
 *
 * ⚠️ The first failure is always silent — there is nothing to report until a write has been
 * tried and lost. Detecting a broken store earlier needs a startup probe, which was considered
 * and **not built** (ruling 5): real work for a rare case. Recorded so nobody reads this notice
 * as a guarantee that saving works up until it appears.
 *
 * Dismissable, and it does not block. A player who cannot save can still play, which is the
 * whole reason the session swallows the failure rather than rejecting the action.
 */
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';

const WRAP: CSSProperties = {
  border: '2px solid #B03A2E',
  background: '#FFF4F1',
  borderRadius: 10,
  padding: '10px 12px',
  margin: '10px 0',
};

export function SaveFailedNotice({ onDismiss }: { onDismiss: () => void }): ReactElement {
  return (
    <div style={WRAP} role="status" data-save-failed="">
      <p style={{ fontSize: '0.9375rem', lineHeight: 1.45, color: '#2E2A28', margin: '0 0 8px' }}>
        {t('save.failed')}
      </p>
      <button
        style={{
          minHeight: 44,
          fontSize: '0.875rem',
          borderRadius: 8,
          border: '2px solid #8E6E53',
          background: '#FFFDF9',
          cursor: 'pointer',
          padding: '6px 14px',
        }}
        onClick={onDismiss}
      >
        {t('save.failedDismiss')}
      </button>
    </div>
  );
}
