import { useState } from "react";

import MilkcrateShell from "@/layouts/milkcrate_shell";
import type { AdminDashboardProps } from "@/types/inertia";

import { DashboardHeader } from "./dashboard/dashboard_header";
import { DashboardPanels } from "./dashboard/dashboard_panels";
import { FlashBannerIfNotice } from "./dashboard/flash_banner_if_notice";
import { useResync } from "./dashboard/use_resync";

export type { HealthFilter, HealthFilterKey } from "./dashboard/dashboard_constants";

export default function Dashboard({
  active_stores,
  applicants,
  discogs_onboarding,
  notice,
  alert,
}: AdminDashboardProps) {
  useResync(active_stores);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>([]);

  return (
    <div className="min-h-screen bg-mc-bg text-mc-text">
      <MilkcrateShell
        header={
          <DashboardHeader
            active_stores={active_stores}
            healthFilter={healthFilter}
            onHealthFilterChange={setHealthFilter}
          />
        }
        afterHeader={<FlashBannerIfNotice notice={notice} alert={alert} />}
        contentWidth="max-w-7xl"
        contentPadding="px-4 py-6 sm:px-6 lg:px-8"
      >
        <DashboardPanels
          active_stores={active_stores}
          healthFilter={healthFilter}
          applicants={applicants}
          discogs_onboarding={discogs_onboarding}
        />
      </MilkcrateShell>
    </div>
  );
}
