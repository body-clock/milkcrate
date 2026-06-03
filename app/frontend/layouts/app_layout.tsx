import { usePage } from "@inertiajs/react";
import React from "react";

import { AppLayoutProviders } from "./app_layout_providers";
import { AppLayoutContent } from "./app_layout_content";

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
