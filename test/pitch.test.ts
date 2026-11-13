import { describe, expect, it } from "vitest";
import {
  midiToFrequency,
  midiToName,
  mod,
  noteToMidi,
  noteToPitchClass,
  parseNote,
  pitchClass,
} from "../src";

describe("pitch classes", () => {
  it("wraps MIDI numbers onto 0-11", () => {
    expect(pitchClass(60)).toBe(0); // C4
    expect(pitchClass(61)).toBe(1); // C#4
    expect(pitchClass(71)).toBe(11); // B4
    expect(pitchClass(72)).toBe(0); // C5, same family as C4
  });

  it("mod never goes negative (unlike JS %)", () => {
    expect(-1 % 12).toBe(-1);
    expect(mod(-1, 12)).toBe(11);
  });

  it("treats enharmonic spellings as the same pitch class", () => {
    expect(noteToPitchClass("C#")).toBe(noteToPitchClass("Db"));
    expect(noteToPitchClass("B#")).toBe(0);
    expect(noteToPitchClass("Cb")).toBe(11);
    expect(noteToPitchClass("E#")).toBe(5); // E# sounds like F
  });
});

describe("note names <-> MIDI", () => {
  it("anchors: C4 = 60, A4 = 69", () => {
    expect(noteToMidi("C4")).toBe(60);
    expect(noteToMidi("A4")).toBe(69);
  });

  it("handles accidentals and octave edges", () => {
    expect(noteToMidi("C#4")).toBe(61);
    expect(noteToMidi("Db4")).toBe(61);
    expect(noteToMidi("C-1")).toBe(0);
    expect(noteToMidi("G9")).toBe(127);
  });

  it("round-trips with either spelling preference", () => {
    expect(midiToName(61)).toBe("C#4");
    expect(midiToName(61, "flat")).toBe("Db4");
    for (let m = 0; m <= 127; m++) {
      expect(noteToMidi(midiToName(m))).toBe(m);
      expect(noteToMidi(midiToName(m, "flat"))).toBe(m);
    }
  });

  it("parses and rejects", () => {
    expect(parseNote("f##3")).toEqual({ letter: "F", accidental: 2, octave: 3 });
    expect(parseNote("Bb")).toEqual({ letter: "B", accidental: -1 });
    expect(() => parseNote("H4")).toThrow();
    expect(() => noteToMidi("C#")).toThrow(); // no octave
  });
});

describe("frequency", () => {
  it("A4 is 440 Hz and an octave doubles it", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440);
    expect(midiToFrequency(81)).toBeCloseTo(880);
    expect(midiToFrequency(57)).toBeCloseTo(220);
  });

  it("middle C is about 261.63 Hz", () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 2);
  });
});
