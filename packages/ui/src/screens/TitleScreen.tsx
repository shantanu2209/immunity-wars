/**
 * TITLE — the entry screen (docs/APP_FLOW.md §4). States: with-save / without-save.
 * Continue appears only when a save exists and names what it resumes.
 *
 * DRAWN IN CLAY (stage L5 of docs/LOOK_PLAN.md), from the picture of it Shantanu picked at stage L1
 * (docs/look/l1-clay-title.webp): the seven cells on their board, the game's name on the table
 * under them, one coral button, the rest in cream, and two quiet links at the foot.
 *
 * THE PICTURE is `art/clay/scene/title`, rendered by tools/art-pipeline/clay/hero.py from the
 * pieces of the kit. It says nothing a player must read, so it has no words for a reader and is
 * held by the pipeline to its edge, not to contrast. It gives way before anything else does: on a
 * short screen, or with the text enlarged, the picture is what shrinks.
 *
 * ONE MAIN BUTTON. It is the thing this visit is most likely for: Continue when a game is waiting,
 * New game when none is. A room to go back to is mint, the kit's colour for what is allowed and
 * waiting, because it can be offered beside a game to continue and there is one coral button.
 */
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { COLOUR, TOUCH, TYPE } from '../kit/tokens';

import { STACK } from './chrome';
import { ScreenIcon } from './icons';

export interface SaveSummary {
  difficulty: string;
  turn: number;
}

/** The title's picture, at the three sizes the pipeline builds. */
const HERO = '/art/clay/scene/title';
const HERO_SET = `${HERO}@1x.webp 360w, ${HERO}@2x.webp 720w, ${HERO}@3x.webp 1080w`;

/** A quiet link at the foot: the table's quiet ink, and still a full touch target. */
const QUIET: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4em',
  minHeight: TOUCH.min,
  minWidth: TOUCH.min,
  padding: '0 0.75em',
  border: 0,
  background: 'transparent',
  color: COLOUR.onDarkSoft,
  fontFamily: TYPE.family,
  ...TYPE.body,
  fontWeight: 800,
  cursor: 'pointer',
};

export function TitleScreen({
  save,
  onContinue,
  onNewGame,
  onLearn = null,
  onTogether,
  rejoin = null,
  onRejoin = () => undefined,
  onSettings,
  onHelp,
  onAbout,
}: {
  /** Present when an autosave exists; Continue renders only then. */
  save: SaveSummary | null;
  onContinue: () => void;
  onNewGame: () => void;
  /**
   * THE GUIDED GAME (stage L6, ruled 2 October 2026): offered on a phone that has never finished
   * a game, and null on every other. While it is offered it is the thing the title is for, so it
   * is the coral button, unless a game is waiting to be continued.
   */
  onLearn?: (() => void) | null;
  /** Play together (P3.7, ruled 25 September 2026): beside New game, on the Title. */
  onTogether: () => void;
  /**
   * THE ROOM THIS DEVICE WAS IN (P3.7 piece C, ruling (a)), offered so a player whose phone closed
   * the app can go back to it, by choice (ruling 4). Null when there is none.
   */
  rejoin?: { code: string } | null;
  onRejoin?: () => void;
  /** The four P2.6 Title slots (APP_FLOW §4), in the order they are shown. */
  onSettings: () => void;
  onHelp: () => void;
  onAbout: () => void;
}): ReactElement {
  return (
    <div
      data-title-screen=""
      style={{
        // Out to the screen's edges: the page's own margin is taken back, as the play screen does.
        margin: -8,
        minHeight: '100dvh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: TYPE.family,
        color: COLOUR.onDark,
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          // The picture takes what the words and the buttons leave, and no more than its own shape.
          flex: '1 1 0',
          minHeight: 120,
          maxHeight: 'min(46dvh, 373px)',
          width: '100%',
          maxWidth: 420,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* LAID OVER ITS BOX, NOT SIZED BY IT (docs/FINDINGS.md #127). The screen is AT LEAST one
            screen tall, so by the standard the box's height, which flexing gives it, is not a
            definite one, and a picture `height: 100%` of it falls back to its own shape. Chrome
            resolves it anyway; WebKit, which every browser on an iPhone is, does not, and the
            picture ran down over the game's name. A picture placed absolutely is measured against
            the box as laid out, which every engine knows. */}
        <img
          alt=""
          src={`${HERO}@2x.webp`}
          srcSet={HERO_SET}
          sizes="(min-width: 420px) 420px, 100vw"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
      <div
        style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box', padding: '0 16px 10px' }}
      >
        {/* NO CREDIT LINE HERE (item 1, 19 September 2026): About carries it, and the Title is
            the screen a newcomer must read fastest. ONE LINE SAYING WHAT THE GAME IS stays, because
            removing the credit took the only sentence that did (§21 G). */}
        <h1
          style={{
            ...TYPE.display,
            fontSize: '2.125rem',
            margin: '6px 0 0',
            textShadow: '0 3px 0 rgba(0, 0, 0, 0.35)',
          }}
        >
          {t('title.name')}
        </h1>
        <p style={{ ...TYPE.body, color: COLOUR.onDarkSoft, margin: '6px 0 4px' }}>
          {t('title.blurb')}
        </p>
        {rejoin ? (
          <KitButton kind="go" onPress={onRejoin} data-title="rejoin" style={STACK}>
            <ScreenIcon kind="together" />
            {t('title.rejoin', { code: rejoin.code })}
          </KitButton>
        ) : null}
        {save ? (
          <KitButton
            kind="main"
            onPress={onContinue}
            data-title="continue"
            style={{ ...STACK, flexWrap: 'wrap', columnGap: '0.5em', rowGap: 0 }}
          >
            <ScreenIcon kind="play" />
            {t('title.continue')}
            <span style={{ flex: '1 0 100%', ...TYPE.body, fontWeight: 700 }}>
              {/* The difficulty is a key, not display text — render its catalogue name. */}
              {t(`difficulty.${save.difficulty}`)} {t('title.continueTurn')} {save.turn}
            </span>
          </KitButton>
        ) : null}
        {onLearn ? (
          <KitButton
            kind={save ? 'rest' : 'main'}
            onPress={onLearn}
            data-title="learn"
            style={STACK}
          >
            <ScreenIcon kind="learn" />
            {t('title.learn')}
          </KitButton>
        ) : null}
        <KitButton
          kind={save || onLearn ? 'rest' : 'main'}
          onPress={onNewGame}
          data-title="new"
          style={STACK}
        >
          {save || onLearn ? null : <ScreenIcon kind="play" />}
          {t('title.newGame')}
        </KitButton>
        <KitButton onPress={onTogether} data-title="together" style={STACK}>
          <ScreenIcon kind="together" />
          {t('title.together')}
        </KitButton>
        <KitButton onPress={onHelp} data-title="help" style={STACK}>
          <ScreenIcon kind="learn" />
          {t('title.help')}
        </KitButton>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-evenly',
            flexWrap: 'wrap',
            marginTop: 8,
          }}
        >
          <button style={QUIET} onClick={onSettings} data-title="settings">
            <ScreenIcon kind="settings" size="1.15em" />
            {t('title.settings')}
          </button>
          <button style={QUIET} onClick={onAbout} data-title="about">
            <ScreenIcon kind="about" size="1.15em" />
            {t('title.about')}
          </button>
        </div>
      </div>
    </div>
  );
}
