import { useEffect, useState } from "react";
import type { DrumKind } from "./audio";
import { hitDrum, subscribeDrums, usePads } from "./midi";

const PADS: { kind: DrumKind; label: string; gm: number }[] = [
  { kind: "kick", label: "Kick", gm: 36 },
  { kind: "snare", label: "Snare", gm: 38 },
  { kind: "hat", label: "Hi-hat", gm: 42 },
];

/** Three drum pads: click them, or hit the pads on a MIDI controller (Learn teaches the app which pad is which). */
export function DrumPads() {
  const { map, learning, toggleLearn, reset } = usePads();
  const [flash, setFlash] = useState<DrumKind | null>(null);

  useEffect(() => {
    let timer = 0;
    const off = subscribeDrums((kind) => {
      setFlash(kind);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setFlash(null), 120);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="drumpads">
      <div className="field-label">Drum pads</div>
      <div className="padrow">
        {PADS.map((p) => (
          <div key={p.kind} className="padcol">
            <button
              type="button"
              className={`bigpad ${flash === p.kind ? "hit" : ""}`}
              onPointerDown={(e) => {
                e.preventDefault();
                hitDrum(p.kind);
              }}
            >
              {p.label}
            </button>
            <small className="note">
              {learning === p.kind ? "Hit a pad now..." : map[p.kind] !== null ? `pad note ${map[p.kind]}` : `default (note ${p.gm})`}
            </small>
            <button type="button" className="btn small" aria-pressed={learning === p.kind} onClick={() => toggleLearn(p.kind)}>
              {learning === p.kind ? "Cancel" : "Learn"}
            </button>
          </div>
        ))}
      </div>
      <p className="note">
        Pads on channel 10 play the standard drum notes (36 kick, 38 snare, 42 hi-hat). If your pads do something else,
        press <b>Learn</b> under a drum, then hit the pad you want for it.{" "}
        <button type="button" className="link" onClick={reset}>Forget learned pads</button>
      </p>
    </div>
  );
}
