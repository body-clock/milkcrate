import MilkcrateShell from "@/layouts/milkcrate_shell";

import AppContentFlashBanner from "./app_content_flash_banner";
import { AppFooter } from "./app_footer";
import { AppHeader } from "./app_header";

interface AppShellProps {
  children: React.ReactNode;
  storeName?: string;
  discogsUsername?: string;
  theme: "light" | "dark";
  toggle: () => void;
  isCompact: boolean;
  pile: { length: number };
  shopper?: { discogs_username: string } | null;
  pileOpen: boolean;
  setPileOpen: (open: boolean) => void;
  contextFocusRef: React.RefObject<HTMLElement | null>;
  flashMsg: string | undefined;
  hasNotice: boolean;
}

export function AppShell(p: AppShellProps) {
  return (
    <div inert={p.pileOpen} data-testid="storefront-background">
      <MilkcrateShell
        header={
          <AppHeader storeName={p.storeName} discogsUsername={p.discogsUsername}
            isCompact={p.isCompact} pile={p.pile} pileOpen={p.pileOpen} theme={p.theme}
            toggle={p.toggle} setPileOpen={p.setPileOpen} contextFocusRef={p.contextFocusRef} />
        }
        afterHeader={<AppContentFlashBanner flashMsg={p.flashMsg} hasNotice={p.hasNotice} />}
        footer={p.isCompact ? undefined : <AppFooter shopper={p.shopper} />}
        contentWidth="max-w-6xl" contentPadding="px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {p.children}
      </MilkcrateShell>
    </div>
  );
}
