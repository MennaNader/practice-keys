import { describe, expect, it } from "vitest";
import { BAR_RHYTHMS, maqamSong, seededRandom } from "../src";

describe("seededRandom", () => {
  it("gives the same numbers for the same seed, different numbers for another", () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const c = seededRandom(8);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
  });
  it("stays from 0 up to (not including) 1", () => {
    const r = seededRandom(1);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("every bar rhythm fills exactly one bar of 4 beats", () => {
  it.each(BAR_RHYTHMS.map((r) => [r.join(" ")] as const))("%s", (name) => {
    const r = BAR_RHYTHMS.find((x) => x.join(" ") === name)!;
    expect(r.reduce((a, b) => a + b, 0)).toBe(4);
  });
});

describe("maqamSong: a random tune from a maqam's notes", () => {
  const songs = Array.from({ length: 200 }, (_, seed) => maqamSong(seededRandom(seed)));

  it("is the same tune for the same seed, and a different tune for another seed", () => {
    expect(maqamSong(seededRandom(5))).toEqual(maqamSong(seededRandom(5)));
    expect(maqamSong(seededRandom(5))).not.toEqual(maqamSong(seededRandom(6)));
  });

  it("only uses notes 0 to 7 of the maqam (the home note up to the octave)", () => {
    for (const s of songs) for (const n of s) expect(Number.isInteger(n.degree) && n.degree >= 0 && n.degree <= 7).toBe(true);
  });

  it("starts on the home note and rests on it at the end (qarar)", () => {
    for (const s of songs) {
      expect(s[0]!.degree).toBe(0);
      expect(s[s.length - 1]!.degree).toBe(0);
    }
  });

  it("fills exactly 4 bars of 4 beats with no gaps and no overlaps, ending on a held note", () => {
    for (const s of songs) {
      let beat = 0;
      for (const n of s) {
        expect(n.startBeat).toBe(beat);
        beat += n.beats;
      }
      expect(beat).toBe(16);
      expect(s[s.length - 1]!.beats).toBe(3);
    }
  });

  it("pauses halfway on the 5th note or the home note (ghammaz)", () => {
    for (const s of songs) {
      const endOfBar2 = s.filter((n) => n.startBeat < 8).at(-1)!;
      expect([0, 4]).toContain(endOfBar2.degree);
    }
  });

  it("mostly walks in small steps: at least 60% of moves are 2 degrees or less", () => {
    let small = 0;
    let total = 0;
    for (const s of songs) {
      for (let i = 1; i < s.length; i++) {
        total++;
        if (Math.abs(s[i]!.degree - s[i - 1]!.degree) <= 2) small++;
      }
    }
    expect(small / total).toBeGreaterThan(0.6);
  });

  it("makes more bars when asked, and rejects a bad number of bars", () => {
    const eight = maqamSong(seededRandom(1), 8);
    expect(eight[eight.length - 1]!.startBeat).toBe(29);
    expect(() => maqamSong(seededRandom(1), 0)).toThrow(RangeError);
    expect(() => maqamSong(seededRandom(1), 2.5)).toThrow(RangeError);
    expect(() => maqamSong(seededRandom(1), 17)).toThrow(RangeError);
  });
});
