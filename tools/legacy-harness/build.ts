/**
 * TASK G, STEP 5 — THE BUNDLE. One self-contained HTML file, opened by double-clicking.
 *
 *   npx tsx tools/legacy-harness/build.ts
 *
 * docs/PHASE1_BRIEF.md §5, Task G, is non-negotiable about the property this protects:
 *
 *   > **double-click to play, no server, no dev command, no toolchain.**
 *
 * The build follows `tools/legacy/spectator_build.js` exactly, because that file IS the contract
 * `v2_ui.html` was written against: two markers, `/*__ENGINE__*\/` and `/*__ART__*\/`, and an
 * engine that arrives as a CLASSIC SCRIPT whose declarations become globals.
 *
 * The one difference is what goes in at the engine marker. Legacy put its own source there with
 * `module.exports` sliced off. This puts the PORT, bundled to a classic script, with `shim.ts`
 * binding the 49 names the UI reads (docs/FINDINGS.md #39).
 *
 * ── ON `vite-plugin-singlefile` ─────────────────────────────────────────────────────────────────
 *
 * PHASE1_BRIEF §5 names that plugin. It does not fit and the requirement is met without it, which
 * is a deviation worth stating rather than glossing:
 *
 *   The plugin inlines a Vite build's own assets into a Vite-generated HTML entry. There is no
 *   Vite HTML entry here — the HTML is `v2_ui.html`, legacy, embedded whole, and `packages/app`
 *   stays empty by §5's own instruction. What the harness needs is TypeScript ESM flattened into
 *   one classic script, which is a single esbuild call with no config file.
 *
 * The requirement the plugin was named to satisfy — one file, no external requests, double-click
 * to play — is asserted directly below instead, which is the part that actually matters.
 *
 * **NOT A DEV SERVER.** CLAUDE.md warns that adding anything listening on a port collapses the
 * Dependabot acceptance and makes `vitest 2 -> 3` urgent. This is a one-shot bundle: esbuild's
 * build API, no `serve`, no watch, no port. The acceptance is unaffected.
 *
 * READ-ONLY on `tools/legacy/`. Everything is written to `dist/`.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

import { checkLegacyAbsent } from './legacy-absent.js';
import { SHIMMED_NAMES } from './shim.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const LEGACY = join(REPO, 'tools', 'legacy');
const DIST = join(HERE, 'dist');

export const OUT_FILE = join(DIST, 'immunity-wars-harness.html');
/** The reference window: identical inputs, legacy engine. Named so it cannot be mistaken. */
export const REF_FILE = join(DIST, 'immunity-wars-REFERENCE-legacy-engine.html');

// --- the stamp -----------------------------------------------------------------------------------

export interface BuildStamp {
  readonly engine: string;
  readonly commit: string;
  readonly dirty: boolean;
  readonly built: string;
  readonly seamNames: number;
}

function git(args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

export type EngineKind = 'port' | 'legacy';

function stamp(kind: EngineKind): BuildStamp {
  return {
    engine:
      kind === 'port'
        ? '@immunity-wars/engine (ported TypeScript)'
        : 'tools/legacy/v2_engine.js (LEGACY REFERENCE)',
    commit: git(['rev-parse', '--short', 'HEAD']) || 'unknown',
    dirty: git(['status', '--porcelain']) !== '',
    built: new Date().toISOString(),
    seamNames: SHIMMED_NAMES.length,
  };
}

// --- the build -----------------------------------------------------------------------------------

/**
 * Bundle `shim.ts` — and through it the whole ported engine and content pack — into ONE classic
 * script.
 *
 * `format: 'iife'` is what makes it a classic script rather than a module. Deliberately NOT
 * minified: the file is a debugging surface for a human comparing two windows with a console open,
 * and readable names are worth far more here than bytes.
 */
async function bundleEngine(): Promise<string> {
  const result = await build({
    entryPoints: [join(HERE, 'shim.ts')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    write: false,
    minify: false,
    legalComments: 'none',
  });
  const out = result.outputFiles?.[0];
  if (!out) throw new Error('esbuild produced no output');
  return out.text;
}

/** The visible stamp, and the same values on the global for the console. */
function stampMarkup(s: BuildStamp, kind: EngineKind): string {
  const label = `${s.commit}${s.dirty ? '+dirty' : ''}`;
  // The two builds must be distinguishable ACROSS THE ROOM, not by squinting. Two windows side by
  // side with near-identical badges is precisely how a comparison gets recorded against the wrong
  // one, and that mistake is invisible afterwards.
  const port = kind === 'port';
  const bg = port ? 'rgba(8,12,20,.86)' : 'rgba(30,10,10,.9)';
  const fg = port ? '#9fe8c0' : '#ffc9c9';
  const edge = port ? '#2c6b4a' : '#8b3a3a';
  const title = port ? 'PORTED ENGINE — TypeScript' : 'LEGACY ENGINE — reference window';
  const where = port ? `packages/engine @ ${label}` : `tools/legacy/v2_engine.js @ ${label}`;
  const tail = port
    ? `${s.seamNames} seam names bound`
    : 'built from the SAME v2_ui.html and art — engine is the only difference';
  return `<div id="buildStamp" style="position:fixed;right:8px;bottom:8px;z-index:99999;font:11px/1.45 ui-monospace,Consolas,monospace;background:${bg};color:${fg};border:1px solid ${edge};border-radius:6px;padding:6px 9px;pointer-events:none;max-width:46ch">
<b style="color:#fff">${title}</b><br>
${where}<br>
${tail} · built ${s.built.slice(0, 19).replace('T', ' ')}Z
</div>`;
}

function stampScript(s: BuildStamp): string {
  return `\n;globalThis.__IMMUNITY_WARS_BUILD__ = ${JSON.stringify(s)};\n`;
}

export interface Built {
  readonly html: string;
  readonly stamp: BuildStamp;
  readonly kind: EngineKind;
  /**
   * Everything a correct build is allowed to contain — the port's bundled output and the legacy
   * UI. `legacy-absent.ts` derives its fingerprints against exactly this, so the comparison can
   * never be made against a different bundle than the one that shipped.
   */
  readonly legitimate: string;
}

/**
 * Build the REFERENCE window: the same `v2_ui.html` and the same art, with the LEGACY engine.
 *
 * docs/TASK_G_PLAN.md §3 step 7 asks for "the same script against today's build in the other
 * window". `tools/legacy/immunity-wars-v2.html` is a today's-build candidate, but it is a
 * separately produced file that could differ from this one in ways nobody has enumerated — and a
 * comparison whose two sides differ in more than one variable cannot attribute what it finds.
 *
 * Building both windows here from the same three inputs makes the engine THE ONLY DIFFERENCE, so
 * anything Shantanu sees is attributable by construction.
 *
 * This is `spectator_build.js`'s own recipe: read the engine, slice off `module.exports`, keep the
 * globals.
 */
function legacyEngineScript(): string {
  const src = readFileSync(join(LEGACY, 'v2_engine.js'), 'utf8');
  const cut = src.indexOf('module.exports');
  return cut > -1 ? src.slice(0, cut) : src;
}

export async function buildHarness(kind: EngineKind = 'port'): Promise<Built> {
  const s = stamp(kind);
  const engine = kind === 'port' ? await bundleEngine() : legacyEngineScript();
  const art = readFileSync(join(LEGACY, 'art_data.js'), 'utf8');

  const uiSource = readFileSync(join(LEGACY, 'v2_ui.html'), 'utf8');
  let html = uiSource;

  // The same three assertions spectator_build.js makes, for the same reason: a silently-missing
  // marker would produce a file that opens and does nothing.
  if (!html.includes('/*__ENGINE__*/')) throw new Error('engine marker missing from v2_ui.html');
  if (!html.includes('/*__ART__*/')) throw new Error('art marker missing from v2_ui.html');
  if (!html.includes('<div id="app"></div>')) throw new Error('app mount point not found');

  // Replacer functions, not strings: `$&` and friends in the engine source would otherwise be
  // interpreted as replacement patterns. spectator_build.js does the same and for the same reason.
  html = html.replace('/*__ENGINE__*/', () => engine + stampScript(s));
  html = html.replace('/*__ART__*/', () => art);
  html = html.replace(
    '<div id="app"></div>',
    () => `<div id="app"></div>\n${stampMarkup(s, kind)}`,
  );

  return {
    html,
    stamp: s,
    kind,
    legitimate: `${engine}
${uiSource}`,
  };
}

/**
 * The properties that make this file worth shipping, asserted on the artifact itself.
 *
 * Every one of these is something a human opening the file could not check by looking at it, which
 * is the whole reason they are here rather than in the protocol Shantanu follows.
 */
export interface Assertions {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

/**
 * @param legitimate ALWAYS the PORT build's legitimate corpus, even when checking the legacy
 *                   reference window. The fingerprints must mean the same thing for both artifacts
 *                   or the two results are not comparable — and for the legacy window the
 *                   expectation is simply inverted.
 */
export function assertArtifact(
  html: string,
  s: BuildStamp,
  legitimate: string,
  kind: EngineKind = 'port',
): Assertions[] {
  const out: Assertions[] = [];

  const absent = checkLegacyAbsent(html, legitimate);
  if (kind === 'port') {
    out.push({
      name: 'legacy engine source is absent',
      ok: absent.clean,
      detail: absent.clean
        ? `none of ${absent.checked} distinctive legacy lines appear`
        : `FOUND ${absent.found.length} legacy line(s), e.g. ${JSON.stringify(absent.found[0]?.slice(0, 60))}`,
    });
  } else {
    // THE INVERSE, and it is not decoration. The reference window is built to contain legacy, so
    // it is a live negative control for the check above — run on a real artifact rather than a
    // doctored one. If this ever came back "clean", the fingerprints would have stopped meaning
    // anything and the port build's green would be worthless too.
    out.push({
      name: 'legacy engine source is PRESENT (reference window)',
      ok: !absent.clean,
      detail: !absent.clean
        ? `${absent.found.length} of ${absent.checked} distinctive legacy lines found, as required`
        : 'NOT FOUND — the fingerprints no longer detect legacy, so the port build proves nothing',
    });
  }

  // "No external requests" is the double-click requirement in its checkable form. Anything the
  // browser would have to fetch turns a self-contained file into a broken one on a machine with
  // no network, which is exactly the situation a classroom is in.
  const external = [...html.matchAll(/(?:src|href)\s*=\s*"([^"]*)"/g)]
    .map((m) => m[1] ?? '')
    .filter((u) => /^(https?:)?\/\//.test(u));
  out.push({
    name: 'no external resource references',
    ok: external.length === 0,
    detail:
      external.length === 0 ? 'every src/href is inline, data: or a fragment' : external.join(', '),
  });

  const fetches = /\bfetch\s*\(|XMLHttpRequest|importScripts\s*\(/.test(html);
  out.push({
    name: 'no runtime network calls',
    ok: !fetches,
    detail: fetches ? 'found fetch/XHR/importScripts' : 'no fetch, XHR or importScripts',
  });

  out.push({
    name: 'the build stamp is present and visible',
    ok: html.includes('id="buildStamp"') && html.includes(s.commit),
    detail: `commit ${s.commit}${s.dirty ? '+dirty' : ''}`,
  });

  if (kind === 'port') {
    out.push({
      name: 'the shim binds the measured seam',
      ok: SHIMMED_NAMES.every((n) => html.includes(`"${n}"`) || html.includes(`'${n}'`)),
      detail: `${SHIMMED_NAMES.length} names`,
    });
  }

  return out;
}

// --- entry point ---------------------------------------------------------------------------------

async function main(): Promise<void> {
  const line = '='.repeat(95);
  mkdirSync(DIST, { recursive: true });

  // The PORT window first: its `legitimate` corpus is what both artifacts are measured against.
  const port = await buildHarness('port');
  writeFileSync(OUT_FILE, port.html, 'utf8');

  // The REFERENCE window: same UI, same art, legacy engine. Two windows differing in one variable.
  const ref = await buildHarness('legacy');
  writeFileSync(REF_FILE, ref.html, 'utf8');

  console.log(line);
  console.log('TASK G STEP 5 — THE SINGLE-FILE HARNESS, AND ITS REFERENCE WINDOW');
  console.log(line);
  console.log(`  commit   ${port.stamp.commit}${port.stamp.dirty ? '  (WORKING TREE DIRTY)' : ''}`);
  console.log(`  built    ${port.stamp.built}`);
  console.log('');
  console.log(`  PORT      ${OUT_FILE}`);
  console.log(
    `            ${port.stamp.engine} · ${port.stamp.seamNames} seam names · ${(port.html.length / 1024).toFixed(0)} KB`,
  );
  console.log(`  REFERENCE ${REF_FILE}`);
  console.log(`            ${ref.stamp.engine} · ${(ref.html.length / 1024).toFixed(0)} KB`);
  console.log('');

  const results = [
    ...assertArtifact(port.html, port.stamp, port.legitimate, 'port').map((r) => ({
      ...r,
      window: 'port',
    })),
    ...assertArtifact(ref.html, ref.stamp, port.legitimate, 'legacy').map((r) => ({
      ...r,
      window: 'ref ',
    })),
  ];
  for (const r of results) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.window}  ${r.name.padEnd(46)} ${r.detail}`);
  }

  // The two windows must differ, and they must differ ONLY where intended. An identical pair would
  // mean the reference build silently produced the port build, and every comparison run against it
  // would agree perfectly while proving nothing — the C5b shape once more.
  const distinct = port.html !== ref.html;
  console.log(
    `  ${distinct ? 'PASS' : 'FAIL'}  both  ${'the two windows are not the same file'.padEnd(46)} ${
      distinct ? 'they differ' : 'IDENTICAL — the reference is not a reference'
    }`,
  );

  const failed = results.filter((r) => !r.ok).length + (distinct ? 0 : 1);
  console.log('');
  console.log(line);
  console.log(
    failed === 0
      ? 'BOTH ARTIFACTS OK — double-click either to play.'
      : `${failed} ASSERTION(S) FAILED`,
  );
  console.log(line);
  process.exit(failed === 0 ? 0 : 1);
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  await main();
}
