const OAUTH_BENEFITS = [
  "Sync your complete Discogs inventory instead of the public API preview.",
  "Remove sold listings faster through Discogs order polling.",
  "Access your Milkcrate store dashboard and sync controls.",
];

export default function BenefitsList() {
  return (
    <ul className="flex list-none flex-col gap-2.5 text-sm leading-relaxed text-mc-text-dim">
      {OAUTH_BENEFITS.map((benefit) => (
        <li key={benefit} className="flex gap-2">
          <span aria-hidden="true" className="mt-px shrink-0 text-mc-accent">
            •
          </span>
          <span>{benefit}</span>
        </li>
      ))}
    </ul>
  );
}
