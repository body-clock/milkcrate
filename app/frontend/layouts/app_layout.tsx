import { usePage } from "@inertiajs/react";
import React from "react";

import { AppLayoutContent } from "./app_layout_content";
import { AppLayoutProviders } from "./app_layout_providers";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const page = usePage<{ store?: { discogs_username?: string } }>();
  const storeSlug = page.props.store?.discogs_username;

  return (
    <AppLayoutProviders storeSlug={storeSlug}>
      <AppLayoutContent>{children}</AppLayoutContent>
    </AppLayoutProviders>
  );
}
