/**
 * ABOUT — the fourth and last of the Title slots (docs/APP_FLOW.md §4).
 *
 * `APP_FLOW.md` lists About as a destination and says nothing about what is in it, so the
 * contents are a decision rather than a transcription. What decided them is that **three of the
 * project's hard rules land on this one screen**, and two of them are about people:
 *
 *   1. **Never imply Kartik wrote the code** (`CLAUDE.md`). This is the screen where a stranger
 *      forms their idea of who made this, so it is the screen where getting it wrong would
 *      matter most. The credits here are the README's, in the same three parts and the same
 *      order, saying the same thing: he designed the game, he did not write the source, and this
 *      should not be read as claiming otherwise. Nothing here is softened for being an app.
 *   2. **No personal data, and this is a public repository** (`CLAUDE.md`). Two names and one
 *      age, exactly as the README carries them. No school, no city, no contact, no photograph,
 *      no link that would resolve to any of those.
 *   3. **All player-visible text through the catalogue.** Every line on this screen is an entry.
 *
 * WHAT IS DELIBERATELY NOT HERE. No feedback form, no rating prompt, no share button, no
 * analytics notice — the first three would need a network the app does not use, and the fourth
 * would describe collection that does not happen. An About screen that mentions privacy in order
 * to reassure is describing a policy; this app has no policy because it has nothing to collect,
 * and the honest form of that is the one line under Privacy rather than a page.
 *
 * THE VERSION, AND A NEWER ONE WHEN IT IS WAITING (ruled 3 October 2026). This said there was
 * deliberately no version string, until a store gave a person someone to write to. What changed
 * it was not a store: an iPhone played a version from before the look for days, and nobody could
 * tell which build it held (docs/FINDINGS.md #126). The version is the one the deploy names the
 * server's folder by, put into the build by the deploy script (`VITE_APP_VERSION`), so the two can
 * be read against each other. A build made anywhere else says it is not a release.
 *
 * The licence lines are the README's split: code under Apache 2.0, and the game content ALL
 * RIGHTS RESERVED by decision, which is the answer a teacher reading this needs to see. The
 * classroom sentence is kept because it is the one thing on this screen a reader might act on.
 */
import type { ReactElement } from 'react';

import { t } from '../i18n';
import { UpdateNow } from '../panels/UpdateNow';
import { BODY, CARD, LEAD, PAGE, SECTION, TITLE } from './chrome';

/** Its way back is the floating close (docs/for-P2.7.md §9, ruling 8), not a button at the end. */
export function AboutScreen({
  version = null,
  onUpdate = null,
}: {
  /** The build's version, as the deploy named it; null for a build that is not a release. */
  version?: string | null;
  /** Present when a newer version has downloaded and waits. Nothing is in play here to lose. */
  onUpdate?: (() => void) | null;
}): ReactElement {
  return (
    <div style={PAGE} data-screen="about">
      <h1 style={TITLE}>{t('about.title')}</h1>
      <p style={LEAD}>{t('about.lead')}</p>

      {/* Each section is a card (stage L5): prose is read on cream, not on the dark table. */}
      <section style={CARD}>
        <h2 style={SECTION}>{t('about.credits')}</h2>
        <p style={BODY}>
          <b>{t('about.design')}</b> {t('about.designBody')}
        </p>
        <p style={BODY}>
          <b>{t('about.direction')}</b> {t('about.directionBody')}
        </p>
        <p style={{ ...BODY, marginBottom: 0 }}>
          <b>{t('about.code')}</b> {t('about.codeBody')}
        </p>
      </section>

      <section style={CARD}>
        <h2 style={SECTION}>{t('about.recognition')}</h2>
        <p style={BODY}>{t('about.prize')}</p>
        <p style={{ ...BODY, marginBottom: 0 }}>{t('about.showcase')}</p>
      </section>

      <section style={CARD}>
        <h2 style={SECTION}>{t('about.privacy')}</h2>
        <p style={{ ...BODY, marginBottom: 0 }}>{t('about.privacyBody')}</p>
      </section>

      <section style={CARD}>
        <h2 style={SECTION}>{t('about.licence')}</h2>
        <p style={BODY}>{t('about.licenceCode')}</p>
        <p style={BODY}>{t('about.licenceContent')}</p>
        <p style={{ ...BODY, marginBottom: 0 }}>{t('about.classroom')}</p>
      </section>

      <section style={CARD} data-about="version">
        <h2 style={SECTION}>{t('about.version')}</h2>
        <p style={{ ...BODY, marginBottom: 0, overflowWrap: 'anywhere' }}>
          {version ?? t('about.versionLocal')}
        </p>
        {onUpdate !== null ? (
          <>
            <p style={{ ...BODY, margin: '12px 0 0' }}>{t('update.ready')}</p>
            <UpdateNow onUpdate={onUpdate} />
          </>
        ) : null}
      </section>
    </div>
  );
}
