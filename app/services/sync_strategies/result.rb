# Namespace for sync strategies (public API, CSV export).
module SyncStrategies
  Result = Data.define(:listings, :complete) do
    alias_method :complete?, :complete
  end
end
