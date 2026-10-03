/**
 * @immunity-wars/ui
 *
 * React components. First real occupant: the board, laid out at render time from
 * `geometry.json` through content's validated loader, taking a plain `ViewState` so the same
 * component renders authoritative views and burst frames alike. Since stage L4 of the look it is
 * drawn in Clay, as pictures on the page (`board/ClayBoard.tsx`).
 */

export const PACKAGE_NAME = '@immunity-wars/ui';

export { ClayBoard } from './board/ClayBoard';
export {
  buildNodeModel,
  type InspectInfo,
  type InspectInvader,
  type DisplayToken,
  type Unavailable,
  type ReadyTurn,
} from './board/Board';
export { InspectSheet } from './panels/InspectSheet';
export { PieceStrip, type PieceChip } from './panels/PieceStrip';
export {
  actionRows,
  dockRows,
  ACTION_CATALOGUE,
  DOCK_OMITS,
  DOCK_ROW_SLOTS,
  MOVE_LIKE,
  type ActionRow,
  type DockRow,
} from './play/offered';
export { shouldDraw, type DrawMoment } from './play/autoDraw';
export { EVERY_SEAT, type SeatRule } from './play/offered';
export {
  ALONE,
  addPoint,
  allocationActions,
  budgetsOf,
  drawersFor,
  perspectiveOf,
  poolLeft,
  removePoint,
  seenBy,
  tableChanges,
  tableSummary,
  type Budgets,
  type Draft,
  type Perspective,
  type Table,
} from './play/table';
export {
  ActionsView,
  AdvanceButton,
  PlayArea,
  SpreadView,
  TabRow,
  Toast,
  TopBar,
  type ActionsUndo,
  type Banner,
  type MiddleTab,
} from './play/Frame';
export { ChatIcon, MenuIcon } from './panels/BarIcons';
export { DockSheet, TargetList } from './panels/DockSheet';
export { Drawer, type DrawerKind } from './panels/Drawer';
export {
  effectBanner,
  effectChips,
  turnLine,
  turnShort,
  logLinesOf,
  apTermLines,
  type EffectChip,
} from './play/effects';
export { ArrivalsGrid, ArrivalsNotes } from './play/Arrivals';
export { revealCrisis, type RevealArrival, type RevealCrisis } from './dialogs/RevealBody';
export { EffectsStrip } from './panels/EffectsStrip';
export { PathogenCard, type PathogenCardSubject } from './panels/PathogenCard';
export { CellCard, type CellCardSubject } from './panels/CellCard';
export {
  AllocationBlock,
  PathogenList,
  PlanningScreen,
  spentCellsLine,
  type PlanningCell,
} from './play/PlanningScreen';
export {
  planningModel,
  depthOf,
  whereText,
  type PlanningModel,
  type PlanningGroup,
  type Depth,
} from './play/planning';
export { invaderNowLine } from './panels/invaderNow';
export { PauseSheet } from './panels/PauseSheet';
export { UpdateDot } from './panels/UpdateNow';
export { PlayScreen, type PlaySessionLike, type PlayControlsCtx } from './play/PlayScreen';
export { TitleScreen, type SaveSummary } from './screens/TitleScreen';
export { DifficultyScreen } from './screens/DifficultyScreen';
export {
  ANTIVENOM_AT_START,
  DIFFICULTIES,
  DIVIDES_ON,
  DIVIDES_TWICE_ON,
  LYMPH_SPREADS_ON,
  MEMORY_FROM,
  ORGAN_HEALS,
  PATHOGEN_X_IN_TEN,
  PRACTICE_ADDS,
  PRESENTATION_RAISES,
  WORM_START,
  cardsATurn,
  differenceRows,
  differenceSummary,
  type DifferenceId,
  type DifferenceRow,
  type DifficultyKey,
  type MemoryFrom,
  type WormStart,
} from './screens/difficultyFacts';
export { TogetherScreen } from './screens/TogetherScreen';
export { LobbyScreen } from './screens/LobbyScreen';
export { ConnectionLost } from './panels/ConnectionLost';
export { entryRefusal, refusalFromClose, refusalText, type LobbyRoom } from './together/model';
export { SettingsScreen, type DeleteSaveBlock, type ChoiceRow } from './screens/SettingsScreen';
export { HelpScreen, HELP_SECTION_KEYS, type HelpSectionKey } from './screens/HelpScreen';
export { AboutScreen } from './screens/AboutScreen';
export { CrashScreen, type CrashCase } from './screens/CrashScreen';
export { ErrorBoundary, CrashForTesting, type CrashDetail } from './screens/ErrorBoundary';
export { SaveFailedNotice } from './panels/SaveFailedNotice';
export {
  FLOAT_RESERVE,
  FloatingClose,
  NavHost,
  useNav,
  useNavLayer,
  useNavLayerWith,
  useNavState,
  type NavState,
  type Nav,
  type NavLayerApi,
} from './nav/NavHost';
export { type CloseLabel } from './nav/stack';
export {
  LibraryScreen,
  libraryType,
  whyForDisease,
  type LibraryView,
} from './screens/LibraryScreen';
export { ResultScreen, type ResultStats } from './screens/ResultScreen';
export { cellDisplayName, typeDisplayName, residentDisplayName, organDisplayName } from './names';
export { t } from './i18n';
export * as boardGeometry from './board/geometry';
export {
  offeredActions,
  bodyOffers,
  type Offered,
  type BoardOffer,
  type ButtonOffer,
} from './play/offered';
export { producibleFamilies, produceFor, produceOffers } from './play/offered';
export { AntibodyPanel, type FamilyRow, type FamilyDetail } from './panels/AntibodyPanel';
export {
  BodyPanel,
  type BodyPanelData,
  type VaccineRow,
  type PanelButton,
} from './panels/BodyPanel';
export { diseaseLabel, CLONE_TARGET } from './play/offered';
export { LogPanel, RichText, type LogLine } from './panels/LogPanel';
export { engineText, engineLogText, type LogText } from './engineText';
// THE GUIDED GAME (stage L6): the rules of where a player is in the lesson, for the tests that hold
// them to the engine. The light itself is the play screen's own, and is not offered here.
export {
  GUIDE_START,
  afterAccepted,
  afterTold,
  guideBeat,
  lessonOver,
  progress as guideProgress,
  sameAction,
  stepAt,
  stopsFor,
  type GuideBeat,
  type GuideMove,
  type GuidePos,
  type GuideStage,
} from './guide/model';

// THE CLAY KIT (stage L3, docs/LOOK_PLAN.md §13) is NOT exported from here. It has its own entry,
// `@immunity-wars/ui/kit`, so that only the kit page pulls it in: exported from this file it rode
// along in the chunk every player downloads (measured in the first build: the shared chunk carried
// the kit's colours). It joins this file when the screens are built from it, at L4.
