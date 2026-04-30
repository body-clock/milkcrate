Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  mount MissionControl::Jobs::Engine, at: "/jobs" if Rails.env.development?

  post "/events", to: "events#create"

  root "stores#featured"
end
