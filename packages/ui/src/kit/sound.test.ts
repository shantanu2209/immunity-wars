/**
 * THE KIT'S SOUNDS ARE HELD TO WHAT CAN BE MEASURED WITHOUT AN EAR (docs/LOOK_PLAN.md §13): each
 * has a note a phone's speaker plays, notes sounding together never add up past full loudness, a
 * sound is short, and the mute silences sound and touch alike.
 *
 * WHAT THIS DOES NOT SAY: that any of them sounds good, or right for what it marks. That is judged
 * by ear on the phone, on the kit page.
 *
 * The audio engine here is a stand-in that counts what it is asked to make. Whether the real mute
 * going missing turns this suite red is the self-test's control `kit-sound-mute-is-obeyed`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BUZZ, KitAudio, SOUNDS, soundLength, type KitSound, type Note } from './sound';

const NAMES = Object.keys(SOUNDS) as KitSound[];
const ENDINGS: KitSound[] = ['win', 'loss'];

/** The most the notes of a sound add up to at any moment. Loudness peaks just after a note starts. */
const loudest = (notes: readonly Note[]): number =>
  Math.max(
    ...notes.map((n) =>
      notes
        .filter((m) => m.at <= n.at && n.at < m.at + m.length)
        .reduce((sum, m) => sum + m.gain, 0),
    ),
  );
const phonePlaysIt = (notes: readonly Note[]): boolean => notes.some((n) => n.from >= 250);

describe('the kit’s sounds, as data', () => {
  it('there are ten, and each has a note a phone’s speaker plays', () => {
    expect(NAMES).toHaveLength(10);
    expect(
      NAMES.filter((s) => !phonePlaysIt(SOUNDS[s])).map(
        (s) => `KIT SOUND: ${s} has no note starting at 250 Hz or above`,
      ),
    ).toEqual([]);
  });

  it('notes sounding together never add up past full loudness', () => {
    expect(
      NAMES.filter((s) => loudest(SOUNDS[s]) > 1).map(
        (s) => `KIT SOUND: ${s} adds up to ${loudest(SOUNDS[s])}`,
      ),
    ).toEqual([]);
  });

  it('every note can be played: a pitch above nothing, and long enough to rise and fall', () => {
    for (const s of NAMES)
      for (const n of SOUNDS[s]) {
        expect(Math.min(n.from, n.to), s).toBeGreaterThan(20);
        expect(n.length, s).toBeGreaterThanOrEqual(0.03);
        expect(n.gain, s).toBeGreaterThan(0);
      }
  });

  it('an answer is short: 0.4 s at most, and the two endings 1 s', () => {
    for (const s of NAMES)
      expect(soundLength(s), s).toBeLessThanOrEqual(ENDINGS.includes(s) ? 1 : 0.4);
  });

  it('a buzz is brief, and only for sounds that exist', () => {
    for (const [s, pattern] of Object.entries(BUZZ)) {
      expect(NAMES, s).toContain(s);
      expect(
        pattern.reduce((a, b) => a + b, 0),
        s,
      ).toBeLessThanOrEqual(100);
    }
  });

  it('CONTROL, must fail: a lone 90 Hz note is not one a phone plays, and two full notes at once are too loud', () => {
    const low: Note[] = [{ at: 0, wave: 'sine', from: 90, to: 60, length: 0.2, gain: 0.5 }];
    expect(phonePlaysIt(low)).toBe(false);
    const both: Note[] = [
      { at: 0, wave: 'sine', from: 440, to: 440, length: 0.2, gain: 0.7 },
      { at: 0.1, wave: 'sine', from: 660, to: 660, length: 0.2, gain: 0.7 },
    ];
    expect(loudest(both)).toBeCloseTo(1.4, 5);
  });

  it('CONTROL, must pass: the same two notes one after the other are not too loud', () => {
    const apart: Note[] = [
      { at: 0, wave: 'sine', from: 440, to: 440, length: 0.2, gain: 0.7 },
      { at: 0.2, wave: 'sine', from: 660, to: 660, length: 0.2, gain: 0.7 },
    ];
    expect(loudest(apart)).toBeCloseTo(0.7, 5);
    expect(phonePlaysIt(apart)).toBe(true);
  });
});

/** A stand-in for the browser's audio engine: it makes nothing and counts what it was asked for. */
let made = 0;
const param = { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined };
class StandInEngine {
  state = 'running';
  currentTime = 0;
  destination = {};
  createOscillator(): object {
    made += 1;
    return {
      type: 'sine',
      frequency: param,
      connect: (to: unknown) => to,
      start: () => undefined,
      stop: () => undefined,
    };
  }
  createGain(): object {
    return { gain: param, connect: (to: unknown) => to };
  }
}

describe('the kit’s audio', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    made = 0;
  });

  it('with no audio engine at all it does nothing, and says so', () => {
    expect(new KitAudio().play('tap')).toBe(false);
  });

  it('plays one voice for each note of the sound', () => {
    vi.stubGlobal('window', { AudioContext: StandInEngine });
    const audio = new KitAudio();
    expect(audio.play('win')).toBe(true);
    expect(made).toBe(SOUNDS.win.length);
  });

  it('muted, it makes no sound and asks for no buzz', () => {
    vi.stubGlobal('window', { AudioContext: StandInEngine });
    const asked: number[][] = [];
    vi.stubGlobal('navigator', { vibrate: (p: number[]) => asked.push(p) > 0 });
    const audio = new KitAudio();
    audio.muted = true;
    audio.answer('engulf');
    expect(made === 0 ? [] : ['KIT SOUND: a muted kit made a sound']).toEqual([]);
    expect(asked.length === 0 ? [] : ['KIT SOUND: a muted kit asked for a buzz']).toEqual([]);
  });

  it('not muted, the same call does both: the check above is not passing on silence', () => {
    vi.stubGlobal('window', { AudioContext: StandInEngine });
    const asked: number[][] = [];
    vi.stubGlobal('navigator', { vibrate: (p: number[]) => asked.push(p) > 0 });
    new KitAudio().answer('engulf');
    expect(made).toBe(SOUNDS.engulf.length);
    expect(asked).toEqual([[...(BUZZ.engulf ?? [])]]);
  });

  it('a phone that cannot buzz is not asked, and a sound with no buzz asks for none', () => {
    vi.stubGlobal('navigator', {});
    expect(new KitAudio().buzz('tap')).toBe(false);
    const asked: number[][] = [];
    vi.stubGlobal('navigator', { vibrate: (p: number[]) => asked.push(p) > 0 });
    expect(new KitAudio().buzz('win')).toBe(false);
    expect(asked).toEqual([]);
  });
});
