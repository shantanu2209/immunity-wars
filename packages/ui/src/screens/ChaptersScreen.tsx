/**
 * THE LESSON'S CHAPTERS, ONE BUTTON EACH (ruled by Shantanu, 16 October 2026; docs/LOOK_PLAN.md
 * §29). *"clicking on learn to play takes to another screen that has 7 buttons - one for each
 * chapter. Initally only chapter one is playable the rest are not clickable and are have a duller
 * colour or something to differentiate. As chapter get complete their button turns green and they
 * are replayable. The new chapter which is unlocked but not completed yet (either not started or
 * started but not finished) stays orange and can be continued."*
 *
 * Three states, each told by its word as well as its colour:
 *
 *   done     mint, the kit's colour for what is allowed: played to its end, and can be played again
 *   open     coral, the screen's one main button: the next chapter, begun or not
 *   locked   flat, and not pressable: its chapter before it is not done yet
 *
 * ONE SCREEN (Gate 2's polish, piece 2, ruled 24 November 2026; docs/LOOK_PLAN.md §33). Seven rows
 * of three lines each scrolled 570 px past a phone's screen. A row is now its name with its state
 * at the end of the same line, and the line saying what a chapter covers is shown on the one
 * chapter to play next: the one a player is deciding about.
 *
 * WHAT A CHAPTER BEGINS FROM IS FIXED. The lesson is one game on its own dice, and the player can
 * press only what is lit, so the game at a chapter's start is the same every time, whatever was
 * done before it. A chapter opened from here is reached by playing the chapters before it again,
 * unseen (`playLessonTo`); `tests/session/src/guide.test.ts` holds that the game it reaches is the
 * very game a player who never stopped has there.
 *
 * A chapter is begun again from its start, begun or not: a game on rails is not saved, so a chapter
 * left in the middle has nothing to come back to but its start.
 *
 * WHEN A GAME IS SAVED the screen says what the lesson does to it: nothing while it is played, and
 * when the last chapter ends the lesson's game is the player's, and is saved in its place.
 *
 * Dumb by design: the shell says how many chapters are done and starts the one pressed.
 */
import type { CSSProperties, ReactElement } from 'react';

import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { COLOUR, TYPE } from '../kit/tokens';

import { LEAD, PAGE, SAY, STACK, TITLE } from './chrome';

export type ChapterState = 'done' | 'open' | 'locked';

/** Each chapter's state: those done, then the next one open, then the rest locked. */
export function chapterStates(count: number, done: number): ChapterState[] {
  return Array.from({ length: count }, (_, c) =>
    c < done ? 'done' : c === done ? 'open' : 'locked',
  );
}

/** A row: the chapter and its state on one line, and on the next chapter what it is about. */
const ROW: CSSProperties = {
  ...STACK,
  marginTop: 4,
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 2,
  textAlign: 'left',
  padding: '0.45em 0.9em',
};
const LINE: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 10,
  width: '100%',
};

export function ChaptersScreen({
  chapters,
  done,
  replacesSave,
  onPlay,
}: {
  /** The lesson's chapters, by the id their sentences are found by. */
  chapters: readonly { id: string }[];
  /** How many are done on this device: the most ever, from the start. */
  done: number;
  /** A game is saved, and the lesson's end replaces it. */
  replacesSave: boolean;
  onPlay: (chapter: number) => void;
}): ReactElement {
  const states = chapterStates(chapters.length, done);
  return (
    <div style={PAGE} data-screen="chapters">
      <h1 style={TITLE}>{t('chapters.heading')}</h1>
      <p style={LEAD}>{t('chapters.lead')}</p>
      {chapters.map((ch, c) => {
        const state = states[c] ?? 'locked';
        // The button's own ink, measured with its face, except mint's quieter line, as the
        // difficulty screen draws it.
        const quiet = state === 'done' ? COLOUR.mintInk : undefined;
        return (
          <KitButton
            key={ch.id}
            kind={state === 'done' ? 'go' : state === 'open' ? 'main' : 'rest'}
            unavailable={state === 'locked'}
            style={ROW}
            onPress={() => onPlay(c)}
            data-chapter={ch.id}
            data-chapter-state={state}
          >
            <span style={LINE}>
              <span style={{ ...TYPE.action, fontSize: '0.9375rem', fontWeight: 900, minWidth: 0 }}>
                {t('chapters.numbered', { n: c + 1, name: t(`chapters.${ch.id}.name`) })}
              </span>
              <span
                style={{
                  ...TYPE.body,
                  fontSize: '0.8125rem',
                  fontWeight: 900,
                  color: quiet,
                  flex: '0 0 auto',
                  textAlign: 'right',
                }}
              >
                {state === 'locked'
                  ? t('chapters.locked', { n: c })
                  : t(state === 'done' ? 'chapters.done' : 'chapters.open')}
              </span>
            </span>
            {state === 'open' ? (
              <span style={{ ...TYPE.body, color: quiet }}>{t(`chapters.${ch.id}.about`)}</span>
            ) : null}
          </KitButton>
        );
      })}
      {replacesSave ? (
        <p style={SAY} data-chapters-save="">
          {t('chapters.replacesSave')}
        </p>
      ) : null}
    </div>
  );
}
