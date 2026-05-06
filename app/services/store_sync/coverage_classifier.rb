module StoreSync
  class CoverageClassifier
    PUBLIC_PAGE_LIMIT = 100

    def initialize(observed_page_count:, max_pages:)
      @observed_page_count = observed_page_count.to_i
      @max_pages = max_pages
    end

    def call
      return "partial" if truncated?
      return "partial" if @observed_page_count > PUBLIC_PAGE_LIMIT

      "near_complete"
    end

    private

    def truncated?
      @max_pages.present? && @observed_page_count > @max_pages
    end
  end
end
