Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # MissionControl::Jobs is protected by the same admin session + TOTP session keys.
  # The constrained mount is first so it matches for authenticated admins.
  # Fallback routes catch unauthenticated requests and redirect to login.
  constraints ->(req) { req.session[:admin_id].present? && req.session[:totp_verified] } do
    mount MissionControl::Jobs::Engine, at: "/jobs"
  end
  get "/jobs" => redirect("/admin/login")
  get "/jobs/*path" => redirect("/admin/login")

  namespace :api do
    get "discogs/lookup/:username", to: "discogs_lookup#show"
  end

  namespace :admin do
    # Authentication
    get  "login",  to: "sessions#new"
    post "login",  to: "sessions#create"
    delete "logout", to: "sessions#destroy"

    get  "totp",        to: "totp#show"
    post "totp",        to: "totp#create"
    get  "totp/setup",  to: "totp#setup", as: :totp_setup
    post "totp/setup",  to: "totp#confirm_setup"
  end

  get "/admin", to: "admin/dashboard#show"
  get "/admin/discogs_lookup", to: "admin/discogs_lookups#show", as: :admin_discogs_lookup
  post "/admin/onboarding", to: "admin/onboardings#direct", as: :admin_discogs_onboarding
  post "/admin/waitlists/:waitlist_id/onboarding", to: "admin/onboardings#create", as: :admin_waitlist_onboarding
  post "/admin/stores/:id/retry", to: "admin/stores#retry_sync", as: :admin_store_retry_sync

  root "pages#home"

  get "/llms.txt", to: "llms#show", defaults: { format: "text" }
  get "/llms-full.txt", to: "llms#full", defaults: { format: "text" }

  post "/click", to: "click_events#create"

  get  "/explore", to: "explore#index"

  get  "/apply",   to: "pages#apply"
  post "/apply", to: "waitlists#create"

  # Store owner dashboard
  get "/dashboard", to: "dashboard#index", as: :dashboard
  post "/dashboard/resync", to: "dashboard#resync"

  if Rails.env.development? || Rails.env.test?
    get "/dev/login-as/:store_id", to: "dev#login_as"
    get "/dev/admin-login", to: "dev#admin_login"
  end

  # OAuth flow — must be before the catch-all /:slug route
  get "/:slug/authorize",
    to: "stores#claim",
    as: :store_claim,
    constraints: { slug: DiscogsSellerLookup::ROUTE_USERNAME_REGEX },
    format: false

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
