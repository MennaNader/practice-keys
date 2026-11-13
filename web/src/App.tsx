import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keyAdjustments, maqamFrequency, MAQAMAT, MAQAM_START, type MaqamName, type ChordQuality, type KeyMode, type ScaleName, SCALES } from "../../src";
import { setInstrument, setTuning, setVolume, type Instrument } from "./audio";
import { DrumPads } from "./DrumPads";
import { Keyboard, type Highlight, type LabelMode } from "./Keyboard";
import { Segmented } from "./Pickers";
import { ChordPanel, MaqamPanel, PlayPanel, ScalePanel } from "./panels";
import { useMidi } from "./midi";
import { usePlayer } from "./player";
import { QuizPanel, type QuizView } from "./Quiz";
import { clearProgress, load, save } from "./store";
import { ROOTS, chordInfo, maqamSpelling, scaleSpelling } from "./theory";

type Mode = "play" | "scale" | "chord" | "maqam" | "quiz";

const TABS: { id: Mode; label: string }[] = [
  { id: "play", label: "Play" },
  { id: "scale", label: "Scales" },
  { id: "chord", label: "Chords" },
  { id: "maqam", label: "Maqam" },
  { id: "quiz", label: "Quiz" },
];

const EMPTY_VIEW: QuizView = { highlight: {}, marks: {}, labelMode: "off" };

export function App() {
  const MODES: Mode[] = ["play", "scale", "chord", "maqam", "quiz"];
  const [mode, setMode] = useState<Mode>(() => load<Mode>("mode", "play", (v) => MODES.includes(v as Mode)));
  const [labelMode, setLabelMode] = useState<LabelMode>(() =>
    load<LabelMode>("labels", "names", (v) => v === "names" || v === "numbers" || v === "off"),
  );
  const [octave, setOctave] = useState<number>(() => load("octave", 4, (v) => typeof v === "number" && v >= 2 && v <= 5));
  const [volume, setVol] = useState<number>(() => load("volume", 0.7, (v) => typeof v === "number" && v >= 0 && v <= 1));

  const isPc = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 11;
  const [scaleRoot, setScaleRoot] = useState<number>(() => load("scale-root", 0, isPc));
  const [scaleId, setScaleId] = useState<ScaleName>(() => load<ScaleName>("scale-id", "major", (v) => typeof v === "string" && v in SCALES));
  const [chordRoot, setChordRoot] = useState(0);
  const [quality, setQuality] = useState<ChordQuality>("major");
  const [keyPc, setKeyPc] = useState(0);
  const [keyMode, setKeyMode] = useState<KeyMode>("major");
  const [maqamRoot, setMaqamRoot] = useState<number>(() => load("maqam-root", 0, isPc));
  const [maqamId, setMaqamId] = useState<MaqamName>(() => load<MaqamName>("maqam", "rast", (v) => typeof v === "string" && v in MAQAMAT));
  const [instrument, setInstrumentState] = useState<Instrument>(() =>
    load<Instrument>("instrument", "piano", (v) => v === "piano" || v === "oud"),
  );

  const [quizView, setQuizView] = useState<QuizView>(EMPTY_VIEW);
  const quizHandler = useRef<((midi: number) => void) | null>(null);
  const onNoteOn = useCallback((midi: number) => quizHandler.current?.(midi), []);

  const player = usePlayer();
  const midi = useMidi();

  useEffect(() => save("mode", mode), [mode]);
  useEffect(() => save("scale-root", scaleRoot), [scaleRoot]);
  useEffect(() => save("scale-id", scaleId), [scaleId]);
  useEffect(() => save("maqam-root", maqamRoot), [maqamRoot]);
  useEffect(() => save("maqam", maqamId), [maqamId]);
  useEffect(() => save("labels", labelMode), [labelMode]);
  useEffect(() => save("octave", octave), [octave]);
  useEffect(() => {
    save("instrument", instrument);
    setInstrument(instrument);
  }, [instrument]);

  // In the Maqam tab the piano keys are re-tuned (Rast: the 3rd and 7th keys play a quarter tone lower).
  const maqamAdjust = useMemo(() => keyAdjustments(MAQAMAT[maqamId], MAQAM_START[maqamId]), [maqamId]);
  useEffect(() => {
    setTuning(mode === "maqam" ? (midi) => maqamFrequency(midi, maqamRoot, maqamAdjust) : null);
    return () => setTuning(null);
  }, [mode, maqamRoot, maqamAdjust]);
  useEffect(() => {
    save("volume", volume);
    setVolume(volume);
  }, [volume]);

  const startMidi = (octave + 1) * 12;

  const spell = useMemo(() => scaleSpelling(ROOTS[scaleRoot]!.name, scaleId), [scaleRoot, scaleId]);

  const highlight = useMemo<Highlight>(() => {
    const h: Highlight = {};
    if (mode === "scale") {
      spell.pcs.forEach((pc, i) => {
        h[pc] = { role: i === 0 ? "root" : "in", label: spell.names[i] };
      });
    } else if (mode === "chord") {
      const info = chordInfo(chordRoot, quality);
      info.pcs.forEach((pc, i) => {
        h[pc] = { role: i === 0 ? "root" : "in", label: info.names[i] };
      });
    } else if (mode === "maqam") {
      const sp = maqamSpelling(ROOTS[maqamRoot]!.name, MAQAMAT[maqamId], MAQAM_START[maqamId]);
      sp.keys.slice(0, 7).forEach((key, i) => {
        h[(maqamRoot + key) % 12] = { role: i === 0 ? "root" : "in", label: sp.names[i] };
      });
    } else if (mode === "quiz") {
      return quizView.highlight;
    }
    return h;
  }, [mode, spell, chordRoot, quality, quizView, maqamRoot, maqamId]);

  const changeMode = (m: Mode) => {
    player.stop();
    setQuizView(EMPTY_VIEW);
    setMode(m);
  };

  const effectiveLabels: LabelMode = mode === "quiz" ? quizView.labelMode : labelMode;

  return (
    <div className="app">
      <header className="top">
        <h1>Practice Keys</h1>
        <p className="sub">A piano that explains the theory behind the notes you play.</p>
      </header>

      <nav className="tabs" role="tablist" aria-label="Practice mode">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={mode === t.id}
            aria-controls="panel"
            onClick={() => changeMode(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="panel" id="panel" role="tabpanel" aria-labelledby={`tab-${mode}`}>
        {mode === "play" && (
          <PlayPanel onPlayPc={(pc) => player.play([{ at: 0, dur: 700, midis: [startMidi + pc] }])} />
        )}
        {mode === "scale" && (
          <ScalePanel
            rootPc={scaleRoot}
            onRoot={setScaleRoot}
            scaleId={scaleId}
            onScale={setScaleId}
            names={spell.names}
            startMidi={startMidi}
            play={player.play}
            tag={player.tag}
          />
        )}
        {mode === "chord" && (
          <ChordPanel
            rootPc={chordRoot}
            onRoot={setChordRoot}
            quality={quality}
            onQuality={setQuality}
            keyPc={keyPc}
            onKey={setKeyPc}
            keyMode={keyMode}
            onKeyMode={setKeyMode}
            startMidi={startMidi}
            play={player.play}
            tag={player.tag}
          />
        )}
        {mode === "maqam" && (
          <MaqamPanel
            rootPc={maqamRoot}
            onRoot={setMaqamRoot}
            maqam={maqamId}
            onMaqam={setMaqamId}
            startMidi={startMidi}
            instrument={instrument}
            play={player.play}
            tag={player.tag}
          />
        )}
        {mode === "quiz" && <QuizPanel onView={setQuizView} handlerRef={quizHandler} />}
      </section>

      <section className="board" aria-label="Keyboard">
        <div className="bed">
          <div className="scroller">
            <Keyboard
              startMidi={startMidi}
              semitones={24}
              highlight={highlight}
              marks={mode === "quiz" ? quizView.marks : {}}
              labelMode={effectiveLabels}
              lit={player.lit}
              onNoteOn={onNoteOn}
            />
          </div>
        </div>

        <div className="bar">
          <div className="ctl">
            <span className="field-label">Labels</span>
            <Segmented<LabelMode>
              label="Key labels"
              value={labelMode}
              options={[
                { id: "names", label: "Names" },
                { id: "numbers", label: "0 to 11" },
                { id: "off", label: "Off" },
              ]}
              onChange={setLabelMode}
            />
          </div>
          <div className="ctl">
            <span className="field-label">Instrument</span>
            <Segmented<Instrument>
              label="Instrument"
              value={instrument}
              options={[
                { id: "piano", label: "Piano" },
                { id: "oud", label: "Oud" },
              ]}
              onChange={setInstrumentState}
            />
          </div>
          <div className="ctl">
            <span className="field-label">Octave</span>
            <div className="stepper">
              <button type="button" className="btn small" aria-label="Octave down" disabled={octave <= 2} onClick={() => setOctave(octave - 1)}>−</button>
              <span className="mono range">C{octave} to C{octave + 2}</span>
              <button type="button" className="btn small" aria-label="Octave up" disabled={octave >= 5} onClick={() => setOctave(octave + 1)}>+</button>
            </div>
          </div>
          <div className="ctl">
            <label className="field-label" htmlFor="volume">Volume</label>
            <input
              id="volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVol(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="midibar">
          <span className="field-label">MIDI keyboard</span>
          {(midi.status === "idle" || midi.status === "blocked" || midi.status === "connecting") && (
            <button type="button" className="btn small" disabled={midi.status === "connecting"} onClick={() => void midi.connect()}>
              {midi.status === "connecting" ? "Connecting..." : "Connect"}
            </button>
          )}
          <span className="note" role="status">
            {midi.status === "unsupported" && "This browser has no MIDI support. Use Chrome or Edge."}
            {midi.status === "idle" && "Plug in your keyboard, then press Connect."}
            {midi.status === "blocked" &&
              "MIDI is blocked here. Open the project on your computer (npm run dev) in Chrome or Edge and allow MIDI when asked."}
            {midi.status === "ready" &&
              (midi.inputs.length > 0
                ? `Connected: ${midi.inputs.join(", ")}. Play your keys and pads.`
                : "Allowed, but no keyboard found. Plug it in and it appears here.")}
          </span>
        </div>
        <DrumPads />
        {mode === "quiz" && <p className="note">Labels stay hidden during the quiz until you ask for a hint.</p>}
      </section>

      <p className="note">
        Your quiz score and settings are saved in this browser only.{" "}
        <button
          type="button"
          className="link"
          onClick={() => {
            if (window.confirm("Delete the progress saved in this browser?")) {
              clearProgress();
              window.location.reload();
            }
          }}
        >
          Reset my progress
        </button>
      </p>
    </div>
  );
}
