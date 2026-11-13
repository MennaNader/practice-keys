/**
 * LESSON 9: Tuning, or how many steps in an octave
 *
 * Every note is a frequency (wiggles per second). A4 = 440 Hz, and one octave up doubles it.
 * Cut the octave into N equal steps and each step multiplies the frequency by the same number r.
 * After N steps we must have doubled, so r ** N = 2, which means r = 2 ** (1 / N).
 *
 *   N = 12  (the piano, "12-TET"):            r = 2 ** (1 / 12)
 *   N = 24  (quarter tones, "24-TET"):        r = 2 ** (1 / 24)
 *
 * The 24-step line contains every piano note (the even numbers) plus the notes in between (the odd
 * numbers), which is where maqam notes such as E half-flat live.
 *
 *   note (24-step line):   C=0   D=4   E=8   F=10   G=14   A=18   B=22   C=24
 *   E half-flat = 7 and B half-flat = 21, one quarter-tone step lower.
 */

import { mod } from "./pitch";
import { stepsToOffsets } from "./scale";

/** Frequency in Hz of the note n steps above (or below) A4 = 440 Hz, in an octave of `stepsPerOctave` equal steps. */
export function edoFrequency(stepsFromA4: number, stepsPerOctave: number): number {
  if (!(stepsPerOctave > 0)) throw new RangeError(`stepsPerOctave must be above 0, got ${stepsPerOctave}`);
  return 440 * Math.pow(2, stepsFromA4 / stepsPerOctave);
}

/**
 * LESSON 10: Rast, the first maqam
 *
 * A maqam is a scale (plus habits for how to use it), here written in QUARTER-TONE steps, so the 24 steps
 * of one octave add up to 24:
 *
 *   major:  4 4 2 4 4 4 2
 *   Rast:   4 3 3 4 4 3 3     (the 3rd and 7th notes are a quarter tone lower: "half-flat")
 *
 * Read it as  4 3 3 | 4 | 4 3 3: the same four-note shape (a "jins", here jins Rast) repeated on the 5th note.
 */
export const RAST = [4, 3, 3, 4, 4, 3, 3] as const;

/**
 * Hijaz, the dramatic maqam: a half step, then a jump of THREE half steps (6 quarter tones), then a half step.
 * It adds up to 24 like every octave. On C it is C D♭ E F G A♭ B♭, and because all its offsets are even
 * (whole semitones), no piano key needs re-tuning in this 24-step model.
 */
export const HIJAZ = [2, 6, 2, 4, 2, 4, 4] as const;

/**
 * Bayati, the "sad" one: it starts with two SMALL steps (3 3) and so has a quarter-tone note as its 2nd note.
 * The rest looks like a plain minor scale. Source: DiArMaqAr (Cairo 1929 tuning).
 */
export const BAYATI = [3, 3, 4, 4, 2, 4, 4] as const;

/**
 * Sika starts on E half-flat (a quarter tone below E), so its home note itself sits between two keys:
 * see MAQAM_START. It is called "Segah" in the DiArMaqAr archive. It does not fit the 3 | 1 | 3 cut of splitJins.
 */
export const SIKA = [3, 4, 4, 3, 3, 4, 3] as const;

/** Nahawand, the Arabic minor: the archive's form uses a harmonic-minor shape (the big jump 6 near the top). No bent notes. */
export const NAHAWAND = [4, 2, 4, 4, 2, 6, 2] as const;

/** Saba: a very tense maqam with ONE bent note (the 2nd) and a big jump of 6. */
export const SABA = [3, 3, 2, 6, 2, 4, 4] as const;

/** The maqamat the app knows, as quarter-tone steps. */
export const MAQAMAT = { rast: RAST, hijaz: HIJAZ, bayati: BAYATI, sika: SIKA, nahawand: NAHAWAND, saba: SABA } as const;
export type MaqamName = keyof typeof MAQAMAT;

/**
 * How many quarter tones the home note sits BELOW the piano key of its root name. Every maqam starts exactly on
 * a piano key, except Sika, whose home note is half-flat (-1).
 */
export const MAQAM_START: Record<MaqamName, number> = { rast: 0, hijaz: 0, bayati: 0, sika: -1, nahawand: 0, saba: 0 };

/**
 * Cut a 7-step maqam into its three parts: [first jins, the one step in the middle, second jins].
 * Rast 4 3 3 4 4 3 3  ->  [[4,3,3], [4], [4,3,3]]
 */
/** Frequencies of a scale from its root up to the octave. Steps are counted in steps of the tuning. */
export function scaleFrequencies(rootStepsFromA4: number, steps: readonly number[], stepsPerOctave: number): number[] {
  const octave = steps.reduce((sum, n) => sum + n, 0);
  return [...stepsToOffsets(steps), octave].map((offset) => edoFrequency(rootStepsFromA4 + offset, stepsPerOctave));
}

/**
 * How a piano key must be re-tuned to play a maqam. Keys are counted from the maqam's root (0 to 11) and the
 * answer is in quarter-tone steps: 0 = leave the key alone, -1 = one quarter tone lower (half-flat).
 *
 *   Rast: key 4 (the major 3rd) and key 11 (the major 7th) are -1, every other key is 0.
 *
 * Steps are in quarter tones (24 per octave). A note on an odd step has no key of its own, so it is played by
 * the key just above it, tuned down.
 */
export function keyAdjustments(steps: readonly number[], start = 0): number[] {
  const adjustments = Array.from({ length: 12 }, () => 0);
  for (const offset of stepsToOffsets(steps)) {
    const o = offset + start; // quarter tones above the root key
    const key = Math.ceil(o / 2);
    adjustments[mod(key, 12)] = o - 2 * key;
  }
  return adjustments;
}

/** Frequency of a piano key (MIDI note) when its re-tuning for a maqam rooted on `rootPc` is applied. */
export function maqamFrequency(midi: number, rootPc: number, adjustments: readonly number[]): number {
  return edoFrequency(2 * (midi - 69) + (adjustments[mod(midi - rootPc, 12)] ?? 0), 24);
}

export function splitJins(steps: readonly number[]): [number[], number[], number[]] {
  if (steps.length !== 7) throw new RangeError(`splitJins expects a 7-step maqam, got ${steps.length} steps`);
  const firstJins = steps.slice(0, 3);
  const middleStep = steps[3] as number;
  const secondJins = steps.slice(4);
  return [firstJins, [middleStep], secondJins];
}

/**
 * LESSON 11: Chords in a maqam
 *
 * Stack every second note of the scale and you get a three-note chord on each note: note 1+3+5, note 2+4+6, and so
 * on. The size of the gap between the first two notes (the "third") decides the colour, counted in quarter tones:
 * 6 = minor, 8 = major, and 7 = in between ("neutral", the sound of a Rast chord on its 3rd note).
 *
 * Returns 7 chords, each as three note numbers in quarter tones above the root key (the maqam's `start` is
 * included). The numbers can pass 24 when the chord reaches into the next octave.
 */
export function maqamTriads(steps: readonly number[], start = 0): number[][] {
  const offsets = stepsToOffsets(steps);
  const at = (k: number) => (offsets[k % 7] as number) + 24 * Math.floor(k / 7) + start;
  return offsets.map((_, i) => [at(i), at(i + 2), at(i + 4)]);
}

/** "minor", "neutral" or "major" for a third of this many quarter tones. */
export function thirdName(quarterTones: number): "minor" | "neutral" | "major" {
  if (quarterTones <= 6) return "minor";
  if (quarterTones >= 8) return "major";
  return "neutral";
}

/**
 * A Scala (.scl) tuning file for a maqam, written from C: Ableton Live and other synths read it to re-tune their
 * keys. Each of the 12 keys gets its place in cents (100 cents = one piano semitone).
 *
 * If the maqam moves the key C itself (Sika on C), the whole file is shifted, and `shiftCents` says by how much:
 * set the reference note C in the host to 261.63 Hz plus that shift.
 */
export function scalaFile(opts: { name: string; description: string; rootPc: number; adjustments: readonly number[] }): { text: string; shiftCents: number } {
  const { name, description, rootPc, adjustments } = opts;
  if (!Number.isInteger(rootPc) || rootPc < 0 || rootPc > 11) throw new RangeError(`rootPc must be an integer from 0 to 11, got ${rootPc}`);
  const cents = (pc: number) => pc * 100 + 50 * (adjustments[mod(pc - rootPc, 12)] ?? 0);
  const shiftCents = cents(0);
  const lines = Array.from({ length: 11 }, (_, i) => ` ${(cents(i + 1) - shiftCents).toFixed(1)}`);
  const text = [`! ${name}.scl`, "!", description, " 12", "!", ...lines, " 2/1", ""].join("\n");
  return { text, shiftCents };
}
