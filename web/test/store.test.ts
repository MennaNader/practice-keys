import { beforeEach, describe, expect, it } from "vitest";
import { EMPTY_SCORE, addAnswer, clearProgress, fullKey, isScore, load, save, useStorage } from "../src/store";

function fake() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    m,
  };
}

let s: ReturnType<typeof fake>;
beforeEach(() => {
  s = fake();
  useStorage(s);
});

describe("progress in localStorage", () => {
  it("keys start with practice-keys:", () => {
    expect(fullKey("volume")).toBe("practice-keys:volume");
  });

  it("saves a value and reads it back", () => {
    save("maqam", "saba");
    expect(load("maqam", "rast", () => true)).toBe("saba");
  });

  it("falls back when the saved value is broken or not valid", () => {
    s.setItem(fullKey("octave"), "not json");
    expect(load("octave", 4, () => true)).toBe(4);
    save("octave", 99);
    expect(load("octave", 4, (v) => typeof v === "number" && v <= 5)).toBe(4);
  });

  it("works (without saving) when storage is blocked", () => {
    useStorage(null);
    expect(() => save("x", 1)).not.toThrow();
    expect(load("x", 7, () => true)).toBe(7);
  });

  it("reset removes this app's keys and leaves other sites' keys alone", () => {
    save("a", 1);
    save("b", 2);
    s.setItem("something-else", "keep");
    clearProgress();
    expect(load("a", 0, () => true)).toBe(0);
    expect(s.getItem("something-else")).toBe("keep");
  });
});

describe("quiz score", () => {
  it("counts right answers, the streak, and the best streak", () => {
    let sc = EMPTY_SCORE;
    for (const ok of [true, true, true, false, true]) sc = addAnswer(sc, ok);
    expect(sc).toEqual({ right: 4, total: 5, streak: 1, best: 3 });
  });
  it("rejects a saved score that cannot be true (more right than total)", () => {
    expect(isScore({ right: 5, total: 2, streak: 0, best: 0 })).toBe(false);
    expect(isScore({ right: 1, total: 2, streak: 1, best: 1 })).toBe(true);
    expect(isScore(null)).toBe(false);
  });
});
