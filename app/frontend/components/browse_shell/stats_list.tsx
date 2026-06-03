interface Props {
  listingCount: number;
  genreCount?: number;
}

export default function StatsList({ listingCount, genreCount }: Props) {
  return (
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
  );
}
