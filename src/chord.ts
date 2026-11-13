/**
 * LESSON 4: Chords
 *
 * A chord is several notes sounding together. Each chord type is a SHAPE:
 * how many tiny steps (semitones) each note sits above the bottom note (the root).
 *
 *   major       [0, 4, 7]   happy    (4 tiny steps to the middle note)
 *   minor       [0, 3, 7]   sad      (3 tiny steps to the middle note)
 *   diminished  [0, 3, 6]   tense    (3 + 3, squeezed)
 *
 * Only the middle (and for diminished, the top) note moves. One tiny step changes the mood.
 *
 * Data over branching: a new chord type is one new line in CHORDS, and the functions never change.
 */

import { mod } from "./pitch";

export const CHORDS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
} as const satisfies Record<string, readonly number[]>;

export type ChordQuality = keyof typeof CHORDS;

/**
 * MIDI notes of a chord, rising from the root. NOT wrapped to 0-11, so the notes stay in order
 * and keep their octave: chord(9, "minor") -> [9, 12, 16] (A C E), good for playing.
 */
export function chord(root: number, quality: ChordQuality): number[] {
  return CHORDS[quality].map((interval) => root + interval);
}

/** Same chord as pitch classes (0-11), good for naming: chordPitchClasses(9, "minor") -> [9, 0, 4]. */
export function chordPitchClasses(root: number, quality: ChordQuality): number[] {
  return chord(root, quality).map((n) => mod(n, 12));
}
