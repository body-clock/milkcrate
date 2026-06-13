import React from "react";

import type { ExploreStoreData } from "@/pages/explore";

import EmptyState from "./empty_state";
import ErrorAlert from "./error_alert";
import StoreDirectoryGrid from "./store_directory_grid";

export default function DirectoryBody({
  error,
  stores,
  label,
  emptyState,
}: {
  error: string | null;
  stores: ExploreStoreData[];
  label: string;
  emptyState: string;
}) {
  if (error) {
    return <ErrorAlert error={error} />;
  }
  if (stores.length === 0) {
    return <EmptyState message={emptyState} />;
  }
  return <StoreDirectoryGrid stores={stores} label={label} />;
}
