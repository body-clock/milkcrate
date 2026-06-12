import { useEffect, useState } from "react";

import Badge from "@/components/ui/badge";
import type { AdminDashboardProps } from "@/types/inertia";

import { CollapsedHint, ExpandedContent } from "./section_content";

const SECTION_CONFIG = {
  attention: { label: "Attention", severity: "danger" as const, defaultExpanded: true },
  processing: { label: "Processing", severity: "working" as const, defaultExpanded: true },
  healthy: { label: "Healthy", severity: "good" as const, defaultExpanded: false },
} as const;

export type SectionKey = keyof typeof SECTION_CONFIG;

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
    autoExpand === undefined ? config.defaultExpanded : autoExpand,
  );

  useEffect(() => {
    if (autoExpand === undefined || autoExpand === expanded) {
      return;
    }
    setExpanded(autoExpand);
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
