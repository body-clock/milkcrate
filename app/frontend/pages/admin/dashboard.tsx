import MilkcrateShell from "@/layouts/milkcrate_shell";
import type { AdminDashboardProps } from "@/types/inertia";

import { DashboardHeader } from "./dashboard/dashboard_header";
import { DashboardPanels } from "./dashboard/dashboard_panels";
import { FlashBanner } from "./dashboard/flash_banner";
import { useResync } from "./dashboard/use_resync";

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
        <DashboardPanels
          active_stores={active_stores}
          applicants={applicants}
          discogs_onboarding={discogs_onboarding}
        />
      </MilkcrateShell>
    </div>
  );
}
