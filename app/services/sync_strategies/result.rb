# Namespace for sync strategies (public API, CSV export).
module SyncStrategies
  Result = Data.define(:listings, :complete, :catalog_coverage) do
    def initialize(listings:, complete:, catalog_coverage: nil)
      super
    end
    alias_method :complete?, :complete
  end
end
