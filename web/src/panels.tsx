import { useEffect, useMemo, useState } from "react";
import {
  HAT,
  KEY_FUNCTIONS,
  MAJOR_STEPS,
  MAQAMAT,
  MAQAM_START,
  maqamSong,
  seededRandom,
  type MaqamName,
  KICK,
  SNARE,
  hitTimes,
  beatsToSeconds,
  chordStartTimes,
  progressionFromTeams,
  SCALES,
  chord,
  chordsInKey,
  romanNumeral,
  scaleMidi,
  smoothProgression,
  totalMovement,
  stepsToOffsets,
  type ChordQuality,
  type HarmonicFunction,
  type KeyChord,
  type KeyMode,
  type ScaleName,
} from "../../src";
import { RootPicker, Segmented } from "./Pickers";
import { buildMaqamExport, maqamClips, saveFile } from "./exportMaqam";
import { IS_PAGES } from "./target";
import { addSong, hasSong, isCounters, isSongList, removeSong, type Counters, type SavedSong } from "./songs";
import { load, save } from "./store";
import type { CallTool } from "./liveSend";
import type { DrumKind, Instrument } from "./audio";
import type { Drum, Step } from "./player";
import {
  CHORD_EXPLAIN,
  CHORD_LIST,
  ROOTS,
  SCALE_LIST,
  chordInfo,
  isBlackPc,
  keyName,
  maqamSpelling,
  nameInKey,
  pretty,
  sharpName,
} from "./theory";

/* ---------- Play ---------- */

export function PlayPanel({ onPlayPc }: { onPlayPc: (pc: number) => void }) {
  return (
    <div className="stack">
      <h2>Free play</h2>
      <p className="lead">
        Click or tap the keys, or use your computer keyboard: the bottom letter row (Z to M) plays the lower octave and
        the Q row plays the upper one. Set the labels below the piano to <b>Numbers</b> to see the 0 to 11 number line
        from the lessons.
      </p>
      <div>
        <div className="field-label">The number line (tap a note to hear it)</div>
        <div className="numline" role="group" aria-label="Number line of the 12 notes">
          {ROOTS.map((r) => (
            <button
              key={r.pc}
              type="button"
              className={`cell ${isBlackPc(r.pc) ? "black" : "white"}`}
              onClick={() => onPlayPc(r.pc)}
            >
              <span className="num">{r.pc}</span>
              <span className="nm">{sharpName(r.pc)}</span>
            </button>
          ))}
        </div>
        <p className="note">
          Every key is one tiny step from its neighbour. After 12 tiny steps you are back on the same note, one octave
          higher. White neighbours E and F, and B and C, have no black key between them.
        </p>
      </div>
    </div>
  );
}

/* ---------- Scales ---------- */

interface ScaleProps {
  rootPc: number;
  onRoot: (pc: number) => void;
  scaleId: ScaleName;
  onScale: (id: ScaleName) => void;
  names: string[];
  startMidi: number;
  play: (s: Step[]) => void;
  tag: string | null;
}

export function ScalePanel({ rootPc, onRoot, scaleId, onScale, names, startMidi, play, tag }: ScaleProps) {
  const steps = SCALES[scaleId];
  const offsets = stepsToOffsets(steps);
  const info = SCALE_LIST.find((s) => s.id === scaleId);
  const litIndex = tag?.startsWith("scale-") ? Number(tag.slice(6)) : -1;

  const playScale = () => {
    const midis = scaleMidi(startMidi + rootPc, steps);
    play(midis.map((m, i) => ({ at: i * 380, dur: 340, midis: [m], tag: `scale-${i}` })));
  };

  const stepWord = (n: number) => (n === 1 ? "tiny" : n === 2 ? "big" : `${n} tiny`);

  return (
    <div className="stack">
      <h2>Scales</h2>
      <RootPicker label="Home note" value={rootPc} onChange={onRoot} />
      <div className="field">
        <label className="field-label" htmlFor="scale-select">Scale</label>
        <select id="scale-select" value={scaleId} onChange={(e) => onScale(e.target.value as ScaleName)}>
          {SCALE_LIST.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <p className="note">{info?.mood}</p>
      </div>

      <div>
        <div className="field-label">Notes</div>
        <ol className="notes">
          {[...names, names[0] as string].map((n, i) => (
            <li key={i} className={`${i === 0 || i === names.length ? "home" : ""} ${litIndex === i ? "now" : ""}`}>
              {pretty(n)}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <div className="field-label">Steps between the notes</div>
        <div className="steps" role="list">
          {steps.map((n, i) => (
            <div key={i} role="listitem" className={`step n${n}`} style={{ flexGrow: n }}>
              <span className="big">{n}</span>
              <span className="cap">{stepWord(n)}</span>
            </div>
          ))}
        </div>
        <p className="note">
          Numbers are tiny steps (keys). From the home note the notes sit at{" "}
          <span className="mono">{offsets.join(" ")} 12</span>.
        </p>
      </div>

      <div className="row">
        <button type="button" className="btn primary" onClick={playScale}>Play scale</button>
        <span className="note">Coral is the home note. Teal keys belong to the scale.</span>
      </div>
    </div>
  );
}

/* ---------- Chords ---------- */

type ColorBy = "mood" | "team";
type Voicing = "jumpy" | "smooth";

const TEAM_WORD: Record<HarmonicFunction, string> = { home: "home", away: "away", push: "push" };

const SONGS: { id: string; label: string; teams: HarmonicFunction[] }[] = [
  { id: "classic", label: "Home, away, push, home", teams: ["home", "away", "push", "home"] },
  { id: "twofive", label: "Away, push, home", teams: ["away", "push", "home"] },
  { id: "stay", label: "Home, home, away, push", teams: ["home", "home", "away", "push"] },
  { id: "long", label: "Home, away, home, away, push, home", teams: ["home", "away", "home", "away", "push", "home"] },
];

const DRUM_ROWS = [
  { kind: "kick", label: "Kick" },
  { kind: "snare", label: "Snare" },
  { kind: "hat", label: "Hi-hat" },
] as const;

type Pattern = Record<DrumKind, number[]>;
const DEFAULT_PATTERN: Pattern = { kick: [...KICK], snare: [...SNARE], hat: [...HAT] };
const SPOTS = ["1", "&", "2", "&", "3", "&", "4", "&"];

const SUFFIX: Record<ChordQuality, string> = { major: "", minor: "m", diminished: "°" };

interface ChordProps {
  rootPc: number;
  onRoot: (pc: number) => void;
  quality: ChordQuality;
  onQuality: (q: ChordQuality) => void;
  keyPc: number;
  onKey: (pc: number) => void;
  keyMode: KeyMode;
  onKeyMode: (m: KeyMode) => void;
  startMidi: number;
  play: (s: Step[], drums?: Drum[]) => void;
  tag: string | null;
}

export function ChordPanel({
  rootPc,
  onRoot,
  quality,
  onQuality,
  keyPc,
  onKey,
  keyMode,
  onKeyMode,
  startMidi,
  play,
  tag,
}: ChordProps) {
  const [songId, setSongId] = useState("classic");
  const [bpm, setBpm] = useState(90);
  const [drumsOn, setDrumsOn] = useState(true);
  const [voicing, setVoicing] = useState<Voicing>("smooth");
  const [pattern, setPattern] = useState<Pattern>(DEFAULT_PATTERN);
  const toggleSpot = (kind: DrumKind, i: number) =>
    setPattern((p) => ({ ...p, [kind]: p[kind].map((v, j) => (j === i ? (v ? 0 : 1) : v)) }));
  const [colorBy, setColorBy] = useState<ColorBy>("mood");
  const info = chordInfo(rootPc, quality);
  const rootLabel = pretty(ROOTS[rootPc]!.name);
  const mood = CHORD_LIST.find((c) => c.id === quality)?.mood;

  const keyLabel = `${pretty(keyName(keyPc, keyMode))} ${keyMode}`;
  const inKey = chordsInKey(keyPc, keyMode);
  const moodOf = (q: ChordQuality) => CHORD_LIST.find((c) => c.id === q)?.mood;

  const playChord = (spread: boolean) => {
    const midis = chord(startMidi + rootPc, quality);
    if (spread) play(midis.map((m, i) => ({ at: i * 420, dur: 900, midis: [m] })));
    else play([{ at: 0, dur: 1400, midis }]);
  };

  const pickKeyChord = (c: KeyChord) => {
    onRoot(c.root);
    onQuality(c.quality);
    play([{ at: 0, dur: 1400, midis: chord(startMidi + c.root, c.quality) }]);
  };

  const playAllSeven = () =>
    play(
      inKey.map((c, i) => ({
        at: i * 950,
        dur: 850,
        midis: chord(startMidi + c.root, c.quality),
        tag: `key-${i}`,
      })),
    );

  const storyRoots = [0, 5, 7, 0].map((d) => (keyPc + d) % 12);
  const storyWords = ["home", "away", "back", "home"];
  const storyQuality: ChordQuality = keyMode === "major" ? "major" : "minor";
  const storyNums = keyMode === "major" ? ["I", "IV", "V", "I"] : ["i", "iv", "v", "i"];

  const playStory = () =>
    play(
      storyRoots.map((r, i) => ({
        at: i * 1150,
        dur: 1050,
        midis: chord(startMidi + r, storyQuality),
        tag: `story-${i}`,
      })),
    );

  const song = SONGS.find((x) => x.id === songId) ?? SONGS[0]!;
  const songChords = progressionFromTeams(keyPc, song.teams, keyMode);
  // Jumpy: every chord from its bottom note. Smooth: each chord placed as close as possible to the one before.
  const jumpyVoicing = songChords.map((c) => chord(startMidi + c.root, c.quality));
  const smoothRaw = smoothProgression(jumpyVoicing);
  const lowest = Math.min(...smoothRaw.flat());
  const lift = lowest < startMidi ? Math.ceil((startMidi - lowest) / 12) * 12 : 0;
  const smoothVoicing = smoothRaw.map((v) => v.map((n) => n + lift));
  const voiced = voicing === "smooth" ? smoothVoicing : jumpyVoicing;
  const jumpyCost = totalMovement(jumpyVoicing);
  const smoothCost = totalMovement(smoothVoicing);

  const BEATS_PER_CHORD = 4;
  const playSong = () => {
    const starts = chordStartTimes(songChords.length, BEATS_PER_CHORD, bpm);
    const length = beatsToSeconds(BEATS_PER_CHORD, bpm) * 1000;
    const barMs = length;
    const drums: Drum[] = drumsOn
      ? songChords.flatMap((_, bar) =>
          DRUM_ROWS.flatMap((row) =>
            hitTimes(pattern[row.kind], bpm).map((sec) => ({ kind: row.kind, at: bar * barMs + sec * 1000 })),
          ),
        )
      : [];
    play(
      songChords.map((c, i) => ({
        at: starts[i]! * 1000,
        dur: length * 0.95,
        midis: voiced[i]!,
        tag: `song-${i}`,
      })),
      drums,
    );
  };

  return (
    <div className="stack">
      <h2>Chords</h2>
      <RootPicker label="Bottom note" value={rootPc} onChange={onRoot} />
      <div className="field">
        <span className="field-label" id="lbl-quality">Chord type</span>
        <div className="chips wide" role="group" aria-labelledby="lbl-quality">
          {CHORD_LIST.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={quality === c.id} onClick={() => onQuality(c.id)}>
              {c.label} <small>{c.mood}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="chordcard">
        <div className="chordname">{rootLabel} {quality}</div>
        <ol className="notes">
          {info.names.map((n, i) => (
            <li key={i} className={i === 0 ? "home" : ""}>
              {n}
              <small className="mono">{info.pcs[i]}</small>
            </li>
          ))}
        </ol>
        <p className="note">
          Bottom to middle: <b>{info.gaps[0]}</b> tiny steps. Middle to top: <b>{info.gaps[1]}</b> tiny steps. That makes
          it <b>{mood}</b>. {CHORD_EXPLAIN[quality]}
        </p>
        <div className="row">
          <button type="button" className="btn primary" onClick={() => playChord(false)}>Play together</button>
          <button type="button" className="btn" onClick={() => playChord(true)}>Play one by one</button>
        </div>
      </div>

      <div className="keysection">
        <h3>Chords in a key</h3>
        <p className="note">
          {keyMode === "major"
            ? "Build a chord on every stair of a major staircase and the moods always come out happy, sad, sad, happy, happy, sad, tense."
            : "A minor key has the same chords as its relative major, started from the 6th stair, so the moods come out sad, tense, happy, sad, sad, happy, happy."}{" "}
          Tap a chord to hear it and see it on the keys.
        </p>
        <div className="field">
          <label className="field-label" htmlFor="key-select">Key</label>
          <div className="row">
            <select id="key-select" value={keyPc} onChange={(e) => onKey(Number(e.target.value))}>
              {ROOTS.map((r) => (
                <option key={r.pc} value={r.pc}>{pretty(keyName(r.pc, keyMode))}</option>
              ))}
            </select>
            <Segmented<KeyMode>
              label="Major or minor"
              value={keyMode}
              options={[
                { id: "major", label: "Major" },
                { id: "minor", label: "Minor" },
              ]}
              onChange={onKeyMode}
            />
          </div>
        </div>

        <div className="field">
          <span className="field-label">Color the chords by</span>
          <Segmented<ColorBy>
            label="Color chords by mood or team"
            value={colorBy}
            options={[
              { id: "mood", label: "Mood" },
              { id: "team", label: "Team" },
            ]}
            onChange={setColorBy}
          />
        </div>

        <div className="keychords" role="group" aria-label={`Chords in ${keyLabel}`}>
          {inKey.map((c, i) => (
            <button
              key={c.degree}
              type="button"
              className={`kc ${colorBy === "team" ? `team-${KEY_FUNCTIONS[i]}` : c.quality} ${rootPc === c.root && quality === c.quality ? "sel" : ""} ${tag === `key-${i}` ? "now" : ""}`}
              onClick={() => pickKeyChord(c)}
            >
              <span className="mono rn">{romanNumeral(c.degree, c.quality)}</span>
              <b>{nameInKey(c.root, keyPc, keyMode)}{SUFFIX[c.quality]}</b>
              <small>{colorBy === "team" ? TEAM_WORD[KEY_FUNCTIONS[i]!] : moodOf(c.quality)}</small>
            </button>
          ))}
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={playAllSeven}>Play all seven</button>
          <span className="note">
            {colorBy === "team"
              ? "Teal is home, amber is away, coral is push. Chords on the same team can stand in for each other."
              : "Small numerals are sad chords. The ° chord is the tense one."}
          </span>
        </div>
      </div>

      <div className="story">
        <div className="field-label">Home, away, come back ({keyLabel})</div>
        <div className="pills">
          {storyRoots.map((r, i) => (
            <div key={i} className={`pill ${tag === `story-${i}` ? "now" : ""}`}>
              <span className="mono">{storyNums[i]}</span>
              <b>{nameInKey(r, keyPc, keyMode)}{SUFFIX[storyQuality]}</b>
              <small>{storyWords[i]}</small>
            </div>
          ))}
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={playStory}>Play the story</button>
          <span className="note">Listen for the relief when the last chord arrives back home.</span>
        </div>
      </div>

      <div className="story">
        <div className="field-label">Song maker ({keyLabel})</div>
        <div className="chips wide" role="group" aria-label="Pick a team pattern">
          {SONGS.map((x) => (
            <button key={x.id} type="button" className="chip" aria-pressed={songId === x.id} onClick={() => setSongId(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="pills">
          {songChords.map((c, i) => (
            <div key={i} className={`pill ${tag === `song-${i}` ? "now" : ""}`}>
              <span className="mono">{romanNumeral(c.degree, c.quality)}</span>
              <b>{nameInKey(c.root, keyPc, keyMode)}{SUFFIX[c.quality]}</b>
              <small>{song.teams[i]}</small>
              <small className="mono notes-line">{voiced[i]!.map((m) => nameInKey(m % 12, keyPc, keyMode)).join(" ")}</small>
            </div>
          ))}
        </div>
        <div className="field">
          <span className="field-label">How the chords are played</span>
          <Segmented<Voicing>
            label="Jumpy or smooth voicing"
            value={voicing}
            options={[
              { id: "jumpy", label: "Jumpy" },
              { id: "smooth", label: "Smooth" },
            ]}
            onChange={setVoicing}
          />
          <p className="note">
            Jumpy plays every chord from its bottom note: the notes travel <b>{jumpyCost}</b> tiny steps in total. Smooth
            keeps shared notes still and moves the others the least: <b>{smoothCost}</b> tiny steps. Same chords, same
            drums, only the order and octave of the notes change.
          </p>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="bpm">Tempo: {bpm} BPM</label>
          <input id="bpm" type="range" min={50} max={160} step={5} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
        </div>
        <div className="field">
          <label className="check">
            <input type="checkbox" checked={drumsOn} onChange={(e) => setDrumsOn(e.target.checked)} /> Add drums
          </label>
          <div className="drums" role="group" aria-label="Drum pattern for one bar">
            <div className="drumrow head" aria-hidden="true">
              <span />
              {SPOTS.map((c, i) => (
                <span key={i} className="cnt">{c}</span>
              ))}
            </div>
            {DRUM_ROWS.map((row) => (
              <div key={row.kind} className="drumrow">
                <span className="dname">{row.label}</span>
                {pattern[row.kind].map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`cell ${v ? "on" : ""} ${drumsOn ? "" : "off"}`}
                    aria-pressed={v === 1}
                    aria-label={`${row.label}, spot ${SPOTS[i]} (${i + 1} of 8): ${v ? "hit" : "rest"}`}
                    onClick={() => toggleSpot(row.kind, i)}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className="note">
            Tap a spot to switch it on or off. One bar split into 8 eighth notes, and the same pattern repeats under
            every chord. This bar has {pattern.kick.filter(Boolean).length} kick, {pattern.snare.filter(Boolean).length}{" "}
            snare and {pattern.hat.filter(Boolean).length} hi-hat hits, so the {songChords.length}-bar song has{" "}
            {songChords.length * (pattern.kick.filter(Boolean).length + pattern.snare.filter(Boolean).length + pattern.hat.filter(Boolean).length)}{" "}
            hits in total.
          </p>
          <div className="row">
            <button type="button" className="btn small" onClick={() => setPattern(DEFAULT_PATTERN)}>Reset to the basic beat</button>
            <button type="button" className="btn small" onClick={() => setPattern({ kick: [0, 0, 0, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 0, 0, 0, 0], hat: [0, 0, 0, 0, 0, 0, 0, 0] })}>Clear</button>
          </div>
        </div>
        <div className="row">
          <button type="button" className="btn primary" onClick={playSong}>Play my song</button>
          <span className="note">
            Each chord lasts one bar of {BEATS_PER_CHORD} beats, so the song is {songChords.length * BEATS_PER_CHORD} beats
            long and takes {beatsToSeconds(songChords.length * BEATS_PER_CHORD, bpm).toFixed(1)} seconds.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Maqam ---------- */

interface MaqamProps {
  rootPc: number;
  onRoot: (pc: number) => void;
  maqam: MaqamName;
  onMaqam: (m: MaqamName) => void;
  startMidi: number;
  instrument: Instrument;
  play: (s: Step[]) => void;
  tag: string | null;
}

const MAQAM_LABEL: Record<MaqamName, string> = { rast: "Rast", hijaz: "Hijaz", bayati: "Bayati", sika: "Sika", nahawand: "Nahawand", saba: "Saba" };

const MAQAM_LEAD: Record<MaqamName, JSX.Element> = {
  rast: (<>A <b>maqam</b> is a scale from Arabic music. <b>Rast</b> is the most basic one, like the Arabic version of major. Two of its notes sit <b>between two piano keys</b>: the 3rd and the 7th are a quarter tone lower. Here the piano keys are re-tuned for it, so those two keys play the in-between notes.</>),
  hijaz: (<><b>Hijaz</b> is the dramatic one. Its big feature is the jump of <b>3 half steps</b> between the 2nd and 3rd note. In this 24-step model every Hijaz note lands on a normal piano key, so no key is re-tuned. Real players still shade some notes by ear.</>),
  bayati: (<><b>Bayati</b> is the sad, warm one. It starts with two small steps, so its <b>2nd note</b> sits between two piano keys, a quarter tone lower. The rest sounds like a minor scale.</>),
  sika: (<><b>Sika</b> is different: its <b>home note</b> is itself a quarter tone below a piano key (on E it starts on E half-flat). So even the root key is re-tuned. It is called Segah in some archives.</>),
  nahawand: (<><b>Nahawand</b> is the Arabic minor. This is the form with the big jump near the top (like harmonic minor). No note is bent, so every note is on a normal piano key.</>),
  saba: (<><b>Saba</b> is the most tense and sad one: one bent note (the 2nd) and a big jump of 3 half steps. It never feels settled.</>),
};

export function MaqamPanel({ rootPc, onRoot, maqam, onMaqam, startMidi, instrument, play, tag }: MaqamProps) {
  const steps = MAQAMAT[maqam];
  const start = MAQAM_START[maqam];
  const label = MAQAM_LABEL[maqam];
  const spell = maqamSpelling(ROOTS[rootPc]!.name, steps, start);
  const litIndex = tag?.startsWith("maqam-") ? Number(tag.slice(6)) : -1;
  const midiAt = (key: number) => startMidi + rootPc + key;
  const exported = useMemo(() => buildMaqamExport(maqam, rootPc), [maqam, rootPc]);
  const [saveMsg, setSaveMsg] = useState("");
  useEffect(() => setSaveMsg(""), [maqam, rootPc]);
  const exportToAbleton = async () => setSaveMsg(await saveFile(exported.zipName, exported.zip));

  // "Send to Ableton Live" exists only in the Claude build, and only shows where the page can reach tools on
  // the viewer's computer (the Claude desktop app). The Pages build never contains this code.
  const [callTool, setCallTool] = useState<CallTool | null>(null);
  const [liveMsg, setLiveMsg] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (IS_PAGES) return;
    let alive = true;
    const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
    void claude?.use?.("mcp")?.then((mcp) => {
      const m = mcp as { callTool?: CallTool } | null;
      if (alive && m?.callTool) setCallTool(() => m.callTool as CallTool);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  useEffect(() => setLiveMsg(""), [maqam, rootPc]);
  const sendLive = async () => {
    if (IS_PAGES || !callTool || sending) return;
    setSending(true);
    setLiveMsg("Sending…");
    const { sendToLive } = await import("./liveSend");
    const r = await sendToLive(callTool, maqamClips(maqam, rootPc), "Next: drag tuning.scl (from the zip) into Live's Tuning section.");
    setLiveMsg(r.message);
    setSending(false);
  };

  const playMaqam = () =>
    play(spell.keys.map((k, i) => ({ at: i * 430, dur: 400, midis: [midiAt(k)], tag: `maqam-${i}` })));

  // A "song" is a random tune made only from this maqam's notes. The seed is kept when you change maqam or home note,
  // so you can hear the SAME tune in another maqam and notice how the mood changes.
  const BEAT_MS = 600;
  const [songSeed, setSongSeed] = useState<number | null>(null);
  const [drone, setDrone] = useState(true);
  const song = useMemo(() => (songSeed === null ? null : maqamSong(seededRandom(songSeed))), [songSeed]);
  const playSong = (seed: number | null = songSeed) => {
    if (seed === null) return;
    const notes = maqamSong(seededRandom(seed));
    const end = notes[notes.length - 1]!;
    const totalMs = (end.startBeat + end.beats) * BEAT_MS;
    play([
      ...(drone ? [{ at: 0, dur: totalMs, midis: [midiAt(spell.keys[0] as number) - 12] }] : []),
      ...notes.map((n) => ({ at: n.startBeat * BEAT_MS, dur: n.beats * BEAT_MS * 0.92, midis: [midiAt(spell.keys[n.degree] as number)], tag: `maqam-${n.degree}` })),
    ]);
  };
  // Saved songs live in localStorage (this browser only). A song is its maqam, home note and seed.
  const [saved, setSaved] = useState<SavedSong[]>(() => load<SavedSong[]>("songs", [], isSongList));
  const [counters, setCounters] = useState<Counters>(() => load<Counters>("song-counters", {}, isCounters));
  const [songMsg, setSongMsg] = useState("");
  useEffect(() => save("songs", saved), [saved]);
  useEffect(() => save("song-counters", counters), [counters]);
  const current = songSeed === null ? null : saved.find((x) => x.maqam === maqam && x.rootPc === rootPc && x.seed === songSeed) ?? null;
  const saveSong = () => {
    if (songSeed === null) return;
    try {
      const r = addSong(saved, counters, { maqam, rootPc, seed: songSeed });
      setSaved(r.list);
      setCounters(r.counters);
      setSongMsg(`Saved as ${r.song.name}.`);
    } catch (e) {
      setSongMsg((e as Error).message);
    }
  };
  const deleteSong = (name: string) => {
    setSaved((l) => removeSong(l, name));
    setSongMsg(`Deleted ${name}.`);
  };
  // Playing a saved song first switches to its maqam and home note (the keys are re-tuned for them), then plays.
  const [pending, setPending] = useState<number | null>(null);
  const openSong = (x: SavedSong) => {
    onMaqam(x.maqam);
    onRoot(x.rootPc);
    setSongSeed(x.seed);
    setPending(x.seed);
    setSongMsg("");
  };
  useEffect(() => {
    if (pending === null || songSeed !== pending) return;
    const t = window.setTimeout(() => {
      playSong(pending);
      setPending(null);
    }, 80); // wait one moment so the new tuning is in place
    return () => window.clearTimeout(t);
  }, [pending, songSeed, maqam, rootPc]);

  const newSong = () => {
    const seed = Math.floor(Math.random() * 2 ** 32);
    setSongSeed(seed);
    playSong(seed);
  };

  const majorKeys = [0, 2, 4, 5, 7, 9, 11, 12];
  const playCompare = () => {
    const gap = majorKeys.length * 430 + 500;
    play([
      ...majorKeys.map((k, i) => ({ at: i * 430, dur: 400, midis: [midiAt(k)], plain: true })),
      ...spell.keys.map((k, i) => ({ at: gap + i * 430, dur: 400, midis: [midiAt(k)], tag: `maqam-${i}` })),
    ]);
  };

  return (
    <div className="stack">
      <h2>Maqam {label}</h2>
      <Segmented<MaqamName>
        label="Maqam"
        value={maqam}
        options={(Object.keys(MAQAMAT) as MaqamName[]).map((id) => ({ id, label: MAQAM_LABEL[id] }))}
        onChange={onMaqam}
      />
      <p className="lead">{MAQAM_LEAD[maqam]}</p>
      <RootPicker label="Home note" value={rootPc} onChange={onRoot} />

      <div>
        <div className="field-label">Notes (⁻ means a quarter tone lower than the piano note)</div>
        <ol className="notes">
          {spell.names.map((n, i) => (
            <li key={i} className={`${i === 0 || i === spell.names.length - 1 ? "home" : ""} ${litIndex === i ? "now" : ""}`}>
              {n}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <div className="field-label">Steps between the notes, in quarter tones</div>
        <div className="steps" role="list">
          {steps.map((n, i) => (
            <div key={i} role="listitem" className={`step n${n}`} style={{ flexGrow: n }}>
              <span className="big">{n}</span>
              <span className="cap">{n <= 2 ? "half" : n === 3 ? "small" : n === 4 ? "whole" : "jump"}</span>
            </div>
          ))}
        </div>
        <p className="note">
          Major is <span className="mono">{MAJOR_STEPS.map((n) => n * 2).join(" ")}</span> in the same units. {label} is{" "}
          <span className="mono">{steps.join(" ")}</span>{maqam === "rast" ? <>: look for the pattern <span className="mono">4 3 3 | 4 | 4 3 3</span></> : (steps as readonly number[]).includes(6) ? <>: the 6 is the big jump</> : null}.
        </p>
      </div>

      <div className="row">
        <button type="button" className="btn primary" onClick={playMaqam}>Play {label}</button>
        <button type="button" className="btn" onClick={playCompare}>Play major, then {label}</button>
      </div>
      <div className="stack">
        <div className="field-label">Song</div>
        <div className="row">
          <button type="button" className="btn primary" onClick={newSong}>Song</button>
          <button type="button" className="btn" onClick={() => playSong()} disabled={song === null}>Play this song again</button>
          <button type="button" className="btn" onClick={saveSong} disabled={song === null || current !== null}>
            {current ? `Saved: ${current.name}` : "Save song"}
          </button>
          <label className="check">
            <input type="checkbox" checked={drone} onChange={(e) => setDrone(e.target.checked)} /> Drone (low home note)
          </label>
        </div>
        {song && (
          <ol className="notes" aria-label="The song's notes">
            {song.map((n, i) => (
              <li key={i} className={n.degree === 0 || n.degree === 7 ? "home" : ""}>
                {spell.names[n.degree]}
                <small>{n.beats === 1 ? "" : `${n.beats} beats`}</small>
              </li>
            ))}
          </ol>
        )}
        {songMsg && <span className="note" role="status">{songMsg}</span>}
        <div>
          <div className="field-label">Saved songs ({saved.length})</div>
          {saved.length === 0 ? (
            <p className="note">Nothing saved yet. Make a song you like and press <b>Save song</b>. Saved songs stay in this browser.</p>
          ) : (
            <ul className="saved">
              {saved.map((x) => (
                <li key={x.name} className={current?.name === x.name ? "now" : ""}>
                  <b>{x.name}</b> <span className="mono">on {ROOTS[x.rootPc]!.name}</span>
                  <span className="grow" />
                  <button type="button" className="btn small" onClick={() => openSong(x)} aria-label={`Play ${x.name}`}>Play</button>
                  <button type="button" className="btn small ghost" onClick={() => deleteSong(x.name)} aria-label={`Delete ${x.name}`}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="note">
          <b>Song</b> invents a new 4-bar tune using only the notes of {label}. It starts and ends on the home note and rests halfway on the 5th
          note or home. Change the maqam, then press <b>Play this song again</b> to hear the same tune with different notes.
        </p>
      </div>

      <div>
        <div className="field-label">Chords (every second note stacked)</div>
        <ol className="chords">
          {exported.chords.map((c, i) => (
            <li key={i}>{c.label} <span className="mono">{c.notes.join(" ")}</span></li>
          ))}
        </ol>
      </div>
      <div className="row">
        <button type="button" className="btn" onClick={exportToAbleton}>Export to Ableton</button>
        {saveMsg && <span className="note" role="status">{saveMsg}</span>}
      </div>
      {!IS_PAGES && callTool && (
        <div className="row">
          <button type="button" className="btn primary" onClick={sendLive} disabled={sending}>Send to Ableton Live</button>
          {liveMsg && <span className="note" role="status">{liveMsg}</span>}
        </div>
      )}
      <p className="note">
        The zip has the chords and the scale as MIDI files plus <b>tuning.scl</b>. In Live, drag the .scl into View &gt; Tuning.
        {!IS_PAGES && callTool && <> <b>Send to Ableton Live</b> builds a new track with a Kanun sound and the two clips in your open Live set; you still add the tuning file yourself.</>}
      </p>
      <p className="note">
        Playing now: <b>{instrument === "oud" ? "oud" : "piano"}</b>. Switch with <b>Instrument</b> under the keys. The
        oud is a synthesised imitation of a lute with paired strings. It is a model: 24 equal steps is a simplification,
        and real players bend these notes by ear.
      </p>
    </div>
  );
}
