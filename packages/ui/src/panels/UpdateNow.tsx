/**
 * UPDATE NOW, under the refusal that says this app and the game server are on different versions
 * (FINDINGS #93, ruled 28 September 2026). On the web there is no update for a player to go and find:
 * the newer version is already downloading into the phone, and waits there until the app is told to
 * use it. The button tells it, through the app shell's `onUpdate`, and the page reloads into it.
 *
 * It says it is working, because on a phone the newer version can take a few seconds to finish
 * downloading, and a button that looks dead gets pressed again.
 *
 * Also under a saved game a newer version wrote, on the title (`TitleScreen.tsx`).
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

/**
 * WHERE THIS APP'S UPDATES COME FROM (`docs/LOOK_PLAN.md` §28, step 4). The Android app has no
 * newer version downloading into it: its updates come from Google Play, so its button says so, and
 * the app's shell opens the game's page there. Nothing on the phone is being updated while the
 * player is away, so the button is not drawn as busy, and is there to press again when they come
 * back. Set once by the shell, before its first render.
 */
let fromTheStore = false;
export function updatesComeFromTheStore(on: boolean): void {
  fromTheStore = on;
}

export function UpdateNow({ onUpdate }: { onUpdate: () => void }): ReactElement {
  const [updating, setUpdating] = useState(false);
  return (
    <KitButton
      kind="go"
      data-update-now={fromTheStore ? 'store' : ''}
      style={{ marginTop: 12 }}
      unavailable={updating}
      onPress={() => {
        if (!fromTheStore) setUpdating(true);
        onUpdate();
      }}
    >
      {fromTheStore
        ? t('update.inStore')
        : updating
          ? t('together.updating')
          : t('together.updateNow')}
    </KitButton>
  );
}
