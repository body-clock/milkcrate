import { AppContentOverlays } from "./app_content_overlays";
import { AppShell } from "./app_shell";

interface AppContentProps {
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
  handleClosePile: () => void;
  contextFocusRef: React.RefObject<HTMLElement | null>;
  autoOpenPile: boolean;
  flashMsg: string | undefined;
  hasNotice: boolean;
}

export function AppContent(props: AppContentProps) {
  return (
    <>
      <AppShell {...props} />
      <AppContentOverlays pileOpen={props.pileOpen} handleClosePile={props.handleClosePile}
        contextFocusRef={props.contextFocusRef} autoOpenPile={props.autoOpenPile} />
    </>
  );
}
