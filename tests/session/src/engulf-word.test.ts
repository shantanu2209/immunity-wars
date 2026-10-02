/**
 * THE MONOCYTE'S ENGULF IS "CHIP" WHEN IT WOUNDS AND "ENGULF" WHEN IT KILLS (docs/FINDINGS.md #114).
 *
 * Ruled on 6 September 2026: an action row uses the word a player would use for what it does to
 * THIS target, and the Monocyte does not swallow a fungus or a parasite, it wounds them: "Chip".
 * But on the target's last hit point the same action kills it, and the engine's own log says
 * "engulfed". A parasite is offered to the Monocyte only on its last hit point, so for a parasite
 * the row always said Chip and always swallowed. Found on 2 October 2026 when the guided game's
 * sentence, "now it can be swallowed", stood beside a button that said Chip.
 *
 * The positions are DRIVEN, not built by hand: a game is handed what arrives (queue Q13) and the
 * engine is walked to where the Monocyte stands on the thing.
 * Control: pnpm ci:selftest engulf-is-chip-only-when-it-wounds.
 */
import { LESSON } from '@immunity-wars/content';
import { LocalSession, lessonAction, seededDice } from '@immunity-wars/session';
import { offeredActions, t } from '@immunity-wars/ui';
import { describe, expect, it } from 'vitest';

type Inv = { disease: string; hp: number };
const send = async (s: LocalSession, action: Record<string, unknown>): Promise<void> => {
  expect((await s.sendAction(action)).ok, JSON.stringify(action)).toBe(true);
};
/** The word on the Monocyte's engulf row for a disease, with the Monocyte in hand. */
function engulfWord(s: LocalSession, disease: string): string | undefined {
  s.setSelection({ cell: 'macrophage', family: null, resident: null });
  const offer = offeredActions(s.getView()).board.find(
    (o) => o.action === 'engulf' && o.target === disease,
  );
  return offer && 'verb' in offer ? (offer.verb ?? undefined) : undefined;
}
const hpOf = (s: LocalSession, disease: string): number | undefined =>
  (s.getView().game['invaders'] as Inv[]).find((x) => x.disease === disease)?.hp;

describe('the word on the Monocyte’s engulf', () => {
  it('a fungus with two hit points is chipped, and on its last is engulfed', async () => {
    const s = LocalSession.createGame(
      { difficulty: 'training', written: [['Candida'], []] },
      { rails: { dice: seededDice(1) } },
    );
    await send(s, { action: 'draw' });
    await send(s, { action: 'beginCommand' });
    for (const step of [1, 2, 3, 4])
      await send(s, { action: 'move', cell: 'macrophage', zone: 'route', lane: 'gut', step });
    await send(s, { action: 'endCommand' });
    await send(s, { action: 'draw' });
    await send(s, { action: 'beginCommand' });
    // The fungus has walked onto the Monocyte, whole.
    expect(hpOf(s, 'Candida')).toBe(2);
    expect(engulfWord(s, 'Candida')).toBe(t('action.chip'));
    const id = (s.getView().game['invaders'] as { id: string; disease: string }[]).find(
      (x) => x.disease === 'Candida',
    )?.id;
    await send(s, { action: 'engulf', cell: 'macrophage', invaderId: id });
    expect(hpOf(s, 'Candida')).toBe(1);
    expect(engulfWord(s, 'Candida'), 'THE ROW SAYS CHIP FOR A KILL').toBe(t('action.engulf'));
    // And the engine agrees it is a kill: the fungus is gone after it.
    await send(s, { action: 'engulf', cell: 'macrophage', invaderId: id });
    expect(hpOf(s, 'Candida')).toBeUndefined();
    s.dispose();
  });

  it('a parasite, which the Monocyte is only ever offered on its last hit point, is engulfed', async () => {
    // The lesson itself reaches it: on turn 5 the Monocyte has struck the Amoebiasis down to one.
    const s = LocalSession.createGame(
      { difficulty: LESSON.difficulty, written: LESSON.turns.map((turn) => turn.arrive) },
      { rails: { dice: seededDice(LESSON.seed) } },
    );
    for (const turn of LESSON.turns.slice(0, 5)) {
      await send(s, { action: 'draw' });
      await send(s, { action: 'beginCommand' });
      for (const step of turn.steps) {
        if (step.do === 'tell') continue;
        if (step.id === 't5.engulf') {
          expect(hpOf(s, 'Amoebiasis')).toBe(1);
          expect(engulfWord(s, 'Amoebiasis'), 'THE ROW SAYS CHIP FOR A KILL').toBe(
            t('action.engulf'),
          );
          s.dispose();
          return;
        }
        const action = lessonAction(step, s.getView().game);
        if (!action) throw new Error(`${step.id} names what is not in the body`);
        await send(s, action);
      }
      await send(s, { action: 'endCommand' });
    }
    throw new Error('the lesson never reached its engulf of the parasite: this test read nothing');
  });
});
