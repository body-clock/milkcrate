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

function getInitialTier(): ViewportTier {
  if (typeof window === "undefined") {
    return "compact";
  }
  return tierFromWidth(window.innerWidth);
}

function useViewportListeners(
  setTier: React.Dispatch<React.SetStateAction<ViewportTier>>,
): void {
  useEffect(() => {
    const compactQuery = window.matchMedia(`(max-width: ${COMPACT_MAX}px)`);
    const comfyQuery = window.matchMedia(
      `(min-width: ${COMPACT_MAX + 1}px) and (max-width: ${COMFY_MAX}px)`,
    );

    const sync = () => setTier(tierFromWidth(window.innerWidth));

    compactQuery.addEventListener("change", sync);
    comfyQuery.addEventListener("change", sync);

    return () => {
      compactQuery.removeEventListener("change", sync);
      comfyQuery.removeEventListener("change", sync);
    };
  }, [setTier]);
}

function useSyncCssVar(tier: ViewportTier): void {
  useEffect(() => {
    document.documentElement.style.setProperty("--mc-viewport-tier", `"${tier}"`);
  }, [tier]);
}

export function ViewportProvider({ children }: { children: ReactNode }) {
  const existingCtx = useContext(ViewportContext);
  if (existingCtx) {
    return <>{children}</>;
  }

  const [tier, setTier] = useState<ViewportTier>(getInitialTier);
  useViewportListeners(setTier);
  useSyncCssVar(tier);

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
