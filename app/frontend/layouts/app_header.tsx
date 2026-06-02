import { AppHeaderBrand } from "./app_header_brand";
import { AppHeaderActions } from "./app_header_actions";

interface AppHeaderProps {
  storeName?: string;
  discogsUsername?: string;
  isCompact: boolean;
  pile: { length: number };
  pileOpen: boolean;
  theme: "light" | "dark";
  toggle: () => void;
  setPileOpen: (open: boolean) => void;
  contextFocusRef: React.RefObject<HTMLElement | null>;
}

const headerClass = "mc-header flex items-center justify-between px-4 py-2 sm:py-3 border-b border-mc-border sticky top-0 z-30 bg-mc-bg-raised/95 backdrop-blur-sm";

export function AppHeader({
  storeName, discogsUsername, isCompact, pile, pileOpen,
  theme, toggle, setPileOpen, contextFocusRef,
}: AppHeaderProps) {
  return (
    <header ref={contextFocusRef} tabIndex={-1} className={headerClass}>
      <AppHeaderBrand storeName={storeName} discogsUsername={discogsUsername} isCompact={isCompact} />
      <AppHeaderActions pile={pile} pileOpen={pileOpen} isCompact={isCompact} theme={theme} toggle={toggle} setPileOpen={setPileOpen} />
    </header>
  );
}
