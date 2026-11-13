/**
 * Small settings and progress store on top of localStorage.
 *
 * Everything is saved in this browser on this device, under keys like `practice-keys:volume`. Nothing is sent to a
 * server, so clearing the browser's site data clears your progress, and another device starts from zero.
 */

let storage: Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length"> | null | undefined;

/** Which Storage to use. Tests pass a fake one; in the browser it is localStorage (which can throw or be missing). */
export function useStorage(s: typeof storage): void {
  storage = s;
}

function store() {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const fullKey = (key: string): string => `practice-keys:${key}`;

export function load<T>(key: string, fallback: T, valid: (v: unknown) => boolean): T {
  try {
    const raw = store()?.getItem(fullKey(key));
    if (raw === null || raw === undefined) return fallback;
    const value: unknown = JSON.parse(raw);
    return valid(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    store()?.setItem(fullKey(key), JSON.stringify(value));
  } catch {
    /* storage full or blocked: progress just won't be kept */
  }
}

/** Forget everything this app saved in this browser. */
export function clearProgress(): void {
  try {
    const s = store();
    if (!s) return;
    const prefix = fullKey("");
    const doomed: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(prefix)) doomed.push(k);
    }
    doomed.forEach((k) => s.removeItem(k));
  } catch {
    /* ignore */
  }
}

export interface QuizScore {
  right: number;
  total: number;
  streak: number;
  best: number;
}

export const EMPTY_SCORE: QuizScore = { right: 0, total: 0, streak: 0, best: 0 };

export const isScore = (v: unknown): v is QuizScore => {
  const o = v as Partial<QuizScore> | null;
  return !!o && [o.right, o.total, o.streak, o.best].every((n) => Number.isInteger(n) && (n as number) >= 0) && (o.right as number) <= (o.total as number);
};

/** The score after one more answer. */
export function addAnswer(s: QuizScore, correct: boolean): QuizScore {
  const streak = correct ? s.streak + 1 : 0;
  return { right: s.right + (correct ? 1 : 0), total: s.total + 1, streak, best: Math.max(s.best, streak) };
}
