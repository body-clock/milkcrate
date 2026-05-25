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

  # Store owner dashboard
  get "/dashboard", to: "dashboard#index", as: :dashboard
  post "/dashboard/resync", to: "dashboard#resync"
  post "/dashboard/signup", to: "dashboard#signup"

  if Rails.env.development? || Rails.env.test?
    get "/dev/login-as/:store_id", to: "dev#login_as"
  end

  # OAuth flow — must be before the catch-all /:slug route
  post "/:slug/authorize",
    to: "stores#authorize",
    as: :store_authorize,
    constraints: { slug: DiscogsSellerLookup::ROUTE_USERNAME_REGEX },
    format: false

  # Shopper OAuth — initiates the Discogs OAuth flow for a buyer
  post "/auth/discogs/shopper/authorize", to: "shopper_auth#authorize", as: :shopper_discogs_authorize

  # Shopper OAuth — disconnect/clear session
  delete "/auth/discogs/shopper/disconnect", to: "shopper_auth#disconnect", as: :shopper_discogs_disconnect

  # Pile list creation — requires shopper OAuth session
  post "/pile/add_to_wantlist", to: "pile#add_to_wantlist", as: :pile_add_to_wantlist

  # Shared OAuth callback — handles both store-owner and shopper flows via session keys
  get "/auth/discogs/callback", to: "auth#callback", as: :discogs_oauth_callback

  get "/:slug",
    to: "stores#show",
    as: :store,
    constraints: { slug: DiscogsSellerLookup::ROUTE_USERNAME_REGEX },
    format: false
end
