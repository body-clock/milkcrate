import { useState, useEffect, useMemo, useCallback } from "react";
import type { Crate, StorefrontSection } from "@/types/inertia";

interface UseCrateRoutingOptions {
  crates: Crate[];
  storefront_sections: StorefrontSection[];
}

interface UseCrateRoutingResult {
  activeSlug: string | null;
  activeCrate: Crate | null;
  startIndex: number;
  selectCrate: (slug: string, index?: number) => void;
  allCrates: Crate[];
}

export function useCrateRouting({
  crates,
  storefront_sections,
}: UseCrateRoutingOptions): UseCrateRoutingResult {
  const [activeSlug, setActiveSlug] = useState<string | null>(() => {
    const fromParam =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("crate")
        : null;
    if (fromParam) return fromParam;

    const raw = history.state?.crateSlug;
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  });

  const [startIndex, setStartIndex] = useState(() => {
    const raw = history.state?.startIndex;
    return Number.isFinite(raw) && (raw as number) >= 0 ? (raw as number) : 0;
  });

  const allCrates = useMemo(() => {
    if (crates.length > 0) return crates;
    if (!storefront_sections?.length) return [];
    return storefront_sections.flatMap((s) => ("crate" in s ? [s.crate] : s.crates));
  }, [crates, storefront_sections]);

  const activeCrate =
    activeSlug === null
      ? null
      : (allCrates.find((crate) => crate.slug === activeSlug) ?? allCrates[0]);

  const selectCrate = useCallback(
    (slug: string, index = 0) => {
      setStartIndex(index);
      setActiveSlug(slug);
      if (activeSlug === null) {
        history.pushState({ crateSlug: slug, startIndex: index }, "");
      } else {
        history.replaceState({ crateSlug: slug, startIndex: index }, "");
      }
    },
    [activeSlug],
  );

  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      const slug = e.state?.crateSlug ?? null;
      setActiveSlug(slug);
      setStartIndex(e.state?.startIndex ?? 0);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  return { activeSlug, activeCrate, startIndex, selectCrate, allCrates };
}
