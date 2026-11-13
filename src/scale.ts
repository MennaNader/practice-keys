/**
 * LESSON 3: Scales and modes
 *
 * A scale is a recipe: a pattern of steps (in semitones) that sums to 12.
 *
 *   Major:  W W H W W W H   =  2 2 1 2 2 2 1
 *
 * Modes are not new scales. They are the SAME pattern started from a different degree.
 * Rotate the major pattern and you get the seven modes:
 *
 *   Ionian (1)     2 2 1 2 2 2 1   = major
 *   Dorian (2)     2 1 2 2 2 1 2
 *   Phrygian (3)   1 2 2 2 1 2 2
 *   Lydian (4)     2 2 2 1 2 2 1
 *   Mixolydian (5) 2 2 1 2 2 1 2
 *   Aeolian (6)    2 1 2 2 1 2 2   = natural minor
 *   Locrian (7)    1 2 2 1 2 2 2
 *
 * That is why C major and A minor share the same notes (A minor = C major starting on A).
 *
 * Spelling: a 7-note scale uses each letter name exactly once. C# major is
 * C# D# E# F# G# A# B#, NOT C# D# F F# G# A# C. Same pitches, correct names.
 */

import {
  LETTERS,
  LETTER_PC,
  accidentalToString,
  mod,
  noteToPitchClass,
  parseNote,
  pitchClassName,
  type Accidental,
} from "./pitch";

export type StepPattern = readonly number[];

export const MAJOR_STEPS: StepPattern = [2, 2, 1, 2, 2, 2, 1];

/** Rotate left by n: rotate([1,2,3], 1) -> [2,3,1]. */
export function rotate<T>(arr: readonly T[], n: number): T[] {
  const k = mod(n, arr.length);
  return [...arr.slice(k), ...arr.slice(0, k)];
}

/** Build the pattern of a mode by rotating a parent pattern. degree is 1-based. */
export function modeOf(parent: StepPattern, degree: number): StepPattern {
  return rotate(parent, degree - 1);
}

const ionian = modeOf(MAJOR_STEPS, 1);
const dorian = modeOf(MAJOR_STEPS, 2);
const phrygian = modeOf(MAJOR_STEPS, 3);
const lydian = modeOf(MAJOR_STEPS, 4);
const mixolydian = modeOf(MAJOR_STEPS, 5);
const aeolian = modeOf(MAJOR_STEPS, 6);
const locrian = modeOf(MAJOR_STEPS, 7);

export const SCALES = {
  // The seven modes of the major scale
  ionian,
  dorian,
  phrygian,
  lydian,
  mixolydian,
  aeolian,
  locrian,
  // Common aliases
  major: ionian,
  minor: aeolian,
  // Other minor flavors: raise the 7th (harmonic) or 6th and 7th going up (melodic)
  harmonicMinor: [2, 1, 2, 2, 1, 3, 1],
  melodicMinor: [2, 1, 2, 2, 2, 2, 1],
  // 5-note scales
  majorPentatonic: [2, 2, 3, 2, 3],
  minorPentatonic: [3, 2, 2, 3, 2],
  // Blues = minor pentatonic + the "blue note" (b5)
  blues: [3, 2, 1, 1, 3, 2],
  // Symmetric scales
  wholeTone: [2, 2, 2, 2, 2, 2],
  chromatic: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
} as const satisfies Record<string, StepPattern>;

export type ScaleName = keyof typeof SCALES;

/** Sanity check used by tests: a scale must wrap exactly one octave. */
export function spansOctave(steps: StepPattern): boolean {
  return steps.reduce((a, b) => a + b, 0) === 12;
}

/**
 * Steps -> semitone offsets from the root, without the closing octave.
 * [2,2,1,2,2,2,1] -> [0,2,4,5,7,9,11]
 */
export function stepsToOffsets(steps: StepPattern): number[] {
  const offsets = [0];
  for (let i = 0; i < steps.length - 1; i++) {
    offsets.push(offsets[i]! + steps[i]!);
  }
  return offsets;
}

/** Pitch classes (0-11) of a scale given a root pitch class. */
export function scalePitchClasses(rootPc: number, steps: StepPattern): number[] {
  return stepsToOffsets(steps).map((o) => mod(rootPc + o, 12));
}

/** MIDI notes of a scale over `octaves` octaves, starting at a MIDI root, ending on the top root. */
export function scaleMidi(rootMidi: number, steps: StepPattern, octaves = 1): number[] {
  const offsets = stepsToOffsets(steps);
  const out: number[] = [];
  for (let o = 0; o < octaves; o++) {
    for (const off of offsets) out.push(rootMidi + o * 12 + off);
  }
  out.push(rootMidi + octaves * 12);
  return out;
}

/**
 * Spell a scale with proper note names, e.g. scaleNotes("F", "major") -> F G A Bb C D E.
 *
 * 7-note scales are spelled by letter (each letter once). Other sizes fall back to
 * sharp or flat names, flats if the root contains a flat.
 */
export function scaleNotes(root: string, scale: ScaleName | StepPattern): string[] {
  const steps = typeof scale === "string" ? SCALES[scale] : scale;
  const rootPc = noteToPitchClass(root);
  const pcs = scalePitchClasses(rootPc, steps);

  if (pcs.length === 7) {
    const startLetter = parseNote(root).letter;
    const startIdx = LETTERS.indexOf(startLetter);
    return pcs.map((pc, degree) => {
      const letter = LETTERS[(startIdx + degree) % 7]!;
      // Smallest signed distance from the letter's natural pitch to the target pitch class.
      const diff = mod(pc - LETTER_PC[letter] + 6, 12) - 6;
      return `${letter}${accidentalToString(diff)}`;
    });
  }

  const prefer: Accidental = parseNote(root).accidental < 0 ? "flat" : "sharp";
  return pcs.map((pc) => pitchClassName(pc, prefer));
}

/** Is this pitch class (0-11) in the scale? Handy for highlighting keys on a piano UI. */
export function inScale(pc: number, rootPc: number, steps: StepPattern): boolean {
  return scalePitchClasses(rootPc, steps).includes(mod(pc, 12));
}
