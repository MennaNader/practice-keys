import { describe, expect, it } from "vitest";
import { inversions, movement, smoothProgression, smoothest, totalMovement } from "../src";

const C = [60, 64, 67]; // C E G

describe("voice leading: how far do the notes move?", () => {
  it("C E G -> C E A: two notes stay, G moves 2, total 2", () => {
    expect(movement(C, [60, 64, 69])).toBe(2);
  });

  it("C E G -> A C E (Am from its bottom note, one octave lower): 3 + 4 + 3 = 10", () => {
    expect(movement(C, [57, 60, 64])).toBe(10);
  });

  it("the same chord costs nothing", () => {
    expect(movement(C, C)).toBe(0);
  });

  it("the order you list the notes in does not matter", () => {
    expect(movement(C, [69, 60, 64])).toBe(2);
    expect(movement([67, 60, 64], [64, 69, 60])).toBe(2);
  });

  it("the distance is the same going there and back", () => {
    expect(movement([60, 64, 69], C)).toBe(movement(C, [60, 64, 69]));
  });

  it("C -> F: staying on C and moving the others (C F A) costs 3, the jump (F A C) costs 15", () => {
    expect(movement(C, [60, 65, 69])).toBe(3);
    expect(movement(C, [65, 69, 72])).toBe(15);
  });

  it("pairing low with low is the cheapest way: no other pairing beats it", () => {
    const to = [57, 60, 71];
    const best = movement(C, to);
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    for (const p of perms) {
      const cost = p.reduce((sum, j, i) => sum + Math.abs(C[i]! - to[j]!), 0);
      expect(best).toBeLessThanOrEqual(cost);
    }
  });

  it("chords with different numbers of notes cannot be compared", () => {
    expect(() => movement([60, 64, 67], [60, 64])).toThrow(RangeError);
  });
});

describe("inversions: the same chord with a different bottom note", () => {
  it("C E G has three inversions: C E G, E G C, G C E (each moved note goes up an octave)", () => {
    expect(inversions(C)).toEqual([[60, 64, 67], [64, 67, 72], [67, 72, 76]]);
  });

  it("the first inversion is always the chord itself", () => {
    expect(inversions([65, 69, 72])[0]).toEqual([65, 69, 72]);
  });

  it("a chord with n notes has n inversions", () => {
    expect(inversions([60, 64, 67, 71])).toHaveLength(4);
    expect(inversions([60, 64])).toHaveLength(2);
  });

  it("every inversion has the same notes, only the order and octave change", () => {
    for (const inv of inversions(C)) {
      expect(inv.map((n) => n % 12).sort((a, b) => a - b)).toEqual([0, 4, 7]);
    }
  });

  it("an inversion is higher than the one before: it never goes down", () => {
    const [root, first, second] = inversions(C) as [number[], number[], number[]];
    expect(first[0]).toBeGreaterThan(root[0]!);
    expect(second[0]).toBeGreaterThan(first[0]!);
  });

  it("after C E G, the cheapest way to play F is a C-bottom version: C F A costs 3", () => {
    const F = [53, 57, 60]; // F A C
    const options = [-12, 0, 12].flatMap((shift) => inversions(F).map((inv) => inv.map((n) => n + shift)));
    const costs = options.map((o) => movement(C, o));
    expect(Math.min(...costs)).toBe(3);
  });
});

describe("smoothest: the cheapest way to play the next chord", () => {
  const F = [53, 57, 60]; // F A C
  const G = [55, 59, 62]; // G B D
  const Am = [57, 60, 64]; // A C E

  it("C E G -> F: keep C still, E up 1, G up 2 gives C F A", () => {
    expect(smoothest(C, F)).toEqual([60, 65, 69]);
  });

  it("C E G -> Am: C and E stay, G goes up 2 to A", () => {
    expect(smoothest(C, Am)).toEqual([60, 64, 69]);
  });

  it("C E G -> G: gives B D G, every note moves 1 or 2 steps", () => {
    expect(smoothest(C, G)).toEqual([59, 62, 67]);
  });

  it("it is never more expensive than playing the chord from its bottom note", () => {
    expect(movement(C, smoothest(C, F))).toBeLessThanOrEqual(movement(C, F));
  });

  it("C -> F -> G -> C: the whole song stays inside one small hand position", () => {
    let current = C;
    const song = [C];
    for (const next of [F, G, C]) {
      current = smoothest(current, next);
      song.push(current);
    }
    expect(song).toEqual([[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]]);
    for (const chord of song) {
      expect(Math.max(...chord) - Math.min(...chord)).toBeLessThanOrEqual(9);
    }
  });

  it("the result is always the same chord: same three note names as the next chord", () => {
    const names = (c: number[]) => c.map((n) => n % 12).sort((a, b) => a - b);
    expect(names(smoothest(C, F))).toEqual(names(F));
  });

  it("finds the closest version even when the two chords are more than an octave apart", () => {
    expect(smoothest([84, 88, 91], F)).toEqual([84, 89, 93]);
    expect(smoothest([36, 40, 43], F)).toEqual([36, 41, 45]);
  });
});

describe("a whole progression", () => {
  const C3 = [60, 64, 67];
  const F3 = [65, 69, 72];
  const G3 = [67, 71, 74];

  it("the first chord stays as it is, the rest follow smoothly", () => {
    expect(smoothProgression([C3, F3, G3, C3])).toEqual([[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]]);
  });

  it("an empty progression stays empty", () => {
    expect(smoothProgression([])).toEqual([]);
  });

  it("total movement adds up every change: C F A -> B D G costs 6", () => {
    expect(totalMovement([[60, 65, 69], [59, 62, 67]])).toBe(1 + 3 + 2);
  });

  it("one chord, or none, means nothing moved", () => {
    expect(totalMovement([C3])).toBe(0);
    expect(totalMovement([])).toBe(0);
  });

  it("the smooth version of C F G C moves far less than playing every chord from its bottom note", () => {
    const jumpy = totalMovement([C3, F3, G3, C3]);
    const smooth = totalMovement(smoothProgression([C3, F3, G3, C3]));
    expect(smooth).toBeLessThan(jumpy);
    expect(smooth).toBe(3 + 6 + 3);
    expect(jumpy).toBe(15 + 6 + 21);
  });
});
