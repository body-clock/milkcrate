export interface LeadSummary {
  id: number
  discogs_username: string
  store_name: string | null
  inventory_size: number | null
  vinyl_percentage: number | null
  genres: string[]
  score: number | null
  status: "pending" | "reviewed" | "contacted" | "onboarded" | "dismissed"
  scored_at: string | null
  created_at: string
}

export interface LeadScoreBreakdown {
  inventory_size: number
  vinyl_share: number
  genre_depth: number
  presence_penalty: number
}

export interface LeadDetail extends LeadSummary {
  styles: string[]
  discogs_profile: Record<string, unknown> | null
  web_presence: {
    platforms: Record<string, string | null>
    listed_urls: string[]
    classified_as: "no_presence" | "social_media" | "standalone_ecommerce" | "other"
    notes: string
  } | null
  score_breakdown: LeadScoreBreakdown | null
  notes: string | null
  reviewed_at: string | null
  updated_at: string
}

export interface LeadsIndexProps {
  leads: LeadSummary[]
  pagination: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
  }
  filters: {
    status?: string
    min_score?: string
  }
}

export interface LeadShowProps {
  lead: LeadDetail
}
