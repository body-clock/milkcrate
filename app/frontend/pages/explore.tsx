import React from "react";

import DirectoryBody from "@/components/explore_directory/directory_body";
import MarketingLayout from "@/layouts/marketing_layout";
import HeaderSection from "@/pages/explore/header_section";
import PageHead from "@/pages/explore/page_head";

export interface ExploreStoreData {
  id: number;
  name: string;
  discogs_username: string;
  total_listings: number | null;
}

export interface ExploreDirectoryProps {
  stores: ExploreStoreData[];
  error: string | null;
}

export default function ExploreDirectory({ stores, error }: ExploreDirectoryProps) {
  return (
    <>
      <PageHead />
      <MarketingLayout>
        <div className="space-y-8">
          <HeaderSection />
          <DirectoryBody error={error} stores={stores} />
        </div>
      </MarketingLayout>
    </>
  );
}
