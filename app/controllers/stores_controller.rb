class StoresController < ApplicationController
  layout "inertia_application"

  def featured
    store = Store.find_by(discogs_username: Settings.discogs_username)
    return render :no_stores unless store

    render_store(store)
  end

  def show
    store = Store.with_discogs_username(params[:slug]).first
    return render_invitation unless store

    render_store(store)
  end

  private

  def render_invitation
    slug = params[:slug]
    waitlist_present = Waitlist.with_discogs_username(slug).exists?

    render inertia: "stores/invitation", props: {
      waitlist_present: waitlist_present,
      slug: slug
    }
  end

  def render_store(store)
    presenter = CratePresenter.new(store)
    snapshot = active_renderable_snapshot_for(store)

    if snapshot
      render_storefront(
        presenter,
        crates: snapshot.crates,
        storefront_sections: snapshot.storefront_sections,
        snapshot: snapshot
      )
    else
      curation  = StorefrontCuration.new(store, filter_available: !Rails.env.development?)
      render_storefront(
        presenter,
        crates: presenter.build_crates(curation.crates),
        storefront_sections: presenter.build_storefront_sections(curation.storefront_groups)
      )
    end
  end

  def active_renderable_snapshot_for(store)
    [ store.active_storefront_snapshot, latest_renderable_snapshot_for(store) ].compact.find(&:renderable?)
  end

  def latest_renderable_snapshot_for(store)
    store.storefront_snapshots.latest_successful.compatible.find(&:renderable?)
  end

  def render_storefront(presenter, crates:, storefront_sections:, snapshot: nil)
    log_snapshot_hit(snapshot) if snapshot

    render inertia: "stores/featured", props: {
      store: presenter.store_props,
      crates: crates,
      storefront_sections: storefront_sections,
      active_crate_slug: "picks"
    }
  end

  def log_snapshot_hit(snapshot)
    Rails.logger.info(
      "[StoresController] store_id=#{snapshot.store_id} snapshot_id=#{snapshot.id} " \
      "stale_snapshot=#{snapshot.stale?} schema_version=#{snapshot.props_schema_version} " \
      "curation_date=#{snapshot.curation_date} generated_at=#{snapshot.generated_at&.iso8601}"
    )
  end
end
