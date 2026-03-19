Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check
  mount Lookbook::Engine, at: "/lookbook" if Rails.env.development?

  root "stores#featured"

  resources :stores, only: %i[new create] do
    member do
      post :sync
      get :picks_preview
    end
    resources :sections, only: %i[index show], controller: "store_sections"
  end

  resources :listings, only: %i[show] do
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
