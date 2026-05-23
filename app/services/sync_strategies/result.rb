module SyncStrategies
  Result = Data.define(:listings, :complete) do
    alias_method :complete?, :complete
  end
end
