module Api
  class DiscogsLookupController < ApplicationController
    def show
      result = DiscogsSellerLookup.new(params[:username]).call
      render json: result, status: :ok
    end
  end
end
