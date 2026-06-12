import { useState } from "react";

import type { AdminDashboardProps } from "@/types/inertia";

import { DashboardPanels } from "./dashboard/dashboard_panels";
import { DashboardShell } from "./dashboard/dashboard_shell";
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
    <DashboardShell
      active_stores={active_stores}
      healthFilter={healthFilter}
      onHealthFilterChange={setHealthFilter}
      notice={notice}
      alert={alert}
    >
      <DashboardPanels
        active_stores={active_stores}
        healthFilter={healthFilter}
        applicants={applicants}
        discogs_onboarding={discogs_onboarding}
      />
    </DashboardShell>
  );
}
