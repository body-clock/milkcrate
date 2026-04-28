Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  mount MissionControl::Jobs::Engine, at: "/jobs" if Rails.env.development?

  root "stores#featured"

  resources :stores, only: %i[new create]

  resources :listings, only: [] do
    member do
      post :add_to_session
      delete :remove_from_session
    end
  end

  resources :dig_sessions, only: %i[index show create] do
    member do
      patch :close
    end
  end
end
