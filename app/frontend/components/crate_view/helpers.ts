import type { Crate, Listing } from "../../types/inertia";
import type { CrateHeaderLayoutMode } from "./crate_header/types";

export function deriveCrateData(
  crates: Crate[],
  activeSlug: string,
): { activeCrate: Crate | undefined; records: Listing[]; total: number } {
  const crate = crates.find((c) => c.slug === activeSlug) ?? crates[0];
  const recs = crate?.records ?? [];
  return { activeCrate: crate, records: recs, total: recs.length };
}

export function deriveLayoutMode(
  compactHeaderOwnedByLayout: boolean,
  hideTabs: boolean,
): CrateHeaderLayoutMode {
  if (compactHeaderOwnedByLayout) {
    return hideTabs ? "minimal" : "compact";
  }
  return hideTabs ? "no-tabs" : "full";
}
