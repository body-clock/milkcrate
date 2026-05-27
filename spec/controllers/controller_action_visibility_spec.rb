require "rails_helper"

RSpec.describe "controller action visibility" do
  {
    Admin::SessionsController => %w[authenticate_admin finalize_admin_login],
    Admin::TotpController => %w[render_invalid_totp_setup],
    DevController => %w[start_dev_session find_or_create_dev_admin],
    PileController => %w[create_wantlist find_shopper find_store render_wantlist_result],
    ShopperAuthController => %w[validate_store_slug authorize_shopper store_shopper_oauth_session clear_shopper_oauth_session],
    StoresController => %w[redirect_to_discogs store_owner_oauth_session],
    WaitlistsController => %w[redirect_on_success register_waitlist]
  }.each do |controller, helpers|
    it "keeps #{controller} support methods private" do
      expect(controller.action_methods).not_to include(*helpers)
    end
  end
end
