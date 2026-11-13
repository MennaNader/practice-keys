/**
 * LESSON 12: A MIDI file
 *
 * A .mid file is a list of events, each one preceded by a "delta time": how many ticks to wait since the last
 * event. Ticks are tiny slices of a beat (here 480 per beat). The delta is written as a variable-length
 * quantity ("vlq"): 7 bits of the number per byte, and the top bit says "more bytes follow".
 *
 *   0 -> 00    127 -> 7F    128 -> 81 00    480 -> 83 60
 *
 * Format 0 means everything lives in one track, which every music program can open.
 */

export interface MidiFileNote {
  midi: number;
  /** Start in beats from the beginning. */
  startBeat: number;
  /** Length in beats. */
  beats: number;
  /** 1 to 127, default 90. */
  velocity?: number;
}

/** A number as a variable-length quantity (see the lesson above). */
export function vlq(n: number): number[] {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`vlq needs a whole number of 0 or more, got ${n}`);
  const bytes = [n & 0x7f];
  let rest = n >>> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>>= 7;
  }
  return bytes;
}

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16 = (n: number) => [(n >>> 8) & 255, n & 255];
const text = (s: string) => Array.from(new TextEncoder().encode(s));

export function writeMidiFile(opts: { bpm: number; trackName: string; notes: readonly MidiFileNote[]; ppq?: number }): Uint8Array {
  const { bpm, trackName, notes } = opts;
  const ppq = opts.ppq ?? 480;
  if (!(bpm > 0)) throw new RangeError(`bpm must be above 0, got ${bpm}`);
  type Ev = { tick: number; order: number; bytes: number[] };
  const events: Ev[] = [];
  for (const n of notes) {
    if (!Number.isInteger(n.midi) || n.midi < 0 || n.midi > 127) throw new RangeError(`midi must be 0 to 127, got ${n.midi}`);
    if (!(n.beats > 0) || n.startBeat < 0) throw new RangeError(`bad note timing: start ${n.startBeat}, length ${n.beats}`);
    const on = Math.round(n.startBeat * ppq);
    const off = Math.round((n.startBeat + n.beats) * ppq);
    events.push({ tick: on, order: 1, bytes: [0x90, n.midi, n.velocity ?? 90] });
    events.push({ tick: off, order: 0, bytes: [0x80, n.midi, 0] }); // note-off sorts before note-on at the same tick
  }
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);

  const mpqn = Math.round(60_000_000 / bpm);
  const body: number[] = [
    0, 0xff, 0x03, ...vlq(text(trackName).length), ...text(trackName),
    0, 0xff, 0x51, 0x03, (mpqn >>> 16) & 255, (mpqn >>> 8) & 255, mpqn & 255,
    0, 0xff, 0x58, 0x04, 4, 2, 24, 8,
  ];
  let last = 0;
  for (const e of events) {
    body.push(...vlq(e.tick - last), ...e.bytes);
    last = e.tick;
  }
  body.push(0, 0xff, 0x2f, 0);
  return Uint8Array.from([...text("MThd"), ...u32(6), ...u16(0), ...u16(1), ...u16(ppq), ...text("MTrk"), ...u32(body.length), ...body]);
}
