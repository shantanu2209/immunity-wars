/**
 * RESULT — a screen, not a dialog (docs/APP_FLOW.md ruling 7): it ends the session cleanly
 * before navigation. States: win / loss (loss names the organ that fell). The shell clears
 * the autosave before showing this screen, so Continue never offers a finished game.
 *
 * DRAWN IN CLAY (stage L5): the verdict on the table, in mint for a win and coral for a loss, the
 * three figures on a card, and the ways on below. The colour repeats the words; the words say it.
 *
 * AFTER A GAME ON EASY (stage L6, ruled 2 October 2026) a card says that Normal and Hard ask more,
 * in two sentences, with the rest one tap away (`DifferencesCard.tsx`). The guided game ends as a
 * game on Easy, so this is where its player is told; it is said after every game on Easy, because
 * a player who skipped the lesson has not been told either.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';

import { t } from '../i18n';
import { KitButton } from '../kit/Button';
import { COLOUR, TYPE } from '../kit/tokens';
import { LogPanel, type LogLine } from '../panels/LogPanel';

import { BODY, CARD, LEAD, PAGE, SECTION, STACK } from './chrome';
import { DifferencesCard } from './DifferencesCard';
import { differenceSummary } from './difficultyFacts';
import { ScreenIcon } from './icons';

export interface ResultStats {
  turns: number;
  organsDamaged: number;
  antibodiesMade: number;
}

const FIGURE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 12,
  padding: '0.3em 0',
  ...TYPE.body,
  color: COLOUR.ink,
};

export function ResultScreen({
  won,
  lossOrgan,
  stats,
  difficulty = null,
  log = [],
  onPlayAgain,
  onChangeDifficulty,
  onTitle,
  onTogether = null,
  rematch = null,
}: {
  won: boolean;
  /** Display name of the organ that fell; null on a win or a non-organ loss. */
  lossOrgan: string | null;
  stats: ResultStats;
  /** The difficulty the game was played on. On Easy the result says what the others change. */
  difficulty?: string | null;
  /**
   * The finished game's log (§21 H): a player who has just lost asks what happened, and Messages
   * lived inside the play frame, which is gone by the time they can ask.
   */
  log?: readonly LogLine[];
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
  onTitle: () => void;
  /**
   * AFTER A GAME PLAYED TOGETHER (P3.7 piece D): another game together, from the way in. Play again
   * and Change difficulty both start a game alone, so they are not offered; the room has ended with
   * its game, so a new one is made and its code shared. Null alone.
   */
  onTogether?: (() => void) | null;
  /**
   * ANOTHER GAME IN THE SAME ROOM (protocol v5, ruled 25 and 30 September 2026), while the room is
   * still here: the captain's to start (`mine`), and everyone else is told they are waiting for it.
   * Null alone, and once the room is out of reach.
   */
  rematch?: { mine: boolean; onRematch: () => void } | null;
}): ReactElement {
  const [showLog, setShowLog] = useState(false);
  const figure = (label: string, value: number): ReactElement => (
    <div style={FIGURE}>
      <span>{label}</span>
      <span style={{ ...TYPE.heading }}>{value}</span>
    </div>
  );
  // One main button: the next game, whichever kind this one was.
  const rematchMine = rematch !== null && rematch.mine;
  return (
    <div style={{ ...PAGE, paddingTop: 36, textAlign: 'center' }}>
      <h1
        data-result-verdict={won ? 'win' : 'loss'}
        style={{
          ...TYPE.display,
          fontSize: '2rem',
          margin: 0,
          color: won ? COLOUR.mint : COLOUR.coralLit,
        }}
      >
        {won ? t('result.win') : t('result.loss')}
      </h1>
      {!won && lossOrgan !== null ? (
        <p style={{ ...LEAD, color: COLOUR.onDark, margin: '8px 0 0' }}>
          {t('result.lossOrgan')} <span style={{ fontWeight: 900 }}>{lossOrgan}</span>
        </p>
      ) : null}
      <div style={{ ...CARD, textAlign: 'left', marginTop: 18 }}>
        {figure(t('result.turns'), stats.turns)}
        {figure(t('result.organsDamaged'), stats.organsDamaged)}
        {figure(t('result.antibodies'), stats.antibodiesMade)}
      </div>
      {difficulty === 'training' ? (
        <>
          <div data-result-differences="" style={{ ...CARD, textAlign: 'left' }}>
            <h2 style={SECTION}>
              {t('differences.resultTitle', { name: t('difficulty.training') })}
            </h2>
            <p style={{ ...BODY, marginBottom: 0 }}>
              {t('differences.resultLead', differenceSummary())}
            </p>
          </div>
          <DifferencesCard toggleKey="differences.resultToggle" />
        </>
      ) : null}
      {log.length > 0 ? (
        <>
          <KitButton
            style={{ ...STACK, marginTop: 18 }}
            data-result-log={showLog ? 'open' : 'closed'}
            aria-expanded={showLog}
            onPress={() => setShowLog((v) => !v)}
          >
            {showLog ? t('result.hideLog') : t('result.showLog')}
          </KitButton>
          {showLog ? (
            <div
              style={{
                ...CARD,
                textAlign: 'left',
                maxHeight: '40dvh',
                overflowY: 'auto',
              }}
            >
              <LogPanel lines={log} titled={false} />
            </div>
          ) : null}
        </>
      ) : null}
      {rematch !== null ? (
        rematch.mine ? (
          <KitButton kind="main" style={STACK} onPress={rematch.onRematch} data-result="rematch">
            <ScreenIcon kind="again" />
            {t('result.rematch')}
          </KitButton>
        ) : (
          <p style={{ ...BODY, color: COLOUR.onDark, marginTop: 14 }} data-result="rematch-waiting">
            {t('result.rematchWaiting')}
          </p>
        )
      ) : null}
      {onTogether !== null ? (
        <KitButton
          kind={rematch === null ? 'main' : 'rest'}
          style={STACK}
          onPress={onTogether}
          data-result="together"
        >
          {t('result.playTogether')}
        </KitButton>
      ) : (
        <>
          <KitButton
            kind={rematchMine ? 'rest' : 'main'}
            style={STACK}
            onPress={onPlayAgain}
            data-result="again"
          >
            <ScreenIcon kind="again" />
            {t('result.playAgain')}
          </KitButton>
          <KitButton style={STACK} onPress={onChangeDifficulty}>
            {t('result.changeDifficulty')}
          </KitButton>
        </>
      )}
      <KitButton style={STACK} onPress={onTitle}>
        <ScreenIcon kind="home" />
        {t('result.title')}
      </KitButton>
    </div>
  );
}
