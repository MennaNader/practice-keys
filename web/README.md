# Practice Keys

A React piano that explains the theory behind the notes you play. It imports the engine from `../src`, so anything you add to `theory-core` is available here.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

## What it does

| Tab | Use it to |
|---|---|
| Play | Free play with mouse, touch or computer keyboard, plus a tappable 0 to 11 number line |
| Scales | Pick a home note and scale; see the spelled notes, the step pattern, and hear it |
| Chords | Build major, minor and diminished chords; play the I, IV, V, I "home, away, come back" story |
| Quiz | Find the note, count tiny steps, build a chord, with a detailed answer after each question |

Computer keyboard: the bottom letter row (Z to M) plays the lower octave, the Q row plays the upper one. Keys are mapped by physical position, so QWERTZ and AZERTY layouts work too.

## Files

```
src/App.tsx       tabs, state, wiring
src/Keyboard.tsx  the piano: pointer + computer-keyboard input, highlights
src/audio.ts      small Web Audio synth
src/panels.tsx    Play, Scales and Chords panels
src/Quiz.tsx      quiz logic and explanations
src/theory.ts     thin helpers over ../src (names, spelling, chord info)
```

`npm run artifact` builds a single self-contained HTML file in `dist/`.

## MIDI keyboard (Akai MPK mini and others)

Press **Connect** under the piano and allow MIDI when the browser asks. It works in Chrome and Edge, and only on
`localhost` or `https` (so use `npm run dev`, not a double-clicked file). Keys play, light up, work in the quiz, and
the harder you hit a key the louder it is. The piano shows C4 to C6: use the octave buttons on the page (or on the
keyboard) to move into range.

**Drum pads:** pads on channel 10 play the standard General MIDI notes (36 kick, 38 snare, 42 hi-hat). If your pads send
something else, press **Learn** under a drum and hit the pad you want. The choice is remembered in the browser.
The three on-screen pads work with the mouse or touch too.

## Oud and Maqam
- Instrument switch (Piano/Oud) under the keys. The oud is a synthesised imitation (two detuned sawtooth strings, a filter sweep, a pick click).
- The Maqam tab (Rast and Hijaz) re-tunes the keys for the chosen maqam through `maqamFrequency` (24 steps per octave). The E and B keys (for root C) play a quarter tone lower in that tab only.

## Two builds

| | Claude build | GitHub Pages build |
|---|---|---|
| Command | `npm run build` then `npm run artifact` | `npm run build:pages` |
| Output | one html file (`dist/artifact.html`) | normal files in `dist-pages/` |
| Login | none | none (Pages has no server) |
| Progress | localStorage in the viewer's browser | localStorage in the visitor's browser |
| Send to Ableton Live | yes, in the Claude desktop app only | no (the code is not in the file) |
| Export to Ableton (zip) | yes | yes |

Which one is chosen by `VITE_TARGET` (`.env.pages` sets it for `--mode pages`). See `../DEPLOY.md` to publish it.
