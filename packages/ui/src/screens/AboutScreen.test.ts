/**
 * ABOUT SAYS WHICH VERSION THIS IS (ruled 3 October 2026), the name the deploy gave the server's
 * folder for it, and a build that is not a release says so instead of showing nothing. When a newer
 * version waits it says so and offers it: About is reached from the title, with nothing in play.
 * Control: pnpm ci:selftest about-shows-the-version.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { t } from '../i18n';
import { AboutScreen } from './AboutScreen';

const about = (version: string | null, onUpdate: (() => void) | null = null): string =>
  renderToStaticMarkup(createElement(AboutScreen, { version, onUpdate }));

describe('About and the version', () => {
  it('shows the version it is given', () => {
    const html = about('20261003-134930-fd58650');
    expect(html, 'ABOUT DOES NOT SHOW THE VERSION').toContain('20261003-134930-fd58650');
    expect(html).toContain(t('about.version'));
  });

  it('a build that is not a release says so', () => {
    expect(about(null)).toContain(t('about.versionLocal'));
    expect(t('about.versionLocal')).not.toBe('about.versionLocal');
  });

  it('offers a newer version only when one waits', () => {
    expect(about('v', () => undefined)).toContain('data-update-now');
    expect(about('v', () => undefined)).toContain(t('update.ready'));
    expect(about('v')).not.toContain('data-update-now');
  });
});
