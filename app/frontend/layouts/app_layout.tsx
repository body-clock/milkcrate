import React from "react";
import { usePage } from "@inertiajs/react";
import { PileProvider } from "@/contexts/pile_context";
import StorefrontMotionConfig from "@/components/storefront_motion_config";
import { ViewportProvider } from "@/contexts/viewport_context";
import { ShopperProvider } from "@/contexts/shopper_context";
import { AppLayoutContent } from "./app_layout_content";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const page = usePage<{ store?: { discogs_username?: string } }>();
  const storeSlug = page.props.store?.discogs_username;

  return (
    <StorefrontMotionConfig>
      <ViewportProvider>
        <PileProvider storeSlug={storeSlug}>
          <ShopperProvider>
            {/* eslint-disable-next-line react/jsx-max-depth */}
            <AppLayoutContent>{children}</AppLayoutContent>
          </ShopperProvider>
        </PileProvider>
      </ViewportProvider>
    </StorefrontMotionConfig>
  );
}
