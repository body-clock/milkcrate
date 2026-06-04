import { PileButton } from "./app_header_pile_button";
import { ThemeToggle } from "./app_header_theme_toggle";

interface AppHeaderActionsProps {
  pile: { length: number };
  pileOpen: boolean;
  isCompact: boolean;
  theme: "light" | "dark";
  toggle: () => void;
  setPileOpen: (open: boolean) => void;
}

export function AppHeaderActions({
  pile,
  pileOpen,
  isCompact,
  theme,
  toggle,
  setPileOpen,
}: AppHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
      {pile.length > 0 && <PileButton pile={pile} pileOpen={pileOpen} setPileOpen={setPileOpen} />}
      {!isCompact && <ThemeToggle theme={theme} toggle={toggle} />}
    </div>
  );
}
