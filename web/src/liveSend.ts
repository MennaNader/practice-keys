import type { MaqamClips } from "./exportMaqam";

/**
 * "Send to Live" (Claude build only): build the maqam in the viewer's open Ableton Live set through the
 * AbletonMCP server on their own computer. It adds ONE new MIDI track with a Kanun sound and two clips (chords,
 * scale). It never touches existing tracks or the tempo, and it cannot load the tuning file.
 */
export const LIVE_SERVER = "host:AbletonMCP";

export const LIVE_TOOLS = [
  "get_session_info", "create_midi_track", "set_track_name", "get_browser_items_at_path",
  "load_instrument_or_effect", "create_clip", "add_notes_to_clip", "set_clip_name",
] as const;

export type CallTool = (server: string, tool: string, input?: unknown) => Promise<{ payload?: unknown; content?: unknown }>;

/** Replies come as {result: "<json text>"} or plain text, sometimes with a note after "---". Take only the JSON. */
export function parseLiveReply(reply: { payload?: unknown; content?: unknown }): unknown {
  let value: unknown = reply.payload;
  if (value && typeof value === "object" && "result" in value) value = (value as { result: unknown }).result;
  if (typeof value !== "string") return value;
  const body = value.split("\n\n---")[0] ?? "";
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

const INSTRUMENT_FOLDER = "sounds/Guitar & Plucked";
const INSTRUMENT_NAME = "Kanun.adg";

const liveNote = (n: { midi: number; startBeat: number; beats: number }) => ({
  pitch: n.midi, start_time: n.startBeat, duration: n.beats, velocity: 90, mute: false,
});

export interface SendResult {
  ok: boolean;
  message: string;
}

export function explainLiveError(e: unknown, doing: string): string {
  const code = (e as { code?: string } | null)?.code;
  const text = (e as { message?: string } | null)?.message ?? "";
  switch (code) {
    case "server_not_connected":
    case "capability_disabled":
    case "not_granted":
      return "I could not reach Ableton. Open this page in the Claude desktop app, with Live running and the AbletonMCP connection on.";
    case "not_in_manifest":
    case "approval_required":
    case "cancelled":
      return "Sending needs your permission. Press the button again and choose Allow.";
    default:
      return `Stopped while ${doing}${text ? `: ${text.slice(0, 160)}` : "."}`;
  }
}

export async function sendToLive(callTool: CallTool, clips: MaqamClips, where: string): Promise<SendResult> {
  let doing = "reading the Live set";
  try {
    const info = parseLiveReply(await callTool(LIVE_SERVER, "get_session_info", {})) as { track_count?: number } | string;
    const count = typeof info === "object" && info !== null ? info.track_count : undefined;
    if (!Number.isInteger(count)) return { ok: false, message: "Live answered, but I could not read the number of tracks, so I did not change anything." };
    const track = count as number; // the new track goes at the end, so its index is the current count

    doing = "adding the track";
    await callTool(LIVE_SERVER, "create_midi_track", { index: -1 });
    await callTool(LIVE_SERVER, "set_track_name", { track_index: track, name: `${clips.label} on ${clips.names[0]} (Kanun)` });

    doing = "loading the sound";
    let uri: string | undefined;
    try {
      const folder = parseLiveReply(await callTool(LIVE_SERVER, "get_browser_items_at_path", { path: INSTRUMENT_FOLDER })) as { items?: { name: string; uri: string }[] } | string;
      uri = typeof folder === "object" && folder !== null ? folder.items?.find((i) => i.name === INSTRUMENT_NAME)?.uri : undefined;
    } catch {
      uri = undefined; // a missing folder only means no sound; the clips are still worth adding
    }
    if (uri) await callTool(LIVE_SERVER, "load_instrument_or_effect", { track_index: track, uri });

    doing = "adding the chords";
    await callTool(LIVE_SERVER, "create_clip", { track_index: track, clip_index: 0, length: 28 });
    await callTool(LIVE_SERVER, "add_notes_to_clip", { track_index: track, clip_index: 0, notes: clips.chordNotes.map(liveNote) });
    await callTool(LIVE_SERVER, "set_clip_name", { track_index: track, clip_index: 0, name: `${clips.label} chords (${clips.names[0]})` });

    doing = "adding the scale";
    await callTool(LIVE_SERVER, "create_clip", { track_index: track, clip_index: 1, length: 8 });
    await callTool(LIVE_SERVER, "add_notes_to_clip", { track_index: track, clip_index: 1, notes: clips.scaleNotes.map(liveNote) });
    await callTool(LIVE_SERVER, "set_clip_name", { track_index: track, clip_index: 1, name: `${clips.label} scale (${clips.names[0]})` });

    return { ok: true, message: `Added track ${track + 1} to Live with the chords and the scale${uri ? "" : ", but I could not find the Kanun sound, so pick an instrument"}. ${where}` };
  } catch (e) {
    return { ok: false, message: explainLiveError(e, doing) };
  }
}
