# Provides a feature gate check for the seller-scoped Wantlist handoff.
module SellerWantlistHandoff
  extend ActiveSupport::Concern

  private

  def seller_wantlist_handoff_enabled?
    return false unless Settings.respond_to?(:features)
    return false unless Settings.features.respond_to?(:seller_wantlist_handoff)

    ActiveModel::Type::Boolean.new.cast(
      ENV.fetch("SELLER_WANTLIST_HANDOFF_ENABLED", Settings.features.seller_wantlist_handoff.enabled.to_s)
    )
  end
end
