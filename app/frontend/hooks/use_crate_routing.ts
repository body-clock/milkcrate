import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  backToStore: () => void;
  allCrates: Crate[];
  /** True when the current activeSlug came from an initial ?crate= URL query or popstate with a crate slug. */
  directEntry: boolean;
}

function historyStateWithCrate(slug: string, startIndex: number) {
  return { ...history.state, crateSlug: slug, startIndex };
}

function historyStateWithoutCrate() {
  const { crateSlug: _crateSlug, startIndex: _startIndex, ...rest } = history.state ?? {};
  return rest;
}

function storeFloorUrl() {
  return `${window.location.pathname}${window.location.hash}`;
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
    if (fromParam) {return fromParam;}

    const raw = history.state?.crateSlug;
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  });

  const [startIndex, setStartIndex] = useState(() => {
    const raw = history.state?.startIndex;
    return Number.isFinite(raw) && (raw as number) >= 0 ? (raw as number) : 0;
  });

  // True when activeSlug came from URL query or popstate (direct entry), not in-session selection
  const [directEntry, setDirectEntry] = useState(() => {
    if (typeof window === "undefined") {return false;}
    const fromParam = new URLSearchParams(window.location.search).get("crate");
    return Boolean(fromParam);
  });

  const activeSlugRef = useRef(activeSlug);

  const allCrates = useMemo(() => {
    if (crates.length > 0) {return crates;}
    if (!storefront_sections?.length) {return [];}
    return storefront_sections.flatMap((s) => ("crate" in s ? [s.crate] : s.crates));
  }, [crates, storefront_sections]);

  const activeCrate =
    activeSlug === null
      ? null
      : (allCrates.find((crate) => crate.slug === activeSlug) ?? allCrates[0]);

  const selectCrate = useCallback((slug: string, index = 0) => {
    const wasOnStoreFloor = activeSlugRef.current === null;
    activeSlugRef.current = slug;
    setStartIndex(index);
    setActiveSlug(slug);

    const nextState = historyStateWithCrate(slug, index);
    if (wasOnStoreFloor) {
      history.pushState(nextState, "");
      return;
    }

    history.replaceState(nextState, "");
  }, []);

  const backToStore = useCallback(() => {
    activeSlugRef.current = null;
    setActiveSlug(null);
    setStartIndex(0);
    setDirectEntry(false);
    history.replaceState(historyStateWithoutCrate(), "", storeFloorUrl());
  }, []);

  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      const slug = e.state?.crateSlug ?? null;
      activeSlugRef.current = slug;
      setActiveSlug(slug);
      setStartIndex(e.state?.startIndex ?? 0);
      // Only set directEntry when the URL itself carries a crate param
      const urlParam = new URLSearchParams(window.location.search).get("crate");
      setDirectEntry(Boolean(urlParam));
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  return { activeSlug, activeCrate, startIndex, selectCrate, backToStore, allCrates, directEntry };
}
