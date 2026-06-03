import Button from "@/components/ui/button";
import { csrfToken } from "@/hooks/use_discogs_lookup";

import type { Props } from "./types";

interface PreviewClaimFormProps {
  slug: string;
  copy: Pick<Props["copy"], "seller_preview_claim">;
}

export default function PreviewClaimForm({ slug, copy }: PreviewClaimFormProps) {
  return (
    <form action={`/${slug}/authorize`} method="POST" className="shrink-0">
      <input type="hidden" name="authenticity_token" value={csrfToken()} />
      <Button type="submit" size="lg">
        {copy.seller_preview_claim}
      </Button>
    </form>
  );
}
