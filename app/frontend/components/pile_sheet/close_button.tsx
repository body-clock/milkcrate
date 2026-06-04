/** Close button (×) in the sheet header. */
export default function PileSheetCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-11 w-11 items-center justify-center rounded text-lg leading-none text-mc-text-dim transition-colors hover:bg-mc-bg-raised hover:text-mc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus"
      aria-label="Close pile"
    >
      ×
    </button>
  );
}
