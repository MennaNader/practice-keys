import { useCallback, useEffect, useRef, useState } from "react";
import { drumHit, noteOff, noteOn, stopDrums, unlockAudio, type DrumKind } from "./audio";

export interface Step {
  /** ms from the start of the sequence */
  at: number;
  /** ms the notes are held */
  dur: number;
  midis: number[];
  tag?: string;
  /** Play the normal piano pitch even when a maqam tuning is active. */
  plain?: boolean;
}

export interface Drum {
  kind: DrumKind;
  /** ms from the start of the sequence */
  at: number;
}

/** Plays timed sequences of notes (a scale, a chord, a progression) and reports which keys are lit. */
export function usePlayer() {
  const [lit, setLit] = useState<ReadonlySet<number>>(new Set());
  const [tag, setTag] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const held = useRef<number[]>([]);

  const stop = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    held.current.forEach((m) => noteOff(m));
    held.current = [];
    stopDrums();
    setLit(new Set());
    setTag(null);
  }, []);

  const play = useCallback(
    (steps: Step[], drums: Drum[] = []) => {
      stop();
      unlockAudio();
      for (const d of drums) drumHit(d.kind, d.at / 1000);
      let end = 0;
      for (const s of steps) {
        end = Math.max(end, s.at + s.dur);
        timers.current.push(
          window.setTimeout(() => {
            s.midis.forEach((m) => {
              noteOn(m, 1, s.plain);
              held.current.push(m);
            });
            setLit(new Set(s.midis));
            setTag(s.tag ?? null);
          }, s.at),
          window.setTimeout(() => {
            s.midis.forEach((m) => noteOff(m));
            held.current = held.current.filter((m) => !s.midis.includes(m));
            setLit((prev) => {
              const next = new Set(prev);
              s.midis.forEach((m) => next.delete(m));
              return next;
            });
          }, s.at + s.dur),
        );
      }
      timers.current.push(window.setTimeout(() => setTag(null), end + 60));
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { lit, tag, play, stop };
}
