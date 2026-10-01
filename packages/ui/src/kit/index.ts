/**
 * The Clay kit: stage L3 of docs/LOOK_PLAN.md (§13). Named values, the colour pairings and their
 * bounds, the components the new screens are built from at L4 and L5, and how they move, sound
 * and feel. Nothing the app ships today uses it; it is seen on the kit page.
 */
export { COLOUR, DEPTH, MOTION, RADIUS, SHADOW, TOUCH, TYPE } from './tokens';
export { BOUND, PAIRS, contrast, measure, type Bound, type Measured, type Pair } from './contrast';
export { KitButton, kitButtonStyle, type KitButtonKind } from './Button';
export {
  KitCard,
  KitChip,
  KitMeter,
  KitPill,
  KitPips,
  KitRow,
  KitSheet,
  kitCardStyle,
} from './Surface';
export { CLAY_CELLS, KitPiece, type ClayCell, type KitPieceView } from './Piece';
export { KitPieceCard, type KitCardRow } from './PieceCard';
export {
  motionPlan,
  play,
  prefersReducedMotion,
  type KitMotion,
  type MotionArgs,
  type MotionPlan,
} from './motion';
export { BUZZ, KitAudio, SOUNDS, kitAudio, soundLength, type KitSound, type Note } from './sound';
