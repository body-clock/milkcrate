Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  mount MissionControl::Jobs::Engine, at: "/jobs"

  get "/admin", to: "admin/waitlists#index"

  root "pages#home"

  get  "/apply",   to: "pages#apply"
  post "/apply", to: "waitlists#create"

  get "/:slug", to: "stores#show", as: :store
end
