/**
 * LESSON 13: Making a tune from a maqam's notes
 *
 * A maqam is a menu of 7 notes (8 with the high repeat of the home note). A tune is a choice of WHICH note comes
 * next and HOW LONG it lasts. A random tune that still sounds like a tune follows a few habits:
 *
 *   1. Mostly small moves. Melodies walk (next note up or down), and only sometimes jump.
 *   2. Phrases end on resting notes. In maqam music the home note is the "qarar" (where the music rests) and the
 *      5th note is a "ghammaz" (a pivot you stop on halfway, like a comma). Bar 2 ends on one of them, the last
 *      bar ends on the home note, held long.
 *   3. Rhythms come from a few shapes (long-short, short-short-long, ...) that each fill a bar exactly.
 *
 * The notes are DEGREES (0 = home note, 1 = second note, ... 7 = the home note one octave up), not piano keys.
 * The app turns a degree into a key and its tuning, so the same tune works for every maqam and every home note.
 *
 * "Random" here is a seeded random generator: the same seed always gives the same tune, so a tune can be replayed,
 * shared, and tested. A different seed gives a different tune.
 */

export interface SongNote {
  /** 0 = home note, 1 to 6 = the other notes of the maqam, 7 = home note one octave higher. */
  degree: number;
  /** Where the note starts, in beats from the beginning. */
  startBeat: number;
  /** How long it lasts, in beats. */
  beats: number;
}

/** A small seeded random number generator (mulberry32): call it to get a number from 0 up to (not including) 1. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ways to fill one bar of 4 beats. Each adds up to exactly 4. */
export const BAR_RHYTHMS: readonly (readonly number[])[] = [
  [1, 1, 1, 1],
  [2, 1, 1],
  [1, 1, 2],
  [1.5, 0.5, 1, 1],
  [1, 0.5, 0.5, 2],
  [0.5, 0.5, 1, 2],
  [2, 2],
  [0.5, 0.5, 0.5, 0.5, 2],
];

/** The last two bars end more calmly: longer notes. */
const CALM_RHYTHMS = BAR_RHYTHMS.filter((r) => r.length <= 3);

const pick = <T,>(rng: () => number, items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;

/** How far the next note moves, in degrees: mostly 1 step, sometimes 0 or 2, rarely a jump of 3 or 4. */
const MOVES: readonly number[] = [-1, -1, -1, 1, 1, 1, -2, 2, 0, -3, 3, -4, 4];

/**
 * A random tune from a maqam's notes: `bars` bars of 4 beats (default 4).
 * Starts on the home note, rests on the 5th or home note at the end of bar 2, and ends on the home note.
 */
export function maqamSong(rng: () => number, bars = 4): SongNote[] {
  if (!Number.isInteger(bars) || bars < 1 || bars > 16) throw new RangeError(`bars must be a whole number from 1 to 16, got ${bars}`);
  const notes: SongNote[] = [];
  let degree = 0;
  let beat = 0;
  for (let bar = 0; bar < bars; bar++) {
    const last = bar === bars - 1;
    const rhythm = last ? [1, 3] : bar === bars - 2 && bars > 2 ? pick(rng, CALM_RHYTHMS) : pick(rng, BAR_RHYTHMS);
    const restBar = bar === Math.floor(bars / 2) - 1 && bars >= 4; // the "comma" in the middle of the tune
    rhythm.forEach((beats, i) => {
      const isLastInBar = i === rhythm.length - 1;
      if (bar === 0 && i === 0) {
        degree = 0;
      } else if (last && isLastInBar) {
        degree = 0; // qarar: the tune rests at home
      } else if (restBar && isLastInBar) {
        degree = rng() < 0.6 ? 4 : 0; // ghammaz (the 5th) or home
      } else {
        let next = degree + pick(rng, MOVES);
        if (next < 0 || next > 7) next = degree - Math.sign(next - degree); // bounce off the edges
        degree = Math.min(7, Math.max(0, next));
      }
      notes.push({ degree, startBeat: beat, beats });
      beat += beats;
    });
  }
  return notes;
}
