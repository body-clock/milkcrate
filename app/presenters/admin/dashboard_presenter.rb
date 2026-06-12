module Admin
  class DashboardPresenter
    def props
      {
        active_stores: active_stores,
        applicants: applicants,
        discogs_onboarding: discogs_onboarding
      }
    end

    private

    def discogs_onboarding
      {
        lookup_path: "/admin/discogs_lookup",
        create_path: "/admin/onboarding"
      }
    end

    def active_stores
      Store.all.map { |store| StoreHealthPresenter.new(store) }
        .sort_by { |presenter| [ presenter.severity_weight, presenter.sort_key ] }
        .map(&:props)
    end

    def applicants
      Waitlist
        .where.not(discogs_username: Store.select(:discogs_username))
        .order(created_at: :desc)
        .map { |waitlist| applicant_props(waitlist) }
    end

    def applicant_props(waitlist)
      {
        id: waitlist.id,
        name: waitlist.name,
        email: waitlist.email,
        discogs_username: waitlist.discogs_username,
        inventory_size: waitlist.inventory_size,
        notes: waitlist.notes,
        submitted_at: waitlist.created_at.iso8601
      }
    end
  end
end
