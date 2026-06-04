import { AppHeaderActions } from "./app_header_actions";
import { AppHeaderBrand } from "./app_header_brand";

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

const headerClass =
  "mc-header flex items-center justify-between px-4 py-2 sm:py-3 border-b border-mc-border sticky top-0 z-30 bg-mc-bg-raised/95 backdrop-blur-sm";

export function AppHeader(props: AppHeaderProps) {
  const p = props;
  return (
    <header ref={p.contextFocusRef} tabIndex={-1} className={headerClass}>
      <AppHeaderBrand storeName={p.storeName} discogsUsername={p.discogsUsername} isCompact={p.isCompact} />
      <AppHeaderActions
        pile={p.pile}
        pileOpen={p.pileOpen}
        isCompact={p.isCompact}
        theme={p.theme}
        toggle={p.toggle}
        setPileOpen={p.setPileOpen}
      />
    </header>
  );
}
