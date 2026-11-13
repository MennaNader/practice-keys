# theory-core

A music theory engine in TypeScript, plus a React app built on it ("Practice Keys"). The project exists to learn music theory by implementing it, and to have something useful for music production in Ableton Live.

## Current state

The project has two parts.

**The engine (`src/`)** is a plain TypeScript library: pure functions, no runtime dependencies, no UI. It covers:

- **Notes and intervals:** MIDI numbers, pitch classes, note names and enharmonics (C# vs Db), frequencies, interval names.
- **Scales and modes:** step patterns, modes as rotations, correct spelling (each letter once).
- **Chords and keys:** major, minor and diminished chords, the 7 chords in a key, Roman numerals, home/away/push functions.
- **Rhythm and voice leading:** beats and tempo, drum patterns, smoothest moves between chords.
- **MIDI:** reading messages from a MIDI keyboard (such as the MPK mini) and writing `.mid` files.
- **Maqam:** a 24-step tuning (quarter tones) and six maqamat: Rast, Hijaz, Bayati, Sika, Nahawand, Saba. Chords in a maqam and Scala tuning files are included too.
- **Maqam tunes:** seeded random tunes from a maqam's notes. The same seed always gives the same tune.

Each source file opens with a `LESSON` comment that explains the theory, and the tests in `test/` are written as study notes.

**The app (`web/`)** is a playable piano that explains what you play. It has five tabs:

| Tab | What it does |
|---|---|
| Play | Free play with mouse, touch, computer keyboard or a MIDI keyboard |
| Scales | Pick a home note and scale, see the spelled notes and hear them |
| Chords | Build chords and play progressions, with a song maker |
| Maqam | Re-tunes the keys for a maqam, makes and saves random tunes (Rast-1, ...) and exports them to Ableton |
| Quiz | Find a note, count semitones, or build a chord, with an explanation after every answer |

The quiz keeps your score and best streak in the browser. The app also has an oud sound, drum pads and MIDI keyboard input. It can be published with GitHub Pages ([DEPLOY.md](DEPLOY.md)). More app details are in [web/README.md](web/README.md).

## Run it

```bash
npm install
npm test            # engine and app tests
npm run typecheck

cd web && npm install && npm run dev   # the app, at http://localhost:5173
```
