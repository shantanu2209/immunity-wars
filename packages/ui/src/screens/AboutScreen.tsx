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
 * NO VERSION STRING, deliberately, though the convention would have one. It would need a build
 * identifier injected through Vite, and its use is telling someone which build a problem came
 * from — but there is no way to report a problem: no network, no form, no address, by design.
 * It becomes worth its plumbing when the app is in a store and a person can write to someone
 * about it, which is Phase 4.
 *
 * The licence lines are the README's split: code under Apache 2.0, and the game content ALL
 * RIGHTS RESERVED by decision, which is the answer a teacher reading this needs to see. The
 * classroom sentence is kept because it is the one thing on this screen a reader might act on.
 */
import type { ReactElement } from 'react';

import { t } from '../i18n';
import { BODY, PAGE, SECTION, TITLE } from './chrome';

/** Its way back is the floating close (docs/for-P2.7.md §9, ruling 8), not a button at the end. */
export function AboutScreen(): ReactElement {
  return (
    <div style={PAGE} data-screen="about">
      <h1 style={TITLE}>{t('about.title')}</h1>
      <p style={BODY}>{t('about.lead')}</p>

      <h2 style={SECTION}>{t('about.credits')}</h2>
      <p style={BODY}>
        <b>{t('about.design')}</b> {t('about.designBody')}
      </p>
      <p style={BODY}>
        <b>{t('about.direction')}</b> {t('about.directionBody')}
      </p>
      <p style={BODY}>
        <b>{t('about.code')}</b> {t('about.codeBody')}
      </p>

      <h2 style={SECTION}>{t('about.recognition')}</h2>
      <p style={BODY}>{t('about.prize')}</p>
      <p style={BODY}>{t('about.showcase')}</p>

      <h2 style={SECTION}>{t('about.privacy')}</h2>
      <p style={BODY}>{t('about.privacyBody')}</p>

      <h2 style={SECTION}>{t('about.licence')}</h2>
      <p style={BODY}>{t('about.licenceCode')}</p>
      <p style={BODY}>{t('about.licenceContent')}</p>
      <p style={BODY}>{t('about.classroom')}</p>
    </div>
  );
}
