import { describe, expect, it } from "vitest";
import { beatsToSeconds, chordStartTimes } from "../src";

describe("beats to seconds", () => {
  it("at 60 BPM one beat is one second", () => {
    expect(beatsToSeconds(1, 60)).toBe(1);
  });

  it("a 16-beat song (4 chords of one bar) lasts 16 seconds at 60 BPM", () => {
    expect(beatsToSeconds(16, 60)).toBe(16);
  });

  it("double the tempo, half the time: 16 beats at 120 BPM is 8 seconds", () => {
    expect(beatsToSeconds(16, 120)).toBe(8);
  });

  it("zero beats take no time", () => {
    expect(beatsToSeconds(0, 100)).toBe(0);
  });

  it("a tempo of 0 or less is invalid", () => {
    expect(() => beatsToSeconds(4, 0)).toThrow(RangeError);
    expect(() => beatsToSeconds(4, -90)).toThrow(RangeError);
  });
});

describe("when does each chord start?", () => {
  it("4 chords of one bar at 60 BPM start at 0, 4, 8, 12 seconds", () => {
    expect(chordStartTimes(4, 4, 60)).toEqual([0, 4, 8, 12]);
  });

  it("at 120 BPM the same song starts its chords twice as fast", () => {
    expect(chordStartTimes(4, 4, 120)).toEqual([0, 2, 4, 6]);
  });

  it("the first chord always starts at 0", () => {
    expect(chordStartTimes(3, 2, 90)[0]).toBe(0);
  });

  it("no chords gives an empty list", () => {
    expect(chordStartTimes(0, 4, 100)).toEqual([]);
  });
});

import { HAT, KICK, SNARE, hitTimes } from "../src";

describe("drum patterns", () => {
  it("at 120 BPM the kick hits on beats 1 and 3: 0 and 1 second", () => {
    expect(hitTimes(KICK, 120)).toEqual([0, 1]);
  });

  it("the snare hits on beats 2 and 4: 0.5 and 1.5 seconds", () => {
    expect(hitTimes(SNARE, 120)).toEqual([0.5, 1.5]);
  });

  it("the hi-hat hits every eighth note: 8 hits, 0.25 seconds apart at 120 BPM", () => {
    expect(hitTimes(HAT, 120)).toEqual([0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]);
  });

  it("a 16-slot pattern has slots half as long: 0.125 seconds at 120 BPM", () => {
    const sixteenths = Array.from({ length: 16 }, () => 1);
    expect(hitTimes(sixteenths, 120).slice(0, 3)).toEqual([0, 0.125, 0.25]);
  });

  it("a 4-slot pattern has one slot per beat: 0.5 seconds at 120 BPM", () => {
    expect(hitTimes([1, 1, 1, 1], 120)).toEqual([0, 0.5, 1, 1.5]);
  });

  it("an empty pattern, or all rests, has no hits", () => {
    expect(hitTimes([], 120)).toEqual([]);
    expect(hitTimes([0, 0, 0, 0], 120)).toEqual([]);
  });

  it("a faster tempo brings the hits closer together", () => {
    expect(hitTimes(KICK, 240)).toEqual([0, 0.5]);
  });
});
