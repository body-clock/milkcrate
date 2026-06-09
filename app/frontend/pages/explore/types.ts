export interface ExploreSearchResult {
  discogs_listing_id: string;
  artist: string | null;
  title: string | null;
  label: string | null;
  year: number | null;
  format: string | null;
  genres: string[];
  styles: string[];
  condition: string | null;
  price: string;
  currency: string;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  discogs_url: string;
}

export interface ExploreSearchResponse {
  results: ExploreSearchResult[];
  total: number;
}

export type ExploreState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; results: ExploreSearchResult[]; total: number; query: string }
  | { status: "empty"; query: string }
  | { status: "error"; message: string; query: string };

export interface ExplorePageProps {
  searchEndpoint: string;
  placeholder: string;
}
