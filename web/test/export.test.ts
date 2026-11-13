import { describe, expect, it } from "vitest";
import { buildMaqamExport, maqamClips } from "../src/exportMaqam";
import { crc32, makeZip } from "../src/zip";

/** A small zip reader, just to check what makeZip wrote: name -> bytes. */
function readZip(z: Uint8Array): Map<string, Uint8Array> {
  const v = new DataView(z.buffer, z.byteOffset, z.byteLength);
  const out = new Map<string, Uint8Array>();
  let eocd = z.length - 22;
  expect(v.getUint32(eocd, true)).toBe(0x06054b50);
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  for (let i = 0; i < count; i++) {
    const size = v.getUint32(p + 24, true);
    const nameLen = v.getUint16(p + 28, true);
    const off = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(z.slice(p + 46, p + 46 + nameLen));
    const dataStart = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true);
    const data = z.slice(dataStart, dataStart + size);
    expect(v.getUint32(p + 16, true)).toBe(crc32(data));
    out.set(name, data);
    p += 46 + nameLen;
  }
  return out;
}

describe("zip", () => {
  it("crc32 of '123456789' is the well-known check value cbf43926", () => {
    expect(crc32(new TextEncoder().encode("123456789")).toString(16)).toBe("cbf43926");
  });
  it("round-trips several files", () => {
    const z = makeZip([{ name: "a/x.txt", data: new TextEncoder().encode("hi") }, { name: "b.bin", data: Uint8Array.of(1, 2, 3) }]);
    const files = readZip(z);
    expect([...files.keys()]).toEqual(["a/x.txt", "b.bin"]);
    expect([...files.get("b.bin")!]).toEqual([1, 2, 3]);
  });
});

describe("maqam export", () => {
  it("is named after the maqam", () => {
    expect(buildMaqamExport("rast", 0).zipName).toBe("Rast.zip");
    expect(buildMaqamExport("saba", 2).zipName).toBe("Saba.zip");
  });
  it("holds chords.mid, scale.mid, tuning.scl and a README in a folder named for the maqam and root", () => {
    const files = readZip(buildMaqamExport("bayati", 6).zip);
    expect([...files.keys()].sort()).toEqual(["bayati-Fs/README.txt", "bayati-Fs/chords.mid", "bayati-Fs/scale.mid", "bayati-Fs/tuning.scl"]);
  });
  it("Rast on C gives 7 chords, the first neutral (C and G with E half-flat)", () => {
    const e = buildMaqamExport("rast", 0);
    expect(e.chords).toHaveLength(7);
    expect(e.chords[0]!.label).toContain("neutral");
    expect(e.shiftCents).toBe(0);
  });
  it("Rast chord notes sit on piano keys: the E half-flat is played by the E key (52), which the tuning lowers", () => {
    const clips = maqamClips("rast", 0);
    expect(clips.chordNotes.slice(0, 3).map((n) => n.midi)).toEqual([48, 52, 55]);
    expect(clips.chordNotes).toHaveLength(21);
    expect(clips.scaleNotes).toHaveLength(8);
  });
  it("Sika on C shifts the tuning by -50 cents because its home note is bent", () => {
    expect(buildMaqamExport("sika", 0).shiftCents).toBe(-50);
  });
  it("rejects a bad root", () => {
    expect(() => buildMaqamExport("rast", 12)).toThrow(RangeError);
  });
});
