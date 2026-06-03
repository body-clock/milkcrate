import { PileButton } from "./app_header_pile_button";

interface AppHeaderActionsProps {
  pile: { length: number };
  pileOpen: boolean;
  isCompact: boolean;
  theme: "light" | "dark";
  toggle: () => void;
  setPileOpen: (open: boolean) => void;
}

const themeBtnClass =
  "w-10 h-10 flex items-center justify-center rounded-full text-xl text-mc-text-dim hover:text-mc-text hover:bg-mc-bg-raised transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg";

// eslint-disable-next-line max-lines-per-function
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
      {!isCompact && (
        <button
          type="button"
          onClick={toggle}
          className={themeBtnClass}
          aria-label="Toggle light/dark mode"
        >
          {theme === "dark" ? "☀︎" : "☾"}
        </button>
      )}
    </div>
  );
}
