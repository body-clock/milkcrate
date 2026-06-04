import { useViewportContext } from "@/contexts/viewport_context";
import type { ViewportTier } from "@/contexts/viewport_context";

interface UseViewportResult {
  tier: ViewportTier;
  isCompact: boolean;
  isComfy: boolean;
  isWide: boolean;
}

export function useViewport(): UseViewportResult {
  const { tier } = useViewportContext();
  return {
    tier,
    isCompact: tier === "compact",
    isComfy: tier === "comfy",
    isWide: tier === "wide",
  };
}
