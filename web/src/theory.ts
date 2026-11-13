import {
  CHORDS,
  MAJOR_STEPS,
  SCALES,
  mod,
  chordPitchClasses,
  noteToPitchClass,
  pitchClassName,
  scaleNotes,
  stepsToOffsets,
  type ChordQuality,
  type ScaleName,
} from "../../src";

/** The 12 key names, as musicians usually write them (sharps for F#, flats for the others). */
export const ROOTS = [
  { pc: 0, name: "C" },
  { pc: 1, name: "Db" },
  { pc: 2, name: "D" },
  { pc: 3, name: "Eb" },
  { pc: 4, name: "E" },
  { pc: 5, name: "F" },
  { pc: 6, name: "F#" },
  { pc: 7, name: "G" },
  { pc: 8, name: "Ab" },
  { pc: 9, name: "A" },
  { pc: 10, name: "Bb" },
  { pc: 11, name: "B" },
] as const;

/** "C#" -> "C♯", "Bb" -> "B♭", "B" stays "B". */
export function pretty(name: string): string {
  return name.replace(/#/g, "♯").replace(/(?<=[A-G])b/g, "♭");
}

const BLACK = new Set([1, 3, 6, 8, 10]);
export const isBlackPc = (pc: number): boolean => BLACK.has(((pc % 12) + 12) % 12);

export const preferFor = (name: string): "flat" | "sharp" => (name.length > 1 && name.includes("b") ? "flat" : "sharp");

/** Plain pitch-class name with sharps: 6 -> "F♯". */
export const sharpName = (pc: number): string => pretty(pitchClassName(pc, "sharp"));
export const flatName = (pc: number): string => pretty(pitchClassName(pc, "flat"));
/** "F♯ (G♭)" for black keys, "F" for white keys. */
export const bothNames = (pc: number): string => (isBlackPc(pc) ? `${sharpName(pc)} (${flatName(pc)})` : sharpName(pc));

export const SCALE_LIST: { id: ScaleName; label: string; mood: string }[] = [
  { id: "major", label: "Major", mood: "Happy. The do-re-mi staircase." },
  { id: "minor", label: "Natural minor", mood: "Sad. The same keys as major, started from a different stair." },
  { id: "majorPentatonic", label: "Major pentatonic", mood: "Five notes, bright, hard to play a wrong note." },
  { id: "minorPentatonic", label: "Minor pentatonic", mood: "Five notes, moody, the base of rock and blues solos." },
  { id: "blues", label: "Blues", mood: "Minor pentatonic plus one gritty extra note." },
  { id: "dorian", label: "Dorian", mood: "Minor with a lift. Jazzy and warm." },
  { id: "phrygian", label: "Phrygian", mood: "Dark and tense. Often sounds Spanish." },
  { id: "lydian", label: "Lydian", mood: "Major, but dreamy and floating." },
  { id: "mixolydian", label: "Mixolydian", mood: "Major with a relaxed, bluesy edge." },
  { id: "locrian", label: "Locrian", mood: "Unstable. Rarely used as a home key." },
  { id: "harmonicMinor", label: "Harmonic minor", mood: "Dramatic, with a big leap near the top." },
  { id: "melodicMinor", label: "Melodic minor", mood: "A smooth, jazzy minor." },
  { id: "wholeTone", label: "Whole tone", mood: "Only big steps. Floaty, no home." },
];

export const CHORD_LIST: { id: ChordQuality; label: string; mood: string }[] = [
  { id: "major", label: "Major", mood: "happy" },
  { id: "minor", label: "Minor", mood: "sad" },
  { id: "diminished", label: "Diminished", mood: "tense" },
];

export const CHORD_EXPLAIN: Record<ChordQuality, string> = {
  major: "4 tiny steps up to the middle note, then 3 more. Bright and settled.",
  minor: "3 tiny steps up to the middle note, then 4 more. Dark but steady.",
  diminished: "3 tiny steps, then 3 more. Squeezed and wobbly, it wants to move on.",
};

export function scaleSpelling(rootName: string, id: ScaleName): { names: string[]; pcs: number[]; steps: readonly number[] } {
  const names = scaleNotes(rootName, id);
  return { names, pcs: names.map(noteToPitchClass), steps: SCALES[id] };
}

/** Everything the UI needs to show about one chord. */
export function chordInfo(rootPc: number, quality: ChordQuality) {
  const pref = preferFor(ROOTS[rootPc]!.name);
  const pcs = chordPitchClasses(rootPc, quality);
  const names = pcs.map((pc) => pretty(pitchClassName(pc, pref)));
  const shape = CHORDS[quality];
  return { pcs, names, shape, gaps: [shape[1], shape[2] - shape[1]] as [number, number] };
}

/** How a key is named: minor keys use C♯ and G♯ where major keys use D♭ and A♭. */
export function keyName(pc: number, mode: "major" | "minor" = "major"): string {
  if (mode === "minor" && pc === 1) return "C#";
  if (mode === "minor" && pc === 8) return "G#";
  return ROOTS[pc]!.name;
}

/** Name of a pitch class, spelled with flats or sharps to match a key's name. */
export function nameInKey(pc: number, keyRootPc: number, mode: "major" | "minor" = "major"): string {
  return pretty(pitchClassName(pc, preferFor(keyName(keyRootPc, mode))));
}

export { CHORDS };

/**
 * Names and piano keys of a maqam from a root. Names start from the major scale on the same root: a note that
 * is one quarter tone lower gets "⁻", and one that is a whole semitone lower is respelled with a flat.
 * `keys` are piano keys counted from the root (0 to 12): a half-flat note is played by the key just above it,
 * which the tuning then lowers.
 */
export function maqamSpelling(rootName: string, steps: readonly number[], start = 0): { names: string[]; keys: number[] } {
  const major = scaleNotes(rootName, "major");
  const rootPc = noteToPitchClass(rootName);
  const majorOffsets = stepsToOffsets(MAJOR_STEPS).map((o) => o * 2);
  const offsets = stepsToOffsets(steps).map((o) => o + start); // quarter tones above the root key
  const names = major.map((n, i) => {
    const d = majorOffsets[i]! - offsets[i]!;
    const semis = Math.floor(d / 2);
    const base = semis === 0 ? pretty(n) : flatName(mod(rootPc + majorOffsets[i]! / 2 - semis, 12));
    return base + (d % 2 === 1 ? "⁻" : "");
  });
  const keys = [...offsets, 24 + start].map((o) => Math.ceil(o / 2) || 0);
  return { names: [...names, pretty(major[0] as string)], keys };
}
