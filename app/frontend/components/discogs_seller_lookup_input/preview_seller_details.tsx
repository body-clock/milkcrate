import type { SuccessfulLookup } from "@/hooks/use_discogs_lookup";

interface Props {
  result: SuccessfulLookup;
}

export default function PreviewSellerDetails({ result }: Props) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {result.avatar_url && (
        <img
          src={result.avatar_url}
          alt=""
          className="h-12 w-12 shrink-0 rounded-md border border-mc-feedback-success-border object-cover"
        />
      )}
      <div className="min-w-0">
        <p className="font-semibold text-sm text-mc-text">{result.seller_name}</p>
        <p className="text-xs text-mc-text-dim">@{result.slug}</p>
      </div>
    </div>
  );
}
