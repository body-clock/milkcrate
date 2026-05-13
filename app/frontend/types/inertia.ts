export interface Store {
  id: number
  name: string
  discogs_username: string
  description: string | null
  total_listings: number | null
  sync_status: string
  last_sync_error_at: string | null
}

export interface Listing {
  id: number
  discogs_listing_id: string
  artist: string | null
  title: string | null
  label: string | null
  year: number | null
  format: string | null
  genres: string[]
  styles: string[]
  condition: string | null
  price: string
  display_price?: string
  currency: string
  cover_image_url: string | null
  thumbnail_url: string | null
  notes: string | null
  discogs_url: string
}

export interface Crate {
  slug: string
  name: string
  count: number
  records: Listing[]
}

export interface StorefrontSectionWithCrate {
  key: "picks_wall"
  crate: Crate
}

export interface StorefrontSectionWithCrates {
  key: "featured_crates" | "genre_grid"
  crates: Crate[]
}

export type StorefrontSection = StorefrontSectionWithCrate | StorefrontSectionWithCrates

export interface FeaturedProps {
  store: Store
  crates: Crate[]
  storefront_sections?: StorefrontSection[]
  active_crate_slug: string
}
