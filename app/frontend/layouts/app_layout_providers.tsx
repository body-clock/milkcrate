import React from "react";

import StorefrontMotionConfig from "@/components/storefront_motion_config";
import { PileProvider } from "@/contexts/pile_context";
import { ShopperProvider } from "@/contexts/shopper_context";
import { ViewportProvider } from "@/contexts/viewport_context";

interface AppLayoutProvidersProps {
  children: React.ReactNode;
  storeSlug?: string;
}

export function AppLayoutProviders({ children, storeSlug }: AppLayoutProvidersProps) {
  return (
    <StorefrontMotionConfig>
      <ViewportProvider>
        <PileProvider storeSlug={storeSlug}>
          <ShopperProvider>{children}</ShopperProvider>
        </PileProvider>
      </ViewportProvider>
    </StorefrontMotionConfig>
  );
}
