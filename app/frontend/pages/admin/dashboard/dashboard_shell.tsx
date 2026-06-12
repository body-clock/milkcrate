import type { ReactNode } from "react";

import MilkcrateShell from "@/layouts/milkcrate_shell";
import type { AdminDashboardProps } from "@/types/inertia";

import type { HealthFilter } from "./dashboard_constants";
import { DashboardHeader } from "./dashboard_header";
import { FlashBannerIfNotice } from "./flash_banner_if_notice";

export function DashboardShell({
  active_stores,
  healthFilter,
  onHealthFilterChange,
  notice,
  alert,
  children,
}: {
  active_stores: AdminDashboardProps["active_stores"];
  healthFilter: HealthFilter;
  onHealthFilterChange: (filter: HealthFilter) => void;
  notice?: string;
  alert?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-mc-bg text-mc-text">
      <MilkcrateShell
        header={
          <DashboardHeader
            active_stores={active_stores}
            healthFilter={healthFilter}
            onHealthFilterChange={onHealthFilterChange}
          />
        }
        afterHeader={<FlashBannerIfNotice notice={notice} alert={alert} />}
        contentWidth="max-w-7xl"
        contentPadding="px-4 py-6 sm:px-6 lg:px-8"
      >
        {children}
      </MilkcrateShell>
    </div>
  );
}
