export interface Store {
  id: number
  name: string
  discogs_username: string
  description: string | null
  total_listings: number | null
  sync_status: string
  last_sync_error_at: string | null
  enrichment_status: string
  last_enriched_at: string | null
  oauth_authorized?: boolean
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
  score_breakdown?: Record<string, number> | null
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

export interface StoreShowProps {
  store: Store
  crates: Crate[]
  storefront_sections?: StorefrontSection[]
}

/** Bounded homepage preview payload — sourced from the demo store when available. */
export interface HomepagePreview {
  store_name: string
  store_slug: string | null
  sections: StorefrontSection[]
}

export interface InvitationProps {
  waitlist_present: boolean
  slug: string
  oauth_available?: boolean
}

export type AdminHealthSeverity = "good" | "working" | "warning" | "danger" | "neutral"

export interface AdminStoreHealth {
  key: string
  label: string
  severity: AdminHealthSeverity
  reasons: string[]
  has_sync_error: boolean
  last_sync_error_summary: string | null
}

export interface AdminStoreSummary {
  id: number
  name: string
  discogs_username: string
  total_listings: number | null
  inventory_page_count: number
  sync_status: string
  enrichment_status: string
  catalog_coverage: string
  last_synced_at: string | null
  last_enriched_at: string | null
  last_sync_error_at: string | null
  storefront_path: string
  health: AdminStoreHealth
}

export interface AdminApplicantSummary {
  id: number
  name: string
  email: string
  discogs_username: string
  inventory_size: string | null
  notes: string | null
  submitted_at: string
}

export interface AdminDiscogsOnboardingConfig {
  lookup_path: string
  create_path: string
}

export interface DashboardStore {
  id: number
  name: string
  discogs_username: string
  storefront_url: string
  total_listings: number | null
  sync_status: string
  last_synced_at: string | null
  last_sync_error: string | null
  last_sync_error_at: string | null
  owner_email: string | null
  oauth_authorized_at: string | null
}

export interface DashboardProps {
  store: DashboardStore
}

export interface AdminDashboardProps {
  active_stores: AdminStoreSummary[]
  applicants: AdminApplicantSummary[]
  discogs_onboarding: AdminDiscogsOnboardingConfig
  notice?: string
  alert?: string
}
