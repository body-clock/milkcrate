const btnClass =
  "inline-flex min-h-10 items-center gap-2 rounded-md border border-mc-border bg-mc-bg-card px-3 text-xs font-semibold text-mc-accent hover:bg-mc-accent/10 hover:border-mc-accent/30 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg";

interface PileButtonProps {
  pile: { length: number };
  pileOpen: boolean;
  setPileOpen: (open: boolean) => void;
}

export function PileButton({ pile, pileOpen, setPileOpen }: PileButtonProps) {
  return (
    <button
      type="button"
      onClick={() => setPileOpen(true)}
      className={btnClass}
      aria-label={`Pile (${pile.length})`}
      aria-expanded={pileOpen}
      aria-controls="pile-sheet"
    >
      Pile ({pile.length})
    </button>
  );
}
