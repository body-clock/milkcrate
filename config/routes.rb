Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  mount MissionControl::Jobs::Engine, at: "/jobs"

  namespace :api do
    get "discogs/lookup/:username", to: "discogs_lookup#show"
  end

  get "/admin", to: "admin/dashboard#show"
  get "/admin/discogs_lookup", to: "admin/discogs_lookups#show", as: :admin_discogs_lookup
  post "/admin/onboarding", to: "admin/onboardings#direct", as: :admin_discogs_onboarding
  post "/admin/waitlists/:waitlist_id/onboarding", to: "admin/onboardings#create", as: :admin_waitlist_onboarding

  root "pages#home"

  get  "/apply",   to: "pages#apply"
  post "/apply", to: "waitlists#create"

  # OAuth flow — must be before the catch-all /:slug route
  post "/:slug/authorize",
    to: "stores#authorize",
    as: :store_authorize,
    constraints: { slug: DiscogsSellerLookup::ROUTE_USERNAME_REGEX },
    format: false

  get "/auth/discogs/callback", to: "auth#callback", as: :discogs_oauth_callback

  get "/:slug",
    to: "stores#show",
    as: :store,
    constraints: { slug: DiscogsSellerLookup::ROUTE_USERNAME_REGEX },
    format: false
end
