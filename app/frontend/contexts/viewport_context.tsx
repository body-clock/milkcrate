import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ViewportTier = "compact" | "comfy" | "wide";

interface ViewportContextValue {
  tier: ViewportTier;
}

const ViewportContext = createContext<ViewportContextValue | null>(null);

export { ViewportContext };

const COMPACT_MAX = 767;
const COMFY_MAX = 1023;

function tierFromWidth(width: number): ViewportTier {
  if (width <= COMPACT_MAX) {
    return "compact";
  }
  if (width <= COMFY_MAX) {
    return "comfy";
  }
  return "wide";
}

// eslint-disable-next-line eslint/max-lines-per-function
export function ViewportProvider({ children }: { children: ReactNode }) {
  const existingCtx = useContext(ViewportContext);
  if (existingCtx) {
    return <>{children}</>;
  }

  const [tier, setTier] = useState<ViewportTier>(() => {
    if (typeof window === "undefined") {
      return "compact";
    }
    return tierFromWidth(window.innerWidth);
  });

  useEffect(() => {
    const compactQuery = window.matchMedia(`(max-width: ${COMPACT_MAX}px)`);
    const comfyQuery = window.matchMedia(
      `(min-width: ${COMPACT_MAX + 1}px) and (max-width: ${COMFY_MAX}px)`,
    );

    const sync = () => setTier(tierFromWidth(window.innerWidth));

    // Use the modern API; the existing useIsDesktop already uses it.
    compactQuery.addEventListener("change", sync);
    comfyQuery.addEventListener("change", sync);

    // Set the CSS custom property on :root for pure-CSS consumers.
    document.documentElement.style.setProperty("--mc-viewport-tier", `"${tier}"`);

    return () => {
      compactQuery.removeEventListener("change", sync);
      comfyQuery.removeEventListener("change", sync);
    };
    // Only run on mount — tier is the initial value; the listener handles updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the CSS custom property in sync whenever tier changes.
  useEffect(() => {
    document.documentElement.style.setProperty("--mc-viewport-tier", `"${tier}"`);
  }, [tier]);

  const value = useMemo(() => ({ tier }), [tier]);

  return <ViewportContext.Provider value={value}>{children}</ViewportContext.Provider>;
}

export function useViewportContext(): ViewportContextValue {
  const ctx = useContext(ViewportContext);
  if (!ctx) {
    throw new Error("useViewportContext must be used within a ViewportProvider");
  }
  return ctx;
}
