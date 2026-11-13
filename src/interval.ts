/**
 * LESSON 2: Intervals
 *
 * An interval is the distance between two pitches, counted in semitones.
 * Names combine a quality (P = perfect, M = major, m = minor, A = augmented, d = diminished)
 * and a number (the generic size: 2nd, 3rd, ...).
 *
 * The tritone (6 semitones) is the odd one out: it is both an augmented 4th and a
 * diminished 5th depending on context, so by semitones alone we just call it "TT".
 *
 * Inversion: flip an interval over the octave. 12 - semitones.
 *   M3 (4) <-> m6 (8), P5 (7) <-> P4 (5). Majors become minors, perfects stay perfect.
 */

/** Names for 0..24 semitones. Index = semitones. */
const NAMES: readonly string[] = [
  "P1", "m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7",
  "P8",
  "m9", "M9", "m10", "M10", "P11", "A11", "P12", "m13", "M13", "m14", "M14",
  "P15",
];

export function intervalName(semitones: number): string {
  const s = Math.abs(semitones);
  const name = NAMES[s];
  if (name === undefined) {
    throw new RangeError(`Interval out of range (0-24 semitones): ${semitones}`);
  }
  return name;
}

/** "M3" -> 4, "P5" -> 7. Inverse of intervalName. */
export function intervalFromName(name: string): number {
  const i = NAMES.indexOf(name);
  if (i === -1) throw new Error(`Unknown interval name: "${name}"`);
  return i;
}

/** Signed distance from MIDI note a to b. Positive = b is higher. */
export function semitonesBetween(a: number, b: number): number {
  return b - a;
}

/** Move a MIDI note up (positive) or down (negative) by an interval in semitones. */
export function transpose(midi: number, semitones: number): number {
  return midi + semitones;
}

/** Invert a simple interval (0-12 semitones) over the octave. */
export function invertInterval(semitones: number): number {
  if (semitones < 0 || semitones > 12) {
    throw new RangeError(`Can only invert simple intervals (0-12 semitones): ${semitones}`);
  }
  return 12 - semitones;
}

/**
 * Consonance, roughly: how stable the interval sounds. Traditional classification.
 * Useful later for chord and voice-leading scoring.
 */
export type Consonance = "perfect" | "imperfect" | "dissonant";

export function consonance(semitones: number): Consonance {
  switch (Math.abs(semitones) % 12) {
    case 0:
    case 5:
    case 7:
      return "perfect";
    case 3:
    case 4:
    case 8:
    case 9:
      return "imperfect";
    default:
      return "dissonant";
  }
}
