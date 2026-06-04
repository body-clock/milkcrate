interface ThemeToggleProps {
  theme: "light" | "dark";
  toggle: () => void;
}

const btnClass =
  "w-10 h-10 flex items-center justify-center rounded-full text-xl text-mc-text-dim hover:text-mc-text hover:bg-mc-bg-raised transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg";

export function ThemeToggle({ theme, toggle }: ThemeToggleProps) {
  return (
    <button type="button" onClick={toggle} className={btnClass} aria-label="Toggle light/dark mode">
      {theme === "dark" ? "☀︎" : "☾"}
    </button>
  );
}
