"""The translation review sheet: built FROM the catalogues, and read BACK into them.

    python tools/i18n/review_sheet.py build hi out/hindi/review.xlsx
    python tools/i18n/review_sheet.py apply hi out/hindi/review.xlsx

WHY A GENERATED SHEET AND NOT A HAND-MADE TABLE. The catalogue is the one source of what the
game says (CLAUDE.md: every player-visible string goes through it). A table typed up for review
drifts from it the first time either changes. So the sheet is produced from the catalogues, the
reviewer edits only the translation column, and `apply` writes those cells back by key, refusing
a cell whose placeholders no longer match the English (a `{n}` dropped from a translation is a
number a player never sees) and a cell with a dash (player text here has none; the one place a
dash is allowed is the engine's English, which is pinned to legacy and not edited for style).

WHAT IS IN IT. One sheet per source: the screens' catalogue (ui.json), the engine's sentences
(engine.json), the names the content pack holds as data (cells, kinds, organs, routes, classes,
events, residents, tiers, the 97 diseases; their English comes from the tables, not from a second
copy), and the glossary, and the library's text (the disease cards, the cell cards, the "why" essays, the organ
and class notes), whose English also comes from the tables.

THE ROUND TRIP IS CHECKED, not assumed: `pnpm i18n:sheet:check` builds the sheet, applies it
unchanged and requires the catalogue files to be byte-identical; then edits one cell and requires
that key alone to change; then drops a placeholder and requires the refusal. Each half of that is
a control in the sense CLAUDE.md asks for.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[2]
I18N = ROOT / 'packages' / 'content' / 'src' / 'i18n'
RULES = ROOT / 'packages' / 'content' / 'src' / 'rules'
LABELS = ROOT / 'packages' / 'content' / 'src' / 'labels'
DISEASES = ROOT / 'packages' / 'content' / 'src' / 'diseases'
REGIONS = ROOT / 'packages' / 'content' / 'src' / 'board' / 'regions.json'

PLACEHOLDER = re.compile(r'\{(\w+)\}')
# English plural suffixes the engine composes ("Action Point{pool2}"): a translation has no use
# for them, so their absence is not a dropped value.
PLURAL_SUFFIXES = {'pool2', 'made2'}
DASHES = ('—', '–', ' - ')

SCREEN_OF = {
    'nav': 'Everywhere', 'title': 'Title', 'difficulty': 'Difficulty', 'differences': 'Difficulty, Result',
    'chapters': 'Learn to play', 'guide': 'The guided game', 'help': 'How to play', 'library': 'Disease library',
    'about': 'About', 'settings': 'Settings', 'update': 'Updates', 'crash': 'After a crash', 'save': 'Save notice',
    'together': 'Play together', 'lobby': 'The lobby', 'table': 'The table (together)', 'chat': 'Messages (together)',
    'say': 'Quick messages (together)', 'allocation': 'Allocation (together)', 'arrivals': 'New cards',
    'reveal': 'New cards', 'goal': 'First turn', 'why': 'After the spread', 'planning': 'Planning',
    'pause': 'Menu', 'result': 'Result', 'spread': 'The spread', 'play': 'Play screen',
    'commandBar': 'Play screen', 'selection': 'Play screen: why a button is flat', 'action': 'Action buttons',
    'actions': 'Action buttons', 'dock': 'Play screen', 'tabs': 'Play screen', 'undo': 'Undo', 'cell': 'Cells',
    'pieces': 'Cells view', 'antibody': 'Antibodies view', 'body': 'Body view', 'ap': 'Action Points sheet',
    'effects': 'What is in force', 'inspect': 'A tapped step', 'card': 'Pathogen card', 'cellCard': 'Cell card',
    'log': 'Messages', 'regen': 'A spent cell', 'organ': 'An organ', 'resident': 'A resident',
}
ENGINE_SCREEN_OF = {
    'actions': 'A refusal or a log line', 'construct': 'Game start, crises', 'effects': 'Log line',
    'queries': 'Action Points and antibody sheets', 'spread': "The spread's beats and log lines",
    'view': 'Undo',
}


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8'))


def write(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def english_names() -> dict[str, str]:
    """The names as the content tables hold them, keyed as hi/names.json keys them."""
    labels = read(LABELS / 'labels.json')
    board = read(RULES / 'board.json')
    families = read(RULES / 'families.json')['FAMILIES']
    events = read(RULES / 'events.json')
    deck = read(RULES / 'deck.json')
    deck = deck['DECK_MASTER'] if isinstance(deck, dict) else deck
    dz = read(DISEASES / 'diseases.json')
    regions = read(REGIONS)['REGION_LABEL']
    out: dict[str, str] = {}
    for k, v in labels['UM'].items():
        out[f'cell.{k}.n'] = v['n']
        out[f'cell.{k}.r'] = v['r']
    for k, v in labels['UI_'].items():
        out[f'kind.{k}'] = v['n']
    for k, v in board['ORGANS'].items():
        out[f'organ.{k}.name'] = v['name']
        out[f'organ.{k}.effect'] = v['effect']
    for k, v in board['ROUTES'].items():
        out[f'route.{k}'] = v['name']
    out['region.core'] = regions['core']
    for k, v in families.items():
        out[f'family.{k}'] = v['name']
    for k, v in board['RESIDENT_NAME'].items():
        out[f'resident.{k}'] = v
    for k, v in events['EVENTS'].items():
        out[f'event.{k}.name'] = v['name']
        out[f'event.{k}.why'] = v['why']
        out[f'event.{k}.tell'] = v.get('tell', '')
    for k, v in events['RARE'].items():
        out[f'rare.{k}.name'] = v['name']
        out[f'rare.{k}.why'] = v['why']
    for tier in sorted({v[4] for v in dz['DZSTATS'].values()}):
        out[f'tier.{tier}'] = tier
    for k, v in labels['BEAT_BY_TYPE'].items():
        out[f'beat.{k}'] = v
    names = [c['dz'] for c in deck]
    for extra in sorted(set(dz['DZINFO']) - set(names)):
        names.append(extra)
    for n in names:
        out[f'disease.{n}'] = n
    return out


def library_rows() -> list[tuple[str, str, str]]:
    """Batch 2: the library's text, English only. (key, where, English)."""
    dz = read(DISEASES / 'diseases.json')
    why = read(DISEASES / 'why.json')['WHY']
    cells = read(LABELS / 'cells.json')['CELL_CARDS']
    board = read(RULES / 'board.json')['ORGANS']
    families = read(RULES / 'families.json')['FAMILIES']
    rows: list[tuple[str, str, str]] = []
    field = {'d': 'Discovered', 'c': 'Causes', 'w': 'Found', 'p': 'Prevent', 'r': 'Treat'}
    for name, info in dz['DZINFO'].items():
        for f, text in info.items():
            rows.append((f'library.{name}.{f}', f'Disease card: {name}, {field.get(f, f)}', text))
    for name, text in dz['FACT'].items():
        rows.append((f'fact.{name}', f'Disease card: {name}, the fact', text))
    for key, card in cells.items():
        for f, text in card.items():
            rows.append((f'cellCard.{key}.{f}', f'Cell card: {key}, {f}', text))
    for w in why:
        rows.append((f'why.{w["key"]}', 'Why it works this way', w['text']))
    for k, v in board.items():
        rows.append((f'organ.{k}.bio', f'Organ: {v["name"]}', v['bio']))
    for k, v in families.items():
        rows.append((f'family.{k}.bio', f'Antigen class: {v["name"]}', v['bio']))
    return rows


HEAD_FILL = PatternFill('solid', fgColor='1C484D')
HEAD_FONT = Font(bold=True, color='FDE7C5', name='Calibri', size=11)
HI_FONT = Font(name='Nirmala UI', size=12)
EN_FONT = Font(name='Calibri', size=11)
WRAP = Alignment(wrap_text=True, vertical='top')


def sheet(wb: Workbook, title: str, header: list[str], widths: list[int], rows: list[list[str]], hi_cols: set[int]) -> None:
    ws = wb.create_sheet(title)
    ws.append(header)
    for c in range(1, len(header) + 1):
        cell = ws.cell(row=1, column=c)
        cell.fill = HEAD_FILL
        cell.font = HEAD_FONT
        cell.alignment = WRAP
        ws.column_dimensions[get_column_letter(c)].width = widths[c - 1]
    for r in rows:
        ws.append(r)
        row = ws.max_row
        for c in range(1, len(header) + 1):
            cell = ws.cell(row=row, column=c)
            cell.alignment = WRAP
            cell.font = HI_FONT if c in hi_cols else EN_FONT
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = ws.dimensions


def build(locale: str, out: Path) -> None:
    en_ui, hi_ui = read(I18N / 'en' / 'ui.json'), read(I18N / locale / 'ui.json')
    en_eng, hi_eng = read(I18N / 'en' / 'engine.json'), read(I18N / locale / 'engine.json')
    en_names, hi_names = english_names(), read(I18N / locale / 'names.json')
    en_gl, hi_gl = read(I18N / 'en' / 'glossary.json'), read(I18N / locale / 'glossary.json')

    wb = Workbook()
    wb.remove(wb.active)
    readme = wb.create_sheet('Read me')
    readme.column_dimensions['A'].width = 120
    for line in README.strip('\n').split('\n'):
        readme.append([line])
        readme.cell(row=readme.max_row, column=1).alignment = WRAP
    readme.cell(row=1, column=1).font = Font(bold=True, size=14)

    def rows_of(en: dict, hi: dict, where) -> list[list[str]]:
        rows = []
        for k, v in en.items():
            if k.startswith('$'):
                continue
            note = ''
            ph = sorted(set(PLACEHOLDER.findall(v)) - PLURAL_SUFFIXES)
            if ph:
                note = 'Keep: ' + ' '.join('{' + p + '}' for p in ph)
            if '<b>' in v or '<i>' in v:
                note = (note + '; ' if note else '') + 'keep the <b> and <i> tags'
            rows.append([k, where(k), v, hi.get(k, ''), note, ''])
        for k, v in hi.items():
            if not k.startswith('$') and k not in en:
                rows.append([k, where(k), '', v, 'Only in Hindi', ''])
        return rows

    header = ['Key (do not edit)', 'Shown where', 'English (do not edit)', 'Hindi (edit this)', 'Note', 'Your comment']
    widths = [34, 24, 60, 60, 24, 30]
    sheet(wb, 'Screens', header, widths, rows_of(en_ui, hi_ui, lambda k: SCREEN_OF.get(k.split('.')[0], k.split('.')[0])), {4})
    sheet(wb, 'Engine', header, widths, rows_of(en_eng, hi_eng, lambda k: ENGINE_SCREEN_OF.get(k.split('.')[0], k.split('.')[0])), {4})
    sheet(wb, 'Names', header, widths, rows_of(en_names, hi_names, lambda k: NAMES_WHERE.get(k.split('.')[0], k.split('.')[0])), {4})

    gl_rows = []
    terms = sorted({k.rsplit('.', 1)[0] for k in en_gl if not k.startswith('$')}, key=lambda t: list(en_gl).index(t + '.term'))
    for t in terms:
        gl_rows.append([t, en_gl.get(t + '.term', ''), en_gl.get(t + '.meaning', ''), hi_gl.get(t + '.term', ''), hi_gl.get(t + '.meaning', ''), hi_gl.get(t + '.textbook', ''), ''])
    sheet(wb, 'Glossary', ['Key (do not edit)', 'English term', 'English meaning', 'Hindi term (edit)', 'Hindi meaning (edit)', 'Textbook (NCERT) Hindi (edit)', 'Your comment'], [24, 26, 52, 26, 52, 30, 30], gl_rows, {4, 5, 6})

    hi_lib = read(I18N / locale / 'library.json')
    lib = [[k, w, e, hi_lib.get(k, ''), '', ''] for k, w, e in library_rows()]
    sheet(wb, 'Library', header, widths, lib, {4})
    out.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out)
    count = lambda d: sum(1 for k in d if not k.startswith('$'))
    print(f'built {out}: Screens {count(en_ui)}, Engine {count(en_eng)}, Names {len(en_names)}, Glossary {len(terms)}, Library {len(lib)} rows')


NAMES_WHERE = {
    'cell': 'Cell names and roles', 'kind': 'Kinds of invader', 'organ': 'Organs', 'route': 'Routes',
    'region': 'The board', 'family': 'Antigen classes', 'resident': 'Resident macrophages',
    'event': 'Crisis events', 'rare': 'Rare events', 'tier': 'Pathogen card: tier', 'beat': 'Pathogen card: beat it',
    'disease': 'Disease names (on cards, the board, the log)',
}


def apply(locale: str, src: Path) -> None:
    wb = load_workbook(src)
    en_names = english_names()
    en_library = {k: e for k, _w, e in library_rows()}
    sources = {
        'Screens': (I18N / 'en' / 'ui.json', I18N / locale / 'ui.json'),
        'Engine': (I18N / 'en' / 'engine.json', I18N / locale / 'engine.json'),
        'Names': (None, I18N / locale / 'names.json'),
        'Library': (None, I18N / locale / 'library.json'),
    }
    refused: list[str] = []
    comments: list[str] = []
    # Nothing is written until every sheet has been read: a refusal on one sheet must leave the
    # others untouched too, or a half-applied review would look like a whole one.
    pending: list[tuple[str, Path, dict, int]] = []
    for title, (en_path, hi_path) in sources.items():
        ws = wb[title]
        en = read(en_path) if en_path else (en_library if title == 'Library' else en_names)
        hi = read(hi_path)
        changed = 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            key, _where, english, hindi, _note, comment = (list(row) + [None] * 6)[:6]
            if not key:
                continue
            hindi = '' if hindi is None else str(hindi)
            if comment:
                comments.append(f'{title} {key}: {comment}')
            if key not in hi and key not in en:
                refused.append(f'{title} {key}: not a key the catalogue has')
                continue
            if key in en:
                want = set(PLACEHOLDER.findall(str(en[key]))) - PLURAL_SUFFIXES
                got = set(PLACEHOLDER.findall(hindi)) - PLURAL_SUFFIXES
                if want != got:
                    refused.append(f'{title} {key}: placeholders {sorted(want)} in English, {sorted(got)} in the translation')
                    continue
            if any(d in hindi for d in DASHES):
                refused.append(f'{title} {key}: a dash in player text')
                continue
            if hi.get(key) != hindi:
                hi[key] = hindi
                changed += 1
        pending.append((title, hi_path, hi, changed))
    ws = wb['Glossary']
    hi_gl = read(I18N / locale / 'glossary.json')
    changed = 0
    for row in ws.iter_rows(min_row=2, values_only=True):
        key, _et, _em, term, meaning, textbook, comment = (list(row) + [None] * 7)[:7]
        if not key:
            continue
        if comment:
            comments.append(f'Glossary {key}: {comment}')
        for field, value in (('term', term), ('meaning', meaning), ('textbook', textbook)):
            value = '' if value is None else str(value)
            if any(d in value for d in DASHES):
                refused.append(f'Glossary {key}.{field}: a dash in player text')
                continue
            if hi_gl.get(f'{key}.{field}') != value:
                hi_gl[f'{key}.{field}'] = value
                changed += 1
    if refused:
        print('REFUSED, nothing written for the sheets below:')
        for r in refused:
            print('  ' + r)
        sys.exit(1)
    for title, hi_path, hi, n in pending:
        write(hi_path, hi)
        print(f'{title}: {n} changed')
    write(I18N / locale / 'glossary.json', hi_gl)
    print(f'Glossary: {changed} changed')
    if comments:
        print('Comments left in the sheet:')
        for c in comments:
            print('  ' + c)


README = """
How to review the Hindi
Edit only the Hindi columns (the ones headed "edit"). Every other column is read from the game and is written back over.
Keep anything in curly braces exactly as it is, such as {n} or {disease}: the game fills a value in there. The Note column lists them for each row.
Keep <b> and <i> where they are: they make a word bold or italic.
Do not use a dash in a sentence; use a colon or a comma. The sheet is refused if a dash is found.
Leave a note in "Your comment" if you want to say something about a row without changing it.
When you are done, send the file back and it is read into the game by key. A row whose placeholders no longer match is refused by name and nothing is written until it is fixed.

What the Hindi assumes, until ruled otherwise
Everyday Hindi in Devanagari, the register of a Hindi newspaper: वायरस, बैक्टीरिया, एंटीबॉडी, टीका, फंगस. The glossary sheet carries the textbook (NCERT) word beside each, so a student can connect the two.
Cell names are transliterated, as NCERT does at class 11: मोनोसाइट, न्यूट्रोफिल, बी-सेल, किलर टी-सेल, हेल्पर टी-सेल, एनके सेल, इओसिनोफिल.
Disease names use the Hindi common name where one is in everyday use (काली खाँसी, हैजा, खसरा, टीबी, दाद) and a transliteration otherwise.
The antigen class codes (ENV, NAK, EXB, ICB, TOX, EUK) and AP stay in Latin letters: they are codes on the pieces.
Coat = लपेटें (coated = लिपटा हुआ). Neutralise = निष्क्रिय करें. Engulf = निगलें. Strike = वार करें. NET = जाल. Turn = बारी. Step on the board = कदम. Organ integrity = सेहत. Action Points = ऐक्शन पॉइंट.

The Library sheet
The disease cards (5 sentences each), the cell cards, the "why" essays and the organ and class notes: Kartik's written science, about 6,600 words, translated last and least read. A number, a name or a date that reads wrong there is a science error, so it is the sheet to read most carefully.
"""


def main() -> None:
    if len(sys.argv) != 4 or sys.argv[1] not in ('build', 'apply'):
        print(__doc__)
        sys.exit(2)
    cmd, locale, path = sys.argv[1], sys.argv[2], Path(sys.argv[3])
    (build if cmd == 'build' else apply)(locale, path)


if __name__ == '__main__':
    main()
