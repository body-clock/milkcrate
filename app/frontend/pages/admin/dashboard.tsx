import MilkcrateShell from "@/layouts/milkcrate_shell";
import type { AdminDashboardProps } from "@/types/inertia";

import { ActiveStoresSection } from "./dashboard/active_stores_section";
import { ApplicantsSection } from "./dashboard/applicants_section";
import { DashboardHeader } from "./dashboard/dashboard_header";
import { DiscogsOnboardingPanel } from "./dashboard/discogs_onboarding_panel";
import { FlashBanner } from "./dashboard/flash_banner";
import { useResync } from "./dashboard/use_resync";

// eslint-disable-next-line max-lines-per-function
export default function Dashboard({
  active_stores,
  applicants,
  discogs_onboarding,
  notice,
  alert,
}: AdminDashboardProps) {
  useResync(active_stores);
  return (
    <div className="min-h-screen bg-mc-bg text-mc-text">
      <MilkcrateShell
        header={<DashboardHeader active_stores={active_stores} />}
        afterHeader={notice || alert ? <FlashBanner notice={notice} alert={alert} /> : undefined}
        contentWidth="max-w-7xl"
        contentPadding="px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-8">
          <DiscogsOnboardingPanel
            lookupPath={discogs_onboarding.lookup_path}
            createPath={discogs_onboarding.create_path}
          />
          <ActiveStoresSection active_stores={active_stores} />
          <ApplicantsSection applicants={applicants} />
        </div>
      </MilkcrateShell>
    </div>
  );
}
