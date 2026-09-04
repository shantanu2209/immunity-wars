/**
 * @immunity-wars/ui
 *
 * React components. First real occupant: the P2.2 board — an SVG derived at render time from
 * `geometry.json` through content's validated loader, taking a plain `ViewState` so the same
 * component renders authoritative views and burst frames alike.
 */

export const PACKAGE_NAME = '@immunity-wars/ui';

export { Board, type ArtMetrics, type InspectInfo, type InspectInvader } from './board/Board';
export { InspectSheet } from './panels/InspectSheet';
export { CommandBar, type BarButton } from './panels/CommandBar';
export { PauseSheet } from './panels/PauseSheet';
export { PlayScreen, type PlaySessionLike, type PlayControlsCtx } from './play/PlayScreen';
export { TitleScreen, type SaveSummary } from './screens/TitleScreen';
export { DifficultyScreen } from './screens/DifficultyScreen';
export { ResultScreen, type ResultStats } from './screens/ResultScreen';
export { cellDisplayName, typeDisplayName } from './names';
export { t } from './i18n';
export * as boardGeometry from './board/geometry';
export {
  offeredActions,
  bodyOffers,
  type Offered,
  type BoardOffer,
  type ButtonOffer,
} from './play/offered';
export { producibleFamilies, NEUTRALISE_TOXIN_AP } from './play/offered';
export { AntibodyPanel, type FamilyRow, type FamilyDetail } from './panels/AntibodyPanel';
