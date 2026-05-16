Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  mount MissionControl::Jobs::Engine, at: "/jobs"

  namespace :api do
    get "discogs/lookup/:username", to: "discogs_lookup#show"
  end

  get "/admin", to: "admin/dashboard#show"
  post "/admin/waitlists/:waitlist_id/onboarding", to: "admin/onboardings#create", as: :admin_waitlist_onboarding

  namespace :admin do
    resources :leads, only: [ :index, :show, :update ] do
      member do
        post :onboard
      end
    end
  end

  root "pages#home"

  get  "/apply",   to: "pages#apply"
  post "/apply", to: "waitlists#create"

  get "/:slug", to: "stores#show", as: :store
end
