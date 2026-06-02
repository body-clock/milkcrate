/**
 * cue_lesson.ts
 *
 * Pure helper for one-time instructional cues (glow, ghost finger, etc.).
 * Owns learned-state persistence with configurable storage backend
 * (localStorage by default; sessionStorage override for per-session cues).
 *
 * Does not import React, viewport hooks, Framer Motion, or DOM layout.
 */

export type CueStorageBackend = "local" | "session";

// ── Storage helpers ──────────────────────────────────────────

function safeGetStorage(backend: CueStorageBackend): Storage | null {
  try {
    const s = backend === "session" ? globalThis.sessionStorage : globalThis.localStorage;
    void s?.length;
    return s ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns true when the cue with the given key has already been
 * dismissed. Returns false conservatively when storage is unavailable.
 */
export function isCueLearned(key: string, backend: CueStorageBackend = "local"): boolean {
  try {
    const storage = safeGetStorage(backend);
    if (!storage) return false;
    return storage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/**
 * Persists the dismissed flag for the given cue key.
 * Silently no-ops when storage is unavailable.
 */
export function markCueLearned(key: string, backend: CueStorageBackend = "local"): void {
  try {
    const storage = safeGetStorage(backend);
    if (!storage) return;
    storage.setItem(key, "1");
  } catch {
    // Storage write failure is non-critical; the cue remains visible
    // for this render but does not crash the surface.
  }
}

/**
 * Clears the dismissed flag for the given cue key.
 * Useful for testing and reset scenarios.
 */
export function clearCueLesson(key: string, backend: CueStorageBackend = "local"): void {
  try {
    const storage = safeGetStorage(backend);
    if (!storage) return;
    storage.removeItem(key);
  } catch {
    // Non-critical.
  }
}
