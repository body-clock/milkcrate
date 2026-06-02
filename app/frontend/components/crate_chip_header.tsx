export function CrateChipHeader({
  title,
  description,
  crateCount,
}: {
  title: string;
  description?: string;
  crateCount: number;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 border-b border-mc-border pb-2">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold leading-none">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-mc-text-dim leading-relaxed">{description}</p>
        )}
      </div>
      <span className="flex-shrink-0 text-xs uppercase tracking-[0.16em] text-mc-text-dim">
        {crateCount} crates
      </span>
    </div>
  );
}
