import type { AdminDashboardProps } from "@/types/inertia";

import { ATTENTION_HEALTH_KEYS, type HealthFilter } from "./dashboard_constants";
import { HealthSection, type SectionKey } from "./health_section";

function groupBySection(stores: AdminDashboardProps["active_stores"]) {
  const groups: Record<SectionKey, AdminDashboardProps["active_stores"]> = {
    attention: [],
    processing: [],
    healthy: [],
  };

  for (const store of stores) {
    if (ATTENTION_HEALTH_KEYS.has(store.health.key)) {
      groups.attention.push(store);
    } else if (store.health.key === "processing") {
      groups.processing.push(store);
    } else {
      groups.healthy.push(store);
    }
  }

  return groups;
}

function sectionMatchesFilter(key: SectionKey, filter: HealthFilter) {
  return filter.includes(key);
}

export function StoreGrid({
  active_stores,
  healthFilter,
}: {
  active_stores: AdminDashboardProps["active_stores"];
  healthFilter: HealthFilter;
}) {
  const groups = groupBySection(active_stores);
  const hasFilter = healthFilter.length > 0;
  const sections: SectionKey[] = ["attention", "processing", "healthy"];

  return (
    <div className="flex flex-col gap-6">
      {sections
        .filter((key) => groups[key].length > 0)
        .map((key) => (
          <HealthSection
            key={key}
            sectionKey={key}
            stores={groups[key]}
            autoExpand={hasFilter ? sectionMatchesFilter(key, healthFilter) : undefined}
          />
        ))}
    </div>
  );
}
