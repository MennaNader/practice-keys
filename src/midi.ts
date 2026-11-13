/**
 * LESSON 8: What a MIDI keyboard actually sends
 *
 * A MIDI keyboard sends tiny messages of 3 numbers (bytes) for every key you press or release:
 *
 *   [ status, note, velocity ]
 *
 * status = message type + channel. "Note on" is 0x90 (144) and "note off" is 0x80 (128); the channel
 * (1 to 16) is added in the low 4 bits, so 0x93 is "note on, channel 4".
 * note = the same MIDI number used everywhere in this project (middle C = 60).
 * velocity = how hard the key was hit, 0 to 127.
 *
 * Many keyboards send a "note on" with velocity 0 instead of "note off", so both mean "released".
 * Everything else (knobs, pitch bend, sustain pedal, clock ticks) is ignored here.
 */

export interface MidiNoteEvent {
  type: "on" | "off";
  /** MIDI note number, 0 to 127. */
  note: number;
  /** 0 to 1. Always 0 for "off". */
  velocity: number;
  /** 1 to 16. Drum pads usually send on channel 10. */
  channel: number;
}

/** Turn raw MIDI bytes into a note event, or null for anything that is not a note. */
export function parseMidiMessage(bytes: ArrayLike<number>): MidiNoteEvent | null {
  if (bytes.length < 3) return null;
  const status = bytes[0] as number;
  const note = bytes[1] as number;
  const velocity = bytes[2] as number;
  if (note > 127 || velocity > 127) return null;

  const kind = status & 0xf0;
  const channel = (status & 0x0f) + 1;

  if (kind === 0x90 && velocity > 0) return { type: "on", note, velocity: velocity / 127, channel };
  if (kind === 0x80 || kind === 0x90) return { type: "off", note, velocity: 0, channel };
  return null;
}

export type DrumName = "kick" | "snare" | "hat";

/**
 * General MIDI percussion: drum machines and pads (on channel 10) use the same note numbers for the
 * same sounds, so a kick is 36 on almost every pad controller.
 */
const GM_DRUMS: Readonly<Record<number, DrumName>> = {
  35: "kick", // acoustic bass drum
  36: "kick", // bass drum
  37: "snare", // side stick
  38: "snare", // acoustic snare
  39: "snare", // hand clap
  40: "snare", // electric snare
  42: "hat", // closed hi-hat
  44: "hat", // pedal hi-hat
  46: "hat", // open hi-hat
};

/** Which of our three drums a General MIDI percussion note plays, or null if we have no sound for it. */
export function gmDrum(note: number): DrumName | null {
  return GM_DRUMS[note] ?? null;
}
