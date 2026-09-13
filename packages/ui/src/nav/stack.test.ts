/**
 * The navigation stack, held to ruling 9 of docs/for-P2.7.md §9 on the seven paths §9 read from
 * the code, BOTH WAYS (CLAUDE.md): every close lands on the level before it, and a planted defect,
 * a close that pops two levels, is caught by exactly the same assertions.
 */
import { describe, expect, it } from 'vitest';

import {
  closeLabel,
  closeLayer,
  currentScreen,
  depthOf,
  openLayer,
  popTop,
  pushScreen,
  replaceScreen,
  stackOf,
  topEntry,
  type NavStack,
} from './stack';

type Screen =
  | 'title'
  | 'play'
  | 'help:index'
  | 'help:s5'
  | 'help:s6'
  | 'library:index'
  | 'library:card'
  | 'library:why'
  | 'settings';

const isMain = (s: Screen): boolean => s === 'title' || s === 'play';

/** Where a close lands, named the way §9's table names it: the top layer's id, or the screen. */
const landing = (s: NavStack<Screen>): string => {
  const t = topEntry(s);
  return t?.kind === 'layer' ? t.id : currentScreen(s);
};

/** The planted defect for the controls: a close that pops two levels instead of one. */
const popTwo = (s: NavStack<Screen>): NavStack<Screen> => popTop(popTop(s));

interface Path {
  name: string;
  build: () => NavStack<Screen>;
  /** Where one close must land. */
  lands: string;
}

const PATHS: readonly Path[] = [
  {
    name: 'inspect sheet → pathogen card',
    build: () => openLayer(openLayer(stackOf<Screen>('play'), 'inspect', true), 'card', true),
    lands: 'inspect',
  },
  {
    name: 'inspect sheet → cell card',
    build: () => openLayer(openLayer(stackOf<Screen>('play'), 'inspect', true), 'cell-card', true),
    lands: 'inspect',
  },
  {
    name: 'planning → pathogen card',
    build: () => openLayer(stackOf<Screen>('play'), 'card', true),
    lands: 'play',
  },
  {
    name: 'library card → why it works this way',
    build: () =>
      pushScreen(
        pushScreen(pushScreen(stackOf<Screen>('title'), 'library:index'), 'library:card'),
        'library:why',
      ),
    lands: 'library:card',
  },
  {
    name: 'Help section → why link → library page',
    build: () =>
      pushScreen(
        pushScreen(pushScreen(stackOf<Screen>('title'), 'help:index'), 'help:s5'),
        'library:why',
      ),
    lands: 'help:s5',
  },
  {
    name: 'library why page → In How to play → Help',
    build: () =>
      pushScreen(
        pushScreen(pushScreen(stackOf<Screen>('title'), 'library:index'), 'library:why'),
        'help:s5',
      ),
    lands: 'library:why',
  },
  {
    name: 'pause menu → Settings',
    build: () => pushScreen(openLayer(stackOf<Screen>('play'), 'pause', true), 'settings'),
    lands: 'pause',
  },
];

describe('ruling 9 on the seven paths of §9', () => {
  for (const p of PATHS) {
    it(`PASSES: ${p.name}, one close lands on the level before`, () => {
      expect(landing(popTop(p.build()))).toBe(p.lands);
    });
  }

  it('CONTROL: a close that pops two levels is caught on every path deep enough to tell', () => {
    const deep = PATHS.filter((p) => depthOf(p.build()) >= 2);
    const caught = deep.filter((p) => landing(popTwo(p.build())) !== p.lands);
    expect(caught.map((p) => p.name)).toEqual(deep.map((p) => p.name));
    // Guards the filter against emptying itself: six of the seven are deep enough.
    expect(deep.length).toBe(PATHS.length - 1);
  });

  // THE ONE PATH THAT CANNOT TELL, found by the control above on its first run (13 September
  // 2026), when it was written to expect every path to catch a pop-two. Planning → pathogen card
  // is one level above the base, and the base is never popped, so a close that pops two levels
  // lands exactly where a correct close does. On that path the defect is invisible by
  // construction, not by luck. It is pinned rather than dropped, so that the day the base becomes
  // poppable this assertion changes and says so.
  it('BLIND SPOT, pinned: one level above the base, popping two lands where popping one does', () => {
    const shallow = PATHS.filter((p) => depthOf(p.build()) < 2);
    expect(shallow.map((p) => p.name)).toEqual(['planning → pathogen card']);
    for (const p of shallow) expect(landing(popTwo(p.build()))).toBe(landing(popTop(p.build())));
  });
});

describe('the label on the floating button', () => {
  it('shows nothing at the base, where there is nothing to close', () => {
    expect(closeLabel(stackOf<Screen>('title'), isMain)).toBeNull();
    expect(closeLabel(stackOf<Screen>('play'), isMain)).toBeNull();
  });

  it('says Close when closing returns to a main screen', () => {
    expect(closeLabel(pushScreen(stackOf<Screen>('title'), 'help:index'), isMain)).toBe('close');
    expect(closeLabel(openLayer(stackOf<Screen>('play'), 'inspect', true), isMain)).toBe('close');
  });

  it('says Back when closing returns to a previous level', () => {
    const helpSection = pushScreen(pushScreen(stackOf<Screen>('title'), 'help:index'), 'help:s5');
    expect(closeLabel(helpSection, isMain)).toBe('back');
    const cardOverSheet = openLayer(
      openLayer(stackOf<Screen>('play'), 'inspect', true),
      'card',
      true,
    );
    expect(closeLabel(cardOverSheet, isMain)).toBe('back');
    const settingsOverPause = pushScreen(
      openLayer(stackOf<Screen>('play'), 'pause', true),
      'settings',
    );
    expect(closeLabel(settingsOverPause, isMain)).toBe('back');
  });

  it('shows nothing while a dialog is on top: a dialog is acknowledged by its own button', () => {
    expect(
      closeLabel(openLayer(stackOf<Screen>('play'), 'dialog:reveal', false), isMain),
    ).toBeNull();
  });
});

describe('siblings are not levels', () => {
  it("Help's Next replaces the section, so one close goes to the index, not the previous section", () => {
    const s5 = pushScreen(pushScreen(stackOf<Screen>('title'), 'help:index'), 'help:s5');
    const s6 = replaceScreen(s5, 'help:s6');
    expect(depthOf(s6)).toBe(depthOf(s5));
    expect(currentScreen(s6)).toBe('help:s6');
    expect(currentScreen(popTop(s6))).toBe('help:index');
  });

  it('CONTROL: pushing the sibling instead would land on the previous section, and is caught', () => {
    const s5 = pushScreen(pushScreen(stackOf<Screen>('title'), 'help:index'), 'help:s5');
    expect(currentScreen(popTop(pushScreen(s5, 'help:s6')))).not.toBe('help:index');
  });
});

describe('layers', () => {
  it('opening a layer already open changes nothing', () => {
    const once = openLayer(stackOf<Screen>('play'), 'inspect', true);
    expect(openLayer(once, 'inspect', true)).toBe(once);
  });

  it('a layer hidden from under a screen is removed without disturbing the screen above it', () => {
    const s = closeLayer(
      pushScreen(openLayer(stackOf<Screen>('play'), 'pause', true), 'settings'),
      'pause',
    );
    expect(s.entries.map((e) => (e.kind === 'layer' ? e.id : e.screen))).toEqual([
      'play',
      'settings',
    ]);
  });

  it('the base is never closed', () => {
    const base = stackOf<Screen>('play');
    expect(popTop(base)).toBe(base);
  });
});
