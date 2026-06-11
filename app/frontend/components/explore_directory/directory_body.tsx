import React from 'react';
import StoreCard from './store_card';
import ErrorAlert from './error_alert';
import EmptyState from './empty_state';
import type { ExploreStoreData } from '@/pages/explore';

export default function DirectoryBody({ error, stores }: { error: string | null; stores: ExploreStoreData[] }) {
  if (error) { return <ErrorAlert error={error} />; }
  if (stores.length === 0) { return <EmptyState />; }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stores.map((store) => <StoreCard key={store.id} store={store} />)}
    </div>
  );
}
