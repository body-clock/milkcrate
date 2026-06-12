import { useEffect, useState } from "react";

import type { AdminDashboardProps } from "@/types/inertia";

import { CollapsedHint } from "./collapsed_hint";
import { ExpandedContent } from "./section_content";
import { SectionHeaderButton } from "./section_header_button";

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
      <SectionHeaderButton
        label={config.label}
        severity={config.severity}
        count={stores.length}
        expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      />
      {expanded ? <ExpandedContent stores={stores} /> : <CollapsedHint count={stores.length} />}
    </div>
  );
}
