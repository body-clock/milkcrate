import { useState, useEffect, useRef } from "react";
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

function allCratesFrom(
  crates: Crate[],
  storefront_sections: StorefrontSection[] | undefined,
): Crate[] {
  if (crates.length > 0) {return crates;}
  if (!storefront_sections?.length) {return [];}
  return storefront_sections.flatMap((s) => ("crate" in s ? [s.crate] : s.crates));
}

function initialActiveSlug(): string | null {
  if (typeof window === "undefined") {return null;}
  const fromParam = new URLSearchParams(window.location.search).get("crate");
  if (fromParam) {return fromParam;}
  const raw = history.state?.crateSlug;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function initialStartIndex(): number {
  const raw = history.state?.startIndex;
  return Number.isFinite(raw) && (raw as number) >= 0 ? (raw as number) : 0;
}

function initialDirectEntry(): boolean {
  if (typeof window === "undefined") {return false;}
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

interface PopStateCtx {
  slugRef: React.MutableRefObject<string | null>;
  setSlug: (s: string | null) => void;
  setIdx: (n: number) => void;
  setDirect: (b: boolean) => void;
}

function handlePopState(e: PopStateEvent, ctx: PopStateCtx) {
  const { slugRef: r, setSlug: s, setIdx: i, setDirect: d } = ctx;
  const slug = e.state?.crateSlug ?? null;
  r.current = slug;
  s(slug);
  i(e.state?.startIndex ?? 0);
  d(Boolean(new URLSearchParams(window.location.search).get("crate")));
}

function usePopHandler(ctx: PopStateCtx) {
  useEffect(() => {
    const handler = (e: PopStateEvent) => handlePopState(e, ctx);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function makeSelectCrate(slugRef: React.MutableRefObject<string | null>, setIdx: (n: number) => void, setSlug: (s: string | null) => void) {
  return (slug: string, index = 0) => {
    const wasFloor = slugRef.current === null;
    // eslint-disable-next-line no-param-reassign
    slugRef.current = slug; setIdx(index); setSlug(slug);
    const ns = historyStateWithCrate(slug, index);
    if (wasFloor) { history.pushState(ns, ""); }
    else { history.replaceState(ns, ""); }
  };
}

function makeBackToStore(slugRef: React.MutableRefObject<string | null>, setSlug: (s: string | null) => void, setIdx: (n: number) => void, setDirect: (b: boolean) => void) {
  return () => {
    // eslint-disable-next-line no-param-reassign
    slugRef.current = null; setSlug(null); setIdx(0); setDirect(false);
    history.replaceState(historyStateWithoutCrate(), "", storeFloorUrl());
  };
}

export function useCrateRouting({
  crates,
  storefront_sections,
}: UseCrateRoutingOptions): UseCrateRoutingResult {
  const [activeSlug, setActiveSlug] = useState<string | null>(initialActiveSlug);
  const [startIndex, setStartIndex] = useState(initialStartIndex);
  const [directEntry, setDirectEntry] = useState(initialDirectEntry);
  const slugRef = useRef(activeSlug);
  const allCrates = allCratesFrom(crates, storefront_sections);
  const activeCrate = activeSlug === null ? null : (allCrates.find((c) => c.slug === activeSlug) ?? allCrates[0]);

  usePopHandler({ slugRef, setSlug: setActiveSlug, setIdx: setStartIndex, setDirect: setDirectEntry });
  return { activeSlug, activeCrate, startIndex, selectCrate: makeSelectCrate(slugRef, setStartIndex, setActiveSlug), backToStore: makeBackToStore(slugRef, setActiveSlug, setStartIndex, setDirectEntry), allCrates, directEntry };
}
