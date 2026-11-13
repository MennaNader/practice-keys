/**
 * LESSON 6: Beats, bars and tempo
 *
 * A beat is a steady pulse. A bar is a small group of beats (4 in the common 4/4 time).
 * A chord usually changes on beat 1 of a bar.
 *
 * Beats are a COUNT and never change. Seconds depend on the tempo, in beats per minute (BPM):
 *
 *   one beat lasts 60 / bpm seconds
 *   so  seconds = beats * (60 / bpm)
 *
 * Counting in beats means one number (the tempo) speeds up or slows down the whole song.
 */

export function beatsToSeconds(beats: number, bpm: number): number {
  if (!(bpm > 0)) throw new RangeError(`bpm must be above 0, got ${bpm}`);
  return beats * (60 / bpm);
}

/** Start time in seconds of each chord, when every chord lasts the same number of beats. */
export function chordStartTimes(chordCount: number, beatsPerChord: number, bpm: number): number[] {
  return Array.from({ length: chordCount }, (_, i) => beatsToSeconds(i * beatsPerChord, bpm));
}

export const KICK = [1, 0, 0, 0, 1, 0, 0, 0] as const;
export const SNARE = [0, 0, 1, 0, 0, 0, 1, 0] as const;
export const HAT = [1, 1, 1, 1, 1, 1, 1, 1] as const;

/** Seconds (from the start of the bar) at which the pattern has a hit. A bar is 4 beats. */
export function hitTimes(pattern: readonly number[], bpm: number): number[] {
  return (pattern).map((v,i) => {
    if (v) {
      if (i === 0) {
        return 0;
      }
      return beatsToSeconds(i * 4 / pattern.length, bpm) || null;
    }
  }).filter((x): x is number => !isNaN(x as number));
}
