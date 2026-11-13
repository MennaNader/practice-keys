/**
 * LESSON 7: Voice leading
 *
 * When one chord changes to the next, each note of the old chord goes to a note of the new chord.
 * Smooth = the notes move as little as possible. Notes that both chords share stay still.
 *
 *   C -> F played from the bottom:   C E G -> F A C    (every note jumps)
 *   C -> F played smoothly:          C E G -> C F A    (C stays, E up 1, G up 2)
 *
 * The cost of a change is the total number of tiny steps all the notes travel.
 * Pairing lowest with lowest, middle with middle and top with top gives the smallest possible total,
 * so we sort both chords first.
 */

export function movement(from: readonly number[], to: readonly number[]): number {
  if (from.length !== to.length) {
    throw new RangeError(`chords need the same number of notes, got ${from.length} and ${to.length}`);
  }
  const sortedFrom = [...from].sort((a, b) => a - b);
  const sortedTo = [...to].sort((a, b) => a - b);
  return sortedFrom.reduce((total, note, i) => total + Math.abs(note - (sortedTo[i] as number)), 0);
}

/** All inversions of a chord, starting with the chord itself. */
export function inversions(chord: readonly number[]): number[][] {
  const inversion = [];
  inversion.push([...chord]);
  for(let i = 1; i < chord.length; i++) {
    inversion.push([...chord.slice(i), ...chord.slice(0,i).map(n => n + 12)]);
  }
  return inversion;
}

/** The way to play the next chord that moves the notes the least from the current one. */
export function smoothest(from: readonly number[], next: readonly number[]): number[] {
  const candidates = inversions(next).flatMap(inv => [Array.from({ length: 7 }, (_, k) => (k - 3) * 12).map(shift => inv.map(n => n + shift))]).flat();
  return candidates.reduce((best, candidate) => {
    return movement(from, candidate) < movement(from, best as number[]) ? candidate : best;
  }, candidates[0]) || [];
}

/** Voice a whole progression: the first chord stays as given, every next chord is the smoothest from the one before. */
export function smoothProgression(chords: readonly (readonly number[])[]): number[][] {
  const out: number[][] = [];
  for (const chord of chords) {
    const previous = out[out.length - 1];
    out.push(previous ? smoothest(previous, chord) : [...chord]);
  }
  return out;
}

/** Total tiny steps the notes travel across a whole progression. */
export function totalMovement(voicings: readonly (readonly number[])[]): number {
  return voicings.slice(1).reduce((sum, chord, i) => sum + movement(voicings[i] as readonly number[], chord), 0);
}
