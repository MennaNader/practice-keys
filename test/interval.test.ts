import { describe, expect, it } from "vitest";
import {
  consonance,
  intervalFromName,
  intervalName,
  invertInterval,
  noteToMidi,
  semitonesBetween,
  transpose,
} from "../src";

describe("interval names", () => {
  it("names the simple intervals", () => {
    expect(intervalName(0)).toBe("P1");
    expect(intervalName(3)).toBe("m3");
    expect(intervalName(4)).toBe("M3");
    expect(intervalName(7)).toBe("P5");
    expect(intervalName(12)).toBe("P8");
  });

  it("names compound intervals and ignores direction", () => {
    expect(intervalName(14)).toBe("M9");
    expect(intervalName(-7)).toBe("P5");
  });

  it("round-trips name <-> semitones", () => {
    for (let s = 0; s <= 24; s++) {
      expect(intervalFromName(intervalName(s))).toBe(s);
    }
  });

  it("rejects out-of-range input", () => {
    expect(() => intervalName(25)).toThrow(RangeError);
    expect(() => intervalFromName("X9")).toThrow();
  });
});

describe("measuring and moving", () => {
  it("C4 to G4 is a perfect fifth", () => {
    const d = semitonesBetween(noteToMidi("C4"), noteToMidi("G4"));
    expect(intervalName(d)).toBe("P5");
  });

  it("is signed", () => {
    expect(semitonesBetween(67, 60)).toBe(-7);
  });

  it("transposes", () => {
    expect(transpose(60, intervalFromName("M3"))).toBe(64); // C4 -> E4
    expect(transpose(60, -12)).toBe(48);
  });
});

describe("inversion", () => {
  it("major <-> minor, perfect stays perfect", () => {
    expect(intervalName(invertInterval(intervalFromName("M3")))).toBe("m6");
    expect(intervalName(invertInterval(intervalFromName("m7")))).toBe("M2");
    expect(intervalName(invertInterval(intervalFromName("P5")))).toBe("P4");
  });

  it("the tritone inverts to itself", () => {
    expect(invertInterval(6)).toBe(6);
  });

  it("inverting twice gives the original", () => {
    for (let s = 0; s <= 12; s++) {
      expect(invertInterval(invertInterval(s))).toBe(s);
    }
  });

  it("rejects compound intervals", () => {
    expect(() => invertInterval(14)).toThrow(RangeError);
  });
});

describe("consonance", () => {
  it("classifies the traditional way", () => {
    expect(consonance(7)).toBe("perfect");
    expect(consonance(4)).toBe("imperfect");
    expect(consonance(1)).toBe("dissonant");
    expect(consonance(6)).toBe("dissonant");
    expect(consonance(19)).toBe("perfect"); // compound P12 reduces to P5
  });
});
