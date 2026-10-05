/**
 * IN THE ANDROID APP, UPDATE SAYS WHERE THE UPDATE IS (docs/LOOK_PLAN.md §28, step 4). Its updates
 * come from Google Play, and a button that said Update now and then left the app for the store would
 * surprise; one that turned to Updating and stayed so would look broken when the player came back.
 * Control: pnpm ci:selftest update-in-the-app-names-the-store.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { t } from '../i18n';

import { UpdateNow, updatesComeFromTheStore } from './UpdateNow';

const button = (): string =>
  renderToStaticMarkup(createElement(UpdateNow, { onUpdate: () => undefined }));

afterEach(() => updatesComeFromTheStore(false));

describe('the update button', () => {
  it('on the web, says Update now', () => {
    updatesComeFromTheStore(false);
    expect(button()).toContain(t('together.updateNow'));
    expect(button()).not.toContain('data-update-now="store"');
  });

  it('in the Android app, names Google Play', () => {
    updatesComeFromTheStore(true);
    const html = button();
    expect(html, 'THE ANDROID APP’S UPDATE DOES NOT SAY IT IS IN GOOGLE PLAY').toContain(
      t('update.inStore'),
    );
    expect(t('update.inStore')).toContain('Google Play');
    expect(html).toContain('data-update-now="store"');
  });
});
