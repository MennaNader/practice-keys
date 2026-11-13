import { describe, expect, it } from "vitest";
import { HIJAZ, splitJins, MAQAMAT, RAST, edoFrequency, keyAdjustments, maqamFrequency, midiToFrequency, scaleFrequencies } from "../src";

describe("frequency for any number of steps per octave", () => {
  it("A4 itself is 440 Hz, whatever the tuning", () => {
    expect(edoFrequency(0, 12)).toBe(440);
    expect(edoFrequency(0, 24)).toBe(440);
  });

  it("one octave up doubles the frequency, however you count it", () => {
    expect(edoFrequency(12, 12)).toBeCloseTo(880, 9);
    expect(edoFrequency(24, 24)).toBeCloseTo(880, 9);
    expect(edoFrequency(19, 19)).toBeCloseTo(880, 9);
  });

  it("one octave down halves it", () => {
    expect(edoFrequency(-12, 12)).toBeCloseTo(220, 9);
  });

  it("a quarter tone above A4 is about 452.89 Hz, between A (440) and A sharp (466.16)", () => {
    const quarter = edoFrequency(1, 24);
    expect(quarter).toBeCloseTo(452.893, 2);
    expect(quarter).toBeGreaterThan(edoFrequency(0, 24));
    expect(quarter).toBeLessThan(edoFrequency(2, 24)); // the next piano key
  });

  it("every piano note is an even step on the 24-step line: same frequency", () => {
    expect(edoFrequency(2, 24)).toBeCloseTo(edoFrequency(1, 12), 9);
    expect(edoFrequency(6, 24)).toBeCloseTo(edoFrequency(3, 12), 9);
  });

  it("with 12 steps it agrees with midiToFrequency for every MIDI note", () => {
    for (let midi = 0; midi <= 127; midi++) {
      expect(edoFrequency(midi - 69, 12)).toBeCloseTo(midiToFrequency(midi), 9);
    }
  });

  it("every step multiplies by the same ratio", () => {
    const r = edoFrequency(1, 24) / edoFrequency(0, 24);
    expect(edoFrequency(5, 24) / edoFrequency(4, 24)).toBeCloseTo(r, 9);
    expect(r).toBeCloseTo(2 ** (1 / 24), 12);
  });

  it("a tuning with 0 or negative steps per octave is invalid", () => {
    expect(() => edoFrequency(1, 0)).toThrow(RangeError);
    expect(() => edoFrequency(1, -12)).toThrow(RangeError);
  });
});

describe("Rast: the first maqam", () => {
  it("its steps add up to 24 quarter tones, one octave", () => {
    expect(RAST.reduce((a, b) => a + b, 0)).toBe(24);
  });

  it("it is the same four-note shape twice: 4 3 3 | 4 | 4 3 3", () => {
    expect(RAST.slice(0, 3)).toEqual(RAST.slice(4, 7));
  });

  it("Rast on C: E half-flat is 320.24 Hz, between E flat (311.13) and E (329.63)", () => {
    const rast = scaleFrequencies(-18, RAST, 24); // C4 is 18 quarter tones below A4
    expect(rast[2]).toBeCloseTo(320.24, 2);
    expect(rast[2]).toBeGreaterThan(midiToFrequency(63));
    expect(rast[2]).toBeLessThan(midiToFrequency(64));
  });

  it("Rast on C: B half-flat is 479.82 Hz, between B flat (466.16) and B (493.88)", () => {
    expect(scaleFrequencies(-18, RAST, 24)[6]).toBeCloseTo(479.82, 2);
  });

  it("Rast on C has 8 notes from C4 (261.63) up to C5 (523.25)", () => {
    const rast = scaleFrequencies(-18, RAST, 24);
    expect(rast).toHaveLength(8);
    expect(rast[0]).toBeCloseTo(261.63, 2);
    expect(rast[7]).toBeCloseTo(523.25, 2);
  });

  it("the notes that sit on piano keys (C D F G A) match the piano exactly", () => {
    const rast = scaleFrequencies(-18, RAST, 24);
    for (const [i, midi] of [[0, 60], [1, 62], [3, 65], [4, 67], [5, 69], [7, 72]] as const) {
      expect(rast[i]).toBeCloseTo(midiToFrequency(midi), 9);
    }
  });

  it("major written in quarter tones needs no re-tuning at all", () => {
    expect(keyAdjustments([4, 4, 2, 4, 4, 4, 2])).toEqual(Array.from({ length: 12 }, () => 0));
  });

  it("Rast re-tunes only the 3rd and 7th keys, one quarter tone down", () => {
    expect(keyAdjustments(RAST)).toEqual([0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, -1]);
  });

  it("with Rast on C, the E key plays E half-flat and the B key plays B half-flat", () => {
    const adj = keyAdjustments(RAST);
    expect(maqamFrequency(64, 0, adj)).toBeCloseTo(320.24, 2);
    expect(maqamFrequency(71, 0, adj)).toBeCloseTo(479.82, 2);
  });

  it("every other key keeps its normal piano pitch, in every octave", () => {
    const adj = keyAdjustments(RAST);
    for (let midi = 36; midi < 96; midi++) {
      const rel = (((midi - 60) % 12) + 12) % 12;
      if (rel === 4 || rel === 11) continue;
      expect(maqamFrequency(midi, 0, adj), `midi ${midi}`).toBeCloseTo(midiToFrequency(midi), 9);
    }
  });

  it("with Rast on G, the keys that are lowered move with the root: B (3rd) and F sharp (7th)", () => {
    const adj = keyAdjustments(RAST);
    expect(maqamFrequency(71, 7, adj)).toBeLessThan(midiToFrequency(71)); // B
    expect(maqamFrequency(66, 7, adj)).toBeLessThan(midiToFrequency(66)); // F sharp
    expect(maqamFrequency(64, 7, adj)).toBeCloseTo(midiToFrequency(64), 9); // E stays
  });
});

describe("Hijaz: the second maqam", () => {
  it("adds up to one octave of 24 steps", () => {
    expect(HIJAZ.reduce((a, b) => a + b, 0)).toBe(24);
  });

  it("has a jump of 6 quarter tones (an augmented second) in the middle of its first four notes", () => {
    expect(HIJAZ.slice(0, 3)).toEqual([2, 6, 2]);
  });

  it("on C is C Db E F G Ab Bb, the same pitches as the piano keys", () => {
    const hz = scaleFrequencies(-18, HIJAZ, 24);
    const piano = [0, 1, 4, 5, 7, 8, 10, 12].map((k) => midiToFrequency(60 + k));
    hz.forEach((f, i) => expect(f).toBeCloseTo(piano[i]!, 9));
  });

  it("needs no key re-tuning", () => {
    expect(keyAdjustments(HIJAZ)).toEqual(Array(12).fill(0));
  });

  it("is listed with Rast", () => {
    expect(Object.keys(MAQAMAT)).toEqual(["rast", "hijaz", "bayati", "sika", "nahawand", "saba"]);
  });
});

describe("splitJins: first jins + one step + second jins", () => {
  it("cuts Rast into [4 3 3], [4], [4 3 3]", () => {
    expect(splitJins(RAST)).toEqual([[4, 3, 3], [4], [4, 3, 3]]);
  });

  it("cuts Hijaz into [2 6 2], [4], [2 4 4]", () => {
    expect(splitJins(HIJAZ)).toEqual([[2, 6, 2], [4], [2, 4, 4]]);
  });

  it("gives two jins of 10 quarter tones (a fourth) and a step of 4, for Rast, Hijaz, Bayati and Nahawand", () => {
    for (const steps of [RAST, HIJAZ, BAYATI, NAHAWAND]) {
      const [low, step, high] = splitJins(steps);
      expect(low.reduce((a, b) => a + b, 0)).toBe(10);
      expect(step).toEqual([4]);
      expect(high.reduce((a, b) => a + b, 0)).toBe(10);
    }
  });

  it("throws when there are not 7 steps", () => {
    expect(() => splitJins([4, 4, 2])).toThrow(RangeError);
  });
});

import { BAYATI, MAQAM_START, NAHAWAND, SABA, SIKA, maqamTriads, scalaFile, thirdName } from "../src";

describe("more maqamat", () => {
  it("every maqam adds up to one octave of 24 quarter tones", () => {
    for (const steps of Object.values(MAQAMAT)) expect(steps.reduce((a, b) => a + b, 0)).toBe(24);
  });

  it("Bayati bends only its 2nd note (key 2 is a quarter tone low)", () => {
    const adj = keyAdjustments(BAYATI);
    expect(adj.filter((a) => a !== 0)).toEqual([-1]);
    expect(adj[2]).toBe(-1);
  });

  it("Sika starts a quarter tone below its root key, so the root key itself is bent", () => {
    expect(MAQAM_START.sika).toBe(-1);
    const adj = keyAdjustments(SIKA, MAQAM_START.sika);
    expect(adj[0]).toBe(-1);
  });

  it("Nahawand has no bent notes; it is the archive's harmonic-minor shape 4 2 4 4 2 6 2", () => {
    expect(NAHAWAND).toEqual([4, 2, 4, 4, 2, 6, 2]);
    expect(keyAdjustments(NAHAWAND).every((a) => a === 0)).toBe(true);
  });

  it("Saba has exactly one bent note, its 2nd", () => {
    const adj = keyAdjustments(SABA);
    expect(adj.filter((a) => a !== 0)).toHaveLength(1);
    expect(adj[2]).toBe(-1);
  });

  it("Sika does not fit the 3 | 1 | 3 cut that the others share", () => {
    const [low, , high] = splitJins(SIKA);
    expect([low.reduce((a, b) => a + b, 0), high.reduce((a, b) => a + b, 0)]).not.toEqual([10, 10]);
  });
});

describe("chords in a maqam", () => {
  it("Rast gives 7 chords of 3 notes, and the first is 0 7 14 (a neutral third then a fifth)", () => {
    const t = maqamTriads(RAST);
    expect(t).toHaveLength(7);
    expect(t[0]).toEqual([0, 7, 14]);
  });

  it("the sixth chord reaches the octave exactly (second note 24)", () => {
    expect(maqamTriads(RAST)[5]![1]).toBe(24);
  });

  it("names a third by its size in quarter tones: 6 minor, 7 neutral, 8 major", () => {
    expect([thirdName(6), thirdName(7), thirdName(8)]).toEqual(["minor", "neutral", "major"]);
  });
});

describe("scalaFile", () => {
  const rast = scalaFile({ name: "rast-C", description: "Rast on C", rootPc: 0, adjustments: keyAdjustments(RAST) });

  it("lists 11 notes and the octave, for 12 notes in all", () => {
    const lines = rast.text.split("\n");
    expect(lines[3]?.trim()).toBe("12");
    expect(lines.filter((l) => /^\s+\d+\.\d$/.test(l))).toHaveLength(11);
    expect(rast.text).toContain(" 2/1");
  });

  it("puts E half-flat at 350 cents and B half-flat at 1050 cents", () => {
    expect(rast.text).toContain(" 350.0");
    expect(rast.text).toContain(" 1050.0");
    expect(rast.shiftCents).toBe(0);
  });

  it("Sika on C shifts the whole file by -50 cents, because C itself is bent", () => {
    const sika = scalaFile({ name: "s", description: "s", rootPc: 0, adjustments: keyAdjustments(SIKA, -1) });
    expect(sika.shiftCents).toBe(-50);
  });

  it("rejects a bad root", () => {
    expect(() => scalaFile({ name: "x", description: "x", rootPc: 12, adjustments: [] })).toThrow(RangeError);
  });
});
