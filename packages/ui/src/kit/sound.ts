/**
 * THE KIT'S SOUND AND TOUCH. Synthesised in code, with no sound file anywhere: no money is spent
 * and there is nothing to license (docs/LOOK_PLAN.md §4). Ruled 1 October 2026: sound is on by
 * default, with a mute in Settings.
 *
 * A SOUND IS DATA: a short list of notes, each a waveform whose pitch glides from one frequency
 * to another while its loudness rises fast and falls away. That is all clay needs: soft blips,
 * thuds and pops. `SOUNDS` can be read and tested without a browser; `KitAudio` plays them through
 * the browser's own audio engine.
 *
 * PITCHED FOR A PHONE. A phone's small speaker plays little of a low note, so every sound here has
 * a note that starts at 250 Hz or above, and the low thuds a bigger speaker would carry are left
 * out. The kit's test holds the list to that; how each one SOUNDS is judged by ear, on the phone.
 *
 * NEVER LOUDER THAN FULL. Notes that sound together have loudnesses that add up to 1 at most, so
 * nothing crackles with the volume all the way up. Held by the same test.
 *
 * A BROWSER WILL NOT MAKE A SOUND BEFORE THE FIRST TOUCH. The audio engine is created on the first
 * call to `play`, which the caller makes from a tap; before that, and wherever there is no audio
 * engine at all, `play` does nothing and says so by returning false.
 *
 * TOUCH. `buzz` asks the phone to vibrate briefly, where a web page is allowed to (Android; an
 * iPhone's browser has no such thing, and the fuller version waits for the app's own shell at
 * Phase 4). It follows the same mute.
 */
export type KitSound =
  'tap' | 'move' | 'engulf' | 'coat' | 'arrive' | 'hurt' | 'refuse' | 'endTurn' | 'win' | 'loss';

export interface Note {
  /** Seconds after the sound starts. */
  at: number;
  wave: OscillatorType;
  /** Pitch glides from the first to the second, in Hz. */
  from: number;
  to: number;
  /** Seconds. */
  length: number;
  /** Peak loudness, 0 to 1, before the master volume. */
  gain: number;
}

const note = (
  at: number,
  wave: OscillatorType,
  from: number,
  to: number,
  length: number,
  gain: number,
): Note => ({ at, wave, from, to, length, gain });

export const SOUNDS: Record<KitSound, readonly Note[]> = {
  /** A control answering a finger. */
  tap: [note(0, 'sine', 560, 430, 0.06, 0.5)],
  /** A piece hopping one space: a soft rising bloop. */
  move: [note(0, 'sine', 300, 440, 0.14, 0.55)],
  /** A swallow: a pitch that drops and a low body under it. */
  engulf: [note(0, 'sine', 460, 190, 0.26, 0.65), note(0.03, 'triangle', 230, 150, 0.22, 0.3)],
  /** Antibodies snapping on: two bright pings. */
  coat: [note(0, 'triangle', 880, 900, 0.09, 0.4), note(0.08, 'triangle', 1175, 1200, 0.12, 0.4)],
  /** Something landing on the board: a short thock. */
  arrive: [note(0, 'triangle', 330, 220, 0.12, 0.6)],
  /** An organ taking damage: a thud that sags. */
  hurt: [note(0, 'triangle', 290, 130, 0.32, 0.7), note(0, 'sine', 580, 260, 0.12, 0.3)],
  /** This cannot be done: two short notes, the second lower. */
  refuse: [note(0, 'triangle', 311, 300, 0.07, 0.45), note(0.1, 'triangle', 262, 250, 0.09, 0.45)],
  /** The turn ends: three steps up. */
  endTurn: [
    note(0, 'sine', 392, 392, 0.1, 0.45),
    note(0.09, 'sine', 494, 494, 0.1, 0.45),
    note(0.18, 'sine', 587, 587, 0.18, 0.5),
  ],
  /** The body is clear: a major chord, opened upward. */
  win: [
    note(0, 'sine', 392, 392, 0.16, 0.45),
    note(0.12, 'sine', 494, 494, 0.16, 0.45),
    note(0.24, 'sine', 587, 587, 0.16, 0.45),
    note(0.36, 'sine', 784, 784, 0.42, 0.5),
  ],
  /** The body has fallen: a minor fall. */
  loss: [
    note(0, 'sine', 392, 392, 0.2, 0.45),
    note(0.18, 'sine', 311, 311, 0.2, 0.45),
    note(0.36, 'sine', 262, 247, 0.5, 0.5),
  ],
};

/** Vibration, in ms on, off, on…: short, and only for what a hand should feel. */
export const BUZZ: Partial<Record<KitSound, readonly number[]>> = {
  tap: [8],
  move: [10],
  engulf: [14, 30, 18],
  coat: [8, 40, 8],
  hurt: [40],
  refuse: [12, 50, 12],
  endTurn: [16],
};

export const soundLength = (s: KitSound): number =>
  Math.max(...SOUNDS[s].map((n) => n.at + n.length));

type AudioCtor = new () => AudioContext;

export class KitAudio {
  /** Sound and touch together: one mute for both. */
  muted = false;
  /** 0 to 1. Clay is quiet. */
  volume = 0.5;
  private ctx: AudioContext | null = null;

  private engine(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    return this.ctx;
  }

  /** Returns whether a sound was started. Call it from a tap. */
  play(sound: KitSound): boolean {
    if (this.muted) return false;
    const ctx = this.engine();
    if (!ctx) return false;
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + 0.005;
    for (const n of SOUNDS[sound]) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = n.wave;
      osc.frequency.setValueAtTime(n.from, t0 + n.at);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, n.to), t0 + n.at + n.length);
      // rise in 8 ms, then fall away to nothing by the note's end
      amp.gain.setValueAtTime(0.0001, t0 + n.at);
      amp.gain.exponentialRampToValueAtTime(
        Math.max(0.0002, n.gain * this.volume),
        t0 + n.at + 0.008,
      );
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.length);
      osc.connect(amp).connect(ctx.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.length + 0.02);
    }
    return true;
  }

  /** Returns whether the phone was asked to vibrate. */
  buzz(sound: KitSound): boolean {
    const pattern = BUZZ[sound];
    if (this.muted || !pattern) return false;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    return navigator.vibrate([...pattern]);
  }

  /** The sound and the touch for one thing that happened. */
  answer(sound: KitSound): void {
    this.play(sound);
    this.buzz(sound);
  }
}

/**
 * The one the kit's own controls answer through, so there is one mute and one volume for the whole
 * app. Settings sets `muted` from the stored preference when that screen is built at L5.
 */
export const kitAudio = new KitAudio();
