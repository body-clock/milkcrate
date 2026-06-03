import { useState, useEffect, useRef, useCallback } from "react";

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
  directEntry: boolean;
}

interface PopStateCtx {
  slugRef: React.MutableRefObject<string | null>;
  setSlug: (s: string | null) => void;
  setIdx: (n: number) => void;
  setDirect: (b: boolean) => void;
}

function allCratesFrom(
  crates: Crate[],
  storefront_sections: StorefrontSection[] | undefined,
): Crate[] {
  if (crates.length > 0) {
    return crates;
  }
  if (!storefront_sections?.length) {
    return [];
  }
  return storefront_sections.flatMap((s) => ("crate" in s ? [s.crate] : s.crates));
}

function initialActiveSlug(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const fromParam = new URLSearchParams(window.location.search).get("crate");
  if (fromParam) {
    return fromParam;
  }
  const raw = history.state?.crateSlug;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function initialStartIndex(): number {
  const raw = history.state?.startIndex;
  return Number.isFinite(raw) && (raw as number) >= 0 ? (raw as number) : 0;
}

function initialDirectEntry(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return Boolean(new URLSearchParams(window.location.search).get("crate"));
}

function historyStateWithCrate(slug: string, startIndex: number) {
  return { ...history.state, crateSlug: slug, startIndex };
}

function historyStateWithoutCrate() {
  const { crateSlug: _c, startIndex: _i, ...rest } = history.state ?? {};
  return rest;
}

function storeFloorUrl() {
  return `${window.location.pathname}${window.location.hash}`;
}

function findActiveCrate(
  allCrates: Crate[],
  activeSlug: string | null,
): Crate | null {
  if (activeSlug === null) return null;
  return allCrates.find((c) => c.slug === activeSlug) ?? allCrates[0] ?? null;
}

function handlePopState(e: PopStateEvent, ctx: PopStateCtx) {
  const { slugRef, setSlug, setIdx, setDirect } = ctx;
  const slug = e.state?.crateSlug ?? null;
  slugRef.current = slug;
  setSlug(slug);
  setIdx(e.state?.startIndex ?? 0);
  setDirect(Boolean(new URLSearchParams(window.location.search).get("crate")));
}

function usePopHandler(ctx: PopStateCtx) {
  const latest = useRef(ctx);
  latest.current = ctx;
  useEffect(() => {
    const handler = (e: PopStateEvent) => handlePopState(e, latest.current);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
}

function useSelectCrate(
  slugRef: React.MutableRefObject<string | null>,
  setStartIndex: React.Dispatch<React.SetStateAction<number>>,
  setActiveSlug: React.Dispatch<React.SetStateAction<string | null>>,
) {
  return useCallback(
    (slug: string, index = 0) => {
      const wasFloor = slugRef.current === null;
      slugRef.current = slug;
      setStartIndex(index);
      setActiveSlug(slug);
      const ns = historyStateWithCrate(slug, index);
      if (wasFloor) {
        history.pushState(ns, "");
      } else {
        history.replaceState(ns, "");
      }
    },
    [],
  );
}

function useBackToStore(
  slugRef: React.MutableRefObject<string | null>,
  setActiveSlug: React.Dispatch<React.SetStateAction<string | null>>,
  setStartIndex: React.Dispatch<React.SetStateAction<number>>,
  setDirectEntry: React.Dispatch<React.SetStateAction<boolean>>,
) {
  return useCallback(() => {
    slugRef.current = null;
    setActiveSlug(null);
    setStartIndex(0);
    setDirectEntry(false);
    history.replaceState(historyStateWithoutCrate(), "", storeFloorUrl());
  }, []);
}

function useCrateRoutingState() {
  const [activeSlug, setActiveSlug] = useState<string | null>(initialActiveSlug);
  const [startIndex, setStartIndex] = useState(initialStartIndex);
  const [directEntry, setDirectEntry] = useState(initialDirectEntry);
  const slugRef = useRef(activeSlug);
  return {
    activeSlug, setActiveSlug,
    startIndex, setStartIndex,
    directEntry, setDirectEntry,
    slugRef,
  };
}

export function useCrateRouting(
  { crates, storefront_sections }: UseCrateRoutingOptions,
): UseCrateRoutingResult {
  const { activeSlug, setActiveSlug, startIndex, setStartIndex, directEntry, setDirectEntry, slugRef } =
    useCrateRoutingState();
  const allCrates = allCratesFrom(crates, storefront_sections);
  const activeCrate = findActiveCrate(allCrates, activeSlug);
  usePopHandler({ slugRef, setSlug: setActiveSlug, setIdx: setStartIndex, setDirect: setDirectEntry });
  const selectCrate = useSelectCrate(slugRef, setStartIndex, setActiveSlug);
  const backToStore = useBackToStore(slugRef, setActiveSlug, setStartIndex, setDirectEntry);
  return { activeSlug, activeCrate, startIndex, selectCrate, backToStore, allCrates, directEntry };
}
