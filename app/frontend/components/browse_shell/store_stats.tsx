import StatsList from "./stats_list";

interface Props {
  listingCount: number;
  genreCount?: number;
}

export default function StoreStats(props: Props) {
  return (
    <div className="rounded-lg border border-mc-border bg-mc-bg-card/60 px-3 py-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-mc-text-dim mb-2">
        Store
      </h3>
      <StatsList {...props} />
    </div>
  );
}
