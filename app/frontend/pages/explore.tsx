import { Head, Link } from "@inertiajs/react";
import React from "react";

import MarketingLayout from "@/layouts/marketing_layout";

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
  const pageTitle = "Explore Record Stores — Milkcrate";
  const metaDescription =
    "Browse record stores on Milkcrate. Discover curated crates from real independent record shops powered by Discogs.";

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href="/explore" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content="/explore" />
        <meta property="og:type" content="website" />
      </Head>

      <MarketingLayout>
        <div className="space-y-8">
          <section>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Explore Record Stores
            </h1>
            <p className="mt-3 text-lg text-stone-500 dark:text-stone-400">
              Browse curated crates from real record shops powered by Discogs.
            </p>
          </section>

          {error ? (
            <section
              className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950"
              role="alert"
            >
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </section>
          ) : stores.length === 0 ? (
            <section className="rounded-lg border border-stone-200 p-8 text-center dark:border-stone-700">
              <p className="text-lg text-stone-500 dark:text-stone-400">
                No stores have joined yet. Check back soon!
              </p>
            </section>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={`/${store.discogs_username}`}
                  className="group rounded-lg border border-stone-200 p-5 transition-colors hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-500"
                >
                  <h2 className="text-xl font-medium group-hover:underline">{store.name}</h2>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    @{store.discogs_username}
                  </p>
                  <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                    {store.total_listings != null
                      ? `${store.total_listings.toLocaleString()} listing${store.total_listings === 1 ? "" : "s"}`
                      : "Listings coming soon"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </MarketingLayout>
    </>
  );
}
