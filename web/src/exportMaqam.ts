import { MAQAMAT, MAQAM_START, keyAdjustments, maqamTriads, scalaFile, thirdName, writeMidiFile, type MaqamName, type MidiFileNote } from "../../src";
import { ROOTS, maqamSpelling } from "./theory";
import { makeZip } from "./zip";

export const BASE_MIDI = 48;
const LABELS: Record<MaqamName, string> = { rast: "Rast", hijaz: "Hijaz", bayati: "Bayati", sika: "Sika", nahawand: "Nahawand", saba: "Saba" };

/** A quarter-tone note has no key of its own: it is played by the key just above, which the tuning lowers. */
const keyFor = (quarterTones: number) => Math.ceil(quarterTones / 2) || 0;

export interface ChordInfo {
  label: string;
  notes: string[];
}

export interface MaqamClips {
  label: string;
  names: string[];
  chords: ChordInfo[];
  chordNotes: MidiFileNote[];
  scaleNotes: MidiFileNote[];
  slug: string;
}

/** The chords (one bar each) and the scale (quarter notes) of a maqam, as notes. */
export function maqamClips(maqam: MaqamName, rootPc: number): MaqamClips {
  const root = ROOTS[rootPc];
  if (!root) throw new RangeError(`rootPc must be an integer from 0 to 11, got ${rootPc}`);
  const steps = MAQAMAT[maqam];
  const start = MAQAM_START[maqam];
  const label = LABELS[maqam];
  const spell = maqamSpelling(root.name, steps, start);
  const triads = maqamTriads(steps, start);
  const chords: ChordInfo[] = triads.map((t, i) => ({
    label: `${spell.names[i]} ${thirdName((t[1] as number) - (t[0] as number))}`,
    notes: [i, (i + 2) % 7, (i + 4) % 7].map((d) => spell.names[d] as string),
  }));
  const chordNotes = triads.flatMap((t, i) => t.map((o) => ({ midi: BASE_MIDI + rootPc + keyFor(o), startBeat: i * 4, beats: 4 })));
  const scaleNotes = spell.keys.map((k, i) => ({ midi: BASE_MIDI + rootPc + k, startBeat: i, beats: 1 }));
  return { label, names: spell.names, chords, chordNotes, scaleNotes, slug: `${label.toLowerCase()}-${root.name.replace("#", "s")}` };
}

export interface MaqamExport {
  zipName: string;
  zip: Uint8Array;
  chords: ChordInfo[];
  shiftCents: number;
}

/** Everything Ableton needs for one maqam on one root, in one zip: chords.mid, scale.mid, tuning.scl, README.txt. */
export function buildMaqamExport(maqam: MaqamName, rootPc: number, bpm = 90): MaqamExport {
  const { label, names, chords, chordNotes, scaleNotes, slug } = maqamClips(maqam, rootPc);
  const adjustments = keyAdjustments(MAQAMAT[maqam], MAQAM_START[maqam]);
  const { text: scl, shiftCents } = scalaFile({ name: slug, description: `${label} on ${names[0]} (24 equal steps per octave)`, rootPc: 0, adjustments: adjustmentsFromC(adjustments, rootPc) });
  const enc = new TextEncoder();
  const readme = [
    `${label} on ${names[0]}`,
    "",
    "chords.mid  seven chords, one bar each, built by stacking every second note of the maqam",
    "scale.mid   the scale going up, as quarter notes",
    "tuning.scl  re-tunes the 12 keys so the in-between notes sound right",
    "",
    "In Ableton Live 12:",
    "1. Drag the two .mid files onto a MIDI track that has a built-in instrument.",
    "2. Open View > Tuning, drag tuning.scl into the Tuning section.",
    shiftCents === 0
      ? "3. Leave the reference note at C = 261.63 Hz."
      : `3. Set the reference note to C = 261.63 Hz and shift it by ${shiftCents} cents (this maqam starts a quarter tone below a key).`,
    "Plug-ins only follow the tuning if they support MPE with a +/-48 semitone pitch bend range.",
    "",
  ].join("\n");
  const zip = makeZip([
    { name: `${slug}/chords.mid`, data: writeMidiFile({ bpm, trackName: `${label} chords`, notes: chordNotes }) },
    { name: `${slug}/scale.mid`, data: writeMidiFile({ bpm, trackName: `${label} scale`, notes: scaleNotes }) },
    { name: `${slug}/tuning.scl`, data: enc.encode(scl) },
    { name: `${slug}/README.txt`, data: enc.encode(readme) },
  ]);
  return { zipName: `${label}.zip`, zip, chords, shiftCents };
}

/** Adjustments are counted from the maqam's root; the Scala file wants them counted from C, so rotate them. */
function adjustmentsFromC(fromRoot: readonly number[], rootPc: number): number[] {
  return Array.from({ length: 12 }, (_, pc) => fromRoot[(((pc - rootPc) % 12) + 12) % 12] ?? 0);
}

/**
 * Hand a file to the viewer. Inside Claude it goes through the `downloads` capability; anywhere else it is an
 * ordinary browser download.
 */
export async function saveFile(filename: string, bytes: Uint8Array): Promise<string> {
  try {
    const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
    const dl = (await claude?.use?.("downloads")) as { save: (r: { filename: string; data: Uint8Array }) => Promise<unknown> } | null | undefined;
    if (dl) {
      await dl.save({ filename, data: bytes });
      return `Saved ${filename}.`;
    }
  } catch (e) {
    if ((e as { code?: string })?.code === "declined") return "Not saved.";
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return `Downloaded ${filename}.`;
}
