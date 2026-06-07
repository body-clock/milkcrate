import { MarketingLayoutContent } from "@/layouts/marketing_layout_content";

import ClaimActions from "./authorize/claim_actions";
import ClaimDetails from "./authorize/claim_details";
import ClaimHeader from "./authorize/claim_header";
import type { ClaimStore } from "./authorize/types";

export default function StoreAuthorize({ store }: { store: ClaimStore }) {
  return (
    <MarketingLayoutContent>
      <div className="mx-auto max-w-md">
        <ClaimHeader store={store} />
        <ClaimDetails totalListings={store.total_listings} />
        <ClaimActions store={store} />
      </div>
    </MarketingLayoutContent>
  );
}
