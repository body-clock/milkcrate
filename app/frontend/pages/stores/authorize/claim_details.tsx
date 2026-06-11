import BenefitsList from "./benefits_list";

export default function ClaimDetails({ totalListings }: { totalListings: number | null }) {
  return (
    <section
      aria-labelledby="claim-details-title"
      className="mb-6 rounded-lg border border-mc-border bg-mc-bg-card px-5 py-5"
    >
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
      <BenefitsList />
    </section>
  );
}
