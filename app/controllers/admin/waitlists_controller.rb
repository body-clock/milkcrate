class Admin::WaitlistsController < Admin::BaseController
  def index
    @waitlists = Waitlist.order(created_at: :desc)
  end
end
