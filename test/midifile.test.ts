import { describe, expect, it } from "vitest";
import { vlq, writeMidiFile } from "../src";

describe("vlq: variable-length numbers", () => {
  it("small numbers are one byte", () => {
    expect(vlq(0)).toEqual([0x00]);
    expect(vlq(127)).toEqual([0x7f]);
  });
  it("128 needs two bytes, the first with the top bit set", () => {
    expect(vlq(128)).toEqual([0x81, 0x00]);
    expect(vlq(480)).toEqual([0x83, 0x60]);
  });
  it("rejects negatives and fractions", () => {
    expect(() => vlq(-1)).toThrow(RangeError);
    expect(() => vlq(1.5)).toThrow(RangeError);
  });
});

describe("writeMidiFile", () => {
  const file = writeMidiFile({ bpm: 90, trackName: "t", notes: [{ midi: 60, startBeat: 0, beats: 1 }, { midi: 64, startBeat: 1, beats: 1 }] });
  it("starts with the MThd header, format 0, one track, 480 ticks per beat", () => {
    expect(String.fromCharCode(...file.slice(0, 4))).toBe("MThd");
    expect([...file.slice(8, 14)]).toEqual([0, 0, 0, 1, 0x01, 0xe0]);
  });
  it("contains an MTrk chunk that ends with the end-of-track event", () => {
    expect(String.fromCharCode(...file.slice(14, 18))).toBe("MTrk");
    expect([...file.slice(-4)]).toEqual([0, 0xff, 0x2f, 0]);
  });
  it("sets the tempo: 90 bpm is 666667 microseconds per beat", () => {
    const hex = [...file].map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(hex).toContain("ff5103" + "0a2c2b");
  });
  it("releases a note before the next one starts on the same tick", () => {
    const f = writeMidiFile({ bpm: 120, trackName: "t", notes: [{ midi: 60, startBeat: 0, beats: 1 }, { midi: 60, startBeat: 1, beats: 1 }] });
    const bytes = [...f];
    const offAt = bytes.indexOf(0x80);
    const secondOn = bytes.lastIndexOf(0x90);
    expect(offAt).toBeLessThan(secondOn);
  });
  it("rejects a note outside 0 to 127", () => {
    expect(() => writeMidiFile({ bpm: 90, trackName: "t", notes: [{ midi: 128, startBeat: 0, beats: 1 }] })).toThrow(RangeError);
  });
});
