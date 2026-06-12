import { useMemo, useState } from "react";

import type { AdminDashboardProps } from "@/types/inertia";

import { ActiveStoresSection } from "./active_stores_section";
import { ApplicantsSection } from "./applicants_section";
import { type HealthFilter } from "./dashboard_constants";
import { DiscogsOnboardingPanel } from "./discogs_onboarding_panel";
import { SearchInput } from "./search_input";

const SEARCH_THRESHOLD = 5;

export function DashboardPanels({
  active_stores,
  healthFilter,
  applicants,
  discogs_onboarding,
}: AdminDashboardProps & { healthFilter: HealthFilter }) {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = useSearchFilter(active_stores, searchQuery);
  const showSearch = active_stores.length >= SEARCH_THRESHOLD;

  return (
    <div className="flex flex-col gap-8">
      <DiscogsOnboardingPanel
        lookupPath={discogs_onboarding.lookup_path}
        createPath={discogs_onboarding.create_path}
      />
      <ActiveStoresSection
        active_stores={filtered}
        healthFilter={healthFilter}
        hasSearchFilter={searchQuery.trim().length > 0}
      >
        {showSearch && <SearchInput query={searchQuery} onChange={setSearchQuery} />}
      </ActiveStoresSection>
      <ApplicantsSection applicants={applicants} />
    </div>
  );
}

function useSearchFilter(stores: AdminDashboardProps["active_stores"], query: string) {
  return useMemo(() => {
    if (!query.trim()) {
      return stores;
    }
    const q = query.toLowerCase();
    return stores.filter(
      (s) => s.name.toLowerCase().includes(q) || s.discogs_username.toLowerCase().includes(q),
    );
  }, [stores, query]);
}
