/** UI copy — single source of truth for all user-facing strings.
 * Import from here instead of writing inline string literals.
 * For interpolated strings, use the function helpers. */

export const COPY = {
  /** Tab labels in the compact browse shell navigation */
  browseModes: {
    wall: "The Wall",
    featured: "Featured",
    genres: "Genres",
  },

  /** aria-label for the browse mode navigation */
  browseNavLabel: "Browse modes",

  wall: {
    /** Region aria-label */
    regionLabel: "The Wall",
    /** Heading displayed above the grid */
    heading: "The Wall",
    /** Descriptive text below the heading */
    description: "The store's taste at a glance.",
    /** Empty state body text */
    emptyBody:
      "Nothing on the wall yet. Once the store syncs, it'll show the store's taste at a glance.",

    /** aria-label for the tile button */
    tileLabel: (title?: string | null) => `Inspect ${title ?? "record"} on the Wall`,
    /** aria-label for the page dot indicator */
    pageDotLabel: (page: number, total: number) => `Wall page ${page} of ${total}`,
    /** aria-label for the pagination tablist */
    pagesLabel: "Wall pages",
  },

  /** Config for the two crate-based browse panels */
  cratePanels: {
    featured: {
      title: "Featured",
      description: "Featured bins from this store's inventory.",
      ariaLabel: "Featured",
      emptyText: "Pick a Featured crate to start digging.",
    },
    genres: {
      title: "Genres",
      description: "Inventory grouped by genre.",
      ariaLabel: "Browse by genre",
      emptyText: "Pick a genre crate to start digging.",
    },
  },

  /** Store floor section (non-compact) */
  storeFloor: {
    wallRegionLabel: "The Wall — the store's taste at a glance",
    wallDescription: "The Wall — the store's taste at a glance",
    featuredDescription: "Featured bins from this store's inventory",
    genreDescription: "Inventory grouped by genre",
  },

  /** Wall record peek sheet */
  peekSheet: {
    title: "Wall peek",
    description: "Inspect the record, check the pile, or head straight to Discogs.",
    closeLabel: "Close wall peek",
    untitledRecord: "Untitled record",
    unknownArtist: "Unknown artist",
  },

  /** Reusable fragments */
  emptyCrate: (title: string) => `No ${title.toLowerCase()} crates yet.`,

  /** Discogs handoff */
  discogsLinkText: "Discogs ↗",
  discogsLinkLabel: (title?: string | null) =>
    `View listing for ${title ?? "this record"} on Discogs (opens in new tab)`,
} as const;

/** Browse mode labels used in the tab bar. Derives from COPY.browseModes. */
export const BROWSE_MODE_LABELS: Record<string, string> = COPY.browseModes;
