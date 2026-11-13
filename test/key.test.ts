import { describe, expect, it } from "vitest";
import {
  MAJOR_STEPS,
  MINOR_KEY_QUALITIES,
  SCALES,
  chordsInKey,
  chordsOnTeam,
  progressionFromTeams,
  noteToPitchClass,
  romanNumeral,
  scalePitchClasses,
} from "../src";

const roots = (key: number) => chordsInKey(key).map((c) => c.root);
const qualities = (key: number) => chordsInKey(key).map((c) => c.quality);

describe("chords in a key", () => {
  it("the key of C has chords on the white keys: C D E F G A B", () => {
    expect(roots(0)).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("the key of G wraps around the 12-loop: G A B C D E F#", () => {
    expect(roots(7)).toEqual([7, 9, 11, 0, 2, 4, 6]);
  });

  it("mood pattern is happy, sad, sad, happy, happy, sad, tense, in every key", () => {
    const pattern = ["major", "minor", "minor", "major", "major", "minor", "diminished"];
    for (let key = 0; key < 12; key++) {
      expect(qualities(key), `key ${key}`).toEqual(pattern);
    }
  });

  it("the chord roots are exactly the notes of the major scale", () => {
    for (let key = 0; key < 12; key++) {
      expect(roots(key)).toEqual(scalePitchClasses(key, MAJOR_STEPS));
    }
  });

  it("I, IV and V are the happy trio: C F G in the key of C", () => {
    const [one, , , four, five] = chordsInKey(0);
    expect([one?.root, four?.root, five?.root]).toEqual([0, 5, 7]);
    expect([one?.quality, four?.quality, five?.quality]).toEqual(["major", "major", "major"]);
  });

  it("the key of G: sad chords are A, B and E", () => {
    const sad = chordsInKey(7).filter((c) => c.quality === "minor").map((c) => c.root);
    expect(sad).toEqual([noteToPitchClass("A"), noteToPitchClass("B"), noteToPitchClass("E")]);
  });
});

describe("Roman numerals", () => {
  it("capital for happy, small for sad, small with a degree sign for tense", () => {
    const numerals = chordsInKey(0).map((c) => romanNumeral(c.degree, c.quality));
    expect(numerals).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
  });

  it("rejects stairs that do not exist", () => {
    expect(() => romanNumeral(8, "major")).toThrow(RangeError);
    expect(() => romanNumeral(0, "major")).toThrow(RangeError);
  });
});

describe("minor keys", () => {
  const minorRoots = (key: number) => chordsInKey(key, "minor").map((c) => c.root);
  const minorQualities = (key: number) => chordsInKey(key, "minor").map((c) => c.quality);

  it("the minor mood list is the major list started from the 6th item", () => {
    expect(MINOR_KEY_QUALITIES).toEqual(["minor", "diminished", "major", "minor", "minor", "major", "major"]);
  });

  it("A minor uses the white keys, starting on A: A B C D E F G", () => {
    expect(minorRoots(noteToPitchClass("A"))).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });

  it("A minor has the same chords as C major, in a different order", () => {
    const key = (chords: ReturnType<typeof chordsInKey>) =>
      chords.map((c) => `${c.root}-${c.quality}`).sort();
    expect(key(chordsInKey(9, "minor"))).toEqual(key(chordsInKey(0, "major")));
  });

  it("every minor key shares its chords with the major key 3 tiny steps above", () => {
    for (let k = 0; k < 12; k++) {
      const minor = chordsInKey(k, "minor").map((c) => `${c.root}-${c.quality}`).sort();
      const major = chordsInKey((k + 3) % 12, "major").map((c) => `${c.root}-${c.quality}`).sort();
      expect(minor, `key ${k}`).toEqual(major);
    }
  });

  it("roots are the natural minor scale, in every key", () => {
    for (let k = 0; k < 12; k++) {
      expect(minorRoots(k)).toEqual(scalePitchClasses(k, SCALES.minor));
      expect(minorQualities(k)).toEqual([...MINOR_KEY_QUALITIES]);
    }
  });

  it("minor keys have their own Roman numerals: i ii° III iv v VI VII", () => {
    const numerals = chordsInKey(9, "minor").map((c) => romanNumeral(c.degree, c.quality));
    expect(numerals).toEqual(["i", "ii°", "III", "iv", "v", "VI", "VII"]);
  });
});

describe("teams: home, away, push", () => {
  const roots = (k: number, team: "home" | "away" | "push", mode: "major" | "minor" = "major") =>
    chordsOnTeam(k, team, mode).map((c) => c.root);

  it("in C major, away is Dm and F", () => {
    expect(roots(0, "away")).toEqual([2, 5]);
  });

  it("in C major, push is G and B°", () => {
    expect(roots(0, "push")).toEqual([7, 11]);
  });

  it("in G major, home is G, Bm, Em", () => {
    expect(roots(7, "home")).toEqual([7, 11, 4]);
  });

  it("every key has 3 home, 2 away and 2 push chords", () => {
    for (let k = 0; k < 12; k++) {
      expect(chordsOnTeam(k, "home").length).toBe(3);
      expect(chordsOnTeam(k, "away").length).toBe(2);
      expect(chordsOnTeam(k, "push").length).toBe(2);
    }
  });

  it("the three teams together are all seven chords", () => {
    const all = (["home", "away", "push"] as const).flatMap((t) => chordsOnTeam(2, t));
    expect(all.map((c) => c.degree).sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("the stand-ins share notes: C and Am (home) both contain C and E", () => {
    const [I, , iii, , , vi] = chordsInKey(0);
    expect(I!.root).toBe(0);
    expect(vi!.root).toBe(9);
    expect(iii!.root).toBe(4);
  });

  it("minor keys use the same jobs by stair: A minor home is Am, C, F", () => {
    expect(roots(9, "home", "minor")).toEqual([9, 0, 5]);
  });
});

describe("song maker: a progression from teams", () => {
  const roots = (k: number, teams: ("home" | "away" | "push")[], mode: "major" | "minor" = "major") =>
    progressionFromTeams(k, teams, mode).map((c) => c.root);

  it("home, away, push, home in C is C, Dm, G, C", () => {
    expect(roots(0, ["home", "away", "push", "home"])).toEqual([0, 2, 7, 0]);
  });

  it("the famous away, push, home in C is Dm, G, C", () => {
    expect(roots(0, ["away", "push", "home"])).toEqual([2, 7, 0]);
  });

  it("works in any key: home, away, push, home in G is G, Am, D, G", () => {
    expect(roots(7, ["home", "away", "push", "home"])).toEqual([7, 9, 2, 7]);
  });

  it("works in minor: home, away, push, home in A minor is Am, B°, E, Am", () => {
    expect(roots(9, ["home", "away", "push", "home"], "minor")).toEqual([9, 11, 4, 9]);
  });

  it("an empty list of teams gives an empty song", () => {
    expect(progressionFromTeams(0, [])).toEqual([]);
  });
});
