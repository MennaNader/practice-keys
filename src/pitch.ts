/**
 * LESSON 1: Pitch
 *
 * Western music divides the octave into 12 equal semitones (12-TET).
 * Two ways to talk about a pitch:
 *   - MIDI number: absolute, one integer per semitone. C4 (middle C) = 60, A4 = 69 (440 Hz).
 *   - Pitch class: which of the 12 "note families" it belongs to, ignoring octave.
 *     C = 0, C#/Db = 1, D = 2, ... B = 11. Computed as midi mod 12.
 *
 * Enharmonics (C# vs Db) share a pitch class but are spelled differently.
 * The spelling matters for reading and for scale construction (see scale.ts).
 */

export const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as const;
export type Letter = keyof typeof LETTER_PC;
export const LETTERS: readonly Letter[] = ["C", "D", "E", "F", "G", "A", "B"];

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

export type Accidental = "sharp" | "flat";

/** Mathematical modulo: always returns a value in [0, m). JS `%` can return negatives. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Pitch class (0-11) of a MIDI note number. */
export function pitchClass(midi: number): number {
  return mod(midi, 12);
}

export interface ParsedNote {
  letter: Letter;
  /** Semitone offset from the natural: -2 = bb, -1 = b, 0 = natural, 1 = #, 2 = ## */
  accidental: number;
  /** Scientific pitch notation octave, if one was given (C4 = middle C). */
  octave?: number;
}

const NOTE_RE = /^([A-Ga-g])(#{1,2}|b{1,2})?(-?\d+)?$/;

/** Parse "C#4", "Bb", "F##3", "eb" ... into its parts. Throws on invalid input. */
export function parseNote(name: string): ParsedNote {
  const m = NOTE_RE.exec(name.trim());
  if (!m) throw new Error(`Invalid note name: "${name}"`);
  const letter = m[1]!.toUpperCase() as Letter;
  const acc = m[2] ?? "";
  const accidental = acc.startsWith("#") ? acc.length : -acc.length;
  const parsed: ParsedNote = { letter, accidental };
  if (m[3] !== undefined) parsed.octave = Number(m[3]);
  return parsed;
}

/** "C#" -> 1, "Db" -> 1, "B#" -> 0, "Cb" -> 11. Octave, if present, is ignored. */
export function noteToPitchClass(name: string): number {
  const { letter, accidental } = parseNote(name);
  return mod(LETTER_PC[letter] + accidental, 12);
}

/** "C4" -> 60, "A4" -> 69. Requires an octave. Uses scientific pitch notation (C4 = 60). */
export function noteToMidi(name: string): number {
  const { letter, accidental, octave } = parseNote(name);
  if (octave === undefined) throw new Error(`Note needs an octave to become MIDI: "${name}"`);
  return (octave + 1) * 12 + LETTER_PC[letter] + accidental;
}

/** 61 -> "C#4" (or "Db4" with prefer = "flat"). */
export function midiToName(midi: number, prefer: Accidental = "sharp"): string {
  const names = prefer === "sharp" ? SHARP_NAMES : FLAT_NAMES;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[pitchClass(midi)]}${octave}`;
}

/** Pitch class -> note name without octave, picking sharp or flat spelling. */
export function pitchClassName(pc: number, prefer: Accidental = "sharp"): string {
  const names = prefer === "sharp" ? SHARP_NAMES : FLAT_NAMES;
  return names[mod(pc, 12)]!;
}

/** Frequency in Hz for a MIDI note, A4 = 440 by default. Each semitone is a factor of 2^(1/12). */
export function midiToFrequency(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/** 1 -> "#", 2 -> "##", -1 -> "b", -2 -> "bb", 0 -> "". */
export function accidentalToString(n: number): string {
  if (n === 0) return "";
  return n > 0 ? "#".repeat(n) : "b".repeat(-n);
}
