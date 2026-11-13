import { describe, expect, it } from "vitest";
import {
  MAJOR_STEPS,
  SCALES,
  inScale,
  modeOf,
  noteToMidi,
  noteToPitchClass,
  rotate,
  scaleMidi,
  scaleNotes,
  scalePitchClasses,
  spansOctave,
  stepsToOffsets,
  type ScaleName,
} from "../src";

describe("step patterns", () => {
  it("every scale wraps exactly one octave", () => {
    for (const [name, steps] of Object.entries(SCALES)) {
      expect(spansOctave(steps), name).toBe(true);
    }
  });

  it("major = W W H W W W H", () => {
    expect(MAJOR_STEPS).toEqual([2, 2, 1, 2, 2, 2, 1]);
    expect(stepsToOffsets(MAJOR_STEPS)).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("rotate shifts left and wraps", () => {
    expect(rotate([1, 2, 3, 4], 1)).toEqual([2, 3, 4, 1]);
    expect(rotate([1, 2, 3, 4], -1)).toEqual([4, 1, 2, 3]);
  });
});

describe("modes are rotations of the major pattern", () => {
  it("dorian is the 2nd rotation, aeolian the 6th", () => {
    expect(SCALES.dorian).toEqual([2, 1, 2, 2, 2, 1, 2]);
    expect(SCALES.aeolian).toEqual([2, 1, 2, 2, 1, 2, 2]);
  });

  it("natural minor IS aeolian, major IS ionian", () => {
    expect(SCALES.minor).toEqual(SCALES.aeolian);
    expect(SCALES.major).toEqual(SCALES.ionian);
  });

  it("all seven modes contain the same pitch classes as C major", () => {
    const cMajor = new Set(scalePitchClasses(0, MAJOR_STEPS));
    // Mode k of C major starts on the k-th degree of C major.
    const rootPcs = scalePitchClasses(0, MAJOR_STEPS);
    for (let degree = 1; degree <= 7; degree++) {
      const modePcs = scalePitchClasses(rootPcs[degree - 1]!, modeOf(MAJOR_STEPS, degree));
      expect(new Set(modePcs)).toEqual(cMajor);
    }
  });

  it("A minor shares its notes with C major (relative minor)", () => {
    const a = new Set(scalePitchClasses(noteToPitchClass("A"), SCALES.minor));
    const c = new Set(scalePitchClasses(noteToPitchClass("C"), SCALES.major));
    expect(a).toEqual(c);
  });
});

describe("spelling", () => {
  it("C major has no accidentals", () => {
    expect(scaleNotes("C", "major")).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
  });

  it("F major uses Bb, not A#, so each letter appears once", () => {
    expect(scaleNotes("F", "major")).toEqual(["F", "G", "A", "Bb", "C", "D", "E"]);
  });

  it("C# major needs E# and B#", () => {
    expect(scaleNotes("C#", "major")).toEqual(["C#", "D#", "E#", "F#", "G#", "A#", "B#"]);
  });

  it("Gb major is spelled with flats", () => {
    expect(scaleNotes("Gb", "major")).toEqual(["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"]);
  });

  it("modes: D dorian is all white keys, E phrygian too", () => {
    expect(scaleNotes("D", "dorian")).toEqual(["D", "E", "F", "G", "A", "B", "C"]);
    expect(scaleNotes("E", "phrygian")).toEqual(["E", "F", "G", "A", "B", "C", "D"]);
  });

  it("minor flavors differ by the raised notes", () => {
    expect(scaleNotes("A", "minor")).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
    expect(scaleNotes("A", "harmonicMinor")).toEqual(["A", "B", "C", "D", "E", "F", "G#"]);
    expect(scaleNotes("A", "melodicMinor")).toEqual(["A", "B", "C", "D", "E", "F#", "G#"]);
  });

  it("every 7-note scale from every root uses each letter exactly once", () => {
    const roots = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B"];
    const sevenNote = (Object.keys(SCALES) as ScaleName[]).filter((k) => SCALES[k].length === 7);
    for (const root of roots) {
      for (const name of sevenNote) {
        const letters = scaleNotes(root, name).map((n) => n[0]);
        expect(new Set(letters).size, `${root} ${name}`).toBe(7);
      }
    }
  });

  it("spelled notes agree with the pitch-class math", () => {
    const names = scaleNotes("Eb", "mixolydian");
    const pcs = scalePitchClasses(noteToPitchClass("Eb"), SCALES.mixolydian);
    expect(names.map(noteToPitchClass)).toEqual(pcs);
  });

  it("non-7-note scales fall back to sharp/flat names", () => {
    expect(scaleNotes("C", "majorPentatonic")).toEqual(["C", "D", "E", "G", "A"]);
    expect(scaleNotes("A", "minorPentatonic")).toEqual(["A", "C", "D", "E", "G"]);
    expect(scaleNotes("Bb", "majorPentatonic")).toEqual(["Bb", "C", "D", "F", "G"]);
    expect(scaleNotes("C", "wholeTone")).toEqual(["C", "D", "E", "F#", "G#", "A#"]);
  });

  it("blues is minor pentatonic plus the b5", () => {
    expect(scaleNotes("A", "blues")).toEqual(["A", "C", "D", "D#", "E", "G"]);
  });
});

describe("MIDI and highlighting helpers", () => {
  it("builds C major from middle C up one octave, including the top root", () => {
    expect(scaleMidi(noteToMidi("C4"), MAJOR_STEPS)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
  });

  it("spans multiple octaves", () => {
    const notes = scaleMidi(60, MAJOR_STEPS, 2);
    expect(notes).toHaveLength(15);
    expect(notes.at(-1)).toBe(84);
  });

  it("inScale answers 'does this key belong?' for any octave", () => {
    expect(inScale(4, 0, MAJOR_STEPS)).toBe(true); // E in C major
    expect(inScale(1, 0, MAJOR_STEPS)).toBe(false); // C# is not
    expect(inScale(-8, 0, MAJOR_STEPS)).toBe(true); // wraps: -8 mod 12 = 4 = E
  });
});
