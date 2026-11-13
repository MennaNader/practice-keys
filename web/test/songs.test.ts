import { describe, expect, it } from "vitest";
import { addSong, hasSong, isCounters, isSongList, removeSong, songName } from "../src/songs";

const rast = { maqam: "rast", rootPc: 0, seed: 123 } as const;

describe("saved song names: maqam-number", () => {
  it("looks like Rast-1", () => {
    expect(songName("rast", 1)).toBe("Rast-1");
    expect(songName("nahawand", 12)).toBe("Nahawand-12");
  });

  it("numbers each maqam on its own: Rast-1, Rast-2, then Saba-1", () => {
    let st = { list: [] as ReturnType<typeof addSong>["list"], counters: {} };
    st = addSong(st.list, st.counters, rast);
    st = addSong(st.list, st.counters, { ...rast, seed: 2 });
    st = addSong(st.list, st.counters, { maqam: "saba", rootPc: 2, seed: 3 });
    expect(st.list.map((s) => s.name)).toEqual(["Rast-1", "Rast-2", "Saba-1"]);
  });

  it("never reuses a number, even after deleting the newest song", () => {
    let st = addSong([], {}, rast);
    st = addSong(st.list, st.counters, { ...rast, seed: 2 });
    const without = removeSong(st.list, "Rast-2");
    const again = addSong(without, st.counters, { ...rast, seed: 3 });
    expect(again.song.name).toBe("Rast-3");
  });

  it("keeps counting from the saved songs even if the counters were lost", () => {
    const first = addSong([], {}, rast);
    expect(addSong(first.list, {}, { ...rast, seed: 9 }).song.name).toBe("Rast-2");
  });

  it("does not change the lists it was given", () => {
    const list = Object.freeze([]) as never[];
    const counters = Object.freeze({});
    expect(() => addSong(list, counters, rast)).not.toThrow();
  });
});

describe("addSong rejects bad input", () => {
  it("bad home note, seed or maqam", () => {
    expect(() => addSong([], {}, { ...rast, rootPc: 12 })).toThrow(RangeError);
    expect(() => addSong([], {}, { ...rast, seed: -1 })).toThrow(RangeError);
    expect(() => addSong([], {}, { ...rast, seed: 1.5 })).toThrow(RangeError);
    expect(() => addSong([], {}, { ...rast, maqam: "kurd" as never })).toThrow(RangeError);
  });
  it("stops at 100 songs", () => {
    let st = { list: [] as ReturnType<typeof addSong>["list"], counters: {} };
    for (let i = 0; i < 100; i++) st = addSong(st.list, st.counters, { ...rast, seed: i });
    expect(() => addSong(st.list, st.counters, rast)).toThrow(/up to 100/);
  });
});

describe("hasSong, removeSong", () => {
  it("finds the same song by maqam, home note and seed", () => {
    const { list } = addSong([], {}, rast);
    expect(hasSong(list, rast)).toBe(true);
    expect(hasSong(list, { ...rast, rootPc: 2 })).toBe(false);
  });
  it("removes by name and leaves the others", () => {
    let st = addSong([], {}, rast);
    st = addSong(st.list, st.counters, { ...rast, seed: 2 });
    expect(removeSong(st.list, "Rast-1").map((s) => s.name)).toEqual(["Rast-2"]);
  });
});

describe("reading saved songs back from localStorage", () => {
  it("accepts a good list", () => {
    expect(isSongList(addSong([], {}, rast).list)).toBe(true);
    expect(isSongList([])).toBe(true);
  });
  it("rejects broken, edited or wrong-shaped values", () => {
    expect(isSongList("x")).toBe(false);
    expect(isSongList([{ name: "Rast-1", maqam: "rast", number: 1, rootPc: 99, seed: 1 }])).toBe(false);
    expect(isSongList([{ name: "Wrong-1", maqam: "rast", number: 1, rootPc: 0, seed: 1 }])).toBe(false);
    expect(isSongList([{ name: "Rast-1", maqam: "kurd", number: 1, rootPc: 0, seed: 1 }])).toBe(false);
    expect(isSongList([null])).toBe(false);
  });
  it("counters must be known maqamat with whole numbers", () => {
    expect(isCounters({ rast: 3 })).toBe(true);
    expect(isCounters({ kurd: 1 })).toBe(false);
    expect(isCounters({ rast: -1 })).toBe(false);
    expect(isCounters(null)).toBe(false);
  });
});
