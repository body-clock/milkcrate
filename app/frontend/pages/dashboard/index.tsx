import { useState } from "react";
import { usePage } from "@inertiajs/react";
import MilkcrateShell from "@/layouts/milkcrate_shell";
import type { DashboardProps } from "@/types/inertia";
import DashboardHeader from "./dashboard_header";
import FlashBanner from "./flash_banner";
import DashboardContent from "./dashboard_content";

export default function Dashboard({ store }: DashboardProps) {
  const { notice, alert: flashAlert } = usePage<{ notice?: string; alert?: string }>().props;
  const [showWelcome, setShowWelcome] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="min-h-screen bg-mc-bg text-mc-text">
      <MilkcrateShell
        header={<DashboardHeader storefrontUrl={store.storefront_url} />}
        afterHeader={<FlashBanner notice={notice} flashAlert={flashAlert} />}
        contentWidth="max-w-2xl"
        contentPadding="px-4 py-8"
      >
        <DashboardContent
          store={store}
          showWelcome={showWelcome}
          setShowWelcome={setShowWelcome}
          submitting={submitting}
          setSubmitting={setSubmitting}
        />
      </MilkcrateShell>
    </div>
  );
}
