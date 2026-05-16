class Admin::DashboardController < Admin::BaseController
  layout "inertia_application"

  def show
    render inertia: "admin/dashboard", props: Admin::DashboardPresenter.new.props
  end
end
