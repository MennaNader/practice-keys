# CLAUDE.md

## Project

`theory-core` is a music theory engine in TypeScript. The point is twofold: build something I can use in my own music production, and **learn music theory by implementing it**. Treat every feature as a lesson first and a deliverable second.

Long-term this grows into a web app (React + Web Audio + Web MIDI) with MIDI export for Ableton Live 12. Right now it is a pure library with no UI.

## About me

- Frontend developer (TypeScript/React), comfortable with backend and distributed-systems concepts.
- Beginner in music theory. Do not assume I know terminology; define it the first time it appears.
- Gear: Ableton Live 12, Logic Pro, Akai MPK mini 4. Keep this in mind for MIDI-related design.
- Interested in 90s-style Egyptian pop, so non-Western systems (maqam, quarter tones) matter later.

## How to work with me

- **Theory before code.** Before implementing a concept, explain it in a few sentences: what it is, why it works, one concrete example. Then write the code.
- **Explain the "why" in code comments** where the theory is non-obvious (e.g. why C# major needs E#). Each module opens with a `LESSON` block comment; keep that convention.
- **Tests are study notes.** Write tests as executable examples of the rule, with descriptive names (`"F major uses Bb, not A#"`). Prefer a test that teaches over one that merely covers.
- **Don't solve the exercises in the README for me** unless I ask. Hint first.
- Direct, engineer-to-engineer tone. No filler. If my approach has a theory or design flaw, say so.
- When I ask "why", answer with the musical reason, not just the code reason.

## Stack and commands

TypeScript (strict), Vitest, no runtime dependencies. ESM, `moduleResolution: Bundler`.

```bash
npm install
npm test             # vitest run
npm run test:watch
npm run typecheck    # tsc --noEmit
```

Run `npm test` and `npm run typecheck` after every change. Both must be green before you say a task is done.

## Layout

```
src/
  pitch.ts      MIDI, pitch classes, note names, enharmonics, frequency
  interval.ts   semitone distances, names, inversion, consonance
  scale.ts      step patterns, modes as rotations, spelling
  chord.ts, key.ts, rhythm.ts, voice.ts, midi.ts   chords, keys, rhythm, voice leading, live MIDI input
  tuning.ts     24-step tuning, six maqamat, MAQAM_START, maqamTriads, thirdName, scalaFile
  midifile.ts   writes .mid files (vlq, writeMidiFile)
  index.ts      re-exports
test/           one *.test.ts per module
web/            React app ("Practice Keys"); imports the engine from ../src
  src/target.ts   "claude" or "pages" build (VITE_TARGET); Send to Live exists only in "claude"
  src/store.ts    localStorage settings and progress (per browser)
  src/exportMaqam.ts, zip.ts, liveSend.ts   Ableton zip export, tiny zip writer, Send to Live
  test/           app tests (run by the root `npm test`)
DEPLOY.md       how to publish with GitHub Pages
.github/workflows/  ci.yml (tests + both builds), pages.yml (deploy to GitHub Pages)
```

## Conventions

- **Pitch representation:** MIDI numbers for absolute pitch, integers 0-11 for pitch classes. C4 = 60, A4 = 69 (440 Hz).
- **Always use a mathematical `mod`** (`mod(n, 12)`), never raw `%`, because JS `%` goes negative.
- **Spelling matters.** 7-note scales use each letter exactly once. Pitch-class math alone is not enough to name notes; use letter-based spelling.
- **Data over branching.** Scales, chord qualities and interval tables are plain data (step patterns, formulas). Derive modes and variants from them (e.g. rotation) instead of hard-coding each one.
- Pure functions, no classes, no mutation, no global state. The core must stay UI-free and runnable in Node and the browser.
- Errors: throw on invalid input (`Error` / `RangeError`) with the offending value in the message.
- Imports inside `src/` use extensionless relative paths.

## Roadmap

Build in this order; each step teaches one thing and reuses the previous one.

1. **Notes, intervals, scales** (done): pitch, intervals, modes, spelling.
2. **Chords and voicings:** triads and 7ths by stacking thirds from scale degrees, inversions, Roman numeral analysis (I, IV, V, vi).
3. **Progressions and harmonic function:** tonic / subdominant / dominant as a graph or Markov chain.
4. **Rhythm:** time signatures, subdivisions, swing, polyrhythm, with a Web Audio scheduler.
5. **Voice leading and tension:** score smooth movement between chords, suggest better voicings.
6. **Non-Western systems:** maqam and quarter tones (24-TET), which needs a tuning (edo, Rast, Hijaz) abstraction beyond 12-TET (Hijaz, Rast).

Around step 2-3, add the UI: React app with interactive piano/fretboard, chord-progression builder with Web Audio playback, MIDI export, Web MIDI input from the MPK mini, and a quiz mode (play an interval or chord, I identify it).

## Definition of done for a step

- Theory concept explained, with a `LESSON` comment at the top of the module.
- Implementation as pure functions over plain data.
- Tests that read like study notes, including edge cases (enharmonics, octave wrap, invalid input).
- `npm test` and `npm run typecheck` pass.
- README updated: layout table row, 3-5 exercises, "Next" section.

## Don'ts

- Don't add runtime dependencies (Tonal.js etc.) without asking. Writing it myself is the point; Tonal is fine as a reference to cross-check against in tests.
- Don't introduce a UI framework into `src/` core modules. UI code lives in `web/` only.
- Don't generalize ahead of the roadmap. Solve the current step.
