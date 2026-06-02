import MilkcrateShell from "@/layouts/milkcrate_shell";
import PileSheet from "@/components/pile_sheet";
import PileToast from "@/components/pile_toast";
import FeedbackMessage from "@/components/ui/feedback_message";
import { AppHeader } from "./app_header";
import { AppFooter } from "./app_footer";

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

export function AppContent({ children, storeName, discogsUsername, theme, toggle, isCompact, pile, shopper,
    pileOpen, setPileOpen, handleClosePile, contextFocusRef, autoOpenPile, flashMsg, hasNotice }: AppContentProps) {
  return (
    <>
      <div inert={pileOpen} data-testid="storefront-background">
        <MilkcrateShell
          header={<AppHeader storeName={storeName} discogsUsername={discogsUsername} isCompact={isCompact} pile={pile} pileOpen={pileOpen} theme={theme} toggle={toggle} setPileOpen={setPileOpen} contextFocusRef={contextFocusRef} />}
          afterHeader={flashMsg ? <FeedbackMessage tone={hasNotice ? "success" : "danger"} live={hasNotice ? "polite" : "assertive"} className="rounded-none border-x-0 px-4 py-2">{flashMsg}</FeedbackMessage> : undefined}
          footer={isCompact ? undefined : <AppFooter shopper={shopper} />}
          contentWidth="max-w-6xl"
          contentPadding="px-4 sm:px-6 lg:px-8 py-4 sm:py-8"
        >
          {children}
        </MilkcrateShell>
      </div>
      <PileToast />
      <PileSheet open={pileOpen} onClose={handleClosePile} returnFocusRef={contextFocusRef} highlightOnMount={autoOpenPile} />
    </>
  );
}
