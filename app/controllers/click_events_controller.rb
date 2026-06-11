# Receives outbound Discogs click events from the frontend via sendBeacon.
# Idempotent analytics endpoint — no session, no write-back, best-effort.
class ClickEventsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: :create

  def create
    return head(:no_content) unless (store = resolve_store)
    create_click(store)
  rescue StandardError => e
    Rails.logger.warn("[ClickEventsController] Failed to record click: #{e.message}")
    head :no_content
  end

  private

  def resolve_store
    Store.with_discogs_username(params[:store_slug].to_s.downcase).first
  end

  def create_click(store)
    ClickEvent.create!(
      store: store,
      listing_id: params[:listing_id].presence,
      referrer: request.referer,
      user_agent: request.user_agent
    )
  end
end
