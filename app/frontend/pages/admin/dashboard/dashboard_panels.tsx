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
  const searchFilteredStores = useSearchFilter(active_stores, searchQuery);

  return (
    <div className="flex flex-col gap-8">
      <DiscogsOnboardingPanel
        lookupPath={discogs_onboarding.lookup_path}
        createPath={discogs_onboarding.create_path}
      />
      <ActiveStoresSection
        active_stores={searchFilteredStores}
        healthFilter={healthFilter}
        hasSearchFilter={searchQuery.trim().length > 0}
      >
        {active_stores.length >= SEARCH_THRESHOLD && (
          <SearchInput query={searchQuery} onChange={setSearchQuery} />
        )}
      </ActiveStoresSection>
      <ApplicantsSection applicants={applicants} />
    </div>
  );
}

function useSearchFilter(active_stores: AdminDashboardProps["active_stores"], searchQuery: string) {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      return active_stores;
    }
    const query = searchQuery.toLowerCase();
    return active_stores.filter(
      (store) =>
        store.name.toLowerCase().includes(query) ||
        store.discogs_username.toLowerCase().includes(query),
    );
  }, [active_stores, searchQuery]);
}
