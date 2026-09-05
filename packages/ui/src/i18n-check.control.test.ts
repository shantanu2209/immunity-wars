/**
 * NEGATIVE CONTROL for the hardcoded-string check (`iw/no-hardcoded-jsx-text`).
 *
 * This check is the infrastructure P2.5 most depends on: it is what makes DoD item 4 ("the
 * UI renders all player-visible text through the catalogue, with a check that fails on a
 * hardcoded string") real rather than a second unconsumed catalogue — and every screen after
 * the first will trust it. So, per the standing rule, both halves:
 *
 *   mustFail — a component with hardcoded JSX text (bare text, a string expression, and a
 *              template literal) MUST be rejected, each occurrence reported;
 *   mustPass — the same component rendering through t() MUST lint clean under this rule,
 *              proving the gate still permits the one path it exists to enforce.
 *
 * The control runs the REAL eslint config against a virtual file inside packages/ui/src —
 * not a copy of the rule — because a control that exercises a parallel copy proves the copy
 * works (tests/balance/src/play.ts's reasoning, unchanged).
 */
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = new URL('../../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const VIRTUAL = `${REPO_ROOT}/packages/ui/src/__i18n_control__.tsx`;
const RULE = 'iw/no-hardcoded-jsx-text';

async function lintFixture(code: string): Promise<string[]> {
  const eslint = new ESLint({ cwd: REPO_ROOT });
  const results = await eslint.lintText(code, { filePath: VIRTUAL });
  return results
    .flatMap((r) => r.messages)
    .filter((m) => m.ruleId === RULE)
    .map((m) => m.message);
}

describe('iw/no-hardcoded-jsx-text — both control halves', () => {
  it('mustFail: hardcoded JSX text is rejected, every occurrence', async () => {
    const bad = `
      export function Control({ n }: { n: number }): unknown {
        return (
          <div>
            Hardcoded bare text
            <span>{'hardcoded string expression'}</span>
            <span>{\`hardcoded template \${n}\`}</span>
          </div>
        );
      }
    `;
    const hits = await lintFixture(bad);
    expect(hits.length).toBe(3);
  });

  it('mustPass: rendering through t() lints clean — the permitted edge stays open', async () => {
    const good = `
      import { t } from './i18n';
      export function Control({ n }: { n: number }): unknown {
        return (
          <div title="props are not player-visible text">
            {t('commandBar.selectPrompt')}
            <span>{n}</span>
            <span>{t('inspect.hp')}</span>
          </div>
        );
      }
    `;
    const hits = await lintFixture(good);
    expect(hits).toEqual([]);
  });
});
