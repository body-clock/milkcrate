interface Props {
  listingCount: number;
  genreCount?: number;
}

export default function StoreStats({ listingCount, genreCount }: Props) {
  return (
    <div className="rounded-lg border border-mc-border bg-mc-bg-card/60 px-3 py-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-mc-text-dim mb-2">Store</h3>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-mc-text-dim">Listings</span>
          <span className="font-semibold tabular-nums">{listingCount.toLocaleString()}</span>
        </div>
        {genreCount != null && genreCount > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-mc-text-dim">Genres</span>
            <span className="font-semibold tabular-nums">{genreCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
