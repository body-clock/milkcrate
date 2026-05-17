class Admin::DiscogsLookupsController < Admin::BaseController
  def show
    username = params[:username].to_s.strip
    normalized_username = username.downcase
    lookup = DiscogsSellerLookup.new(username).call

    unless lookup[:found]
      render json: failed_lookup_response(lookup), status: :ok
      return
    end

    if (store = Store.with_discogs_username(normalized_username).first)
      render json: already_active_response(normalized_username, store), status: :ok
      return
    end

    if (applicant = Waitlist.with_discogs_username(normalized_username).first)
      render json: existing_applicant_response(normalized_username, applicant), status: :ok
      return
    end

    render json: creatable_response(normalized_username, lookup), status: :ok
  end

  private

  def failed_lookup_response(lookup)
    reason = lookup[:reason].to_s

    {
      status: reason == "invalid_slug" ? "invalid" : "lookup_error",
      creatable: false,
      reason:
    }
  end

  def creatable_response(username, lookup)
    {
      status: "creatable",
      creatable: true,
      username:,
      seller_name: lookup[:seller_name],
      avatar_url: lookup[:avatar_url]
    }
  end

  def already_active_response(username, store)
    {
      status: "already_active",
      creatable: false,
      username:,
      store: {
        id: store.id,
        name: store.name,
        discogs_username: store.discogs_username
      }
    }
  end

  def existing_applicant_response(username, applicant)
    {
      status: "existing_applicant",
      creatable: false,
      username:,
      applicant: {
        id: applicant.id,
        name: applicant.name,
        discogs_username: applicant.discogs_username
      }
    }
  end
end
