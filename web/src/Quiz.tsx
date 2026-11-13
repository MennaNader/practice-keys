import { useEffect, useMemo, useState } from "react";
import { EMPTY_SCORE, addAnswer, isScore, load, save, type QuizScore } from "./store";
import type { MutableRefObject } from "react";
import { CHORDS, chordPitchClasses, type ChordQuality } from "../../src";
import type { Highlight, LabelMode, Marks } from "./Keyboard";
import { Segmented } from "./Pickers";
import { CHORD_LIST, ROOTS, bothNames, isBlackPc, sharpName } from "./theory";

export interface QuizView {
  highlight: Highlight;
  marks: Marks;
  labelMode: LabelMode;
}

type Kind = "note" | "steps" | "chord";
type Filter = "mix" | Kind;

type Question =
  | { kind: "note"; pc: number }
  | { kind: "steps"; start: number; n: number }
  | { kind: "chord"; root: number; quality: ChordQuality };

const QUALITIES: ChordQuality[] = ["major", "minor", "diminished"];
const rand = (n: number) => Math.floor(Math.random() * n);
const mod12 = (n: number) => ((n % 12) + 12) % 12;

function makeQuestion(filter: Filter, prev: Question | null): Question {
  const kinds: Kind[] = filter === "mix" ? ["note", "steps", "chord"] : [filter];
  let q: Question = { kind: "note", pc: rand(12) };
  for (let i = 0; i < 25; i++) {
    const kind = kinds[rand(kinds.length)] as Kind;
    if (kind === "note") q = { kind, pc: rand(12) };
    else if (kind === "steps") q = { kind, start: rand(12), n: 1 + rand(8) };
    else q = { kind, root: rand(12), quality: QUALITIES[rand(QUALITIES.length)] as ChordQuality };
    if (!prev || JSON.stringify(q) !== JSON.stringify(prev)) break;
  }
  return q;
}

function expectedPcs(q: Question): number[] {
  if (q.kind === "note") return [q.pc];
  if (q.kind === "steps") return [mod12(q.start + q.n)];
  return chordPitchClasses(q.root, q.quality);
}

const num = (pc: number) => `${sharpName(pc)} (${pc})`;

function explain(q: Question, pickedMidis: number[], ok: boolean): string[] {
  const pickedPcs = pickedMidis.map((m) => m % 12);
  const lines: string[] = [];

  if (q.kind === "note") {
    lines.push(
      isBlackPc(q.pc)
        ? `${bothNames(q.pc)} is a black key, one tiny step above ${num(q.pc - 1)}. That makes its number ${q.pc}.`
        : `${sharpName(q.pc)} is a white key. Its number on the number line is ${q.pc}.`,
    );
    if (!ok) lines.push(`You pressed ${num(pickedPcs[0] as number)}.`);
    lines.push("The same note name repeats in every octave, so any octave counts.");
  }

  if (q.kind === "steps") {
    const raw = q.start + q.n;
    const target = mod12(raw);
    const path = Array.from({ length: q.n + 1 }, (_, i) => num(mod12(q.start + i))).join(" → ");
    lines.push(`${num(q.start)} plus ${q.n} tiny step${q.n > 1 ? "s" : ""}: ${q.start} + ${q.n} = ${raw}${raw >= 12 ? `, which wraps around to ${target}` : ""}.`);
    lines.push(`Key by key: ${path}.`);
    lines.push(`${target} is ${sharpName(target)}.`);
    if (!ok) lines.push(`You pressed ${num(pickedPcs[0] as number)}.`);
  }

  if (q.kind === "chord") {
    const shape = CHORDS[q.quality];
    const pcs = chordPitchClasses(q.root, q.quality);
    const mood = CHORD_LIST.find((c) => c.id === q.quality)?.mood;
    lines.push(
      `${sharpName(q.root)} ${q.quality} uses the shape [${shape.join(", ")}]: start on ${num(pcs[0] as number)}, go up ${shape[1]} to ${num(pcs[1] as number)}, then ${shape[2] - shape[1]} more to ${num(pcs[2] as number)}.`,
    );
    lines.push(`That is a ${mood} chord: ${shape[1]} tiny steps to the middle note.`);
    if (!ok) {
      const got = new Set(pickedPcs);
      const missing = pcs.filter((p) => !got.has(p));
      const extra = pickedPcs.filter((p) => !pcs.includes(p));
      const parts: string[] = [`You played ${pickedPcs.map(sharpName).join(", ")}.`];
      if (missing.length) parts.push(`Missing: ${missing.map(sharpName).join(", ")}.`);
      if (extra.length) parts.push(`Not in this chord: ${extra.map(sharpName).join(", ")}.`);
      lines.push(parts.join(" "));
    }
  }
  return lines;
}

interface Props {
  onView: (v: QuizView) => void;
  handlerRef: MutableRefObject<((midi: number) => void) | null>;
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "mix", label: "Mix" },
  { id: "note", label: "Find the note" },
  { id: "steps", label: "Count steps" },
  { id: "chord", label: "Build a chord" },
];

export function QuizPanel({ onView, handlerRef }: Props) {
  const [filter, setFilter] = useState<Filter>("mix");
  const [q, setQ] = useState<Question>(() => makeQuestion("mix", null));
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const [hint, setHint] = useState(false);
  const [score, setScore] = useState<QuizScore>(() => load("quiz-score", EMPTY_SCORE, isScore));
  useEffect(() => save("quiz-score", score), [score]);

  const expected = useMemo(() => expectedPcs(q), [q]);

  const finish = (ok: boolean) => {
    setResult(ok);
    setScore((s) => addAnswer(s, ok));
  };

  // The keyboard reports every key press here. Re-assigned each render so it always sees fresh state.
  useEffect(() => {
    handlerRef.current = (midi: number) => {
      if (result !== null) return;
      const pc = midi % 12;
      if (q.kind === "chord") {
        if (picked.some((m) => m % 12 === pc)) return;
        const next = [...picked, midi];
        setPicked(next);
        if (next.length === 3) {
          const got = new Set(next.map((m) => m % 12));
          finish(expected.every((p) => got.has(p)));
        }
      } else {
        setPicked([midi]);
        finish(pc === expected[0]);
      }
    };
  });
  useEffect(() => () => {
    handlerRef.current = null;
  }, [handlerRef]);

  const next = (f: Filter = filter) => {
    setQ((prev) => makeQuestion(f, prev));
    setPicked([]);
    setResult(null);
    setHint(false);
  };

  const view = useMemo<QuizView>(() => {
    const highlight: Highlight = {};
    if (q.kind === "steps") highlight[q.start] = { role: "root", label: sharpName(q.start) };
    if (q.kind === "chord" && hint && result === null) highlight[q.root] = { role: "root", label: sharpName(q.root) };
    if (result !== null) {
      expected.forEach((pc, i) => {
        highlight[pc] = { role: q.kind === "chord" && i === 0 ? "root" : "in", label: sharpName(pc) };
      });
      if (q.kind === "steps") highlight[q.start] = { role: "root", label: sharpName(q.start) };
    }
    const marks: Marks = {};
    picked.forEach((m) => {
      marks[m] = result === null ? "picked" : expected.includes(m % 12) ? "right" : "wrong";
    });
    return { highlight, marks, labelMode: hint || result !== null ? "names" : "off" };
  }, [q, hint, result, picked, expected]);

  useEffect(() => onView(view), [view, onView]);

  const kindLabel = q.kind === "note" ? "Find the note" : q.kind === "steps" ? "Count the tiny steps" : "Build the chord";
  const text =
    q.kind === "note"
      ? `Find ${bothNames(q.pc)} on the keyboard.`
      : q.kind === "steps"
        ? `Start on ${bothNames(q.start)}. Go up ${q.n} tiny step${q.n > 1 ? "s" : ""}. Which note do you land on?`
        : `Build a ${bothNames(q.root)} ${q.quality} chord.`;
  const sub =
    q.kind === "note"
      ? "Any octave works. Piano labels are hidden until you ask for a hint."
      : q.kind === "steps"
        ? "Every key counts as one tiny step, black keys too. The starting note is lit in coral."
        : "Press the 3 notes in any order. Any octave works.";

  const ok = result === true;
  const lines = result === null ? [] : explain(q, picked, ok);

  return (
    <div className="stack">
      <div className="quizhead">
        <h2>Quiz</h2>
        <div className="score" aria-live="polite">
          <b>{score.right}</b>/{score.total} right{score.streak > 1 ? ` · streak ${score.streak}` : ""}{score.best > 2 ? ` · best streak ${score.best}` : ""}
        </div>
      </div>

      <Segmented
        label="Question type"
        value={filter}
        options={FILTERS}
        onChange={(f) => {
          setFilter(f);
          next(f);
        }}
      />

      <div className="question">
        <div className="field-label">{kindLabel}</div>
        <p className="qtext">{text}</p>
        <p className="note">{sub}</p>
        {q.kind === "chord" && (
          <div className="picked" aria-live="polite">
            {picked.length === 0 ? <span className="note">No notes yet.</span> : null}
            {picked.map((m) => (
              <span key={m} className="tag">{sharpName(m % 12)}</span>
            ))}
            {picked.length > 0 && result === null && (
              <button type="button" className="link" onClick={() => setPicked([])}>Clear</button>
            )}
          </div>
        )}
      </div>

      {result !== null && (
        <div className={`feedback ${ok ? "good" : "bad"}`} role="status">
          <b>{ok ? "Yes." : "Not quite."}</b>
          {lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      )}

      <div className="row">
        <button type="button" className="btn primary" disabled={result === null} onClick={() => next()}>
          Next question
        </button>
        <button type="button" className="btn" disabled={hint || result !== null} onClick={() => setHint(true)}>
          Show hint
        </button>
        {result === null && (
          <button type="button" className="btn ghost" onClick={() => next()}>
            Skip
          </button>
        )}
      </div>

      <details className="ref">
        <summary>Number line cheat sheet</summary>
        <div className="numline small">
          {ROOTS.map((r) => (
            <div key={r.pc} className={`cell ${isBlackPc(r.pc) ? "black" : "white"}`}>
              <span className="num">{r.pc}</span>
              <span className="nm">{sharpName(r.pc)}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
