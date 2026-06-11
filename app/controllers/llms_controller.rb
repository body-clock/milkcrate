# Serves /llms.txt and /llms-full.txt for AI crawler context.
class LlmsController < ApplicationController
  layout false

  def show
    @stores = Store.order(:name).select(:name, :discogs_username, :total_listings).limit(20)
  end

  def full
    @stores = Store.order(:name).select(:name, :discogs_username, :total_listings)
  end
end
