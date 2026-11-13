import { describe, expect, it } from "vitest";
import { CHORDS, chord, chordPitchClasses } from "../src";

describe("chord shapes", () => {
  it("major is happy: 4 tiny steps to the middle note", () => {
    expect(chord(0, "major")).toEqual([0, 4, 7]); // C E G
  });

  it("minor is sad: only the middle note drops one tiny step", () => {
    expect(chord(4, "minor")).toEqual([4, 7, 11]); // E G B
    expect(CHORDS.major[1] - CHORDS.minor[1]).toBe(1);
  });

  it("diminished is minor with the top note squeezed down one tiny step", () => {
    expect(chord(0, "diminished")).toEqual([0, 3, 6]);
    expect(CHORDS.minor[2] - CHORDS.diminished[2]).toBe(1);
  });
});

describe("keeping octaves vs naming", () => {
  it("chord() keeps the notes rising", () => {
    expect(chord(9, "minor")).toEqual([9, 12, 16]); // A C E, in order
  });

  it("chordPitchClasses() wraps onto 0-11 for naming", () => {
    expect(chordPitchClasses(9, "minor")).toEqual([9, 0, 4]);
    expect(chordPitchClasses(7, "major")).toEqual([7, 11, 2]); // G B D
  });
});

describe("home, away, come back (I, IV, V in C)", () => {
  it("F major is F A C and G major is G B D", () => {
    expect(chordPitchClasses(5, "major")).toEqual([5, 9, 0]);
    expect(chordPitchClasses(7, "major")).toEqual([7, 11, 2]);
  });
});
