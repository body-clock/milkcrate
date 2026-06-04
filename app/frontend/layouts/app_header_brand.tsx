import { BrandMarkLink } from "./app_header_brand_mark";
import { StoreSubLink } from "./app_header_store_link";
import { StoreNameLink } from "./app_header_store_name";

interface AppHeaderBrandProps {
  storeName?: string;
  discogsUsername?: string;
  isCompact: boolean;
}

export function AppHeaderBrand({ storeName, discogsUsername, isCompact }: AppHeaderBrandProps) {
  if (!storeName || !discogsUsername) {
    return <BrandMarkLink />;
  }

  return (
    <div className="flex min-w-0 flex-col">
      <StoreNameLink username={discogsUsername} storeName={storeName} />
      <StoreSubLink isCompact={isCompact} />
    </div>
  );
}
