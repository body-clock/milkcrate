import { usePage } from "@inertiajs/react";
import React from "react";

import { MarketingLayoutContent } from "./marketing_layout_content";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { alert, notice } = usePage<{ alert?: string; notice?: string }>().props;
  return (
    <MarketingLayoutContent alert={alert} notice={notice}>
      {children}
    </MarketingLayoutContent>
  );
}
