/**
 * UPDATE NOW, under the refusal that says this app and the game server are on different versions
 * (FINDINGS #93, ruled 28 September 2026). On the web there is no update for a player to go and find:
 * the newer version is already downloading into the phone, and waits there until the app is told to
 * use it. The button tells it, through the app shell's `onUpdate`, and the page reloads into it.
 *
 * It says it is working, because on a phone the newer version can take a few seconds to finish
 * downloading, and a button that looks dead gets pressed again.
 */
import { useState, type ReactElement } from 'react';

import { t } from '../i18n';
import { BTN } from '../screens/chrome';

export function UpdateNow({ onUpdate }: { onUpdate: () => void }): ReactElement {
  const [updating, setUpdating] = useState(false);
  return (
    <button
      data-update-now=""
      style={BTN}
      disabled={updating}
      onClick={() => {
        setUpdating(true);
        onUpdate();
      }}
    >
      {updating ? t('together.updating') : t('together.updateNow')}
    </button>
  );
}
