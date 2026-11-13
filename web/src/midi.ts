import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { gmDrum, parseMidiMessage, type MidiNoteEvent } from "../../src";
import { drumHit, type DrumKind } from "./audio";

type Listener = (e: MidiNoteEvent) => void;
const listeners = new Set<Listener>();

/** Get every piano-key note a MIDI keyboard sends (drum pads are handled separately). */
export function subscribeMidi(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* ---------- Drum pads ---------- */

type PadMap = Record<DrumKind, number | null>;
interface PadState {
  /** Note numbers the person taught the app (Learn). null = use the General MIDI default. */
  map: PadMap;
  learning: DrumKind | null;
}

const PAD_KEY = "practice-keys:pads";
const EMPTY_MAP: PadMap = { kick: null, snare: null, hat: null };

function loadMap(): PadMap {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PAD_KEY) ?? "null");
    if (raw && typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      const pick = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 127 ? v : null);
      return { kick: pick(r.kick), snare: pick(r.snare), hat: pick(r.hat) };
    }
  } catch {
    /* storage unavailable or broken */
  }
  return { ...EMPTY_MAP };
}

let pad: PadState = { map: loadMap(), learning: null };
const padListeners = new Set<() => void>();

function setPad(next: PadState): void {
  pad = next;
  try {
    localStorage.setItem(PAD_KEY, JSON.stringify(next.map));
  } catch {
    /* storage unavailable */
  }
  padListeners.forEach((l) => l());
}

type DrumListener = (kind: DrumKind, velocity: number) => void;
const drumListeners = new Set<DrumListener>();

/** Called whenever a drum sounds, from a pad or from the screen. Used to flash the on-screen pad. */
export function subscribeDrums(listener: DrumListener): () => void {
  drumListeners.add(listener);
  return () => {
    drumListeners.delete(listener);
  };
}

/** Play a drum right now (velocity 0 to 1). */
export function hitDrum(kind: DrumKind, velocity = 1): void {
  drumHit(kind, 0, velocity);
  drumListeners.forEach((l) => l(kind, velocity));
}

/** Which drum a note plays: a learned pad first, then the General MIDI default on channel 10. */
function drumFor(e: MidiNoteEvent): DrumKind | null {
  for (const kind of ["kick", "snare", "hat"] as const) {
    if (pad.map[kind] === e.note) return kind;
  }
  return e.channel === 10 ? gmDrum(e.note) : null;
}

function dispatch(e: MidiNoteEvent): void {
  if (pad.learning && e.type === "on") {
    const kind = pad.learning;
    // A note can only belong to one drum, so take it away from the others.
    const map: PadMap = { ...pad.map, kick: pad.map.kick === e.note ? null : pad.map.kick, snare: pad.map.snare === e.note ? null : pad.map.snare, hat: pad.map.hat === e.note ? null : pad.map.hat };
    map[kind] = e.note;
    setPad({ map, learning: null });
    hitDrum(kind, e.velocity);
    return;
  }
  const kind = drumFor(e);
  if (kind) {
    if (e.type === "on") hitDrum(kind, e.velocity);
    return;
  }
  if (e.channel === 10) return; // a pad we have no sound for: do not play it as a piano key
  listeners.forEach((l) => l(e));
}

export function usePads() {
  const state = useSyncExternalStore(
    (cb) => {
      padListeners.add(cb);
      return () => {
        padListeners.delete(cb);
      };
    },
    () => pad,
  );
  return {
    map: state.map,
    learning: state.learning,
    toggleLearn: (kind: DrumKind) => setPad({ map: pad.map, learning: pad.learning === kind ? null : kind }),
    reset: () => setPad({ map: { ...EMPTY_MAP }, learning: null }),
  };
}

export type MidiStatus = "idle" | "connecting" | "ready" | "unsupported" | "blocked";

/** Listen to every connected input and return their names. */
function bindInputs(access: MIDIAccess): string[] {
  const names: string[] = [];
  access.inputs.forEach((input) => {
    if (input.state === "connected") {
      names.push(input.name ?? "MIDI input");
      input.onmidimessage = (msg) => {
        if (!msg.data) return;
        const event = parseMidiMessage(msg.data);
        if (event) dispatch(event);
      };
    } else {
      input.onmidimessage = null;
    }
  });
  return names;
}

export function useMidi() {
  const [status, setStatus] = useState<MidiStatus>(() =>
    typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function" ? "idle" : "unsupported",
  );
  const [inputs, setInputs] = useState<string[]>([]);

  const connect = useCallback(async () => {
    if (typeof navigator.requestMIDIAccess !== "function") {
      setStatus("unsupported");
      return;
    }
    setStatus("connecting");
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      setInputs(bindInputs(access));
      // Plugging a keyboard in or out later updates the list by itself.
      access.onstatechange = () => setInputs(bindInputs(access));
      setStatus("ready");
    } catch {
      setStatus("blocked");
    }
  }, []);

  // If the person already allowed MIDI on an earlier visit, connect without asking again.
  useEffect(() => {
    if (status !== "idle") return;
    try {
      navigator.permissions
        ?.query({ name: "midi" as PermissionName })
        .then((p) => {
          if (p.state === "granted") void connect();
        })
        .catch(() => undefined);
    } catch {
      /* permission query not available */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, inputs, connect };
}
