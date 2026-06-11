# Receives outbound Discogs click events from the frontend.
class ClickEventsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: :create

  def create
    store = Store.with_discogs_username(params[:store_slug].to_s.downcase).first
    head :no_content and return unless store

    ClickEvent.create!(
      store: store,
      listing_id: params[:listing_id].presence,
      referrer: request.referer,
      user_agent: request.user_agent
    )

    head :no_content
  rescue ActiveRecord::RecordInvalid
    head :no_content
  end
end
