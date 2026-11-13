/**
 * LESSON 5: Chords in a key
 *
 * Stack the "skip a stair" trick on every stair of a major staircase and you get 7 chords.
 * Their moods always follow the same pattern, in every major key:
 *
 *   stair     1      2      3      4      5      6      7
 *   mood    happy   sad    sad   happy  happy   sad   tense
 *   name     I      ii     iii    IV     V      vi     vii°
 *
 * Capital numeral = major (happy), small = minor (sad), small + ° = diminished (tense).
 * I, IV and V are "home, away, come back".
 *
 * A minor key has the SAME chords as its relative major, started from the 6th stair. So its mood list
 * is the major list rotated, and its stair positions come from the natural minor step pattern:
 *
 *   A minor:  Am   B°    C     Dm    Em    F     G
 *   name:     i    ii°   III   iv    v     VI    VII
 *
 * Teams (harmonic function): every stair has a job. Chords on the same team share notes, so they
 * can stand in for each other.
 *
 *   home: I, iii, vi    away: ii, IV    push: V, vii°
 *
 * Home goes anywhere. Away goes to push or home. Push goes home. The jobs belong to the STAIR, so the
 * same list works for major and minor keys.
 *
 * Data over branching: each pattern is one list. The stair positions come from the step patterns in
 * scale.ts, so there is nothing to type twice.
 */

import type { ChordQuality } from "./chord";
import { mod } from "./pitch";
import { MAJOR_STEPS, SCALES, rotate, stepsToOffsets } from "./scale";

export const MAJOR_KEY_QUALITIES: readonly ChordQuality[] = [
  "major",
  "minor",
  "minor",
  "major",
  "major",
  "minor",
  "diminished",
];

/** Same chords, started from the 6th stair: minor, diminished, major, minor, minor, major, major. */
export const MINOR_KEY_QUALITIES: readonly ChordQuality[] = rotate(MAJOR_KEY_QUALITIES, 5);

export type KeyMode = "major" | "minor";

const KEY_MODES = {
  major: { steps: MAJOR_STEPS, qualities: MAJOR_KEY_QUALITIES },
  minor: { steps: SCALES.minor, qualities: MINOR_KEY_QUALITIES },
} as const;

export interface KeyChord {
  /** 1 to 7: which stair of the staircase */
  degree: number;
  /** pitch class 0-11 of the chord's bottom note */
  root: number;
  quality: ChordQuality;
}

/**
 * The 7 chords of a key. chordsInKey(7) is the key of G major: roots 7 9 11 0 2 4 6 = G A B C D E F#.
 * chordsInKey(9, "minor") is A minor: roots 9 11 0 2 4 5 7 = A B C D E F G.
 */
export function chordsInKey(keyRoot: number, mode: KeyMode = "major"): KeyChord[] {
  const { steps, qualities } = KEY_MODES[mode];
  return stepsToOffsets(steps).map((offset, i) => ({
    degree: i + 1,
    root: mod(keyRoot + offset, 12),
    quality: qualities[i] as ChordQuality,
  }));
}

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

/** (1, "major") -> "I", (2, "minor") -> "ii", (7, "diminished") -> "vii°". */
export function romanNumeral(degree: number, quality: ChordQuality): string {
  const base = NUMERALS[degree - 1];
  if (base === undefined) throw new RangeError(`Degree must be 1-7: ${degree}`);
  if (quality === "major") return base;
  return base.toLowerCase() + (quality === "diminished" ? "°" : "");
}

export type HarmonicFunction = "home" | "away" | "push";

/** The job of each stair 1 to 7, in order. Index 0 is stair 1. */
export const KEY_FUNCTIONS: readonly HarmonicFunction[] = ["home", "away", "home", "away", "push", "home", "push"];

/** The chords of a key that have one job. */
export function chordsOnTeam(keyRoot: number, team: HarmonicFunction, mode: KeyMode = "major"): KeyChord[] {
  const chords = chordsInKey(keyRoot, mode);
  return chords.filter((chord, i) => KEY_FUNCTIONS[i] === team);
}

/** One chord per job, in order: ["home","away","push","home"] in C gives C, Dm, G, C. */
export function progressionFromTeams(keyRoot: number, teams: readonly HarmonicFunction[], mode: KeyMode = "major"): KeyChord[] {
  return teams.map((team) => chordsOnTeam(keyRoot, team, mode)[0]) as KeyChord[];
}
