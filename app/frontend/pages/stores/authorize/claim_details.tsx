const OAUTH_BENEFITS = [
  "Sync your complete Discogs inventory instead of the public API preview.",
  "Remove sold listings faster through Discogs order polling.",
  "Access your Milkcrate store dashboard and sync controls.",
];

export default function ClaimDetails({ totalListings }: { totalListings: number | null }) {
  return (
    <section aria-labelledby="claim-details-title"
      className="mb-6 rounded-lg border border-mc-border bg-mc-bg-card px-5 py-5">
      <h2 id="claim-details-title" className="mb-1 text-base font-semibold text-mc-text">
        Your preview is already live.
      </h2>
      {totalListings !== null && (
        <p className="mb-4 text-xs text-mc-text-dim">
          Currently showing data from {totalListings.toLocaleString()} listings.
        </p>
      )}
      <p className="mb-3 text-sm leading-relaxed text-mc-text-dim">
        Authorize with Discogs to verify ownership and unlock:
      </p>
      <ul className="flex list-none flex-col gap-2.5 text-sm leading-relaxed text-mc-text-dim">
        {OAUTH_BENEFITS.map((benefit) => (
          <li key={benefit} className="flex gap-2">
            <span aria-hidden="true" className="mt-px shrink-0 text-mc-accent">•</span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
