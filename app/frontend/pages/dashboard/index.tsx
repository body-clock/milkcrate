import { usePage } from "@inertiajs/react";
import { useState } from "react";

import MilkcrateShell from "@/layouts/milkcrate_shell";
import type { DashboardProps } from "@/types/inertia";

import DashboardContent from "./dashboard_content";
import DashboardHeader from "./dashboard_header";
import FlashBanner from "./flash_banner";

function useDashboardState() {
  const { notice, alert: flashAlert } = usePage<{ notice?: string; alert?: string }>().props;
  const [showWelcome, setShowWelcome] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  return { notice, flashAlert, showWelcome, setShowWelcome, submitting, setSubmitting };
}

export default function Dashboard({ store }: DashboardProps) {
  const { notice, flashAlert, showWelcome, setShowWelcome, submitting, setSubmitting } =
    useDashboardState();
  return (
    <div className="min-h-screen bg-mc-bg text-mc-text">
      <MilkcrateShell
        header={<DashboardHeader storefrontUrl={store.storefront_url} />}
        afterHeader={<FlashBanner notice={notice} flashAlert={flashAlert} />}
        contentWidth="max-w-2xl"
        contentPadding="px-4 py-8"
      >
        <DashboardContent
          store={store} showWelcome={showWelcome} setShowWelcome={setShowWelcome}
          submitting={submitting} setSubmitting={setSubmitting}
        />
      </MilkcrateShell>
    </div>
  );
}
