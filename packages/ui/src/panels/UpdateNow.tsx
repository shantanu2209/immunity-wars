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
import { KitButton } from '../kit/Button';
import { COLOUR } from '../kit/tokens';

/**
 * A NEW VERSION IS READY (ruled 3 October 2026): a dot on the game's menu button, which opens the
 * menu that says so. Mint, the kit's colour for what is allowed and waiting, in its darker edge, so
 * that it holds 3:1 against the resting button's face (`kit/contrast.ts`). It says nothing a reader
 * needs: the button's own label says it in words.
 */
export function UpdateDot(): ReactElement {
  return (
    <span
      data-update-dot=""
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: COLOUR.mintEdge,
      }}
    />
  );
}

export function UpdateNow({ onUpdate }: { onUpdate: () => void }): ReactElement {
  const [updating, setUpdating] = useState(false);
  return (
    <KitButton
      kind="go"
      data-update-now=""
      style={{ marginTop: 12 }}
      unavailable={updating}
      onPress={() => {
        setUpdating(true);
        onUpdate();
      }}
    >
      {updating ? t('together.updating') : t('together.updateNow')}
    </KitButton>
  );
}
