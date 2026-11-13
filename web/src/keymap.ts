/**
 * Computer-keyboard piano layout (the classic tracker layout), by PHYSICAL key position.
 * Using KeyboardEvent.code means it works the same on QWERTY, QWERTZ and AZERTY.
 *
 *   lower row  Z S X D C V G B H N J M , L . ; /     = semitones 0..16 from the first C
 *   upper row  Q 2 W 3 E R 5 T 6 Y 7 U I 9 O 0 P     = semitones 12..28
 *
 * Letters in the upper row sit on top of the lower row's white keys, like black keys do.
 */

const LOWER = [
  "KeyZ", "KeyS", "KeyX", "KeyD", "KeyC", "KeyV", "KeyG", "KeyB", "KeyH", "KeyN", "KeyJ", "KeyM",
  "Comma", "KeyL", "Period", "Semicolon", "Slash",
];
const UPPER = [
  "KeyQ", "Digit2", "KeyW", "Digit3", "KeyE", "KeyR", "Digit5", "KeyT", "Digit6", "KeyY", "Digit7", "KeyU",
  "KeyI", "Digit9", "KeyO", "Digit0", "KeyP",
];

export const CODE_TO_OFFSET = new Map<string, number>();
LOWER.forEach((code, i) => CODE_TO_OFFSET.set(code, i));
UPPER.forEach((code, i) => CODE_TO_OFFSET.set(code, 12 + i));

/** Which physical key to advertise on a piano key: lower row for the first octave, upper row after. */
export function codeForOffset(offset: number): string | undefined {
  if (offset < 12) return LOWER[offset];
  return UPPER[offset - 12];
}

const US_LABEL: Record<string, string> = {
  Comma: ",", Period: ".", Semicolon: ";", Slash: "/",
};

export function defaultLabel(code: string): string {
  if (code in US_LABEL) return US_LABEL[code] as string;
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}
