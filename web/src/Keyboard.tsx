import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { noteOff, noteOn, releaseAll } from "./audio";
import { CODE_TO_OFFSET, codeForOffset, defaultLabel } from "./keymap";
import { subscribeMidi } from "./midi";
import { isBlackPc, pretty, sharpName } from "./theory";

export type Role = "root" | "in";
/** Keys to colour, by pitch class (0-11), so every octave lights up. */
export type Highlight = Record<number, { role: Role; label?: string }>;
/** Feedback on specific keys, by MIDI note. */
export type Marks = Record<number, "picked" | "right" | "wrong">;
export type LabelMode = "names" | "numbers" | "off";

interface Props {
  startMidi: number;
  semitones: number;
  highlight: Highlight;
  marks: Marks;
  labelMode: LabelMode;
  /** Keys shown as pressed because the app is playing them (scale, chord, progression). */
  lit: ReadonlySet<number>;
  onNoteOn: (midi: number) => void;
}

export function Keyboard(props: Props) {
  const { startMidi, semitones, highlight, marks, labelMode, lit } = props;
  const latest = useRef(props);
  latest.current = props;

  const [down, setDown] = useState<ReadonlySet<number>>(new Set());
  const pointerNotes = useRef(new Map<number, number>());
  const [hintLabels, setHintLabels] = useState<Record<string, string>>({});

  const press = useCallback((midi: number, velocity = 1) => {
    noteOn(midi, velocity);
    latest.current.onNoteOn(midi);
    setDown((s) => new Set(s).add(midi));
  }, []);

  const release = useCallback((midi: number) => {
    noteOff(midi);
    setDown((s) => {
      const next = new Set(s);
      next.delete(midi);
      return next;
    });
  }, []);

  // Show the label printed on the user's own keys (QWERTZ, AZERTY...) where the browser can tell us.
  useEffect(() => {
    const kb = (navigator as unknown as { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
    kb?.getLayoutMap?.()
      .then((map) => {
        const out: Record<string, string> = {};
        map.forEach((value, code) => {
          out[code] = value.toUpperCase();
        });
        setHintLabels(out);
      })
      .catch(() => undefined);
  }, []);

  // Computer keyboard
  useEffect(() => {
    const held = new Map<string, number>();
    const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName);

    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      const offset = CODE_TO_OFFSET.get(e.code);
      if (offset === undefined) return;
      const { startMidi: start, semitones: span } = latest.current;
      if (offset > span) return;
      e.preventDefault();
      const midi = start + offset;
      held.set(e.code, midi);
      press(midi);
    };
    const onUp = (e: KeyboardEvent) => {
      const midi = held.get(e.code);
      if (midi === undefined) return;
      held.delete(e.code);
      release(midi);
    };
    const onBlur = () => {
      held.clear();
      pointerNotes.current.clear();
      releaseAll();
      setDown(new Set());
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [press, release]);

  // MIDI keyboard (for example the Akai MPK mini): same path as the computer keyboard.
  useEffect(
    () =>
      subscribeMidi((e) => {
        if (e.type === "on") press(e.note, e.velocity);
        else release(e.note);
      }),
    [press, release],
  );

  // Moving to another octave while holding keys would leave notes hanging.
  useEffect(() => {
    releaseAll();
    pointerNotes.current.clear();
    setDown(new Set());
  }, [startMidi]);

  const { whites, blacks } = useMemo(() => {
    const all = Array.from({ length: semitones + 1 }, (_, i) => startMidi + i);
    const w = all.filter((m) => !isBlackPc(m));
    const b = all.filter((m) => isBlackPc(m));
    return { whites: w, blacks: b };
  }, [startMidi, semitones]);

  const whiteWidth = 100 / whites.length;

  const labelFor = (midi: number): string => {
    if (labelMode === "off") return "";
    const pc = midi % 12;
    if (labelMode === "numbers") return String(pc);
    const h = highlight[pc];
    if (h?.label) return h.label;
    const octave = Math.floor(midi / 12) - 1;
    return pc === 0 ? `C${octave}` : sharpName(pc);
  };

  const keyProps = (midi: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* not captured */
      }
      pointerNotes.current.set(e.pointerId, midi);
      press(midi);
    },
    onPointerEnter: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!(e.buttons & 1)) return;
      const prev = pointerNotes.current.get(e.pointerId);
      if (prev === midi) return;
      if (prev !== undefined) release(prev);
      pointerNotes.current.set(e.pointerId, midi);
      press(midi);
    },
    onPointerLeave: (e: React.PointerEvent<HTMLDivElement>) => {
      if (pointerNotes.current.get(e.pointerId) === midi) {
        pointerNotes.current.delete(e.pointerId);
        release(midi);
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      const m = pointerNotes.current.get(e.pointerId);
      if (m !== undefined) {
        pointerNotes.current.delete(e.pointerId);
        release(m);
      }
    },
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => {
      const m = pointerNotes.current.get(e.pointerId);
      if (m !== undefined) {
        pointerNotes.current.delete(e.pointerId);
        release(m);
      }
    },
  });

  const classFor = (midi: number, base: string): string => {
    const cls = [base];
    const h = highlight[midi % 12];
    if (h) cls.push(h.role);
    if (down.has(midi) || lit.has(midi)) cls.push("down");
    const mark = marks[midi];
    if (mark) cls.push(mark);
    return cls.join(" ");
  };

  const ariaFor = (midi: number) => `${sharpName(midi % 12)}${Math.floor(midi / 12) - 1}`;

  const hintFor = (midi: number) => {
    const code = codeForOffset(midi - startMidi);
    if (!code) return "";
    return hintLabels[code] ?? defaultLabel(code);
  };

  return (
    <div className="keys" role="group" aria-label="Piano keyboard" style={{ minWidth: `${whites.length * 40}px` }}>
      {whites.map((m) => (
        <div
          key={m}
          role="button"
          aria-label={ariaFor(m)}
          aria-pressed={down.has(m) || lit.has(m)}
          className={classFor(m, "key white")}
          {...keyProps(m)}
        >
          <span className="hint" aria-hidden="true">{hintFor(m)}</span>
          <span className="lab">{pretty(labelFor(m))}</span>
        </div>
      ))}
      {blacks.map((m) => {
        const before = whites.filter((x) => x < m).length;
        return (
          <div
            key={m}
            role="button"
            aria-label={ariaFor(m)}
            aria-pressed={down.has(m) || lit.has(m)}
            className={classFor(m, "key black")}
            style={{ left: `${before * whiteWidth - whiteWidth * 0.31}%`, width: `${whiteWidth * 0.62}%` }}
            {...keyProps(m)}
          >
            <span className="hint" aria-hidden="true">{hintFor(m)}</span>
            <span className="lab">{pretty(labelFor(m))}</span>
          </div>
        );
      })}
    </div>
  );
}
