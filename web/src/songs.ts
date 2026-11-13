import { MAQAMAT, type MaqamName } from "../../src";

/**
 * Saved songs. A song is fully described by its maqam, its home note and its random seed (the same seed always
 * gives the same tune), so a saved song is just three numbers and a name. Names look like "Rast-3": the maqam, then
 * the number of the song within that maqam. Numbers are never reused, even after a song is deleted.
 */
export interface SavedSong {
  name: string;
  maqam: MaqamName;
  number: number;
  rootPc: number;
  seed: number;
}

export type Counters = Partial<Record<MaqamName, number>>;

export const MAX_SONGS = 100;

const LABELS: Record<MaqamName, string> = { rast: "Rast", hijaz: "Hijaz", bayati: "Bayati", sika: "Sika", nahawand: "Nahawand", saba: "Saba" };

export const songName = (maqam: MaqamName, number: number): string => `${LABELS[maqam]}-${number}`;

/** Add a song: it gets the next number for its maqam. Returns the new list and counters (the inputs are not changed). */
export function addSong(list: readonly SavedSong[], counters: Counters, s: { maqam: MaqamName; rootPc: number; seed: number }): { list: SavedSong[]; counters: Counters; song: SavedSong } {
  if (!(s.maqam in MAQAMAT)) throw new RangeError(`unknown maqam ${s.maqam}`);
  if (!Number.isInteger(s.rootPc) || s.rootPc < 0 || s.rootPc > 11) throw new RangeError(`rootPc must be an integer from 0 to 11, got ${s.rootPc}`);
  if (!Number.isInteger(s.seed) || s.seed < 0 || s.seed > 0xffffffff) throw new RangeError(`seed must be an integer from 0 to 4294967295, got ${s.seed}`);
  if (list.length >= MAX_SONGS) throw new RangeError(`You can keep up to ${MAX_SONGS} songs. Delete one first.`);
  const used = Math.max(counters[s.maqam] ?? 0, ...list.filter((x) => x.maqam === s.maqam).map((x) => x.number));
  const number = used + 1;
  const song: SavedSong = { name: songName(s.maqam, number), maqam: s.maqam, number, rootPc: s.rootPc, seed: s.seed };
  return { list: [...list, song], counters: { ...counters, [s.maqam]: number }, song };
}

export const removeSong = (list: readonly SavedSong[], name: string): SavedSong[] => list.filter((s) => s.name !== name);

/** Is this saved song already in the list (same maqam, home note and seed)? */
export const hasSong = (list: readonly SavedSong[], s: { maqam: MaqamName; rootPc: number; seed: number }): boolean =>
  list.some((x) => x.maqam === s.maqam && x.rootPc === s.rootPc && x.seed === s.seed);

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= (max as number);

/** Checks what was read from localStorage, so a hand-edited or broken value can never crash the app. */
export function isSongList(v: unknown): v is SavedSong[] {
  return (
    Array.isArray(v) &&
    v.length <= MAX_SONGS &&
    v.every((s) => {
      const o = s as Partial<SavedSong> | null;
      return (
        !!o &&
        typeof o.maqam === "string" &&
        o.maqam in MAQAMAT &&
        isInt(o.number, 1, 1e9) &&
        isInt(o.rootPc, 0, 11) &&
        isInt(o.seed, 0, 0xffffffff) &&
        o.name === songName(o.maqam as MaqamName, o.number as number)
      );
    })
  );
}

export const isCounters = (v: unknown): v is Counters =>
  !!v && typeof v === "object" && Object.entries(v).every(([k, n]) => k in MAQAMAT && isInt(n, 0, 1e9));
