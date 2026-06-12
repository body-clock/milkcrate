export function CollapsedHint({ count }: { count: number }) {
  return (
    <p className="text-sm text-mc-text-dim">
      {count} store{count === 1 ? "" : "s"} hidden
    </p>
  );
}
