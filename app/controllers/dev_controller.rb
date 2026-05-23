class DevController < ApplicationController
  before_action :ensure_development

  def login_as
    store = Store.find(params[:store_id])
    session[:store_owner_id] = store.store_owner_id
    redirect_to dashboard_path, notice: "Logged in as #{store.name}"
  end

  private

  def ensure_development
    raise "Not available in production" unless Rails.env.development?
  end
end
