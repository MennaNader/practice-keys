import { describe, expect, it } from "vitest";
import { gmDrum, parseMidiMessage } from "../src";

describe("reading MIDI messages from a keyboard", () => {
  it("[144, 60, 127] is middle C pressed as hard as possible, on channel 1", () => {
    expect(parseMidiMessage([144, 60, 127])).toEqual({ type: "on", note: 60, velocity: 1, channel: 1 });
  });

  it("velocity is scaled to 0..1: a medium hit (64) is about half", () => {
    const e = parseMidiMessage([0x90, 64, 64]);
    expect(e?.velocity).toBeCloseTo(0.504, 2);
  });

  it("[128, 60, 0] is middle C released", () => {
    expect(parseMidiMessage([128, 60, 0])).toEqual({ type: "off", note: 60, velocity: 0, channel: 1 });
  });

  it("many keyboards release with a note-on of velocity 0, which also means off", () => {
    expect(parseMidiMessage([0x90, 60, 0])?.type).toBe("off");
  });

  it("the channel sits in the low 4 bits: 0x93 is channel 4, 0x99 is channel 10 (drum pads)", () => {
    expect(parseMidiMessage([0x93, 60, 100])?.channel).toBe(4);
    expect(parseMidiMessage([0x99, 36, 100])?.channel).toBe(10);
  });

  it("knobs, pedals, pitch bend and clock ticks are not notes", () => {
    expect(parseMidiMessage([0xb0, 64, 127])).toBeNull(); // sustain pedal (a control change)
    expect(parseMidiMessage([0xe0, 0, 64])).toBeNull(); // pitch bend
    expect(parseMidiMessage([0xf8])).toBeNull(); // clock tick (too short, and not a note)
  });

  it("garbage data bytes above 127 are rejected", () => {
    expect(parseMidiMessage([0x90, 200, 100])).toBeNull();
  });
});

describe("pads: General MIDI drum notes", () => {
  it("36 is the kick, 38 the snare, 42 the closed hi-hat", () => {
    expect(gmDrum(36)).toBe("kick");
    expect(gmDrum(38)).toBe("snare");
    expect(gmDrum(42)).toBe("hat");
  });

  it("neighbouring notes are close relatives: 37 side stick and 40 electric snare also count as snare", () => {
    expect(gmDrum(37)).toBe("snare");
    expect(gmDrum(40)).toBe("snare");
  });

  it("open and pedal hi-hats count as hi-hat", () => {
    expect(gmDrum(46)).toBe("hat");
    expect(gmDrum(44)).toBe("hat");
  });

  it("a note we have no drum for (a tom, or a piano key) is null", () => {
    expect(gmDrum(41)).toBeNull();
    expect(gmDrum(60)).toBeNull();
  });
});
