class Admin::LeadsPresenter
  PAGE_SIZE = 50

  attr_reader :params

  def initialize(params = {})
    @params = params
  end

  def index_props(leads)
    paginated = leads.page(params[:page]).per(PAGE_SIZE)

    {
      leads: paginated.map { |lead| lead_summary(lead) },
      pagination: pagination_props(paginated),
      filters: {
        status: params[:status],
        min_score: params[:min_score]
      }
    }
  end

  def show_props(lead)
    {
      lead: lead_detail(lead)
    }
  end

  private

  def lead_summary(lead)
    {
      id: lead.id,
      discogs_username: lead.discogs_username,
      store_name: lead.store_name,
      inventory_size: lead.inventory_size,
      vinyl_percentage: lead.vinyl_percentage,
      genres: lead.genres,
      score: lead.score,
      status: lead.status,
      scored_at: lead.scored_at,
      created_at: lead.created_at
    }
  end

  def lead_detail(lead)
    summary = lead_summary(lead)

    summary.merge(
      styles: lead.styles,
      discogs_profile: lead.discogs_profile,
      web_presence: lead.web_presence,
      score_breakdown: score_breakdown_display(lead.score_breakdown),
      notes: lead.notes,
      reviewed_at: lead.reviewed_at,
      updated_at: lead.updated_at
    )
  end

  def score_breakdown_display(breakdown)
    return nil if breakdown.blank?

    {
      inventory_size: breakdown["inventory_size"],
      vinyl_share: breakdown["vinyl_share"],
      genre_depth: breakdown["genre_depth"],
      presence_penalty: breakdown["presence_penalty"]
    }
  end

  def pagination_props(paginated)
    {
      current_page: paginated.current_page,
      total_pages: paginated.total_pages,
      total_count: paginated.total_count,
      per_page: PAGE_SIZE
    }
  end
end
