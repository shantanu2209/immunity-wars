/**
 * DIFFICULTY SELECT (docs/APP_FLOW.md §4). Choose first; when a save exists, the
 * overwrite confirm appears AFTER the choice and BEFORE the old game is destroyed.
 * Phase 3's mode select inserts between Title and this screen.
 *
 * DRAWN IN CLAY (stage L5): three rows on the table, each a resting button with its name and what
 * it is. On a device that has never started a game the one recommended is mint, the kit's colour
 * for what is allowed, and says in words that it is recommended: the colour repeats the words and
 * does not replace them.
 *
 * WHAT CHANGES BETWEEN THEM (stage L6, ruled 2 October 2026) is one tap away, under the three rows:
 * `DifferencesCard.tsx`. The rows are for choosing, and a newcomer chooses by them.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { COLOUR, TYPE } from '../kit/tokens';
import { useNavLayer } from '../nav/NavHost';

import { BODY, DIALOG, LEAD, PAGE, SCRIM, STACK, TITLE } from './chrome';
import { DifferencesCard } from './DifferencesCard';

/** A row of three lines: the name, a note, what it is. */
const CHOICE: CSSProperties = {
  ...STACK,
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  textAlign: 'left',
  padding: '0.7em 1em',
};

const DIFFS = ['training', 'normal', 'hard'] as const;

export function DifficultyScreen({
  hasSave,
  firstGame = true,
  onStart,
}: {
  /** When true, picking a difficulty asks before replacing the saved game. */
  hasSave: boolean;
  /**
   * True until this device has started a game (item 8, 19 September 2026). The recommendation is
   * guidance for a newcomer; a returning player has already answered the question it answers, and
   * the screen is under test for whether a newcomer can choose unaided (NEWCOMER_TEST.md), which
   * is a question about the first time only.
   */
  firstGame?: boolean;
  onStart: (difficulty: string) => void;
}): ReactElement {
  const [pendingDiff, setPendingDiff] = useState<string | null>(null);
  // The overwrite confirm is a dialog on the navigation stack: the back gesture cancels it.
  useNavLayer('difficulty-confirm', pendingDiff !== null, () => setPendingDiff(null), false);

  const pick = (d: string): void => {
    if (hasSave) setPendingDiff(d);
    else onStart(d);
  };

  return (
    <div style={PAGE}>
      <h1 style={TITLE}>{t('difficulty.heading')}</h1>
      {/*
        THE GOAL, said once before the game starts (Shantanu's ruling, 9 September 2026).
        Ruled here rather than as a first-encounter hint, and the distinction is the point: this
        fires on SIGHT and is read once by everyone, so it is screen copy. Calling it a hint
        would have been the exception to "first contact" that the hint rule exists to avoid.
        It is here because a hint could not do this job: the effects strip already says the same
        thing, but only once the window has closed, and the windows are 15, 20 and 30 turns, so
        a newcomer who loses on turn 8 was never told at all. This is the moment the
        misconception forms, which is earlier than any contact.
      */}
      <p style={LEAD}>{t('difficulty.goal')}</p>
      {DIFFS.map((d) => {
        const recommended = d === 'training' && firstGame;
        const quiet = recommended ? COLOUR.mintInk : COLOUR.inkSoft;
        return (
          <KitButton
            key={d}
            kind={recommended ? 'go' : 'rest'}
            style={CHOICE}
            onPress={() => pick(d)}
            data-new-game={d}
          >
            <span style={{ ...TYPE.action, fontSize: '1.0625rem', fontWeight: 900 }}>
              {t(`difficulty.${d}`)}
            </span>
            {recommended ? (
              // The interface carries the first-game guidance, not the newcomer-test script —
              // Shantanu's ruling, 30 Aug 2026 (docs/NEWCOMER_TEST.md): whether a newcomer can
              // tell where to start is part of what the test measures.
              <span style={{ ...TYPE.body, fontWeight: 900 }}>
                {t('difficulty.trainingRecommended')}
              </span>
            ) : null}
            <span style={{ ...TYPE.body, color: quiet }}>{t(`difficulty.${d}Desc`)}</span>
          </KitButton>
        );
      })}
      <DifferencesCard toggleKey="differences.toggle" marginTop={6} />
      {pendingDiff !== null ? (
        <div style={SCRIM}>
          <div style={DIALOG}>
            <p style={{ ...BODY, marginTop: 0 }}>{t('difficulty.overwriteWarning')}</p>
            <KitButton kind="main" style={STACK} onPress={() => onStart(pendingDiff)}>
              {t('difficulty.overwriteConfirm')}
            </KitButton>
            <KitButton style={STACK} onPress={() => setPendingDiff(null)}>
              {t('difficulty.overwriteCancel')}
            </KitButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
