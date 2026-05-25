# Namespace for public API endpoints.
module Api
  # Public API endpoint for looking up Discogs releases (rate-limited).
  class DiscogsLookupController < ApplicationController
    def show
      result = DiscogsSellerLookup.new(params[:username]).call
      render json: result, status: :ok
    end
  end
end
