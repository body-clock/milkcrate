/**
 * Preload an image URL at the given priority level.
 *
 * - "high": creates an Image immediately (current microtask).
 * - "low": defers via requestIdleCallback (or setTimeout fallback).
 *   Respects an optional AbortSignal to cancel deferred loads.
 *
 * Pure DOM utility — no React, no Framer Motion imports.
 */
function scheduleLowPriority(url: string, signal?: AbortSignal) {
  const schedule =
    typeof requestIdleCallback === "function"
      ? requestIdleCallback
      : (cb: IdleRequestCallback) => setTimeout(cb, 0);
  const deferred = () => {
    if (signal?.aborted) {
      return;
    }
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  };
  schedule(deferred, { timeout: 2000 });
}

export function preloadImage(url: string, priority: "high" | "low" = "high", signal?: AbortSignal) {
  if (priority === "high") {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  } else {
    scheduleLowPriority(url, signal);
  }
}
