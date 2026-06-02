import { StoreNameLink } from "./app_header_store_name";
import { StoreSubLink } from "./app_header_store_link";
import { BrandMarkLink } from "./app_header_brand_mark";

interface AppHeaderBrandProps {
  storeName?: string;
  _discogsUsername?: string;
  isCompact: boolean;
}

export function AppHeaderBrand({ storeName, _discogsUsername, isCompact }: AppHeaderBrandProps) {
  if (!storeName) {
    return <BrandMarkLink />;
  }

  return (
    <div className="flex min-w-0 flex-col">
      <StoreNameLink username={storeName} />
      <StoreSubLink isCompact={isCompact} />
    </div>
  );
}
