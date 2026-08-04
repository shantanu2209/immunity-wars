#!/usr/bin/env node
/**
 * Fail loudly for commands that are documented in CLAUDE.md but not built yet.
 *
 * A script that is missing gives a confusing package-manager error. A script that
 * silently succeeds is worse: it makes an unbuilt step look green in CI. This makes
 * the gap explicit and says which task will close it.
 */

const [command, task] = process.argv.slice(2);

const TASKS = {
  E: 'Task E — Measurements (balance baseline + serialised state size)',
  G: 'Task G — Single-file harness (new engine + legacy UI)',
};

console.error('');
console.error(`  pnpm ${command} is not implemented yet.`);
console.error('');
console.error(`  It is scheduled for: ${TASKS[task] ?? `Task ${task}`}`);
console.error('  See docs/PHASE1_BRIEF.md §5 for the task order.');
console.error('');
console.error('  This command exists and fails on purpose. An unbuilt step that exits 0');
console.error('  would show up green in CI, which is worse than not existing at all.');
console.error('');

process.exit(1);
