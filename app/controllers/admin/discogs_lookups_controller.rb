class Admin::DiscogsLookupsController < Admin::BaseController
  def show
    result = Admin::DiscogsSignupAvailability.new(params[:username]).call
    render json: result.data.merge(status: result.status), status: :ok
  end
end
