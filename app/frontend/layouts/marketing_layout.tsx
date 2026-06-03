import { usePage } from "@inertiajs/react";
import React from "react";

import StorefrontMotionConfig from "@/components/storefront_motion_config";
import { ViewportProvider } from "@/contexts/viewport_context";
import MarketingFlashBanner from "@/layouts/marketing_flash_banner";
import MarketingHeader from "@/layouts/marketing_header";
import MilkcrateShell from "@/layouts/milkcrate_shell";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { alert, notice } = usePage<{ alert?: string; notice?: string }>().props;

  return (
    <StorefrontMotionConfig>
      <ViewportProvider>
        <MilkcrateShell
          header={<MarketingHeader />}
          afterHeader={<MarketingFlashBanner notice={notice} alert={alert} />}
          contentWidth="max-w-6xl"
        >
          {children}
        </MilkcrateShell>
      </ViewportProvider>
    </StorefrontMotionConfig>
  );
}
