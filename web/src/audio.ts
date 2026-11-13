import { midiToFrequency } from "../../src";

/**
 * A tiny polyphonic synth on the Web Audio API.
 * Each note = a triangle wave plus a quiet octave-up sine, run through a low-pass filter.
 * The gain envelope decays by itself (like a piano string) and fades fast on release.
 */

type Voice = { gain: GainNode; oscs: OscillatorNode[] };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.7;
const voices = new Map<number, Voice>();

/** Create or resume the audio context. Call it from inside a click or key handler. */
export function unlockAudio(): AudioContext {
  if (!ctx) {
    const AC: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const compressor = ctx.createDynamicsCompressor();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(compressor);
    compressor.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setVolume(v: number): void {
  volume = v;
  if (ctx && master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
}

export type Instrument = "piano" | "oud";

let instrument: Instrument = "piano";
/** When set, decides the frequency of every key (used to play a maqam on the keys). */
let tuning: ((midi: number) => number) | null = null;

export function setInstrument(i: Instrument): void {
  instrument = i;
}

export function setTuning(fn: ((midi: number) => number) | null): void {
  tuning = fn;
}

/** Piano-ish voice: a triangle wave plus a quiet octave-up sine, low-passed, decaying like a string. */
function pianoVoice(c: AudioContext, t: number, freq: number, velocity: number): Voice {
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.55 * (0.25 + 0.75 * velocity), t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0008, t + 3.4);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = Math.min(9000, freq * 7);

  const fundamental = c.createOscillator();
  fundamental.type = "triangle";
  fundamental.frequency.value = freq;

  const shimmer = c.createOscillator();
  shimmer.type = "sine";
  shimmer.frequency.value = freq * 2;
  const shimmerGain = c.createGain();
  shimmerGain.gain.value = 0.28;

  fundamental.connect(filter);
  shimmer.connect(shimmerGain);
  shimmerGain.connect(filter);
  filter.connect(gain);
  gain.connect(master as GainNode);

  fundamental.start(t);
  shimmer.start(t);
  fundamental.stop(t + 3.5);
  shimmer.stop(t + 3.5);
  return { gain, oscs: [fundamental, shimmer] };
}

/**
 * Oud-ish voice (a synthesised imitation, not a recording). An oud is a short-necked lute played with a
 * plectrum, with its strings in pairs ("courses") that are tuned almost the same. So:
 *  - two slightly detuned sawtooth strings per note (the double course),
 *  - a low-pass filter that starts bright and darkens fast (the pick, then the wooden body),
 *  - a quick drop in loudness after the pluck, then a longer fade,
 *  - a tiny burst of noise for the sound of the plectrum.
 */
function oudVoice(c: AudioContext, t: number, freq: number, velocity: number): Voice {
  const peak = 0.5 * (0.3 + 0.7 * velocity);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(peak * 0.38, t + 0.16);
  gain.gain.exponentialRampToValueAtTime(0.0008, t + 2.3);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(Math.min(9000, freq * 14), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(700, freq * 3), t + 0.3);

  const oscs: OscillatorNode[] = [];
  for (const cents of [-5, 5]) {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.detune.value = cents;
    // the plectrum pulls the string a touch sharp for a few milliseconds
    o.frequency.setValueAtTime(freq * 1.012, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.04);
    o.connect(filter);
    o.start(t);
    o.stop(t + 2.4);
    oscs.push(o);
  }
  const body = c.createOscillator();
  const bodyGain = c.createGain();
  body.type = "triangle";
  body.frequency.value = freq;
  bodyGain.gain.value = 0.45;
  body.connect(bodyGain);
  bodyGain.connect(filter);
  body.start(t);
  body.stop(t + 2.4);
  oscs.push(body);

  filter.connect(gain);
  gain.connect(master as GainNode);

  const pick = c.createBufferSource();
  pick.buffer = noiseBuffer(c);
  const pickFilter = c.createBiquadFilter();
  pickFilter.type = "bandpass";
  pickFilter.frequency.value = 3200;
  const pickGain = c.createGain();
  pickGain.gain.setValueAtTime(0.35 * peak, t);
  pickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  pick.connect(pickFilter);
  pickFilter.connect(pickGain);
  pickGain.connect(master as GainNode);
  pick.start(t);
  pick.stop(t + 0.04);

  return { gain, oscs };
}

/**
 * Start a note. velocity 0..1 is how hard the key was hit (1 for mouse and computer keyboard).
 * `plain` ignores any maqam tuning and plays the normal piano pitch.
 */
export function noteOn(midi: number, velocity = 1, plain = false): void {
  const c = unlockAudio();
  if (voices.has(midi)) noteOff(midi);

  const t = c.currentTime;
  const freq = !plain && tuning ? tuning(midi) : midiToFrequency(midi);
  const v = Math.min(1, Math.max(0, velocity));
  const voice = instrument === "oud" ? oudVoice(c, t, freq, v) : pianoVoice(c, t, freq, v);

  voice.oscs[0]!.onended = () => {
    voice.gain.disconnect();
    if (voices.get(midi) === voice) voices.delete(midi);
  };
  voices.set(midi, voice);
}

export function noteOff(midi: number): void {
  const voice = voices.get(midi);
  if (!voice || !ctx) return;
  voices.delete(midi);
  const t = ctx.currentTime;
  const g = voice.gain.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(Math.max(g.value, 0.0008), t);
  g.exponentialRampToValueAtTime(0.0008, t + 0.28);
  for (const o of voice.oscs) {
    try {
      o.stop(t + 0.32);
    } catch {
      /* already stopped */
    }
  }
}

export function releaseAll(): void {
  for (const midi of [...voices.keys()]) noteOff(midi);
}

/* ---------- Drums ---------- */

export type DrumKind = "kick" | "snare" | "hat";

let noise: AudioBuffer | null = null;
const drumNodes = new Set<AudioScheduledSourceNode>();

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function track(node: AudioScheduledSourceNode): void {
  drumNodes.add(node);
  node.onended = () => drumNodes.delete(node);
}

/**
 * One drum hit, started `delaySec` seconds from now. Scheduled on the audio clock,
 * so the beat stays steady even if the page is busy.
 * Kick = a sine that drops in pitch. Snare = noise plus a short tone. Hat = very short bright noise.
 */
export function drumHit(kind: DrumKind, delaySec: number, velocity = 1): void {
  const c = unlockAudio();
  const level = 0.3 + 0.7 * Math.min(1, Math.max(0, velocity));
  const t = c.currentTime + Math.max(0, delaySec);
  const out = master as GainNode;

  if (kind === "kick") {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.95 * level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 0.36);
    track(osc);
    return;
  }

  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const filter = c.createBiquadFilter();
  const g = c.createGain();
  let stopAt: number;

  if (kind === "snare") {
    filter.type = "bandpass";
    filter.frequency.value = 1900;
    g.gain.setValueAtTime(0.55 * level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    const body = c.createOscillator();
    const bodyGain = c.createGain();
    body.type = "triangle";
    body.frequency.setValueAtTime(190, t);
    bodyGain.gain.setValueAtTime(0.35 * level, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    body.connect(bodyGain);
    bodyGain.connect(out);
    body.start(t);
    body.stop(t + 0.13);
    track(body);
    stopAt = t + 0.21;
  } else {
    filter.type = "highpass";
    filter.frequency.value = 7000;
    g.gain.setValueAtTime(0.22 * level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    stopAt = t + 0.06;
  }

  src.connect(filter);
  filter.connect(g);
  g.connect(out);
  src.start(t);
  src.stop(stopAt);
  track(src);
}

/** Silence every drum hit that has not played yet. */
export function stopDrums(): void {
  for (const node of drumNodes) {
    try {
      node.stop();
    } catch {
      /* already stopped */
    }
  }
  drumNodes.clear();
}
