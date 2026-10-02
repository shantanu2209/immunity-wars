/**
 * WHAT IS REDRAWN IS DRAWN IN THE KIT'S COLOURS, AND ONLY THOSE (stage L4, docs/LOOK_PLAN.md §14).
 *
 * The kit's colours are few and named, and every pairing of them that carries words or marks a
 * control is held to Gate 1's bound by the kit's own test (`kit/contrast.ts`). A colour written
 * straight into a screen is outside all of that: nothing has measured it against the ground it
 * sits on, and nothing will. That is how the old screens' colours would creep back, one line at a
 * time, each looking harmless.
 *
 * So the files that have been redrawn may name no colour of their own. This reads their source,
 * with the comments taken out, and fails on the first `#rrggbb` it finds, naming the file and the
 * colour. The files not yet redrawn are not in the list; they join it at the stage that redraws
 * them, and the list may only grow.
 *
 * NOT READ: a see-through black or white (`rgba(...)`), which is a shadow or a veil and never the
 * colour of words. And the kit itself, which is where the colours are written down.
 *
 * Control: pnpm ci:selftest play-screen-colours-are-the-kits.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Redrawn at stage L4: the board, the frame, and everything the play screen opens. And at stage L5:
 * the new cards and planning, the two notices, and every screen that is not the play screen.
 */
const REDRAWN = [
  'board/ClayBoard.tsx',
  'play/Frame.tsx',
  'panels/onCard.ts',
  'panels/PieceStrip.tsx',
  'panels/AntibodyPanel.tsx',
  'panels/BodyPanel.tsx',
  'panels/ApTerms.tsx',
  'panels/EffectsStrip.tsx',
  'panels/DockSheet.tsx',
  'panels/InspectSheet.tsx',
  'panels/PathogenCard.tsx',
  'panels/CellCard.tsx',
  'panels/Drawer.tsx',
  'panels/LogPanel.tsx',
  'panels/TableView.tsx',
  'panels/TableMessages.tsx',
  'panels/PauseSheet.tsx',
  'dialogs/DialogQueue.tsx',
  'dialogs/GoalBody.tsx',
  'nav/NavHost.tsx',
  'play/Arrivals.tsx',
  'play/PlanningScreen.tsx',
  'play/AnatomyView.tsx',
  'panels/ConnectionLost.tsx',
  'panels/SaveFailedNotice.tsx',
  'panels/UpdateNow.tsx',
  'screens/chrome.ts',
  'screens/icons.tsx',
  'screens/TitleScreen.tsx',
  'screens/DifficultyScreen.tsx',
  'screens/ResultScreen.tsx',
  'screens/SettingsScreen.tsx',
  'screens/HelpScreen.tsx',
  'screens/LibraryScreen.tsx',
  'screens/AboutScreen.tsx',
  'screens/TogetherScreen.tsx',
  'screens/LobbyScreen.tsx',
  'screens/CrashScreen.tsx',
  // The guided game's light (stage L6).
  'guide/Spotlight.tsx',
];

/**
 * NO EXCEPTION IS LEFT. There was one until stage L5: the frame laid a sheet of the old screens'
 * paper under the two views that were not yet redrawn, and that sheet's two colours were written
 * where the sheet was. Those views are redrawn and the sheet is gone.
 */
const ALLOWED: Record<string, readonly string[]> = {};

const withoutComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const coloursIn = (source: string): string[] =>
  withoutComments(source).match(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b/g) ?? [];

describe('what is redrawn is drawn in the kit’s colours', () => {
  it('no redrawn file names a colour of its own', () => {
    const found = REDRAWN.flatMap((file) =>
      coloursIn(readFileSync(join(SRC, file), 'utf8'))
        .filter((c) => !(ALLOWED[file] ?? []).includes(c))
        .map((c) => `A COLOUR OUTSIDE THE KIT: ${file} names ${c}`),
    );
    expect(found).toEqual([]);
  });

  it('reads every file it lists: one that was not there would be passed for having no colours', () => {
    expect(REDRAWN.length).toBeGreaterThanOrEqual(38);
    for (const file of REDRAWN)
      expect(readFileSync(join(SRC, file), 'utf8').length, file).toBeGreaterThan(200);
  });

  it('CONTROL, must fail: a colour in code is found, in either length', () => {
    expect(coloursIn("const a = { color: '#78665D', border: '1px solid #abc' };")).toEqual([
      '#78665D',
      '#abc',
    ]);
  });

  it('CONTROL, must pass: a colour in a comment, a see-through black, and a kit name are not', () => {
    expect(
      coloursIn(
        "// it was #B03A2E once\n/* and #FFFDF9 */\nconst a = { color: COLOUR.ink, boxShadow: '0 2px 0 rgba(0, 0, 0, 0.4)' };",
      ),
    ).toEqual([]);
  });
});
