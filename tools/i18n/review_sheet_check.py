"""The review sheet's round trip, checked: `pnpm i18n:sheet:check`.

Builds the sheet from the catalogues into a temporary folder, applies it unchanged and requires
every Hindi file to come back byte-identical; then edits one cell and requires that key alone to
change; then drops a placeholder and adds a dash and requires both refusals, with nothing
written. The catalogue files are restored afterwards whatever happens. Each line it prints is
one of those requirements; the self-test control `hi-review-sheet-refuses-a-lost-placeholder`
takes the placeholder refusal out of the tool and requires this to fail.
"""
from __future__ import annotations

import filecmp
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[2]
HI = ROOT / 'packages' / 'content' / 'src' / 'i18n' / 'hi'
TOOL = ROOT / 'tools' / 'i18n' / 'review_sheet.py'


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, '-I', str(TOOL), *args], capture_output=True, text=True, encoding='utf-8')


def same(a: Path, b: Path) -> bool:
    cmp = filecmp.dircmp(a, b)
    return not cmp.diff_files and not cmp.left_only and not cmp.right_only


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix='iw-i18n-'))
    before = tmp / 'before'
    shutil.copytree(HI, before)
    failures: list[str] = []
    try:
        sheet = tmp / 'review.xlsx'
        r = run('build', 'hi', str(sheet))
        if r.returncode != 0:
            failures.append(f'BUILD FAILED: {r.stderr.strip()}')
            return report(failures)
        r = run('apply', 'hi', str(sheet))
        if r.returncode != 0 or not same(before, HI):
            failures.append('THE ROUND TRIP IS NOT BYTE-IDENTICAL')
        else:
            print('round trip: byte-identical')

        edited = tmp / 'edited.xlsx'
        wb = load_workbook(sheet)
        for row in wb['Screens'].iter_rows(min_row=2):
            if row[0].value == 'nav.back':
                row[3].value = 'वापस (check)'
        wb.save(edited)
        r = run('apply', 'hi', str(edited))
        ui = (HI / 'ui.json').read_text(encoding='utf-8')
        changed = [f for f in ('ui.json', 'engine.json', 'names.json', 'glossary.json') if not filecmp.cmp(before / f, HI / f, shallow=False)]
        if r.returncode != 0 or '"nav.back": "वापस (check)"' not in ui or changed != ['ui.json']:
            failures.append(f'AN EDITED CELL DID NOT LAND ALONE: changed {changed}')
        else:
            print('an edited cell: landed, and only its file changed')
        shutil.rmtree(HI)
        shutil.copytree(before, HI)

        broken = tmp / 'broken.xlsx'
        wb = load_workbook(sheet)
        for row in wb['Engine'].iter_rows(min_row=2):
            if row[0].value == 'actions.antivenomCostsAp':
                row[3].value = 'एंटीवेनम में AP लगते हैं।'
        for row in wb['Screens'].iter_rows(min_row=2):
            if row[0].value == 'nav.close':
                row[3].value = 'बंद — करें'
        wb.save(broken)
        r = run('apply', 'hi', str(broken))
        out = r.stdout + r.stderr
        if r.returncode == 0 or 'actions.antivenomCostsAp: placeholders' not in out:
            failures.append('THE PLACEHOLDER CONTROL DID NOT FIRE')
        else:
            print('a lost placeholder: refused by name')
        if r.returncode == 0 or 'nav.close: a dash' not in out:
            failures.append('THE DASH CONTROL DID NOT FIRE')
        else:
            print('a dash: refused by name')
        if not same(before, HI):
            failures.append('A REFUSED SHEET WROTE SOMETHING')
        else:
            print('a refused sheet: nothing written')
        return report(failures)
    finally:
        shutil.rmtree(HI)
        shutil.copytree(before, HI)
        shutil.rmtree(tmp, ignore_errors=True)


def report(failures: list[str]) -> int:
    for f in failures:
        print(f)
    print('review sheet check:', 'FAILED' if failures else 'passed')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
