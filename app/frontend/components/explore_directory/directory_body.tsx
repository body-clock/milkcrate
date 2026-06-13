import React from "react";

import type { ExploreStoreData } from "@/pages/explore";

import EmptyState from "./empty_state";
import ErrorAlert from "./error_alert";
import StoreDirectoryGrid from "./store_directory_grid";

export default function DirectoryBody({
  error,
  stores,
}: {
  error: string | null;
  stores: ExploreStoreData[];
}) {
  if (error) {
    return <ErrorAlert error={error} />;
  }
  if (stores.length === 0) {
    return <EmptyState />;
  }
  return <StoreDirectoryGrid stores={stores} />;
}
