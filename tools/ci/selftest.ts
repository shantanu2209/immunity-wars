/**
 * THE PIPELINE'S NEGATIVE CONTROLS — every gate demonstrated to fail.
 *
 *   npx tsx tools/ci/selftest.ts          # all controls
 *   npx tsx tools/ci/selftest.ts lint     # one, by id
 *   npx tsx tools/ci/selftest.ts --inert  # only that every mutation still changes its file
 *
 * ============================================================================================
 * A CI PIPELINE THAT HAS NEVER GONE RED IS NOT KNOWN TO WORK.
 * ============================================================================================
 *
 * This project has found, ten times, that a check believed to be working was not. A CI pipeline is
 * the same kind of object and deserves the same treatment — except that "make it fail on purpose"
 * normally means pushing a broken commit, which leaves a red mark on the branch history forever
 * and tempts everyone to skip it.
 *
 * So each control here MUTATES A FILE IN THE WORKING TREE, runs one gate, requires it to fail
 * **with the right diagnostic**, and reverts. Nothing is committed and main never goes red.
 *
 * THE DIAGNOSTIC IS THE POINT, not the exit code. A gate that fails for the wrong reason has not
 * been demonstrated: `pnpm lint` exits non-zero if the config is broken, if a dependency is
 * missing, or if the file does not parse. Requiring the expected rule NAME in the output is what
 * separates "this gate caught my mutation" from "something went wrong".
 *
 * WHY NOT `git apply` PATCH FILES: a patch carries line context and rots the moment the
 * surrounding code moves, so the control quietly stops applying and the suite reports a
 * `did not apply` that everyone learns to ignore. A string replacement that must match exactly —
 * and is checked to have changed the file — cannot rot silently, PROVIDED the check runs: it rotted
 * for five days when only the full run made it (FINDINGS #100), so `--inert` now runs on every
 * `pnpm verify` and in CI.
 *
 * NOT EVERY CONTROL IS A FAILURE CONTROL. A rule expressed only as "forbid X" is half-specified:
 * a rule that forbade everything would satisfy every fail-control ever aimed at it. Controls
 * marked `mustPass` mutate in a PERMITTED edge and require the gate to stay green. The ui/app
 * boundary needed one, and needed it for a real reason rather than a tidy one — see the field's
 * own comment.
 *
 * Exit codes: 0 every gate behaved as specified · 1 one did not · 2 the run could not be made.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeRetrying } from './write-retry.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

interface Control {
  readonly id: string;
  /** Why this gate exists at all — read by whoever sees this control go wrong. */
  readonly why: string;
  readonly file: string;
  /** Mutation. Must change the file; an inert control is worse than none. */
  readonly mutate: (text: string) => string;
  readonly gate: string;
  /**
   * A substring the failure output MUST contain — the rule name, not just "error".
   * Ignored when `mustPass` is set, because there is no failure output to search.
   */
  readonly expect: string;
  /**
   * Inverted control: the mutation is PERMITTED, and the gate must stay GREEN.
   *
   * Added at P2.1 for the ui/app boundary, and it is not symmetry for its own sake. A rule
   * expressed as "forbid X" is only half-specified: a rule that forbids everything satisfies
   * every fail-control ever pointed at it while making the permitted case unbuildable. That is
   * not hypothetical here — it was MEASURED during P2.1. `ui-app-no-unresolvable` reddens on an
   * import it cannot resolve, so before packages/ui declared its content dependency, the very
   * import docs/PHASE2_BRIEF.md v1.1 §3 calls legitimate came back red from the boundary gate.
   * A fail-only control set would have reported that rule as working perfectly.
   */
  readonly mustPass?: boolean;
}

const CONTROLS: readonly Control[] = [
  {
    id: 'typecheck',
    why: 'A type error anywhere in the workspace must stop the build.',
    file: 'packages/engine/src/index.ts',
    mutate: (t) => `${t}\nexport const _ctlTypeError: number = 'not a number';\n`,
    gate: 'pnpm typecheck',
    expect: 'TS2322',
  },
  {
    id: 'lint',
    why: '`!` is a lint error in engine — CLAUDE.md closes it as an escape hatch for noUncheckedIndexedAccess.',
    file: 'packages/engine/src/index.ts',
    mutate: (t) => `${t}\nexport function _ctlBang(xs: number[]): number {\n  return xs[0]!;\n}\n`,
    gate: 'pnpm lint',
    expect: 'no-non-null-assertion',
  },
  {
    id: 'boundaries-node',
    why: 'The engine must import no Node API. dependency-cruiser owns the import-graph half of the boundary.',
    file: 'packages/engine/src/index.ts',
    mutate: (t) => `import { readFileSync } from 'node:fs';\nvoid readFileSync;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'engine-no-node-builtins',
  },
  {
    id: 'boundaries-content',
    why: 'content must import nothing: the invariant is that content contains no logic.',
    file: 'packages/content/src/index.ts',
    mutate: (t) => `import { readFileSync } from 'node:fs';\nvoid readFileSync;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'content-no-node-builtins',
  },
  {
    id: 'boundaries-ui-engine',
    why: 'THE load-bearing half of seam 1: a UI written against applyAction is a fork nothing fails on until Phase 3 puts a network in that gap (docs/FINDINGS.md #39).',
    file: 'packages/ui/src/index.ts',
    // The relative reach across packages/. This is the spelling that RESOLVES, so it is the
    // one that reaches ui-app-no-engine; the bare specifier is the control below.
    mutate: (t) =>
      `import { applyAction } from '../../engine/src/index.js';\nvoid applyAction;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'ui-app-no-engine',
  },
  {
    id: 'boundaries-ui-engine-bare',
    why: 'MEASURED at P2.1: the package-specifier spelling does NOT reach ui-app-no-engine, because dependency-cruiser matches to.path against the RESOLVED path and an unresolved import has none. Without ui-app-no-unresolvable beside it, the more natural way to write the violation is the one that slips through.',
    file: 'packages/ui/src/index.ts',
    mutate: (t) => `import { applyAction } from '@immunity-wars/engine';\nvoid applyAction;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'ui-app-no-unresolvable',
  },
  {
    id: 'boundaries-ui-engine-tsx',
    why: 'P2.2 step 3: the first .tsx files entered packages/ui, and dependency-cruiser resolved only .js/.ts/.mjs/.cjs until the same change — a UI component was invisible to the exact gate built to watch the UI. This control proves the boundary fires INSIDE a .tsx file, so the extension list can never quietly regress.',
    file: 'packages/ui/src/board/Board.tsx',
    mutate: (t) =>
      `import { applyAction } from '../../../engine/src/index.js';\nvoid applyAction;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'ui-app-no-engine',
  },
  {
    id: 'boundaries-ui-content-permitted',
    why: 'The rule must permit what the brief says it permits. ui -> content is legitimate: content is validated data, not behaviour, which is exactly what content-stays-data and exports.test.ts jointly keep true. A boundary that also blocked this would be discovered by the first person to render an organ name.',
    file: 'packages/ui/src/index.ts',
    mutate: (t) => `import { ORGANS } from '@immunity-wars/content';\nvoid ORGANS;\n${t}`,
    gate: 'pnpm boundaries',
    expect: '(unused — mustPass control)',
    mustPass: true,
  },
  {
    id: 'turbo-test-hash',
    why: 'pnpm verify replayed a cached green over a red suite for thirteen days: with no ^test edge a test task hashes only its own package, so a change in a workspace dependency never invalidates it (docs/FINDINGS.md #51).',
    file: 'turbo.json',
    mutate: (t) => {
      const j = JSON.parse(t) as { tasks: Record<string, { dependsOn?: unknown }> };
      const test = j.tasks['test'];
      if (test) delete test.dependsOn;
      return `${JSON.stringify(j, null, 2)}
`;
    },
    gate: 'pnpm turbo:check',
    expect: 'TURBO TEST HASH BLIND',
  },
  {
    id: 'docs-phase-marker',
    why: 'CLAUDE.md said "Current phase: Phase 1" for the whole first session of Phase 2, and ROADMAP.md agreed with it. A stale phase marker is not wrong enough to notice, so it survives. ⚠️ THIS CONTROL WENT INERT ON 21 September 2026 (docs/FINDINGS.md #76): it looked for the literal "Phase 2", so the moment the marker moved to Phase 3 the mutation changed nothing and the harness said so — correctly, because an inert control is reported, not passed. It reads the number out of the file now, and its expectation no longer names a phase either.',
    file: 'CLAUDE.md',
    mutate: (t) =>
      t.replace(
        /\*\*Current phase: Phase (\d+)\*\*/,
        (_m, n: string) => `**Current phase: Phase ${String(Number(n) + 1)}**`,
      ),
    gate: 'pnpm docs:check',
    expect: 'but the spec it names is',
  },
  {
    id: 'docs-dead-link',
    why: 'A link to a document that was renamed or never written reads exactly like one that resolves.',
    file: 'docs/PHASE2_BRIEF.md',
    mutate: (t) => t.replace('](PHASE2_INPUTS.md)', '](PHASE2_INPUTS_RENAMED.md)'),
    gate: 'pnpm docs:check',
    expect: 'does not resolve',
  },
  {
    id: 'docs-bad-inline-path',
    why: 'CLAUDE.md named packages/content/board/geometry.json in its hard rules; it has always been packages/content/src/board/. A code span is not a markdown link, so the link check could never have seen it.',
    file: 'CLAUDE.md',
    mutate: (t) =>
      t.replace(
        '`packages/content/src/board/geometry.json`',
        '`packages/content/board/geometry.json`',
      ),
    gate: 'pnpm docs:check',
    expect: 'which does not exist',
  },
  {
    id: 'docs-ignored-inline-path',
    why: 'FINDINGS #69 cited a build file in a code span and this gate passed it, because a local build had put the file on disk: the build directory is gitignored, CI never runs this gate, and a checkout with no build fails it. A path that exists only as ignored output is not a repository path. The probe is a node_modules file because it exists wherever this selftest can run, and it sits behind a pnpm symlink, which git check-ignore cannot see through.',
    file: 'CLAUDE.md',
    mutate: (t) =>
      t.replace(
        '`packages/content/src/board/geometry.json`',
        '`packages/app/node_modules/react/package.json`',
      ),
    gate: 'pnpm docs:check',
    expect: 'exists only as gitignored output',
  },
  {
    id: 'docs-new-inline-path-permitted',
    why: 'The ignore rule must still permit a real repository file, including one written minutes ago and not yet added, because pnpm verify runs before git add. Measured when the rule was chosen: "not tracked by git" would have rejected exactly such a file, which is why the rule is "gitignored" instead.',
    file: 'CLAUDE.md',
    mutate: (t) =>
      t.replace(
        '`packages/content/src/board/geometry.json`',
        '`packages/app/src/serviceWorker.test.ts`',
      ),
    gate: 'pnpm docs:check',
    expect: '(unused — mustPass control)',
    mustPass: true,
  },
  {
    id: 'boundaries-room-node',
    why: "GATE B (docs/PHASE3_BRIEF.md §6): the room must be platform-free, or 'we can move to another platform later' is a hope rather than a property. A room that can read a file is a room that has a platform in it.",
    file: 'packages/room/src/room.ts',
    mutate: (t) => `import { readFileSync } from 'node:fs';\nvoid readFileSync;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'room-no-node-builtins',
  },
  {
    id: 'boundaries-room-engine-permitted',
    why: 'The other half: the room is the AUTHORITY, so it must be allowed to reach the engine exactly as session does. A rule that forbade everything downstream would satisfy the control above while making the room unbuildable.',
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      `import { resolveSpread } from '@immunity-wars/engine';\nvoid resolveSpread;\n${t}`,
    gate: 'pnpm boundaries',
    expect: '(unused — mustPass control)',
    mustPass: true,
  },
  {
    id: 'boundaries-room-downstream',
    why: 'room-no-downstream had no failure control from P3.1 to P3.4, which is how its missing trailing slash went unseen. The relative reach is the spelling that RESOLVES; the package specifier would be unresolvable from the room, the same hole ui-app-no-unresolvable closes for ui and app only, by ruling.',
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      `import { LocalSession } from '../../session/src/index.js';\nvoid LocalSession;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'room-no-downstream',
  },
  {
    id: 'boundaries-room-session-core-permitted',
    why: 'P3.4, FOUND BY THE FIRST REAL IMPORT: room-no-downstream matched ^packages/(...|session) with no trailing slash, so it also matched packages/session-core and refused the edge the ruling of 24 September 2026 requires, the room computing its views with the shared builder. No failure control could have said so.',
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      `import { scopeFrom } from '@immunity-wars/session-core';\nvoid scopeFrom;\n${t}`,
    gate: 'pnpm boundaries',
    expect: '(unused — mustPass control)',
    mustPass: true,
  },
  {
    id: 'boundaries-session-core-downstream',
    why: 'The shared builder must not reach what uses it, or it becomes one of two copies again. Every package downstream of session-core also imports it, so this mutation makes a cycle too; the diagnostic required is the boundary rule, not no-circular.',
    file: 'packages/session-core/src/build.ts',
    mutate: (t) => `import { createRoom } from '../../room/src/index.js';\nvoid createRoom;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'session-core-no-downstream',
  },
  {
    id: 'boundaries-session-core-engine-permitted',
    why: "The other half: the builder runs the engine's queries, so it must be allowed to reach the engine.",
    file: 'packages/session-core/src/build.ts',
    mutate: (t) =>
      `import { resolveSpread } from '@immunity-wars/engine';\nvoid resolveSpread;\n${t}`,
    gate: 'pnpm boundaries',
    expect: '(unused — mustPass control)',
    mustPass: true,
  },
  {
    id: 'boundaries-session-core-node',
    why: "GATE B through the room: the room runs session-core on every view, and room-no-node-builtins looks only at the room's own files.",
    file: 'packages/session-core/src/build.ts',
    mutate: (t) => `import { readFileSync } from 'node:fs';\nvoid readFileSync;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'session-core-no-node-builtins',
  },
  {
    id: 'boundaries-ui-session-core',
    why: "session-core is engine code for seam 1: it runs the engine's queries on a GameState. The UI gets its types through the session, which re-exports them.",
    file: 'packages/ui/src/index.ts',
    mutate: (t) =>
      `import { precompute } from '../../session-core/src/index.js';\nvoid precompute;\n${t}`,
    gate: 'pnpm boundaries',
    expect: 'ui-app-no-engine',
  },
  {
    id: 'room-away-seats',
    why: "Ruling 4 (20 September 2026): a disconnection keeps the member's seats. If dropping freed them, a flaky connection would cost someone their cell mid-game and the table would never be asked.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        '        replace(room, msg.ref, (m) => ({ ...m, connected: false })),',
        '        replace(room, msg.ref, (m) => ({ ...m, connected: false, seats: [] })),',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'keeps an away member and their seats',
  },
  {
    id: 'room-captain-order',
    why: 'Succession must read JOIN ORDER, so two clients handed the same room name the same captain without exchanging a word. Sorting by nothing makes it depend on array order, which is a different thing that usually agrees — the worst kind of wrong.',
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        '  const next = [...connected(room)].sort((a, b) => a.joinOrder - b.joinOrder)[0];',
        '  const next = [...connected(room)].reverse()[0];',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'passes to the next member in join order who is connected',
  },
  {
    id: 'room-seat-of-present-player',
    why: "The captain may hand on an AWAY member's seat. Letting them take a seat from someone sitting in it turns 'the table decides not to wait' into 'the captain overrules a player', which is not the ruling.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        '      if (holder?.connected === true)',
        '      if (holder?.connected === false && false)',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'cannot take a seat from someone who is HERE',
  },
  {
    id: 'room-ownership',
    why: "Ownership is the room's business: without this check any member could move anyone's cell, and the engine would not stop them, because the engine is told the acting pid by the room.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        '      if (seat !== null && !me.seats.includes(seat))',
        '      if (false && seat !== null && !me.seats.includes(seat))',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'is refused when the sender does not hold that seat',
  },
  {
    id: 'room-grace',
    why: 'The grace period is the difference between a family losing Wi-Fi for ninety seconds and losing a forty-minute game. A sweep that never discards leaks rooms; one that always discards destroys them.',
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace('  return now - room.emptySince >= graceMs ? null : room;', '  return room;'),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'discards it once the period is up',
  },
  {
    id: 'protocol-version-check',
    why: 'Gate A: a client on an old version "can never desynchronise a newer room". The only way a peer that cannot read a message is kept from acting on a misreading is to refuse it before its body is looked at.',
    file: 'packages/protocol/src/messages.ts',
    mutate: (t) =>
      t.replace(
        '  if (header.data.v !== PROTOCOL_VERSION || header.data.rules !== RULES_VERSION) {',
        '  if (false) {',
      ),
    gate: 'pnpm --filter @immunity-wars/protocol test',
    expect: 'refuses a peer on another protocol version',
  },
  {
    id: 'protocol-encode-stamps',
    why: 'Every message carries both versions because the ENCODER stamps them, not because every call site remembers to. An encoder that forgot would make every version check compare against nothing.',
    file: 'packages/protocol/src/messages.ts',
    mutate: (t) =>
      t.replace(
        '  JSON.stringify({ v: PROTOCOL_VERSION, rules: RULES_VERSION, ...message });',
        '  JSON.stringify({ ...message });',
      ),
    gate: 'pnpm --filter @immunity-wars/protocol test',
    expect: 'because the encoder stamps them',
  },
  {
    id: 'protocol-view-bytes',
    why: 'MEASURED before the schema was written (docs/for-P3.md §2): z.object({}) is the natural spelling and it STRIPS every field, delivering an empty view and reporting success. Task C2 all over again, on the wire.',
    file: 'packages/protocol/src/messages.ts',
    mutate: (t) =>
      t.replace('const View = z.record(z.string(), z.unknown());', 'const View = z.object({});'),
    gate: 'pnpm --filter @immunity-wars/protocol test',
    expect: 'delivers a view byte for byte',
  },
  {
    id: 'protocol-view-bytes-real',
    why: 'The same mutation against REAL views from a game played through the room: the protocol suite may not import the engine, so this is where the measurement is kept as a test rather than as a number in a document.',
    file: 'packages/protocol/src/messages.ts',
    mutate: (t) =>
      t.replace('const View = z.record(z.string(), z.unknown());', 'const View = z.object({});'),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'delivers every real view byte for byte',
  },
  {
    id: 'room-no-ref-in-view',
    why: "FINDINGS #77: the engine projects captain, owner and apBudget keyed by player id into EVERY view. Given refs, as P3.1 gave it, every view broadcast every member's credential. The wire suite found it against real views on its first run. Re-aimed 30 September 2026 (FINDINGS #100): P3.7 moved the id into an imported pidOf and wrapped it in pidOfMember, and the old mutation had matched nothing since.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        'const pidOfMember = (m: Member): string => pidOf(m.joinOrder);',
        'const pidOfMember = (m: Member): string => m.ref;',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'never carries a ref, in any message, across a whole game',
  },
  {
    id: 'room-no-ref-in-projection',
    why: 'FINDINGS #77, the other door: P3.1 put each member\'s ref in the room projection itself, so any member could "rejoin" as any other and take their seats in one message.',
    file: 'packages/room/src/room.ts',
    mutate: (t) => t.replace('      id: m.joinOrder,', '      id: m.joinOrder,\n      ref: m.ref,'),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'never carries a ref, anywhere in anything it broadcasts',
  },
  {
    id: 'room-captain-reaches-engine',
    why: 'FINDINGS #78: the engine enforces its OWN copy of the captain. If the room stops telling it, a captain dropping mid-game stalls the table until they return — the stall ruling 4 exists to prevent.',
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        "      return { room: next, out: [broadcast(next), ...syncCaptain(next)] };\n    }\n\n    case 'leave':",
        "      return { room: next, out: [broadcast(next)] };\n    }\n\n    case 'leave':",
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'lets the new captain act after the old one drops mid-game',
  },
  {
    id: 'room-only-action',
    why: "handOverCaptaincy is the room's to send. A client that could send it could make themselves captain; the room refuses it from every client, independently of the engine's own check.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        "const ROOM_ONLY: ReadonlySet<string> = new Set(['handOverCaptaincy']);",
        'const ROOM_ONLY: ReadonlySet<string> = new Set([]);',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'refuses the action from any client',
  },
  {
    id: 'ids-undo-snapshot-key',
    why: "FINDINGS #80: the id workaround read undo snapshots as 'invaders' while the engine writes 'inv', so an invader killed this phase, which an undo would bring back, could be handed the same id as a new arrival. The test takes its snapshot from the engine's own pushUndo, so a wrong key reads nothing and the counter falls short.",
    file: 'packages/session-core/src/ids.ts',
    mutate: (t) =>
      t.replace(
        '    for (const iv of snap.inv ?? []) seen(iv.id);',
        '    for (const iv of [] as { id?: unknown }[]) seen(iv.id);',
      ),
    gate: 'pnpm --filter @immunity-wars/session-core test',
    expect: "advances past an id that only the engine's own undo snapshot still holds",
  },
  {
    id: 'room-ids-across-rooms',
    why: "FINDINGS #56 on a relay: until queue Q5 the engine handed out invader ids from one counter per process, and a new game in ANY room reset it, so a game starting at one table made another hand one id to two pathogens. Re-aimed 30 September 2026, when Q5 made the counter the game's own and the room's workaround went: a counter shared again, and reset by any new game, must fail the room's two-rooms test.",
    file: 'packages/engine/src/primitives.ts',
    mutate: (t) =>
      t.replace(
        'export function uid(g: { idCounter: number }): string {\n  g.idCounter += 1;\n  return `i${g.idCounter}`;\n}',
        'let shared = 0;\nexport function uid(g: { idCounter: number }): string {\n  if (g.idCounter === 0) shared = 0;\n  g.idCounter += 1;\n  shared += 1;\n  return `i${shared}`;\n}',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'holds across two rooms interleaved in one process',
  },
  // WAS \`room-undo-refused\` (FINDINGS #79) until v4, when undo was ruled for games played together
  // (27 September 2026). The engine's undo stack is still the whole table's, so the two controls
  // below hold the room to the only undo that is safe on it.
  {
    id: 'room-undo-own-moves-only',
    why: "The engine's undo stack is the whole table's. An undo from anyone but the player whose moves are the last things done would take back someone else's moves.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        '  if (!run || run.ref !== me.ref || !stackOf(game).includes(run.first))',
        '  if (!run || !stackOf(game).includes(run.first))',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: "refuses another player's undo",
  },
  {
    id: 'room-undo-ends-when-others-act',
    why: "A player's run of moves ends when anyone else acts. Carried on through another player's move, an undo would pop back through that move too.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace('          ? run !== null && run.ref === me.ref', '          ? run !== null'),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'refuses an undo once someone else has acted since',
  },
  {
    id: 'room-result-after-ending',
    why: "Found by the first run against the live relay (25 September 2026): the room's end came after an action's result, so a client whose promise had resolved still thought the game was on and acted into an ended room. The result must be the last thing an action causes.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        '      out.push(answer(msg.ref, msg.id));\n      return { room: next, out };',
        '      out.splice(out.length - (over ? 1 : 0), 0, answer(msg.ref, msg.id));\n      return { room: next, out };',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'is answered last even when it ends the game',
  },
  {
    id: 'room-newcomer-refused',
    why: 'Ruled 25 September 2026 (brief review R2, FINDINGS #86): the engine fixes its players at the start, so a newcomer let in mid-game could be seated but never given Action Points or the captaincy, and could stall the table as #78 once did.',
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        "      if (room.phase === 'playing') return reject(room, msg.ref, 'lobbyClosed');\n",
        '',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'refuses a NEW member once the game has started',
  },
  {
    id: 'hub-refused-join-unbound',
    why: "FINDINGS #87: the hub bound a connection to its room before the room ruled on the join, and never unbound it on a refusal, so a refused joiner heard every broadcast of a room it was not in, its members' names included.",
    file: 'packages/server/src/hub.ts',
    mutate: (t) =>
      t.replace(
        '      if (this.rooms.get(code)?.members.some((m) => m.ref === msg.ref) !== true)\n        this.links.set(link, null);\n',
        '',
      ),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'leaves the refused connection hearing nothing more from the room',
  },
  {
    id: 'relay-entry-close-reason',
    why: 'FINDINGS #88: the relay refuses a busy relay and a guesser of codes by closing with a reason and sending nothing, and RelayRoom dropped the reason, so a player told to wait would have read that the connection was lost.',
    file: 'packages/session/src/relay.ts',
    mutate: (t) =>
      t.replace(
        "this.fail(new RelayError('closed', code));",
        "this.fail(new RelayError('closed'));",
      ),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'says WHY when the relay refuses by closing',
  },
  {
    id: 'relay-leave-sent-first',
    why: 'FINDINGS #88: leave() sends asynchronously, so an app that leaves and closes at once closed the connection first, and the player stayed in the room as away, holding the seats Leave says it gives back.',
    file: 'packages/session/src/relay.ts',
    mutate: (t) =>
      t.replace(
        "    this.send({ kind: 'leave' });\n    return this.outbound;",
        "    this.send({ kind: 'leave' });\n    return Promise.resolve();",
      ),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'lets a player leave and close at once',
  },
  {
    id: 'together-keys-in-catalogue',
    why: 't() shows a missing key as the key itself, and nothing else notices until a player does. The way-in test reads every key the together screens and the lobby name out of their source; a misspelt one must redden it.',
    file: 'packages/ui/src/screens/LobbyScreen.tsx',
    mutate: (t) => t.replace("t('lobby.seats')", "t('lobby.seatz')"),
    gate: 'pnpm --filter @immunity-wars/ui test',
    expect: 'are in the catalogue',
  },
  {
    id: 'table-offers-own-seats',
    why: "P3.7 piece B: the room refuses an action on a piece its sender does not hold, so a player must be offered only their own seats' actions. Without the seat rule every player is offered every piece, which the P3.7 spike measured.",
    file: 'packages/ui/src/play/offered.ts',
    mutate: (t) =>
      t.replace(
        '  if (seat !== null && !seats.mine(seat)) return theirPiece(seats.theirs(seat));\n',
        '',
      ),
    gate: 'pnpm --filter @immunity-wars/session-tests test',
    expect: 'every offer to either player, for every piece and for the body, the room accepts',
  },
  {
    id: 'table-offers-own-budget',
    why: "P3.7 piece B: in a game played together the view's ap is the table's total and each player spends their own budget, so a screen reading ap offers what a player cannot afford. seenBy puts the player's own budget there.",
    file: 'packages/ui/src/play/table.ts',
    mutate: (t) =>
      t.replace(
        "  if (g['multiplayer'] !== true || p.pid === null) return view;",
        '  return view;',
      ),
    gate: 'pnpm --filter @immunity-wars/session-tests test',
    expect: 'every offer to either player, for every piece and for the body, the room accepts',
  },
  {
    id: 'table-draw-captain-only',
    why: "P3.7 piece B: the engine accepts a draw only from the captain, so only the captain's device may send it; before, whichever device reached the moment first sent it, and on the wrong timing the draw was refused.",
    file: 'packages/ui/src/play/autoDraw.ts',
    mutate: (t) =>
      t.replace(
        '  if (!m.mayDraw || m.playing || m.dialogPending || m.covered) return false;',
        '  if (m.playing || m.dialogPending || m.covered) return false;',
      ),
    gate: 'pnpm --filter @immunity-wars/session-tests test',
    expect: "the draw is the captain's device's alone",
  },
  {
    id: 'rejoin-forgotten-after-a-day',
    why: "P3.7 piece C, ruling (a): the room's code and the player's self are kept on the device only while they can still be used. Read back forever, a self would stay on a child's phone long after its room was gone.",
    file: 'packages/app/src/rejoin.ts',
    mutate: (t) =>
      t.replace(
        '  return age >= 0 && age < REJOIN_TTL_MS ? r.data : null;',
        '  return age >= 0 ? r.data : null;',
      ),
    gate: 'pnpm --filter @immunity-wars/app test',
    expect: 'is offered for a day, and not a moment longer',
  },
  {
    id: 'table-away-pieces-waiting',
    why: "P3.7 piece C, Gate A: an away player's pieces cannot be moved until the captain hands them on, so they must be listed as waiting, where the captain's buttons are. Counting only pieces nobody holds hides exactly the ones a drop leaves behind.",
    file: 'packages/ui/src/play/table.ts',
    mutate: (t) =>
      t.replace(
        '      .filter((r) => r.holder === null || r.holder.away)',
        '      .filter((r) => r.holder === null)',
      ),
    gate: 'pnpm --filter @immunity-wars/ui test',
    expect: 'lists every player with their pieces, and the pieces nobody can move',
  },
  {
    id: 'table-changes-said',
    why: 'P3.7 piece C, Gate A: who went away, who came back, who is captain now and who was handed which piece are said to everyone as they happen, so the table sees its own choices. Silenced, a drop is visible only to whoever goes looking.',
    file: 'packages/ui/src/play/table.ts',
    mutate: (t) => t.replace('  if (prev === null) return [];', '  return [];'),
    gate: 'pnpm --filter @immunity-wars/ui test',
    expect: 'says who went away and who came back',
  },
  {
    id: 'say-only-the-list',
    why: "The table's fixed messages (ruled 25 September 2026): no free-text chat in v1, so the room admits only the ids on its list. Without the check any id of the right shape would reach every screen in the room.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        "      if (!(SAY_MESSAGES as readonly string[]).includes(msg.message))\n        return reject(room, msg.ref, 'noSuchMessage');\n",
        '',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'are only the ones on the list',
  },
  {
    id: 'say-id-shape',
    why: "The table's fixed messages travel as a short id, never words (protocol v3). A message field that admitted any string would carry free text to the relay.",
    file: 'packages/protocol/src/messages.ts',
    mutate: (t) =>
      t.replace('const SayId = z.string().regex(SAY_ID);', 'const SayId = z.string();'),
    gate: 'pnpm --filter @immunity-wars/protocol test',
    expect: 'refuses a message that is not a short id',
  },
  {
    id: 'produce-for-offer',
    why: "The one Produce button (ruled 25 September 2026): for the chosen class it sends produceOffers' own offer, or says why not. Without the offer it would say no to a class the B-Cell can produce.",
    file: 'packages/ui/src/play/offered.ts',
    mutate: (t) => t.replace('  if (offer) return { offer, reason: null };\n', ''),
    gate: 'pnpm --filter @immunity-wars/session-tests test',
    expect: 'always answers, and only ever with the offer produceOffers makes',
  },
  {
    id: 'step-guard',
    why: "FINDINGS #90: a double tap on the play screen's advance button did the next step too; alone, Command your cells tapped twice ended the turn with every point unspent, at gaps of 80 to 400 ms. The button ignores a tap within half a second of its step changing.",
    file: 'packages/ui/src/play/stepGuard.ts',
    mutate: (t) => t.replace('  now - changedAt >= STEP_GUARD_MS;', '  now - changedAt >= 0;'),
    gate: 'pnpm --filter @immunity-wars/ui test',
    expect: 'is ignored at every gap a double tap was measured to end the turn at',
  },
  {
    id: 'view-queue-own-tail',
    why: "FINDINGS #89: played together, the next turn's draw can arrive while this device still animates a spread. The renderer's burst-tail check compared the spread's last frame with whatever view came LAST, and failed on a correct game. Each spread must be checked against the view it ended in.",
    file: 'packages/ui/src/play/viewQueue.ts',
    mutate: (t) => t.replace('      this.closing = null;\n', ''),
    gate: 'pnpm --filter @immunity-wars/ui test',
    expect: "the next turn's draw arriving mid-spread is not what the spread is checked against",
  },
  {
    id: 'view-queue-every-view',
    why: "FINDINGS #89: views that arrived during a spread were dropped but the latest, so the screen jumped from before the spread to the next draw and worked out that draw's arrivals against the state before the spread. Every view must be shown, in order.",
    file: 'packages/ui/src/play/viewQueue.ts',
    mutate: (t) =>
      t.replace(
        'return this.frames.length > 0 ? undefined : this.views.shift();',
        'return this.frames.length > 0 ? undefined : this.views.splice(0).at(-1);',
      ),
    gate: 'pnpm --filter @immunity-wars/ui test',
    expect: 'a whole next turn and its spread before this one finishes',
  },
  {
    id: 'room-rejoin-view',
    why: 'Gate A: a player who drops and rejoins gets the game back. Without the board sent to them on arrival they see nothing until somebody acts, and a table waiting for them will not.',
    file: 'packages/room/src/room.ts',
    mutate: (t) => t.replace('            ...current(back, msg.ref),\n', ''),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'hands a rejoining member the board',
  },
  {
    id: 'frame-limit',
    why: 'A gzip frame inflates about a thousandfold, so a limit on the bytes received is no limit on the bytes decoded. The relay listens on the open internet, where anyone can open a socket without a code.',
    file: 'packages/protocol/src/frame.ts',
    mutate: (t) => t.replace('        if (length > limit) {', '        if (false) {'),
    gate: 'pnpm --filter @immunity-wars/protocol test',
    expect: 'refuses a frame that would unpack past its limit',
  },
  {
    id: 'hub-order',
    why: "Gate A: every client's view agrees after every action. Unpacking is asynchronous, so a relay that handled frames as they finished unpacking would apply a player's actions out of order; the test makes a later frame finish first.",
    file: 'packages/server/src/hub.ts',
    mutate: (t) => t.replace('    const run = this.work.then(task);', '    const run = task();'),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: "handles one link's frames in arrival order",
  },
  {
    id: 'hub-takeover',
    why: "A phone that loses its network often reconnects before the old socket is known to be dead. If the old socket's close were still bound to the member, it would mark as away a member who is sitting right there.",
    file: 'packages/server/src/hub.ts',
    mutate: (t) => t.replace('          this.links.set(other, null);\n', ''),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'takes over from the old one',
  },
  {
    id: 'hub-connection-limits',
    why: 'The relay is on the open internet, where anyone can open sockets without a code. Without a cap, one sender can hold every connection the server has.',
    file: 'packages/server/src/hub.ts',
    mutate: (t) =>
      t.replace(
        '    if (this.counted.size >= this.limits.total || held >= this.limits.perAddress) {',
        '    if (false) {',
      ),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'refuses a connection past the per-address limit',
  },
  {
    id: 'hub-message-rate',
    why: 'Judged on arrival, before a frame waits its turn: a flood that is let into the queue delays every other player on the relay.',
    file: 'packages/server/src/hub.ts',
    mutate: (t) => t.replace('      if (c.tokens < 1) {', '      if (false) {'),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'closes a connection that sends past its burst',
  },
  {
    id: 'hub-wrong-codes',
    why: 'Knowing a code is the only way into a room (ruling 2). Unslowed, a guesser tries codes as fast as the network allows.',
    file: 'packages/server/src/hub.ts',
    mutate: (t) =>
      t.replace(
        '        this.recentWrongCodes(address, now) >= this.limits.wrongCodes',
        '        this.recentWrongCodes(address, now) >= Number.POSITIVE_INFINITY',
      ),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'makes an address wait after too many wrong codes',
  },
  {
    id: 'hub-join-deadline',
    why: 'A connection that never joins a room holds a place under the limits for nothing; enough of them fill the relay without a single message sent.',
    file: 'packages/server/src/hub.ts',
    mutate: (t) =>
      t.replace(
        '        if (this.links.get(link) === null && now - c.openedAt >= this.limits.joinWithinMs)',
        '        if (false)',
      ),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'closes a connection that never joins a room in time',
  },
  {
    id: 'node-forwarded-for-from-front-only',
    why: 'The relay believes X-Forwarded-For only from the TLS front on its own machine. Believed from anyone, the header lets any sender choose the address the limits count them by.',
    file: 'packages/server/src/node.ts',
    mutate: (t) =>
      t.replace(
        '  if (!trustProxy || !LOOPBACK.has(peer)) return peer;',
        '  if (!trustProxy) return peer;',
      ),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'ignores the header from anyone who is not this machine',
  },
  {
    id: 'node-heartbeat',
    why: 'Gate A: a drop is visible to everyone. A phone that loses its signal sends nothing, so only a ping it fails to answer can show the table that it has gone.',
    file: 'packages/server/src/node.ts',
    mutate: (t) =>
      t.replace(
        '      if (answered.get(socket) === false) {\n        socket.terminate();\n        continue;\n      }',
        '      if (answered.get(socket) === false) {\n        continue;\n      }',
      ),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'is marked away within a few heartbeats',
  },
  {
    id: 'bundle-recipe',
    why: 'P3.5 ruling 4: production runs ONE bundled file, and its one real risk is that the bundle is not the code the tests ran. A recipe that leaves a workspace package out builds without complaint and cannot start on the server.',
    file: 'packages/server/src/bundle.ts',
    mutate: (t) =>
      t.replace(
        "    external: ['bufferutil', 'utf-8-validate'],",
        "    external: ['bufferutil', 'utf-8-validate', '@immunity-wars/room'],",
      ),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'the bundle exited with',
  },
  {
    id: 'relay-selection-boundary',
    why: 'A relay client clears the selection where LocalSession does: after a draw or an end of turn, and not when command begins. Read off the view, because another player may cross the boundary; phase is the tempting and wrong signal.',
    file: 'packages/session/src/relay.ts',
    mutate: (t) =>
      t.replace(
        "JSON.stringify([view['turn'] ?? null,",
        "JSON.stringify([view['phase'], view['turn'] ?? null,",
      ),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'clears the selection where LocalSession clears it',
  },
  {
    id: 'relay-scoped-selection',
    why: 'The relay sends every scoped answer; the client must serve the one its selection asks for. Serving none would look fine until a player tapped a cell and saw nowhere to move.',
    file: 'packages/session/src/relay.ts',
    mutate: (t) =>
      t.replace(
        'scopeFrom(this.latest.scoped as unknown as AllScoped, this.selection)',
        'scopeFrom(this.latest.scoped as unknown as AllScoped, NO_SELECTION)',
      ),
    gate: 'pnpm --filter @immunity-wars/server test',
    expect: 'shows a relay client exactly what LocalSession shows',
  },
  {
    id: 'session-core-scope-from',
    why: 'scopeFrom is the one piece of query code only a relay client runs. Reading a family breakdown from the wrong key would show every family the same numbers.',
    file: 'packages/session-core/src/build.ts',
    mutate: (t) =>
      t.replace(
        'productionDetail: family ? (all.productionDetail[family] ?? null) : null,',
        "productionDetail: family ? (all.productionDetail['ENV'] ?? null) : null,",
      ),
    gate: 'pnpm --filter @immunity-wars/session-tests test',
    expect: 'reads, for every selection, exactly what',
  },
  {
    id: 'session-core-pure',
    why: "The relay runs the engine's queries seven times where LocalSession runs them once. A query that wrote to the game it read would make a relay game drift from the same game played alone.",
    file: 'packages/session-core/src/build.ts',
    mutate: (t) =>
      t.replace(
        '  return { moveDestinations, productionDetail };',
        "  g['__control'] = 1;\n  return { moveDestinations, productionDetail };",
      ),
    gate: 'pnpm --filter @immunity-wars/session-tests test',
    expect: 'computes every answer at once without changing the game',
  },
  {
    id: 'engine-captaincy-holder-only',
    why: 'DEVIATIONS #7: only the current captain may hand the captaincy over. Without the check, any player — or a client the room failed to stop — could seize it.',
    file: 'packages/engine/src/actions.ts',
    mutate: (t) =>
      t.replace(
        "      if (a.pid !== g.captain) return err('Only the captain can hand over the captaincy.');",
        '',
      ),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/captaincy.test.ts',
    expect: 'refuses anyone but the captain',
  },
  {
    id: 'format',
    why: 'Added at F0 after 21 files drifted out of style unnoticed. It fired on its own commit.',
    file: 'packages/engine/src/index.ts',
    mutate: (t) => `${t}\nexport const    _ctlBadFormat   =    1;\n`,
    gate: 'pnpm format:check',
    expect: 'Code style issues',
  },
  {
    id: 'manifest',
    why: 'Softening the reconciliation sentence must go red rather than reach the dashboard.',
    file: 'tests/suites.json',
    mutate: (t) => t.replace('There is no unit suite. ', ''),
    gate: 'npx vitest run --root tests/manifest',
    expect: 'reconciliation sentence verbatim',
  },
  {
    id: 'manifest-coupling',
    why: 'FINDINGS #45: a control expectation naming a renamed test title strands the control silently, and the harness cadence rule proved unpractised at P2.1. coupling.test.ts must redden the fast tier the moment an expectation and a title disagree.',
    file: 'tests/manifest/controls-data.ts',
    mutate: (t) =>
      t.replace(
        "'is five suites and three cross-cutting properties',\n      'records the absent unit suite as absent',",
        "'is four suites and three cross-cutting properties',\n      'records the absent unit suite as absent',",
      ),
    gate: 'npx vitest run --root tests/manifest',
    expect: 'no longer matches any test title',
  },
  {
    id: 'aggregate',
    why: 'The CI-shaped blind check: a green build because a needed job was SKIPPED.',
    file: 'tools/ci/aggregate.ts',
    // Make `skipped` count as success — the exact bug the naive YAML expression has.
    mutate: (t) =>
      t.replace(
        "if (result === 'success') {",
        "if (result === 'success' || result === 'skipped') {",
      ),
    gate: 'npx vitest run --root tools/ci',
    expect: 'SKIPPED job is not green',
  },
  {
    id: 'dashboard-caveat',
    why: 'A size figure published without its censoring row reads as an estimate. It is a floor.',
    file: 'tools/dashboard/render.ts',
    mutate: (t) => t.replace('This is a floor, not an estimate.', 'Measured state size.'),
    gate: 'npx vitest run --root tools/dashboard',
    expect: 'floor, not an estimate',
  },
  // ------------------------------------------------------------------------------------------
  // The coverage documents' positions. THREE controls, and the first two are a matched pair on
  // ONE file: the same edit at opposite ends of packages/content/src/schema.ts. Prepending moves
  // every recorded arm below it and must go red; appending moves nothing and must stay green.
  // Without the second, a check that reddened on ANY source edit would satisfy the first.
  // ------------------------------------------------------------------------------------------
  {
    id: 'coverage-positions-shifted',
    why: 'PR #70: adding the WHY and DERIVED schemas pushed four arms down schema.ts, the coverage GATE passed, and the drift check failed on four line numbers. pnpm verify does not run coverage, so it had been green.',
    file: 'packages/content/src/schema.ts',
    mutate: (t) => `// control: one line inserted above every arm in this file\n${t}`,
    gate: 'pnpm coverage:positions',
    expect: 'THE GENERATED COVERAGE DOCUMENTS ARE STALE',
  },
  {
    id: 'coverage-positions-untouched',
    why: 'The permitted half. A source edit that moves no recorded position must NOT red the check — otherwise "forbid X" is satisfied by a rule that forbids every edit, and the check becomes noise someone turns off.',
    file: 'packages/content/src/schema.ts',
    mutate: (t) => `${t}\n// control: one line appended below every arm in this file\n`,
    gate: 'pnpm coverage:positions',
    expect: '(unused — mustPass control)',
    mustPass: true,
  },
  {
    id: 'coverage-positions-no-globs',
    why: 'The check reads the instrumented roots from vitest.coverage.config.ts rather than restating them. If it cannot read them it must SAY SO, not fall back to a guess — a fallback is how a check ends up confidently measuring something other than what it names.',
    file: 'vitest.coverage.config.ts',
    mutate: (t) => t.replace(/(\n\s+)include:(\s*\[\s*'packages)/, '$1includeRenamed:$2'),
    gate: 'pnpm coverage:positions',
    expect: 'declares no `include` inside its `coverage:` block',
  },
  {
    id: 'coverage-positions-unresolvable',
    why: 'A base name the check cannot resolve must FAIL rather than be skipped. queries.ts, effects.ts and schema.ts each exist twice here, and a silently skipped entry shrinks the checked set invisibly — the shape of every blind check this project has found.',
    file: 'docs/COVERAGE_DEFERRED.md',
    mutate: (t) => t.replace(/`schema\.ts:/g, '`schema_absent.ts:'),
    gate: 'pnpm coverage:positions',
    expect: 'NO INSTRUMENTED FILE IS NAMED',
  },
  {
    id: 'react-pair-split',
    why: 'FINDINGS #92: Dependabot moved react-dom to 19.3.0 and left react at 19.2.8. React refuses to start unless the two are the same version (its error #527), and typecheck, lint, every suite and CI stayed green over a blank app. The lockfile carrying exactly that split must be refused.',
    file: 'pnpm-lock.yaml',
    mutate: (t) =>
      t.replace(/react-dom@([^\s()':]+)\(react@[^\s()':]+\)/, 'react-dom@$1(react@19.2.8)'),
    gate: 'pnpm deps:check',
    expect: 'REACT PAIR SPLIT',
  },
  {
    id: 'react-pair-unread',
    why: 'A lockfile in which the check finds no react-dom must fail, not pass: a check that read nothing has checked nothing, and a pattern that stopped matching after a lockfile format change would otherwise stay green for ever.',
    file: 'pnpm-lock.yaml',
    mutate: (t) => t.replace(/react-dom@/g, 'react-dom-renamed@'),
    gate: 'pnpm deps:check',
    expect: 'REACT PAIR UNREAD',
  },
  {
    id: 'react-pair-moved-together',
    why: 'The check must permit what React permits: react and react-dom moving together, to any version. A check that pinned one version instead of comparing the two would pass every control above and refuse the next correct upgrade.',
    file: 'pnpm-lock.yaml',
    mutate: (t) =>
      t.replace(/react-dom@[^\s()':]+\(react@[^\s()':]+\)/, 'react-dom@19.9.9(react@19.9.9)'),
    gate: 'pnpm deps:check',
    expect: '(unused — mustPass control)',
    mustPass: true,
  },
  {
    id: 'clay-gate-reads-the-pictures',
    why: "Stage L3: the Clay pieces are held to 3:1 against the lit board and the base's well, measured from the renders. A gate that passed whatever it was shown would pass a piece nobody can see. With the bound raised to 4:1 the real set must FAIL, because its lowest picture measures about 3.3: that the gate goes red on real pictures is what shows it is reading them.",
    file: 'tools/art-pipeline/clay.ts',
    mutate: (t) => t.replace('const MIN_CONTRAST = 3.0;', 'const MIN_CONTRAST = 4.0;'),
    gate: 'pnpm art:clay:check',
    expect: 'CONTRAST GATE',
  },
  {
    id: 'clay-manifest-not-measured',
    why: 'The manifest is the contract the app reads, and it must record what was measured, never what was hoped. A measured ratio edited by hand in the manifest, with the render untouched, must turn the check red.',
    file: 'tools/art-pipeline/clay/built/manifest.json',
    mutate: (t) => t.replace(/"board": \d+\.?\d*/, '"board": 9.99'),
    gate: 'pnpm art:clay:check',
    expect: 'MANIFEST RECORDS WHAT WAS NOT MEASURED',
  },
  {
    id: 'clay-output-not-recorded',
    why: 'An output picture that is not the one the manifest records (rebuilt by hand, edited, or left behind by an older run) must turn the check red: the app would be showing a picture the gate never saw.',
    file: 'tools/art-pipeline/clay/built/manifest.json',
    mutate: (t) => t.replace(/"sha256": "[0-9a-f]{8}/g, '"sha256": "00000000'),
    gate: 'pnpm art:clay:check',
    expect: 'OUTPUT IS NOT WHAT THE MANIFEST RECORDS',
  },
  {
    id: 'start-check-refuses',
    why: 'FINDINGS #92, ruled 26 September 2026: a build that does not start is never deployed. The React split made the app throw as it loaded, and every other check passed it; a build that throws as it loads must be refused. (Also measured by hand against the real split build, which it refused with React error #527.)',
    file: 'packages/app/src/main.tsx',
    mutate: (t) => `throw new Error('start-check control: this build does not start');\n${t}`,
    gate: 'pnpm start:check --build',
    expect: 'DID NOT START',
  },
  {
    id: 'start-check-words-free',
    why: 'The check waits for the title itself, not for its words. A check that looked for "New game" would refuse the Hindi edition, a committed grant deliverable, and every rewording after it.',
    file: 'packages/content/src/i18n/en/ui.json',
    mutate: (t) => t.replace('"title.newGame": "New game"', '"title.newGame": "नया खेल"'),
    gate: 'pnpm start:check --build',
    expect: '(unused — mustPass control)',
    mustPass: true,
  },
  {
    id: 'body-drawer-captain-only',
    why: "Ruled 26 September 2026, after the P3.6 session: played together, the Body drawer is the captain's alone. A perspective that gave the body to every player would show it to a player who is neither captain nor B-Cell, as it did in the session.",
    file: 'packages/ui/src/play/table.ts',
    mutate: (t) => t.replace('body: room.captain === me,', 'body: true,'),
    gate: 'pnpm --filter @immunity-wars/ui test',
    expect: 'are Cells alone for a player who is neither',
  },
  {
    id: 'antibodies-drawer-bcell-only',
    why: "Ruled the same day: the Antibodies drawer, where antibodies are produced, is the B-Cell's player's alone. Offered to every player, the captain without the B-Cell would have it.",
    file: 'packages/ui/src/play/table.ts',
    mutate: (t) =>
      t.replace("if (seats.mine('bcell')) tabs.push('antibodies');", "tabs.push('antibodies');"),
    gate: 'pnpm --filter @immunity-wars/ui test',
    expect: 'are Cells and the Body for the captain',
  },
  {
    id: 'body-rings-captain-only',
    why: "The memory response and antivenom are offered as rings on the board as well as in the Body drawer, so hiding the drawer alone would have left them to every player (FINDINGS #94). With nothing selected, anyone but the captain is offered none of the body's actions.",
    file: 'packages/ui/src/play/offered.ts',
    mutate: (t) =>
      t.replace(
        '  if (!cell && !resident) return seats.body ? bodyOffers(view) : NO_BODY;',
        '  if (!cell && !resident) return bodyOffers(view);',
      ),
    gate: 'pnpm --filter @immunity-wars/session-tests test',
    expect: 'none of them to anyone else',
  },
  {
    id: 'start-needs-pieces',
    why: 'Ruled 26 September 2026, after the P3.6 session: the game starts only when every connected player but the captain holds a piece. Without the rule a player with none is in the game with nothing to command, and Action Points they cannot spend.',
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        "      if (unseated) return reject(room, msg.ref, 'someoneUnseated', unseated.name);\n",
        '',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'refuses the start while a connected player other than the captain holds none',
  },
  {
    id: 'room-cap-15',
    why: 'Ruled the same day: a room holds at most fifteen. Until then there was no limit, so a code shared widely could fill a room without end.',
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        "      if (room.members.length >= MAX_MEMBERS) return reject(room, msg.ref, 'roomFull');\n",
        '',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'admits the fifteenth and refuses the sixteenth',
  },
  {
    id: 'away-pieceless-left-out',
    why: 'A player away and holding nothing when the game starts is left out of it. Kept in, they would be a player with nothing, and counting them before the start would let one closed app keep a room from ever starting.',
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        '      const players = room.members.filter((m) => m.connected || m.seats.length > 0);',
        '      const players = room.members;',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'leaves out a player who is away and holds nothing',
  },
  {
    id: 'engine-undo-refunds-budget',
    why: "DEVIATIONS #8, ruled 27 September 2026: played together, undo gives the player's Action Points back. Legacy's snapshot did not hold the budgets, so an undo returned the piece and kept the point spent.",
    file: 'packages/engine/src/view.ts',
    mutate: (t) =>
      t.replace('    ...(g.multiplayer ? { apBudget: clone(g.apBudget) } : {}),\n', ''),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/undo-budget.test.ts',
    expect: "the port's gives it back",
  },
  {
    id: 'engine-undo-budget-together-only',
    why: "DEVIATIONS #8's confinement: the budgets are saved in a snapshot only in a game played together. Saved alone as well, every single-player snapshot would differ from legacy's.",
    file: 'packages/engine/src/view.ts',
    mutate: (t) =>
      t.replace(
        '    ...(g.multiplayer ? { apBudget: clone(g.apBudget) } : {}),',
        '    apBudget: clone(g.apBudget),',
      ),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/undo-budget.test.ts',
    expect: 'never alone',
  },
  {
    id: 'coverage-rule-a-arm-precise',
    why: "FINDINGS #97: the coverage gate's rule A decided by the LINE, so arms that only shared a line with a `??` were excluded as defensive: a live left operand (ap.ts:31), a ternary's else, and an `||` between two real alternatives (simulate.ts:167). It decides by the operator that led to the arm now; an `||` is a fallback only before a literal.",
    file: 'tests/equivalence/src/rule-a.ts',
    mutate: (t) =>
      t.replace(
        "(a.op === '??' || (a.op === '||' && LITERAL.test(a.span)))",
        "(a.op === '??' || a.op === '||')",
      ),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/rule-a.test.ts',
    expect: 'keeps an || that is a real alternative',
  },
  {
    id: 'engine-mp-arms-held-to-legacy',
    why: "The multiplayer arms Phase 3 owed are held to legacy byte for byte (multiplayer-arms.test.ts). A port that said '1 Action Points' at a pool of one would differ from legacy in its log, the one arm reached only by a constructed state.",
    file: 'packages/engine/src/actions.ts',
    mutate: (t) => t.replace("Action Point${pool === 1 ? '' : 's'}", 'Action Points'),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/multiplayer-arms.test.ts',
    expect: 'singular, when the pool is exactly one',
  },
  {
    id: 'engine-spendap-no-player',
    why: 'DEVIATIONS #9, ruled 30 September 2026: the port\'s spendAP writes no budget for no player, where legacy writes one named "null". A port without its guard would match legacy there, and the ruled difference would be gone unseen unless the two cases pinning it (multiplayer-arms.test.ts) said so.',
    file: 'packages/engine/src/ap.ts',
    mutate: (t) => t.replace('  if (pid == null) return;\n', ''),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/multiplayer-arms.test.ts',
    expect: 'the port writes nothing',
  },
  {
    id: 'selftest-inert-on-every-verify',
    why: 'FINDINGS #100: a control whose mutation matches nothing checks nothing, and room-no-ref-in-view was that for five days, because only a full run noticed. --inert runs on every verify; a line reworded under a control, the same meaning in other words, must turn it red.',
    file: 'packages/engine/src/ap.ts',
    mutate: (t) =>
      t.replace(
        '  if (pid == null) return;\n',
        '  if (pid === null || pid === undefined) return;\n',
      ),
    gate: 'pnpm -s ci:selftest:inert',
    expect: 'engine-spendap-no-player THE MUTATION DID NOTHING',
  },
  {
    id: 'update-reload-after-switch',
    why: 'FINDINGS #93, Update now ruled 28 September 2026: the page must reload AFTER the newer version has taken over. A reload first brings the older version back, which is the failure of the P3.6 morning.',
    file: 'packages/app/src/serviceWorker.ts',
    mutate: (t) =>
      t.replace(
        '  const outcome = await takeNewerWorker(container, timeoutMs);\n  reload();\n',
        '  reload();\n  const outcome = await takeNewerWorker(container, timeoutMs);\n',
      ),
    gate: 'pnpm --filter @immunity-wars/app exec vitest run src/serviceWorker.test.ts',
    expect: 'and the reload comes after it has',
  },
  {
    id: 'update-only-for-version',
    why: 'FINDINGS #93: Update now answers one refusal, the versions differing. Offered under any other, it would reload a phone for nothing and take it out of its room.',
    file: 'packages/ui/src/together/model.ts',
    mutate: (t) =>
      t.replace(
        "export const offersUpdate = (code: string): boolean => code === 'version';",
        "export const offersUpdate = (code: string): boolean => code !== '';",
      ),
    gate: 'pnpm --filter @immunity-wars/ui exec vitest run src/together/model.test.ts',
    expect: 'no other refusal offers it',
  },
  {
    id: 'update-worker-contract',
    why: "FINDINGS #93: the message that tells the newer worker to take over is the plugin's, not ours. The build test holds our message to the worker the build emits, so a message that no longer matches it must turn the build test red.",
    file: 'packages/app/src/serviceWorker.ts',
    mutate: (t) =>
      t.replace(
        "export const SKIP_WAITING = { type: 'SKIP_WAITING' } as const;",
        "export const SKIP_WAITING = { type: 'SKIP_WAITING_NOW' } as const;",
      ),
    gate: 'pnpm --filter @immunity-wars/app exec vitest run src/entries-build.test.ts',
    expect: 'which Update now depends on',
  },
  {
    id: 'update-check-reload-alone',
    why: 'FINDINGS #93: the P3.6 morning itself. A button that only reloads the page brings back the older version, because the newer one waits until it is told to take over; the update check must refuse it.',
    file: 'packages/app/src/main.tsx',
    mutate: (t) =>
      t.replace(
        '  void updateNow(browserUpdates(), () => window.location.reload());',
        '  void browserUpdates;\n  void updateNow;\n  window.location.reload();',
      ),
    gate: 'pnpm update:check',
    expect: 'still ran the older build',
  },
  {
    id: 'update-check-no-button',
    why: 'FINDINGS #93: the version refusal must offer Update now on the screen where the P3.6 session met it, Create a room; the update check must refuse a build where it does not.',
    file: 'packages/ui/src/screens/TogetherScreen.tsx',
    mutate: (t) =>
      t.replace(
        '{refusal && onUpdate && offersUpdate(refusal.code) ? <UpdateNow onUpdate={onUpdate} /> : null}',
        '{refusal && onUpdate && offersUpdate(refusal.code) ? null : null}',
      ),
    gate: 'pnpm update:check',
    expect: 'offered no Update now',
  },
  {
    id: 'update-title-no-loop',
    why: 'FINDINGS #93, ruled 30 September 2026: the title takes a newer version by itself, and reloads only once it has taken over. A reload that brought the same version back would find the same waiting worker and reload again, for ever.',
    file: 'packages/app/src/serviceWorker.ts',
    mutate: (t) => t.replace("    if (outcome === 'switched') reload();", '    reload();'),
    gate: 'pnpm --filter @immunity-wars/app exec vitest run src/serviceWorker.test.ts',
    expect: 'so it cannot reload for ever',
  },
  {
    id: 'update-watch-first-install',
    why: 'FINDINGS #93: a first install is not a newer version. A page nothing answers yet has no older version to replace, and telling its new worker to take over would wait for a switch that never comes.',
    file: 'packages/app/src/serviceWorker.ts',
    mutate: (t) =>
      t.replace(
        "worker.state === 'installed' && container.controller !== null) listener();",
        "worker.state === 'installed') listener();",
      ),
    gate: 'pnpm --filter @immunity-wars/app exec vitest run src/serviceWorker.test.ts',
    expect: 'a first install is not a newer version',
  },
  {
    id: 'update-check-title-takes-it',
    why: 'FINDINGS #93, ruled 30 September 2026: on the title, a newer version is taken by itself. Without it every deploy reaches a returning player only once every copy of the app is closed; the update check must refuse a build that never takes it.',
    file: 'packages/app/src/main.tsx',
    mutate: (t) =>
      t.replace(
        '    if (!onTitle) return undefined;',
        '    if (onTitle || !onTitle) return undefined;',
      ),
    gate: 'pnpm update:check',
    expect: 'the title did not take the newer build by itself',
  },
  {
    id: 'update-check-title-only',
    why: 'FINDINGS #93, ruled 30 September 2026: the title ONLY. A reload in a game would drop a game played together; the update check must refuse a build that takes a newer version anywhere.',
    file: 'packages/app/src/main.tsx',
    mutate: (t) =>
      t.replace(
        "  const onTitle = screen.name === 'title';",
        "  const onTitle = screen.name !== 'nowhere';",
      ),
    gate: 'pnpm update:check',
    expect: 'the page reloaded during a game',
  },
  {
    id: 'room-rematch-captain-only',
    why: "Another game in the same room (protocol v5, ruled 30 September 2026) is the captain's to start, as a game is. A room that let anyone call it would let any guest end the Result for everyone.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        "starts it.\n      if (room.captain !== msg.ref) return reject(room, msg.ref, 'notCaptain');\n",
        'starts it.\n',
      ),
    gate: 'pnpm --filter @immunity-wars/room exec vitest run src/room.test.ts',
    expect: 'only the captain may, as only the captain starts a game',
  },
  {
    id: 'room-rematch-after-the-end-only',
    why: 'Another game in the same room follows a game that has ENDED. Called mid-game, it would throw away a game in progress for everyone at the table.',
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        "      if (room.phase === 'playing') return reject(room, msg.ref, 'alreadyStarted');\n",
        '',
      ),
    gate: 'pnpm --filter @immunity-wars/room exec vitest run src/room.test.ts',
    expect: 'not in a game under way',
  },
  {
    id: 'room-rematch-keeps-seats',
    why: "Ruled 30 September 2026: everyone's pieces carry over from the last game into the lobby. A rematch that emptied the seats would have every player claim theirs again.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        "const next: RoomState = { ...room, phase: 'lobby', game: null, undoRun: null };",
        "const next: RoomState = { ...room, members: room.members.map((m) => ({ ...m, seats: [] })), phase: 'lobby', game: null, undoRun: null };",
      ),
    gate: 'pnpm --filter @immunity-wars/room exec vitest run src/room.test.ts',
    expect: 'the same people in the same seats',
  },
  {
    id: 'session-rematch-new-session',
    why: "Protocol v5: after a rematch the phone must begin a NEW session with the next game's first view. One that kept the last would hand the new game's views to a finished game's session, and the play screen would open on the old game.",
    file: 'packages/session/src/relay.ts',
    mutate: (t) =>
      t.replace("        if (msg.room.phase === 'lobby') this.relaySession = null;\n", ''),
    gate: 'pnpm --filter @immunity-wars/server exec vitest run src/relay.test.ts',
    expect: 'the next game is a new session',
  },
  {
    id: 'queue-q3-no-play-change',
    why: "Queue Q3 (Kartik, 5 September 2026) declares Pathogen X's tropism as any, a generalist on purpose, where it had been a lookup miss. It must change no play: an engine that no longer read any as a missing entry would roll it for a different organ than the original, untouched.",
    file: 'packages/engine/src/construct.ts',
    mutate: (t) => t.replace("if (declared === 'any' || !declared) {", 'if (!declared) {'),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/pathogen-x.test.ts',
    expect: 'rolls the same organ in the original',
  },
  {
    id: 'queue-q7-engine-reads-content',
    why: "Queue Q7 moved the actions' own numbers into content, one source for the engine and the screens. An engine still holding its own literal would ignore content; changing content's antivenom cost must make the engine disagree with the original.",
    file: 'packages/content/src/rules/tuning.json',
    mutate: (t) => t.replace('"ANTIVENOM_AP": 3,', '"ANTIVENOM_AP": 4,'),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/coverage-scenarios.test.ts',
    expect: 'antivenom in stock but not enough AP',
  },
  {
    id: 'queue-q10-science-gone',
    why: 'Queue Q10 (Shantanu, 6 September 2026) removed the inert science field from the state and the view, in the port and in the original as ruled. A view that still carried it must disagree with the oracle.',
    file: 'packages/engine/src/view.ts',
    mutate: (t) =>
      t.replace('    lost: g.lost,\n  };', '    lost: g.lost,\n    science: false,\n  };'),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/construct.test.ts',
    expect: 'projects identically across the whole B2 state corpus',
  },
  {
    id: 'queue-q2-no-free-actions',
    why: "Queue Q2 (Kartik, 5 September 2026) removed the Helper T-Cell's free-action slot, which also closed FINDINGS #99. A no-points gate that still let a free action through must let the hand-built action of #99 past it again.",
    file: 'packages/engine/src/actions.ts',
    mutate: (t) =>
      t.replace(
        "if (apNow(g) <= 0 && !freeNow && !resFree) return err('No Action Points.');",
        "if (apNow(g) <= 0 && !freeNow && !resFree && !((g as unknown as { free?: Record<string, number> }).free?.[ck as string] ?? 0)) return err('No Action Points.');",
      ),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/multiplayer-arms.test.ts',
    expect: 'is refused before anything is spent',
  },
  {
    id: 'queue-q5-old-save-carried-forward',
    why: 'Ruled 30 September 2026: a game saved before the engine change queue is carried forward. Its save has no id counter (queue Q5 put it in the state), so the session works one out from the ids the game holds. Without that, the next arrival after a resume gets no proper id.',
    file: 'packages/session-core/src/ids.ts',
    mutate: (t) =>
      t.replace("  if (typeof g['idCounter'] !== 'number') g['idCounter'] = highestId(g);\n", ''),
    gate: 'pnpm --filter @immunity-wars/session-tests exec vitest run src/resume-ids.test.ts',
    expect: 'plays on with every id unique',
  },
  {
    id: 'queue-q4-antivenom-no-memory',
    why: 'Queue Q4 (Kartik, 5 September 2026; FINDINGS #55): antivenom is passive immunity, so a kill by it teaches the body nothing. An engine that granted memory for it again must fail against the original as ruled.',
    file: 'packages/engine/src/effects.ts',
    mutate: (t) => t.replace("      by !== 'antivenom' &&\n", ''),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/queue-rules.test.ts',
    expect: 'no memory of it is left',
  },
  {
    id: 'queue-q9-burn-where-the-fight-is',
    why: 'Queue Q9 (FINDINGS #57): an eosinophil degranulating burns the tissue it is in, so the organ burns only when the fight is at branch step 0. An engine that burned it from anywhere on the branch again must fail against the original as ruled.',
    file: 'packages/engine/src/actions.ts',
    mutate: (t) =>
      t.replace(
        "if (iv.zone === 'branch' && iv.step === 0 && iv.organ && g.organs[iv.organ]) {",
        "if (iv.zone === 'branch' && iv.organ && g.organs[iv.organ]) {",
      ),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/queue-rules.test.ts',
    expect: 'at step 1, leaves the organ whole',
  },
  {
    id: 'queue-q1-antigenic-variation-reachable',
    why: 'Queue Q1 (Kartik, 5 September 2026, option (a); FINDINGS #4): antibodies may attempt a trypanosome, so the coat change that teaches why sleeping sickness has no vaccine can happen. An engine that turned it away again must fail against the original as ruled.',
    file: 'packages/engine/src/actions.ts',
    mutate: (t) =>
      t.replace(
        "(iv.type === 'malaria' && (iv.stage === 'blood' || iv.stage === 'sporozoite')) ||\n        (iv.type === 'parasite' && !!iv.variant);\n      if (!ok2)",
        "(iv.type === 'malaria' && (iv.stage === 'blood' || iv.stage === 'sporozoite'));\n      if (!ok2)",
      ),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/queue-rules.test.ts',
    expect: 'is offered and accepted in the port',
  },
  {
    id: 'queue-q6-recall-undoable',
    why: "Queue Q6 (Kartik, 5 September 2026; FINDINGS #5): a resident's Recall is a move, so undo takes it back, point and all. An engine that took no snapshot before it could not undo it.",
    file: 'packages/engine/src/actions.ts',
    mutate: (t) => t.replace("  'resrecall',\n  'resengulf',\n]);", "  'resengulf',\n]);"),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/queue-rules.test.ts',
    expect: 'undo takes it back',
  },
  {
    id: 'queue-q6-recall-in-the-move-class',
    why: "Queue Q6: the session's move class decides what a player may take back, alone and together. A Recall left out of it would end undo like an attack.",
    file: 'packages/session-core/src/moves.ts',
    mutate: (t) => t.replace("  'resrecall',\n", ''),
    gate: 'pnpm --filter @immunity-wars/session-tests exec vitest run src/resident-reasons.test.ts',
    expect: 'can be undone, like any move',
  },
  {
    id: 'queue-q6-recall-offered-where-accepted',
    why: 'Queue Q6: the screens offer Recall exactly where the engine accepts it. Offered from the organ box itself, it would be a button the engine refuses.',
    file: 'packages/ui/src/play/offered.ts',
    mutate: (t) =>
      t.replace(
        'if (canPatrol && ap > 0 && step > 0 && !infected) {',
        'if (canPatrol && ap > 0 && step >= 0 && !infected) {',
      ),
    gate: 'pnpm --filter @immunity-wars/session-tests exec vitest run src/resident-reasons.test.ts',
    expect: 'is NOT offered from the organ box',
  },
  {
    id: 'queue-q8-toast-by-template',
    why: 'Queue Q8 (FINDINGS #102): a rejection that carries a value renders through the catalogue. The toast looked strings up exactly, so "Antivenom costs 3 AP." rendered as a loud marker whatever the catalogue held.',
    file: 'packages/ui/src/engineText.ts',
    mutate: (t) =>
      t.replace(
        '  const r = engineLogText(message);\n  return r.matched ? r.text : `⟪engine: ${message}⟫`;',
        '  const key = KEY_OF_TEXT.get(message);\n  return key === undefined ? `⟪engine: ${message}⟫` : (ENGINE_I18N_EN[key] ?? message);',
      ),
    gate: 'pnpm --filter @immunity-wars/session-tests exec vitest run src/engine-text.test.ts',
    expect: 'two refusals the engine writes with a value in them render as themselves',
  },
  {
    id: 'queue-q8-own-entry-in-the-catalogue',
    why: "Queue Q8 (FINDINGS #102): every catalogue message comes back by its own entry, the one a translator translates. Ordered by template length with the placeholder names counted, the crisis event's entry claimed the rare event's line: the same English, the wrong sentence in Hindi.",
    file: 'packages/ui/src/engineText.ts',
    mutate: (t) =>
      t.replace(
        'out.sort((a, b) => literalLength(b.template) - literalLength(a.template));',
        'out.sort((a, b) => b.template.length - a.template.length);',
      ),
    gate: 'pnpm --filter @immunity-wars/session-tests exec vitest run src/engine-text.test.ts',
    expect: 'comes back as itself, by its own entry',
  },
  {
    id: 'queue-q8-no-ambiguous-log-line',
    why: 'Queue Q8 (FINDINGS #102): on recorded play, where two catalogue entries match one log line, the one fixing the most text is chosen, strictly. English renders a wrong choice as the same words, so only this can see it.',
    file: 'packages/ui/src/engineText.ts',
    mutate: (t) =>
      t.replace(
        'out.sort((a, b) => literalLength(b.template) - literalLength(a.template));',
        'out.sort((a, b) => b.template.length - a.template.length);',
      ),
    gate: 'pnpm --filter @immunity-wars/session-tests exec vitest run src/log-text.test.ts',
    expect: 'no line is ambiguous',
  },
  {
    id: 'queue-q8-rare-event-once',
    why: "Queue Q8 (FINDINGS #58, corrected): the engine logs a rare event itself, at the end of fireRare, and always has. The screens added a second line on the premise that it did not, so each rare event was in the log twice until the engine's line scrolled out.",
    file: 'packages/ui/src/play/effects.ts',
    mutate: (t) =>
      t.replace(
        "    (l) => ({ t: Number(l.t ?? 0), msg: String(l.msg ?? ''), kind: String(l.kind ?? '') }),\n  );\n}",
        "    (l) => ({ t: Number(l.t ?? 0), msg: String(l.msg ?? ''), kind: String(l.kind ?? '') }),\n  ).concat(g['rareBanner'] ? [{ t: 0, msg: `Rare event: ${String((g['rareBanner'] as { name?: unknown }).name)}`, kind: 'bad' }] : []);\n}",
      ),
    gate: 'pnpm --filter @immunity-wars/session-tests exec vitest run src/engine-text.test.ts',
    expect: 'a rare event is in the log once',
  },
  {
    id: 'queue-q8-no-composed-log-site',
    why: 'Queue Q8 (FINDINGS #53): every log line and rejection is a literal the catalogue can hold. A message composed into a variable first reaches the player in English whatever the catalogue says, as five did until Q8.',
    file: 'packages/engine/src/actions.ts',
    mutate: (t) =>
      t.replace(
        "else pushLog(g, `Antibody <b>tagged</b> ${iv.disease}.`, 'good');",
        "else {\n        const tagged = `Antibody <b>tagged</b> ${iv.disease}.`;\n        pushLog(g, tagged, 'good');\n      }",
      ),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/i18n-engine.test.ts',
    expect: 'a log line or rejection composed where the catalogue cannot see it',
  },
  {
    id: 'queue-q8-no-log-line-misses',
    why: 'Queue Q8: no recorded log line misses the catalogue. A line the catalogue lost would render plainly, in English, in the Hindi edition, and nothing on the screen would say so.',
    file: 'packages/content/src/i18n/en/engine.json',
    mutate: (t) =>
      t.replace('  "actions.monocyteEngulfed": "<b>Monocyte</b> engulfed {disease}.",\n', ''),
    gate: 'pnpm --filter @immunity-wars/session-tests exec vitest run src/log-text.test.ts',
    expect: 'no log line misses the catalogue',
  },
  {
    id: 'balance-bands-24-arms',
    why: "FINDINGS #103: the documented recalibration command ran 8 arms and said 24. Bands on 8 arms sat at 0.72x their analytic floor and inflated every σ by ~28% (#35), so a bands file below the rule's 24 must not ship.",
    file: 'tests/balance/bands.json',
    mutate: (t) => t.replace('"arms": 24,', '"arms": 8,'),
    gate: 'pnpm --filter @immunity-wars/balance exec vitest run src/bands.test.ts',
    expect: 'was calibrated on the 24 independent arms the rule requires',
  },
  {
    id: 'balance-bands-current-rules',
    why: 'FINDINGS #103: bands measured on other rules name a game nobody plays. A rules version that moves without a recalibration must fail in the fast tier, not wait for someone to read the provenance.',
    file: 'packages/content/src/rules/pack.json',
    mutate: (t) => t.replace(/"rulesVersion": "[^"]+"/, '"rulesVersion": "9.9.9"'),
    gate: 'pnpm --filter @immunity-wars/balance exec vitest run src/bands.test.ts',
    expect: 'was measured on the rules and content version the engine carries',
  },
  {
    id: 'reachability-report-whole',
    why: "FINDINGS #104: the reachability report's currency check sampled two numbers, so when queue Q3 declared Pathogen X's tropism the report went on saying it had none, and the check passed. It compares the whole report now.",
    file: 'docs/CONTENT_REACHABILITY.md',
    mutate: (t) => t.replace('TROPISM: **107 entries**', 'TROPISM: **106 entries**'),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/content-reachability.test.ts',
    expect: 'is up to date with the content it describes',
  },
  {
    id: 'queue-q11-no-venom-vaccine',
    why: 'Queue Q11 (Shantanu, 30 September 2026, "do whatever is scientifically accurate"): there is no vaccine against a venom. Venom acts in minutes and even a remembered response takes days; no vaccine against one is licensed for people. An engine that took one must fail against the original as ruled.',
    file: 'packages/engine/src/actions.ts',
    mutate: (t) =>
      t.replace(
        "if (DECK_MASTER.find((x) => x.dz === dz)?.type === 'venom') {",
        "if (DECK_MASTER.find((x) => x.dz === dz)?.type === 'no such type') {",
      ),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/queue-rules.test.ts',
    expect: 'a venom cannot be vaccinated against',
  },
  {
    id: 'queue-q11-no-memory-response-to-venom',
    why: 'Queue Q11: a venom meets no memory response, whatever memory a game carries. Games from before queue Q4 remember venoms killed by antivenom, and games from before Q11 venoms vaccinated against.',
    file: 'packages/engine/src/actions.ts',
    mutate: (t) =>
      t.replace("if (memoryHit(g, c.dz) && c.type !== 'venom') {", 'if (memoryHit(g, c.dz)) {'),
    gate: 'pnpm --filter @immunity-wars/equivalence exec vitest run src/queue-rules.test.ts',
    expect: 'meets no memory response on arrival',
  },
  {
    id: 'balance-normal-ap-strength',
    why: "FINDINGS #107: on Normal the fast panel control asserts the STRENGTH of a one-AP cut, since queue Q11 left its verdict a coin flip at that scale. A strength assertion must still fail when the cut is not there: here the mutant keeps Normal's five Action Points.",
    file: 'tests/balance/src/metrics-control.test.ts',
    mutate: (t) =>
      t.replace(
        'training:{ap:5,turns:15,spawn:"dice"}, normal:{ap:4,turns:20,spawn:"dice"}',
        'training:{ap:5,turns:15,spawn:"dice"}, normal:{ap:5,turns:20,spawn:"dice"}',
      ),
    gate: 'pnpm --filter @immunity-wars/balance exec vitest run src/metrics-control.test.ts',
    expect: 'the panel barely moved for a whole Action Point',
  },
  {
    id: 'turbo-outside-reads-hashed',
    why: "FINDINGS #108: the equivalence suite reads the rulebook document, the reachability report and the original engine from outside its package, and turbo's hash did not see them, so a changed rulebook replayed a cached green for the test that pins the why boxes to it.",
    file: 'tests/equivalence/turbo.json',
    mutate: (t) => t.replace('        "$TURBO_ROOT$/docs/Immunity_Wars_Rulebook_v3_1.docx",\n', ''),
    gate: 'pnpm turbo:check',
    expect: 'TURBO TEST HASH BLIND TO A FILE IT READS',
  },
  {
    id: 'room-bound-actions-owner-only',
    why: "FINDINGS #94, the relay's half: Produce, Coat, Neutralise and the four attacks name no piece, and the room, reading only `cell` and `organ`, let them through from any member. A room that stopped reading the table would again.",
    file: 'packages/room/src/room.ts',
    mutate: (t) => t.replace('  if (bound !== undefined) return bound;\n', ''),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'is refused from anyone who does not hold that piece',
  },
  {
    id: 'room-bound-actions-table-first',
    why: "FINDINGS #94: an action that can only be one piece's is that piece's whatever the message names. Reading the named cell first, a player holding the Neutrophil could engulf by saying so.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        "  if (bound !== undefined) return bound;\n  const cell = action['cell'];\n  if (typeof cell === 'string') return cell;\n",
        "  const cell = action['cell'];\n  if (typeof cell === 'string') return cell;\n  if (bound !== undefined) return bound;\n",
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: 'naming a piece the sender does hold does not make the action theirs',
  },
  {
    id: 'room-body-actions-captain-only',
    why: "FINDINGS #94: the body's actions, the vaccine lab, the clone, antivenom and the memory response, are the captain's on the screens (ruled 26 September 2026) and in the room (30 September). A room that did not check would take them from anyone.",
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace(
        'BODY_ACTIONS.has(name) && room.captain !== me.ref)',
        'BODY_ACTIONS.has(name) && room.captain !== me.ref && false)',
      ),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: "the body's actions are refused from anyone but the captain",
  },
  {
    id: 'room-body-actions-captain-allowed',
    why: 'FINDINGS #94, the permitting half: a room that refused the body from EVERYONE would pass the control above. The captain must still reach the engine.',
    file: 'packages/room/src/room.ts',
    mutate: (t) =>
      t.replace('BODY_ACTIONS.has(name) && room.captain !== me.ref)', 'BODY_ACTIONS.has(name))'),
    gate: 'pnpm --filter @immunity-wars/room test',
    expect: "the captain reaches the engine with the body's actions",
  },
  {
    id: 'room-and-screens-one-table',
    why: "FINDINGS #94: the room's table of whose each action is, and the screens' list of what each piece is offered, are two statements of one fact. Drifting apart, the screens would offer a button the room refuses.",
    file: 'packages/protocol/src/vocabulary.ts',
    mutate: (t) => t.replace("  nkkill: 'nk',", "  nkkill: 'tcell',"),
    gate: 'pnpm --filter @immunity-wars/session-tests exec vitest run src/seat-of-action.test.ts',
    expect: 'every action a cell is offered',
  },
];

/** Tracked-file status, used to prove the run restored everything it touched. */
function gitStatus(): string {
  return execSync('git status --porcelain', { cwd: REPO, encoding: 'utf8' }).trim();
}

/**
 * `--inert`: THE CHEAP HALF, on every `pnpm verify` and in CI's static job (FINDINGS #100). Every
 * control's mutation is applied in memory, never written, and none may leave its file unchanged. No
 * gate runs, so it takes a second. The full run below catches an inert control too, but only when
 * someone runs all of it: `room-no-ref-in-view` matched nothing from 25 to 30 September 2026, when
 * P3.7 renamed the line it mutates, and nothing said so until the next full run.
 */
if (process.argv[2] === '--inert') {
  const inert = CONTROLS.filter((c) => {
    const path = join(REPO, c.file);
    if (!existsSync(path)) return true;
    const text = readFileSync(path, 'utf8');
    return c.mutate(text) === text;
  });
  for (const c of inert) {
    console.log(`✗ ${c.id} THE MUTATION DID NOTHING — this control is inert (${c.file})`);
  }
  if (inert.length > 0) {
    console.log(`${String(inert.length)} of ${String(CONTROLS.length)} controls are inert.`);
    process.exit(1);
  }
  console.log(`${String(CONTROLS.length)} controls, and every mutation changes its file.`);
  process.exit(0);
}

const before = gitStatus();

const only = process.argv[2];
const selected = only ? CONTROLS.filter((c) => c.id === only) : CONTROLS;
if (selected.length === 0) {
  console.error(
    `unknown control ${JSON.stringify(only)}; known: ${CONTROLS.map((c) => c.id).join(', ')}`,
  );
  process.exit(2);
}

/** Run a gate. Returns combined output and whether it failed. */
function runGate(gate: string): { failed: boolean; output: string } {
  try {
    const out = execSync(gate, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { failed: false, output: out };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return { failed: true, output: `${err.stdout ?? ''}\n${err.stderr ?? ''}` };
  }
}

console.log('='.repeat(95));
console.log('CI SELF-TEST — every gate made to fail on purpose, with the right diagnostic,');
console.log('              and, where a rule also PERMITS something, made to stay green on that');
console.log('='.repeat(95));
console.log('');

let problems = 0;
let ran = 0;

for (const control of selected) {
  const path = join(REPO, control.file);
  if (!existsSync(path)) {
    console.log(`✗ ${control.id.padEnd(20)} target file missing: ${control.file}`);
    problems += 1;
    continue;
  }
  const original = readFileSync(path, 'utf8');
  const mutated = control.mutate(original);

  if (mutated === original) {
    // An inert control is the worst outcome: it reports nothing wrong while checking nothing.
    console.log(`✗ ${control.id.padEnd(20)} THE MUTATION DID NOTHING — this control is inert`);
    console.log(`    ${control.file} no longer contains what the mutation looks for.`);
    problems += 1;
    continue;
  }

  ran += 1;
  let verdict: { failed: boolean; output: string };
  try {
    writeRetrying(path, mutated);
    verdict = runGate(control.gate);
  } finally {
    // Through a lock, and loudly if it never lifts (FINDINGS #106): dying here left the engine
    // mutated in the tree once, with nothing on the screen to say so.
    try {
      writeRetrying(path, original);
    } catch (e) {
      console.log(`✗ COULD NOT RESTORE ${control.file}: ${String(e)}`);
      console.log(`    It is still MUTATED. Before anything else: git checkout -- ${control.file}`);
      process.exit(3);
    }
  }

  if (control.mustPass) {
    // Inverted: the mutation is legitimate and the gate must stay green.
    const ok = !verdict.failed;
    console.log(`${ok ? '✓' : '✗'} ${control.id.padEnd(28)} ${control.gate}`);
    if (ok) {
      console.log('    stayed green on a PERMITTED edge, as it must');
    } else {
      console.log(`    THE GATE WENT RED on something it is supposed to allow: ${control.why}`);
      console.log(`    ${verdict.output.split('\n').filter(Boolean).slice(-3).join('\n    ')}`);
      problems += 1;
    }
    continue;
  }

  const sawDiagnostic = verdict.output.includes(control.expect);
  const ok = verdict.failed && sawDiagnostic;
  console.log(`${ok ? '✓' : '✗'} ${control.id.padEnd(28)} ${control.gate}`);
  if (ok) {
    console.log(`    failed, and said "${control.expect}"`);
  } else if (!verdict.failed) {
    console.log(`    THE GATE PASSED. It did not notice: ${control.why}`);
    problems += 1;
  } else {
    console.log(
      `    failed, but WITHOUT "${control.expect}" — it may be failing for another reason`,
    );
    console.log(`    ${verdict.output.split('\n').filter(Boolean).slice(-3).join('\n    ')}`);
    problems += 1;
  }
}

// Restoration is verified rather than assumed: this script edits tracked files.
//
// Compared against the state BEFORE the run, not against "clean". Uncommitted work is the normal
// case for whoever runs this, and a check that cannot tell "I failed to restore your files" from
// "you had edits already" is a check that cries wolf until someone deletes it.
const after = gitStatus();
if (after !== before) {
  console.error('\nTHE WORKING TREE CHANGED ACROSS THIS RUN. Files may not have been restored.');
  console.error(`  before:\n${before || '    (clean)'}`);
  console.error(`  after:\n${after || '    (clean)'}`);
  console.error('\nRestore with: git checkout -- .');
  process.exit(2);
}

if (ran === 0) {
  console.error('\nVACUITY: no control ran. This is not a check.');
  process.exit(2);
}

console.log(`\n${ran} gate(s) exercised, working tree clean.`);
if (problems > 0) {
  console.error(
    `\n${problems} GATE(S) DID NOT BEHAVE AS SPECIFIED.\n` +
      'A gate that does not fire is a gate nobody has falsified — it will report green through\n' +
      'exactly the defect it was built to catch.',
  );
  process.exit(1);
}
console.log('Every gate behaved as specified: red where it must, green where it must.');
