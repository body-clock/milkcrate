# Query object for scoping listings to currently available (in-stock) records.
class Listings::AvailableQuery
  RECENCY_THRESHOLD = 3.days

  def initialize(relation: Listing.all, recency_threshold: RECENCY_THRESHOLD)
    @relation = relation
    @recency_threshold = recency_threshold
  end

  def call
    @relation.joins(:store).where(
      <<~SQL.squish, @recency_threshold.ago, @recency_threshold.ago
        (
          COALESCE(stores.catalog_coverage, 'unknown') = 'partial'
          AND listings.last_seen_at > ?
        )
        OR
        (
          COALESCE(stores.catalog_coverage, 'unknown') != 'partial'
          AND (
            (
              stores.last_synced_at IS NOT NULL
              AND listings.last_seen_at >= stores.last_synced_at
            )
            OR (
              stores.last_synced_at IS NULL
              AND listings.last_seen_at > ?
            )
          )
        )
      SQL
    )
  end
end
