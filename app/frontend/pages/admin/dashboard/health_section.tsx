import { useEffect, useState } from "react";

import Badge from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty_state";
import type { AdminDashboardProps } from "@/types/inertia";

import StoreCard from "./store_card";

const SECTION_CONFIG = {
  attention: { label: "Attention", severity: "danger" as const, defaultExpanded: true },
  processing: { label: "Processing", severity: "working" as const, defaultExpanded: true },
  healthy: { label: "Healthy", severity: "good" as const, defaultExpanded: false },
} as const;

type SectionKey = keyof typeof SECTION_CONFIG;
export type { SectionKey };

export function HealthSection({
  sectionKey,
  stores,
  autoExpand,
}: {
  sectionKey: SectionKey;
  stores: AdminDashboardProps["active_stores"];
  autoExpand?: boolean;
}) {
  const config = SECTION_CONFIG[sectionKey];
  const [expanded, setExpanded] = useState(
    autoExpand != null ? autoExpand : config.defaultExpanded,
  );

  useEffect(() => {
    if (autoExpand != null && autoExpand !== expanded) {
      setExpanded(autoExpand);
    }
  }, [autoExpand, expanded]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span
          className={`text-mc-text-dim transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        >
          ›
        </span>
        <span className="text-lg font-bold text-mc-text">{config.label}</span>
        <Badge variant={config.severity}>{stores.length}</Badge>
      </button>
      {expanded ? <ExpandedContent stores={stores} /> : <CollapsedHint count={stores.length} />}
    </div>
  );
}

function ExpandedContent({ stores }: { stores: AdminDashboardProps["active_stores"] }) {
  if (stores.length === 0) {
    return <EmptyState>No stores in this section.</EmptyState>;
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {stores.map((store) => (
        <StoreCard key={store.id} store={store} />
      ))}
    </div>
  );
}

function CollapsedHint({ count }: { count: number }) {
  return (
    <p className="text-sm text-mc-text-dim">
      {count} store{count !== 1 ? "s" : ""} hidden
    </p>
  );
}
