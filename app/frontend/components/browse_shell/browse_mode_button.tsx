interface Props {
  label: string;
  selected: boolean;
  onSelect: () => void;
  compact: boolean;
}

export default function BrowseModeButton({ label, selected, onSelect, compact }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        compact
          ? `flex min-h-11 items-center justify-center rounded-[1rem] px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${
              selected
                ? "bg-mc-accent text-mc-on-accent"
                : "bg-transparent text-mc-text-dim hover:bg-mc-bg-raised hover:text-mc-text"
            }`
          : `w-full text-left rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg ${
              selected
                ? "bg-mc-accent text-mc-on-accent"
                : "text-mc-text-dim hover:bg-mc-bg-raised hover:text-mc-text"
            }`
      }
      aria-label={label}
      aria-pressed={selected}
    >
      <span className="block text-sm font-semibold leading-none">{label}</span>
    </button>
  );
}
