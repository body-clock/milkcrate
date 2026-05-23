# Namespace for admin controllers and presenters.
module Admin
  # Serializes admin dashboard data (store health, sync stats) for Inertia views.
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
      Store.order(created_at: :desc).map { |store| StoreHealthPresenter.new(store).props }
    end

    def applicants
      live_usernames = Store.pluck(:discogs_username).compact.to_set

      Waitlist
        .order(created_at: :desc)
        .reject { |waitlist| live_usernames.include?(waitlist.discogs_username) }
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
