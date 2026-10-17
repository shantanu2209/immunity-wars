/**
 * THE LESSON'S CHAPTERS (ruled 16 October 2026, `docs/LOOK_PLAN.md` §29): one button each. Done is
 * green and can be played again; the next is the coral one and can be played; every one after it
 * is flat and cannot be pressed. Each says so in words as well as by its colour.
 *
 * Controls: pnpm ci:selftest chapters-locked-cannot-be-pressed, chapters-next-follows-the-done,
 * chapters-say-what-the-lesson-does-to-a-save.
 */
import { LESSON } from '@immunity-wars/content';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { t } from '../i18n';
import { kitButtonStyle } from '../kit/Button';

import { ChaptersScreen, chapterStates } from './ChaptersScreen';

/** A sentence as the page's markup carries it. */
const esc = (x: string): string => x.replace(/&/g, '&amp;').replace(/'/g, '&#x27;');

/** The lesson's own chapters: a chapter added to it with no name here fails the first test. */
const IDS = LESSON.chapters.map((ch) => ch.id);
const screen = (done: number, replacesSave = false): string =>
  renderToStaticMarkup(
    createElement(ChaptersScreen, {
      chapters: IDS.map((id) => ({ id })),
      done,
      replacesSave,
      onPlay: () => undefined,
    }),
  );

/** Each chapter's button as markup, by its hook. */
function buttons(html: string): { state: string; disabled: boolean; tag: string; body: string }[] {
  return [...html.matchAll(/<button([^>]*)>(.*?)<\/button>/g)].map((m) => ({
    state: /data-chapter-state="([^"]*)"/.exec(m[1] ?? '')?.[1] ?? '',
    disabled: / disabled=""/.test(m[1] ?? ''),
    tag: m[1] ?? '',
    body: m[2] ?? '',
  }));
}
const face = (kind: 'main' | 'go'): string =>
  String(kitButtonStyle(kind, 'resting').background).replace(/, /g, ',');
const wears = (tag: string, kind: 'main' | 'go'): boolean =>
  tag.replace(/, /g, ',').includes(face(kind));

describe('the chapters’ states', () => {
  it('those done, then the next, then the rest locked', () => {
    const said = 'THE NEXT CHAPTER IS NOT THE ONE AFTER THE LAST DONE';
    expect(chapterStates(7, 0), said).toEqual(['open', ...Array<string>(6).fill('locked')]);
    expect(chapterStates(7, 3), said).toEqual([
      'done',
      'done',
      'done',
      'open',
      'locked',
      'locked',
      'locked',
    ]);
    expect(chapterStates(7, 7)).toEqual(Array<string>(7).fill('done'));
  });
});

describe('the chapter screen', () => {
  it('has a button for every chapter, in order, each with its name', () => {
    const html = screen(2);
    const got = buttons(html);
    expect(got.map((b) => b.state)).toEqual(chapterStates(7, 2));
    IDS.forEach((id, c) => {
      expect(got[c]?.body).toContain(
        esc(t('chapters.numbered', { n: c + 1, name: t(`chapters.${id}.name`) })),
      );
      expect(got[c]?.body).toContain(esc(t(`chapters.${id}.about`)));
    });
  });

  it('a locked chapter cannot be pressed, and says what comes first', () => {
    const got = buttons(screen(2));
    const locked = got.filter((b) => b.state === 'locked');
    expect(locked.length).toBe(4);
    for (const b of locked) expect(b.disabled, 'A LOCKED CHAPTER CAN BE PRESSED').toBe(true);
    expect(got[3]?.body).toContain(esc(t('chapters.locked', { n: 3 })));
  });

  it('a chapter done is green and can be played again; the next is the coral one', () => {
    const got = buttons(screen(2));
    for (const b of got.filter((x) => x.state !== 'locked')) expect(b.disabled).toBe(false);
    expect(wears(got[0]?.tag ?? '', 'go'), 'A CHAPTER DONE IS NOT GREEN').toBe(true);
    expect(got[0]?.body).toContain(esc(t('chapters.done')));
    expect(wears(got[2]?.tag ?? '', 'main'), 'THE NEXT CHAPTER IS NOT THE CORAL ONE').toBe(true);
    expect(got[2]?.body).toContain(esc(t('chapters.open')));
    // One coral button to a screen.
    expect(got.filter((b) => wears(b.tag, 'main')).length).toBe(1);
  });

  it('on a new phone the first is the one to play and the rest are locked', () => {
    const got = buttons(screen(0));
    expect(got[0]?.state).toBe('open');
    expect(got.slice(1).every((b) => b.disabled)).toBe(true);
  });

  it('with every chapter done, all are green and none is locked', () => {
    const got = buttons(screen(7));
    expect(got.every((b) => b.state === 'done' && !b.disabled)).toBe(true);
  });

  it('with a game saved, it says what the lesson does to it, and only then', () => {
    expect(
      screen(0, true),
      'THE CHAPTERS DO NOT SAY WHAT THE LESSON DOES TO A SAVED GAME',
    ).toContain(esc(t('chapters.replacesSave')));
    expect(screen(0, false)).not.toContain('data-chapters-save');
  });
});
