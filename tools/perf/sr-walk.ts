/**
 * THE SCREEN READER'S WALK (screen reader support, ruled 25 November 2026; docs/LOOK_PLAN.md §34
 * and §36).
 *
 *   pnpm sr:walk            against http://localhost:4173 (a preview of the build)
 *   pnpm sr:walk --build    build the app into a temporary folder, serve it, walk it:
 *                           what the self-test's controls run
 *
 * A player who cannot see the screen is read it by TalkBack or VoiceOver. What they are read is
 * not the picture: it is the browser's ACCESSIBILITY TREE, the list of things on the page with a
 * role and a name each. This walk opens the built app and goes through it by that tree alone. It
 * finds each thing by the role and the name Chrome gives it, and presses it as a screen reader
 * does, by the element and not by a place on the screen.
 *
 * WHAT IT HOLDS, so far (the first of the three parts §36 lists):
 *
 *  - the page says its language, which is how a screen reader picks its voice;
 *  - A LAYER THAT COVERS THE SCREEN IS ALL THERE IS: with a pathogen's card, the game's menu or the
 *    messages open (and the opening dialog until Gate 2's polish, piece 3, put the goal on turn 1), the tree holds a dialog with a name, focus is in it,
 *    and nothing behind it is read: no button, no picture, no word. The one close that floats over
 *    every layer is kept, and is pressed here to close the card and the messages. When the layer
 *    goes, what was behind it is read again;
 *  - the turn is said in words ("Turn 1 of 15"), and its figure ("1/15") is not read;
 *  - the goal is read on turn 1's card;
 *  - alone, the new cards' button goes straight to the command stage, and the Body tile draws the
 *    body, its organs read by name (Gate 2's polish, piece 3);
 *  - a new card is named by what it shows: its disease, its class by its name, and its way in.
 *
 * WHAT IT DOES NOT HOLD: that the names are good ones, that things are read in a sensible order,
 * or how any of it sounds. Those need a person with TalkBack, and nobody has done that yet. It is
 * Chrome's tree on a PC, not Android's screen reader; and it does not play a turn, which waits for
 * the board to be offered as a list.
 *
 * Controls: pnpm ci:selftest sr-walk-a-layer-hides-what-is-behind, sr-walk-focus-goes-to-the-layer,
 * sr-walk-the-turn-is-said-in-words, sr-walk-a-new-card-says-what-it-shows,
 * sr-walk-the-goal-is-on-turn-1, sr-walk-planning-is-folded-alone, sr-walk-the-body-tile-draws-the-body.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FAMILIES, ORGANS, UI_I18N_EN } from '@immunity-wars/content';
import puppeteer, { type CDPSession, type Page } from 'puppeteer-core';

const CHROME =
  process.env['CHROME_PATH'] ?? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

class Refusal extends Error {}
function refuse(reason: string): never {
  throw new Refusal(reason);
}
const say = (key: string): string => (UI_I18N_EN as Record<string, string>)[key] ?? '';
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** One thing in the tree, as a screen reader is told of it. */
interface Told {
  id: string;
  role: string;
  name: string;
  /** The element it is, by the browser's own number: how it is pressed. */
  backend: number | null;
  /** True of a dialog that says nothing else is to be read while it is up. */
  modal: boolean;
  parent: string | null;
}

/** What is read: these roles and the words on the page. Everything else is structure. */
const READ = new Set([
  'button',
  'link',
  'textbox',
  'combobox',
  'checkbox',
  'radio',
  'switch',
  'slider',
  'tab',
  'image',
  'heading',
  'StaticText',
]);

async function told(cdp: CDPSession): Promise<Map<string, Told>> {
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const out = new Map<string, Told>();
  const parentOf = new Map<string, string>();
  for (const n of nodes) for (const child of n.childIds ?? []) parentOf.set(child, n.nodeId);
  for (const n of nodes) {
    if (n.ignored) continue;
    out.set(n.nodeId, {
      id: n.nodeId,
      role: String((n.role?.value as string | undefined) ?? ''),
      name: String((n.name?.value as string | undefined) ?? '').trim(),
      backend: n.backendDOMNodeId ?? null,
      modal: (n.properties ?? []).some((p) => p.name === 'modal' && p.value.value === true),
      parent: parentOf.get(n.nodeId) ?? null,
    });
  }
  // A thing's parent may be a node the tree ignores: go up to the nearest one that is told.
  const all = new Map(nodes.map((n) => [n.nodeId, n]));
  for (const t of out.values()) {
    let p = t.parent;
    while (p !== null && !out.has(p) && all.has(p)) p = parentOf.get(p) ?? null;
    t.parent = p !== null && out.has(p) ? p : null;
  }
  return out;
}

const under = (tree: Map<string, Told>, node: Told, tops: Set<string>): boolean => {
  let at: Told | undefined = node;
  while (at) {
    if (tops.has(at.id)) return true;
    at = at.parent !== null ? tree.get(at.parent) : undefined;
  }
  return false;
};

async function has(cdp: CDPSession, node: Told, attribute: string): Promise<boolean> {
  if (node.backend === null) return false;
  const d = await cdp.send('DOM.describeNode', { backendNodeId: node.backend }).catch(() => null);
  return (d?.node.attributes ?? []).some((a, i) => i % 2 === 0 && a === attribute);
}

/** Pressed as a screen reader presses: the element itself, not a place on the screen. */
async function press(cdp: CDPSession, node: Told): Promise<void> {
  if (node.backend === null) refuse(`"${node.name}" is in the tree and is no element to press`);
  const { object } = await cdp.send('DOM.resolveNode', { backendNodeId: node.backend });
  if (object.objectId === undefined) refuse(`"${node.name}" could not be reached to press`);
  await cdp.send('Runtime.callFunctionOn', {
    objectId: object.objectId,
    functionDeclaration: 'function () { this.click(); }',
  });
}

async function until<T>(what: string, look: () => Promise<T | null>): Promise<T> {
  for (let i = 0; i < 40; i += 1) {
    const got = await look();
    if (got !== null) return got;
    await wait(150);
  }
  return refuse(what);
}

const button = (tree: Map<string, Told>, name: (n: string) => boolean): Told | null =>
  [...tree.values()].find((t) => t.role === 'button' && name(t.name)) ?? null;

/**
 * A layer is up and is all there is: a dialog of this name that says it is modal, focus in it, and
 * nothing read that is not in it or kept beside it. Returns what was read, for the walk's line.
 *
 * THE TREE IS GIVEN A MOMENT TO SETTLE. Chrome brings its accessibility tree up to date a little
 * after the page changes, and a screen reader is told of the change then. Read in the instant a
 * dialog appeared, the tree still held everything behind it, on one build and not on another, by
 * how fast each was served. So it is read again for up to two seconds, and what is refused is what
 * is still wrong at the end of them.
 */
async function layerIsAll(
  page: Page,
  cdp: CDPSession,
  name: string | null,
): Promise<{ name: string; inside: number; kept: string[] }> {
  await until(`no dialog ${name ?? ''} came up in the tree`, async () => {
    const t = await told(cdp);
    return [...t.values()].some((n) => n.role === 'dialog' && (name === null || n.name === name))
      ? true
      : null;
  });
  let wrong = '';
  for (let look = 0; look < 14; look += 1) {
    const tree = await told(cdp);
    const dialog = [...tree.values()].find(
      (n) => n.role === 'dialog' && (name === null || n.name === name),
    );
    if (!dialog) {
      wrong = `the dialog ${name ?? ''} came up and went`;
      await wait(150);
      continue;
    }
    if (dialog.name === '')
      refuse('A LAYER HAS NO NAME: a screen reader says "dialog" and no more');
    if (!dialog.modal)
      refuse(`A LAYER DOES NOT SAY IT IS ALL THERE IS: the dialog "${dialog.name}" is not modal`);
    const tops = new Set([dialog.id]);
    const kept: string[] = [];
    const behind: string[] = [];
    for (const node of tree.values()) {
      if (!READ.has(node.role) || under(tree, node, tops)) continue;
      // The one close that floats over every layer, and what is written on it.
      let keeper: Told | undefined = node;
      let isKept = false;
      while (keeper && !isKept) {
        isKept = await has(cdp, keeper, 'data-modal-keep');
        keeper = keeper.parent !== null ? tree.get(keeper.parent) : undefined;
      }
      if (isKept) {
        if (node.role === 'button') kept.push(node.name);
        continue;
      }
      behind.push(`${node.role} "${node.name.slice(0, 40)}"`);
    }
    const focus = (await page.evaluate(`(() => {
      const a = document.activeElement;
      const d = a && a.closest ? a.closest('[role="dialog"]') : null;
      return d ? d.getAttribute('aria-label') : null;
    })()`)) as string | null;
    const inside = [...tree.values()].filter(
      (n) => READ.has(n.role) && n.id !== dialog.id && under(tree, n, tops),
    ).length;
    if (behind.length > 0)
      wrong = `WHAT IS BEHIND A LAYER IS READ: with "${dialog.name}" open, a screen reader is still told of ${String(behind.length)} thing(s) behind it: ${behind.slice(0, 4).join(', ')}`;
    else if (focus !== dialog.name)
      wrong = `FOCUS IS NOT IN THE LAYER: with "${dialog.name}" open, focus is ${focus === null ? 'outside any dialog' : `in "${focus}"`}, so a screen reader does not announce it`;
    else if (inside === 0) wrong = `the dialog "${dialog.name}" holds nothing that is read`;
    else return { name: dialog.name, inside, kept };
    await wait(150);
  }
  return refuse(wrong);
}

/** The layer is gone, and what was behind it is read again. */
async function layerIsGone(cdp: CDPSession, was: string): Promise<void> {
  await until(
    `"${was}" was closed and is still in the tree, or the game is not read again`,
    async () => {
      const t = await told(cdp);
      const still = [...t.values()].some((n) => n.role === 'dialog');
      const menu = button(t, (n) => n === say('play.pause'));
      return !still && menu ? true : null;
    },
  );
}

function filesOf(dir: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const rel of readdirSync(dir, { recursive: true, encoding: 'utf8' })) {
    const file = join(dir, rel);
    if (statSync(file).isFile()) files.set(`/${rel.split(sep).join('/')}`, file);
  }
  return files;
}

let temporary: string | null = null;
let server: Server | null = null;
try {
  let url = process.argv[2] ?? 'http://localhost:4173/';
  if (process.argv[2] === '--build') {
    const dir = mkdtempSync(join(tmpdir(), 'iw-sr-'));
    temporary = dir;
    const env = { ...process.env };
    delete env['VITE_RELAY_URL'];
    execSync(`pnpm exec vite build --logLevel error --emptyOutDir --outDir "${dir}"`, {
      cwd: join(REPO, 'packages', 'app'),
      stdio: 'pipe',
      env,
    });
    if (!existsSync(join(dir, 'index.html'))) refuse(`the build made no index.html in ${dir}`);
    const files = filesOf(dir);
    server = createServer((req, res) => {
      const path = (req.url ?? '/').split('?')[0] ?? '/';
      const file = files.get(path === '/' ? '/index.html' : path);
      if (file === undefined) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    const s = server;
    await new Promise<void>((done) => s.listen(0, '127.0.0.1', done));
    url = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/`;
  }

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const errors: string[] = [];
  try {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e instanceof Error ? e.message : String(e)));
    await page.setViewport({
      width: 360,
      height: 697,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(url, { waitUntil: 'load' });
    const cdp = await page.createCDPSession();
    await cdp.send('DOM.enable');
    await cdp.send('Accessibility.enable');

    // THE TITLE, and the page's language.
    const newGame = await until('the title’s New game is not in the tree', async () =>
      button(await told(cdp), (n) => n === say('title.newGame')),
    );
    const lang = (await page.evaluate(`document.documentElement.lang`)) as string;
    if (lang !== 'en')
      refuse(`THE PAGE DOES NOT SAY ITS LANGUAGE: it says "${lang}", and the game is in English`);
    console.log(`SR WALK: the page says its language (${lang})`);

    // A NEW GAME ON EASY. No dialog stands before it since Gate 2's polish (piece 3, LOOK_PLAN
    // §37): the goal is said on turn 1's card, and is held below to be read there.
    await press(cdp, newGame);
    const easy = await until('the difficulty screen’s Easy is not in the tree', async () =>
      button(await told(cdp), (n) => n.startsWith(say('difficulty.training'))),
    );
    await press(cdp, easy);
    const layers: string[] = [];

    // THE TURN, in words.
    const turn = say('play.turnOf').replace('{n}', '1').replace('{max}', '15');
    // Read once turn 1's cards are drawn: a new game's first view is the turn before its draw.
    const via0 = say('arrivals.via').replace('{place}', '');
    const words = await until('the new cards did not come', async () => {
      const t = await told(cdp);
      return [...t.values()].some((n) => n.role === 'button' && n.name.includes(via0))
        ? [...t.values()].filter((n) => n.role === 'StaticText').map((n) => n.name)
        : null;
    });
    if (!words.includes(turn) || words.includes('1/15'))
      refuse(
        `THE TURN IS NOT SAID IN WORDS: a screen reader should be told "${turn}"${words.includes('1/15') ? ', and is told "1/15"' : ', and is not'}`,
      );
    console.log(`SR WALK: the turn is said in words ("${turn}"), and its figure is not read`);

    // THE GOAL, read on turn 1's card where the dialog that said it was.
    const goalWords = say('goal.win');
    // The heading is drawn in capitals, and Chrome reads it as drawn: matched without regard to case.
    const heard = new Set(words.map((w) => w.toLowerCase()));
    if (!heard.has(say('goal.title').toLowerCase()) || !heard.has(goalWords.toLowerCase()))
      refuse(
        `THE GOAL IS NOT READ ON TURN 1: a screen reader should be told "${say('goal.title')}" and "${goalWords}"`,
      );
    console.log(`SR WALK: the goal is read on turn 1's card ("${say('goal.title')}")`);

    // A NEW CARD, named by what it shows.
    const via = say('arrivals.via').replace('{place}', '');
    const classes = Object.values(FAMILIES as Record<string, { name?: string }>).flatMap((f) =>
      f.name ? [f.name] : [],
    );
    const card = await until('no new card is a button in the tree', async () =>
      button(await told(cdp), (n) => n.includes(via)),
    );
    const cls = classes.find((c) => card.name.includes(c));
    if (cls === undefined)
      refuse(
        `A NEW CARD DOES NOT SAY WHAT IT SHOWS: it is named "${card.name}", with no class by its name`,
      );
    console.log(`SR WALK: a new card is named by what it shows ("${card.name}")`);

    // ITS CARD: the second layer, closed by the close that floats over it.
    const close = async (was: string): Promise<void> => {
      const x = button(await told(cdp), (n) => n === say('nav.close') || n === say('nav.back'));
      if (!x) refuse(`with "${was}" open, no close is in the tree: there is no way out of it`);
      await press(cdp, x);
      await layerIsGone(cdp, was);
    };
    await press(cdp, card);
    const pathogen = await layerIsAll(page, cdp, say('card.title'));
    if (pathogen.kept.length === 0)
      refuse(`with "${pathogen.name}" open, the close that floats over it is not read`);
    layers.push(`"${pathogen.name}" (${String(pathogen.inside)}, and its close kept)`);
    await close(pathogen.name);

    // ALONE, THE CARDS' BUTTON BEGINS THE COMMAND STAGE (Gate 2's polish, piece 3, LOOK_PLAN §37):
    // planning was one more stop between the new cards and the board on every turn.
    const begin = button(await told(cdp), (n) => n === say('play.beginCommand'));
    if (!begin)
      refuse(
        `PLANNING IS NOT FOLDED AWAY: the new cards' button is not "${say('play.beginCommand')}"`,
      );
    // A step's button that has just come back counts no tap for half a second (FINDINGS #90), as
    // the lesson's walk waits: a person's pause.
    await wait(700);
    await press(cdp, begin);
    await until(
      `PLANNING IS NOT FOLDED AWAY: "${say('play.beginCommand')}" did not bring the command stage`,
      async () => (button(await told(cdp), (n) => n === say('play.endCommand')) ? true : null),
    );
    console.log(
      `SR WALK: alone, the new cards' "${say('play.beginCommand')}" goes straight to the command stage`,
    );

    // THE BODY TILE DRAWS THE BODY: the figure planning had, its places read by their names.
    const organNames = new Set(
      Object.values(ORGANS as Record<string, { name?: string }>).flatMap((o) =>
        o.name ? [o.name] : [],
      ),
    );
    const bodyTile = button(await told(cdp), (n) => n === say('body.title'));
    if (!bodyTile) refuse(`no "${say('body.title')}" tile in the tree`);
    await press(cdp, bodyTile);
    const places = await until(
      `THE BODY TILE DOES NOT DRAW THE BODY: with "${say('body.title')}" open, no place of the figure is read`,
      async () => {
        const n = [...(await told(cdp)).values()].filter(
          (x) => x.role === 'group' && organNames.has(x.name),
        ).length;
        return n > 0 ? n : null;
      },
    );
    console.log(
      `SR WALK: "${say('body.title')}" draws the body, ${String(places)} of its organs read by name`,
    );
    const shut = button(await told(cdp), (n) => n === say('body.title'));
    if (shut) await press(cdp, shut);
    await wait(400);

    // THE MENU: the third.
    const menu = button(await told(cdp), (n) => n === say('play.pause'));
    if (!menu) refuse('the game’s menu button is not in the tree');
    await press(cdp, menu);
    const paused = await layerIsAll(page, cdp, say('play.pause'));
    const resume = button(await told(cdp), (n) => n === say('pause.resume'));
    if (!resume) refuse('the menu has no Resume in the tree');
    await press(cdp, resume);
    await layerIsGone(cdp, paused.name);
    layers.push(`"${paused.name}" (${String(paused.inside)})`);

    // THE MESSAGES: the fourth.
    const chat = button(await told(cdp), (n) => n === say('chat.open'));
    if (!chat) refuse('the messages’ button is not in the tree');
    await press(cdp, chat);
    const messages = await layerIsAll(page, cdp, null);
    layers.push(`"${messages.name}" (${String(messages.inside)})`);
    await close(messages.name);

    console.log(
      `SR WALK: ${String(layers.length)} layers, each a named dialog with focus in it and nothing behind it read: ${layers.join('; ')}`,
    );
    if (errors.length > 0) refuse(`an uncaught error on the page: ${errors[0] ?? ''}`);
    console.log('SR WALK: every layer closed back to the game, which is read again; no error');
  } finally {
    void browser.close();
  }
} catch (e) {
  console.error(`SR WALK: DID NOT PASS: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
} finally {
  server?.close();
  if (temporary) rmSync(temporary, { recursive: true, force: true });
  setTimeout(() => process.exit(process.exitCode ?? 0), 800);
}
