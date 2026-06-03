import type { AdminDashboardProps } from "@/types/inertia";

import { ActiveStoresSection } from "./active_stores_section";
import { ApplicantsSection } from "./applicants_section";
import { DiscogsOnboardingPanel } from "./discogs_onboarding_panel";

export function DashboardPanels({
  active_stores,
  applicants,
  discogs_onboarding,
}: AdminDashboardProps) {
  return (
    <div className="flex flex-col gap-8">
      <DiscogsOnboardingPanel
        lookupPath={discogs_onboarding.lookup_path}
        createPath={discogs_onboarding.create_path}
      />
      <ActiveStoresSection active_stores={active_stores} />
      <ApplicantsSection applicants={applicants} />
    </div>
  );
}
