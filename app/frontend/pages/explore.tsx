import React from "react";

import DirectoryBody from "@/components/explore_directory/directory_body";
import FeaturedRecordsRail from "@/components/explore_directory/featured_records_rail";
import type { FeaturedRecord } from "@/components/explore_directory/featured_records_rail";
import FeaturedSection from "@/components/explore_directory/featured_section";
import MarketingLayout from "@/layouts/marketing_layout";
import HeaderSection from "@/pages/explore/header_section";
import PageHead from "@/pages/explore/page_head";

export type { FeaturedRecord } from "@/components/explore_directory/featured_records_rail";

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

export interface ExploreCopy {
  headline: string;
  subhead: string;
  featured_label: string;
  featured_records_label: string;
  all_stores_label: string;
  empty_state: string;
}

export interface ExploreDirectoryProps {
  stores: ExploreStoreData[];
  featured_stores: ExploreStoreData[];
  featured_records: FeaturedRecord[];
  copy: ExploreCopy;
  error: string | null;
}

export default function ExploreDirectory({
  stores,
  featured_stores,
  featured_records,
  copy,
  error,
}: ExploreDirectoryProps) {
  return (
    <>
      <PageHead />
      <MarketingLayout>
        <div className="space-y-8">
          <HeaderSection copy={copy} />
          <FeaturedRecordsRail records={featured_records} label={copy.featured_records_label} />
          <FeaturedSection stores={featured_stores} label={copy.featured_label} />
          <DirectoryBody
            error={error}
            stores={stores}
            label={copy.all_stores_label}
            emptyState={copy.empty_state}
          />
        </div>
      </MarketingLayout>
    </>
  );
}
