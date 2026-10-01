/**
 * THE KIT'S BUTTON. Clay has thickness: the button stands on a darker edge of itself and sinks
 * onto it under a finger, inside a tenth of a second (docs/LOOK_PLAN.md §3, rule 2: every tap
 * answers). Three kinds, and they are real roles, as `screens/chrome.ts` says of its own three:
 *
 *   main   the one thing this screen is for (End turn, New game). Coral. One per screen.
 *   go     what the piece in hand can do now. Mint.
 *   rest   everything else: a way back, an undo, a choice among equals. Cream.
 *
 * A button that cannot be used is drawn pressed flat into the card, with no edge to stand on.
 *
 * It answers the ear and the hand as well: a press plays the kit's `tap` and asks the phone for a
 * short buzz, through the one shared `kitAudio`, so its mute silences every button at once. A
 * button whose press is itself an event with a sound of its own (an engulf, the end of a turn)
 * names that sound, or `null` when the caller plays it.
 *
 * Its word comes from the caller, which takes it from the catalogue; nothing is written here.
 */
import { useState } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { kitAudio, type KitSound } from './sound';
import { COLOUR, DEPTH, MOTION, RADIUS, SHADOW, TOUCH, TYPE } from './tokens';

export type KitButtonKind = 'main' | 'go' | 'rest';

const FACE: Record<KitButtonKind, { top: string; bottom: string; edge: string; ink: string }> = {
  main: { top: COLOUR.coralLit, bottom: COLOUR.coral, edge: COLOUR.coralEdge, ink: COLOUR.ink },
  go: { top: COLOUR.mintLit, bottom: COLOUR.mint, edge: COLOUR.mintEdge, ink: COLOUR.mintInk },
  rest: {
    top: COLOUR.creamSunk,
    bottom: COLOUR.creamSunk,
    edge: COLOUR.creamSunkEdge,
    ink: COLOUR.ink,
  },
};

/** The style a kit button has in each state. Exported so the kit's own test can read its sizes. */
export function kitButtonStyle(
  kind: KitButtonKind,
  state: 'resting' | 'pressed' | 'unavailable',
): CSSProperties {
  const face = FACE[kind];
  const stand = kind === 'main' ? DEPTH.standPrimary : DEPTH.stand;
  const base: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5em',
    width: '100%',
    minHeight: kind === 'main' ? TOUCH.primary : TOUCH.control,
    padding: '0.5em 0.9em',
    border: 0,
    borderRadius: kind === 'main' ? RADIUS.primary : RADIUS.control,
    fontFamily: TYPE.family,
    ...TYPE.action,
    ...(kind === 'main' ? { fontSize: '1.125rem', fontWeight: 900 } : {}),
    cursor: 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    transition: `transform ${MOTION.press.ms}ms ${MOTION.press.curve}, box-shadow ${MOTION.press.ms}ms ${MOTION.press.curve}`,
  };
  if (state === 'unavailable')
    return {
      ...base,
      color: COLOUR.inkSoft,
      background: COLOUR.creamSunk,
      boxShadow: 'inset 0 2px 4px rgba(90, 70, 40, 0.28)',
      transform: `translateY(${stand - DEPTH.pressed}px)`,
      cursor: 'default',
    };
  const down = state === 'pressed' ? stand - DEPTH.pressed : 0;
  return {
    ...base,
    color: face.ink,
    background: `linear-gradient(180deg, ${face.top}, ${face.bottom})`,
    boxShadow: `0 ${stand - down}px 0 ${face.edge}${kind === 'main' ? `, ${SHADOW.cast}` : ''}`,
    transform: `translateY(${down}px)`,
  };
}

export function KitButton({
  kind = 'rest',
  unavailable = false,
  onPress,
  sound = 'tap',
  children,
}: {
  kind?: KitButtonKind;
  /** Drawn flat, and not pressable. The caller says why elsewhere; a dead button explains nothing. */
  unavailable?: boolean;
  onPress?: () => void;
  /** What a press sounds and feels like. `null`: the caller answers for it. */
  sound?: KitSound | null;
  children: ReactNode;
}): ReactElement {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      disabled={unavailable}
      style={kitButtonStyle(kind, unavailable ? 'unavailable' : pressed ? 'pressed' : 'resting')}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={() => {
        if (sound) kitAudio.answer(sound);
        onPress?.();
      }}
    >
      {children}
    </button>
  );
}
