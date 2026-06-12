import React from "react";

import DirectoryBody from "@/components/explore_directory/directory_body";
import FeaturedSection from "@/components/explore_directory/featured_section";
import MarketingLayout from "@/layouts/marketing_layout";
import HeaderSection from "@/pages/explore/header_section";
import PageHead from "@/pages/explore/page_head";

export interface ExploreStoreData {
  id: number;
  name: string;
  discogs_username: string;
  total_listings: number | null;
  avatar_url: string | null;
  location: string | null;
  genre_tags: string[];
  description: string | null;
}

export interface ExploreDirectoryProps {
  stores: ExploreStoreData[];
  featured_stores: ExploreStoreData[];
  error: string | null;
}

export default function ExploreDirectory({
  stores,
  featured_stores,
  error,
}: ExploreDirectoryProps) {
  return (
    <>
      <PageHead />
      <MarketingLayout>
        <div className="space-y-8">
          <HeaderSection />
          <FeaturedSection stores={featured_stores} />
          <DirectoryBody error={error} stores={stores} />
        </div>
      </MarketingLayout>
    </>
  );
}
