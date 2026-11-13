# theory-core

A music theory engine in TypeScript, built to learn the theory by implementing it. No runtime dependencies, no UI. The tests double as study notes.

## Run it

```bash
npm install
npm test            # run once
npm run test:watch  # re-run on save
npm run typecheck
```

## Layout

| File | What it teaches |
|---|---|
| `src/pitch.ts` | MIDI numbers, pitch classes, 12-TET, note names, enharmonics, frequency |
| `src/interval.ts` | Semitone distances, interval names, inversion, consonance |
| `src/scale.ts` | Step patterns, modes as rotations, proper note spelling, pentatonic/blues/symmetric scales |
| `test/*.test.ts` | Executable examples of each rule |

Each source file opens with a "LESSON" comment. Read it, then read the matching test file, then change something and see what breaks.

## Exercises

1. Add `minorSeventh`-style names for diminished/augmented intervals. Why can't semitones alone distinguish A4 from d5?
2. Add `relativeMinor(root)` and `parallelMinor(root)`. Test them.
3. Write `scaleDegree(note, root, scale)`: which degree (1-7) is this note, or `null` if it's outside the scale?
4. Add the remaining modes of harmonic minor (Phrygian dominant is the interesting one).
5. Add `Hijaz` as a step pattern. It won't fit in 12 semitones cleanly. That is where lesson 6 (quarter tones) starts.

## Next: step 2

Chords and voicings: build triads and 7ths by stacking thirds from scale degrees, then Roman numeral analysis. It will reuse `scaleNotes` and `scalePitchClasses` directly.
